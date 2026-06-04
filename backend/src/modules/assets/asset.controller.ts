import { Request, Response, NextFunction } from 'express';
import { AssetService } from './asset.service';
import { sendResponse, sendPaginated, sendError } from '../../utils/response';

const svc = new AssetService();

// ─── Stats ────────────────────────────────────────────────────────────────────
export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.getDashboardStats(req.user!.companyId) }); } catch(e){ next(e); }
}

// ─── Categories ───────────────────────────────────────────────────────────────
export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.listCategories(req.user!.companyId) }); } catch(e){ next(e); }
}
export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.createCategory(req.user!.companyId, req.body, req.user!.employeeId), statusCode: 201 }); } catch(e){ next(e); }
}
export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.updateCategory(+req.params.id, req.user!.companyId, req.body, req.user!.employeeId) }); } catch(e){ next(e); }
}
export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.deleteCategory(+req.params.id, req.user!.companyId) }); } catch(e){ next(e); }
}

// ─── Assets ───────────────────────────────────────────────────────────────────
export async function listAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows, meta } = await svc.listAssets(req.user!.companyId, req.query as any);
    sendPaginated(res, rows, meta);
  } catch(e){ next(e); }
}
export async function getAssetById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.getAssetById(+req.params.id, req.user!.companyId) }); } catch(e){ next(e); }
}
export async function createAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.createAsset(req.user!.companyId, req.body, req.user!.employeeId), statusCode: 201, message: 'Asset created' }); } catch(e){ next(e); }
}
export async function updateAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.updateAsset(+req.params.id, req.user!.companyId, req.body, req.user!.employeeId), message: 'Asset updated' }); } catch(e){ next(e); }
}
export async function deleteAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.deleteAsset(+req.params.id, req.user!.companyId, req.user!.employeeId), message: 'Asset deleted' }); } catch(e){ next(e); }
}

// ─── Assignments ──────────────────────────────────────────────────────────────
export async function assignAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.assignAsset(req.user!.companyId, { ...req.body, assigned_by: req.user!.employeeId });
    sendResponse(res, { data, statusCode: 201, message: 'Asset assigned' });
  } catch(e){ next(e); }
}
export async function returnAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.returnAsset(+req.params.assignmentId, req.user!.companyId, { ...req.body, returned_by: req.user!.employeeId });
    sendResponse(res, { data, message: 'Asset returned' });
  } catch(e){ next(e); }
}
export async function getEmployeeAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.getEmployeeAssets(+req.params.employeeId, req.user!.companyId) }); } catch(e){ next(e); }
}

// ─── Requests ─────────────────────────────────────────────────────────────────
export async function listRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows, meta } = await svc.listRequests(req.user!.companyId, req.query as any);
    sendPaginated(res, rows, meta);
  } catch(e){ next(e); }
}
export async function createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // employee_id: use from body (HR creating for someone) or current employee
    const data = await svc.createRequest(req.user!.companyId, {
      ...req.body,
      employee_id: req.body.employee_id || req.user!.employeeId,
    });
    sendResponse(res, { data, statusCode: 201, message: 'Request submitted' });
  } catch(e){ next(e); }
}
export async function approveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.approveRequest(+req.params.id, req.user!.companyId, {
      ...req.body,
      approved_by: req.user!.employeeId,
    });
    sendResponse(res, { data, message: 'Request approved' });
  } catch(e){ next(e); }
}

// ─── Maintenance ──────────────────────────────────────────────────────────────
export async function listMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows, meta } = await svc.listMaintenance(req.user!.companyId, req.query as any);
    sendPaginated(res, rows, meta);
  } catch(e){ next(e); }
}
export async function createMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendResponse(res, { data: await svc.createMaintenance(req.user!.companyId, req.body, req.user!.employeeId), statusCode: 201 }); } catch(e){ next(e); }
}
export async function completeMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.completeMaintenance(+req.params.id, req.user!.companyId, {
      ...req.body,
      completed_by: req.user!.employeeId,
    });
    sendResponse(res, { data, message: 'Maintenance completed' });
  } catch(e){ next(e); }
}
