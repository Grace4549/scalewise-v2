/**
 * Notification helper
 * ─────────────────────────────────────────────────────────────────────────────
 * Central function for creating in-app notifications (visible in dashboards)
 * and sending the corresponding transactional email via Resend.
 *
 * The email is dispatched asynchronously after the notification_log row is
 * committed, so a slow or failed email send never blocks the HTTP response.
 * The notification_log row is updated (sent=true/sentAt or failedAt/failureReason)
 * by the email module after each send attempt.
 */

import { db, notificationLogTable } from "@workspace/db";
import type { NotificationType } from "@workspace/db";
import { logger } from "./logger";
import { sendNotificationEmail } from "./email";

export interface NotificationPayload {
  title: string;
  body: string;
  sessionStart?: string;
  sessionType?: string;
  meetLink?: string | null;
  otherPartyName?: string;
  refundAmount?: number;
  refundPercent?: number;
  actions?: string[];
}

export interface CreateNotificationParams {
  bookingId: number;
  recipientUserId: number;
  notificationType: NotificationType;
  payload: NotificationPayload;
  recipientEmail: string;
  recipientName: string;
}

/**
 * Creates one in-app notification_log row and dispatches a transactional email
 * via Resend. The email is sent asynchronously and never blocks the caller.
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

    // Send the email asynchronously — do not await so the HTTP response is
    // never held up by email provider latency or retries.
    sendNotificationEmail({
      notificationType: params.notificationType,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      notificationLogId: row.id,
      payload: params.payload,
    }).catch((err) =>
      logger.error(
        { err, notificationLogId: row.id, type: params.notificationType },
        "sendNotificationEmail threw unexpectedly"
      )
    );

    logger.info(
      {
        notification: {
          id: row.id,
          bookingId: params.bookingId,
          type: params.notificationType,
          to: params.recipientEmail,
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
