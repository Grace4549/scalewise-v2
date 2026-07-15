import { Router, type IRouter } from "express";
import { db, messagesTable, bookingsTable, usersTable, expertsTable } from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { requireAuth, requireEmailVerified } from "../lib/auth";
import { SendMessageBody } from "@workspace/api-zod";
import { sendMessageNotificationEmail } from "../lib/email";
import { createNotification } from "../lib/notify";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function fetchSenderMap(senderIds: number[]) {
  if (senderIds.length === 0) return {} as Record<number, typeof usersTable.$inferSelect>;
  const senders = await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(${senderIds})`);
  return Object.fromEntries(senders.map((s) => [s.id, s]));
}

function formatMessage(m: typeof messagesTable.$inferSelect, senderMap: Record<number, typeof usersTable.$inferSelect>) {
  return {
    id: m.id,
    bookingId: m.bookingId ?? null,
    expertId: m.expertId ?? null,
    senderId: m.senderId,
    senderName: senderMap[m.senderId]?.name ?? "Unknown",
    senderRole: senderMap[m.senderId]?.role ?? "client",
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  };
}

router.get("/messages/inbox", requireAuth, async (req, res): Promise<void> => {
  let threads: {
    threadType: string;
    bookingId: number | null;
    expertId: number | null;
    otherPartyName: string;
    otherPartyRole: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
  }[] = [];

  if (req.userRole === "admin") {
    const expertMessages = await db
      .select()
      .from(messagesTable)
      .where(and(isNull(messagesTable.bookingId)));

    const expertIdSet = new Set(expertMessages.map((m) => m.expertId).filter(Boolean));
    for (const eid of expertIdSet) {
      const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, eid!));
      const msgs = expertMessages
        .filter((m) => m.expertId === eid)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const last = msgs[0];
      if (last) {
        threads.push({
          threadType: "admin",
          bookingId: null,
          expertId: eid!,
          otherPartyName: expert?.name ?? "Unknown Expert",
          otherPartyRole: "expert",
          lastMessage: last.body,
          lastMessageAt: last.createdAt.toISOString(),
          unreadCount: 0,
        });
      }
    }
  } else if (req.userRole === "expert") {
    const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
    if (expert) {
      const adminMsgs = await db
        .select()
        .from(messagesTable)
        .where(and(eq(messagesTable.expertId, expert.id), isNull(messagesTable.bookingId)))
        .orderBy(messagesTable.createdAt);

      if (adminMsgs.length > 0) {
        const last = adminMsgs[adminMsgs.length - 1];
        threads.push({
          threadType: "admin",
          bookingId: null,
          expertId: expert.id,
          otherPartyName: "ScaleWise Admin",
          otherPartyRole: "admin",
          lastMessage: last.body,
          lastMessageAt: last.createdAt.toISOString(),
          unreadCount: 0,
        });
      }

      const expertBookings = await db.select().from(bookingsTable).where(eq(bookingsTable.expertId, expert.id));
      for (const booking of expertBookings) {
        const msgs = await db
          .select()
          .from(messagesTable)
          .where(eq(messagesTable.bookingId, booking.id))
          .orderBy(messagesTable.createdAt);
        if (msgs.length > 0) {
          const [client] = await db.select().from(usersTable).where(eq(usersTable.id, booking.clientId));
          const last = msgs[msgs.length - 1];
          threads.push({
            threadType: "booking",
            bookingId: booking.id,
            expertId: null,
            otherPartyName: client?.name ?? "Client",
            otherPartyRole: "client",
            lastMessage: last.body,
            lastMessageAt: last.createdAt.toISOString(),
            unreadCount: 0,
          });
        }
      }
    }
  } else {
    const clientBookings = await db.select().from(bookingsTable).where(eq(bookingsTable.clientId, req.userId!));
    for (const booking of clientBookings) {
      const msgs = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.bookingId, booking.id))
        .orderBy(messagesTable.createdAt);
      if (msgs.length > 0) {
        const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.id, booking.expertId));
        const last = msgs[msgs.length - 1];
        threads.push({
          threadType: "booking",
          bookingId: booking.id,
          expertId: null,
          otherPartyName: expert?.name ?? "Expert",
          otherPartyRole: "expert",
          lastMessage: last.body,
          lastMessageAt: last.createdAt.toISOString(),
          unreadCount: 0,
        });
      }
    }
  }

  threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  res.json(threads);
});

router.get("/messages/admin/:expertId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.expertId) ? req.params.expertId[0] : req.params.expertId;
  const expertId = parseInt(raw, 10);
  if (isNaN(expertId)) { res.status(400).json({ error: "Invalid expertId" }); return; }

  if (req.userRole === "expert") {
    const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
    if (!expert || expert.id !== expertId) { res.status(403).json({ error: "Forbidden" }); return; }
  } else if (req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.expertId, expertId), isNull(messagesTable.bookingId)))
    .orderBy(messagesTable.createdAt);

  const senderIds = [...new Set(messages.map((m) => m.senderId))];
  const senderMap = await fetchSenderMap(senderIds);

  res.json(messages.map((m) => formatMessage(m, senderMap)));
});

router.post("/messages/admin/:expertId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.expertId) ? req.params.expertId[0] : req.params.expertId;
  const expertId = parseInt(raw, 10);
  if (isNaN(expertId)) { res.status(400).json({ error: "Invalid expertId" }); return; }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (req.userRole === "expert") {
    const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
    if (!expert || expert.id !== expertId) { res.status(403).json({ error: "Forbidden" }); return; }
  } else if (req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [message] = await db
    .insert(messagesTable)
    .values({
      expertId,
      bookingId: null,
      senderId: req.userId!,
      body: parsed.data.body,
    })
    .returning();

  const senderMap = await fetchSenderMap([req.userId!]);
  const senderName = senderMap[req.userId!]?.name ?? "Someone";

  // Email + in-app notification to the other party (fire and forget)
  if (req.userRole === "expert") {
    // Sender is expert → notify admin via email only
    db.select().from(usersTable).where(eq(usersTable.role, "admin")).limit(1)
      .then(([admin]) => {
        if (admin) {
          sendMessageNotificationEmail({
            to: admin.email,
            recipientName: admin.name,
            senderName,
            senderRole: "expert",
            messagePreview: parsed.data.body,
            dashboardUrl: "https://scalewise.co.ke/admin",
          }).catch((err) => logger.error({ err }, "Admin message notification email failed"));
        }
      })
      .catch((err) => logger.error({ err }, "Admin lookup for message notification failed"));
  } else if (req.userRole === "admin") {
    // Sender is admin → notify expert via email + in-app
    db.select().from(expertsTable).where(eq(expertsTable.id, expertId)).limit(1)
      .then(([expert]) => {
        if (expert) {
          sendMessageNotificationEmail({
            to: expert.email,
            recipientName: expert.name,
            senderName: "ScaleWise",
            senderRole: "admin",
            messagePreview: parsed.data.body,
            dashboardUrl: "https://scalewise.co.ke/expert/dashboard",
          }).catch((err) => logger.error({ err, expertId }, "Expert message notification email failed"));
          if (expert.userId) {
            createNotification({
              bookingId: null,
              recipientUserId: expert.userId,
              notificationType: "new_message",
              recipientEmail: expert.email,
              recipientName: expert.name,
              payload: {
                title: "New Message from ScaleWise",
                body: `You have a new message from the ScaleWise team. Open your inbox to reply.`,
                otherPartyName: "ScaleWise",
              },
            }).catch((err: unknown) => logger.error({ err, expertId }, "new_message notification (admin→expert) failed"));
          }
        }
      })
      .catch((err) => logger.error({ err }, "Expert lookup for message notification failed"));
  }

  res.status(201).json(formatMessage(message, senderMap));
});

router.get("/messages/:bookingId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId;
  const bookingId = parseInt(raw, 10);
  if (isNaN(bookingId)) { res.status(400).json({ error: "Invalid bookingId" }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  if (req.userRole !== "admin" && booking.clientId !== req.userId) {
    const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
    if (!expert || expert.id !== booking.expertId) { res.status(403).json({ error: "Forbidden" }); return; }
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.bookingId, bookingId))
    .orderBy(messagesTable.createdAt);

  const senderIds = [...new Set(messages.map((m) => m.senderId))];
  const senderMap = await fetchSenderMap(senderIds);

  res.json(messages.map((m) => formatMessage(m, senderMap)));
});

router.post("/messages/:bookingId", requireAuth, requireEmailVerified, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId;
  const bookingId = parseInt(raw, 10);
  if (isNaN(bookingId)) { res.status(400).json({ error: "Invalid bookingId" }); return; }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  if (req.userRole !== "admin" && booking.clientId !== req.userId) {
    const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
    if (!expert || expert.id !== booking.expertId) { res.status(403).json({ error: "Forbidden" }); return; }
  }

  // Messaging is only available for confirmed (upcoming) bookings.
  // Blocking on pending_payment prevents unpaid placeholder bookings from
  // being used as a free spam channel to reach experts.
  if (booking.status === "pending_payment") {
    res.status(403).json({ error: "Messaging is only available once a booking has been confirmed and payment received." });
    return;
  }

  const [message] = await db
    .insert(messagesTable)
    .values({
      bookingId,
      expertId: null,
      senderId: req.userId!,
      body: parsed.data.body,
    })
    .returning();

  // Graceful fallback: if the sender-map lookup fails, the message is already
  // saved — still return a 201 with "Unknown" as the sender name rather than
  // letting a secondary DB error roll back or 500 the whole request.
  let senderMap: Record<number, typeof usersTable.$inferSelect> = {};
  try {
    senderMap = await fetchSenderMap([req.userId!]);
  } catch (err) {
    req.log.warn({ err, bookingId }, "fetchSenderMap failed after message insert; using empty map");
  }
  const senderName = senderMap[req.userId!]?.name ?? "Someone";
  const senderRole = req.userRole as "client" | "expert" | "admin";

  // Email + in-app notification to the other party (fire and forget)
  if (req.userRole === "client") {
    // Notify expert
    db.select().from(expertsTable).where(eq(expertsTable.id, booking.expertId)).limit(1)
      .then(([expert]) => {
        if (expert) {
          sendMessageNotificationEmail({
            to: expert.email,
            recipientName: expert.name,
            senderName,
            senderRole,
            messagePreview: parsed.data.body,
            dashboardUrl: "https://scalewise.co.ke/expert/dashboard",
          }).catch((err) => logger.error({ err, bookingId }, "Expert message notification email failed"));
          if (expert.userId) {
            createNotification({
              bookingId: null,
              recipientUserId: expert.userId,
              notificationType: "new_message",
              recipientEmail: expert.email,
              recipientName: expert.name,
              payload: {
                title: "New Message",
                body: `You have a new message from ${senderName}. Open your inbox to reply.`,
                otherPartyName: senderName,
              },
            }).catch((err: unknown) => logger.error({ err }, "new_message notification (expert) failed"));
          }
        }
      })
      .catch((err) => logger.error({ err }, "Expert lookup for message notification failed"));
  } else if (req.userRole === "expert") {
    // Notify client
    db.select().from(usersTable).where(eq(usersTable.id, booking.clientId)).limit(1)
      .then(([client]) => {
        if (client) {
          sendMessageNotificationEmail({
            to: client.email,
            recipientName: client.name,
            senderName,
            senderRole,
            messagePreview: parsed.data.body,
            dashboardUrl: "https://scalewise.co.ke/client/dashboard",
          }).catch((err) => logger.error({ err, bookingId }, "Client message notification email failed"));
          createNotification({
            bookingId: null,
            recipientUserId: client.id,
            notificationType: "new_message",
            recipientEmail: client.email,
            recipientName: client.name,
            payload: {
              title: "New Message",
              body: `You have a new message from ${senderName}. Open your inbox to reply.`,
              otherPartyName: senderName,
            },
          }).catch((err: unknown) => logger.error({ err }, "new_message notification (client) failed"));
        }
      })
      .catch((err) => logger.error({ err }, "Client lookup for message notification failed"));
  }
  // Admin messages in booking threads: no email (internal)

  res.status(201).json(formatMessage(message, senderMap));
});

export default router;
