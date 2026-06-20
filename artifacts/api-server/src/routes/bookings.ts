import { Router, type IRouter } from "express";
import { db, bookingsTable, expertsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { generateMeetLink } from "../lib/auth";
import { CreateBookingBody, UpdateBookingStatusBody } from "@workspace/api-zod";

const router: IRouter = Router();

export function getCommissionRate(sessionType: string): number {
  if (sessionType === "growth_3mo" || sessionType === "growth_6mo") return 0.15;
  return 0.20;
}

function getPriceForSession(expert: typeof expertsTable.$inferSelect, sessionType: string): number | null {
  switch (sessionType) {
    case "discovery": return expert.discoveryPrice;
    case "consultancy": return expert.consultancyPrice;
    case "growth_3mo": return expert.growthPrice3mo;
    case "growth_6mo": return expert.growthPrice6mo;
    default: return null;
  }
}

export function formatBooking(
  b: typeof bookingsTable.$inferSelect,
  expertMap: Record<number, typeof expertsTable.$inferSelect>,
  clientMap: Record<number, typeof usersTable.$inferSelect>
) {
  const expert = expertMap[b.expertId];
  const client = clientMap[b.clientId];
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
    clientName: client?.name ?? null,
    expertName: expert?.name ?? null,
    expertIndustry: expert?.industry ?? null,
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/bookings", requireAuth, async (req, res): Promise<void> => {
  let bookings: (typeof bookingsTable.$inferSelect)[];

  if (req.userRole === "expert") {
    const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
    if (!expert) { res.json([]); return; }
    bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.expertId, expert.id));
  } else {
    bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.clientId, req.userId!));
  }

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

  res.json(bookings.map((b) => formatBooking(b, expertMap, clientMap)));
});

router.post("/bookings", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { expertId, sessionType, scheduledTime, durationMinutes, notes } = parsed.data;

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, expertId));
  if (!expert) { res.status(404).json({ error: "Expert not found" }); return; }

  if (expert.userId === req.userId) {
    res.status(403).json({ error: "Experts cannot book their own profile" });
    return;
  }

  const amount = getPriceForSession(expert, sessionType);
  const meetLink = generateMeetLink();

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      clientId: req.userId!,
      expertId,
      sessionType: sessionType as "discovery" | "consultancy" | "growth_3mo" | "growth_6mo",
      scheduledTime: new Date(scheduledTime),
      durationMinutes,
      notes: notes ?? null,
      meetLink,
      amount: amount ?? null,
      status: "upcoming",
    })
    .returning();

  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  res.status(201).json(formatBooking(booking, { [expert.id]: expert }, { [client.id]: client }));
});

router.get("/bookings/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  if (req.userRole !== "admin" && booking.clientId !== req.userId) {
    const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
    if (!expert || expert.id !== booking.expertId) { res.status(403).json({ error: "Forbidden" }); return; }
  }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, booking.expertId));
  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, booking.clientId));

  res.json(formatBooking(booking, { [expert.id]: expert }, { [client.id]: client }));
});

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "no-show"]);

const EXPERT_ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
  upcoming: new Set(["no-show", "cancelled"]),
};

const ADMIN_ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
  upcoming: new Set(["completed", "cancelled", "no-show"]),
};

router.patch("/bookings/:id/status", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateBookingStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  if (TERMINAL_STATUSES.has(booking.status)) {
    res.status(409).json({ error: "Booking status cannot be changed once it is completed, cancelled, or no-show" });
    return;
  }

  const newStatus = parsed.data.status;

  if (req.userRole === "expert") {
    const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
    if (!expert || expert.id !== booking.expertId) { res.status(403).json({ error: "Forbidden" }); return; }
    const allowed = EXPERT_ALLOWED_TRANSITIONS[booking.status];
    if (!allowed || !allowed.has(newStatus)) {
      res.status(403).json({ error: "Experts may only mark an upcoming booking as no-show or cancelled" });
      return;
    }
  } else if (req.userRole === "admin") {
    const allowed = ADMIN_ALLOWED_TRANSITIONS[booking.status];
    if (!allowed || !allowed.has(newStatus)) {
      res.status(400).json({ error: `Transition from '${booking.status}' to '${newStatus}' is not permitted` });
      return;
    }
  } else {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [updated] = await db
    .update(bookingsTable)
    .set({ status: newStatus })
    .where(eq(bookingsTable.id, id))
    .returning();

  if (newStatus === "completed") {
    await db.update(expertsTable)
      .set({ totalSessions: sql`${expertsTable.totalSessions} + 1` })
      .where(eq(expertsTable.id, booking.expertId));
  }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, booking.expertId));
  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, booking.clientId));

  res.json(formatBooking(updated, { [expert.id]: expert }, { [client.id]: client }));
});

export default router;
