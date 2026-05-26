import apiClient from '../../../services/api/client';
import type { ApiResponse } from '../../../types/api.types';
import type {
  EmailBranding, EmailTemplateRecord, EmailTemplateType,
  SaveBrandingDto, SaveTemplateDto,
} from '../types/emailTemplate.types';

export const emailTemplateService = {
  // ─── Branding ──────────────────────────────────────────────────────────────
  getBranding: () =>
    apiClient.get<unknown, ApiResponse<EmailBranding | null>>('/email-templates/branding'),

  saveBranding: (data: SaveBrandingDto) =>
    apiClient.put<unknown, ApiResponse<EmailBranding>>('/email-templates/branding', data),

  // ─── Templates ─────────────────────────────────────────────────────────────
  getAll: () =>
    apiClient.get<unknown, ApiResponse<EmailTemplateRecord[]>>('/email-templates'),

  getTemplate: (type: EmailTemplateType) =>
    apiClient.get<unknown, ApiResponse<EmailTemplateRecord>>(`/email-templates/${type}`),

  saveTemplate: (type: EmailTemplateType, data: SaveTemplateDto) =>
    apiClient.put<unknown, ApiResponse<EmailTemplateRecord>>(`/email-templates/${type}`, data),

  resetTemplate: (type: EmailTemplateType) =>
    apiClient.delete<unknown, ApiResponse<{ type: string; reset: boolean }>>(`/email-templates/${type}/reset`),

  toggleTemplate: (type: EmailTemplateType, isActive: boolean) =>
    apiClient.patch<unknown, ApiResponse<EmailTemplateRecord>>(`/email-templates/${type}/toggle`, { is_active: isActive }),

  getPreview: (type: EmailTemplateType, brandingOverride?: Partial<EmailBranding>, bodyOverride?: string) =>
    apiClient.post<unknown, ApiResponse<{ html: string }>>(`/email-templates/${type}/preview`, {
      branding_override: brandingOverride,
      body_override:     bodyOverride,
    }),

  sendTestEmail: (type: EmailTemplateType, toEmail: string) =>
    apiClient.post<unknown, ApiResponse<{ sent: boolean; to: string }>>(`/email-templates/${type}/test`, { to_email: toEmail }),
};
