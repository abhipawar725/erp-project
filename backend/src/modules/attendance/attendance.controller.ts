import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';
import { sendResponse, sendPaginated } from '../../utils/response';

const attendanceService = new AttendanceService();

/**
 * GET /api/attendance/today-summary
 */
export async function getTodaySummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await attendanceService.getTodaySummary(req.user!.companyId);

    sendResponse(res, {
      data,
      message: 'Today attendance summary',
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/attendance/employee/:employeeId
 */
export async function getByEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const employeeId = parseInt(req.params.employeeId, 10);
    const month = Number(req.query.month ?? new Date().getMonth() + 1);
    const year = Number(req.query.year ?? new Date().getFullYear());

    const data = await attendanceService.getByEmployee(employeeId, month, year);

    sendResponse(res, {
      data,
      message: 'Attendance records fetched',
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/attendance
 */
export async function getAllAttendance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { data, meta } = await attendanceService.getAll(
      req.query as any,
      req.user!.companyId
    );

    sendPaginated(res, data, meta, 'Attendance records fetched');
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/attendance
 */
export async function markAttendance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { record, created } = await attendanceService.mark({
      ...req.body,
      created_by: req.user!.userId,
    });

    sendResponse(res, {
      data: record,
      message: created ? 'Attendance marked' : 'Attendance updated',
      statusCode: created ? 201 : 200,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/attendance/bulk
 */
export async function bulkMarkAttendance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await attendanceService.bulkMark(
      req.body.records,
      req.user!.userId
    );

    sendResponse(res, {
      data: result,
      message: `Bulk mark: ${result.success} succeeded, ${result.failed} failed`,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * PUT /api/attendance/:id
 */
export async function updateAttendance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const record = await attendanceService.update(
      parseInt(req.params.id, 10),
      req.body,
      req.user!.userId
    );

    sendResponse(res, {
      data: record,
      message: 'Attendance updated',
    });
  } catch (e) {
    next(e);
  }
}