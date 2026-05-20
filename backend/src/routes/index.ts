import { Router } from 'express';

import authRoutes          from '../modules/auth/auth.routes';
import employeeRoutes      from '../modules/employees/employee.routes';
import departmentRoutes    from '../modules/departments/department.routes';
import designationRoutes   from '../modules/designations/designation.routes';
import attendanceRoutes    from '../modules/attendance/attendance.routes';
import leaveRoutes         from '../modules/leaves/leave.routes';
import payrollRoutes       from '../modules/payroll/payroll.routes';
import notificationRoutes  from '../modules/notifications/notification.routes';
import logsRoutes          from '../modules/compliance/activity.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'NexHR API is running', version: '1.0.0', timestamp: new Date().toISOString() });
});

router.use('/auth',          authRoutes);
router.use('/employees',     employeeRoutes);
router.use('/departments',   departmentRoutes);
router.use('/designations',  designationRoutes);
router.use('/attendance',    attendanceRoutes);
router.use('/leaves',        leaveRoutes);
router.use('/payroll',       payrollRoutes);
router.use('/notifications', notificationRoutes);
router.use('/logs',          logsRoutes);

export default router;
