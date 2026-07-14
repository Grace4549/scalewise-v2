/**
 * Session Reminder Scheduler
 * ─────────────────────────────────────────────────────────────────────────────
 * Checks every minute for upcoming confirmed bookings that have reminder
 * triggers due (48 hr, 24 hr, 1 hr before session start).
 *
 * Each triggered reminder:
 *   1. Writes a reminder_log row (idempotent — UNIQUE constraint prevents dups)
 *   2. Calls createNotification() for both client and expert, which:
 *      - Writes a notification_log row (visible in dashboards)
 *      - Dispatches the transactional reminder email via Resend
 */

import { db, bookingsTable, usersTable, expertsTable, reminderLogTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { logger } from "./logger";
import { createNotification } from "./notify";
import type { NotificationType } from "@workspace/db";

const REMINDER_OFFSETS_MS: Record<"48hr" | "24hr" | "1hr", number> = {
  "48hr": 48 * 60 * 60 * 1000,
  "24hr": 24 * 60 * 60 * 1000,
  "1hr":       60 * 60 * 1000,
};

const LOOK_BACK_MS = 2 * 60 * 1000;
const LOOK_AHEAD_MS = 60 * 1000;

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
 * Sends reminder emails and creates in-app notifications for both parties.
 * createNotification() handles both the notification_log insert and the
 * transactional email dispatch via Resend.
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
  const sessionStartFmt = fmtDate(payload.sessionStart);

  // Client reminder — email + in-app notification
  await createNotification({
    bookingId: payload.bookingId,
    recipientUserId: payload.clientId,
    notificationType,
    recipientEmail: payload.clientEmail,
    recipientName: payload.clientName,
    payload: {
      title: `Session Reminder: ${label} to go`,
      body: `Reminder: Your session with ${payload.expertName} is coming up on ${sessionStartFmt}. ${payload.meetLink ? `Join using your Google Meet link: ${payload.meetLink}` : "Your Google Meet link is available in your dashboard."}`,
      sessionStart: sessionStartIso,
      sessionType: payload.sessionType,
      meetLink: payload.meetLink,
      otherPartyName: payload.expertName,
      actions: ["cancel", "reschedule"],
    },
  });

  // Expert reminder — email + in-app notification
  await createNotification({
    bookingId: payload.bookingId,
    recipientUserId: payload.expertUserId,
    notificationType,
    recipientEmail: payload.expertEmail,
    recipientName: payload.expertName,
    payload: {
      title: `Session Reminder: ${label} to go`,
      body: `Reminder: Your session with ${payload.clientName} is coming up on ${sessionStartFmt}. ${payload.meetLink ? `Join using your Google Meet link: ${payload.meetLink}` : "Your Google Meet link is available in your dashboard."}`,
      sessionStart: sessionStartIso,
      sessionType: payload.sessionType,
      meetLink: payload.meetLink,
      otherPartyName: payload.clientName,
      actions: ["cancel", "request_reschedule"],
    },
  });
}

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
    if (!booking.expertUserId) continue;

    const sessionStart = new Date(booking.scheduledTime);

    for (const [type, offsetMs] of Object.entries(REMINDER_OFFSETS_MS) as [
      "48hr" | "24hr" | "1hr",
      number,
    ][]) {
      const triggerTime = new Date(sessionStart.getTime() - offsetMs);
      const windowStart = new Date(triggerTime.getTime() - LOOK_BACK_MS);
      const windowEnd   = new Date(triggerTime.getTime() + LOOK_AHEAD_MS);

      if (now < windowStart || now > windowEnd) continue;

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
