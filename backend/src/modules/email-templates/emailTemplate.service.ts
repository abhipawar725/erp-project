import { EmailBranding, EmailTemplate, EMAIL_TEMPLATE_TYPES, type EmailTemplateType } from '../../database/models/EmailTemplate';
import { AppError } from '../../middleware/errorHandler.middleware';
import { clearBrandingCache, previewTemplate, getDefaultBody } from '../../utils/emailRenderer';
import { logActivity } from '../../utils/activityLogger';

export class EmailTemplateService {

  // ─── Branding ─────────────────────────────────────────────────────────────

  async getBranding(companyId: number) {
    const branding = await EmailBranding.findOne({ where: { company_id: companyId } });
    return branding;
  }

  async saveBranding(companyId: number, dto: Partial<EmailBranding>, updatedBy?: number) {
    const [branding, created] = await EmailBranding.findOrCreate({
      where: { company_id: companyId },
      defaults: {
        company_id:         companyId,
        company_name:       (dto as any).company_name || 'My Company',
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
        from_name:          'HR Team',
        from_email:         'noreply@example.com',
        ...dto,
      } as any,
    });

    if (!created) {
      await branding.update({ ...dto } as any);
    }

    // Clear cache so next email uses new branding
    clearBrandingCache(companyId);

    await logActivity({
      companyId,
      userId:  updatedBy,
      action:  created ? 'EMAIL_BRANDING_CREATED' : 'EMAIL_BRANDING_UPDATED',
      module:  'email-templates',
    });

    return branding;
  }

  // ─── Templates ────────────────────────────────────────────────────────────

  /** Get all templates for a company (one row per type, with default body if not customised) */
  async getAllTemplates(companyId: number) {
    const customTemplates = await EmailTemplate.findAll({
      where: { company_id: companyId },
    });
    const customMap = new Map(customTemplates.map(t => [t.type, t]));

    // Return a record for every template type (custom or default stub)
    return EMAIL_TEMPLATE_TYPES.map(type => {
      const custom = customMap.get(type);
      return {
        type,
        id:           custom?.id || null,
        subject:      custom?.subject || null,
        body_html:    custom?.body_html || null,
        is_active:    custom?.is_active ?? true,
        is_custom:    custom?.is_custom ?? false,
        preview_text: custom?.preview_text || null,
        updated_at:   custom?.updated_at || null,
      };
    });
  }

  async getTemplate(companyId: number, type: EmailTemplateType) {
    const template = await EmailTemplate.findOne({
      where: { company_id: companyId, type },
    });
    return {
      type,
      id:           template?.id || null,
      subject:      template?.subject || null,
      body_html:    template?.body_html || null,
      default_body: getDefaultBody(type),
      is_active:    template?.is_active ?? true,
      is_custom:    template?.is_custom ?? false,
      preview_text: template?.preview_text || null,
    };
  }

  async saveTemplate(
    companyId: number,
    type: EmailTemplateType,
    dto: {
      subject?:      string | null;
      body_html?:    string | null;
      preview_text?: string | null;
      is_active?:    boolean;
    },
    updatedBy?: number,
  ) {
    if (!EMAIL_TEMPLATE_TYPES.includes(type))
      throw new AppError(`Invalid template type: ${type}`, 400);

    const [template, created] = await EmailTemplate.findOrCreate({
      where: { company_id: companyId, type },
      defaults: {
        company_id:   companyId,
        type,
        subject:      dto.subject || null,
        body_html:    dto.body_html || null,
        preview_text: dto.preview_text || null,
        is_active:    dto.is_active ?? true,
        is_custom:    true,
        created_by:   updatedBy ?? null,
        updated_by:   updatedBy ?? null,
      } as any,
    });

    if (!created) {
      await template.update({
        subject:      dto.subject !== undefined ? dto.subject : template.subject,
        body_html:    dto.body_html !== undefined ? dto.body_html : template.body_html,
        preview_text: dto.preview_text !== undefined ? dto.preview_text : template.preview_text,
        is_active:    dto.is_active !== undefined ? dto.is_active : template.is_active,
        is_custom:    true,
        updated_by:   updatedBy ?? null,
      } as any);
    }

    await logActivity({
      companyId,
      userId:  updatedBy,
      action:  'EMAIL_TEMPLATE_SAVED',
      module:  'email-templates',
      newValues: { type },
    });

    return template;
  }

  /** Reset a template to system default (deletes the custom record) */
  async resetTemplate(companyId: number, type: EmailTemplateType, updatedBy?: number) {
    await EmailTemplate.destroy({ where: { company_id: companyId, type } });
    await logActivity({
      companyId,
      userId:  updatedBy,
      action:  'EMAIL_TEMPLATE_RESET',
      module:  'email-templates',
      newValues: { type },
    });
    return { type, reset: true };
  }

  async toggleTemplate(companyId: number, type: EmailTemplateType, isActive: boolean, updatedBy?: number) {
    const [template] = await EmailTemplate.findOrCreate({
      where: { company_id: companyId, type },
      defaults: { company_id: companyId, type, is_active: isActive, is_custom: true } as any,
    });
    await template.update({ is_active: isActive, updated_by: updatedBy } as any);
    return template;
  }

  /** Generate a full HTML preview email for the editor */
  async getPreview(
    companyId:       number,
    type:            EmailTemplateType,
    brandingOverride?: any,
    bodyOverride?:   string,
  ) {
    const html = await previewTemplate(companyId, type, brandingOverride, bodyOverride);
    return { html };
  }

  /** Send a test email to verify template + SMTP */
  async sendTestEmail(
    companyId: number,
    type:      EmailTemplateType,
    toEmail:   string,
  ) {
    const { sendMail } = await import('../../utils/mailer');
    const { renderEmail } = await import('../../utils/emailRenderer');

    const rendered = await renderEmail({
      companyId,
      type,
      vars:          { name: 'Test User', candidate_name: 'Test Candidate', email: toEmail },
      defaultSubject: `[Test] ${type.replace(/_/g, ' ')}`,
      defaultBody:    getDefaultBody(type),
    });

    await sendMail({
      to:      toEmail,
      subject: `[TEST] ${rendered.subject}`,
      html:    rendered.html,
      ...(rendered.reply_to ? { replyTo: rendered.reply_to } : {}),
    });

    return { sent: true, to: toEmail };
  }
}
