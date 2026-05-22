import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { CandidateService } from './candidate.service';
import { sendResponse, sendPaginated, sendError } from '../../utils/response';
import { env } from '../../config/env';

const candidateService = new CandidateService();

const PORTAL_TOKEN_SECRET = env.jwt.accessSecret + '_portal';

// ─── HR endpoints ─────────────────────────────────────────────────────────────

export async function getCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows, meta } = await candidateService.getAll(req.query as any, req.user!.companyId);
    sendPaginated(res, rows, meta, 'Candidates fetched');
  } catch (e) { next(e); }
}

export async function getCandidateStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [summary, pipeline, sources] = await Promise.all([
      candidateService.getSummaryStats(req.user!.companyId),
      candidateService.getPipelineStats(req.user!.companyId),
      candidateService.getSourceBreakdown(req.user!.companyId),
    ]);
    sendResponse(res, { data: { summary, pipeline, sources }, message: 'Stats fetched' });
  } catch (e) { next(e); }
}

export async function getCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await candidateService.getById(parseInt(req.params.id, 10), req.user!.companyId);
    sendResponse(res, { data, message: 'Candidate fetched' });
  } catch (e) { next(e); }
}

export async function createCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await candidateService.create(req.user!.companyId, req.body, req.user!.userId);
    sendResponse(res, { data, message: 'Candidate added', statusCode: 201 });
  } catch (e) { next(e); }
}

export async function updateCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await candidateService.update(parseInt(req.params.id, 10), req.user!.companyId, req.body, req.user!.userId);
    sendResponse(res, { data, message: 'Candidate updated' });
  } catch (e) { next(e); }
}

export async function moveCandidateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await candidateService.moveStatus(parseInt(req.params.id, 10), req.user!.companyId, req.body.status, req.user!.userId, req.body.remarks);
    sendResponse(res, { data, message: `Moved to ${req.body.status}` });
  } catch (e) { next(e); }
}

export async function deleteCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await candidateService.delete(parseInt(req.params.id, 10), req.user!.companyId, req.user!.userId);
    sendResponse(res, { data: null, message: 'Candidate deleted' });
  } catch (e) { next(e); }
}

export async function uploadResume(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) { sendError(res, 'No file uploaded', 400); return; }
    const resumeUrl = `/uploads/resumes/${req.file.filename}`;
    const data = await candidateService.updateResume(parseInt(req.params.id, 10), req.user!.companyId, resumeUrl, req.user!.userId);
    sendResponse(res, { data: { resume_url: resumeUrl, candidate: data }, message: 'Resume uploaded' });
  } catch (e) { next(e); }
}

export async function bulkUploadCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) { sendError(res, 'No CSV file uploaded', 400); return; }
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const lines = fileContent.split('\n').filter(l => l.trim());
    if (lines.length < 2) { sendError(res, 'CSV must have header + at least one row', 400); return; }
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '_'));
    const rows    = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']));
    });
    fs.unlinkSync(req.file.path);
    const result = await candidateService.bulkUpload(rows as any, req.user!.companyId, req.user!.userId);
    sendResponse(res, { data: result, message: `${result.success}/${result.total} added`, statusCode: result.failed === 0 ? 201 : 207 });
  } catch (e) { next(e); }
}

export async function scheduleInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await candidateService.scheduleInterview(parseInt(req.params.id, 10), req.user!.companyId, req.body, req.user!.userId);
    sendResponse(res, { data, message: 'Interview scheduled and email sent' });
  } catch (e) { next(e); }
}

export async function handleReschedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { decision, new_date, new_time } = req.body;
    const data = await candidateService.handleReschedule(parseInt(req.params.id, 10), req.user!.companyId, decision, new_date, new_time, req.user!.userId);
    sendResponse(res, { data, message: `Reschedule ${decision}` });
  } catch (e) { next(e); }
}

// Grant portal access + set password
export async function grantPortalAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { password } = req.body;
    const { hashPassword } = await import('../../utils/hash');
    const hash = await hashPassword(password || crypto.randomUUID().slice(0, 12));
    const candidate = await (await import('../../database/models/Candidate')).Candidate.findOne({
      where: { id: parseInt(req.params.id, 10), company_id: req.user!.companyId },
    });
    if (!candidate) { sendError(res, 'Candidate not found', 404); return; }
    await candidate.update({ portal_password_hash: hash, is_portal_user: true });
    sendResponse(res, { data: { is_portal_user: true }, message: 'Portal access granted' });
  } catch (e) { next(e); }
}

// ─── Portal endpoints ─────────────────────────────────────────────────────────

export async function portalLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, company_id } = req.body;
    const companyId = company_id || 1;
    const candidate = await candidateService.portalLogin(email, password, companyId);
    const token = jwt.sign({ candidateId: candidate.id, companyId: candidate.company_id, type: 'portal' }, PORTAL_TOKEN_SECRET, { expiresIn: '7d' });
    res.cookie('portalToken', token, { httpOnly: true, secure: env.isProduction, sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000 });
    sendResponse(res, { data: { token, candidateId: candidate.id, name: candidate.candidate_name }, message: 'Login successful' });
  } catch (e) { next(e); }
}

export async function portalMagicLink(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const devToken = await candidateService.sendMagicLink(req.body.email, req.body.company_id || 1);
    const data = env.nodeEnv === 'development' && devToken ? { magicToken: devToken } : null;
    sendResponse(res, { data, message: 'If that email exists, a login link has been sent.' });
  } catch (e) { next(e); }
}

export async function portalVerifyMagic(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const candidate = await candidateService.verifyMagicToken(req.body.token, req.body.company_id || 1);
    const token = jwt.sign({ candidateId: candidate.id, companyId: candidate.company_id, type: 'portal' }, PORTAL_TOKEN_SECRET, { expiresIn: '7d' });
    res.cookie('portalToken', token, { httpOnly: true, secure: env.isProduction, sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000 });
    sendResponse(res, { data: { token, candidateId: candidate.id, name: candidate.candidate_name }, message: 'Login successful' });
  } catch (e) { next(e); }
}

// Middleware to verify portal JWT
export function portalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.portalToken || req.headers.authorization?.split(' ')[1];
    if (!token) { sendError(res, 'Portal authentication required', 401); return; }
    const payload = jwt.verify(token, PORTAL_TOKEN_SECRET) as any;
    if (payload.type !== 'portal') { sendError(res, 'Invalid token type', 401); return; }
    (req as any).portalCandidate = payload;
    next();
  } catch { sendError(res, 'Invalid or expired portal token', 401); }
}

export async function portalGetProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { candidateId, companyId } = (req as any).portalCandidate;
    const data = await candidateService.getById(candidateId, companyId, true);
    sendResponse(res, { data, message: 'Profile fetched' });
  } catch (e) { next(e); }
}

export async function portalRespondInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { candidateId, companyId } = (req as any).portalCandidate;
    const data = await candidateService.respondToInterview(candidateId, companyId, req.body.accepted);
    sendResponse(res, { data, message: req.body.accepted ? 'Interview accepted' : 'Interview rejected' });
  } catch (e) { next(e); }
}

export async function portalRequestReschedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { candidateId, companyId } = (req as any).portalCandidate;
    const data = await candidateService.requestReschedule(candidateId, companyId, req.body.reason, req.body.proposed_date, req.body.proposed_time);
    sendResponse(res, { data, message: 'Reschedule request submitted' });
  } catch (e) { next(e); }
}

export async function portalSavePrejoin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { candidateId, companyId } = (req as any).portalCandidate;
    const isDraft = req.body.is_draft !== false;
    const data = await candidateService.savePrejoinForm(candidateId, companyId, req.body.form_data, isDraft);
    sendResponse(res, { data, message: isDraft ? 'Draft saved' : 'Form submitted successfully' });
  } catch (e) { next(e); }
}
