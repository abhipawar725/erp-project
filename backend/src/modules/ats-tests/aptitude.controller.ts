import { Request, Response, NextFunction } from 'express';
import { AptitudeService } from './aptitude.service';
import { sendResponse }    from '../../utils/response';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

const aptitudeService = new AptitudeService();
const PORTAL_SECRET   = env.jwt.accessSecret + '_portal';

function getPortalPayload(req: Request): any {
  const token = req.cookies?.portalToken || req.headers.authorization?.split(' ')[1];
  if (!token) throw new Error('Not authenticated');
  return jwt.verify(token, PORTAL_SECRET) as any;
}

// ─── HR ────────────────────────────────────────────────────────────────────
export async function createTest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await aptitudeService.createTest(req.user!.companyId, req.body, req.user!.userId);
    sendResponse(res, { data, message: 'Test created', statusCode: 201 });
  } catch (e) { next(e); }
}

export async function getTests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await aptitudeService.getTests(req.user!.companyId);
    sendResponse(res, { data, message: 'Tests fetched' });
  } catch (e) { next(e); }
}

export async function getTest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await aptitudeService.getTestById(parseInt(req.params.id, 10), req.user!.companyId);
    sendResponse(res, { data, message: 'Test fetched' });
  } catch (e) { next(e); }
}

export async function addQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await aptitudeService.addQuestion(parseInt(req.params.id, 10), req.user!.companyId, req.body);
    sendResponse(res, { data, message: 'Question added', statusCode: 201 });
  } catch (e) { next(e); }
}

export async function updateQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await aptitudeService.updateQuestion(parseInt(req.params.qid, 10), req.body);
    sendResponse(res, { data, message: 'Question updated' });
  } catch (e) { next(e); }
}

export async function deleteQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await aptitudeService.deleteQuestion(parseInt(req.params.qid, 10));
    sendResponse(res, { data: null, message: 'Question deleted' });
  } catch (e) { next(e); }
}

export async function getCandidateResult(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await aptitudeService.getCandidateResult(parseInt(req.params.id, 10), parseInt(req.params.candidateId, 10), req.user!.companyId);
    sendResponse(res, { data, message: 'Result fetched' });
  } catch (e) { next(e); }
}

// ─── Portal (candidate) ──────────────────────────────────────────────────────
export async function portalGetTest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { companyId } = getPortalPayload(req);
    const data = await aptitudeService.getTestForCandidate(parseInt(req.params.id, 10), companyId);
    sendResponse(res, { data, message: 'Test fetched' });
  } catch (e) { next(e); }
}

export async function portalSubmitTest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { candidateId, companyId } = getPortalPayload(req);
    const data = await aptitudeService.submitTest(
      parseInt(req.params.id, 10),
      candidateId, companyId,
      req.body.answers,
      req.body.time_taken ?? 0,
    );
    sendResponse(res, { data, message: data.message });
  } catch (e) { next(e); }
}
