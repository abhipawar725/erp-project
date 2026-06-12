import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { sendResponse, sendError, sendPaginated } from '../../utils/response';
import { employeeService } from './employee.service';
import type { StepKey } from './employee.constants';
import { AppError } from '../../middleware/errorHandler.middleware';

// ─── Multer (bulk upload only — in-memory) ────────────────────────────────────
const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) cb(null, true);
    else cb(new AppError('Only Excel/CSV files allowed', 400));
  },
}).single('file');

// ─── Validation error extractor ───────────────────────────────────────────────
function checkErrors(req: Request, res: Response): boolean {
  const errs = validationResult(req);
  if (errs.isEmpty()) return false;
  const map: Record<string, string[]> = {};
  errs.array().forEach(e => {
    const f = (e as any).path || 'general';
    (map[f] = map[f] || []).push(e.msg);
  });
  sendError(res, 'Validation failed', 422, map);
  return true;
}


export const employeeController = {

async getAll(req: Request, res: Response) {
    if (checkErrors(req, res)) return;
    const result = await employeeService.getAll(
      req.query as any,
      req.user!.companyId,
      req.user!.roleId,
      req.user!.isSuperAdmin,
    );
    sendPaginated(res, result.rows, result.meta);
  },

  async getById(req: Request, res: Response) {
    if (checkErrors(req, res)) return;
    const emp = await employeeService.getById(
      Number(req.params.id),
      req.user!.companyId,
      req.user!.roleId,
      req.user!.isSuperAdmin,
    );
    sendResponse(res, { data: emp });
  },

  async create(req: Request, res: Response) {
    if (checkErrors(req, res)) return;
    const emp = await employeeService.create(
      { ...req.body, company_id: req.user!.companyId },
      req.user!.employeeId,
      req.ip,
    );
    sendResponse(res, { data: emp, message: 'Employee created', statusCode: 201 });
  },

  async updateStep(req: Request, res: Response) {
    if (checkErrors(req, res)) return;
    const step = req.params.step as StepKey;
    const emp = await employeeService.updateStep(
      Number(req.params.id),
      req.user!.companyId,
      step,
      req.body,
      req.user!.employeeId,
      req.ip,
    );
    sendResponse(res, { data: emp, message: `${step} saved` });
  },

  async remove(req: Request, res: Response) {
    if (checkErrors(req, res)) return;
    await employeeService.delete(Number(req.params.id), req.user!.companyId, req.user!.employeeId);
    sendResponse(res, { data: null, message: 'Employee removed' });
  },

  async nextCode(req: Request, res: Response) {
    const codes = await employeeService.getNextCode(req.user!.companyId);
    sendResponse(res, { data: codes });
  },

  async managersSearch(req: Request, res: Response) {
    const { q, exclude } = req.query;
    if (!q || String(q).trim().length < 2) {
      sendResponse(res, { data: [] });
      return; 
    }
    const results = await employeeService.searchManagers(
      String(q).trim(),
      req.user!.companyId,
      exclude ? Number(exclude) : undefined,
    );
    sendResponse(res, { data: results });
  },

  async managerById(req: Request, res: Response) {
    const mgr = await employeeService.getManagerById(
      Number(req.params.id),
      req.user!.companyId,
    );
    sendResponse(res, { data: mgr });
  },

  async fieldPermissions(req: Request, res: Response) {
    const perms = await employeeService.getFieldPermissions(req.user!.roleId);
    sendResponse(res, { data: perms });
  },

  async summary(req: Request, res: Response) {
    const s = await employeeService.getSummary(req.user!.companyId);
    sendResponse(res, { data: s });
  },

  async saveDraft(req: Request, res: Response) {
    const draft = await employeeService.saveDraft({
      employeeId: req.body.employee_id ?? null,
      actorId:    req.user!.employeeId,
      step:       req.body.step,
      formData:   req.body.form_data,
      sessionId:  req.body.session_id,
    });
    sendResponse(res, { data: draft, message: 'Draft saved' });
  },

  async getDraft(req: Request, res: Response) {
    const draft = await employeeService.getDraft(req.params.sessionId, req.user!.employeeId);
    sendResponse(res, { data: draft });
  },

  async discardDraft(req: Request, res: Response) {
    await employeeService.discardDraft(req.params.sessionId, req.user!.employeeId);
    sendResponse(res, { data: null, message: 'Draft discarded' });
  },

  bulkUpload: [
    (req: Request, res: Response, next: NextFunction) => uploadMem(req as any, res as any, next),
    async (req: Request, res: Response) => {
      if (!req.file) { sendError(res, 'No file uploaded', 400); return; }
      const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = xlsx.utils.sheet_to_json(ws, { defval: '' });
      if (!rows.length) { sendError(res, 'File is empty', 400); return; }
      if (rows.length > 500) { sendError(res, 'Max 500 rows per upload', 400); return; }
      const result = await employeeService.bulkUpload(rows, req.user!.companyId, req.user!.employeeId);
      sendResponse(res, { data: result, message: `${result.success} imported, ${result.failed} failed`, statusCode: result.failed > 0 ? 207 : 201 });
    },
  ],

  downloadTemplate(_req: Request, res: Response) {
    const headers = [
      'first_name*', 'last_name*', 'employment_type (Permanent/Contractual)',
      'working_city', 'actual_doj (YYYY-MM-DD)', 'department', 'designation',
    ];
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet([
      headers,
      ['Rahul', 'Sharma', 'Permanent', 'Mumbai', '2024-01-15', 'Commercial', 'Executive'],
    ]);
    xlsx.utils.book_append_sheet(wb, ws, 'Employees');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="employee_import_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  },
};