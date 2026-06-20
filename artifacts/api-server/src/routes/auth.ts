import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, usersTable, expertsTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { hashPassword, verifyPassword, requireAuth } from "../lib/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const ADMIN_EMAIL = "kihongegrace4549@gmail.com";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, name, role } = parsed.data;

  // Admin email is reserved — cannot be registered through the public form
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
      res.status(400).json({
        error: "Invalid or expired invite token. Please contact your administrator.",
      });
      return;
    }

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(usersTable).values({ email, passwordHash, name, role }).returning();

    // Link user to their specific approved application and consume the invite token atomically
    await db
      .update(expertsTable)
      .set({ userId: user.id, inviteToken: null })
      .where(and(
        eq(expertsTable.id, application.id),
        eq(expertsTable.status, "approved"),
        eq(expertsTable.inviteToken, tokenHash)
      ));

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    (req.session as { userId?: number }).userId = user.id;

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
        bio: user.bio ?? null,
        createdAt: user.createdAt.toISOString(),
      },
    });
    return;
  }

  // Non-expert (client) registration
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({ email, passwordHash, name, role }).returning();

  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  (req.session as { userId?: number }).userId = user.id;

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
      createdAt: user.createdAt.toISOString(),
    },
  });
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

  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  (req.session as { userId?: number }).userId = user.id;

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
      createdAt: user.createdAt.toISOString(),
    },
  });
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
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    createdAt: user.createdAt.toISOString(),
  });
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
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, resetToken.userId));
  await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.id, resetToken.id));

  res.json({ ok: true });
});

export default router;
