import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const expertsTable = pgTable("experts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  headline: text("headline"),
  industry: text("industry").notNull(),
  yearsExperience: integer("years_experience").notNull(),
  bio: text("bio"),
  skills: text("skills").array(),
  avatarUrl: text("avatar_url"),
  rating: real("rating").notNull().default(0),
  totalSessions: integer("total_sessions").notNull().default(0),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  inviteToken: text("invite_token"),
  discoveryPrice: real("discovery_price"),
  consultancyPrice: real("consultancy_price"),
  growthPrice3mo: real("growth_price_3mo"),
  growthPrice6mo: real("growth_price_6mo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExpertSchema = createInsertSchema(expertsTable).omit({ id: true, createdAt: true, rating: true, totalSessions: true });
export type InsertExpert = z.infer<typeof insertExpertSchema>;
export type Expert = typeof expertsTable.$inferSelect;
