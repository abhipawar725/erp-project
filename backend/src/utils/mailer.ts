import nodemailer, { Transporter, SentMessageInfo } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;          // plain-text fallback
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    path?: string;        // file path on disk
    content?: Buffer;     // or raw buffer
    contentType?: string;
  }>;
}



// ─────────────────────────────────────────────────────────────────────────────
// Transporter singleton
// ─────────────────────────────────────────────────────────────────────────────

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,   // true for port 465, STARTTLS for 587
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
    // Keep connection alive for batched sends
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Timeout settings
    connectionTimeout: 10_000,
    greetingTimeout: 5_000,
    socketTimeout: 30_000,
  });

  return _transporter;
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyConnection — call once on startup to confirm SMTP is reachable
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Verifies that the SMTP credentials and server are reachable.
 * Logs a warning on failure but never throws (email is non-critical).
 *
 * Usage in server.ts:
 *   await verifyMailer();
 */
export async function verifyMailer(): Promise<void> {
  if (!env.smtp.user || !env.smtp.pass) {
    logger.warn('[Mailer] SMTP credentials not configured — emails will be skipped');
    return;
  }
  try {
    await getTransporter().verify();
    logger.info(`[Mailer] SMTP connection verified (${env.smtp.host}:${env.smtp.port})`);
  } catch (err: any) {
    logger.warn(`[Mailer] SMTP verification failed: ${err.message} — emails will be skipped`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// sendMail — core send function with retry
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Sends an email. Retries once on transient failures.
 * Never throws — errors are logged and swallowed so email failure
 * never breaks a business operation.
 *
 * Returns the nodemailer info object on success, or null on failure.
 */
export async function sendMail(options: MailOptions): Promise<SentMessageInfo | null> {
  // Skip silently if SMTP is not configured (dev with no .env)
  if (!env.smtp.user || !env.smtp.pass) {
    logger.debug(`[Mailer] SMTP not configured — skipping email to ${options.to}: ${options.subject}`);
    return null;
  }

  const from = `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`;

  const attempt = async (): Promise<SentMessageInfo> =>
    getTransporter().sendMail({
      from,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text ?? htmlToText(options.html),
      attachments: options.attachments,
    });

  try {
    const info = await attempt();
    logger.info(`[Mailer] Sent "${options.subject}" → ${options.to} (msgId: ${info.messageId})`);
    return info;
  } catch (firstErr: any) {
    logger.warn(`[Mailer] First attempt failed (${firstErr.message}), retrying in 3 s…`);
    await sleep(3000);
    try {
      const info = await attempt();
      logger.info(`[Mailer] Retry succeeded "${options.subject}" → ${options.to}`);
      return info;
    } catch (finalErr: any) {
      logger.error(`[Mailer] Final failure sending to ${options.to}: ${finalErr.message}`);
      return null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Template helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Wraps a content block in the branded email shell */
function emailShell(content: string, previewText = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>UNG HRMS ERP</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:'DM Sans',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;color:#f5f6f8;">${previewText}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f6f8;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

        <!-- Logo header -->
        <tr>
          <td style="padding:0 0 20px 0;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:36px;height:36px;background:#1e56d9;border-radius:9px;text-align:center;vertical-align:middle;">
                  <span style="color:#fff;font-size:13px;font-weight:700;line-height:36px;">UNG</span>
                </td>
                <td style="padding-left:10px;vertical-align:middle;">
                  <span style="font-size:15px;font-weight:700;color:#0f1623;letter-spacing:-0.3px;">UNG HRMS ERP</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border:1px solid #e0e4ec;border-radius:12px;padding:32px 36px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 0 0 0;text-align:center;font-size:11px;color:#94a3b8;line-height:1.6;">
            © ${new Date().getFullYear()} UNG HRMS ERP · Enterprise Human Resource Management
            <br/>This email was sent by the UNG HRMS system. Please do not reply to this email.
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Button component */
function btn(href: string, label: string, color = '#1e56d9'): string {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:600;margin:20px 0;">${label}</a>`;
}

/** Divider */
const divider = `<hr style="border:none;border-top:1px solid #e0e4ec;margin:20px 0;" />`;

/** KV row for data tables */
function kvRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:7px 0;font-size:12px;color:#64748b;font-weight:500;width:45%;">${label}</td>
    <td style="padding:7px 0;font-size:12px;color:#0f1623;font-weight:600;">${value}</td>
  </tr>`;
}

/** Info box (amber/blue/green/red) */
function infoBox(text: string, color: 'blue' | 'amber' | 'green' | 'red' = 'blue'): string {
  const map = {
    blue: { bg: '#eef3fd', border: '#c7d9fb', text: '#1e56d9' },
    amber: { bg: '#fff8ed', border: '#fcd59f', text: '#c96f00' },
    green: { bg: '#ecfdf5', border: '#99f0d2', text: '#0d9669' },
    red: { bg: '#fef2f2', border: '#fcc5c5', text: '#cc2a2a' },
  };
  const c = map[color];
  return `<div style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:12px 14px;font-size:12px;color:${c.text};margin:16px 0;">${text}</div>`;
}

/** Strip HTML tags for plain-text fallback */
function htmlToText(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const frontendUrl = env.cors.frontendUrl;

// ─────────────────────────────────────────────────────────────────────────────
// mailer — all HRMS email templates
// ─────────────────────────────────────────────────────────────────────────────

export const mailer = {

  // ─── Auth ────────────────────────────────────────────────────────────────

  /**
   * Sent when a user requests a password reset.
   * The raw token is included in the link (never in plain text).
   */
  sendPasswordReset: (to: string, rawToken: string) =>
    sendMail({
      to,
      subject: 'Reset your UNG HRMS password',
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1623;letter-spacing:-0.3px;">Reset your password</h2>
        <p style="margin:0 0 20px;font-size:13px;color:#64748b;line-height:1.6;">
          We received a request to reset the password for your UNG HRMS account.
          Click the button below — this link expires in <strong>1 hour</strong>.
        </p>
        ${btn(`${frontendUrl}/reset-password?token=${rawToken}`, 'Reset Password')}
        ${divider}
        <p style="font-size:11px;color:#94a3b8;line-height:1.6;">
          If you didn't request a password reset, you can safely ignore this email.
          Your password will not change.
        </p>
      `, 'Reset your UNG HRMS account password'),
    }),

  /**
   * Sent after successful password reset.
   */
  sendPasswordChanged: (to: string, name: string) =>
    sendMail({
      to,
      subject: 'Your UNG HRMS password was changed',
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1623;">Password changed</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 16px;line-height:1.6;">
          Hi ${name},<br/>Your UNG HRMS account password was successfully changed.
        </p>
        ${infoBox('If you did not make this change, please contact your HR administrator immediately and reset your password.', 'amber')}
        ${btn(`${frontendUrl}/login`, 'Sign in to UNG HRMS')}
      `, 'Your password was changed'),
    }),

  // ─── Onboarding ──────────────────────────────────────────────────────────

  /**
   * Welcome email sent when an employee's account is created by HR.
   */
  sendWelcome: (to: string, name: string, tempPassword: string) =>
    sendMail({
      to,
      subject: `Welcome to UNG HRMS ERP, ${name.split(' ')[0]}!`,
      html: emailShell(`
        <h2 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#0f1623;">Welcome, ${name}! 👋</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 24px;line-height:1.6;">
          Your UNG HRMS ERP account has been set up. Use the credentials below to log in.
        </p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f6f8;border-radius:8px;padding:16px;margin-bottom:20px;">
          <tbody>
            ${kvRow('Email address', to)}
            ${kvRow('Temporary password', `<code style="font-family:monospace;background:#e0e4ec;padding:2px 6px;border-radius:4px;">${tempPassword}</code>`)}
          </tbody>
        </table>
        ${infoBox('Please log in and change your temporary password immediately.', 'amber')}
        ${btn(`${frontendUrl}/login`, 'Log in to UNG HRMS')}
        ${divider}
        <p style="font-size:11px;color:#94a3b8;">
          If you have any trouble signing in, contact your HR team.
        </p>
      `, `Your UNG HRMS ERP account is ready`),
    }),

  /**
   * Sent when a new employee completes their onboarding checklist.
   */
  sendOnboardingComplete: (to: string, hrEmail: string, employeeName: string, joinDate: string) =>
    sendMail({
      to: hrEmail,
      cc: to,
      subject: `Onboarding complete — ${employeeName}`,
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0d9669;">Onboarding complete ✓</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">
          <strong>${employeeName}</strong> has completed all onboarding tasks for their joining date of ${joinDate}.
        </p>
        ${btn(`${frontendUrl}/onboarding`, 'View Onboarding Dashboard')}
      `, `${employeeName} completed onboarding`),
    }),

  // ─── Leave Management ────────────────────────────────────────────────────

  /**
   * Notification to manager when an employee applies for leave.
   */
  sendLeaveApplied: (
    to: string,
    employeeName: string,
    leaveType: string,
    fromDate: string,
    toDate: string,
    days: number,
    reason?: string,
  ) =>
    sendMail({
      to,
      subject: `Leave request from ${employeeName}`,
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1623;">Leave Request</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">
          <strong>${employeeName}</strong> has applied for leave and is awaiting your approval.
        </p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f6f8;border-radius:8px;padding:16px;margin-bottom:20px;">
          <tbody>
            ${kvRow('Leave type', leaveType)}
            ${kvRow('From', fromDate)}
            ${kvRow('To', toDate)}
            ${kvRow('Total days', `${days} day${days !== 1 ? 's' : ''}`)}
            ${reason ? kvRow('Reason', reason) : ''}
          </tbody>
        </table>
        ${btn(`${frontendUrl}/leaves?status=Pending`, 'Review Request', '#c96f00')}
      `, `${employeeName} applied for ${days}-day leave`),
    }),

  /**
   * Sent to the employee after their leave is approved or rejected.
   */
  sendLeaveDecision: (
    to: string,
    employeeName: string,
    leaveType: string,
    fromDate: string,
    toDate: string,
    days: number,
    status: 'Approved' | 'Rejected',
    rejectionReason?: string,
  ) => {
    const isApproved = status === 'Approved';
    return sendMail({
      to,
      subject: `Your leave request has been ${status.toLowerCase()}`,
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${isApproved ? '#0d9669' : '#cc2a2a'};">
          Leave ${status} ${isApproved ? '✓' : '✗'}
        </h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">
          Dear ${employeeName},<br/>
          Your leave request has been <strong>${status.toLowerCase()}</strong>.
        </p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f6f8;border-radius:8px;padding:16px;margin-bottom:20px;">
          <tbody>
            ${kvRow('Leave type', leaveType)}
            ${kvRow('Period', `${fromDate} – ${toDate}`)}
            ${kvRow('Total days', `${days} day${days !== 1 ? 's' : ''}`)}
            ${kvRow('Status', status)}
          </tbody>
        </table>
        ${!isApproved && rejectionReason ? infoBox(`Reason: ${rejectionReason}`, 'red') : ''}
        ${isApproved
          ? infoBox('Your leave has been approved. Ensure a proper handoff with your team.', 'green')
          : ''}
        ${btn(`${frontendUrl}/leaves`, 'View My Leaves')}
      `, `Your leave request was ${status.toLowerCase()}`),
    });
  },

  // ─── Payroll ─────────────────────────────────────────────────────────────

  /**
   * Payslip notification sent to employee when payroll is disbursed.
   */
  sendPayslipReady: (
    to: string,
    employeeName: string,
    month: string,
    year: number,
    netPay: string,
    payslipUrl?: string,
  ) =>
    sendMail({
      to,
      subject: `Your ${month} ${year} payslip is ready`,
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1623;">Payslip Ready</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">
          Dear ${employeeName},<br/>
          Your salary for <strong>${month} ${year}</strong> has been processed and disbursed.
        </p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f6f8;border-radius:8px;padding:16px;margin-bottom:20px;">
          <tbody>
            ${kvRow('Pay period', `${month} ${year}`)}
            ${kvRow('Net pay', `<strong style="color:#0d9669;font-size:15px;">${netPay}</strong>`)}
            ${kvRow('Status', '<span style="color:#0d9669;font-weight:600;">Disbursed</span>')}
          </tbody>
        </table>
        ${btn(payslipUrl ?? `${frontendUrl}/payroll/payslips`, 'Download Payslip')}
        ${divider}
        <p style="font-size:11px;color:#94a3b8;">
          For queries about your payslip, contact the Finance / HR team.
        </p>
      `, `Your ${month} ${year} salary has been disbursed`),
    }),

  /**
   * Sent to HR/Admin when payroll is submitted for approval.
   */
  sendPayrollApprovalRequest: (
    to: string | string[],
    month: string,
    year: number,
    totalGross: string,
    totalNet: string,
    employeeCount: number,
    submittedBy: string,
  ) =>
    sendMail({
      to,
      subject: `Payroll approval required — ${month} ${year}`,
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1623;">Payroll Approval Required</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">
          The ${month} ${year} payroll run has been submitted by <strong>${submittedBy}</strong> and is awaiting your approval.
        </p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f6f8;border-radius:8px;padding:16px;margin-bottom:20px;">
          <tbody>
            ${kvRow('Pay period', `${month} ${year}`)}
            ${kvRow('Employees', `${employeeCount}`)}
            ${kvRow('Total gross', totalGross)}
            ${kvRow('Total net pay', totalNet)}
            ${kvRow('Submitted by', submittedBy)}
          </tbody>
        </table>
        ${btn(`${frontendUrl}/payroll/runs`, 'Review & Approve', '#c96f00')}
      `, `${month} ${year} payroll needs approval`),
    }),

  // ─── Recruitment ─────────────────────────────────────────────────────────

  /**
   * Sent to a candidate when an interview is scheduled.
   */
  sendInterviewScheduled: (
    to: string,
    candidateName: string,
    jobTitle: string,
    round: number,
    interviewType: string,
    scheduledAt: string,
    durationMins: number,
    interviewerName: string,
    meetLink?: string,
  ) =>
    sendMail({
      to,
      subject: `Interview scheduled — ${jobTitle} (Round ${round})`,
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1623;">Interview Scheduled</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">
          Dear ${candidateName},<br/>
          We are pleased to invite you for an interview for the <strong>${jobTitle}</strong> position.
        </p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f6f8;border-radius:8px;padding:16px;margin-bottom:20px;">
          <tbody>
            ${kvRow('Round', `Round ${round} — ${interviewType}`)}
            ${kvRow('Date & time', scheduledAt)}
            ${kvRow('Duration', `${durationMins} minutes`)}
            ${kvRow('Interviewer', interviewerName)}
            ${meetLink ? kvRow('Meeting link', `<a href="${meetLink}" style="color:#1e56d9;">${meetLink}</a>`) : ''}
          </tbody>
        </table>
        ${infoBox('Please be available 5 minutes before the scheduled time. Ensure a stable internet connection if this is a video interview.', 'blue')}
        ${meetLink ? btn(meetLink, 'Join Meeting', '#1e56d9') : ''}
      `, `Your interview for ${jobTitle} is scheduled`),
    }),

  /**
   * Offer letter notification to candidate.
   */
  sendOfferLetter: (
    to: string,
    candidateName: string,
    jobTitle: string,
    offeredCtc: string,
    joiningDate: string,
    offerLetterUrl: string,
    validTill: string,
  ) =>
    sendMail({
      to,
      subject: `Offer of Employment — ${jobTitle}`,
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0d9669;">Congratulations! 🎉</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">
          Dear ${candidateName},<br/>
          We are delighted to extend an offer of employment for the position of <strong>${jobTitle}</strong>.
        </p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f6f8;border-radius:8px;padding:16px;margin-bottom:20px;">
          <tbody>
            ${kvRow('Position', jobTitle)}
            ${kvRow('Offered CTC', `<strong style="color:#0d9669;">${offeredCtc}</strong>`)}
            ${kvRow('Joining date', joiningDate)}
            ${kvRow('Offer valid till', validTill)}
          </tbody>
        </table>
        ${infoBox(`Please review and accept this offer before ${validTill}.`, 'amber')}
        ${btn(offerLetterUrl, 'View Offer Letter')}
      `, `Offer of employment for ${jobTitle}`),
    }),

  // ─── HR Operations ────────────────────────────────────────────────────────

  /**
   * Sent when an employee's profile is confirmed (probation ended).
   */
  sendConfirmation: (
    to: string,
    employeeName: string,
    designation: string,
    confirmationDate: string,
  ) =>
    sendMail({
      to,
      subject: 'Employment Confirmation',
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0d9669;">Employment Confirmed ✓</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">
          Dear ${employeeName},<br/>
          We are pleased to confirm your employment as <strong>${designation}</strong>, effective ${confirmationDate}.
        </p>
        ${infoBox('Your probation period has been successfully completed. Congratulations!', 'green')}
        ${btn(`${frontendUrl}/dashboard`, 'View My Profile')}
      `, `Your employment has been confirmed`),
    }),

  /**
   * Birthday greeting (sent by automated job).
   */
  sendBirthdayGreeting: (to: string, employeeName: string) =>
    sendMail({
      to,
      subject: `Happy Birthday, ${employeeName.split(' ')[0]}! 🎂`,
      html: emailShell(`
        <div style="text-align:center;padding:16px 0;">
          <div style="font-size:48px;margin-bottom:16px;">🎂</div>
          <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f1623;">
            Happy Birthday, ${employeeName.split(' ')[0]}!
          </h2>
          <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0 0 24px;">
            The entire UNG HRMS family wishes you a wonderful birthday.<br/>
            Here's to another great year ahead!
          </p>
          <div style="font-size:28px;">🎉 🎊 🎈</div>
        </div>
      `, `Happy Birthday from UNG HRMS!`),
    }),

  /**
   * Work anniversary notification.
   */
  sendWorkAnniversary: (to: string, employeeName: string, years: number, hrEmail: string) =>
    sendMail({
      to,
      cc: hrEmail,
      subject: `${years} year${years !== 1 ? 's' : ''} at UNG HRMS — Thank you, ${employeeName.split(' ')[0]}!`,
      html: emailShell(`
        <div style="text-align:center;padding:8px 0 16px;">
          <div style="font-size:44px;margin-bottom:12px;">🏆</div>
          <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f1623;">
            ${years} Year${years !== 1 ? 's' : ''} — Thank You!
          </h2>
          <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0 0 20px;">
            Dear ${employeeName},<br/>
            Today marks <strong>${years} year${years !== 1 ? 's' : ''}</strong> since you joined us.
            Your contributions have been invaluable. Thank you for being part of the journey.
          </p>
          ${btn(`${frontendUrl}/dashboard`, 'View My Journey')}
        </div>
      `, `${years}-year work anniversary`),
    }),

  /**
   * Generic system notification — used for app alerts, reminders, etc.
   */

  sendPortalCredentials: async (
    to: string,
    candidateName: string,
    loginEmail: string,
    password: string,
    portalUrl: string,
    isNewAccess: boolean,
  ) => {
    const subject = isNewAccess
      ? 'Your Candidate Portal Access — Login Credentials'
      : 'Your Candidate Portal — Password Updated';

    const body = isNewAccess
      ? `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1623;">Candidate Portal Access 🎉</h2>
<p style="font-size:13px;color:#64748b;margin:0 0 16px;line-height:1.6;">
  Dear ${candidateName},<br/>
  You have been granted access to the HR candidate portal. Use the credentials below to log in.
</p>`
      : `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1623;">Portal Password Updated 🔑</h2>
<p style="font-size:13px;color:#64748b;margin:0 0 16px;line-height:1.6;">
  Dear ${candidateName},<br/>
  Your candidate portal password has been updated. Use the credentials below to log in.
</p>`;

    const html = emailShell(
      `${body}
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:20px;">
  <tr>
    <td style="padding:8px 0;font-size:12px;color:#64748b;width:45%;">Portal URL</td>
    <td style="padding:8px 0;font-size:12px;"><a href="${portalUrl}" style="color:#1e56d9;font-weight:600;">${portalUrl}</a></td>
  </tr>
  <tr>
    <td style="padding:8px 0;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;">Email / Username</td>
    <td style="padding:8px 0;font-size:12px;font-weight:600;border-top:1px solid #e2e8f0;">${loginEmail}</td>
  </tr>
  <tr>
    <td style="padding:8px 0;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;">Password</td>
    <td style="padding:8px 0;border-top:1px solid #e2e8f0;"><code style="background:#e0e7ff;color:#3730a3;padding:4px 10px;border-radius:6px;font-size:13px;font-weight:700;letter-spacing:1px;">${password}</code></td>
  </tr>
</table>
<a href="${portalUrl}" style="display:inline-block;background:#1e56d9;color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:600;margin-bottom:16px;">
  Log in to Portal →
</a>
<p style="font-size:11px;color:#94a3b8;line-height:1.6;margin:0;">
  For security, please change your password after first login. Keep your credentials confidential.
  If you did not expect this email, please contact HR.
</p>`,
      subject,
    );

    return sendMail({ to, subject, html });
  },



  sendSystemNotification: (
    to: string | string[],
    subject: string,
    title: string,
    body: string,
    ctaLabel?: string,
    ctaUrl?: string,
    alertType: 'blue' | 'amber' | 'green' | 'red' = 'blue',
  ) =>
    sendMail({
      to,
      subject,
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f1623;">${title}</h2>
        ${infoBox(body, alertType)}
        ${ctaLabel && ctaUrl ? btn(ctaUrl, ctaLabel) : ''}
      `, subject),
    }),
  /**
   * Magic login link for candidate portal.
   */
  sendPortalMagicLink: (to: string, candidateName: string, magicUrl: string) =>
    sendMail({
      to,
      subject: 'Your UNG HRMS Candidate Portal Login Link',
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1623;">Login to your Candidate Portal</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">
          Hi ${candidateName},<br/>
          Click the button below to securely log in to your candidate portal.
          This link is valid for <strong>15 minutes</strong> and can only be used once.
        </p>
        ${btn(magicUrl, 'Access My Portal →')}
        ${divider}
        <p style="font-size:11px;color:#94a3b8;">
          If you did not request this link, you can safely ignore this email.
        </p>
      `, 'One-click login to your candidate portal'),
    }),

  /**
   * Notify candidate of interview reschedule decision by HR.
   */
  sendRescheduleDecision: (
    to: string,
    candidateName: string,
    decision: 'Approved' | 'Rejected',
    newDate?: string,
    newTime?: string,
  ) =>
    sendMail({
      to,
      subject: `Interview reschedule ${decision.toLowerCase()} — UNG HRMS`,
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${decision === 'Approved' ? '#0d9669' : '#cc2a2a'};">
          Reschedule ${decision} ${decision === 'Approved' ? '✓' : '✗'}
        </h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">
          Dear ${candidateName},<br/>
          Your reschedule request has been <strong>${decision.toLowerCase()}</strong>.
        </p>
        ${decision === 'Approved' && newDate && newTime ? `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f6f8;border-radius:8px;padding:16px;margin-bottom:20px;">
          <tbody>
            ${kvRow('New interview date', newDate)}
            ${kvRow('New interview time', newTime)}
          </tbody>
        </table>
        ` : ''}
        ${decision === 'Rejected' ? infoBox('Your reschedule request was not approved. Please contact HR if you need assistance.', 'amber') : ''}
        ${btn('${frontendUrl}/portal/dashboard', 'View Portal')}
      `, `Interview reschedule ${decision.toLowerCase()}`),
    }),

  /**
   * Notify HR that a candidate has requested a reschedule.
   */
  sendRescheduleRequestToHR: (
    to: string | string[],
    candidateName: string,
    reason: string,
    proposedDate?: string,
    proposedTime?: string,
  ) =>
    sendMail({
      to,
      subject: `Reschedule request from ${candidateName}`,
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1623;">Interview Reschedule Request</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">
          <strong>${candidateName}</strong> has requested to reschedule their interview.
        </p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f6f8;border-radius:8px;padding:16px;margin-bottom:20px;">
          <tbody>
            ${kvRow('Candidate', candidateName)}
            ${kvRow('Reason', reason)}
            ${proposedDate ? kvRow('Proposed date', proposedDate) : ''}
            ${proposedTime ? kvRow('Proposed time', proposedTime) : ''}
          </tbody>
        </table>
        ${btn('${frontendUrl}/ats', 'Review in ATS', '#c96f00')}
      `, `${candidateName} requested a reschedule`),
    }),

  /**
   * Notify candidate that their aptitude test has been assigned.
   */
  sendAptitudeTestInvite: (
    to: string,
    candidateName: string,
    testTitle: string,
    durationMins: number,
    portalUrl: string,
  ) =>
    sendMail({
      to,
      subject: `You have been assigned an aptitude test — UNG HRMS`,
      html: emailShell(`
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f1623;">Aptitude Test Assigned 🧠</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">
          Dear ${candidateName},<br/>
          As part of your application process, you have been assigned an aptitude test.
          Please complete it at your earliest convenience.
        </p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f6f8;border-radius:8px;padding:16px;margin-bottom:20px;">
          <tbody>
            ${kvRow('Test', testTitle)}
            ${kvRow('Duration', `${durationMins} minutes`)}
            ${kvRow('Results', 'Will be shared by HR')}
          </tbody>
        </table>
        ${infoBox('Ensure a stable internet connection before starting. The timer starts immediately once you begin.', 'amber')}
        ${btn(portalUrl, 'Start Test →')}
      `, `Complete your aptitude test`),
    }),

};
