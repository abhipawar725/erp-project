import { EmailBranding, EmailTemplate, type EmailTemplateType } from '../database/models/EmailTemplate';
import { logger } from '../config/logger';

// ─── Branding cache (15-minute TTL) ──────────────────────────────────────────

const cache = new Map<number, { data: EmailBranding; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000;

export function clearBrandingCache(companyId?: number): void {
  if (companyId) cache.delete(companyId);
  else cache.clear();
}

async function getBranding(companyId: number): Promise<EmailBranding | null> {
  const cached = cache.get(companyId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const branding = await EmailBranding.findOne({ where: { company_id: companyId } });
  if (branding) cache.set(companyId, { data: branding, ts: Date.now() });
  return branding;
}

// ─── Default branding (fallback when no DB record) ────────────────────────────

function defaultBranding(companyId: number): Partial<EmailBranding> & {
  company_id: number; company_name: string; primary_color: string;
  secondary_color: string; accent_color: string; font_family: string;
  header_bg: string; card_bg: string; card_border_radius: number;
  body_bg: string; footer_text: string; footer_bg: string;
  from_name: string; from_email: string; show_social_links: boolean;
} {
  return {
    company_id:         companyId,
    company_name:       'NexHR ERP',
    logo_url:           null,
    logo_width:         120,
    primary_color:      '#1e56d9',
    secondary_color:    '#0f1623',
    accent_color:       '#f0f4ff',
    font_family:        "'DM Sans', Helvetica, Arial, sans-serif",
    header_bg:          '#ffffff',
    card_bg:            '#ffffff',
    card_border_radius: 12,
    body_bg:            '#f5f6f8',
    footer_text:        '© {year} {company_name} · Human Resource Management<br/>This email was sent by the HR system. Please do not reply.',
    footer_bg:          '#f5f6f8',
    show_social_links:  false,
    social_linkedin:    null,
    social_twitter:     null,
    from_name:          'NexHR Team',
    from_email:         'noreply@nexhr.com',
    reply_to:           null,
    letterhead_html:    null,
  };
}

// ─── Template variable substitution ──────────────────────────────────────────

export function substituteVars(
  html: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    const safe = value != null ? String(value) : '';
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), safe);
  }
  return result;
}

// ─── Core renderer ────────────────────────────────────────────────────────────

export interface RenderEmailOptions {
  companyId:    number;
  type:         EmailTemplateType;
  /** Variables to substitute into subject + body (e.g. {name}, {date}) */
  vars?:        Record<string, string | number | null | undefined>;
  /** Override the default subject (for system sends where it's fixed) */
  subjectOverride?: string;
  /** Fallback body HTML if no template is set */
  defaultBody:  string;
  /** Fallback subject if no template is set */
  defaultSubject: string;
}

export interface RenderedEmail {
  subject:   string;
  html:      string;
  from_name:  string;
  from_email: string;
  reply_to:   string | null;
}

export async function renderEmail(opts: RenderEmailOptions): Promise<RenderedEmail> {
  const [brandingRow, templateRow] = await Promise.all([
    getBranding(opts.companyId),
    EmailTemplate.findOne({ where: { company_id: opts.companyId, type: opts.type, is_active: true } }),
  ]);

  const B = brandingRow || (defaultBranding(opts.companyId) as unknown as EmailBranding);
  const year = new Date().getFullYear().toString();

  // Resolve subject
  let subject = opts.subjectOverride || templateRow?.subject || opts.defaultSubject;
  // Resolve body
  const rawBody = templateRow?.body_html || opts.defaultBody;
  // Substitute vars in subject + body
  const allVars = {
    year,
    company_name: B.company_name,
    ...opts.vars,
  };
  subject = substituteVars(subject, allVars);
  const body = substituteVars(rawBody, allVars);

  // Resolve footer text
  const footerText = substituteVars(B.footer_text || '', { year, company_name: B.company_name });

  // Social links
  let socialHtml = '';
  if (B.show_social_links && (B.social_linkedin || B.social_twitter)) {
    socialHtml = `<div style="margin-top:12px;">
      ${B.social_linkedin ? `<a href="${B.social_linkedin}" style="margin:0 6px;color:${B.primary_color};font-size:11px;text-decoration:none;">LinkedIn</a>` : ''}
      ${B.social_twitter ? `<a href="${B.social_twitter}" style="margin:0 6px;color:${B.primary_color};font-size:11px;text-decoration:none;">Twitter</a>` : ''}
    </div>`;
  }

  // Logo block
  const logoHtml = B.logo_url
    ? `<img src="${B.logo_url}" width="${B.logo_width || 120}" alt="${B.company_name}" style="display:block;border:0;" />`
    : `<table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="width:34px;height:34px;background:${B.primary_color};border-radius:8px;text-align:center;vertical-align:middle;">
          <span style="color:#fff;font-size:12px;font-weight:700;line-height:34px;">${B.company_name.slice(0,2).toUpperCase()}</span>
        </td>
        <td style="padding-left:10px;vertical-align:middle;">
          <span style="font-size:15px;font-weight:700;color:${B.secondary_color};letter-spacing:-0.3px;">${B.company_name}</span>
        </td>
      </tr></table>`;

  // Letterhead (if set - appears above card for formal letters)
  const letterheadHtml = B.letterhead_html
    ? `<tr><td style="padding:0 0 16px 0;">${B.letterhead_html}</td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:${B.body_bg};font-family:${B.font_family};-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${B.body_bg};padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

        <!-- Logo header -->
        <tr>
          <td style="padding:0 0 20px 0;background:${B.header_bg};">
            ${logoHtml}
          </td>
        </tr>

        ${letterheadHtml}

        <!-- Card -->
        <tr>
          <td style="background:${B.card_bg};border:1px solid #e0e4ec;border-radius:${B.card_border_radius}px;padding:32px 36px;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 0 0 0;text-align:center;font-size:11px;color:#94a3b8;line-height:1.6;background:${B.footer_bg};">
            ${footerText}
            ${socialHtml}
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject,
    html,
    from_name:  B.from_name,
    from_email: B.from_email,
    reply_to:   B.reply_to || null,
  };
}

// ─── Utility: generate HTML preview with sample data ─────────────────────────

export async function previewTemplate(
  companyId: number,
  type: EmailTemplateType,
  brandingOverride?: Partial<EmailBranding>,
  bodyOverride?: string,
): Promise<string> {
  // Sample substitution variables
  const sampleVars: Record<string, string> = {
    name:                'Priya Sharma',
    employee_name:       'Priya Sharma',
    candidate_name:      'Priya Sharma',
    email:               'priya.sharma@example.com',
    company_name:        'Acme Pvt Ltd',
    job_title:           'Senior Software Engineer',
    interview_date:      '15 January 2026',
    interview_time:      '11:00 AM',
    interview_type:      'Online (Google Meet)',
    meeting_link:        'https://meet.google.com/abc-defg-hij',
    offer_ctc:           '₹9.00L/yr',
    joining_date:        '1 February 2026',
    offer_valid_till:    '25 January 2026',
    leave_type:          'Casual Leave',
    from_date:           '20 January 2026',
    to_date:             '22 January 2026',
    days:                '3',
    decision:            'Approved',
    month:               'January 2026',
    net_pay:             '₹65,200',
    reset_link:          '#',
    portal_link:         '#',
    test_title:          'Technical Aptitude Round 1',
    duration_mins:       '45',
    token:               '[secure-token]',
    year:                new Date().getFullYear().toString(),
  };

  const [brandingRow, templateRow] = await Promise.all([
    getBranding(companyId),
    EmailTemplate.findOne({ where: { company_id: companyId, type, is_active: true } }),
  ]);

  const B = { ...(brandingRow?.toJSON() || defaultBranding(companyId)), ...brandingOverride };
  const rawBody = bodyOverride || templateRow?.body_html || getDefaultBody(type);
  const body    = substituteVars(rawBody, sampleVars);
  const footerText = substituteVars(B.footer_text || '', { year: sampleVars.year, company_name: B.company_name || 'Company' });

  const logoHtml = (B as any).logo_url
    ? `<img src="${(B as any).logo_url}" width="${(B as any).logo_width || 120}" alt="${B.company_name}" style="display:block;border:0;" />`
    : `<table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="width:34px;height:34px;background:${(B as any).primary_color};border-radius:8px;text-align:center;vertical-align:middle;">
          <span style="color:#fff;font-size:12px;font-weight:700;line-height:34px;">${(B.company_name || 'Co').slice(0,2).toUpperCase()}</span>
        </td>
        <td style="padding-left:10px;vertical-align:middle;">
          <span style="font-size:15px;font-weight:700;color:${(B as any).secondary_color};letter-spacing:-0.3px;">${B.company_name}</span>
        </td>
      </tr></table>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:${(B as any).body_bg};font-family:${(B as any).font_family};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${(B as any).body_bg};padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 0 16px 0;">${logoHtml}</td></tr>
        ${(B as any).letterhead_html ? `<tr><td style="padding:0 0 12px 0;">${(B as any).letterhead_html}</td></tr>` : ''}
        <tr><td style="background:${(B as any).card_bg};border:1px solid #e0e4ec;border-radius:${(B as any).card_border_radius}px;padding:28px 32px;">${body}</td></tr>
        <tr><td style="padding:16px 0 0 0;text-align:center;font-size:11px;color:#94a3b8;line-height:1.6;">${footerText}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── Default body content for each template type ─────────────────────────────

export function getDefaultBody(type: EmailTemplateType): string {
  const defaults: Record<EmailTemplateType, string> = {
    password_reset: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Reset your password</h2><p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">Hi {name},<br/>We received a request to reset your password. Click the button below to proceed. This link expires in 30 minutes.</p><a href="{reset_link}" style="display:inline-block;background:{primary_color};color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:600;margin:4px 0 20px;">Reset Password</a><p style="font-size:12px;color:#94a3b8;">If you didn't request this, you can safely ignore this email.</p>`,
    password_changed: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Password changed</h2><p style="font-size:13px;color:#64748b;margin:0 0 16px;line-height:1.6;">Hi {name},<br/>Your password was successfully changed. If you did not make this change, please contact HR immediately.</p>`,
    welcome: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Welcome to {company_name}! 🎉</h2><p style="font-size:13px;color:#64748b;margin:0 0 16px;line-height:1.6;">Hi {name},<br/>Your HR account has been created. Use the credentials below to log in.</p><table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8f9fb;border-radius:8px;padding:14px;margin-bottom:20px;"><tbody><tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:45%;">Email</td><td style="padding:6px 0;font-size:12px;color:{secondary_color};font-weight:600;">{email}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Temp password</td><td style="padding:6px 0;font-size:12px;font-weight:600;"><code style="background:#e0e4ec;padding:2px 6px;border-radius:4px;">{token}</code></td></tr></tbody></table><a href="#" style="display:inline-block;background:{primary_color};color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:600;">Log in →</a>`,
    onboarding_complete: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Onboarding complete ✓</h2><p style="font-size:13px;color:#64748b;line-height:1.6;">Hi {name},<br/>Your onboarding process has been completed successfully. Welcome aboard!</p>`,
    leave_applied: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Leave Request Submitted</h2><p style="font-size:13px;color:#64748b;margin:0 0 16px;line-height:1.6;">Hi {name},<br/>Your leave request has been submitted and is pending approval.</p><table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8f9fb;border-radius:8px;padding:14px;margin-bottom:20px;"><tbody><tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:45%;">Leave type</td><td style="padding:6px 0;font-size:12px;color:{secondary_color};font-weight:600;">{leave_type}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:#64748b;">From</td><td style="padding:6px 0;font-size:12px;font-weight:600;">{from_date}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:#64748b;">To</td><td style="padding:6px 0;font-size:12px;font-weight:600;">{to_date}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Days</td><td style="padding:6px 0;font-size:12px;font-weight:600;">{days}</td></tr></tbody></table>`,
    leave_decision: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Leave Request {decision}</h2><p style="font-size:13px;color:#64748b;margin:0 0 16px;line-height:1.6;">Hi {name},<br/>Your leave request for {leave_type} ({from_date} – {to_date}) has been <strong>{decision}</strong>.</p>`,
    payslip_ready: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Your payslip is ready</h2><p style="font-size:13px;color:#64748b;margin:0 0 16px;line-height:1.6;">Hi {name},<br/>Your payslip for <strong>{month}</strong> is now available. Net pay: <strong>{net_pay}</strong>.</p><a href="#" style="display:inline-block;background:{primary_color};color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:600;">View Payslip →</a>`,
    payroll_approval: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Payroll Approval Required</h2><p style="font-size:13px;color:#64748b;line-height:1.6;">The payroll for <strong>{month}</strong> is ready for your review and approval.</p>`,
    interview_scheduled: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Interview Scheduled 📅</h2><p style="font-size:13px;color:#64748b;margin:0 0 16px;line-height:1.6;">Dear {candidate_name},<br/>We are pleased to invite you for an interview for the position of <strong>{job_title}</strong>.</p><table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8f9fb;border-radius:8px;padding:14px;margin-bottom:20px;"><tbody><tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:45%;">Date</td><td style="padding:6px 0;font-size:12px;font-weight:600;">{interview_date}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Time</td><td style="padding:6px 0;font-size:12px;font-weight:600;">{interview_time}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Format</td><td style="padding:6px 0;font-size:12px;font-weight:600;">{interview_type}</td></tr></tbody></table><a href="{meeting_link}" style="display:inline-block;background:{primary_color};color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:600;">Join Interview →</a>`,
    offer_letter: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0d9669;">Congratulations! 🎉</h2><p style="font-size:13px;color:#64748b;margin:0 0 16px;line-height:1.6;">Dear {candidate_name},<br/>We are delighted to offer you the position of <strong>{job_title}</strong> at <strong>{company_name}</strong>.</p><table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8f9fb;border-radius:8px;padding:14px;margin-bottom:20px;"><tbody><tr><td style="padding:6px 0;font-size:12px;color:#64748b;width:45%;">CTC</td><td style="padding:6px 0;font-size:12px;font-weight:600;">{offer_ctc}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Joining date</td><td style="padding:6px 0;font-size:12px;font-weight:600;">{joining_date}</td></tr><tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Valid till</td><td style="padding:6px 0;font-size:12px;font-weight:600;">{offer_valid_till}</td></tr></tbody></table><a href="{portal_link}" style="display:inline-block;background:#0d9669;color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:600;">View Offer Letter →</a>`,
    confirmation: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Employment Confirmation</h2><p style="font-size:13px;color:#64748b;line-height:1.6;">Dear {name},<br/>We are pleased to confirm your employment with <strong>{company_name}</strong>.</p>`,
    birthday_greeting: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Happy Birthday, {name}! 🎂</h2><p style="font-size:13px;color:#64748b;line-height:1.6;">Wishing you a wonderful birthday filled with joy and happiness. Thank you for your continued contribution to {company_name}!</p>`,
    work_anniversary: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Happy Work Anniversary! 🌟</h2><p style="font-size:13px;color:#64748b;line-height:1.6;">Dear {name},<br/>Today marks a special milestone in your journey with {company_name}. Thank you for your dedication and commitment!</p>`,
    system_notification: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">{name}</h2><p style="font-size:13px;color:#64748b;line-height:1.6;">{email}</p>`,
    portal_magic_link: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Your Candidate Portal Login</h2><p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">Dear {candidate_name},<br/>Click the button below to securely access your candidate portal. This link is valid for 15 minutes.</p><a href="{portal_link}" style="display:inline-block;background:{primary_color};color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:600;">Access Portal →</a>`,
    reschedule_decision: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Interview Reschedule Update</h2><p style="font-size:13px;color:#64748b;line-height:1.6;">Dear {candidate_name},<br/>Your reschedule request has been <strong>{decision}</strong>.</p>`,
    reschedule_request_hr: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Reschedule Request Received</h2><p style="font-size:13px;color:#64748b;line-height:1.6;"><strong>{candidate_name}</strong> has requested to reschedule their interview.</p>`,
    aptitude_test_invite: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Aptitude Test Assigned 🧠</h2><p style="font-size:13px;color:#64748b;margin:0 0 16px;line-height:1.6;">Dear {candidate_name},<br/>You have been assigned an aptitude test: <strong>{test_title}</strong>. Duration: {duration_mins} minutes.</p><a href="{portal_link}" style="display:inline-block;background:{primary_color};color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:600;">Start Test →</a>`,
    pre_interview_form: `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:{secondary_color};">Pre-Interview Form Required</h2><p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.6;">Dear {candidate_name},<br/>Please complete the pre-interview declaration form before your scheduled interview.</p><a href="{portal_link}" style="display:inline-block;background:{primary_color};color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:600;">Open Form →</a>`,
  };
  return defaults[type] || `<p>Email content for {name}</p>`;
}
