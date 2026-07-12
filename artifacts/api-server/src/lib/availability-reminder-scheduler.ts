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
 */

import { db, expertsTable, expertAvailabilityTable, availabilityReminderLogTable } from "@workspace/db";
import { eq, and, gte, lt } from "drizzle-orm";
import { isNotNull } from "drizzle-orm";
import { logger } from "./logger";
import { sendAvailabilityReminderEmail } from "./email";

function getUpcomingMonday(now: Date): Date {
  const nairobOffset = 3 * 60;
  const localMs = now.getTime() + nairobOffset * 60_000;
  const local = new Date(localMs);
  const dayOfWeek = local.getUTCDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
  const mondayLocal = new Date(localMs + daysUntilMonday * 86_400_000);
  return new Date(
    Date.UTC(mondayLocal.getUTCFullYear(), mondayLocal.getUTCMonth(), mondayLocal.getUTCDate())
  );
}

function getReminderDayName(now: Date, upcomingMonday: Date): "friday" | "saturday" | "sunday" | null {
  const diffMs = upcomingMonday.getTime() - now.getTime();
  const diffDays = diffMs / 86_400_000;
  const nairobOffset = 3 * 60;
  const local = new Date(now.getTime() + nairobOffset * 60_000);
  const dow = local.getUTCDay();
  if (dow === 5 && diffDays >= 2 && diffDays < 4) return "friday";
  if (dow === 6 && diffDays >= 1 && diffDays < 3) return "saturday";
  if (dow === 0 && diffDays >= 0 && diffDays < 2) return "sunday";
  return null;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function runAvailabilityReminderTick(): Promise<void> {
  const now = new Date();
  const upcomingMonday = getUpcomingMonday(now);
  const reminderDay = getReminderDayName(now, upcomingMonday);

  if (!reminderDay) return;

  const weekStart = toDateString(upcomingMonday);
  const weekEnd = new Date(upcomingMonday.getTime() + 7 * 86_400_000);

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

    if (existingSlots.length > 0) continue;

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
      if (err?.code === "23505") continue;
      logger.error({ err, expertId: expert.id, weekStart, reminderDay }, "availability_reminder_log insert failed");
      continue;
    }

    if (!inserted) continue;

    // Send the reminder email via Resend
    try {
      await sendAvailabilityReminderEmail({
        to: expert.email,
        expertName: expert.name,
        weekStart,
      });

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
    } catch (emailErr) {
      logger.error(
        { err: emailErr, expertId: expert.id, weekStart, reminderDay },
        "Availability reminder email failed — row remains sent=false for retry"
      );
    }
  }
}

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
