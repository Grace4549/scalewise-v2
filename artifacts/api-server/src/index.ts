import app from "./app";
import { logger } from "./lib/logger";
import { startReminderScheduler } from "./lib/reminder-scheduler";
import { startAvailabilityReminderScheduler } from "./lib/availability-reminder-scheduler";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Start the session reminder scheduler.
  // Polls every 60 s; fires 48 hr / 24 hr / 1 hr reminders for upcoming bookings.
  // Currently logs reminders only — wire dispatchReminder() to an email provider
  // (see reminder-scheduler.ts ── EMAIL SEND HOOK ── comments) when ready.
  startReminderScheduler();

  // Start the availability reminder scheduler.
  // Polls every 60 s; on Fri/Sat/Sun before the upcoming week, fires a reminder
  // to week-by-week experts who have not yet submitted slots for that week.
  // Currently logs only — wire dispatchAvailabilityReminder() to an email provider
  // (see availability-reminder-scheduler.ts ── EMAIL SEND HOOK ── comments) when ready.
  startAvailabilityReminderScheduler();
});
