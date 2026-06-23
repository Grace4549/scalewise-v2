import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { bookingsTable } from "./bookings";
import { usersTable } from "./users";

export const NOTIFICATION_TYPES = [
  "48hr_reminder",
  "24hr_reminder",
  "1hr_reminder",
  "client_cancelled",
  "client_rescheduled",
  "expert_cancelled",
  "expert_reschedule_requested",
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export const notificationLogTable = pgTable("notification_log", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookingsTable.id, { onDelete: "cascade" }),
  recipientUserId: integer("recipient_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  notificationType: text("notification_type").notNull().$type<NotificationType>(),
  payload: text("payload").notNull().default("{}"),
  seen: boolean("seen").notNull().default(false),
  sent: boolean("sent").notNull().default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationLog = typeof notificationLogTable.$inferSelect;
