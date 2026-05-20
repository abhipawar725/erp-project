import { Request, Response, NextFunction } from 'express';
import { PayrollService } from './payroll.service';
import { sendResponse } from '../../utils/response';

const payrollService = new PayrollService();

// GET /api/payroll/runs
export async function getPayrollRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const runs = await payrollService.getRuns(req.user!.companyId);
    sendResponse(res, { data: runs, message: 'Payroll runs fetched' });
  } catch (e) { next(e); }
}

// GET /api/payroll/runs/:id
export async function getPayrollRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const run = await payrollService.getRunById(parseInt(req.params.id, 10), req.user!.companyId);
    sendResponse(res, { data: run, message: 'Payroll run fetched' });
  } catch (e) { next(e); }
}

// POST /api/payroll/runs
export async function createPayrollRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const run = await payrollService.createRun(req.user!.companyId, req.body.month, req.body.year, req.user!.userId);
    sendResponse(res, { data: run, message: 'Payroll run created', statusCode: 201 });
  } catch (e) { next(e); }
}

// PUT /api/payroll/runs/:id/submit
export async function submitPayrollRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const run = await payrollService.submitRun(parseInt(req.params.id, 10), req.user!.companyId, req.user!.userId);
    sendResponse(res, { data: run, message: 'Payroll submitted for approval' });
  } catch (e) { next(e); }
}

// PUT /api/payroll/runs/:id/approve
export async function approvePayrollRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const run = await payrollService.approveRun(parseInt(req.params.id, 10), req.user!.companyId, req.user!.userId);
    sendResponse(res, { data: run, message: 'Payroll run approved' });
  } catch (e) { next(e); }
}

// PUT /api/payroll/runs/:id/disburse
export async function disbursePayrollRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const run = await payrollService.disburseRun(parseInt(req.params.id, 10), req.user!.companyId, req.user!.userId);
    sendResponse(res, { data: run, message: 'Payroll disbursed successfully' });
  } catch (e) { next(e); }
}

// GET /api/payroll/payslips/:employeeId
export async function getPayslips(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payslips = await payrollService.getPayslips(parseInt(req.params.employeeId, 10), req.user!.companyId);
    sendResponse(res, { data: payslips, message: 'Payslips fetched' });
  } catch (e) { next(e); }
}

// GET /api/payroll/payslips/detail/:id
export async function getPayslip(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payslip = await payrollService.getPayslipById(parseInt(req.params.id, 10), req.user!.companyId);
    sendResponse(res, { data: payslip, message: 'Payslip fetched' });
  } catch (e) { next(e); }
}
