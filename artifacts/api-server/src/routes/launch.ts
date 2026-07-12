import { Router, type IRouter } from "express";
import { db, launchNotificationsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { sendLaunchSubscriptionEmail } from "../lib/email";
import { logger } from "../lib/logger";
import { publicWriteLimiter } from "../lib/limiters";

const router: IRouter = Router();

router.post("/launch/subscribe", publicWriteLimiter, async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }
  const normalized = email.toLowerCase().trim();

  const result = await db
    .insert(launchNotificationsTable)
    .values({ email: normalized })
    .onConflictDoNothing()
    .returning();

  // Only send welcome email for genuinely new subscriptions
  if (result.length > 0) {
    sendLaunchSubscriptionEmail({ to: normalized }).catch((err) =>
      logger.error({ err, email: normalized }, "sendLaunchSubscriptionEmail failed")
    );
  }

  // Always return the same response — never reveal subscription status
  res.status(200).json({ message: "You're on the list!" });
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
