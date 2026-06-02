import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from './department.service';
import { sendResponse } from '../../utils/response';

const departmentService = new DepartmentService();

export async function getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await departmentService.getAll(req.user!.companyId, req.query as any);
    sendResponse(res, { data, message: 'Departments fetched' });
  } catch (e) { next(e); }
}

export async function getDepartmentStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await departmentService.getStats(req.user!.companyId);
    sendResponse(res, { data, message: 'Department stats' });
  } catch (e) { next(e); }
}

export async function getDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await departmentService.getById(parseInt(req.params.id, 10), req.user!.companyId);
    sendResponse(res, { data, message: 'Department fetched' });
  } catch (e) { next(e); }
}

export async function createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await departmentService.create(req.user!.companyId, req.body, req.user!.userId);
    sendResponse(res, { data, message: 'Department created successfully', statusCode: 201 });
  } catch (e) { next(e); }
}

export async function updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await departmentService.update(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      req.body,
      req.user!.userId,
    );
    sendResponse(res, { data, message: 'Department updated' });
  } catch (e) { next(e); }
}

export async function deleteDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await departmentService.delete(parseInt(req.params.id, 10), req.user!.companyId, req.user!.userId);
    sendResponse(res, { data: null, message: 'Department deleted' });
  } catch (e) { next(e); }
}
