import { pgTable, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { bookingsTable } from "./bookings";
import { usersTable } from "./users";

export const threadLastReadTable = pgTable("thread_last_read", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id, { onDelete: "cascade" }),
  lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("thread_last_read_user_booking_uidx").on(table.userId, table.bookingId),
]);
