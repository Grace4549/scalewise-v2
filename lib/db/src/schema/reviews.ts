import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { expertsTable } from "./experts";
import { usersTable } from "./users";
import { bookingsTable } from "./bookings";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  reviewerName: text("reviewer_name").notNull(),
  businessName: text("business_name"),
  expertId: integer("expert_id").references(() => expertsTable.id),
  rating: integer("rating").notNull(),
  body: text("body").notNull(),
  reviewType: text("review_type", { enum: ["public", "verified"] }).notNull().default("public"),
  bookingId: integer("booking_id").references(() => bookingsTable.id),
  clientId: integer("client_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
