import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { bookingsTable } from "./bookings";

export const reminderLogTable = pgTable("reminder_log", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookingsTable.id, { onDelete: "cascade" }),
  reminderType: text("reminder_type", { enum: ["48hr", "24hr", "1hr"] }).notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  sent: boolean("sent").notNull().default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReminderLog = typeof reminderLogTable.$inferSelect;
