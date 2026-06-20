import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
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
  status: text("status", { enum: ["upcoming", "completed", "cancelled", "no-show"] }).notNull().default("upcoming"),
  payoutStatus: text("payout_status", { enum: ["pending", "paid"] }).notNull().default("pending"),
  payoutPaidAt: timestamp("payout_paid_at", { withTimezone: true }),
  notes: text("notes"),
  meetLink: text("meet_link"),
  amount: real("amount"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true, status: true, meetLink: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
