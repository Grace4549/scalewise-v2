import { pgTable, serial, integer, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { bookingsTable } from "./bookings";
import { usersTable } from "./users";

export const NOTIFICATION_TYPES = [
  "48hr_reminder",
  "24hr_reminder",
  "1hr_reminder",
  "new_booking",
  "booking_confirmed",
  "client_cancelled",
  "client_rescheduled",
  "expert_cancelled",
  "expert_reschedule_requested",
  "expert_reschedule_declined",
  "client_no_show",
  "refund_processed",
  "payout_processed",
  "new_message",
  "email_verification",
  "email_verification_resend",
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export const notificationLogTable = pgTable("notification_log", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookingsTable.id, { onDelete: "cascade" }),
  recipientUserId: integer("recipient_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  notificationType: text("notification_type").notNull().$type<NotificationType>(),
  payload: text("payload").notNull().default("{}"),
  seen: boolean("seen").notNull().default(false),
  sent: boolean("sent").notNull().default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqPerBookingRecipientType: uniqueIndex("notification_log_booking_recipient_type_uidx")
    .on(table.bookingId, table.recipientUserId, table.notificationType)
    .where(sql`${table.bookingId} IS NOT NULL`),
}));

export type NotificationLog = typeof notificationLogTable.$inferSelect;
