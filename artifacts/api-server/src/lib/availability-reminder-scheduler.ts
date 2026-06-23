/**
 * Availability Reminder Scheduler
 * ─────────────────────────────────────────────────────────────────────────────
 * For experts using "week_by_week" availability mode, sends a reminder on each
 * of the last 3 days (Friday, Saturday, Sunday) before the upcoming week if they
 * have not yet submitted any availability slots for that week.
 *
 * Stops reminding as soon as slots are found for the upcoming week — even mid-
 * window (e.g. submitted on Saturday → no Sunday reminder).
 *
 * Runs every minute alongside the session reminder scheduler.
 *
 * Each triggered reminder is written to availability_reminder_log with
 * UNIQUE(expert_id, week_start, reminder_day) for idempotency — if the
 * scheduler fires twice in the same window only one row is ever written.
 *
 * ── EMAIL SEND HOOK ──────────────────────────────────────────────────────────
 * Once email integration is connected, find the comment marked EMAIL SEND HOOK
 * below and replace the logger.info call with your actual dispatch.  Example:
 *
 *   import { Resend } from "resend";
 *   const resend = new Resend(process.env.RESEND_API_KEY);
 *   await resend.emails.send({
 *     from: "ScaleWise <noreply@scalewise.co.ke>",
 *     to: expertEmail,
 *     subject: `Reminder: submit your availability for next week`,
 *     html: buildAvailabilityReminderHtml({ expertName, weekStart }),
 *   });
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { db, expertsTable, expertAvailabilityTable, availabilityReminderLogTable } from "@workspace/db";
import { eq, and, gte, lt } from "drizzle-orm";
import { isNotNull } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Returns the ISO date string (YYYY-MM-DD) for the upcoming Monday from a
 * given reference date (in Nairobi time, UTC+3).
 *
 * "Upcoming Monday" = the Monday of the NEXT week that has not yet started.
 * If today IS Monday, the upcoming Monday is 7 days ahead.
 */
function getUpcomingMonday(now: Date): Date {
  // Work in Nairobi time (UTC+3)
  const nairobOffset = 3 * 60; // minutes
  const localMs = now.getTime() + nairobOffset * 60_000;
  const local = new Date(localMs);

  const dayOfWeek = local.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Days until next Monday: Mon=7, Tue=6, Wed=5, Thu=4, Fri=3, Sat=2, Sun=1
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;

  const mondayLocal = new Date(localMs + daysUntilMonday * 86_400_000);
  // Return midnight UTC on that Nairobi calendar day (strip back the offset)
  const mondayUtcMidnight = new Date(
    Date.UTC(mondayLocal.getUTCFullYear(), mondayLocal.getUTCMonth(), mondayLocal.getUTCDate())
  );
  return mondayUtcMidnight;
}

/**
 * Returns the name of today's day if it falls in the reminder window
 * (Fri=3 days before upcoming Monday, Sat=2 days, Sun=1 day), else null.
 */
function getReminderDayName(now: Date, upcomingMonday: Date): "friday" | "saturday" | "sunday" | null {
  const diffMs = upcomingMonday.getTime() - now.getTime();
  const diffDays = diffMs / 86_400_000;

  // Nairobi local day of week
  const nairobOffset = 3 * 60;
  const local = new Date(now.getTime() + nairobOffset * 60_000);
  const dow = local.getUTCDay(); // 0=Sun,5=Fri,6=Sat

  if (dow === 5 && diffDays >= 2 && diffDays < 4) return "friday";
  if (dow === 6 && diffDays >= 1 && diffDays < 3) return "saturday";
  if (dow === 0 && diffDays >= 0 && diffDays < 2) return "sunday";
  return null;
}

/** Convert a Date to a YYYY-MM-DD string (UTC date). */
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function runAvailabilityReminderTick(): Promise<void> {
  const now = new Date();
  const upcomingMonday = getUpcomingMonday(now);
  const reminderDay = getReminderDayName(now, upcomingMonday);

  if (!reminderDay) return; // Not in the 3-day reminder window

  const weekStart = toDateString(upcomingMonday);
  const weekEnd = new Date(upcomingMonday.getTime() + 7 * 86_400_000);

  // Load all week-by-week approved experts with a linked user account
  const experts = await db
    .select({
      id: expertsTable.id,
      name: expertsTable.name,
      email: expertsTable.email,
      userId: expertsTable.userId,
    })
    .from(expertsTable)
    .where(
      and(
        eq(expertsTable.status, "approved"),
        eq(expertsTable.availabilityMode, "week_by_week"),
        isNotNull(expertsTable.userId),
      )
    );

  for (const expert of experts) {
    // Check if expert already has slots for the upcoming week
    const existingSlots = await db
      .select({ id: expertAvailabilityTable.id })
      .from(expertAvailabilityTable)
      .where(
        and(
          eq(expertAvailabilityTable.expertId, expert.id),
          gte(expertAvailabilityTable.startTime, upcomingMonday),
          lt(expertAvailabilityTable.startTime, weekEnd),
        )
      )
      .limit(1);

    if (existingSlots.length > 0) continue; // Already submitted — no reminder

    // Idempotent insert — UNIQUE(expert_id, week_start, reminder_day)
    let inserted = false;
    try {
      await db.insert(availabilityReminderLogTable).values({
        expertId: expert.id,
        weekStart,
        reminderDay,
        sent: false,
      });
      inserted = true;
    } catch (err: any) {
      if (err?.code === "23505") continue; // Already logged for this day
      logger.error({ err, expertId: expert.id, weekStart, reminderDay }, "availability_reminder_log insert failed");
      continue;
    }

    if (!inserted) continue;

    // ── EMAIL SEND HOOK ────────────────────────────────────────────────────
    // TODO: replace this logger.info with an actual email dispatch to expert.email
    logger.info(
      {
        availabilityReminder: {
          to: "EXPERT",
          expertId: expert.id,
          expertName: expert.name,
          expertEmail: expert.email,
          weekStart,
          reminderDay,
          message: `Please submit your availability for the week starting ${weekStart}. Log in to your ScaleWise dashboard → Availability tab.`,
        },
      },
      `[AVAILABILITY REMINDER] ${reminderDay} → expert ${expert.email} — week ${weekStart}`
    );

    // Mark sent (flip to true once email provider confirms delivery)
    await db
      .update(availabilityReminderLogTable)
      .set({ sent: true, sentAt: new Date() })
      .where(
        and(
          eq(availabilityReminderLogTable.expertId, expert.id),
          eq(availabilityReminderLogTable.weekStart, weekStart),
          eq(availabilityReminderLogTable.reminderDay, reminderDay),
        )
      );
  }
}

/**
 * Starts the availability reminder scheduler.  Call once at server startup.
 */
export function startAvailabilityReminderScheduler(): ReturnType<typeof setInterval> {
  const INTERVAL_MS = 60 * 1000;

  logger.info("Availability reminder scheduler started (interval: 60 s)");

  runAvailabilityReminderTick().catch((err) =>
    logger.error({ err }, "availability reminder tick failed on startup")
  );

  return setInterval(() => {
    runAvailabilityReminderTick().catch((err) =>
      logger.error({ err }, "availability reminder tick failed")
    );
  }, INTERVAL_MS);
}
