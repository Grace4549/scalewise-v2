import { Router, type IRouter } from "express";
import { db, expertsTable, bookingsTable, reviewsTable, usersTable } from "@workspace/db";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { formatApplication, formatExpert } from "./experts";
import { UpdateBookingStatusBody } from "@workspace/api-zod";

const router: IRouter = Router();

const COMMISSION_RATES: Record<string, number> = {
  discovery: 0.20,
  consultancy: 0.20,
  growth_3mo: 0.15,
  growth_6mo: 0.15,
};

function adminMiddleware() {
  return async (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): Promise<void> => {
    await requireAuth(req, res, () => {
      if (req.userRole !== "admin") {
        res.status(403).json({ error: "Admin only" });
        return;
      }
      next();
    });
  };
}

function formatAdminBooking(
  b: typeof bookingsTable.$inferSelect,
  expertMap: Record<number, typeof expertsTable.$inferSelect>,
  clientMap: Record<number, typeof usersTable.$inferSelect>
) {
  const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
  const amount = b.amount ?? 0;
  const commission = amount * rate;
  const expertEarnings = amount - commission;
  return {
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
    commission,
    commissionRate: rate,
    expertEarnings,
    clientName: clientMap[b.clientId]?.name ?? null,
    expertName: expertMap[b.expertId]?.name ?? null,
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/admin/applications", adminMiddleware(), async (_req, res): Promise<void> => {
  const experts = await db.select().from(expertsTable).orderBy(expertsTable.createdAt);
  res.json(experts.map(formatApplication));
});

router.post("/admin/applications/:id/approve", adminMiddleware(), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [expert] = await db
    .update(expertsTable)
    .set({ status: "approved" })
    .where(eq(expertsTable.id, id))
    .returning();

  if (!expert) { res.status(404).json({ error: "Not found" }); return; }

  if (expert.userId) {
    await db.update(usersTable).set({ role: "expert" }).where(eq(usersTable.id, expert.userId));
  }

  res.json(formatApplication(expert));
});

router.post("/admin/applications/:id/reject", adminMiddleware(), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [expert] = await db
    .update(expertsTable)
    .set({ status: "rejected" })
    .where(eq(expertsTable.id, id))
    .returning();

  if (!expert) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatApplication(expert));
});

router.get("/admin/bookings", adminMiddleware(), async (req, res): Promise<void> => {
  const conditions: ReturnType<typeof eq>[] = [];

  const status = req.query.status as string | undefined;
  const expertIdRaw = req.query.expertId as string | undefined;
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;

  if (status && ["upcoming", "completed", "cancelled", "no-show"].includes(status)) {
    conditions.push(eq(bookingsTable.status, status as "upcoming" | "completed" | "cancelled" | "no-show"));
  }
  if (expertIdRaw) {
    const eid = parseInt(expertIdRaw, 10);
    if (!isNaN(eid)) conditions.push(eq(bookingsTable.expertId, eid));
  }
  if (dateFrom) {
    conditions.push(gte(bookingsTable.scheduledTime, new Date(dateFrom)));
  }
  if (dateTo) {
    conditions.push(lte(bookingsTable.scheduledTime, new Date(dateTo)));
  }

  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(bookingsTable.createdAt);

  const expertIds = [...new Set(bookings.map((b) => b.expertId))];
  const clientIds = [...new Set(bookings.map((b) => b.clientId))];

  const experts = expertIds.length > 0
    ? await db.select().from(expertsTable).where(sql`${expertsTable.id} = ANY(${expertIds})`)
    : [];
  const clients = clientIds.length > 0
    ? await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(${clientIds})`)
    : [];

  const expertMap = Object.fromEntries(experts.map((e) => [e.id, e]));
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  res.json(bookings.map((b) => formatAdminBooking(b, expertMap, clientMap)));
});

router.patch("/admin/bookings/:id/status", adminMiddleware(), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateBookingStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: parsed.data.status })
    .where(eq(bookingsTable.id, id))
    .returning();

  if (parsed.data.status === "completed") {
    await db.update(expertsTable)
      .set({ totalSessions: sql`${expertsTable.totalSessions} + 1` })
      .where(eq(expertsTable.id, booking.expertId));
  }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, updated.expertId));
  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, updated.clientId));

  res.json(formatAdminBooking(updated, { [expert.id]: expert }, { [client.id]: client }));
});

router.post("/admin/bookings/:id/mark-paid", adminMiddleware(), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  if (booking.status !== "completed") {
    res.status(400).json({ error: "Only completed bookings can be marked as paid" });
    return;
  }

  const [updated] = await db
    .update(bookingsTable)
    .set({ payoutStatus: "paid", payoutPaidAt: new Date() })
    .where(eq(bookingsTable.id, id))
    .returning();

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, updated.expertId));
  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, updated.clientId));

  res.json(formatAdminBooking(updated, { [expert.id]: expert }, { [client.id]: client }));
});

router.get("/admin/experts/breakdown", adminMiddleware(), async (_req, res): Promise<void> => {
  const experts = await db.select().from(expertsTable).where(eq(expertsTable.status, "approved"));
  const allBookings = await db.select().from(bookingsTable);

  const breakdown = experts.map((expert) => {
    const expertBookings = allBookings.filter((b) => b.expertId === expert.id);
    const completedBookings = expertBookings.filter((b) => b.status === "completed");

    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.amount ?? 0), 0);
    const totalCommission = completedBookings.reduce((sum, b) => {
      const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
      return sum + (b.amount ?? 0) * rate;
    }, 0);
    const expertEarnings = totalRevenue - totalCommission;

    const pendingPayout = completedBookings
      .filter((b) => b.payoutStatus === "pending")
      .reduce((sum, b) => {
        const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
        return sum + (b.amount ?? 0) * (1 - rate);
      }, 0);

    const paidPayout = completedBookings
      .filter((b) => b.payoutStatus === "paid")
      .reduce((sum, b) => {
        const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
        return sum + (b.amount ?? 0) * (1 - rate);
      }, 0);

    return {
      expertId: expert.id,
      expertName: expert.name,
      industry: expert.industry,
      rating: expert.rating,
      totalBookings: expertBookings.length,
      completedBookings: completedBookings.length,
      totalRevenue,
      totalCommission,
      expertEarnings,
      pendingPayout,
      paidPayout,
    };
  });

  res.json(breakdown);
});

router.get("/admin/stats", adminMiddleware(), async (_req, res): Promise<void> => {
  const [expertCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expertsTable)
    .where(eq(expertsTable.status, "approved"));

  const [pendingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expertsTable)
    .where(eq(expertsTable.status, "pending"));

  const [bookingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingsTable);

  const [upcomingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingsTable)
    .where(eq(bookingsTable.status, "upcoming"));

  const [completedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingsTable)
    .where(eq(bookingsTable.status, "completed"));

  const [cancelledCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingsTable)
    .where(eq(bookingsTable.status, "cancelled"));

  const allBookings = await db.select().from(bookingsTable);
  const completedBookings = allBookings.filter((b) => b.status === "completed");

  const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const totalCommission = completedBookings.reduce((sum, b) => {
    const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
    return sum + (b.amount ?? 0) * rate;
  }, 0);

  const pendingPayout = completedBookings
    .filter((b) => b.payoutStatus === "pending")
    .reduce((sum, b) => {
      const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
      return sum + (b.amount ?? 0) * (1 - rate);
    }, 0);

  const paidPayout = completedBookings
    .filter((b) => b.payoutStatus === "paid")
    .reduce((sum, b) => {
      const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
      return sum + (b.amount ?? 0) * (1 - rate);
    }, 0);

  const recentBookings = await db
    .select()
    .from(bookingsTable)
    .orderBy(bookingsTable.createdAt)
    .limit(10);

  const expertIds = [...new Set(recentBookings.map((b) => b.expertId))];
  const clientIds = [...new Set(recentBookings.map((b) => b.clientId))];

  const experts = expertIds.length > 0
    ? await db.select().from(expertsTable).where(sql`${expertsTable.id} = ANY(${expertIds})`)
    : [];
  const clients = clientIds.length > 0
    ? await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(${clientIds})`)
    : [];

  const expertMap = Object.fromEntries(experts.map((e) => [e.id, e]));
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  res.json({
    totalExperts: expertCount?.count ?? 0,
    pendingApplications: pendingCount?.count ?? 0,
    totalBookings: bookingCount?.count ?? 0,
    upcomingBookings: upcomingCount?.count ?? 0,
    completedBookings: completedCount?.count ?? 0,
    cancelledBookings: cancelledCount?.count ?? 0,
    totalRevenue,
    totalCommission,
    pendingPayout,
    paidPayout,
    recentBookings: recentBookings.map((b) => formatAdminBooking(b, expertMap, clientMap)),
  });
});

export default router;
