/**
 * Session Reminder Scheduler
 * ─────────────────────────────────────────────────────────────────────────────
 * Checks every minute for upcoming confirmed bookings that have reminder
 * triggers due (48 hr, 24 hr, 1 hr before session start).
 *
 * Each triggered reminder is written to:
 *   1. reminder_log — tracks the email to be dispatched (sent=false until sent)
 *   2. notification_log — creates a visible in-app notification for both the
 *      client and the expert, including action hints (Cancel / Reschedule)
 *
 * Once email integration is connected, find every place marked
 * ── EMAIL SEND HOOK ── below and replace the log line with your actual
 * dispatch call (e.g. resend.emails.send(...)).
 *
 * The UNIQUE constraint on reminder_log(booking_id, reminder_type) guarantees
 * idempotency: even if the scheduler fires twice in the same window, only one
 * row is ever written per reminder — and therefore only one notification_log
 * row is created per client/expert per reminder type.
 */

import { db, bookingsTable, usersTable, expertsTable, reminderLogTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { logger } from "./logger";
import { createNotification } from "./notify";
import type { NotificationType } from "@workspace/db";

// How far in advance each reminder fires (in milliseconds).
const REMINDER_OFFSETS_MS: Record<"48hr" | "24hr" | "1hr", number> = {
  "48hr": 48 * 60 * 60 * 1000,
  "24hr": 24 * 60 * 60 * 1000,
  "1hr":       60 * 60 * 1000,
};

// Tolerance window: treat a reminder as "due" if the current time is within
// this many ms PAST the target trigger time (handles scheduler drift / restarts).
const LOOK_BACK_MS = 2 * 60 * 1000; // 2 minutes

// Tolerance window: how far into the future we still consider a reminder due.
const LOOK_AHEAD_MS = 60 * 1000; // 1 minute

interface ReminderPayload {
  bookingId: number;
  reminderType: "48hr" | "24hr" | "1hr";
  scheduledFor: Date;
  clientId: number;
  clientName: string;
  clientEmail: string;
  expertUserId: number;
  expertName: string;
  expertEmail: string;
  sessionType: string;
  sessionStart: Date;
  durationMinutes: number;
  meetLink: string | null;
}

/**
 * Formats a Date into a readable string for log / email body.
 */
function fmtDate(d: Date): string {
  return d.toLocaleString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
    timeZoneName: "short",
  });
}

/**
 * Sends the reminder — creates in-app notifications for both parties and
 * logs the emails that would be sent once email integration is connected.
 *
 * ── EMAIL SEND HOOK ──────────────────────────────────────────────────────────
 * Replace the logger.info calls below with your email dispatch.  Example with
 * Resend (https://resend.com):
 *
 *   import { Resend } from "resend";
 *   const resend = new Resend(process.env.RESEND_API_KEY);
 *
 *   // Client reminder
 *   await resend.emails.send({
 *     from: "ScaleWise <noreply@scalewise.co.ke>",
 *     to: payload.clientEmail,
 *     subject: `Reminder: Your ${payload.sessionType} session is in ${label}`,
 *     html: buildClientReminderHtml(payload),
 *   });
 *
 *   // Expert reminder
 *   await resend.emails.send({
 *     from: "ScaleWise <noreply@scalewise.co.ke>",
 *     to: payload.expertEmail,
 *     subject: `Upcoming session with ${payload.clientName} in ${label}`,
 *     html: buildExpertReminderHtml(payload),
 *   });
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function dispatchReminder(payload: ReminderPayload): Promise<void> {
  const label = payload.reminderType === "48hr" ? "48 hours"
              : payload.reminderType === "24hr" ? "24 hours"
              : "1 hour";

  const notificationType: NotificationType =
    payload.reminderType === "48hr" ? "48hr_reminder" :
    payload.reminderType === "24hr" ? "24hr_reminder" : "1hr_reminder";

  const sessionLabel = payload.sessionType.replace(/_/g, " ");
  const sessionStartIso = payload.sessionStart.toISOString();

  // ── In-app notification: CLIENT ───────────────────────────────────────────
  // This creates a visible notification in the Client Dashboard.
  // The payload includes action hints so the frontend can show
  // "Cancel" and "Reschedule" buttons on the notification card.
  await createNotification({
    bookingId: payload.bookingId,
    recipientUserId: payload.clientId,
    notificationType,
    recipientEmail: payload.clientEmail,
    recipientName: payload.clientName,
    payload: {
      title: `Session Reminder: ${label} to go`,
      body: `Your ${sessionLabel} session with ${payload.expertName} starts in ${label}.${
        payload.meetLink ? ` Join: ${payload.meetLink}` : ""
      }`,
      sessionStart: sessionStartIso,
      sessionType: payload.sessionType,
      meetLink: payload.meetLink,
      otherPartyName: payload.expertName,
      // Actions shown on the notification card in the Client Dashboard.
      // "Cancel" shows the refund policy summary first.
      // "Reschedule" opens the reschedule picker.
      actions: ["cancel", "reschedule"],
    },
  });

  // ── In-app notification: EXPERT ───────────────────────────────────────────
  // Visible notification in the Expert Dashboard.
  // Actions include "Cancel session" (→ full refund to client) and
  // "Request to Reschedule" (→ notifies client, booking stays intact).
  await createNotification({
    bookingId: payload.bookingId,
    recipientUserId: payload.expertUserId,
    notificationType,
    recipientEmail: payload.expertEmail,
    recipientName: payload.expertName,
    payload: {
      title: `Session Reminder: ${label} to go`,
      body: `You have a ${sessionLabel} session with ${payload.clientName} in ${label}.${
        payload.meetLink ? ` Join: ${payload.meetLink}` : ""
      }`,
      sessionStart: sessionStartIso,
      sessionType: payload.sessionType,
      meetLink: payload.meetLink,
      otherPartyName: payload.clientName,
      // "cancel" → full refund to client per policy.
      // "request_reschedule" → sends notification to client to pick new time.
      actions: ["cancel", "request_reschedule"],
    },
  });

  // ── EMAIL SEND HOOK (client) ──────────────────────────────────────────────
  // TODO: replace this log with an actual email call to payload.clientEmail
  logger.info(
    {
      reminder: {
        bookingId: payload.bookingId,
        type: payload.reminderType,
        to: "CLIENT",
        clientName: payload.clientName,
        clientEmail: payload.clientEmail,
        sessionType: payload.sessionType,
        sessionStart: fmtDate(payload.sessionStart),
        durationMinutes: payload.durationMinutes,
        meetLink: payload.meetLink ?? "(not assigned yet)",
        actions: "Cancel | Reschedule",
      },
    },
    `[REMINDER] ${label} notice → client ${payload.clientEmail} — booking #${payload.bookingId}`
  );

  // ── EMAIL SEND HOOK (expert) ──────────────────────────────────────────────
  // TODO: replace this log with an actual email call to payload.expertEmail
  logger.info(
    {
      reminder: {
        bookingId: payload.bookingId,
        type: payload.reminderType,
        to: "EXPERT",
        expertName: payload.expertName,
        expertEmail: payload.expertEmail,
        clientName: payload.clientName,
        sessionType: payload.sessionType,
        sessionStart: fmtDate(payload.sessionStart),
        durationMinutes: payload.durationMinutes,
        meetLink: payload.meetLink ?? "(not assigned yet)",
        actions: "Cancel Session | Request to Reschedule",
      },
    },
    `[REMINDER] ${label} notice → expert ${payload.expertEmail} — booking #${payload.bookingId}`
  );
}

/**
 * Core tick — runs once per scheduler interval.
 */
async function runReminderTick(): Promise<void> {
  const now = new Date();

  const lookaheadCutoff = new Date(now.getTime() + REMINDER_OFFSETS_MS["48hr"] + 60_000);

  const bookings = await db
    .select({
      id: bookingsTable.id,
      scheduledTime: bookingsTable.scheduledTime,
      durationMinutes: bookingsTable.durationMinutes,
      sessionType: bookingsTable.sessionType,
      meetLink: bookingsTable.meetLink,
      clientId: bookingsTable.clientId,
      expertId: bookingsTable.expertId,
      clientName: usersTable.name,
      clientEmail: usersTable.email,
      expertName: expertsTable.name,
      expertEmail: expertsTable.email,
      expertUserId: expertsTable.userId,
    })
    .from(bookingsTable)
    .innerJoin(usersTable, eq(bookingsTable.clientId, usersTable.id))
    .innerJoin(expertsTable, eq(bookingsTable.expertId, expertsTable.id))
    .where(
      and(
        eq(bookingsTable.status, "upcoming"),
        gte(bookingsTable.scheduledTime, now),
        lte(bookingsTable.scheduledTime, lookaheadCutoff),
      )
    );

  for (const booking of bookings) {
    if (!booking.expertUserId) continue; // skip if expert has no linked user account

    const sessionStart = new Date(booking.scheduledTime);

    for (const [type, offsetMs] of Object.entries(REMINDER_OFFSETS_MS) as [
      "48hr" | "24hr" | "1hr",
      number,
    ][]) {
      const triggerTime = new Date(sessionStart.getTime() - offsetMs);
      const windowStart = new Date(triggerTime.getTime() - LOOK_BACK_MS);
      const windowEnd   = new Date(triggerTime.getTime() + LOOK_AHEAD_MS);

      if (now < windowStart || now > windowEnd) continue;

      // Idempotent insert: UNIQUE(booking_id, reminder_type) prevents duplicates.
      // A successful insert means this is a new reminder — create notifications.
      // A 23505 duplicate-key error means it was already processed — skip.
      try {
        await db.insert(reminderLogTable).values({
          bookingId: booking.id,
          reminderType: type,
          scheduledFor: triggerTime,
          sent: false,
        });
      } catch (insertErr: any) {
        if (insertErr?.code === "23505") continue;
        logger.error({ err: insertErr, bookingId: booking.id, type }, "reminder_log insert failed");
        continue;
      }

      const payload: ReminderPayload = {
        bookingId: booking.id,
        reminderType: type,
        scheduledFor: triggerTime,
        clientId: booking.clientId,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        expertUserId: booking.expertUserId,
        expertName: booking.expertName,
        expertEmail: booking.expertEmail,
        sessionType: booking.sessionType,
        sessionStart,
        durationMinutes: booking.durationMinutes,
        meetLink: booking.meetLink,
      };

      try {
        await dispatchReminder(payload);

        // ── EMAIL SEND HOOK ────────────────────────────────────────────────
        // Move this update INSIDE your email send call so `sent` only flips
        // to true after the provider confirms delivery.
        // ──────────────────────────────────────────────────────────────────
        await db
          .update(reminderLogTable)
          .set({ sent: true, sentAt: new Date() })
          .where(
            and(
              eq(reminderLogTable.bookingId, booking.id),
              eq(reminderLogTable.reminderType, type),
            )
          );
      } catch (dispatchErr) {
        logger.error(
          { err: dispatchErr, bookingId: booking.id, type },
          "reminder dispatch failed — row remains sent=false for retry"
        );
      }
    }
  }
}

/**
 * Starts the reminder scheduler.  Call once at server startup.
 */
export function startReminderScheduler(): ReturnType<typeof setInterval> {
  const INTERVAL_MS = 60 * 1000;

  logger.info("Reminder scheduler started (interval: 60 s)");

  runReminderTick().catch((err) =>
    logger.error({ err }, "reminder tick failed on startup")
  );

  return setInterval(() => {
    runReminderTick().catch((err) =>
      logger.error({ err }, "reminder tick failed")
    );
  }, INTERVAL_MS);
}
