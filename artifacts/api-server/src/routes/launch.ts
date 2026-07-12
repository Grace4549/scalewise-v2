import { Router, type IRouter } from "express";
import { db, launchNotificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { sendLaunchSubscriptionEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/launch/subscribe", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }
  const normalized = email.toLowerCase().trim();
  const [existing] = await db
    .select({ id: launchNotificationsTable.id })
    .from(launchNotificationsTable)
    .where(eq(launchNotificationsTable.email, normalized));
  if (existing) {
    res.status(409).json({ error: "Already subscribed" });
    return;
  }
  const [row] = await db
    .insert(launchNotificationsTable)
    .values({ email: normalized })
    .returning();

  // Send welcome email (fire and forget)
  sendLaunchSubscriptionEmail({ to: normalized }).catch((err) =>
    logger.error({ err, email: normalized }, "sendLaunchSubscriptionEmail failed")
  );

  res.status(201).json(row);
});

router.get("/admin/launch-notifications", async (req, res): Promise<void> => {
  await requireAuth(req, res, async () => {
    if (req.userRole !== "admin") {
      res.status(403).json({ error: "Admin only" });
      return;
    }
    const rows = await db
      .select()
      .from(launchNotificationsTable)
      .orderBy(launchNotificationsTable.createdAt);
    res.json(rows);
  });
});

export default router;
