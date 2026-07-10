import argon2 from "argon2";
import { createHash } from "crypto";
import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean | "legacy"> {
  if (stored.startsWith("$argon2")) {
    return argon2.verify(stored, password);
  }

  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = createHash("sha256").update(password + salt).digest("hex");
  return computed === hash ? "legacy" : false;
}

export function generateMeetLink(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const part = () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `https://meet.google.com/${part()}-${part()}-${part()}`;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = req.session as { userId?: number; sessionVersion?: number; emailVerified?: boolean };
  const userId = session.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  req.userId = userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  if (session.sessionVersion !== user.sessionVersion) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session expired. Please log in again." });
    return;
  }
  req.userRole = user.role;
  req.userEmailVerified = user.emailVerified;
  // Cache in session for fast access on subsequent requests
  if (session.emailVerified === undefined) {
    session.emailVerified = user.emailVerified;
  }
  next();
}

/**
 * Requires the authenticated user to have a verified email address.
 * Must be used after requireAuth (relies on req.userEmailVerified set by requireAuth).
 */
export async function requireEmailVerified(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.userEmailVerified) {
    res.status(403).json({ error: "EMAIL_NOT_VERIFIED" });
    return;
  }
  next();
}

export async function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireAuth(req, res, async () => {
      if (!req.userRole || !roles.includes(req.userRole)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      next();
    });
  };
}
