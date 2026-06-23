import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { expertsTable } from "./experts";

export const expertAvailabilityTable = pgTable("expert_availability", {
  id: serial("id").primaryKey(),
  expertId: integer("expert_id").notNull().references(() => expertsTable.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.expertId, t.startTime)]);

export type ExpertAvailabilitySlot = typeof expertAvailabilityTable.$inferSelect;

export const insertAvailabilitySlotSchema = z.object({
  startTime: z.string().min(1),
});
