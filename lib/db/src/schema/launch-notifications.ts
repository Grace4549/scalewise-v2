import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const launchNotificationsTable = pgTable("launch_notifications", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LaunchNotification = typeof launchNotificationsTable.$inferSelect;
