import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { CandidateService } from './candidate.service';
import { sendResponse, sendPaginated } from '../../utils/response';

const candidateService = new CandidateService();

// GET /api/candidates
export async function getCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows, meta } = await candidateService.getAll(req.query as any, req.user!.companyId);
    sendPaginated(res, rows, meta, 'Candidates fetched');
  } catch (e) { next(e); }
}

// GET /api/candidates/stats
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

// GET /api/candidates/:id
export async function getCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await candidateService.getById(parseInt(req.params.id, 10), req.user!.companyId);
    sendResponse(res, { data, message: 'Candidate fetched' });
  } catch (e) { next(e); }
}

// POST /api/candidates
export async function createCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await candidateService.create(req.user!.companyId, req.body, req.user!.userId);
    sendResponse(res, { data, message: 'Candidate added successfully', statusCode: 201 });
  } catch (e) { next(e); }
}

// PUT /api/candidates/:id
export async function updateCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await candidateService.update(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      req.body,
      req.user!.userId,
    );
    sendResponse(res, { data, message: 'Candidate updated' });
  } catch (e) { next(e); }
}

// PATCH /api/candidates/:id/status
export async function moveCandidateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await candidateService.moveStatus(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      req.body.status,
      req.user!.userId,
      req.body.remarks,
    );
    sendResponse(res, { data, message: `Moved to ${req.body.status}` });
  } catch (e) { next(e); }
}

// DELETE /api/candidates/:id
export async function deleteCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await candidateService.delete(parseInt(req.params.id, 10), req.user!.companyId, req.user!.userId);
    sendResponse(res, { data: null, message: 'Candidate deleted' });
  } catch (e) { next(e); }
}

// POST /api/candidates/:id/resume
export async function uploadResume(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded', data: null }); return; }
    const resumeUrl = `/uploads/resumes/${req.file.filename}`;
    const data = await candidateService.updateResumeUrl(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      resumeUrl,
      req.user!.userId,
    );
    sendResponse(res, { data: { resume_url: resumeUrl, candidate: data }, message: 'Resume uploaded' });
  } catch (e) { next(e); }
}

// POST /api/candidates/bulk
export async function bulkUploadCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: 'No CSV file uploaded', data: null }); return; }

    // Parse CSV manually (no extra lib dependency)
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const lines = fileContent.split('\n').filter((l) => l.trim());
    if (lines.length < 2) {
      res.status(400).json({ success: false, message: 'CSV must have a header row and at least one data row', data: null });
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '_'));
    const rows = lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']));
    });

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    const result = await candidateService.bulkUpload(rows as any, req.user!.companyId, req.user!.userId);

    sendResponse(res, {
      data:       result,
      message:    `Bulk upload complete: ${result.success} added, ${result.failed} failed`,
      statusCode: result.failed === 0 ? 201 : 207, // 207 = Multi-Status (partial success)
    });
  } catch (e) { next(e); }
}
