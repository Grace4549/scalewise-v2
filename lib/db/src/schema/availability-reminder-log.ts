import { pgTable, serial, integer, text, boolean, timestamp, date, unique, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { expertsTable } from "./experts";

export const availabilityReminderLogTable = pgTable(
  "availability_reminder_log",
  {
    id: serial("id").primaryKey(),
    expertId: integer("expert_id").notNull().references(() => expertsTable.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    reminderDay: text("reminder_day", { enum: ["friday", "saturday", "sunday"] }).notNull(),
    sent: boolean("sent").notNull().default(false),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.expertId, t.weekStart, t.reminderDay)],
);

export type AvailabilityReminderLog = typeof availabilityReminderLogTable.$inferSelect;
