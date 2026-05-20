import { Request, Response, NextFunction } from 'express';
import { LeaveService } from './leave.service';
import { sendResponse, sendPaginated } from '../../utils/response';

const leaveService = new LeaveService();

// GET /api/leaves
export async function getLeaves(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows, meta } = await leaveService.getAll(req.query as any, req.user!.companyId);
    sendPaginated(res, rows, meta, 'Leave requests fetched');
  } catch (e) { next(e); }
}

// GET /api/leaves/pending — pending approvals for current manager
export async function getPendingLeaves(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const leaves = await leaveService.getPendingForManager(req.user!.userId, req.user!.companyId);
    sendResponse(res, { data: leaves, message: 'Pending leave requests' });
  } catch (e) { next(e); }
}

// GET /api/leaves/types
export async function getLeaveTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const types = await leaveService.getLeaveTypes(req.user!.companyId);
    sendResponse(res, { data: types, message: 'Leave types fetched' });
  } catch (e) { next(e); }
}

// POST /api/leaves — apply
export async function applyLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const leave = await leaveService.apply(req.body, req.user!.companyId);
    sendResponse(res, { data: leave, message: 'Leave request submitted', statusCode: 201 });
  } catch (e) { next(e); }
}

// PUT /api/leaves/:id/approve
export async function approveLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const leave = await leaveService.approve(parseInt(req.params.id, 10), req.user!.userId, req.user!.companyId);
    sendResponse(res, { data: leave, message: 'Leave approved' });
  } catch (e) { next(e); }
}

// PUT /api/leaves/:id/reject
export async function rejectLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const leave = await leaveService.reject(
      parseInt(req.params.id, 10),
      req.user!.userId,
      req.user!.companyId,
      req.body.reason,
    );
    sendResponse(res, { data: leave, message: 'Leave rejected' });
  } catch (e) { next(e); }
}

// PUT /api/leaves/:id/cancel
export async function cancelLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const leave = await leaveService.cancel(parseInt(req.params.id, 10), req.user!.userId, req.user!.companyId);
    sendResponse(res, { data: leave, message: 'Leave cancelled' });
  } catch (e) { next(e); }
}
