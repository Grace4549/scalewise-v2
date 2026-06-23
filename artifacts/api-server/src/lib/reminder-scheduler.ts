/**
 * Session Reminder Scheduler
 * ─────────────────────────────────────────────────────────────────────────────
 * Checks every minute for upcoming confirmed bookings that have reminder
 * triggers due (48 hr, 24 hr, 1 hr before session start).
 *
 * Each triggered reminder is written to the `reminder_log` table with
 * `sent = false`.  Once email (or SMS) integration is connected, find every
 * place marked  ── EMAIL SEND HOOK ──  below and replace the log line with
 * your actual dispatch call (e.g. sendgrid.send(...), resend.emails.send(...)).
 *
 * The UNIQUE constraint on (booking_id, reminder_type) guarantees idempotency:
 * even if the scheduler fires twice in the same window, only one row is ever
 * written per reminder.
 */

import { db, bookingsTable, usersTable, expertsTable, reminderLogTable } from "@workspace/db";
import { eq, and, gte, lt, lte } from "drizzle-orm";
import { logger } from "./logger";

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
// Keeps the window tight so we don't fire too early.
const LOOK_AHEAD_MS = 60 * 1000; // 1 minute

interface ReminderPayload {
  bookingId: number;
  reminderType: "48hr" | "24hr" | "1hr";
  scheduledFor: Date;
  clientName: string;
  clientEmail: string;
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
 * Sends the reminder — currently only logs to stdout.
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
 *     html: buildClientReminderHtml(payload),   // ← build your template
 *   });
 *
 *   // Expert reminder
 *   await resend.emails.send({
 *     from: "ScaleWise <noreply@scalewise.co.ke>",
 *     to: payload.expertEmail,
 *     subject: `Upcoming session with ${payload.clientName} in ${label}`,
 *     html: buildExpertReminderHtml(payload),   // ← build your template
 *   });
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function dispatchReminder(payload: ReminderPayload): Promise<void> {
  const label = payload.reminderType === "48hr" ? "48 hours"
              : payload.reminderType === "24hr" ? "24 hours"
              : "1 hour";

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
      },
    },
    `[REMINDER] ${label} notice → expert ${payload.expertEmail} — booking #${payload.bookingId}`
  );
}

/**
 * Core tick — runs once per scheduler interval.
 * Finds every upcoming booking that has an unsent reminder whose trigger time
 * falls within the current look-back / look-ahead window, inserts a log row,
 * and calls dispatchReminder.
 */
async function runReminderTick(): Promise<void> {
  const now = new Date();

  // Fetch all confirmed (upcoming) bookings that are still in the future.
  // We only care about bookings whose session start is within the next 48 h + 1 min
  // so the query stays lightweight as the database grows.
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
      // client identity
      clientName: usersTable.name,
      clientEmail: usersTable.email,
      // expert identity
      expertName: expertsTable.name,
      expertEmail: expertsTable.email,
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
    const sessionStart = new Date(booking.scheduledTime);

    for (const [type, offsetMs] of Object.entries(REMINDER_OFFSETS_MS) as [
      "48hr" | "24hr" | "1hr",
      number,
    ][]) {
      const triggerTime = new Date(sessionStart.getTime() - offsetMs);
      const windowStart = new Date(triggerTime.getTime() - LOOK_BACK_MS);
      const windowEnd   = new Date(triggerTime.getTime() + LOOK_AHEAD_MS);

      // Is `now` within the send window for this reminder type?
      if (now < windowStart || now > windowEnd) continue;

      // Attempt an idempotent insert.  The UNIQUE(booking_id, reminder_type)
      // constraint means a second insert for the same booking/type will fail —
      // we catch that and skip gracefully.
      try {
        await db.insert(reminderLogTable).values({
          bookingId: booking.id,
          reminderType: type,
          scheduledFor: triggerTime,
          sent: false,
        });
      } catch (insertErr: any) {
        // Duplicate key → already logged (or already being sent). Skip.
        if (insertErr?.code === "23505") continue;
        logger.error({ err: insertErr, bookingId: booking.id, type }, "reminder_log insert failed");
        continue;
      }

      const payload: ReminderPayload = {
        bookingId: booking.id,
        reminderType: type,
        scheduledFor: triggerTime,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        expertName: booking.expertName,
        expertEmail: booking.expertEmail,
        sessionType: booking.sessionType,
        sessionStart,
        durationMinutes: booking.durationMinutes,
        meetLink: booking.meetLink,
      };

      try {
        await dispatchReminder(payload);

        // Mark the log row sent = true once dispatch succeeds.
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
        // Row stays sent=false → will be retried on the next tick within the window.
      }
    }
  }
}

/**
 * Starts the reminder scheduler.  Call once at server startup.
 * Returns a handle so tests (or graceful shutdown) can stop the interval.
 */
export function startReminderScheduler(): ReturnType<typeof setInterval> {
  const INTERVAL_MS = 60 * 1000; // poll every 60 seconds

  logger.info("Reminder scheduler started (interval: 60 s)");

  // Run immediately on startup to catch any reminders missed during downtime,
  // then continue on the regular interval.
  runReminderTick().catch((err) =>
    logger.error({ err }, "reminder tick failed on startup")
  );

  return setInterval(() => {
    runReminderTick().catch((err) =>
      logger.error({ err }, "reminder tick failed")
    );
  }, INTERVAL_MS);
}
