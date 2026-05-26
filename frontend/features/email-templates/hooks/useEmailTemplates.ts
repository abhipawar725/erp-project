import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailTemplateService } from '../services/emailTemplate.service';
import { showToast }            from '../../../utils/toast';
import type { EmailTemplateType, SaveBrandingDto, SaveTemplateDto, EmailBranding } from '../types/emailTemplate.types';

const KEYS = {
  branding:   ['email-branding']           as const,
  templates:  ['email-templates']          as const,
  template:   (t: string) => ['email-templates', t] as const,
};

// ─── Branding ─────────────────────────────────────────────────────────────────

export function useEmailBranding() {
  return useQuery({
    queryKey: KEYS.branding,
    queryFn:  () => emailTemplateService.getBranding(),
    staleTime: 2 * 60_000,
    select:   (res) => res.data,
  });
}

export function useSaveEmailBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveBrandingDto) => emailTemplateService.saveBranding(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.branding });
      showToast('✓ Email branding saved');
    },
    onError: (err: any) => showToast(err?.message || 'Failed to save branding'),
  });
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function useEmailTemplates() {
  return useQuery({
    queryKey: KEYS.templates,
    queryFn:  () => emailTemplateService.getAll(),
    staleTime: 60_000,
    select:   (res) => res.data,
  });
}

export function useEmailTemplate(type: EmailTemplateType) {
  return useQuery({
    queryKey: KEYS.template(type),
    queryFn:  () => emailTemplateService.getTemplate(type),
    staleTime: 60_000,
    select:   (res) => res.data,
  });
}

export function useSaveEmailTemplate(type: EmailTemplateType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveTemplateDto) => emailTemplateService.saveTemplate(type, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.templates });
      qc.invalidateQueries({ queryKey: KEYS.template(type) });
      showToast('✓ Template saved');
    },
    onError: (err: any) => showToast(err?.message || 'Failed to save'),
  });
}

export function useResetEmailTemplate(type: EmailTemplateType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => emailTemplateService.resetTemplate(type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.templates });
      qc.invalidateQueries({ queryKey: KEYS.template(type) });
      showToast('Template reset to system default');
    },
    onError: (err: any) => showToast(err?.message || 'Reset failed'),
  });
}

export function useToggleEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, isActive }: { type: EmailTemplateType; isActive: boolean }) =>
      emailTemplateService.toggleTemplate(type, isActive),
    onSuccess: (_, { isActive }) => {
      qc.invalidateQueries({ queryKey: KEYS.templates });
      showToast(isActive ? '✓ Template enabled' : 'Template disabled');
    },
    onError: (err: any) => showToast(err?.message || 'Toggle failed'),
  });
}

export function useEmailPreview() {
  return useMutation({
    mutationFn: ({ type, brandingOverride, bodyOverride }: {
      type: EmailTemplateType;
      brandingOverride?: Partial<EmailBranding>;
      bodyOverride?: string;
    }) => emailTemplateService.getPreview(type, brandingOverride, bodyOverride),
    onError: (err: any) => showToast(err?.message || 'Preview failed'),
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: ({ type, toEmail }: { type: EmailTemplateType; toEmail: string }) =>
      emailTemplateService.sendTestEmail(type, toEmail),
    onSuccess: (res) => showToast(`✓ Test email sent to ${res.data.to}`),
    onError: (err: any) => showToast(err?.message || 'Failed to send test email'),
  });
}
