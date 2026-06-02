import { Request, Response, NextFunction } from 'express';
import { EmailTemplateService } from './emailTemplate.service';
import { sendResponse, sendError } from '../../utils/response';
import type { EmailTemplateType } from '../../database/models/EmailTemplate';

const svc = new EmailTemplateService();

// ─── Branding ─────────────────────────────────────────────────────────────────

export async function getBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getBranding(req.user!.companyId);
    sendResponse(res, { data, message: 'Branding fetched' });
  } catch (e) { next(e); }
}

export async function saveBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.saveBranding(req.user!.companyId, req.body, req.user!.userId);
    sendResponse(res, { data, message: 'Branding saved' });
  } catch (e) { next(e); }
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function getAllTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getAllTemplates(req.user!.companyId);
    sendResponse(res, { data, message: 'Templates fetched' });
  } catch (e) { next(e); }
}

export async function getTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getTemplate(req.user!.companyId, req.params.type as EmailTemplateType);
    sendResponse(res, { data, message: 'Template fetched' });
  } catch (e) { next(e); }
}

export async function saveTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.saveTemplate(
      req.user!.companyId,
      req.params.type as EmailTemplateType,
      req.body,
      req.user!.userId,
    );
    sendResponse(res, { data, message: 'Template saved' });
  } catch (e) { next(e); }
}

export async function resetTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.resetTemplate(
      req.user!.companyId,
      req.params.type as EmailTemplateType,
      req.user!.userId,
    );
    sendResponse(res, { data, message: 'Template reset to system default' });
  } catch (e) { next(e); }
}

export async function toggleTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.toggleTemplate(
      req.user!.companyId,
      req.params.type as EmailTemplateType,
      req.body.is_active,
      req.user!.userId,
    );
    sendResponse(res, { data, message: `Template ${req.body.is_active ? 'enabled' : 'disabled'}` });
  } catch (e) { next(e); }
}

export async function getPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { branding_override, body_override } = req.body;
    const data = await svc.getPreview(
      req.user!.companyId,
      req.params.type as EmailTemplateType,
      branding_override,
      body_override,
    );
    sendResponse(res, { data, message: 'Preview generated' });
  } catch (e) { next(e); }
}

export async function sendTestEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { to_email } = req.body;
    if (!to_email) { sendError(res, 'to_email is required', 400); return; }
    const data = await svc.sendTestEmail(
      req.user!.companyId,
      req.params.type as EmailTemplateType,
      to_email,
    );
    sendResponse(res, { data, message: `Test email sent to ${to_email}` });
  } catch (e) { next(e); }
}
