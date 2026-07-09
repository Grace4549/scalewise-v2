/**
 * Notification helper
 * ─────────────────────────────────────────────────────────────────────────────
 * Central function for creating in-app notifications (visible in dashboards)
 * and logging the corresponding email that will be sent once email integration
 * is connected.
 *
 * Every call site is marked with  ── EMAIL SEND HOOK ──  showing exactly
 * where to add the real email dispatch.
 */

import { db, notificationLogTable } from "@workspace/db";
import type { NotificationType } from "@workspace/db";
import { logger } from "./logger";

export interface NotificationPayload {
  /** Human-readable title shown in the dashboard notification panel. */
  title: string;
  /** Body text of the notification. */
  body: string;
  /** ISO date string of the session start time. */
  sessionStart?: string;
  /** Session type label (e.g. "consultancy"). */
  sessionType?: string;
  /** Google Meet link, if available. */
  meetLink?: string | null;
  /** Name of the other party (client name for expert notifications, expert name for client). */
  otherPartyName?: string;
  /** Refund amount in KES, if applicable. */
  refundAmount?: number;
  /** Refund percentage, if applicable. */
  refundPercent?: number;
  /** Available actions hint for the frontend. */
  actions?: string[];
}

export interface CreateNotificationParams {
  bookingId: number;
  recipientUserId: number;
  notificationType: NotificationType;
  payload: NotificationPayload;
  /** Used for the email log — who gets the email. */
  recipientEmail: string;
  recipientName: string;
}

/**
 * Creates one in-app notification_log row and logs the email that would be sent.
 *
 * Returns the created row id, or null on failure (never throws — failures are
 * logged but should not interrupt the main booking flow).
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<number | null> {
  try {
    const [row] = await db
      .insert(notificationLogTable)
      .values({
        bookingId: params.bookingId,
        recipientUserId: params.recipientUserId,
        notificationType: params.notificationType,
        payload: JSON.stringify(params.payload),
        seen: false,
        sent: false,
      })
      .onConflictDoNothing()
      .returning({ id: notificationLogTable.id });

    if (!row) return null;

    // ── EMAIL SEND HOOK ───────────────────────────────────────────────────────
    // TODO: Replace this log with a real email dispatch to params.recipientEmail.
    // Example with Resend:
    //
    //   import { Resend } from "resend";
    //   const resend = new Resend(process.env.RESEND_API_KEY);
    //   await resend.emails.send({
    //     from: "ScaleWise <noreply@scalewise.co.ke>",
    //     to: params.recipientEmail,
    //     subject: params.payload.title,
    //     html: buildNotificationEmailHtml(params), // ← build your template
    //   });
    //
    // After successful send, flip sent=true:
    //   await db.update(notificationLogTable)
    //     .set({ sent: true, sentAt: new Date() })
    //     .where(eq(notificationLogTable.id, row.id));
    // ─────────────────────────────────────────────────────────────────────────
    logger.info(
      {
        notification: {
          id: row.id,
          bookingId: params.bookingId,
          type: params.notificationType,
          to: params.recipientEmail,
          recipientName: params.recipientName,
          title: params.payload.title,
          body: params.payload.body,
        },
      },
      `[NOTIFY] ${params.notificationType} → ${params.recipientEmail}`
    );

    return row.id;
  } catch (err) {
    logger.error({ err, params }, "createNotification failed");
    return null;
  }
}
