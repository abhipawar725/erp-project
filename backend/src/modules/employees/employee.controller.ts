import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from './employee.service';
import { sendResponse, sendError, sendPaginated } from '../../utils/response';

const svc = new EmployeeService();

export async function getEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rows, meta } = await svc.findAll(req.query as any, req.user!.companyId);
    sendPaginated(res, rows, meta, 'Employees fetched');
  } catch(e){ next(e); }
}

export async function getEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employee = await svc.findById(parseInt(req.params.id), req.user!.companyId);
    sendResponse(res, { data: employee, message: 'Employee fetched' });
  } catch(e){ next(e); }
}

export async function createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employee = await svc.create({
      ...req.body,
      company_id:  req.user!.companyId,
      created_by:  req.user!.employeeId,   // ← was userId
    });
    sendResponse(res, { data: employee, message: 'Employee created', statusCode: 201 });
  } catch(e){ next(e); }
}

export async function updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employee = await svc.update(
      parseInt(req.params.id),
      req.user!.companyId,
      req.body,
      req.user!.employeeId,                // ← was userId
    );
    sendResponse(res, { data: employee, message: 'Employee updated' });
  } catch(e){ next(e); }
}

export async function deleteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.delete(parseInt(req.params.id), req.user!.companyId, req.user!.employeeId); // ← was userId
    sendResponse(res, { data: null, message: 'Employee deleted' });
  } catch(e){ next(e); }
}
