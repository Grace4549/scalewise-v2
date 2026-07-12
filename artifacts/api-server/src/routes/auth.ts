import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, usersTable, expertsTable, passwordResetTokensTable, notificationLogTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { hashPassword, verifyPassword, requireAuth } from "../lib/auth";
import { RegisterBody, LoginBody, VerifyEmailBody, ResendVerificationBody } from "@workspace/api-zod";
import { sendVerificationEmail } from "../lib/email";

const ADMIN_EMAIL = "kihongegrace4549@gmail.com";

const router: IRouter = Router();

async function setSessionUser(
  req: Parameters<typeof requireAuth>[0],
  userId: number,
  sessionVersion: number,
  emailVerified: boolean,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  req.session.userId = userId;
  req.session.sessionVersion = sessionVersion;
  req.session.emailVerified = emailVerified;
}

/**
 * Issue a new email verification token for the given user. Persists the SHA-256 hashed token
 * and expiry to the DB, then writes a notification_log entry with sent=false so the email
 * sending layer can pick it up.
 *
 * TODO: Once an email provider is integrated (e.g. Resend, SendGrid, Postmark), replace the
 * notification_log insert below with an actual send call. The payload already contains
 * `recipientEmail` and `verificationLink` needed to compose the message. The email body should
 * match this template:
 *
 *   Subject: "Confirm your ScaleWise account"
 *   Body: "Hi [Name], welcome to ScaleWise. Click the button below to verify your email
 *          address and activate your account. [Verify My Account] This link expires in 24 hours."
 */
async function issueVerificationToken(
  userId: number,
  email: string,
  req: Parameters<typeof requireAuth>[0],
  notificationType: "email_verification" | "email_verification_resend",
): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db
    .update(usersTable)
    .set({ verificationToken: tokenHash, verificationTokenExpiresAt: expiresAt })
    .where(eq(usersTable.id, userId));

  // Build the verification link pointing at the frontend verify-email page
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol;
  const host = req.get("host");
  const basePath = (process.env.BASE_PATH ?? "").replace(/\/$/, "");
  const verificationLink = `${proto}://${host}${basePath}/verify-email?token=${token}`;

  const [row] = await db.insert(notificationLogTable).values({
    bookingId: null,
    recipientUserId: userId,
    notificationType,
    payload: JSON.stringify({ recipientEmail: email, verificationLink }),
    sent: false,
  }).returning({ id: notificationLogTable.id });

  // Send the verification email via Resend (fire and forget — never blocks registration)
  sendVerificationEmail({
    to: email,
    recipientName: (await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId)).limit(1))[0]?.name ?? email,
    verificationLink,
    isResend: notificationType === "email_verification_resend",
    notificationLogId: row?.id,
  }).catch((err) => req.log.error({ err, userId }, "sendVerificationEmail failed"));

  req.log.info({ userId, email, notificationType }, "Verification email sent");
}

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, name, role } = parsed.data;

  if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    res.status(400).json({ error: "This email is reserved. Please contact the platform administrator." });
    return;
  }

  // Expert role requires a prior approved application AND a valid one-time invite token
  if (role === "expert") {
    const { inviteToken } = req.body as { inviteToken?: string };
    if (!inviteToken || typeof inviteToken !== "string") {
      res.status(400).json({
        error: "An invite token is required to register as an expert. Please contact your administrator.",
      });
      return;
    }

    const tokenHash = crypto.createHash("sha256").update(inviteToken).digest("hex");

    const [application] = await db
      .select()
      .from(expertsTable)
      .where(and(
        eq(expertsTable.email, email),
        eq(expertsTable.status, "approved"),
        eq(expertsTable.inviteToken, tokenHash)
      ));

    if (!application) {
      res.status(400).json({ error: "Invalid or expired invite token. Please contact your administrator." });
      return;
    }

    if (!application.inviteExpiresAt || application.inviteExpiresAt < new Date()) {
      res.status(400).json({ error: "Invalid or expired invite token. Please contact your administrator." });
      return;
    }

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));

    let user: typeof existing;

    if (existing) {
      if (existing.role !== "client") {
        res.status(400).json({ error: "An account with this email is already active as an expert or admin." });
        return;
      }

      // Verify the registrant controls the existing account
      const verifyResult = await verifyPassword(password, existing.passwordHash);
      if (!verifyResult) {
        res.status(401).json({
          error: "An account with this email already exists. Please provide your existing account password to link it to your expert profile.",
        });
        return;
      }

      const [upgraded] = await db
        .update(usersTable)
        .set({ role: "expert" })
        .where(eq(usersTable.id, existing.id))
        .returning();
      user = upgraded;
    } else {
      const passwordHash = await hashPassword(password);
      const [created] = await db
        .insert(usersTable)
        .values({ email, passwordHash, name, role, emailVerified: false })
        .returning();
      user = created;
    }

    // Link user to their approved application and consume the invite token atomically
    await db
      .update(expertsTable)
      .set({ userId: user.id, inviteToken: null })
      .where(and(
        eq(expertsTable.id, application.id),
        eq(expertsTable.status, "approved"),
        eq(expertsTable.inviteToken, tokenHash)
      ));

    // Require email verification even for invite-token experts
    await issueVerificationToken(user.id, user.email, req, "email_verification");

    res.status(201).json({ pending: true, email: user.email });
    return;
  }

  // Client (non-expert) registration
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash, name, role, emailVerified: false })
    .returning();

  await issueVerificationToken(user.id, user.email, req, "email_verification");

  res.status(201).json({ pending: true, email: user.email });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  const verifyResult = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !verifyResult) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Transparently upgrade legacy SHA-256 hashes to argon2id on successful login
  if (verifyResult === "legacy") {
    const newHash = await hashPassword(password);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
  }

  // Ensure admin email always has admin role (self-healing)
  if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && user.role !== "admin") {
    await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, user.id));
    user.role = "admin";
  }

  // Block login if email has not been verified (admin is exempt — manually provisioned)
  if (!user.emailVerified && user.role !== "admin") {
    res.status(403).json({ error: "EMAIL_NOT_VERIFIED", email: user.email });
    return;
  }

  await setSessionUser(req, user.id, user.sessionVersion, user.emailVerified);

  res.json({ user: formatUser(user) });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {});
  res.clearCookie("connect.sid");
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

/**
 * Verify an email address using the raw token from the verification email link.
 * On success: marks the account as verified, creates a session, and returns an AuthResponse.
 * On expired: returns 410 with { error: "EXPIRED", email } so the client can offer resend.
 */
router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A verification token is required." });
    return;
  }

  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.verificationToken, tokenHash));

  if (!user) {
    res.status(400).json({ error: "This verification link is invalid." });
    return;
  }

  if (user.emailVerified) {
    // Already verified — just log them in
    await setSessionUser(req, user.id, user.sessionVersion, true);
    res.json({ user: formatUser(user) });
    return;
  }

  if (!user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
    res.status(410).json({ error: "EXPIRED", email: user.email });
    return;
  }

  // Mark verified and clear the token
  const [verified] = await db
    .update(usersTable)
    .set({ emailVerified: true, verificationToken: null, verificationTokenExpiresAt: null })
    .where(eq(usersTable.id, user.id))
    .returning();

  await setSessionUser(req, verified.id, verified.sessionVersion, true);

  req.log.info({ userId: verified.id, email: verified.email }, "Email address verified");
  res.json({ user: formatUser(verified) });
});

/**
 * Resend the email verification link. Generates a new token (invalidating the previous one)
 * and logs it in notification_log with sent=false.
 * Always returns 200 to prevent email enumeration.
 */
router.post("/auth/resend-verification", async (req, res): Promise<void> => {
  const parsed = ResendVerificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email is required." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, parsed.data.email.toLowerCase().trim()));

  // Return 200 even if not found or already verified — prevents email enumeration
  if (!user || user.emailVerified) {
    res.json({ ok: true });
    return;
  }

  await issueVerificationToken(user.id, user.email, req, "email_verification_resend");

  res.json({ ok: true });
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));

  if (!user) {
    res.json({ ok: true });
    return;
  }

  await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.userId, user.id));

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.insert(passwordResetTokensTable).values({ userId: user.id, token: tokenHash, expiresAt });

  req.log.info({ email: user.email }, "Password reset token generated");

  res.json({ ok: true });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400).json({ error: "Token and new password are required" });
    return;
  }
  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const [resetToken] = await db.select().from(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.token, tokenHash));

  if (!resetToken || resetToken.expiresAt < new Date()) {
    res.status(400).json({ error: "This reset link has expired or is invalid. Please request a new one." });
    return;
  }

  const passwordHash = await hashPassword(password);

  // Increment sessionVersion to invalidate all existing sessions for this user
  await db
    .update(usersTable)
    .set({ passwordHash, sessionVersion: sql`${usersTable.sessionVersion} + 1` })
    .where(eq(usersTable.id, resetToken.userId));

  await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.id, resetToken.id));

  res.json({ ok: true });
});

export default router;
