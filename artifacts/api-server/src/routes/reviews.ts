import { Router, type IRouter } from "express";
import { db, reviewsTable, bookingsTable, usersTable, expertsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireEmailVerified } from "../lib/auth";
import { publicWriteLimiter } from "../lib/limiters";
import { CreateReviewBody, CreateVerifiedReviewBody, ListReviewsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

function formatReview(r: typeof reviewsTable.$inferSelect) {
  return {
    id: r.id,
    reviewerName: r.reviewerName,
    businessName: r.businessName ?? null,
    expertId: r.expertId ?? null,
    rating: r.rating,
    body: r.body,
    reviewType: r.reviewType,
    bookingId: r.bookingId ?? null,
    clientId: r.clientId ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/reviews", async (req, res): Promise<void> => {
  const params = ListReviewsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let reviews;
  if (params.data.expertId) {
    reviews = await db
      .select()
      .from(reviewsTable)
      .where(and(eq(reviewsTable.expertId, params.data.expertId), eq(reviewsTable.reviewType, "public")))
      .orderBy(reviewsTable.createdAt);
  } else {
    reviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.reviewType, "public"))
      .orderBy(reviewsTable.createdAt);
  }

  res.json(reviews.map(formatReview));
});

router.post("/reviews", publicWriteLimiter, async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({
      reviewerName: parsed.data.reviewerName,
      businessName: parsed.data.businessName ?? null,
      expertId: parsed.data.expertId ?? null,
      rating: parsed.data.rating,
      body: parsed.data.body,
      reviewType: "public",
    })
    .returning();

  res.status(201).json(formatReview(review));
});

router.post("/reviews/verified", requireAuth, requireEmailVerified, async (req, res): Promise<void> => {
  const parsed = CreateVerifiedReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { expertId, bookingId, rating, body, businessName } = parsed.data;

  const [expert] = await db
    .select()
    .from(expertsTable)
    .where(eq(expertsTable.id, expertId));

  if (expert && expert.userId === req.userId) {
    res.status(403).json({ error: "Experts cannot review their own profile" });
    return;
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.id, bookingId),
        eq(bookingsTable.clientId, req.userId!),
        eq(bookingsTable.expertId, expertId),
        eq(bookingsTable.status, "completed")
      )
    );

  if (!booking) {
    res.status(400).json({ error: "No completed booking found for this expert" });
    return;
  }

  const [existingReview] = await db
    .select()
    .from(reviewsTable)
    .where(
      and(
        eq(reviewsTable.bookingId, bookingId),
        eq(reviewsTable.clientId, req.userId!)
      )
    );

  if (existingReview) {
    res.status(409).json({ error: "A review for this booking already exists" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));

  const [review] = await db
    .insert(reviewsTable)
    .values({
      reviewerName: user?.name ?? "Anonymous",
      businessName: businessName ?? null,
      expertId,
      rating,
      body,
      reviewType: "verified",
      bookingId,
      clientId: req.userId!,
    })
    .returning();

  res.status(201).json(formatReview(review));
});

router.delete("/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  res.sendStatus(204);
});

export default router;
