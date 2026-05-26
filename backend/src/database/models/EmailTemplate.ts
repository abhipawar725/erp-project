import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ─── Template type constants ──────────────────────────────────────────────────

export const EMAIL_TEMPLATE_TYPES = [
  'password_reset',
  'password_changed',
  'welcome',
  'onboarding_complete',
  'leave_applied',
  'leave_decision',
  'payslip_ready',
  'payroll_approval',
  'interview_scheduled',
  'offer_letter',
  'confirmation',
  'birthday_greeting',
  'work_anniversary',
  'system_notification',
  'portal_magic_link',
  'reschedule_decision',
  'reschedule_request_hr',
  'aptitude_test_invite',
  'pre_interview_form',
] as const;

export type EmailTemplateType = typeof EMAIL_TEMPLATE_TYPES[number];

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateType, string> = {
  password_reset:       'Password Reset',
  password_changed:     'Password Changed',
  welcome:              'Welcome / New User',
  onboarding_complete:  'Onboarding Complete',
  leave_applied:        'Leave Applied',
  leave_decision:       'Leave Decision (Approve/Reject)',
  payslip_ready:        'Payslip Ready',
  payroll_approval:     'Payroll Approval Request',
  interview_scheduled:  'Interview Scheduled',
  offer_letter:         'Offer Letter',
  confirmation:         'Confirmation Letter',
  birthday_greeting:    'Birthday Greeting',
  work_anniversary:     'Work Anniversary',
  system_notification:  'System Notification',
  portal_magic_link:    'Candidate Portal Magic Link',
  reschedule_decision:  'Interview Reschedule Decision',
  reschedule_request_hr:'Reschedule Request to HR',
  aptitude_test_invite: 'Aptitude Test Invite',
  pre_interview_form:   'Pre-Interview Form Link',
};

export const EMAIL_TEMPLATE_CATEGORIES: Record<string, EmailTemplateType[]> = {
  'Authentication': ['password_reset','password_changed','welcome'],
  'Employee Lifecycle': ['onboarding_complete','confirmation','birthday_greeting','work_anniversary'],
  'Leave & Payroll': ['leave_applied','leave_decision','payslip_ready','payroll_approval'],
  'Recruitment': ['interview_scheduled','offer_letter','portal_magic_link','reschedule_decision','reschedule_request_hr','aptitude_test_invite','pre_interview_form'],
  'System': ['system_notification'],
};

// ─── EmailBranding model (per-company design settings) ────────────────────────

interface EmailBrandingAttributes {
  id:                  number;
  company_id:          number;
  // Brand identity
  company_name:        string;
  logo_url?:           string | null;
  logo_width?:         number;        // px, default 120
  // Color scheme
  primary_color:       string;        // hex, e.g. #1e56d9
  secondary_color:     string;        // hex, e.g. #0f1623
  accent_color:        string;        // hex, e.g. #f0f4ff
  // Typography
  font_family:         string;        // CSS font stack
  // Layout
  header_bg:           string;        // hex, background behind logo
  card_bg:             string;        // card body bg
  card_border_radius:  number;        // px
  body_bg:             string;        // outer page bg
  // Footer
  footer_text:         string;        // HTML allowed (links etc.)
  footer_bg:           string;
  show_social_links:   boolean;
  social_linkedin?:    string | null;
  social_twitter?:     string | null;
  // Sender
  from_name:           string;
  from_email:          string;
  reply_to?:           string | null;
  // Letterhead (for offer letters etc.)
  letterhead_html?:    string | null; // custom HTML letterhead block
  // Timestamps
  created_at?:         Date;
  updated_at?:         Date;
}

type EmailBrandingCreation = Optional<EmailBrandingAttributes, 'id' | 'logo_width' | 'show_social_links'>;

export class EmailBranding
  extends Model<EmailBrandingAttributes, EmailBrandingCreation>
  implements EmailBrandingAttributes
{
  public id!:                 number;
  public company_id!:         number;
  public company_name!:       string;
  public logo_url!:           string | null;
  public logo_width!:         number;
  public primary_color!:      string;
  public secondary_color!:    string;
  public accent_color!:       string;
  public font_family!:        string;
  public header_bg!:          string;
  public card_bg!:            string;
  public card_border_radius!: number;
  public body_bg!:            string;
  public footer_text!:        string;
  public footer_bg!:          string;
  public show_social_links!:  boolean;
  public social_linkedin!:    string | null;
  public social_twitter!:     string | null;
  public from_name!:          string;
  public from_email!:         string;
  public reply_to!:           string | null;
  public letterhead_html!:    string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

EmailBranding.init(
  {
    id:                  { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    company_id:          { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
    company_name:        { type: DataTypes.STRING(200), allowNull: false },
    logo_url:            { type: DataTypes.STRING(500), allowNull: true },
    logo_width:          { type: DataTypes.INTEGER, defaultValue: 120 },
    primary_color:       { type: DataTypes.STRING(7), defaultValue: '#1e56d9' },
    secondary_color:     { type: DataTypes.STRING(7), defaultValue: '#0f1623' },
    accent_color:        { type: DataTypes.STRING(7), defaultValue: '#f0f4ff' },
    font_family:         { type: DataTypes.STRING(200), defaultValue: "'DM Sans', Helvetica, Arial, sans-serif" },
    header_bg:           { type: DataTypes.STRING(7), defaultValue: '#ffffff' },
    card_bg:             { type: DataTypes.STRING(7), defaultValue: '#ffffff' },
    card_border_radius:  { type: DataTypes.INTEGER, defaultValue: 12 },
    body_bg:             { type: DataTypes.STRING(7), defaultValue: '#f5f6f8' },
    footer_text:         { type: DataTypes.TEXT, defaultValue: '© {year} {company_name} · Human Resource Management<br/>This email was sent by the HR system. Please do not reply.' },
    footer_bg:           { type: DataTypes.STRING(7), defaultValue: '#f5f6f8' },
    show_social_links:   { type: DataTypes.BOOLEAN, defaultValue: false },
    social_linkedin:     { type: DataTypes.STRING(500), allowNull: true },
    social_twitter:      { type: DataTypes.STRING(500), allowNull: true },
    from_name:           { type: DataTypes.STRING(100), defaultValue: 'NexHR Team' },
    from_email:          { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'noreply@nexhr.com' },
    reply_to:            { type: DataTypes.STRING(255), allowNull: true },
    letterhead_html:     { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName:  'email_branding',
    modelName:  'EmailBranding',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
    indexes: [{ unique: true, fields: ['company_id'] }],
  },
);

// ─── EmailTemplate model (per-company overrides for each template type) ────────

interface EmailTemplateAttributes {
  id:                number;
  company_id:        number;
  type:              EmailTemplateType;
  // Override fields (null = use default)
  subject?:          string | null;
  body_html?:        string | null;    // full HTML body content (inside the card)
  // State
  is_active:         boolean;
  is_custom:         boolean;          // false = using system default
  // Meta
  preview_text?:     string | null;
  created_by?:       number | null;
  updated_by?:       number | null;
  created_at?:       Date;
  updated_at?:       Date;
}

type EmailTemplateCreation = Optional<EmailTemplateAttributes, 'id' | 'is_active' | 'is_custom'>;

export class EmailTemplate
  extends Model<EmailTemplateAttributes, EmailTemplateCreation>
  implements EmailTemplateAttributes
{
  public id!:           number;
  public company_id!:   number;
  public type!:         EmailTemplateType;
  public subject!:      string | null;
  public body_html!:    string | null;
  public is_active!:    boolean;
  public is_custom!:    boolean;
  public preview_text!: string | null;
  public created_by!:   number | null;
  public updated_by!:   number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

EmailTemplate.init(
  {
    id:           { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    company_id:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type:         { type: DataTypes.ENUM(...EMAIL_TEMPLATE_TYPES), allowNull: false },
    subject:      { type: DataTypes.STRING(500), allowNull: true },
    body_html:    { type: DataTypes.TEXT('long'), allowNull: true },
    is_active:    { type: DataTypes.BOOLEAN, defaultValue: true },
    is_custom:    { type: DataTypes.BOOLEAN, defaultValue: true },
    preview_text: { type: DataTypes.STRING(200), allowNull: true },
    created_by:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    updated_by:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    sequelize,
    tableName:  'email_templates',
    modelName:  'EmailTemplate',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
    indexes: [
      { fields: ['company_id'] },
      { unique: true, fields: ['company_id', 'type'] },
    ],
  },
);
