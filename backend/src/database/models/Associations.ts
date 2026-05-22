import { User }            from './User';
import { Employee }        from './Employee';
import { Department }      from './Department';
import { Designation }     from './Designation';
import { Attendance }      from './Attendance';
import { LeaveType, LeaveRequest } from './LeaveModels';
import { Candidate }       from './Candidate';
import { AptitudeTest, AptitudeQuestion, CandidateAnswer } from './AptitudeTest';
import { PayrollRun, Payslip } from './PayrollModels';
import { Notification }    from './Notification';
import { ActivityLog }     from './ActivityLog';
import { Role, Permission, FieldPermission } from './RoleModels';

// ─── User ↔ Role ──────────────────────────────────────────────────────────────
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User,   { foreignKey: 'role_id', as: 'users' });

// ─── User ↔ Employee ──────────────────────────────────────────────────────────
User.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
Employee.hasOne(User,    { foreignKey: 'employee_id', as: 'user' });

// ─── Employee ↔ Department ────────────────────────────────────────────────────
Employee.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Department.hasMany(Employee,   { foreignKey: 'department_id', as: 'employees' });

// ─── Department ↔ Head / Parent / Children ────────────────────────────────────
Department.belongsTo(Employee,   { foreignKey: 'head_id',    as: 'head'     });
Department.belongsTo(Department, { foreignKey: 'parent_id',  as: 'parent'   });
Department.hasMany(Department,   { foreignKey: 'parent_id',  as: 'children' });

// ─── Employee ↔ Designation ───────────────────────────────────────────────────
Employee.belongsTo(Designation, { foreignKey: 'designation_id', as: 'designation' });
Designation.hasMany(Employee,   { foreignKey: 'designation_id', as: 'employees'   });
Designation.belongsTo(Department, { foreignKey: 'department_id', as: 'department'  });
Department.hasMany(Designation,   { foreignKey: 'department_id', as: 'designations' });

// ─── Employee ↔ Manager ───────────────────────────────────────────────────────
Employee.belongsTo(Employee, { foreignKey: 'reporting_manager_id', as: 'manager'  });
Employee.hasMany(Employee,   { foreignKey: 'reporting_manager_id', as: 'reportees' });

// ─── Employee ↔ Attendance ────────────────────────────────────────────────────
Employee.hasMany(Attendance,   { foreignKey: 'employee_id', as: 'attendance' });
Attendance.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee'   });

// ─── Employee ↔ LeaveRequest ──────────────────────────────────────────────────
Employee.hasMany(LeaveRequest,    { foreignKey: 'employee_id',   as: 'leaveRequests' });
LeaveRequest.belongsTo(Employee,  { foreignKey: 'employee_id',   as: 'employee'      });
LeaveRequest.belongsTo(LeaveType, { foreignKey: 'leave_type_id', as: 'leaveType'     });
LeaveType.hasMany(LeaveRequest,   { foreignKey: 'leave_type_id', as: 'requests'      });

// ─── PayrollRun ↔ Payslip ─────────────────────────────────────────────────────
PayrollRun.hasMany(Payslip,   { foreignKey: 'payroll_run_id', as: 'payslips'   });
Payslip.belongsTo(PayrollRun, { foreignKey: 'payroll_run_id', as: 'payrollRun' });
Employee.hasMany(Payslip,     { foreignKey: 'employee_id',    as: 'payslips'   });
Payslip.belongsTo(Employee,   { foreignKey: 'employee_id',    as: 'employee'   });

// ─── Role ↔ Permissions ───────────────────────────────────────────────────────
Role.belongsToMany(Permission, { through: 'role_permissions', foreignKey: 'role_id',       otherKey: 'permission_id', as: 'permissions'      });
Permission.belongsToMany(Role, { through: 'role_permissions', foreignKey: 'permission_id', otherKey: 'role_id',       as: 'roles'            });
Role.hasMany(FieldPermission,  { foreignKey: 'role_id', as: 'fieldPermissions' });
FieldPermission.belongsTo(Role,{ foreignKey: 'role_id', as: 'role'             });

// ─── AptitudeTest ↔ AptitudeQuestion (already done inside model file) ─────────
// Candidate ↔ CandidateAnswer ──────────────────────────────────────────────────
Candidate.hasMany(CandidateAnswer,   { foreignKey: 'candidate_id', as: 'aptitudeAnswers' });
CandidateAnswer.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate'       });

export {
  User, Employee, Department, Designation,
  Attendance, LeaveType, LeaveRequest,
  Candidate,
  AptitudeTest, AptitudeQuestion, CandidateAnswer,
  PayrollRun, Payslip,
  Notification, ActivityLog,
  Role, Permission, FieldPermission,
};