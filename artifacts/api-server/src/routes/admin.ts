import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, expertsTable, bookingsTable, reviewsTable, usersTable } from "@workspace/db";
import { and, eq, ne, gte, lte, sql, isNotNull, isNull, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { formatApplication, formatExpert } from "./experts";
import { UpdateBookingStatusBody } from "@workspace/api-zod";
import { sendExpertApprovedEmail, sendExpertRejectedEmail, sendExpertPayoutEmail } from "../lib/email";
import { createNotification } from "../lib/notify";
import { logger } from "../lib/logger";

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

function calcRefundAdmin(
  amount: number,
  cancelledBy: "client" | "expert" | "admin",
  scheduledTime: Date,
  wasNoShow = false
): { refundPercent: number; refundAmount: number; expertCancellationEarning: number } {
  if (wasNoShow) {
    return { refundPercent: 50, refundAmount: amount * 0.5, expertCancellationEarning: amount * 0.30 };
  }
  if (cancelledBy === "expert" || cancelledBy === "admin") {
    return { refundPercent: 100, refundAmount: amount, expertCancellationEarning: 0 };
  }
  const hoursUntil = (scheduledTime.getTime() - Date.now()) / 3600000;
  if (hoursUntil > 24) {
    return { refundPercent: 100, refundAmount: amount, expertCancellationEarning: 0 };
  }
  return { refundPercent: 75, refundAmount: amount * 0.75, expertCancellationEarning: amount * 0.15 };
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
    cancelledBy: b.cancelledBy ?? null,
    cancellationReason: b.cancellationReason ?? null,
    refundStatus: b.refundStatus,
    refundAmount: b.refundAmount ?? null,
    refundPercent: b.refundPercent ?? null,
    expertCancellationEarning: b.expertCancellationEarning ?? null,
    rescheduledBy: b.rescheduledBy ?? null,
    rescheduledFromTime: b.rescheduledFromTime ? b.rescheduledFromTime.toISOString() : null,
    rescheduledAt: b.rescheduledAt ? b.rescheduledAt.toISOString() : null,
    isTestBooking: b.isTestBooking,
  };
}

router.get("/admin/applications", adminMiddleware(), async (req, res): Promise<void> => {
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;

  const conditions: ReturnType<typeof eq>[] = [];
  if (dateFrom) conditions.push(gte(expertsTable.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(expertsTable.createdAt, new Date(dateTo)));

  const experts = await db
    .select()
    .from(expertsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(expertsTable.createdAt);

  res.json(experts.map(formatApplication));
});

router.post("/admin/applications/:id/approve", adminMiddleware(), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db
    .select()
    .from(expertsTable)
    .where(eq(expertsTable.id, id));

  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const plaintextInviteToken = crypto.randomBytes(32).toString("hex");
  const inviteTokenHash = crypto.createHash("sha256").update(plaintextInviteToken).digest("hex");
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [expert] = await db
    .update(expertsTable)
    .set({ status: "approved", inviteToken: inviteTokenHash, inviteExpiresAt })
    .where(eq(expertsTable.id, id))
    .returning();

  if (!expert) { res.status(404).json({ error: "Not found" }); return; }

  // Send welcome/setup email to the approved applicant (fire and forget)
  sendExpertApprovedEmail({
    to: expert.email,
    expertName: expert.name,
    inviteToken: plaintextInviteToken,
    expertEmail: expert.email,
  }).catch((err) => logger.error({ err, expertId: expert.id }, "sendExpertApprovedEmail failed"));

  res.json({
    ...formatApplication(expert),
    inviteToken: plaintextInviteToken,
  });
});

router.post("/admin/applications/:id/regenerate-invite", adminMiddleware(), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select().from(expertsTable).where(eq(expertsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  if (existing.status !== "approved") { res.status(400).json({ error: "Application is not approved" }); return; }

  const plaintextInviteToken = crypto.randomBytes(32).toString("hex");
  const inviteTokenHash = crypto.createHash("sha256").update(plaintextInviteToken).digest("hex");
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.update(expertsTable).set({ inviteToken: inviteTokenHash, inviteExpiresAt }).where(eq(expertsTable.id, id));

  res.json({ inviteToken: plaintextInviteToken });
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

  // Notify the applicant of the rejection (fire and forget)
  sendExpertRejectedEmail({
    to: expert.email,
    expertName: expert.name,
  }).catch((err) => logger.error({ err, expertId: expert.id }, "sendExpertRejectedEmail failed"));

  res.json(formatApplication(expert));
});

router.delete("/admin/experts/:id", adminMiddleware(), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, id));
  if (!expert) { res.status(404).json({ error: "Expert not found" }); return; }

  if (expert.userId) {
    await db.update(usersTable).set({ role: "client" }).where(eq(usersTable.id, expert.userId));
  }

  await db.delete(expertsTable).where(eq(expertsTable.id, id));
  res.sendStatus(204);
});

router.get("/admin/bookings", adminMiddleware(), async (req, res): Promise<void> => {
  const conditions: ReturnType<typeof eq>[] = [];

  const status = req.query.status as string | undefined;
  const expertIdRaw = req.query.expertId as string | undefined;
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;

  if (status && ["pending_payment", "upcoming", "completed", "cancelled", "no-show"].includes(status)) {
    conditions.push(eq(bookingsTable.status, status as "pending_payment" | "upcoming" | "completed" | "cancelled" | "no-show"));
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
    ? await db.select().from(expertsTable).where(inArray(expertsTable.id, expertIds))
    : [];
  const clients = clientIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, clientIds))
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

  const newStatus = parsed.data.status;
  const updateFields: Record<string, unknown> = { status: newStatus };

  if (newStatus === "upcoming" && !booking.meetLink) {
    const { generateMeetLink } = await import("../lib/auth");
    updateFields.meetLink = generateMeetLink();
  }

  if (newStatus === "cancelled") {
    const cancelledBy = (parsed.data as { cancelledBy?: string }).cancelledBy as "client" | "expert" | "admin" ?? "admin";
    updateFields.cancelledBy = cancelledBy;
    updateFields.cancellationReason = (parsed.data as { reason?: string }).reason ?? null;
    if (booking.status === "upcoming" && booking.amount) {
      const ref = calcRefundAdmin(booking.amount, cancelledBy, booking.scheduledTime);
      updateFields.refundStatus = "pending";
      updateFields.refundPercent = ref.refundPercent;
      updateFields.refundAmount = ref.refundAmount;
      updateFields.expertCancellationEarning = ref.expertCancellationEarning;
    } else {
      updateFields.refundStatus = "none";
    }
  }

  if (newStatus === "no-show" && booking.amount) {
    const ref = calcRefundAdmin(booking.amount, "client", booking.scheduledTime, true);
    updateFields.refundStatus = "pending";
    updateFields.refundPercent = ref.refundPercent;
    updateFields.refundAmount = ref.refundAmount;
    updateFields.expertCancellationEarning = ref.expertCancellationEarning;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(bookingsTable).set(updateFields as any).where(eq(bookingsTable.id, id)).returning();

  if (newStatus === "completed") {
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

  // Notify the expert of their payout (fire and forget)
  if (expert?.userId && updated.amount) {
    const commission = COMMISSION_RATES[updated.sessionType] ?? 0.20;
    const netAmount = Math.round(updated.amount * (1 - commission));
    createNotification({
      bookingId: updated.id,
      recipientUserId: expert.userId,
      notificationType: "payout_processed",
      recipientEmail: expert.email,
      recipientName: expert.name,
      payload: {
        title: "Payout Processed",
        body: `Your payout of KES ${netAmount.toLocaleString()} has been sent. Check your bank account within a few business days.`,
        sessionStart: updated.scheduledTime.toISOString(),
        sessionType: updated.sessionType,
      },
    }).catch((err: unknown) => logger.error({ err }, "payout_processed notification failed"));
  }

  res.json(formatAdminBooking(updated, { [expert.id]: expert }, { [client.id]: client }));
});

// mark-refund-paid is handled in receipts router (sets refundPaidAt too)
// Kept here for backward compat — delegates to same logic
router.post("/admin/bookings/:id/mark-refund-paid-legacy", adminMiddleware(), async (req, res): Promise<void> => {
  res.status(410).json({ error: "Use POST /admin/bookings/:id/mark-refund-paid" });
});

router.post("/admin/experts/:id/mark-paid", adminMiddleware(), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const expertId = parseInt(raw, 10);
  if (isNaN(expertId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const paidAt = req.body?.paidAt ? new Date(req.body.paidAt) : new Date();

  const updated = await db
    .update(bookingsTable)
    .set({ payoutStatus: "paid", payoutPaidAt: paidAt })
    .where(
      and(
        eq(bookingsTable.expertId, expertId),
        eq(bookingsTable.status, "completed"),
        eq(bookingsTable.payoutStatus, "pending")
      )
    )
    .returning();

  // Notify the expert of their payout (fire and forget)
  if (updated.length > 0) {
    const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, expertId));
    if (expert) {
      const totalAmount = updated.reduce((sum, b) => sum + (b.amount ?? 0), 0);
      sendExpertPayoutEmail({
        to: expert.email,
        expertName: expert.name,
        totalAmount,
        sessionCount: updated.length,
      }).catch((err) => logger.error({ err, expertId }, "sendExpertPayoutEmail failed"));

      // In-app notification with total net payout
      if (expert.userId) {
        const totalNet = updated.reduce((sum, b) => {
          const commission = COMMISSION_RATES[b.sessionType] ?? 0.20;
          return sum + Math.round((b.amount ?? 0) * (1 - commission));
        }, 0);
        createNotification({
          bookingId: null,
          recipientUserId: expert.userId,
          notificationType: "payout_processed",
          recipientEmail: expert.email,
          recipientName: expert.name,
          payload: {
            title: "Payout Processed",
            body: `Your payout of KES ${totalNet.toLocaleString()} has been sent. Check your bank account within a few business days.`,
          },
        }).catch((err: unknown) => logger.error({ err, expertId }, "payout_processed notification failed"));
      }
    }
  }

  res.json({ count: updated.length });
});

router.get("/admin/experts/breakdown", adminMiddleware(), async (req, res): Promise<void> => {
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;

  const experts = await db.select().from(expertsTable).where(eq(expertsTable.status, "approved"));

  const bookingConditions: ReturnType<typeof eq>[] = [];
  if (dateFrom) bookingConditions.push(gte(bookingsTable.scheduledTime, new Date(dateFrom)));
  if (dateTo) bookingConditions.push(lte(bookingsTable.scheduledTime, new Date(dateTo)));

  const allBookings = await db
    .select()
    .from(bookingsTable)
    .where(bookingConditions.length > 0 ? and(...bookingConditions) : undefined);

  const breakdown = experts.map((expert) => {
    const expertBookings = allBookings.filter((b) => b.expertId === expert.id);
    const completedBookings = expertBookings.filter((b) => b.status === "completed");
    const cancellationBookings = expertBookings.filter(
      (b) => (b.status === "cancelled" || b.status === "no-show") && (b.expertCancellationEarning ?? 0) > 0
    );

    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.amount ?? 0), 0);
    const totalCommission = completedBookings.reduce((sum, b) => {
      const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
      return sum + (b.amount ?? 0) * rate;
    }, 0);
    const expertEarnings = totalRevenue - totalCommission;

    const cancellationEarnings = cancellationBookings.reduce(
      (sum, b) => sum + (b.expertCancellationEarning ?? 0), 0
    );
    const expertTotal = expertEarnings + cancellationEarnings;

    const sessionPendingPayout = completedBookings
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

    const pendingPayout = sessionPendingPayout + cancellationEarnings;

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
      cancellationEarnings,
      expertTotal,
      sessionPendingPayout,
      cancellationPendingPayout: cancellationEarnings,
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
    .where(and(eq(expertsTable.status, "approved"), isNotNull(expertsTable.userId)));

  const [pendingRegistrationCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expertsTable)
    .where(and(eq(expertsTable.status, "approved"), isNull(expertsTable.userId)));

  const [pendingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expertsTable)
    .where(eq(expertsTable.status, "pending"));

  const [bookingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingsTable)
    .where(ne(bookingsTable.status, "pending_payment"));

  const [pendingPaymentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingsTable)
    .where(eq(bookingsTable.status, "pending_payment"));

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
  const realBookings = allBookings.filter((b) => !b.isTestBooking);
  const completedBookings = realBookings.filter((b) => b.status === "completed");
  const cancellationBookings = realBookings.filter(
    (b) => (b.status === "cancelled" || b.status === "no-show") && (b.expertCancellationEarning ?? 0) > 0
  );

  // Gross volume = all money collected from clients (non-pending_payment bookings with an amount)
  const grossVolume = realBookings
    .filter((b) => b.status !== "pending_payment" && b.amount != null)
    .reduce((sum, b) => sum + (b.amount ?? 0), 0);

  // Refund amounts in KES
  const pendingRefundAmount = realBookings
    .filter((b) => b.refundStatus === "pending" && b.refundAmount != null)
    .reduce((sum, b) => sum + (b.refundAmount ?? 0), 0);
  const paidRefundAmount = realBookings
    .filter((b) => b.refundStatus === "paid" && b.refundAmount != null)
    .reduce((sum, b) => sum + (b.refundAmount ?? 0), 0);

  // Net revenue = gross minus what has already been refunded to clients
  const totalRevenue = grossVolume - paidRefundAmount;

  // Platform revenue from completed sessions (commission)
  const sessionPlatformRevenue = completedBookings.reduce((sum, b) => {
    const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
    return sum + (b.amount ?? 0) * rate;
  }, 0);

  // Platform revenue from cancellations (amount - refund - expert earning)
  const cancellationPlatformRevenue = realBookings
    .filter((b) => (b.status === "cancelled" || b.status === "no-show") && b.amount != null && b.refundAmount != null)
    .reduce((sum, b) => {
      const kept = (b.amount ?? 0) - (b.refundAmount ?? 0) - (b.expertCancellationEarning ?? 0);
      return sum + Math.max(0, kept);
    }, 0);

  const totalCommission = sessionPlatformRevenue + cancellationPlatformRevenue;

  // Expert cancellation earnings (owed to experts from client cancellations and no-shows)
  const cancellationExpertEarnings = cancellationBookings.reduce(
    (sum, b) => sum + (b.expertCancellationEarning ?? 0), 0
  );

  // Expert payout from completed sessions
  const sessionPendingPayout = completedBookings
    .filter((b) => b.payoutStatus === "pending")
    .reduce((sum, b) => {
      const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
      return sum + (b.amount ?? 0) * (1 - rate);
    }, 0);

  const sessionPaidPayout = completedBookings
    .filter((b) => b.payoutStatus === "paid")
    .reduce((sum, b) => {
      const rate = COMMISSION_RATES[b.sessionType] ?? 0.20;
      return sum + (b.amount ?? 0) * (1 - rate);
    }, 0);

  // Total pending payout includes session pending + all cancellation expert earnings (treated as owed)
  const pendingPayout = sessionPendingPayout + cancellationExpertEarnings;
  const paidPayout = sessionPaidPayout;

  const recentBookings = await db
    .select()
    .from(bookingsTable)
    .orderBy(bookingsTable.createdAt)
    .limit(10);

  const expertIds = [...new Set(recentBookings.map((b) => b.expertId))];
  const clientIds = [...new Set(recentBookings.map((b) => b.clientId))];

  const experts = expertIds.length > 0
    ? await db.select().from(expertsTable).where(inArray(expertsTable.id, expertIds))
    : [];
  const clients = clientIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, clientIds))
    : [];

  const expertMap = Object.fromEntries(experts.map((e) => [e.id, e]));
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  const [pendingRefundCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingsTable)
    .where(eq(bookingsTable.refundStatus, "pending"));

  const [paidRefundCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingsTable)
    .where(eq(bookingsTable.refundStatus, "paid"));

  res.json({
    totalExperts: expertCount?.count ?? 0,
    pendingRegistration: pendingRegistrationCount?.count ?? 0,
    pendingApplications: pendingCount?.count ?? 0,
    totalBookings: bookingCount?.count ?? 0,
    pendingPaymentBookings: pendingPaymentCount?.count ?? 0,
    upcomingBookings: upcomingCount?.count ?? 0,
    completedBookings: completedCount?.count ?? 0,
    cancelledBookings: cancelledCount?.count ?? 0,
    grossVolume,
    pendingRefundAmount,
    paidRefundAmount,
    cancellationPlatformRevenue,
    cancellationExpertEarnings,
    sessionPendingPayout,
    sessionPaidPayout,
    totalRevenue,
    totalCommission,
    pendingPayout,
    paidPayout,
    pendingRefunds: pendingRefundCount?.count ?? 0,
    paidRefunds: paidRefundCount?.count ?? 0,
    recentBookings: recentBookings.map((b) => formatAdminBooking(b, expertMap, clientMap)),
    testMode: process.env.TEST_MODE === "true",
  });
});

export default router;
