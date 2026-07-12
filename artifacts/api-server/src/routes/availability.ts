import { Router, type IRouter } from "express";
import { db, expertAvailabilityTable, expertsTable } from "@workspace/db";
import { gt, eq, and, isNotNull } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// Public: list available slots for an expert (future only)
// Only exposed for experts who are approved, linked to a user, and accepting bookings —
// matching the same visibility gates applied by GET /experts and GET /experts/:id.
router.get("/experts/:id/availability", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const expertId = parseInt(rawId);
  if (isNaN(expertId)) { res.status(400).json({ message: "Invalid expert id" }); return; }

  const [expert] = await db
    .select({ id: expertsTable.id })
    .from(expertsTable)
    .where(
      and(
        eq(expertsTable.id, expertId),
        eq(expertsTable.status, "approved"),
        isNotNull(expertsTable.userId),
        eq(expertsTable.acceptingBookings, true)
      )
    );

  if (!expert) { res.status(404).json({ message: "Expert not found" }); return; }

  const now = new Date();
  const slots = await db
    .select()
    .from(expertAvailabilityTable)
    .where(and(eq(expertAvailabilityTable.expertId, expertId), gt(expertAvailabilityTable.startTime, now)))
    .orderBy(expertAvailabilityTable.startTime);

  res.json(slots);
});

// Expert: list own future slots
router.get("/expert/availability", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "expert") { res.status(403).json({ error: "Forbidden" }); return; }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
  if (!expert) { res.status(404).json({ message: "Expert not found" }); return; }

  const now = new Date();
  const slots = await db
    .select()
    .from(expertAvailabilityTable)
    .where(and(eq(expertAvailabilityTable.expertId, expert.id), gt(expertAvailabilityTable.startTime, now)))
    .orderBy(expertAvailabilityTable.startTime);

  res.json(slots);
});

// Expert: add a slot
router.post("/expert/availability", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "expert") { res.status(403).json({ error: "Forbidden" }); return; }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
  if (!expert) { res.status(404).json({ message: "Expert not found" }); return; }

  const body = req.body as { startTime?: string };
  if (!body.startTime) { res.status(400).json({ message: "startTime is required" }); return; }

  const startDate = new Date(body.startTime);
  if (isNaN(startDate.getTime())) { res.status(400).json({ message: "Invalid startTime" }); return; }
  if (startDate <= new Date()) { res.status(400).json({ message: "Cannot add slots in the past" }); return; }

  // Normalize to top of the hour
  startDate.setMinutes(0, 0, 0);

  try {
    const [slot] = await db
      .insert(expertAvailabilityTable)
      .values({ expertId: expert.id, startTime: startDate })
      .returning();
    res.status(201).json(slot);
  } catch (err: any) {
    if (err.code === "23505") { res.status(409).json({ message: "Slot already exists" }); return; }
    throw err;
  }
});

// Expert: delete a slot
router.delete("/expert/availability/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.userRole !== "expert") { res.status(403).json({ error: "Forbidden" }); return; }

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const slotId = parseInt(rawId);
  if (isNaN(slotId)) { res.status(400).json({ message: "Invalid slot id" }); return; }

  const [expert] = await db.select().from(expertsTable).where(eq(expertsTable.userId, req.userId!));
  if (!expert) { res.status(404).json({ message: "Expert not found" }); return; }

  await db
    .delete(expertAvailabilityTable)
    .where(and(eq(expertAvailabilityTable.id, slotId), eq(expertAvailabilityTable.expertId, expert.id)));

  res.status(204).send();
});

export default router;
