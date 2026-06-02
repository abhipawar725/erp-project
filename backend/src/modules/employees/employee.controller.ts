import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { EmployeeService } from './employee.service';
import { sendResponse, sendError, sendPaginated } from '../../utils/response';

const employeeService = new EmployeeService();

// ─── GET /api/employees ───────────────────────────────────────────────────────
export async function getEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const canViewSensitive = ['hr', 'admin'].includes(req.user!.roleSlug);
    const { rows, meta } = await employeeService.findAll(
      req.query as any,
      req.user!.companyId,
      canViewSensitive,
    );
    sendPaginated(res, rows, meta, 'Employees fetched successfully');
  } catch (e) { next(e); }
}

// ─── GET /api/employees/next-code ─────────────────────────────────────────────
export async function getNextCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const code = await employeeService.generateNextCode(req.user!.companyId);
    sendResponse(res, { data: { code }, message: 'Next employee code generated' });
  } catch (e) { next(e); }
}

// ─── GET /api/employees/summary ───────────────────────────────────────────────
export async function getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await employeeService.getSummary(req.user!.companyId);
    sendResponse(res, { data, message: 'Employee summary fetched' });
  } catch (e) { next(e); }
}

// ─── GET /api/employees/:id ───────────────────────────────────────────────────
export async function getEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const canViewSensitive = ['hr', 'admin'].includes(req.user!.roleSlug);
    const employee = await employeeService.findById(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      canViewSensitive,
    );
    sendResponse(res, { data: employee, message: 'Employee fetched' });
  } catch (e) { next(e); }
}

// ─── POST /api/employees ──────────────────────────────────────────────────────
export async function createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString();
    const employee = await employeeService.create(
      { ...req.body, company_id: req.user!.companyId },
      req.user!.userId,
      ip,
    );
    sendResponse(res, { data: employee, message: 'Employee created successfully', statusCode: 201 });
  } catch (e) { next(e); }
}

// ─── PUT /api/employees/:id ───────────────────────────────────────────────────
export async function updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString();
    const employee = await employeeService.update(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      req.body,
      req.user!.userId,
      ip,
    );
    sendResponse(res, { data: employee, message: 'Employee updated successfully' });
  } catch (e) { next(e); }
}

// ─── PATCH /api/employees/:id/step/:step ──────────────────────────────────────
// Allows saving individual wizard steps without completing all fields
export async function patchEmployeeStep(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const step = req.params.step as any;
    const validSteps = ['basic', 'employment', 'address', 'statutory', 'bank'];
    if (!validSteps.includes(step)) {
      sendError(res, `Invalid step. Must be one of: ${validSteps.join(', ')}`, 400);
      return;
    }
    const employee = await employeeService.patchStep(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      step,
      req.body,
      req.user!.userId,
    );
    sendResponse(res, { data: employee, message: `Step "${step}" saved successfully` });
  } catch (e) { next(e); }
}

// ─── DELETE /api/employees/:id ────────────────────────────────────────────────
export async function deleteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await employeeService.delete(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      req.user!.userId,
    );
    sendResponse(res, { data: null, message: 'Employee removed successfully' });
  } catch (e) { next(e); }
}

// ─── POST /api/employees/:id/avatar ───────────────────────────────────────────
export async function uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      sendError(res, 'No file uploaded', 400);
      return;
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    const employee = await employeeService.updateAvatar(
      parseInt(req.params.id, 10),
      req.user!.companyId,
      avatarUrl,
      req.user!.userId,
    );
    sendResponse(res, { data: { avatar_url: avatarUrl, employee }, message: 'Avatar uploaded successfully' });
  } catch (e) { next(e); }
}
