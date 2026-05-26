import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { CandidateService } from './candidate.service';
import { Candidate } from '../../database/models/Candidate';
import { hashPassword } from '../../utils/hash';
import { sendResponse, sendPaginated, sendError } from '../../utils/response';
import { env } from '../../config/env';

const MAX_ROWS = 5000;
const REQUIRED_HEADERS = ['candidate_name'];
const candidateService = new CandidateService();
const PORTAL_TOKEN_SECRET = env.jwt.accessSecret + '_portal';

// ─────────────────────────────────────────────────────────────────────────────
// HR endpoints
// ─────────────────────────────────────────────────────────────────────────────

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



// ─── Send offer letter ────────────────────────────────────────────────────────
export async function sendAptitudeTestLink(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { test_id } = req.body;
    if (!test_id) { sendError(res, 'test_id is required', 400); return; }
    const data = await candidateService.sendAptitudeTestLink(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      parseInt(test_id, 10),
      req.user!.userId,
    );
    sendResponse(res, { data, message: 'Aptitude test link sent to candidate' });
  } catch (e) { next(e); }
}


export async function sendOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await candidateService.sendOffer(
      parseInt(req.params.id, 10), req.user!.companyId, req.body, req.user!.userId,
    );
    sendResponse(res, { data, message: 'Offer letter sent successfully' });
  } catch (e) { next(e); }
}

// ─── Hire candidate (convert to employee) ────────────────────────────────────
export async function hireCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { candidate, employee } = await candidateService.hireCandidate(
      parseInt(req.params.id, 10), req.user!.companyId, req.body, req.user!.userId,
    );
    sendResponse(res, { data: { candidate, employee }, message: `${candidate.candidate_name} hired — employee record created`, statusCode: 201 });
  } catch (e) { next(e); }
}

// ─── Withdraw candidate ───────────────────────────────────────────────────────
export async function withdrawCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await candidateService.withdrawCandidate(
      parseInt(req.params.id, 10), req.user!.companyId, req.body.reason, req.user!.userId,
    );
    sendResponse(res, { data, message: 'Candidate withdrawn' });
  } catch (e) { next(e); }
}

// ─── Send pre-interview form ──────────────────────────────────────────────────
export async function sendPreInterviewForm(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await candidateService.sendPreInterviewForm(
      parseInt(req.params.id, 10), req.user!.companyId, req.user!.userId,
    );
    sendResponse(res, { data, message: 'Pre-interview form link sent to candidate' });
  } catch (e) { next(e); }
}

export async function submitInterviewResult(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await candidateService.submitInterviewResult(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      req.body,
      req.user!.userId,
    );
    sendResponse(res, { data, message: `Interview result recorded — candidate ${req.body.candidate_decision === 'Select' ? 'offered' : req.body.candidate_decision === 'Reject' ? 'rejected' : 'put on hold'}` });
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

export async function bulkUploadCandidates(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      sendError(res, 'No file uploaded', 400);
      return;
    }

    const ext = path
      .extname(req.file.originalname)
      .toLowerCase();

    let rows: any[] = [];

    // ─────────────────────────────────────────────
    // CSV Parsing
    // ─────────────────────────────────────────────

    if (ext === '.csv') {
      const fileContent = fs.readFileSync(
        req.file.path,
        'utf-8',
      );

      const lines = fileContent
        .split('\n')
        .filter(l => l.trim());

      if (lines.length < 2) {
        sendError(
          res,
          'CSV must contain a header row and at least one data row',
          400,
        );

        return;
      }

      const headers = lines[0]
        .split(',')
        .map(h =>
          h
            .trim()
            .replace(/^"|"$/g, '')
            .toLowerCase()
            .replace(/\s+/g, '_'),
        );

      rows = lines.slice(1).map(line => {
        const values: string[] = [];

        let current = '';
        let inQuotes = false;

        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }

        values.push(current.trim());

        return Object.fromEntries(
          headers.map((h, i) => [
            h,
            (values[i] || '').replace(/^"|"$/g, ''),
          ]),
        );
      });
    }

    // ─────────────────────────────────────────────
    // XLS / XLSX Parsing
    // ─────────────────────────────────────────────

    else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(req.file.path, {
        cellDates: true,
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        sendError(
          res,
          'Excel file does not contain any sheets',
          400,
        );

        return;
      }

      const worksheet = workbook.Sheets[sheetName];

      rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        raw: false,
      });
      rows = rows.map((row: any) => {
        const normalized: any = {};

        Object.keys(row).forEach(key => {
          const normalizedKey = key
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_');

          normalized[normalizedKey] = row[key];
        });

        return normalized;
      });

      if (!rows.length) {
        sendError(
          res,
          'Excel file must contain at least one data row',
          400,
        );

        return;
      }
    }

    // ─────────────────────────────────────────────
    // Unsupported File
    // ─────────────────────────────────────────────

    else {
      sendError(
        res,
        'Unsupported file format. Please upload CSV or Excel file.',
        400,
      );

      return;
    }

    // ─────────────────────────────────────────────
    // Header Validation
    // ─────────────────────────────────────────────

    if (!rows.length || !Object.keys(rows[0]).length) {
      sendError(
        res,
        'File contains invalid or empty headers',
        400,
      );

      return;
    }

    const fileHeaders = Object.keys(rows[0]);

    const missingHeaders = REQUIRED_HEADERS.filter(
      h => !fileHeaders.includes(h),
    );

    if (missingHeaders.length) {
      sendError(
        res,
        `Missing required columns: ${missingHeaders.join(', ')}`,
        400,
      );

      return;
    }

    // ─────────────────────────────────────────────
    // Row Limit Validation
    // ─────────────────────────────────────────────

    if (rows.length > MAX_ROWS) {
      sendError(
        res,
        `Maximum ${MAX_ROWS} rows allowed per upload`,
        400,
      );

      return;
    }

    // ─────────────────────────────────────────────
    // Upload
    // ─────────────────────────────────────────────

    const result = await candidateService.bulkUpload(
      rows,
      req.user!.companyId,
      req.user!.userId,
    );

    sendResponse(res, {
      data: result,

      message:
        `Bulk upload complete: ` +
        `${result.success} added, ` +
        `${result.failed} failed`,

      statusCode:
        result.failed === 0 ? 201 : 207,
    });

  } catch (e) {
    next(e);
  }

  // ─────────────────────────────────────────────
  // Cleanup Temp File
  // ─────────────────────────────────────────────

  finally {
    try {
      if (
        req.file?.path &&
        fs.existsSync(req.file.path)
      ) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.error(
        'Failed to cleanup uploaded file:',
        cleanupError,
      );
    }
  }
}

export async function scheduleInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await candidateService.scheduleInterview(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      req.body,
      req.user!.userId,
    );
    sendResponse(res, { data, message: 'Interview scheduled and email sent to candidate' });
  } catch (e) { next(e); }
}

export async function handleReschedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { decision, new_date, new_time } = req.body;
    const data = await candidateService.handleReschedule(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      decision,
      new_date,
      new_time,
      req.user!.userId,
    );
    sendResponse(res, { data, message: `Reschedule ${decision.toLowerCase()}` });
  } catch (e) { next(e); }
}

export async function grantPortalAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { password } = req.body;
    // Generate a random password if none provided
    const rawPassword = password || crypto.randomBytes(6).toString('hex');
    const hash = await hashPassword(rawPassword);

    const candidate = await Candidate.findOne({
      where: { id: parseInt(req.params.id, 10), company_id: req.user!.companyId },
    });
    if (!candidate) { sendError(res, 'Candidate not found', 404); return; }

    await candidate.update({ portal_password_hash: hash, is_portal_user: true });
    sendResponse(res, {
      data: {
        is_portal_user: true,
        // Return generated password in dev so HR can share it
        ...(env.nodeEnv === 'development' && !password ? { temp_password: rawPassword } : {}),
      },
      message: 'Portal access granted',
    });
  } catch (e) { next(e); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Portal endpoints (candidate-facing)
// ─────────────────────────────────────────────────────────────────────────────

export async function portalLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, company_id } = req.body;
    const companyId = Number(company_id) || 1;
    const candidate = await candidateService.portalLogin(email, password, companyId);

    const token = jwt.sign(
      { candidateId: candidate.id, companyId: candidate.company_id, type: 'portal' },
      PORTAL_TOKEN_SECRET,
      { expiresIn: '7d' },
    );

    res.cookie('portalToken', token, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    sendResponse(res, {
      data: { token, candidateId: candidate.id, name: candidate.candidate_name, email: candidate.email },
      message: 'Login successful',
    });
  } catch (e) { next(e); }
}

export async function portalMagicLink(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const devToken = await candidateService.sendMagicLink(req.body.email, Number(req.body.company_id) || 1);
    // Always return OK (security: don't reveal if email exists)
    const data = env.nodeEnv === 'development' && devToken ? { magicToken: devToken } : null;
    sendResponse(res, { data, message: 'If that email exists, a login link has been sent.' });
  } catch (e) { next(e); }
}

export async function portalVerifyMagic(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const candidate = await candidateService.verifyMagicToken(req.body.token, Number(req.body.company_id) || 1);

    const token = jwt.sign(
      { candidateId: candidate.id, companyId: candidate.company_id, type: 'portal' },
      PORTAL_TOKEN_SECRET,
      { expiresIn: '7d' },
    );

    res.cookie('portalToken', token, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    sendResponse(res, {
      data: { token, candidateId: candidate.id, name: candidate.candidate_name },
      message: 'Login successful',
    });
  } catch (e) { next(e); }
}

// ─── Portal auth middleware ───────────────────────────────────────────────────
export function portalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.portalToken
      || req.headers.authorization?.split(' ')[1]
      || (req.headers['x-portal-token'] as string);

    if (!token) { sendError(res, 'Portal authentication required', 401); return; }

    const payload = jwt.verify(token, PORTAL_TOKEN_SECRET) as any;
    if (payload.type !== 'portal') { sendError(res, 'Invalid token type', 401); return; }

    (req as any).portalCandidate = payload;
    next();
  } catch {
    sendError(res, 'Invalid or expired portal token. Please log in again.', 401);
  }
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
    const data = await candidateService.respondToInterview(candidateId, companyId, req.body.accepted === true);
    sendResponse(res, { data, message: req.body.accepted ? 'Interview accepted' : 'Interview rejected' });
  } catch (e) { next(e); }
}

export async function portalRequestReschedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { candidateId, companyId } = (req as any).portalCandidate;
    const data = await candidateService.requestReschedule(
      candidateId, companyId,
      req.body.reason,
      req.body.proposed_date,
      req.body.proposed_time,
    );
    sendResponse(res, { data, message: 'Reschedule request submitted. HR will review shortly.' });
  } catch (e) { next(e); }
}

export async function portalGetCompanyInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { companyId } = (req as any).portalCandidate;
    const { Company }     = await import('../../database/models/Company');
    const { EmailBranding } = await import('../../database/models/EmailTemplate');

    const [company, branding] = await Promise.all([
      Company.findByPk(companyId, { attributes: ['id','name','logo_url','address','city','state','pincode'] }),
      EmailBranding.findOne({ where: { company_id: companyId }, attributes: ['company_name','logo_url','from_name'] }),
    ]);

    sendResponse(res, {
      data: {
        name:     branding?.company_name || company?.name || 'Company',
        logo_url: branding?.logo_url || company?.logo_url || null,
        address:  [company?.address, company?.city, company?.state, company?.pincode].filter(Boolean).join(', ') || null,
      },
      message: 'Company info fetched',
    });
  } catch (e) { next(e); }
}

export async function portalSavePrejoin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { candidateId, companyId } = (req as any).portalCandidate;
    const isDraft = req.body.is_draft !== false;
    const data = await candidateService.savePrejoinForm(candidateId, companyId, req.body.form_data, isDraft);
    sendResponse(res, { data, message: isDraft ? 'Draft saved successfully' : 'Pre-joining form submitted successfully' });
  } catch (e) { next(e); }
}
