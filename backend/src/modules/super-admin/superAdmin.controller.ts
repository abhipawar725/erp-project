import { Request, Response, NextFunction } from 'express';
import { sendResponse, sendPaginated } from '../../utils/response';
import { CompanyService } from "./superAdmin.service"


// ─── Company Service ──────────────────────────────────────────────────────────
const companySvc = new CompanyService();

// ─── Controllers ──────────────────────────────────────────────────────────────
export async function getPlatformStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await companySvc.getPlatformStats() }); } catch(e){ next(e); }
}
export async function listCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { rows, meta } = await companySvc.listCompanies(req.query as any); sendPaginated(res, rows, meta); } catch(e){ next(e); }
}
export async function getCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await companySvc.getCompanyById(+req.params.id) }); } catch(e){ next(e); }
}
export async function createCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await companySvc.createCompany(req.body, req.user!.employeeId), statusCode: 201 }); } catch(e){ next(e); }
}
export async function updateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await companySvc.updateCompany(+req.params.id, req.body, req.user!.employeeId) }); } catch(e){ next(e); }
}
export async function suspendCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await companySvc.suspend(+req.params.id, req.user!.employeeId) }); } catch(e){ next(e); }
}
export async function activateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await companySvc.activate(+req.params.id, req.user!.employeeId) }); } catch(e){ next(e); }
}