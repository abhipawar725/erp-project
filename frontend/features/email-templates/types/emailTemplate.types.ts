// ─── Template type constants (mirrors backend) ────────────────────────────────

export const EMAIL_TEMPLATE_TYPES = [
  'password_reset', 'password_changed', 'welcome', 'onboarding_complete',
  'leave_applied', 'leave_decision', 'payslip_ready', 'payroll_approval',
  'interview_scheduled', 'offer_letter', 'confirmation',
  'birthday_greeting', 'work_anniversary', 'system_notification',
  'portal_magic_link', 'reschedule_decision', 'reschedule_request_hr',
  'aptitude_test_invite', 'pre_interview_form',
] as const;

export type EmailTemplateType = typeof EMAIL_TEMPLATE_TYPES[number];

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateType, string> = {
  password_reset:        'Password Reset',
  password_changed:      'Password Changed',
  welcome:               'Welcome / New User',
  onboarding_complete:   'Onboarding Complete',
  leave_applied:         'Leave Applied',
  leave_decision:        'Leave Decision',
  payslip_ready:         'Payslip Ready',
  payroll_approval:      'Payroll Approval Request',
  interview_scheduled:   'Interview Scheduled',
  offer_letter:          'Offer Letter',
  confirmation:          'Confirmation Letter',
  birthday_greeting:     'Birthday Greeting',
  work_anniversary:      'Work Anniversary',
  system_notification:   'System Notification',
  portal_magic_link:     'Portal Magic Link',
  reschedule_decision:   'Reschedule Decision',
  reschedule_request_hr: 'Reschedule Request (HR)',
  aptitude_test_invite:  'Aptitude Test Invite',
  pre_interview_form:    'Pre-Interview Form',
};

export const EMAIL_TEMPLATE_CATEGORIES: Record<string, EmailTemplateType[]> = {
  'Authentication':       ['password_reset', 'password_changed', 'welcome'],
  'Employee Lifecycle':   ['onboarding_complete', 'confirmation', 'birthday_greeting', 'work_anniversary'],
  'Leave & Payroll':      ['leave_applied', 'leave_decision', 'payslip_ready', 'payroll_approval'],
  'Recruitment':          ['interview_scheduled', 'offer_letter', 'portal_magic_link', 'reschedule_decision', 'reschedule_request_hr', 'aptitude_test_invite', 'pre_interview_form'],
  'System':               ['system_notification'],
};

export const TEMPLATE_VARIABLES: Record<EmailTemplateType, string[]> = {
  password_reset:        ['{name}', '{reset_link}'],
  password_changed:      ['{name}'],
  welcome:               ['{name}', '{email}', '{token}'],
  onboarding_complete:   ['{name}'],
  leave_applied:         ['{name}', '{leave_type}', '{from_date}', '{to_date}', '{days}'],
  leave_decision:        ['{name}', '{decision}', '{leave_type}', '{from_date}', '{to_date}'],
  payslip_ready:         ['{name}', '{month}', '{net_pay}'],
  payroll_approval:      ['{name}', '{month}'],
  interview_scheduled:   ['{candidate_name}', '{job_title}', '{interview_date}', '{interview_time}', '{interview_type}', '{meeting_link}'],
  offer_letter:          ['{candidate_name}', '{job_title}', '{offer_ctc}', '{joining_date}', '{offer_valid_till}', '{portal_link}'],
  confirmation:          ['{name}'],
  birthday_greeting:     ['{name}'],
  work_anniversary:      ['{name}'],
  system_notification:   ['{name}', '{email}'],
  portal_magic_link:     ['{candidate_name}', '{portal_link}'],
  reschedule_decision:   ['{candidate_name}', '{decision}'],
  reschedule_request_hr: ['{candidate_name}'],
  aptitude_test_invite:  ['{candidate_name}', '{test_title}', '{duration_mins}', '{portal_link}'],
  pre_interview_form:    ['{candidate_name}', '{portal_link}'],
};

// ─── Models ───────────────────────────────────────────────────────────────────

export interface EmailBranding {
  id?:                  number;
  company_id?:          number;
  company_name:         string;
  logo_url?:            string | null;
  logo_width?:          number;
  primary_color:        string;
  secondary_color:      string;
  accent_color:         string;
  font_family:          string;
  header_bg:            string;
  card_bg:              string;
  card_border_radius:   number;
  body_bg:              string;
  footer_text:          string;
  footer_bg:            string;
  show_social_links:    boolean;
  social_linkedin?:     string | null;
  social_twitter?:      string | null;
  from_name:            string;
  from_email:           string;
  reply_to?:            string | null;
  letterhead_html?:     string | null;
  updated_at?:          string;
}

export interface EmailTemplateRecord {
  type:          EmailTemplateType;
  id?:           number | null;
  subject?:      string | null;
  body_html?:    string | null;
  default_body?: string;
  is_active:     boolean;
  is_custom:     boolean;
  preview_text?: string | null;
  updated_at?:   string | null;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface SaveBrandingDto {
  company_name:        string;
  logo_url?:           string | null;
  logo_width?:         number;
  primary_color:       string;
  secondary_color:     string;
  accent_color:        string;
  font_family:         string;
  header_bg:           string;
  card_bg:             string;
  card_border_radius:  number;
  body_bg:             string;
  footer_text:         string;
  footer_bg:           string;
  show_social_links:   boolean;
  social_linkedin?:    string | null;
  social_twitter?:     string | null;
  from_name:           string;
  from_email:          string;
  reply_to?:           string | null;
  letterhead_html?:    string | null;
}

export interface SaveTemplateDto {
  subject?:      string | null;
  body_html?:    string | null;
  preview_text?: string | null;
  is_active?:    boolean;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export const FONT_OPTIONS = [
  { label: 'DM Sans (default)', value: "'DM Sans', Helvetica, Arial, sans-serif" },
  { label: 'Inter',             value: "'Inter', Helvetica, Arial, sans-serif" },
  { label: 'Roboto',            value: "'Roboto', Helvetica, Arial, sans-serif" },
  { label: 'Open Sans',         value: "'Open Sans', Helvetica, Arial, sans-serif" },
  { label: 'Lato',              value: "'Lato', Helvetica, Arial, sans-serif" },
  { label: 'Georgia (Serif)',   value: "Georgia, 'Times New Roman', serif" },
];

export const DEFAULT_BRANDING: SaveBrandingDto = {
  company_name:        'My Company',
  logo_url:            null,
  logo_width:          120,
  primary_color:       '#1e56d9',
  secondary_color:     '#0f1623',
  accent_color:        '#f0f4ff',
  font_family:         "'DM Sans', Helvetica, Arial, sans-serif",
  header_bg:           '#ffffff',
  card_bg:             '#ffffff',
  card_border_radius:  12,
  body_bg:             '#f5f6f8',
  footer_text:         '© {year} {company_name} · Human Resource Management<br/>This email was sent by the HR system. Please do not reply.',
  footer_bg:           '#f5f6f8',
  show_social_links:   false,
  from_name:           'HR Team',
  from_email:          'noreply@example.com',
};
