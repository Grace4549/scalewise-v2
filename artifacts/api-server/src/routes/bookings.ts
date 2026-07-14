import { Router, type IRouter } from "express";
import { db, bookingsTable, expertsTable, usersTable } from "@workspace/db";
import { eq, sql, and, not, inArray, lt } from "drizzle-orm";
import { requireAuth, requireEmailVerified } from "../lib/auth";
import { generateMeetLink } from "../lib/auth";
import { CreateBookingBody, UpdateBookingStatusBody } from "@workspace/api-zod";
import { createNotification } from "../lib/notify";
import { sendClientBookingConfirmationEmail } from "../lib/email";
import { generateClientBookingReceiptPdf } from "../lib/pdf";

const router: IRouter = Router();

export function getCommissionRate(sessionType: string): number {
  if (sessionType === "growth_3mo" || sessionType === "growth_6mo") return 0.15;
  return 0.20;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-KE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Africa/Nairobi",
  });
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-KE", {
    hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi",
  });
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
  clientMap: Record<number, typeof usersTable.$inferSelect>,
  includePayoutFields = false
) {
  const expert = expertMap[b.expertId];
  const client = clientMap[b.clientId];
  const base = {
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
    clientName: client?.name ?? null,
    expertName: expert?.name ?? null,
    expertIndustry: expert?.industry ?? null,
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
  if (includePayoutFields) {
    return {
      ...base,
      payoutStatus: b.payoutStatus,
      payoutPaidAt: b.payoutPaidAt ? b.payoutPaidAt.toISOString() : null,
    };
  }
  return base;
}

function calcRefund(
  amount: number,
  cancelledBy: "client" | "expert" | "admin",
  scheduledTime: Date,
  wasNoShow = false,
  effectiveScheduledTime?: Date
): { refundPercent: number; refundAmount: number; expertCancellationEarning: number } {
  // effectiveScheduledTime is used to pin refund liability to the original booking
  // time when a client rescheduled — prevents gaming the refund by rescheduling
  // an imminent session to the future before cancelling.
  const refundAnchorTime = effectiveScheduledTime ?? scheduledTime;
  if (wasNoShow) {
    // Client no-show: 50% refund, expert receives 35%, platform keeps 15%
    return {
      refundPercent: 50,
      refundAmount: amount * 0.5,
      expertCancellationEarning: amount * 0.35,
    };
  }
  if (cancelledBy === "expert" || cancelledBy === "admin") {
    // Expert cancels: 100% refund to client, expert receives nothing
    return { refundPercent: 100, refundAmount: amount, expertCancellationEarning: 0 };
  }
  const hoursUntil = (refundAnchorTime.getTime() - Date.now()) / 3600000;
  if (hoursUntil > 24) {
    // Client cancels >24h before: 100% refund, expert receives nothing
    return { refundPercent: 100, refundAmount: amount, expertCancellationEarning: 0 };
  }
  // Client cancels <24h before: 75% refund, expert receives 20%, platform keeps 5%
  return {
    refundPercent: 75,
    refundAmount: amount * 0.75,
    expertCancellationEarning: amount * 0.20,
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

  const includePayoutFields = req.userRole === "expert" || req.userRole === "admin";
  res.json(bookings.map((b) => formatBooking(b, expertMap, clientMap, includePayoutFields)));
});

function getDurationForSession(sessionType: string): number {
  return sessionType === "discovery" ? 30 : 60;
}

router.post("/bookings", requireAuth, requireEmailVerified, async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { expertId, sessionType, scheduledTime, notes, isTestBooking } = parsed.data;
  const testModeActive = process.env.TEST_MODE === "true";

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, expertId));
  if (!expert || expert.status !== "approved" || expert.userId === null) {
    res.status(404).json({ error: "Expert not found" });
    return;
  }

  if (!expert.acceptingBookings) {
    res.status(422).json({ error: "This expert is not currently accepting bookings" });
    return;
  }

  if (expert.userId === req.userId) {
    res.status(403).json({ error: "Experts cannot book their own profile" });
    return;
  }

  const amount = getPriceForSession(expert, sessionType);
  if (amount === null) {
    res.status(422).json({ error: "This expert does not offer the requested session type" });
    return;
  }

  const durationMinutes = getDurationForSession(sessionType);
  const newStart = new Date(scheduledTime);
  const newEnd = new Date(newStart.getTime() + durationMinutes * 60_000);

  const conflicts = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.expertId, expertId),
        not(inArray(bookingsTable.status, ["cancelled", "no-show", "completed", "pending_payment"])),
        lt(bookingsTable.scheduledTime, newEnd),
        sql`${bookingsTable.scheduledTime} + (${bookingsTable.durationMinutes} * interval '1 minute') > ${newStart}`
      )
    );

  if (conflicts.length > 0) {
    res.status(409).json({ error: "This expert is already booked for the selected time slot. Please choose a different time." });
    return;
  }

  const meetLink = generateMeetLink();

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      clientId: req.userId!,
      expertId,
      sessionType: sessionType as "discovery" | "consultancy" | "growth_3mo" | "growth_6mo",
      scheduledTime: newStart,
      durationMinutes,
      notes: notes ?? null,
      meetLink,
      amount,
      status: "upcoming",
      isTestBooking: testModeActive && isTestBooking === true,
    })
    .returning();

  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));

  // Notify the expert of the new booking (in-app + email)
  if (expert.userId) {
    await createNotification({
      bookingId: booking.id,
      recipientUserId: expert.userId,
      notificationType: "new_booking",
      recipientEmail: expert.email,
      recipientName: expert.name,
      payload: {
        title: "New Session Booking",
        body: `You have a new session booking from ${client.name} on ${fmtDate(newStart)} at ${fmtTime(newStart)}. Go to your dashboard to acknowledge it.`,
        sessionStart: newStart.toISOString(),
        sessionType,
        otherPartyName: client.name,
        meetLink,
      },
    });
  }

  // Notify the client that their booking is confirmed (in-app)
  await createNotification({
    bookingId: booking.id,
    recipientUserId: req.userId!,
    notificationType: "booking_confirmed",
    recipientEmail: client.email,
    recipientName: client.name,
    payload: {
      title: "Booking Confirmed",
      body: `Your session with ${expert.name} on ${fmtDate(newStart)} at ${fmtTime(newStart)} is confirmed. Your Google Meet link is ready in your dashboard.`,
      sessionStart: newStart.toISOString(),
      sessionType,
      meetLink,
      otherPartyName: expert.name,
    },
  });

  // Send client booking confirmation email with PDF receipt (fire and forget)
  ;(async () => {
    try {
      const receiptNumber = `SW-BKG-${String(booking.id).padStart(6, "0")}`;
      const pdfBuffer = await generateClientBookingReceiptPdf({
        receiptNumber,
        issuedAt: booking.createdAt.toISOString(),
        client: { name: client.name, email: client.email },
        expert: { name: expert.name, industry: expert.industry ?? "" },
        booking: {
          sessionType: booking.sessionType,
          scheduledTime: booking.scheduledTime.toISOString(),
          durationMinutes: booking.durationMinutes,
          amount: booking.amount ?? 0,
          meetLink: booking.meetLink,
        },
      });
      await sendClientBookingConfirmationEmail({
        to: client.email,
        clientName: client.name,
        expertName: expert.name,
        sessionType: booking.sessionType,
        scheduledTime: booking.scheduledTime.toISOString(),
        durationMinutes: booking.durationMinutes,
        meetLink: booking.meetLink,
        amount: booking.amount ?? 0,
        receiptNumber,
        pdfBuffer,
      });
    } catch (err) {
      req.log.error({ err, bookingId: booking.id }, "Client booking confirmation email failed");
    }
  })();

  res.status(201).json(formatBooking(booking, { [expert.id]: expert }, { [client.id]: client }, false));
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

  const includePayoutFields = req.userRole === "expert" || req.userRole === "admin";
  res.json(formatBooking(booking, { [expert.id]: expert }, { [client.id]: client }, includePayoutFields));
});

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "no-show"]);

const ADMIN_ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
  pending_payment: new Set(["upcoming", "cancelled"]),
  upcoming: new Set(["completed", "cancelled", "no-show"]),
};

const CLIENT_ALLOWED_TRANSITIONS: Record<string, Set<string>> = {
  pending_payment: new Set(["cancelled"]),
  upcoming: new Set(["cancelled"]),
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
  let effectiveCancelledBy: "client" | "expert" | "admin" | null = null;

  if (req.userRole === "expert") {
    res.status(403).json({ error: "Forbidden" }); return;
  } else if (req.userRole === "admin") {
    const allowed = ADMIN_ALLOWED_TRANSITIONS[booking.status];
    if (!allowed || !allowed.has(newStatus)) {
      res.status(400).json({ error: `Transition from '${booking.status}' to '${newStatus}' is not permitted` });
      return;
    }
    if (newStatus === "cancelled") {
      effectiveCancelledBy = (parsed.data as { cancelledBy?: string }).cancelledBy as "client" | "expert" | "admin" ?? "admin";
    }
  } else {
    if (booking.clientId !== req.userId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const allowed = CLIENT_ALLOWED_TRANSITIONS[booking.status];
    if (!allowed || !allowed.has(newStatus)) {
      res.status(400).json({ error: `You cannot change this booking to '${newStatus}'` });
      return;
    }
    if (newStatus === "cancelled") effectiveCancelledBy = "client";
  }

  const meetLink = newStatus === "upcoming" && !booking.meetLink ? generateMeetLink() : booking.meetLink;

  const updateFields: Partial<typeof bookingsTable.$inferInsert> & Record<string, unknown> = { status: newStatus, meetLink };

  if (newStatus === "cancelled" && effectiveCancelledBy) {
    updateFields.cancelledBy = effectiveCancelledBy;
    updateFields.cancellationReason = (parsed.data as { reason?: string }).reason ?? null;

    if (booking.status === "upcoming" && booking.amount) {
      // When a client previously rescheduled the booking, pin the refund
      // liability to the original (pre-reschedule) time so that moving an
      // imminent session to the future does not circumvent late-cancel penalties.
      const effectiveTime =
        effectiveCancelledBy === "client" && booking.rescheduledBy === "client" && booking.rescheduledFromTime
          ? new Date(Math.min(booking.scheduledTime.getTime(), booking.rescheduledFromTime.getTime()))
          : booking.scheduledTime;
      const ref = calcRefund(booking.amount, effectiveCancelledBy, booking.scheduledTime, false, effectiveTime);
      updateFields.refundStatus = "pending";
      updateFields.refundPercent = ref.refundPercent;
      updateFields.refundAmount = ref.refundAmount;
      updateFields.expertCancellationEarning = ref.expertCancellationEarning;
    } else {
      updateFields.refundStatus = "none";
    }
  }

  if (newStatus === "no-show" && booking.amount) {
    const ref = calcRefund(booking.amount, "client", booking.scheduledTime, true);
    updateFields.refundStatus = "pending";
    updateFields.refundPercent = ref.refundPercent;
    updateFields.refundAmount = ref.refundAmount;
    updateFields.expertCancellationEarning = ref.expertCancellationEarning;
  }

  const [updated] = await db
    .update(bookingsTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updateFields as any)
    .where(eq(bookingsTable.id, id))
    .returning();

  if (newStatus === "completed") {
    await db.update(expertsTable)
      .set({ totalSessions: sql`${expertsTable.totalSessions} + 1` })
      .where(eq(expertsTable.id, booking.expertId));
  }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, booking.expertId));
  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, booking.clientId));

  // Notify the other party when a cancellation happens
  if (newStatus === "cancelled" && effectiveCancelledBy === "client" && expert.userId) {
    const sessionLabel = booking.sessionType.replace(/_/g, " ");
    const refPct = (updateFields.refundPercent as number | null) ?? 0;
    const refAmt = (updateFields.refundAmount as number | null) ?? 0;
    await createNotification({
      bookingId: booking.id,
      recipientUserId: expert.userId,
      notificationType: "client_cancelled",
      recipientEmail: expert.email,
      recipientName: expert.name,
      payload: {
        title: "Client Cancelled Their Session",
        body: `${client.name} has cancelled their session scheduled for ${fmtDate(booking.scheduledTime)} at ${fmtTime(booking.scheduledTime)}.`,
        sessionStart: booking.scheduledTime.toISOString(),
        sessionType: booking.sessionType,
        otherPartyName: client.name,
        refundPercent: refPct,
        refundAmount: refAmt,
      },
    });
  }

  res.json(formatBooking(updated, { [expert.id]: expert }, { [client.id]: client }, true));
});

router.patch("/bookings/:id/reschedule", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { newTime, rescheduledBy } = req.body as { newTime?: string; rescheduledBy?: string };
  if (!newTime) { res.status(400).json({ error: "newTime is required" }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  if (TERMINAL_STATUSES.has(booking.status)) {
    res.status(409).json({ error: "Cannot reschedule a completed, cancelled, or no-show booking" });
    return;
  }

  let actor: "client" | "expert" | "admin" = "client";
  if (req.userRole === "admin") {
    actor = "admin";
  } else if (req.userRole === "expert") {
    const [ex] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
    if (!ex || ex.id !== booking.expertId) { res.status(403).json({ error: "Forbidden" }); return; }
    actor = "expert";
  } else {
    if (booking.clientId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
    actor = "client";

    // Clients may reschedule at most 3 times per booking.
    if ((booking.rescheduleCount ?? 0) >= 3) {
      res.status(422).json({ error: "This booking has reached the maximum number of reschedules. Only cancellation is now available." });
      return;
    }

    // Clients may not reschedule a booking that starts within 24 hours — the
    // same window used by the late-cancellation refund policy. This prevents
    // the exploit of rescheduling an imminent session to the future to obtain
    // a full refund instead of the intended 75% late-cancellation refund.
    const hoursUntilSession = (booking.scheduledTime.getTime() - Date.now()) / 3600000;
    if (hoursUntilSession < 24) {
      res.status(422).json({ error: "Rescheduling is no longer available for this session as it starts within 24 hours. You may cancel instead, subject to our Cancellation and Refund Policy." });
      return;
    }
  }
  // actor is always derived server-side from the authenticated session — never
  // trust a client-supplied rescheduledBy value in the request body.

  const newStart = new Date(newTime);
  const newEnd = new Date(newStart.getTime() + booking.durationMinutes * 60_000);

  const conflicts = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.expertId, booking.expertId),
        not(inArray(bookingsTable.status, ["cancelled", "no-show", "completed"])),
        sql`${bookingsTable.id} != ${id}`,
        lt(bookingsTable.scheduledTime, newEnd),
        sql`${bookingsTable.scheduledTime} + (${bookingsTable.durationMinutes} * interval '1 minute') > ${newStart}`
      )
    );

  if (conflicts.length > 0) {
    res.status(409).json({ error: "The expert is already booked at that time. Please choose another slot." });
    return;
  }

  // Preserve the earliest known session time for refund anchor purposes.
  // If the booking was already rescheduled, keep whichever time is earlier
  // (original or the previously stored rescheduledFromTime) so multiple
  // reschedules cannot progressively erase the refund liability anchor.
  const earliestKnownTime =
    booking.rescheduledFromTime
      ? new Date(Math.min(booking.scheduledTime.getTime(), booking.rescheduledFromTime.getTime()))
      : booking.scheduledTime;

  const [updated] = await db
    .update(bookingsTable)
    .set({
      scheduledTime: newStart,
      rescheduledBy: actor,
      rescheduledFromTime: earliestKnownTime,
      rescheduledAt: new Date(),
      rescheduleCount: (booking.rescheduleCount ?? 0) + 1,
    })
    .where(eq(bookingsTable.id, id))
    .returning();

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, booking.expertId));
  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, booking.clientId));

  // Notify the other party when a client reschedules
  if (actor === "client" && expert.userId) {
    const newTimeStr = newStart.toLocaleString("en-KE", { timeZone: "Africa/Nairobi" });
    await createNotification({
      bookingId: booking.id,
      recipientUserId: expert.userId,
      notificationType: "client_rescheduled",
      recipientEmail: expert.email,
      recipientName: expert.name,
      payload: {
        title: "Client Requested to Reschedule",
        body: `${client.name} has requested to reschedule their session originally booked for ${fmtDate(booking.scheduledTime)} at ${fmtTime(booking.scheduledTime)}.`,
        sessionStart: newStart.toISOString(),
        sessionType: booking.sessionType,
        otherPartyName: client.name,
      },
    });
  }

  res.json(formatBooking(updated, { [expert.id]: expert }, { [client.id]: client }, true));
});

// ── EXPERT MARK AS NO-SHOW ────────────────────────────────────────────────────
// Expert can mark a booking as no-show if the client has not joined within
// 15 minutes of the session start time. Only available after the 15-minute
// window has elapsed and before the booking is completed/cancelled.
router.post("/bookings/:id/mark-no-show", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "expert") { res.status(403).json({ error: "Forbidden" }); return; }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
  if (!expert || expert.id !== booking.expertId) { res.status(403).json({ error: "Forbidden" }); return; }

  if (booking.status !== "upcoming") {
    res.status(409).json({ error: "Only upcoming bookings can be marked as no-show" });
    return;
  }

  // Must be at least 15 minutes after session start
  const minutesSinceStart = (Date.now() - booking.scheduledTime.getTime()) / 60_000;
  if (minutesSinceStart < 15) {
    const minutesRemaining = Math.ceil(15 - minutesSinceStart);
    res.status(422).json({ error: `You can mark this as a no-show in ${minutesRemaining} minute${minutesRemaining === 1 ? "" : "s"}.` });
    return;
  }

  if (!booking.amount) {
    res.status(422).json({ error: "Booking has no amount recorded" });
    return;
  }

  const ref = calcRefund(booking.amount, "client", booking.scheduledTime, true);

  const [updated] = await db
    .update(bookingsTable)
    .set({
      status: "no-show",
      refundStatus: "pending",
      refundPercent: ref.refundPercent,
      refundAmount: ref.refundAmount,
      expertCancellationEarning: ref.expertCancellationEarning,
    })
    .where(eq(bookingsTable.id, id))
    .returning();

  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, booking.clientId));

  // Notify the client
  await createNotification({
    bookingId: booking.id,
    recipientUserId: booking.clientId,
    notificationType: "client_no_show",
    recipientEmail: client.email,
    recipientName: client.name,
    payload: {
      title: "Session Marked as No-Show",
      body: `Your session on ${fmtDate(booking.scheduledTime)} at ${fmtTime(booking.scheduledTime)} was marked as a no-show. Please refer to our Cancellation and Refund Policy for details.`,
      sessionStart: booking.scheduledTime.toISOString(),
      sessionType: booking.sessionType,
      otherPartyName: expert.name,
      refundAmount: ref.refundAmount,
      refundPercent: ref.refundPercent,
    },
  });

  res.json(formatBooking(updated, { [expert.id]: expert }, { [client.id]: client }, true));
});

// ── EXPERT CANCEL ─────────────────────────────────────────────────────────────
// Expert cancels their own booking. Per policy, expert cancellation always
// results in a 100% refund to the client.
router.post("/bookings/:id/expert-cancel", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "expert") { res.status(403).json({ error: "Forbidden" }); return; }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
  if (!expert || expert.id !== booking.expertId) { res.status(403).json({ error: "Forbidden" }); return; }

  if (TERMINAL_STATUSES.has(booking.status)) {
    res.status(409).json({ error: "Cannot cancel a booking that is already completed, cancelled, or no-show" });
    return;
  }

  const { reason } = req.body as { reason?: string };

  // Expert cancellation always = 100% refund to client (refundPercent: 100)
  const refund = booking.amount && booking.status === "upcoming"
    ? calcRefund(booking.amount, "expert", booking.scheduledTime)
    : { refundPercent: 0, refundAmount: 0, expertCancellationEarning: 0 };

  const [updated] = await db
    .update(bookingsTable)
    .set({
      status: "cancelled",
      cancelledBy: "expert",
      cancellationReason: reason ?? null,
      refundStatus: booking.status === "upcoming" && booking.amount ? "pending" : "none",
      refundPercent: refund.refundPercent,
      refundAmount: refund.refundAmount,
      expertCancellationEarning: refund.expertCancellationEarning,
    })
    .where(eq(bookingsTable.id, id))
    .returning();

  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, booking.clientId));

  // ── EMAIL SEND HOOK ── Notify client of expert cancellation (full refund)
  await createNotification({
    bookingId: booking.id,
    recipientUserId: booking.clientId,
    notificationType: "expert_cancelled",
    recipientEmail: client.email,
    recipientName: client.name,
    payload: {
      title: "Your Session Was Cancelled by the Expert",
      body: `${expert.name} has cancelled your session on ${fmtDate(booking.scheduledTime)} at ${fmtTime(booking.scheduledTime)}. You will receive a full refund within 72 business hours.`,
      sessionStart: booking.scheduledTime.toISOString(),
      sessionType: booking.sessionType,
      otherPartyName: expert.name,
      refundAmount: refund.refundAmount,
      refundPercent: refund.refundPercent,
    },
  });

  res.json(formatBooking(updated, { [expert.id]: expert }, { [client.id]: client }, true));
});

// ── EXPERT REQUEST RESCHEDULE ─────────────────────────────────────────────────
// Expert requests the client to pick a new time. The booking is NOT cancelled
// and NO refund is issued. A notification is sent to the client directing them
// to their Client Dashboard to select a new slot.
router.post("/bookings/:id/request-reschedule", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "expert") { res.status(403).json({ error: "Forbidden" }); return; }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
  if (!expert || expert.id !== booking.expertId) { res.status(403).json({ error: "Forbidden" }); return; }

  if (TERMINAL_STATUSES.has(booking.status)) {
    res.status(409).json({ error: "Cannot request reschedule for a completed, cancelled, or no-show booking" });
    return;
  }

  const { reason } = req.body as { reason?: string };

  const [client] = await db.select().from(usersTable).where(eq(usersTable.id, booking.clientId));

  // ── EMAIL SEND HOOK ── Notify client that expert requested to reschedule
  await createNotification({
    bookingId: booking.id,
    recipientUserId: booking.clientId,
    notificationType: "expert_reschedule_requested",
    recipientEmail: client.email,
    recipientName: client.name,
    payload: {
      title: "Expert Requested to Reschedule",
      body: `${expert.name} has requested to reschedule your session. Please visit your dashboard to select a new time.`,
      sessionStart: booking.scheduledTime.toISOString(),
      sessionType: booking.sessionType,
      otherPartyName: expert.name,
      actions: ["reschedule"],
    },
  });

  res.json({ ok: true });
});

export default router;
