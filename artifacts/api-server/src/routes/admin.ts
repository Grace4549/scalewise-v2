import { Router, type IRouter } from "express";
import { db, expertsTable, bookingsTable, reviewsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { formatApplication, formatExpert } from "./experts";

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

router.get("/admin/applications", adminMiddleware(), async (_req, res): Promise<void> => {
  const experts = await db
    .select()
    .from(expertsTable)
    .orderBy(expertsTable.createdAt);

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
    await db
      .update(usersTable)
      .set({ role: "expert" })
      .where(eq(usersTable.id, expert.userId));
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

router.get("/admin/bookings", adminMiddleware(), async (_req, res): Promise<void> => {
  const bookings = await db
    .select()
    .from(bookingsTable)
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

  res.json(
    bookings.map((b) => {
      const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
      const amount = b.amount ?? 0;
      return {
        id: b.id,
        clientId: b.clientId,
        expertId: b.expertId,
        sessionType: b.sessionType,
        scheduledTime: b.scheduledTime.toISOString(),
        durationMinutes: b.durationMinutes,
        status: b.status,
        notes: b.notes ?? null,
        meetLink: b.meetLink ?? null,
        amount: b.amount ?? null,
        commission: amount * rate,
        commissionRate: rate,
        clientName: clientMap[b.clientId]?.name ?? null,
        expertName: expertMap[b.expertId]?.name ?? null,
        createdAt: b.createdAt.toISOString(),
      };
    })
  );
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

  const allBookings = await db.select().from(bookingsTable);
  const totalRevenue = allBookings.reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const totalCommission = allBookings.reduce((sum, b) => {
    const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
    return sum + (b.amount ?? 0) * rate;
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
    totalRevenue,
    totalCommission,
    recentBookings: recentBookings.map((b) => {
      const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
      const amount = b.amount ?? 0;
      return {
        id: b.id,
        clientId: b.clientId,
        expertId: b.expertId,
        sessionType: b.sessionType,
        scheduledTime: b.scheduledTime.toISOString(),
        durationMinutes: b.durationMinutes,
        status: b.status,
        notes: b.notes ?? null,
        meetLink: b.meetLink ?? null,
        amount: b.amount ?? null,
        commission: amount * rate,
        commissionRate: rate,
        clientName: clientMap[b.clientId]?.name ?? null,
        expertName: expertMap[b.expertId]?.name ?? null,
        createdAt: b.createdAt.toISOString(),
      };
    }),
  });
});

export default router;
