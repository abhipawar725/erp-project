import { Request, Response, NextFunction } from 'express';
import { DesignationService } from './designation.service';
import { sendResponse } from '../../utils/response';

const designationService = new DesignationService();

// GET /api/designations
export async function getDesignations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await designationService.getAll(req.user!.companyId, req.query as any);
    sendResponse(res, { data, message: 'Designations fetched' });
  } catch (e) { next(e); }
}

// GET /api/designations/stats
export async function getDesignationStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await designationService.getStats(req.user!.companyId);
    sendResponse(res, { data, message: 'Designation stats' });
  } catch (e) { next(e); }
}

// GET /api/designations/:id
export async function getDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await designationService.getById(parseInt(req.params.id, 10), req.user!.companyId);
    sendResponse(res, { data, message: 'Designation fetched' });
  } catch (e) { next(e); }
}

// POST /api/designations
export async function createDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await designationService.create(req.user!.companyId, req.body, req.user!.userId);
    sendResponse(res, { data, message: 'Designation created', statusCode: 201 });
  } catch (e) { next(e); }
}

// PUT /api/designations/:id
export async function updateDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await designationService.update(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      req.body,
      req.user!.userId,
    );
    sendResponse(res, { data, message: 'Designation updated' });
  } catch (e) { next(e); }
}

// PATCH /api/designations/:id/toggle
export async function toggleDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await designationService.toggleActive(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      req.user!.userId,
    );
    sendResponse(res, { data, message: `Designation ${data.is_active ? 'activated' : 'deactivated'}` });
  } catch (e) { next(e); }
}

// DELETE /api/designations/:id
export async function deleteDesignation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await designationService.delete(parseInt(req.params.id, 10), req.user!.companyId, req.user!.userId);
    sendResponse(res, { data: null, message: 'Designation deleted' });
  } catch (e) { next(e); }
}
