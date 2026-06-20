import { Router, type IRouter } from "express";
import { db, expertsTable, usersTable, reviewsTable, bookingsTable } from "@workspace/db";
import { and, eq, ilike, or, sql, inArray, isNotNull } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { publicWriteLimiter, searchSuggestionsLimiter } from "../lib/limiters";
import { ApplyAsExpertBody, ListExpertsQueryParams, GetSearchSuggestionsQueryParams, UpdateExpertProfileBody } from "@workspace/api-zod";

const router: IRouter = Router();

const INDUSTRIES = [
  "Agriculture & Agribusiness",
  "Beauty & Salons",
  "Construction & Contracting",
  "Education & Training",
  "E-commerce & Retail",
  "Financial Services",
  "Healthcare & Clinics",
  "Hospitality & Tourism",
  "Logistics & Transport",
  "Manufacturing & SMEs",
  "Real Estate",
  "Restaurants & Food Business",
  "Tech Startups",
];

function getCommissionRate(sessionType: string): number {
  if (sessionType === "growth_3mo" || sessionType === "growth_6mo") return 0.15;
  return 0.20;
}

router.get("/experts/industries", async (_req, res): Promise<void> => {
  res.json(INDUSTRIES);
});

router.get("/experts/search-suggestions", searchSuggestionsLimiter, async (req, res): Promise<void> => {
  const params = GetSearchSuggestionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { q } = params.data;
  const experts = await db
    .select({ headline: expertsTable.headline, industry: expertsTable.industry })
    .from(expertsTable)
    .where(
      and(
        eq(expertsTable.status, "approved"),
        isNotNull(expertsTable.userId),
        or(
          ilike(expertsTable.headline, `%${q}%`),
          ilike(expertsTable.industry, `%${q}%`)
        )
      )
    )
    .limit(8);

  const suggestions = [
    ...new Set([
      ...experts.map((e) => e.industry),
      ...experts.filter((e) => e.headline).map((e) => e.headline!),
    ]),
  ].slice(0, 8);

  res.json(suggestions);
});

router.get("/experts/stats", async (_req, res): Promise<void> => {
  const [expertCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expertsTable)
    .where(and(eq(expertsTable.status, "approved"), isNotNull(expertsTable.userId)));

  const [sessionCountResult] = await db
    .select({ count: sql<number>`sum(total_sessions)::int` })
    .from(expertsTable)
    .where(and(eq(expertsTable.status, "approved"), isNotNull(expertsTable.userId)));

  const [reviewCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reviewsTable);

  res.json({
    expertCount: expertCountResult?.count ?? 0,
    industryCount: INDUSTRIES.length,
    sessionCount: sessionCountResult?.count ?? 0,
    reviewCount: reviewCountResult?.count ?? 0,
  });
});

router.get("/experts", async (req, res): Promise<void> => {
  const params = ListExpertsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { industry, search, page = 1, limit: rawLimit = 12 } = params.data;
  const limit = Math.min(rawLimit, 50);
  const offset = (page - 1) * limit;

  const conditions = [eq(expertsTable.status, "approved"), isNotNull(expertsTable.userId)];

  if (industry) {
    conditions.push(ilike(expertsTable.industry, `%${industry}%`));
  }
  if (search) {
    conditions.push(
      or(
        ilike(expertsTable.headline, `%${search}%`),
        ilike(expertsTable.industry, `%${search}%`),
        ilike(expertsTable.name, `%${search}%`)
      )!
    );
  }

  const where = and(...conditions);

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expertsTable)
    .where(where);

  const experts = await db
    .select()
    .from(expertsTable)
    .where(where)
    .limit(limit)
    .offset(offset)
    .orderBy(expertsTable.createdAt);

  res.json({
    experts: experts.map(formatExpert),
    total: totalResult?.count ?? 0,
    page,
    limit,
  });
});

router.get("/experts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [expert] = await db
    .select()
    .from(expertsTable)
    .where(and(eq(expertsTable.id, id), eq(expertsTable.status, "approved"), isNotNull(expertsTable.userId)));
  if (!expert) { res.status(404).json({ error: "Expert not found" }); return; }

  const allReviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.expertId, id))
    .orderBy(reviewsTable.createdAt);

  const publicReviews = allReviews.filter((r) => r.reviewType === "public");
  const verifiedReviews = allReviews.filter((r) => r.reviewType === "verified");

  const verifiedRatings = verifiedReviews.map((r) => r.rating);
  const avgVerifiedRating = verifiedRatings.length > 0
    ? verifiedRatings.reduce((a, b) => a + b, 0) / verifiedRatings.length
    : expert.rating;

  if (verifiedReviews.length > 0 && avgVerifiedRating !== expert.rating) {
    await db.update(expertsTable)
      .set({ rating: Math.round(avgVerifiedRating * 10) / 10 })
      .where(eq(expertsTable.id, id));
  }

  res.json({
    ...formatExpert({ ...expert, rating: verifiedReviews.length > 0 ? Math.round(avgVerifiedRating * 10) / 10 : expert.rating }),
    reviews: publicReviews.map(formatReview),
    verifiedReviews: verifiedReviews.map(formatReview),
  });
});

router.post("/experts/apply", publicWriteLimiter, async (req, res): Promise<void> => {
  const parsed = ApplyAsExpertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select({ id: expertsTable.id })
    .from(expertsTable)
    .where(
      and(
        eq(expertsTable.email, parsed.data.email),
        inArray(expertsTable.status, ["pending", "approved"])
      )
    );

  if (existing) {
    res.status(409).json({ error: "An application with this email address is already pending or approved." });
    return;
  }

  const [expert] = await db
    .insert(expertsTable)
    .values({
      userId: null,
      name: parsed.data.name,
      email: parsed.data.email,
      headline: parsed.data.headline ?? null,
      industry: parsed.data.industry,
      yearsExperience: parsed.data.yearsExperience,
      bio: parsed.data.bio ?? null,
      skills: parsed.data.skills ?? [],
      discoveryPrice: parsed.data.discoveryPrice ?? null,
      consultancyPrice: parsed.data.consultancyPrice ?? null,
      growthPrice3mo: parsed.data.growthPrice3mo ?? null,
      growthPrice6mo: parsed.data.growthPrice6mo ?? null,
      status: "pending",
    })
    .returning();

  res.status(201).json(formatApplication(expert));
});

router.get("/expert/dashboard", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "expert") {
    res.status(403).json({ error: "Experts only" });
    return;
  }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
  if (!expert) { res.status(404).json({ error: "Expert profile not found" }); return; }

  const allBookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.expertId, expert.id))
    .orderBy(bookingsTable.scheduledTime);

  const upcomingBookings = allBookings.filter((b) => b.status === "upcoming");
  const completedBookings = allBookings.filter((b) => b.status === "completed");

  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const commissionPaid = completedBookings.reduce((sum, b) => {
    return sum + (b.amount ?? 0) * getCommissionRate(b.sessionType);
  }, 0);
  const netEarnings = totalEarnings - commissionPaid;

  const pendingPayout = completedBookings
    .filter((b) => b.payoutStatus === "pending")
    .reduce((sum, b) => sum + (b.amount ?? 0) * (1 - getCommissionRate(b.sessionType)), 0);

  const clientIds = [...new Set(allBookings.map((b) => b.clientId))];
  const clients = clientIds.length > 0
    ? await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(${clientIds})`)
    : [];

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  const formatBookingWithClient = (b: typeof allBookings[0]) => ({
    id: b.id,
    clientId: b.clientId,
    expertId: b.expertId,
    sessionType: b.sessionType,
    scheduledTime: b.scheduledTime.toISOString(),
    durationMinutes: b.durationMinutes,
    status: b.status,
    payoutStatus: b.payoutStatus,
    payoutPaidAt: b.payoutPaidAt ? b.payoutPaidAt.toISOString() : null,
    notes: b.notes ?? null,
    meetLink: b.meetLink ?? null,
    amount: b.amount ?? null,
    clientName: clientMap[b.clientId]?.name ?? null,
    expertName: expert.name,
    expertIndustry: expert.industry ?? null,
    createdAt: b.createdAt.toISOString(),
  });

  res.json({
    expert: formatExpert(expert),
    upcomingBookings: upcomingBookings.map(formatBookingWithClient),
    completedBookings: completedBookings.map(formatBookingWithClient),
    totalEarnings,
    commissionPaid,
    netEarnings,
    pendingPayout,
  });
});

router.patch("/expert/profile", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "expert") {
    res.status(403).json({ error: "Experts only" });
    return;
  }

  const parsed = UpdateExpertProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
  if (!expert) { res.status(404).json({ error: "Expert profile not found" }); return; }

  const [updated] = await db
    .update(expertsTable)
    .set({
      headline: parsed.data.headline ?? expert.headline,
      bio: parsed.data.bio ?? expert.bio,
      skills: parsed.data.skills ?? expert.skills,
      discoveryPrice: parsed.data.discoveryPrice ?? expert.discoveryPrice,
      consultancyPrice: parsed.data.consultancyPrice ?? expert.consultancyPrice,
      growthPrice3mo: parsed.data.growthPrice3mo ?? expert.growthPrice3mo,
      growthPrice6mo: parsed.data.growthPrice6mo ?? expert.growthPrice6mo,
    })
    .where(eq(expertsTable.id, expert.id))
    .returning();

  const allReviews = await db.select().from(reviewsTable).where(eq(reviewsTable.expertId, expert.id));
  const publicReviews = allReviews.filter((r) => r.reviewType === "public");
  const verifiedReviews = allReviews.filter((r) => r.reviewType === "verified");

  res.json({
    ...formatExpert(updated),
    reviews: publicReviews.map(formatReview),
    verifiedReviews: verifiedReviews.map(formatReview),
  });
});

export function formatExpert(expert: {
  id: number;
  userId: number | null;
  name: string;
  headline: string | null;
  industry: string;
  yearsExperience: number;
  rating: number;
  totalSessions: number;
  avatarUrl: string | null;
  bio: string | null;
  skills: string[] | null;
  status: string;
  discoveryPrice: number | null;
  consultancyPrice: number | null;
  growthPrice3mo: number | null;
  growthPrice6mo: number | null;
  createdAt: Date;
}) {
  return {
    id: expert.id,
    name: expert.name,
    headline: expert.headline ?? "",
    industry: expert.industry,
    yearsExperience: expert.yearsExperience,
    rating: expert.rating,
    totalSessions: expert.totalSessions,
    avatarUrl: expert.avatarUrl ?? null,
    bio: expert.bio ?? null,
    skills: expert.skills ?? [],
    status: expert.status,
    discoveryPrice: expert.discoveryPrice ?? null,
    consultancyPrice: expert.consultancyPrice ?? null,
    growthPrice3mo: expert.growthPrice3mo ?? null,
    growthPrice6mo: expert.growthPrice6mo ?? null,
    createdAt: expert.createdAt.toISOString(),
  };
}

export function formatApplication(expert: {
  id: number;
  name: string;
  email: string;
  headline: string | null;
  industry: string;
  yearsExperience: number;
  bio: string | null;
  skills: string[] | null;
  status: string;
  discoveryPrice: number | null;
  consultancyPrice: number | null;
  growthPrice3mo: number | null;
  growthPrice6mo: number | null;
  createdAt: Date;
}) {
  return {
    id: expert.id,
    name: expert.name,
    email: expert.email,
    headline: expert.headline ?? null,
    industry: expert.industry,
    yearsExperience: expert.yearsExperience,
    bio: expert.bio ?? null,
    skills: expert.skills ?? [],
    status: expert.status,
    discoveryPrice: expert.discoveryPrice ?? null,
    consultancyPrice: expert.consultancyPrice ?? null,
    growthPrice3mo: expert.growthPrice3mo ?? null,
    growthPrice6mo: expert.growthPrice6mo ?? null,
    createdAt: expert.createdAt.toISOString(),
  };
}

export function formatReview(r: {
  id: number;
  reviewerName: string;
  businessName: string | null;
  expertId: number | null;
  rating: number;
  body: string;
  reviewType: string;
  bookingId: number | null;
  clientId: number | null;
  createdAt: Date;
}) {
  return {
    id: r.id,
    reviewerName: r.reviewerName,
    businessName: r.businessName ?? null,
    expertId: r.expertId ?? null,
    rating: r.rating,
    body: r.body,
    reviewType: r.reviewType,
    createdAt: r.createdAt.toISOString(),
  };
}

export default router;
