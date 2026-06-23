import { Router, type IRouter } from "express";
import { db, bookingsTable, expertsTable, usersTable, payoutBatchesTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const COMMISSION_RATES: Record<string, number> = {
  discovery: 0.20,
  consultancy: 0.20,
  growth_3mo: 0.15,
  growth_6mo: 0.15,
};

const VAT_RATE = 0.16;

const SESSION_TYPE_LABELS: Record<string, string> = {
  discovery: "Business Discovery",
  consultancy: "Consultancy",
  growth_3mo: "Growth Strategy (3 months)",
  growth_6mo: "Growth Strategy (6 months)",
};

function fmt(n: number) { return n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-KE", { timeZone: "Africa/Nairobi", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDateOnly(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi", day: "2-digit", month: "long", year: "numeric" });
}

function adminMiddleware() {
  return async (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): Promise<void> => {
    await requireAuth(req, res, () => {
      if (req.userRole !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
      next();
    });
  };
}

// ── CLIENT: Booking Payment Receipt ──────────────────────────────────────────
router.get("/client/receipts/booking/:bookingId", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "client" && req.userRole !== "admin") {
    res.status(403).json({ error: "Not authorised" }); return;
  }
  const id = parseInt(req.params.bookingId as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) { res.status(404).json({ error: "Not found" }); return; }
  if (req.userRole === "client" && booking.clientId !== req.userId) {
    res.status(403).json({ error: "Not your booking" }); return;
  }
  if (!booking.amount || booking.status === "pending_payment") {
    res.status(400).json({ error: "No payment on this booking" }); return;
  }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, booking.expertId));
  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, booking.clientId));

  res.json({
    receiptType: "client_booking",
    receiptNumber: `SW-BKG-${String(booking.id).padStart(6, "0")}`,
    issuedAt: booking.createdAt.toISOString(),
    company: { name: "ScaleWise", email: "support@scalewise.co.ke", phone: "+254707346331", address: "Nairobi, Kenya" },
    client: { name: client?.name ?? "—", email: client?.email ?? "—" },
    booking: {
      id: booking.id,
      sessionType: SESSION_TYPE_LABELS[booking.sessionType] ?? booking.sessionType,
      expertName: expert?.name ?? "—",
      expertIndustry: expert?.industry ?? "—",
      bookedOn: booking.createdAt.toISOString(),
      scheduledTime: booking.scheduledTime.toISOString(),
      durationMinutes: booking.durationMinutes,
      status: booking.status,
      amount: booking.amount,
      meetLink: booking.meetLink ?? null,
      rescheduledAt: booking.rescheduledAt?.toISOString() ?? null,
      rescheduledFromTime: booking.rescheduledFromTime?.toISOString() ?? null,
      rescheduledBy: booking.rescheduledBy ?? null,
    },
  });
});

// ── CLIENT: Refund Receipt ────────────────────────────────────────────────────
router.get("/client/receipts/refund/:bookingId", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "client" && req.userRole !== "admin") {
    res.status(403).json({ error: "Not authorised" }); return;
  }
  const id = parseInt(req.params.bookingId as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) { res.status(404).json({ error: "Not found" }); return; }
  if (req.userRole === "client" && booking.clientId !== req.userId) {
    res.status(403).json({ error: "Not your booking" }); return;
  }
  if (booking.refundStatus !== "paid") {
    res.status(400).json({ error: "Refund not yet paid" }); return;
  }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, booking.expertId));
  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, booking.clientId));

  res.json({
    receiptType: "client_refund",
    receiptNumber: `SW-REF-${String(booking.id).padStart(6, "0")}`,
    issuedAt: booking.refundPaidAt?.toISOString() ?? new Date().toISOString(),
    company: { name: "ScaleWise", email: "support@scalewise.co.ke", phone: "+254707346331", address: "Nairobi, Kenya" },
    client: { name: client?.name ?? "—", email: client?.email ?? "—" },
    booking: {
      id: booking.id,
      sessionType: SESSION_TYPE_LABELS[booking.sessionType] ?? booking.sessionType,
      expertName: expert?.name ?? "—",
      bookedOn: booking.createdAt.toISOString(),
      scheduledTime: booking.scheduledTime.toISOString(),
      durationMinutes: booking.durationMinutes,
      status: booking.status,
      cancelledBy: booking.cancelledBy ?? null,
      cancelledOn: null,
      originalAmount: booking.amount ?? 0,
      refundPercent: booking.refundPercent ?? 0,
      refundAmount: booking.refundAmount ?? 0,
      refundPaidAt: booking.refundPaidAt?.toISOString() ?? null,
    },
  });
});

// ── CLIENT: List all receipts ─────────────────────────────────────────────────
router.get("/client/receipts", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "client") { res.status(403).json({ error: "Clients only" }); return; }

  const myBookings = await db.select().from(bookingsTable)
    .where(and(eq(bookingsTable.clientId, req.userId!)));

  const expertIds = [...new Set(myBookings.map((b) => b.expertId))];
  const experts = expertIds.length > 0
    ? await db.select().from(expertsTable).where(inArray(expertsTable.id, expertIds))
    : [];
  const expertMap = Object.fromEntries(experts.map((e) => [e.id, e]));

  const receipts = [];
  for (const b of myBookings) {
    if (b.status !== "pending_payment" && b.amount) {
      receipts.push({
        type: "booking",
        receiptNumber: `SW-BKG-${String(b.id).padStart(6, "0")}`,
        date: b.createdAt.toISOString(),
        description: `${SESSION_TYPE_LABELS[b.sessionType] ?? b.sessionType} with ${expertMap[b.expertId]?.name ?? "Expert"}`,
        amount: b.amount,
        status: b.status,
        bookingId: b.id,
        scheduledTime: b.scheduledTime.toISOString(),
      });
    }
    if (b.refundStatus === "paid" && b.refundAmount) {
      receipts.push({
        type: "refund",
        receiptNumber: `SW-REF-${String(b.id).padStart(6, "0")}`,
        date: b.refundPaidAt?.toISOString() ?? b.createdAt.toISOString(),
        description: `Refund for cancelled ${SESSION_TYPE_LABELS[b.sessionType] ?? b.sessionType} with ${expertMap[b.expertId]?.name ?? "Expert"}`,
        amount: b.refundAmount,
        status: "refund_paid",
        bookingId: b.id,
        scheduledTime: b.scheduledTime.toISOString(),
      });
    }
  }

  receipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(receipts);
});

// ── EXPERT: Payout Receipt (by batch id) ─────────────────────────────────────
router.get("/expert/receipts/payout/:batchId", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "expert" && req.userRole !== "admin") {
    res.status(403).json({ error: "Not authorised" }); return;
  }
  const batchId = parseInt(req.params.batchId as string, 10);
  if (isNaN(batchId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [batch] = await db.select().from(payoutBatchesTable).where(eq(payoutBatchesTable.id, batchId));
  if (!batch) { res.status(404).json({ error: "Payout batch not found" }); return; }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, batch.expertId));
  const expertUser = expert?.userId
    ? (await db.select().from(usersTable).where(eq(usersTable.id, expert.userId)))[0]
    : null;

  if (req.userRole === "expert" && expertUser?.id !== req.userId) {
    res.status(403).json({ error: "Not your payout" }); return;
  }

  const sessionBookings = await db.select().from(bookingsTable).where(
    and(
      eq(bookingsTable.expertId, batch.expertId),
      eq(bookingsTable.status, "completed"),
      eq(bookingsTable.payoutStatus, "paid")
    )
  ).then(rows => rows.filter(b =>
    b.payoutPaidAt &&
    b.payoutPaidAt >= batch.periodStart &&
    b.payoutPaidAt <= batch.periodEnd
  ));

  const cancellationBookings = await db.select().from(bookingsTable).where(
    eq(bookingsTable.expertId, batch.expertId)
  ).then(rows => rows.filter(b =>
    (b.status === "cancelled" || b.status === "no-show") &&
    (b.expertCancellationEarning ?? 0) > 0 &&
    b.scheduledTime >= batch.periodStart &&
    b.scheduledTime <= batch.periodEnd
  ));

  const clientIds = [...new Set([
    ...sessionBookings.map(b => b.clientId),
    ...cancellationBookings.map(b => b.clientId),
  ])];
  const clients = clientIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, clientIds))
    : [];
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  const sessionLines = sessionBookings.map(b => {
    const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
    const gross = b.amount ?? 0;
    const commission = gross * rate;
    const net = gross - commission;
    return {
      bookingId: b.id,
      sessionType: SESSION_TYPE_LABELS[b.sessionType] ?? b.sessionType,
      clientName: clientMap[b.clientId]?.name ?? "—",
      scheduledTime: b.scheduledTime.toISOString(),
      payoutPaidAt: b.payoutPaidAt?.toISOString() ?? null,
      bookedOn: b.createdAt.toISOString(),
      grossAmount: gross,
      commissionRate: rate,
      commissionAmount: commission,
      netAmount: net,
      status: b.status,
    };
  });

  const cancellationLines = cancellationBookings.map(b => ({
    bookingId: b.id,
    sessionType: SESSION_TYPE_LABELS[b.sessionType] ?? b.sessionType,
    clientName: clientMap[b.clientId]?.name ?? "—",
    scheduledTime: b.scheduledTime.toISOString(),
    bookedOn: b.createdAt.toISOString(),
    cancelledBy: b.cancelledBy ?? "client",
    status: b.status,
    grossAmount: b.amount ?? 0,
    clientRefundAmount: b.refundAmount ?? 0,
    expertEarning: b.expertCancellationEarning ?? 0,
  }));

  const subtotal = batch.totalAmount;
  const vatAmount = batch.vatAmount;
  const totalBeforeVat = subtotal - vatAmount;

  res.json({
    receiptType: "expert_payout",
    receiptNumber: batch.receiptNumber,
    issuedAt: batch.paidAt.toISOString(),
    company: { name: "ScaleWise", email: "support@scalewise.co.ke", phone: "+254707346331", address: "Nairobi, Kenya" },
    expert: {
      name: expert?.name ?? "—",
      email: expert?.email ?? "—",
      industry: expert?.industry ?? "—",
    },
    period: {
      start: batch.periodStart.toISOString(),
      end: batch.periodEnd.toISOString(),
    },
    paidAt: batch.paidAt.toISOString(),
    sessionLines,
    cancellationLines,
    sessionAmount: batch.sessionAmount,
    cancellationAmount: batch.cancellationAmount,
    subtotal: totalBeforeVat,
    vatRate: VAT_RATE,
    vatAmount,
    totalAmount: batch.totalAmount,
  });
});

// ── EXPERT: List all payout receipts ─────────────────────────────────────────
router.get("/expert/receipts", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "expert") { res.status(403).json({ error: "Experts only" }); return; }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
  if (!expert) { res.status(404).json({ error: "Expert profile not found" }); return; }

  const batches = await db.select().from(payoutBatchesTable)
    .where(eq(payoutBatchesTable.expertId, expert.id))
    .orderBy(payoutBatchesTable.paidAt);

  res.json(batches.map(b => ({
    id: b.id,
    receiptNumber: b.receiptNumber,
    paidAt: b.paidAt.toISOString(),
    periodStart: b.periodStart.toISOString(),
    periodEnd: b.periodEnd.toISOString(),
    totalAmount: b.totalAmount,
    sessionAmount: b.sessionAmount,
    cancellationAmount: b.cancellationAmount,
    vatAmount: b.vatAmount,
  })));
});

// ── ADMIN: List all receipts ──────────────────────────────────────────────────
router.get("/admin/receipts", adminMiddleware(), async (_req, res): Promise<void> => {
  const batches = await db.select().from(payoutBatchesTable).orderBy(payoutBatchesTable.paidAt);
  const expertIds = [...new Set(batches.map(b => b.expertId))];
  const experts = expertIds.length > 0
    ? await db.select().from(expertsTable).where(inArray(expertsTable.id, expertIds))
    : [];
  const expertMap = Object.fromEntries(experts.map(e => [e.id, e]));

  const paidRefunds = await db.select().from(bookingsTable)
    .where(eq(bookingsTable.refundStatus, "paid"));

  const clientIds = [...new Set(paidRefunds.map(b => b.clientId))];
  const refundExpertIds = [...new Set(paidRefunds.map(b => b.expertId))];
  const refundClients = clientIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, clientIds))
    : [];
  const refundExperts = refundExpertIds.length > 0
    ? await db.select().from(expertsTable).where(inArray(expertsTable.id, refundExpertIds))
    : [];
  const clientMap = Object.fromEntries(refundClients.map(c => [c.id, c]));
  const refundExpertMap = Object.fromEntries(refundExperts.map(e => [e.id, e]));

  const payoutReceipts = batches.map(b => ({
    receiptType: "expert_payout",
    receiptNumber: b.receiptNumber,
    date: b.paidAt.toISOString(),
    expertId: b.expertId,
    expertName: expertMap[b.expertId]?.name ?? "—",
    totalAmount: b.totalAmount,
    vatAmount: b.vatAmount,
    periodStart: b.periodStart.toISOString(),
    periodEnd: b.periodEnd.toISOString(),
    batchId: b.id,
  }));

  const refundReceipts = paidRefunds.map(b => ({
    receiptType: "client_refund",
    receiptNumber: `SW-REF-${String(b.id).padStart(6, "0")}`,
    date: b.refundPaidAt?.toISOString() ?? b.createdAt.toISOString(),
    clientId: b.clientId,
    clientName: clientMap[b.clientId]?.name ?? "—",
    expertName: refundExpertMap[b.expertId]?.name ?? "—",
    refundAmount: b.refundAmount ?? 0,
    bookingId: b.id,
  }));

  res.json({
    payoutReceipts: payoutReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    refundReceipts: refundReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  });
});

// ── ADMIN: Create payout batch (expert weekly pay) ────────────────────────────
router.post("/admin/experts/:id/payout", adminMiddleware(), async (req, res): Promise<void> => {
  const expertId = parseInt(req.params.id as string, 10);
  if (isNaN(expertId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { periodStart, periodEnd, notes } = req.body as {
    periodStart?: string;
    periodEnd?: string;
    notes?: string;
  };

  const end = periodEnd ? new Date(periodEnd) : new Date();

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, expertId));
  if (!expert) { res.status(404).json({ error: "Expert not found" }); return; }

  const sessionBookings = await db.select().from(bookingsTable).where(
    and(
      eq(bookingsTable.expertId, expertId),
      eq(bookingsTable.status, "completed"),
      eq(bookingsTable.payoutStatus, "pending")
    )
  ).then(rows => rows.filter(b => b.scheduledTime <= end));

  const cancellationBookings = await db.select().from(bookingsTable).where(
    eq(bookingsTable.expertId, expertId)
  ).then(rows => rows.filter(b =>
    (b.status === "cancelled" || b.status === "no-show") &&
    (b.expertCancellationEarning ?? 0) > 0 &&
    b.scheduledTime <= end
  ));

  const sessionAmount = sessionBookings.reduce((sum, b) => {
    const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
    return sum + (b.amount ?? 0) * (1 - rate);
  }, 0);

  const cancellationAmount = cancellationBookings.reduce(
    (sum, b) => sum + (b.expertCancellationEarning ?? 0), 0
  );

  const subtotal = sessionAmount + cancellationAmount;
  const vatAmount = subtotal * VAT_RATE;
  const totalAmount = subtotal + vatAmount;

  const now = new Date();
  const receiptNumber = `SW-PAY-${expertId}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getTime()).slice(-4)}`;

  const derivedStart = periodStart
    ? new Date(periodStart)
    : (sessionBookings.length > 0
        ? new Date(Math.min(...sessionBookings.map(b => b.scheduledTime.getTime())))
        : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000));

  const [batch] = await db.insert(payoutBatchesTable).values({
    expertId,
    adminId: req.userId!,
    periodStart: derivedStart,
    periodEnd: end,
    paidAt: now,
    totalAmount,
    sessionAmount,
    cancellationAmount,
    vatAmount,
    notes: notes ?? null,
    receiptNumber,
  }).returning();

  if (sessionBookings.length > 0) {
    await db.update(bookingsTable)
      .set({ payoutStatus: "paid", payoutPaidAt: now })
      .where(inArray(bookingsTable.id, sessionBookings.map(b => b.id)));
  }

  res.json({ batchId: batch.id, receiptNumber: batch.receiptNumber, totalAmount, sessionAmount, cancellationAmount, vatAmount });
});

// ── ADMIN: Mark refund paid (with timestamp) ──────────────────────────────────
router.post("/admin/bookings/:id/mark-refund-paid", adminMiddleware(), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
  if (booking.refundStatus !== "pending") {
    res.status(400).json({ error: "No pending refund on this booking" }); return;
  }

  const now = new Date();
  const [updated] = await db
    .update(bookingsTable)
    .set({ refundStatus: "paid", refundPaidAt: now })
    .where(eq(bookingsTable.id, id))
    .returning();

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, updated.expertId));
  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, updated.clientId));

  res.json({
    id: updated.id,
    refundStatus: updated.refundStatus,
    refundPaidAt: updated.refundPaidAt?.toISOString() ?? null,
    clientName: client?.name ?? null,
    expertName: expert?.name ?? null,
    refundAmount: updated.refundAmount,
  });
});

export { fmt, fmtDate, fmtDateOnly };
export default router;
