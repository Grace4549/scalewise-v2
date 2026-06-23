import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { expertsTable } from "./experts";
import { usersTable } from "./users";

export const payoutBatchesTable = pgTable("payout_batches", {
  id: serial("id").primaryKey(),
  expertId: integer("expert_id").references(() => expertsTable.id).notNull(),
  adminId: integer("admin_id").references(() => usersTable.id).notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  totalAmount: real("total_amount").notNull(),
  sessionAmount: real("session_amount").notNull().default(0),
  cancellationAmount: real("cancellation_amount").notNull().default(0),
  vatAmount: real("vat_amount").notNull().default(0),
  notes: text("notes"),
  receiptNumber: text("receipt_number").notNull(),
});

export type PayoutBatch = typeof payoutBatchesTable.$inferSelect;
