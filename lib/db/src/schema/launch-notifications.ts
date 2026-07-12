import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const launchNotificationsTable = pgTable(
  "launch_notifications",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("launch_notifications_email_idx").on(t.email)],
);

export type LaunchNotification = typeof launchNotificationsTable.$inferSelect;
