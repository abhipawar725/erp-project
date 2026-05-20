import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from './department.service';
import { sendResponse } from '../../utils/response';

const departmentService = new DepartmentService();

// GET /api/departments
export async function getDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const depts = await departmentService.getAll(req.user!.companyId);
    sendResponse(res, { data: depts, message: 'Departments fetched' });
  } catch (e) { next(e); }
}

// GET /api/departments/:id
export async function getDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dept = await departmentService.getById(parseInt(req.params.id, 10), req.user!.companyId);
    sendResponse(res, { data: dept, message: 'Department fetched' });
  } catch (e) { next(e); }
}

// POST /api/departments
export async function createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dept = await departmentService.create(req.user!.companyId, req.body, req.user!.userId);
    sendResponse(res, { data: dept, message: 'Department created', statusCode: 201 });
  } catch (e) { next(e); }
}

// PUT /api/departments/:id
export async function updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dept = await departmentService.update(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      req.body,
      req.user!.userId,
    );
    sendResponse(res, { data: dept, message: 'Department updated' });
  } catch (e) { next(e); }
}

// DELETE /api/departments/:id
export async function deleteDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await departmentService.delete(parseInt(req.params.id, 10), req.user!.companyId, req.user!.userId);
    sendResponse(res, { data: null, message: 'Department deleted' });
  } catch (e) { next(e); }
}
