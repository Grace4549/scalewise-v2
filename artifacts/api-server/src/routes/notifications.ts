import { Router, type IRouter } from "express";
import { db, notificationLogTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(notificationLogTable)
    .where(eq(notificationLogTable.recipientUserId, req.userId!))
    .orderBy(desc(notificationLogTable.createdAt))
    .limit(50);

  res.json(
    rows.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      notificationType: r.notificationType,
      payload: (() => { try { return JSON.parse(r.payload); } catch { return {}; } })(),
      seen: r.seen,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.patch("/notifications/:id/seen", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select()
    .from(notificationLogTable)
    .where(
      and(
        eq(notificationLogTable.id, id),
        eq(notificationLogTable.recipientUserId, req.userId!)
      )
    );

  if (!row) { res.status(404).json({ error: "Notification not found" }); return; }

  const [updated] = await db
    .update(notificationLogTable)
    .set({ seen: true })
    .where(eq(notificationLogTable.id, id))
    .returning();

  res.json({
    id: updated.id,
    bookingId: updated.bookingId,
    notificationType: updated.notificationType,
    payload: (() => { try { return JSON.parse(updated.payload); } catch { return {}; } })(),
    seen: updated.seen,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
