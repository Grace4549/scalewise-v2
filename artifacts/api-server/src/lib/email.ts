/**
 * Email service — ScaleWise
 * ─────────────────────────────────────────────────────────────────────────────
 * Central module for all outbound email via Resend.
 *
 * All automated emails are sent from:
 *   FROM:     ScaleWise <noreply@scalewise.co.ke>
 *   REPLY-TO: hello@scalewise.co.ke
 *
 * Call sites:
 *   - createNotification()             → sendNotificationEmail()
 *   - issueVerificationToken()         → sendVerificationEmail()
 *   - availability reminder scheduler  → sendAvailabilityReminderEmail()
 *   - admin approval route             → sendExpertApprovedEmail()
 *   - admin rejection route            → sendExpertRejectedEmail()
 *   - admin mark-paid (expert)         → sendExpertPayoutEmail()
 *   - admin mark-refund-paid           → sendRefundProcessedEmail()
 *   - launch subscribe route           → sendLaunchSubscriptionEmail()
 */

import { Resend } from "resend";
import { db, notificationLogTable } from "@workspace/db";
import type { NotificationType } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const FROM = "ScaleWise <noreply@scalewise.co.ke>";
const REPLY_TO = "hello@scalewise.co.ke";
const SITE_URL = "https://scalewise.co.ke";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");

// ── Utilities ─────────────────────────────────────────────────────────────────

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

function fmtSessionDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
    timeZoneName: "short",
  });
}

function fmtSessionType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── HTML Template Builder ─────────────────────────────────────────────────────

interface EmailTemplateOpts {
  previewText?: string;
  recipientFirstName: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaText?: string;
  ctaColor?: string;
}

function buildHtml(opts: EmailTemplateOpts): string {
  const {
    previewText = "",
    recipientFirstName,
    bodyHtml,
    ctaUrl,
    ctaText,
    ctaColor = "#6395EE",
  } = opts;

  const safeCtaUrl = ctaUrl ? escHtml(ctaUrl) : undefined;
  const safeCtaText = ctaText ? escHtml(ctaText) : undefined;

  const ctaBlock = safeCtaUrl && safeCtaText
    ? `
      <tr>
        <td style="background:#FFFFFF;padding:0 48px 32px;text-align:center;">
          <a href="${safeCtaUrl}"
             style="display:inline-block;background:${ctaColor};color:#FFFFFF;text-decoration:none;
                    padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;
                    font-family:'Helvetica Neue',Arial,sans-serif;letter-spacing:0.2px;">
            ${safeCtaText}
          </a>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>ScaleWise</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F3F4F6;mso-hide:all;">
    ${escHtml(previewText)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#F3F4F6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;">

          <!-- Logo header -->
          <tr>
            <td align="center"
                style="background:#6395EE;border-radius:12px 12px 0 0;padding:28px 48px;">
              <span style="font-size:24px;font-weight:700;color:#FFFFFF;
                           letter-spacing:-0.5px;font-family:'Helvetica Neue',Arial,sans-serif;">
                ScaleWise
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#FFFFFF;padding:40px 48px 8px;">
              <p style="margin:0 0 20px;font-size:16px;line-height:26px;color:#374151;
                        font-family:'Helvetica Neue',Arial,sans-serif;">
                Hi ${escHtml(recipientFirstName)},
              </p>
              ${bodyHtml}
            </td>
          </tr>

          <!-- CTA button -->
          ${ctaBlock}

          <!-- Help line -->
          <tr>
            <td style="background:#FFFFFF;padding:0 48px 32px;">
              <p style="margin:0;font-size:13px;line-height:20px;color:#9CA3AF;
                        font-family:'Helvetica Neue',Arial,sans-serif;">
                Need help? Contact us at
                <a href="mailto:hello@scalewise.co.ke"
                   style="color:#6395EE;text-decoration:none;">hello@scalewise.co.ke</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;
                       border-radius:0 0 12px 12px;padding:24px 48px;">
              <p style="margin:0;font-size:12px;line-height:18px;color:#9CA3AF;
                        font-family:'Helvetica Neue',Arial,sans-serif;">
                &copy; 2026 ScaleWise. All rights reserved.<br>
                <a href="${SITE_URL}" style="color:#6395EE;text-decoration:none;">scalewise.co.ke</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Session detail block (shared across booking emails) ────────────────────────

function sessionDetailBlock(opts: {
  sessionType: string;
  sessionStart: string;
  meetLink?: string | null;
  otherPartyLabel: string;
  otherPartyName: string;
}): string {
  const safeMeetLink = opts.meetLink ? escHtml(opts.meetLink) : null;
  const meetRow = safeMeetLink
    ? `<tr>
        <td style="padding:6px 0;font-size:14px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;width:120px;vertical-align:top;">Google Meet</td>
        <td style="padding:6px 0;font-size:14px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
          <a href="${safeMeetLink}" style="color:#6395EE;text-decoration:none;">${safeMeetLink}</a>
        </td>
      </tr>`
    : "";
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:#F8FAFF;border:1px solid #D1E0FF;border-radius:8px;
                  padding:16px 20px;margin:20px 0;">
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;width:120px;vertical-align:top;">Session type</td>
        <td style="padding:6px 0;font-size:14px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">${escHtml(fmtSessionType(opts.sessionType))}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;width:120px;vertical-align:top;">Date &amp; time</td>
        <td style="padding:6px 0;font-size:14px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">${escHtml(fmtSessionDate(opts.sessionStart))}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;width:120px;vertical-align:top;">${escHtml(opts.otherPartyLabel)}</td>
        <td style="padding:6px 0;font-size:14px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">${escHtml(opts.otherPartyName)}</td>
      </tr>
      ${meetRow}
    </table>`;
}

// ── Retry-aware send (updates notification_log on success/failure) ────────────

async function sendWithRetry(
  opts: { to: string; subject: string; html: string; attachments?: Array<{ filename: string; content: Buffer }> },
  notificationLogId?: number,
  maxAttempts = 3,
): Promise<boolean> {
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await resend.emails.send({
        from: FROM,
        replyTo: REPLY_TO,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.attachments?.length
          ? {
              attachments: opts.attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
              })),
            }
          : {}),
      });

      if (notificationLogId != null) {
        await db
          .update(notificationLogTable)
          .set({ sent: true, sentAt: new Date() })
          .where(eq(notificationLogTable.id, notificationLogId));
      }

      logger.info({ to: opts.to, subject: opts.subject, attempt }, "Email sent");
      return true;
    } catch (err) {
      lastErr = err;
      logger.warn({ err, attempt, to: opts.to }, "Email send attempt failed");
      if (attempt < maxAttempts) await sleep(attempt * 1500);
    }
  }

  // All attempts exhausted
  if (notificationLogId != null) {
    try {
      await db
        .update(notificationLogTable)
        .set({
          failedAt: new Date(),
          failureReason: String(lastErr).slice(0, 500),
        })
        .where(eq(notificationLogTable.id, notificationLogId));
    } catch (dbErr) {
      logger.error({ dbErr }, "Failed to record email failure in notification_log");
    }
  }

  logger.error(
    { err: lastErr, to: opts.to, subject: opts.subject },
    "Email send failed after all retries",
  );
  return false;
}

// ═════════════════════════════════════════════════════════════════════════════
// Public email send functions
// ═════════════════════════════════════════════════════════════════════════════

// ── 1. Email verification ─────────────────────────────────────────────────────

export async function sendVerificationEmail(opts: {
  to: string;
  recipientName: string;
  verificationLink: string;
  isResend?: boolean;
  notificationLogId?: number;
}): Promise<void> {
  const { to, recipientName, verificationLink, isResend = false } = opts;
  const first = firstName(recipientName);

  const subject = isResend
    ? "New verification link for your ScaleWise account"
    : "Confirm your ScaleWise account";

  const introLine = isResend
    ? `You requested a new email verification link. Click the button below to verify your email address.`
    : `Welcome to ScaleWise! Click the button below to verify your email address and activate your account.`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;
              font-family:'Helvetica Neue',Arial,sans-serif;">
      ${introLine}
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#6B7280;
              font-family:'Helvetica Neue',Arial,sans-serif;">
      This link expires in <strong>24 hours</strong>. If you did not create a ScaleWise account, you can safely ignore this email.
    </p>`;

  const html = buildHtml({
    previewText: subject,
    recipientFirstName: first,
    bodyHtml,
    ctaUrl: verificationLink,
    ctaText: "Verify My Account",
  });

  await sendWithRetry({ to, subject, html }, opts.notificationLogId);
}

// ── 1b. Password reset ─────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(opts: {
  to: string;
  recipientName: string;
  resetLink: string;
}): Promise<void> {
  const { to, recipientName, resetLink } = opts;
  const first = firstName(recipientName);

  const subject = "Reset your ScaleWise password";

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;
              font-family:'Helvetica Neue',Arial,sans-serif;">
      We received a request to reset your ScaleWise password. Click the button below to choose a new one.
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#6B7280;
              font-family:'Helvetica Neue',Arial,sans-serif;">
      This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.
    </p>`;

  const html = buildHtml({
    previewText: subject,
    recipientFirstName: first,
    bodyHtml,
    ctaUrl: resetLink,
    ctaText: "Reset My Password",
  });

  await sendWithRetry({ to, subject, html });
}

// ── 2. Booking notification emails (from createNotification) ──────────────────

export interface NotificationEmailOpts {
  notificationType: NotificationType;
  recipientEmail: string;
  recipientName: string;
  notificationLogId: number;
  payload: {
    title: string;
    body: string;
    sessionStart?: string;
    sessionType?: string;
    meetLink?: string | null;
    otherPartyName?: string;
    refundAmount?: number;
    refundPercent?: number;
    actions?: string[];
    bookingId?: number;
  };
}

export async function sendNotificationEmail(opts: NotificationEmailOpts): Promise<void> {
  const { notificationType, recipientEmail, recipientName, notificationLogId, payload } = opts;
  const first = firstName(recipientName);

  let subject: string;
  let bodyHtml: string;
  let ctaUrl: string | undefined;
  let ctaText: string | undefined;

  switch (notificationType) {
    // ── Session reminders ────────────────────────────────────────────────────
    case "48hr_reminder":
    case "24hr_reminder":
    case "1hr_reminder": {
      const label =
        notificationType === "48hr_reminder" ? "48 hours"
        : notificationType === "24hr_reminder" ? "24 hours"
        : "1 hour";

      const sessionLabel = payload.sessionType ? fmtSessionType(payload.sessionType) : "session";
      const isClientActions = payload.actions?.includes("cancel") && !payload.actions?.includes("request_reschedule");
      const isExpert = payload.actions?.includes("request_reschedule");

      subject = `Reminder: Your ${sessionLabel} session starts in ${label}`;

      const actionNote = isExpert
        ? `<p style="margin:16px 0 0;font-size:14px;line-height:22px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;">
             To cancel or request a reschedule, visit your
             <a href="${SITE_URL}/expert/dashboard" style="color:#6395EE;text-decoration:none;">Expert Dashboard</a>.
             Per our policy, expert cancellation results in a full refund to the client.
           </p>`
        : isClientActions
        ? `<p style="margin:16px 0 0;font-size:14px;line-height:22px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;">
             To cancel or reschedule, visit your
             <a href="${SITE_URL}/client/dashboard" style="color:#6395EE;text-decoration:none;">Client Dashboard</a>.
             Please review our <a href="${SITE_URL}/cancellation-policy" style="color:#6395EE;text-decoration:none;">Cancellation and Refund Policy</a> before cancelling.
           </p>`
        : "";

      bodyHtml = `
        <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
          ${escHtml(payload.body)}
        </p>
        ${payload.sessionStart && payload.sessionType
          ? sessionDetailBlock({
              sessionType: payload.sessionType,
              sessionStart: payload.sessionStart,
              meetLink: payload.meetLink,
              otherPartyLabel: isExpert ? "Client" : "Expert",
              otherPartyName: payload.otherPartyName ?? "",
            })
          : ""}
        ${actionNote}`;

      ctaUrl = payload.meetLink ?? (isExpert ? `${SITE_URL}/expert/dashboard` : `${SITE_URL}/client/dashboard`);
      ctaText = payload.meetLink ? "Join Session" : "View Dashboard";
      break;
    }

    // ── New booking / client rescheduled → expert ────────────────────────────
    case "client_rescheduled": {
      const isNewBooking = payload.title.toLowerCase().includes("new booking");
      subject = isNewBooking
        ? `New booking confirmed — ${payload.otherPartyName ?? "a client"} booked with you`
        : `${payload.otherPartyName ?? "Your client"} rescheduled their session`;

      bodyHtml = `
        <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
          ${escHtml(payload.body)}
        </p>
        ${payload.sessionStart && payload.sessionType
          ? sessionDetailBlock({
              sessionType: payload.sessionType,
              sessionStart: payload.sessionStart,
              meetLink: payload.meetLink,
              otherPartyLabel: "Client",
              otherPartyName: payload.otherPartyName ?? "",
            })
          : ""}`;

      ctaUrl = `${SITE_URL}/expert/dashboard`;
      ctaText = "View Dashboard";
      break;
    }

    // ── Client cancelled → expert ────────────────────────────────────────────
    case "client_cancelled": {
      const sessionLabel = payload.sessionType ? fmtSessionType(payload.sessionType) : "session";
      subject = `${payload.otherPartyName ?? "Your client"} cancelled their ${sessionLabel} session`;

      const refundNote = payload.refundPercent != null && payload.refundPercent > 0
        ? `<p style="margin:12px 0 0;font-size:14px;line-height:22px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;">
             Client refund: <strong>${payload.refundPercent}%</strong>
             ${payload.refundAmount ? ` (KES ${payload.refundAmount.toLocaleString()})` : ""}
           </p>`
        : "";

      bodyHtml = `
        <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
          ${escHtml(payload.body)}
        </p>
        ${refundNote}`;

      ctaUrl = `${SITE_URL}/expert/dashboard`;
      ctaText = "View Dashboard";
      break;
    }

    // ── Expert cancelled → client (full refund) ───────────────────────────────
    case "expert_cancelled": {
      subject = `Your session was cancelled — full refund issued`;

      const refundHighlight = payload.refundAmount
        ? `
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px 20px;margin:20px 0;">
            <tr>
              <td style="font-size:14px;color:#166534;font-family:'Helvetica Neue',Arial,sans-serif;">
                ✓ &nbsp;You will receive a full refund of <strong>KES ${payload.refundAmount.toLocaleString()}</strong>.
                Refunds are processed within 72 business hours.
              </td>
            </tr>
          </table>`
        : `<p style="margin:12px 0 0;font-size:14px;line-height:22px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;">
             A full refund will be issued. Refunds are processed within 72 business hours.
           </p>`;

      bodyHtml = `
        <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
          ${escHtml(payload.body)}
        </p>
        ${refundHighlight}
        <p style="margin:12px 0 0;font-size:14px;line-height:22px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;">
          You can book another session with a different expert from your
          <a href="${SITE_URL}/browse" style="color:#6395EE;text-decoration:none;">Browse Experts</a> page.
        </p>`;

      ctaUrl = `${SITE_URL}/client/dashboard`;
      ctaText = "View My Bookings";
      break;
    }

    // ── Expert requested reschedule → client ──────────────────────────────────
    case "expert_reschedule_requested": {
      const sessionLabel = payload.sessionType ? fmtSessionType(payload.sessionType) : "session";
      subject = `${payload.otherPartyName ?? "Your expert"} requested to reschedule your ${sessionLabel} session`;

      const rescheduleBase = payload.bookingId
        ? `${SITE_URL}/reschedule/${payload.bookingId}`
        : `${SITE_URL}/dashboard`;
      const keepUrl   = `${rescheduleBase}?action=keep`;
      const cancelUrl = `${rescheduleBase}?action=cancel`;

      bodyHtml = `
        <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
          ${escHtml(payload.body)}
        </p>
        ${payload.sessionStart && payload.sessionType
          ? sessionDetailBlock({
              sessionType: payload.sessionType,
              sessionStart: payload.sessionStart,
              meetLink: null,
              otherPartyLabel: "Expert",
              otherPartyName: payload.otherPartyName ?? "",
            })
          : ""}
        <p style="margin:20px 0 12px;font-size:14px;font-weight:600;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
          What would you like to do?
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
          <tr><td style="padding-bottom:10px;">
            <a href="${escHtml(rescheduleBase)}"
               style="display:inline-block;background:#6395EE;color:#FFFFFF;text-decoration:none;
                      padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;
                      font-family:'Helvetica Neue',Arial,sans-serif;">
              Pick a New Time
            </a>
          </td></tr>
          <tr><td style="padding-bottom:10px;">
            <a href="${escHtml(keepUrl)}"
               style="display:inline-block;background:#F9FAFB;border:1.5px solid #D1D5DB;color:#374151;
                      text-decoration:none;padding:11px 28px;border-radius:8px;font-size:15px;font-weight:600;
                      font-family:'Helvetica Neue',Arial,sans-serif;">
              Keep Original Time
            </a>
          </td></tr>
          <tr><td style="padding-bottom:10px;">
            <a href="${escHtml(cancelUrl)}"
               style="display:inline-block;background:#FEF2F2;border:1.5px solid #FECACA;color:#DC2626;
                      text-decoration:none;padding:11px 28px;border-radius:8px;font-size:15px;font-weight:600;
                      font-family:'Helvetica Neue',Arial,sans-serif;">
              Cancel This Booking
            </a>
          </td></tr>
        </table>
        <p style="margin:8px 0 0;font-size:12px;line-height:18px;color:#9CA3AF;font-family:'Helvetica Neue',Arial,sans-serif;">
          Keeping the original time notifies the expert that you expect the session to proceed as scheduled.
          If the expert cannot attend, they must formally cancel — which triggers a full refund to you.
        </p>`;

      ctaUrl  = undefined;
      ctaText = undefined;
      break;
    }

    // ── Client declined reschedule → expert ───────────────────────────────────
    case "expert_reschedule_declined": {
      const sessionLabel = payload.sessionType ? fmtSessionType(payload.sessionType) : "session";
      subject = `${payload.otherPartyName ?? "Your client"} chose to keep the original ${sessionLabel} time`;

      bodyHtml = `
        <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
          ${escHtml(payload.body)}
        </p>
        ${payload.sessionStart && payload.sessionType
          ? sessionDetailBlock({
              sessionType: payload.sessionType,
              sessionStart: payload.sessionStart,
              meetLink: null,
              otherPartyLabel: "Client",
              otherPartyName: payload.otherPartyName ?? "",
            })
          : ""}
        <p style="margin:16px 0 0;font-size:14px;line-height:22px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;">
          Please plan to attend at the original scheduled time. If you are unable to attend,
          you must cancel the session from your Expert Dashboard.
          Per our policy, an expert cancellation results in a full refund to the client.
        </p>`;

      ctaUrl  = `${SITE_URL}/expert/dashboard`;
      ctaText = "View Expert Dashboard";
      break;
    }

    // ── No-show → client ─────────────────────────────────────────────────────
    case "client_no_show": {
      subject = `Session marked as no-show — refund details`;

      const refundHighlight = payload.refundAmount != null
        ? `
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:16px 20px;margin:20px 0;">
            <tr>
              <td style="font-size:14px;color:#92400E;font-family:'Helvetica Neue',Arial,sans-serif;">
                Your refund: <strong>KES ${payload.refundAmount.toLocaleString()}
                ${payload.refundPercent != null ? ` (${payload.refundPercent}%)` : ""}</strong>.
                This will be processed within 72 business hours.
              </td>
            </tr>
          </table>`
        : "";

      bodyHtml = `
        <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
          ${escHtml(payload.body)}
        </p>
        ${refundHighlight}`;

      ctaUrl = `${SITE_URL}/client/dashboard`;
      ctaText = "View Dashboard";
      break;
    }

    default: {
      // Generic fallback — shouldn't normally be reached
      subject = payload.title;
      bodyHtml = `<p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">${escHtml(payload.body)}</p>`;
      ctaUrl = `${SITE_URL}/client/dashboard`;
      ctaText = "View Dashboard";
    }
  }

  const html = buildHtml({
    previewText: subject,
    recipientFirstName: first,
    bodyHtml,
    ctaUrl,
    ctaText,
  });

  await sendWithRetry({ to: recipientEmail, subject, html }, notificationLogId);
}

// ── 3. Availability reminder (weekly, Fri/Sat/Sun) ────────────────────────────

export async function sendAvailabilityReminderEmail(opts: {
  to: string;
  expertName: string;
  weekStart: string;
}): Promise<void> {
  const { to, expertName, weekStart } = opts;
  const first = firstName(expertName);

  const formattedWeek = new Date(weekStart).toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });

  const subject = "Reminder: Submit your availability for next week";

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
      You haven't submitted your availability for the week starting
      <strong>${formattedWeek}</strong>. Clients can only book sessions during
      your available slots, so submitting early ensures you don't miss bookings.
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;">
      Log in to your Expert Dashboard and head to the <strong>Availability</strong> tab to set your
      open time slots for the week. Once submitted, reminders will stop for this week.
    </p>`;

  const html = buildHtml({
    previewText: subject,
    recipientFirstName: first,
    bodyHtml,
    ctaUrl: `${SITE_URL}/expert/dashboard`,
    ctaText: "Submit My Availability",
  });

  await sendWithRetry({ to, subject, html });
}


// ── 4. Expert application approved ───────────────────────────────────────────

export async function sendExpertApprovedEmail(opts: {
  to: string;
  expertName: string;
  inviteToken: string;
  expertEmail: string;
}): Promise<void> {
  const { to, expertName, inviteToken, expertEmail } = opts;
  const first = firstName(expertName);

  const setupLink = `${SITE_URL}/register?role=expert&email=${encodeURIComponent(expertEmail)}&token=${inviteToken}`;

  const subject = "Congratulations! Your ScaleWise application has been approved";

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
      We're excited to let you know that your application to join ScaleWise as a verified expert
      has been <strong style="color:#166534;">approved</strong>!
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
      Click the button below to set up your account, complete your expert profile, and start
      receiving bookings from clients.
    </p>
    <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#9CA3AF;font-family:'Helvetica Neue',Arial,sans-serif;">
      This invitation link expires in 7 days.
    </p>`;

  const html = buildHtml({
    previewText: "Your ScaleWise expert application has been approved!",
    recipientFirstName: first,
    bodyHtml,
    ctaUrl: setupLink,
    ctaText: "Set Up My Account",
  });

  await sendWithRetry({ to, subject, html });
}


// ── 5. Expert application rejected ───────────────────────────────────────────

export async function sendExpertRejectedEmail(opts: {
  to: string;
  expertName: string;
}): Promise<void> {
  const { to, expertName } = opts;
  const first = firstName(expertName);

  const subject = "Update on your ScaleWise application";

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
      Thank you for your interest in joining ScaleWise as an expert. After carefully reviewing
      your application, we're unable to move forward at this time.
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
      This decision may reflect our current platform needs rather than the quality of your
      experience or expertise. We encourage you to apply again in the future as our needs evolve.
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;">
      If you have questions about your application, you're welcome to reach out to us directly.
    </p>`;

  const html = buildHtml({
    previewText: "An update on your ScaleWise expert application",
    recipientFirstName: first,
    bodyHtml,
  });

  await sendWithRetry({ to, subject, html });
}


// ── 6. Expert payout processed ────────────────────────────────────────────────

export async function sendExpertPayoutEmail(opts: {
  to: string;
  expertName: string;
  totalAmount: number;
  sessionCount: number;
}): Promise<void> {
  const { to, expertName, totalAmount, sessionCount } = opts;
  const first = firstName(expertName);

  const subject = "Your ScaleWise payout has been processed";

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
      Great news! Your payout has been processed.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
      <tr>
        <td style="padding:4px 0;font-size:14px;color:#166534;font-family:'Helvetica Neue',Arial,sans-serif;width:140px;">Amount paid</td>
        <td style="padding:4px 0;font-size:15px;font-weight:600;color:#166534;font-family:'Helvetica Neue',Arial,sans-serif;">KES ${totalAmount.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:14px;color:#166534;font-family:'Helvetica Neue',Arial,sans-serif;">Sessions covered</td>
        <td style="padding:4px 0;font-size:14px;color:#166534;font-family:'Helvetica Neue',Arial,sans-serif;">${sessionCount} session${sessionCount === 1 ? "" : "s"}</td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;">
      Please allow 1–3 business days for the funds to reflect in your account. Your full payout
      history is available in your Expert Dashboard.
    </p>`;

  const html = buildHtml({
    previewText: `Your ScaleWise payout of KES ${totalAmount.toLocaleString()} has been processed`,
    recipientFirstName: first,
    bodyHtml,
    ctaUrl: `${SITE_URL}/expert/dashboard`,
    ctaText: "View Dashboard",
  });

  await sendWithRetry({ to, subject, html });
}


// ── 7. Refund processed (client only — never show expert/platform share) ──────

export async function sendRefundProcessedEmail(opts: {
  to: string;
  clientName: string;
  refundAmount: number;
  sessionType: string;
  expertName: string;
  pdfBuffer?: Buffer;
  receiptNumber?: string;
}): Promise<void> {
  const { to, clientName, refundAmount, sessionType, expertName } = opts;
  const first = firstName(clientName);

  const subject = "Your ScaleWise refund has been processed";

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
      Your refund for the cancelled ${escHtml(fmtSessionType(sessionType))} session with
      <strong>${escHtml(expertName)}</strong> has been processed.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
      <tr>
        <td style="font-size:14px;color:#166534;font-family:'Helvetica Neue',Arial,sans-serif;">
          ✓ &nbsp;Refund amount: <strong>KES ${refundAmount.toLocaleString()}</strong>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;">
      Please allow 3–5 business days for the funds to reflect in your M-Pesa or bank account.
      If you have not received your refund after that time, please contact us.
    </p>`;

  const html = buildHtml({
    previewText: `Your refund of KES ${refundAmount.toLocaleString()} has been processed`,
    recipientFirstName: first,
    bodyHtml,
    ctaUrl: `${SITE_URL}/client/dashboard`,
    ctaText: "View My Bookings",
  });

  await sendWithRetry(
    {
      to,
      subject,
      html,
      attachments: opts.pdfBuffer
        ? [{ filename: `${opts.receiptNumber ?? "refund-receipt"}.pdf`, content: opts.pdfBuffer }]
        : undefined,
    },
  );
}

// ── 9. Client booking confirmation + receipt PDF ──────────────────────────────

export async function sendClientBookingConfirmationEmail(opts: {
  to: string;
  clientName: string;
  expertName: string;
  sessionType: string;
  scheduledTime: string;
  durationMinutes: number;
  meetLink?: string | null;
  amount: number;
  receiptNumber: string;
  pdfBuffer: Buffer;
}): Promise<void> {
  const { to, clientName, expertName, sessionType, scheduledTime, durationMinutes, meetLink, amount, receiptNumber, pdfBuffer } = opts;
  const first = firstName(clientName);

  const subject = `Booking confirmed — ${fmtSessionType(sessionType)} with ${expertName}`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;
              font-family:'Helvetica Neue',Arial,sans-serif;">
      Your booking with <strong>${escHtml(expertName)}</strong> is confirmed and your payment has been
      received. Here are your session details:
    </p>
    ${sessionDetailBlock({
      sessionType,
      sessionStart: scheduledTime,
      meetLink,
      otherPartyLabel: "Expert",
      otherPartyName: expertName,
    })}
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;
                  padding:16px 20px;margin:20px 0;">
      <tr>
        <td style="font-size:14px;color:#166534;font-family:'Helvetica Neue',Arial,sans-serif;">
          ✓ &nbsp;Amount paid: <strong>KES ${amount.toLocaleString()}</strong>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#6B7280;
              font-family:'Helvetica Neue',Arial,sans-serif;">
      Your receipt (<strong>${escHtml(receiptNumber)}</strong>) is attached to this email as a PDF.
      You can also view and download it from your Client Dashboard.
    </p>`;

  const html = buildHtml({
    previewText: `Your ${fmtSessionType(sessionType)} session with ${expertName} is confirmed!`,
    recipientFirstName: first,
    bodyHtml,
    ctaUrl: `${SITE_URL}/client/dashboard`,
    ctaText: "View My Booking",
  });

  await sendWithRetry({
    to,
    subject,
    html,
    attachments: [{ filename: `${receiptNumber}.pdf`, content: pdfBuffer }],
  });
}

// ── 10. New message notification ──────────────────────────────────────────────

export async function sendMessageNotificationEmail(opts: {
  to: string;
  recipientName: string;
  senderName: string;
  senderRole: "client" | "expert" | "admin";
  messagePreview: string;
  dashboardUrl: string;
}): Promise<void> {
  const { to, recipientName, senderName, senderRole, messagePreview, dashboardUrl } = opts;
  const first = firstName(recipientName);

  const senderLabel = senderRole === "admin" ? "the ScaleWise Team" : senderName;
  const subject = `New message from ${senderRole === "admin" ? "ScaleWise" : senderName}`;

  const previewBlock = messagePreview.trim()
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:#F8FAFF;border-left:4px solid #6395EE;border-radius:4px;
                    padding:14px 18px;margin:16px 0;">
         <tr>
           <td style="font-size:14px;line-height:22px;color:#374151;
                      font-family:'Helvetica Neue',Arial,sans-serif;font-style:italic;">
             "${escHtml(messagePreview.slice(0, 220))}${messagePreview.length > 220 ? "…" : ""}"
           </td>
         </tr>
       </table>`
    : "";

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;
              font-family:'Helvetica Neue',Arial,sans-serif;">
      You have a new message from <strong>${escHtml(senderLabel)}</strong> on ScaleWise.
    </p>
    ${previewBlock}
    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#6B7280;
              font-family:'Helvetica Neue',Arial,sans-serif;">
      Log in to read the full message and reply.
    </p>`;

  const html = buildHtml({
    previewText: `New message from ${senderRole === "admin" ? "ScaleWise" : senderName} — log in to reply`,
    recipientFirstName: first,
    bodyHtml,
    ctaUrl: dashboardUrl,
    ctaText: "Read & Reply",
  });

  await sendWithRetry({ to, subject, html });
}


// ── 11. Expert payout receipt (with full breakdown PDF) ───────────────────────

export async function sendExpertPayoutReceiptEmail(opts: {
  to: string;
  expertName: string;
  totalAmount: number;
  receiptNumber: string;
  pdfBuffer: Buffer;
  sessionCount: number;
}): Promise<void> {
  const { to, expertName, totalAmount, receiptNumber, pdfBuffer, sessionCount } = opts;
  const first = firstName(expertName);

  const subject = "Your ScaleWise payout receipt is ready";

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;
              font-family:'Helvetica Neue',Arial,sans-serif;">
      Great news! Your payout has been processed and your official receipt is attached.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px 20px;margin:0 0 20px;">
      <tr>
        <td style="padding:4px 0;font-size:14px;color:#166534;font-family:'Helvetica Neue',Arial,sans-serif;width:160px;">Receipt number</td>
        <td style="padding:4px 0;font-size:14px;color:#166534;font-family:'Helvetica Neue',Arial,sans-serif;">${receiptNumber}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:14px;color:#166534;font-family:'Helvetica Neue',Arial,sans-serif;">Amount paid</td>
        <td style="padding:4px 0;font-size:15px;font-weight:600;color:#166534;font-family:'Helvetica Neue',Arial,sans-serif;">KES ${totalAmount.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:14px;color:#166534;font-family:'Helvetica Neue',Arial,sans-serif;">Sessions covered</td>
        <td style="padding:4px 0;font-size:14px;color:#166534;font-family:'Helvetica Neue',Arial,sans-serif;">${sessionCount} session${sessionCount === 1 ? "" : "s"}</td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#6B7280;
              font-family:'Helvetica Neue',Arial,sans-serif;">
      Your full payout statement is attached as a PDF. Please allow 1–3 business days for
      the funds to reflect in your account.
    </p>`;

  const html = buildHtml({
    previewText: `Your ScaleWise payout of KES ${totalAmount.toLocaleString()} — receipt attached`,
    recipientFirstName: first,
    bodyHtml,
    ctaUrl: `${SITE_URL}/expert/dashboard`,
    ctaText: "View Dashboard",
  });

  await sendWithRetry({
    to,
    subject,
    html,
    attachments: [{ filename: `${receiptNumber}.pdf`, content: pdfBuffer }],
  });
}

// ── 12. Launch subscription confirmation ──────────────────────────────────────

export async function sendLaunchSubscriptionEmail(opts: {
  to: string;
}): Promise<void> {
  const { to } = opts;

  const subject = "You're on the ScaleWise launch list!";

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
      Thank you for your interest in ScaleWise! You've been added to our launch notification list.
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
      We're building a premium marketplace that connects business owners with verified industry
      experts for paid consultancy and coaching sessions. We'll send you an email the moment
      we go live.
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;">
      In the meantime, you can learn more about what we're building at
      <a href="${SITE_URL}" style="color:#6395EE;text-decoration:none;">scalewise.co.ke</a>.
    </p>`;

  const html = buildHtml({
    previewText: "You're on the ScaleWise launch list — we'll notify you when we go live!",
    recipientFirstName: "there",
    bodyHtml,
    ctaUrl: SITE_URL,
    ctaText: "Learn More",
  });

  await sendWithRetry({ to, subject, html });
}

// ── Admin: new expert application received ────────────────────────────────────

export async function sendAdminExpertApplicationEmail(opts: {
  applicantName: string;
  applicantEmail: string;
  industry: string;
  headline?: string | null;
}): Promise<void> {
  const { applicantName, applicantEmail, industry, headline } = opts;

  const subject = `New Expert Application: ${applicantName}`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;line-height:25px;color:#374151;font-family:'Helvetica Neue',Arial,sans-serif;">
      A new expert application has been submitted and is awaiting your review.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;background:#F9FAFB;border:1px solid #E5E7EB;white-space:nowrap;">Name</td>
        <td style="padding:10px 14px;font-size:14px;color:#111827;font-family:'Helvetica Neue',Arial,sans-serif;background:#FFFFFF;border:1px solid #E5E7EB;">${escHtml(applicantName)}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;background:#F9FAFB;border:1px solid #E5E7EB;border-top:none;white-space:nowrap;">Email</td>
        <td style="padding:10px 14px;font-size:14px;color:#111827;font-family:'Helvetica Neue',Arial,sans-serif;background:#FFFFFF;border:1px solid #E5E7EB;border-top:none;">
          <a href="mailto:${escHtml(applicantEmail)}" style="color:#6395EE;text-decoration:none;">${escHtml(applicantEmail)}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;background:#F9FAFB;border:1px solid #E5E7EB;border-top:none;white-space:nowrap;">Industry</td>
        <td style="padding:10px 14px;font-size:14px;color:#111827;font-family:'Helvetica Neue',Arial,sans-serif;background:#FFFFFF;border:1px solid #E5E7EB;border-top:none;">${escHtml(industry)}</td>
      </tr>
      ${headline ? `
      <tr>
        <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;background:#F9FAFB;border:1px solid #E5E7EB;border-top:none;white-space:nowrap;">Headline</td>
        <td style="padding:10px 14px;font-size:14px;color:#111827;font-family:'Helvetica Neue',Arial,sans-serif;background:#FFFFFF;border:1px solid #E5E7EB;border-top:none;">${escHtml(headline)}</td>
      </tr>` : ""}
    </table>
    <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#6B7280;font-family:'Helvetica Neue',Arial,sans-serif;">
      Visit the Admin Dashboard to review the full application and approve or reject the applicant.
    </p>`;

  const html = buildHtml({
    previewText: `New expert application from ${applicantName} — action required`,
    recipientFirstName: "Admin",
    bodyHtml,
    ctaUrl: `${SITE_URL}/admin`,
    ctaText: "Review Application",
  });

  await sendWithRetry({ to: REPLY_TO, subject, html });
}
