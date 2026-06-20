import { Router, type IRouter } from "express";
import { db, messagesTable, bookingsTable, usersTable, expertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { SendMessageBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/messages/:bookingId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId;
  const bookingId = parseInt(raw, 10);
  if (isNaN(bookingId)) { res.status(400).json({ error: "Invalid bookingId" }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  if (req.userRole !== "admin" && booking.clientId !== req.userId) {
    const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
    if (!expert || expert.id !== booking.expertId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.bookingId, bookingId))
    .orderBy(messagesTable.createdAt);

  const senderIds = [...new Set(messages.map((m) => m.senderId))];
  const senders = senderIds.length > 0
    ? await db.select().from(usersTable).where(eq(usersTable.id, senderIds[0]))
    : [];

  const senderMap = Object.fromEntries(senders.map((s) => [s.id, s]));

  res.json(
    messages.map((m) => ({
      id: m.id,
      bookingId: m.bookingId,
      senderId: m.senderId,
      senderName: senderMap[m.senderId]?.name ?? "Unknown",
      senderRole: senderMap[m.senderId]?.role ?? "client",
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    }))
  );
});

router.post("/messages/:bookingId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId;
  const bookingId = parseInt(raw, 10);
  if (isNaN(bookingId)) { res.status(400).json({ error: "Invalid bookingId" }); return; }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  if (req.userRole !== "admin" && booking.clientId !== req.userId) {
    const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
    if (!expert || expert.id !== booking.expertId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
  }

  const [message] = await db
    .insert(messagesTable)
    .values({
      bookingId,
      senderId: req.userId!,
      body: parsed.data.body,
    })
    .returning();

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));

  res.status(201).json({
    id: message.id,
    bookingId: message.bookingId,
    senderId: message.senderId,
    senderName: sender?.name ?? "Unknown",
    senderRole: sender?.role ?? "client",
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  });
});

export default router;
