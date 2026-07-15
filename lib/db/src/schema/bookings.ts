import { pgTable, text, serial, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { expertsTable } from "./experts";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => usersTable.id).notNull(),
  expertId: integer("expert_id").references(() => expertsTable.id).notNull(),
  sessionType: text("session_type", { enum: ["discovery", "consultancy", "growth_3mo", "growth_6mo"] }).notNull(),
  scheduledTime: timestamp("scheduled_time", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  status: text("status", { enum: ["pending_payment", "upcoming", "completed", "cancelled", "no-show"] }).notNull().default("pending_payment"),
  payoutStatus: text("payout_status", { enum: ["pending", "paid"] }).notNull().default("pending"),
  payoutPaidAt: timestamp("payout_paid_at", { withTimezone: true }),
  notes: text("notes"),
  meetLink: text("meet_link"),
  amount: real("amount"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  cancelledBy: text("cancelled_by", { enum: ["client", "expert", "admin"] }),
  cancellationReason: text("cancellation_reason"),
  refundStatus: text("refund_status", { enum: ["none", "pending", "paid"] }).notNull().default("none"),
  refundAmount: real("refund_amount"),
  refundPercent: real("refund_percent"),
  expertCancellationEarning: real("expert_cancellation_earning"),

  refundPaidAt: timestamp("refund_paid_at", { withTimezone: true }),

  rescheduledBy: text("rescheduled_by", { enum: ["client", "expert", "admin"] }),
  rescheduledFromTime: timestamp("rescheduled_from_time", { withTimezone: true }),
  rescheduledAt: timestamp("rescheduled_at", { withTimezone: true }),
  rescheduleCount: integer("reschedule_count").notNull().default(0),

  isTestBooking: boolean("is_test_booking").notNull().default(false),
  isAcknowledged: boolean("is_acknowledged").notNull().default(false),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true, status: true, meetLink: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
