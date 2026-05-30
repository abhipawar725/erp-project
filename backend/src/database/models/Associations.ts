import { User } from './User';
import { Employee } from './Employee';
import { Department } from './Department';
import { Designation } from './Designation';
import { Attendance } from './Attendance';
import { LeaveType, LeaveRequest } from './LeaveModels';
import { Candidate } from './Candidate';
import { AptitudeTest, AptitudeQuestion, CandidateAnswer } from './AptitudeTest';
import { PayrollRun, Payslip } from './PayrollModels';
import { Notification } from './Notification';
import { ActivityLog } from './ActivityLog';
import { Role, Permission, FieldPermission, RolePermission } from './RoleModels';
import { EmailBranding, EmailTemplate } from './EmailTemplate';
import {
  HrModule, FormDefinition, DynamicField, FieldOption,
  FieldPermissionV2, RoleAssignment,
} from './FormBuilder';
import { Company } from './Company';
import { PermissionGroup, GroupPermission, UserGroup } from './PermissionGroups';
import { UserModulePermission, UserFieldPermission } from './UserPermission';


// ─── Company ↔ User ──────────────────────────────────────────────────────────────
User.belongsTo(Company, {
  foreignKey: 'company_id',
  as: 'company',
});

Company.hasMany(User, {
  foreignKey: 'company_id',
  as: 'users',
});

// ─── User ↔ Role ──────────────────────────────────────────────────────────────
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

// ─── User ↔ Employee ──────────────────────────────────────────────────────────
User.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
Employee.hasOne(User, { foreignKey: 'employee_id', as: 'user' });

// ─── Employee ↔ Department ────────────────────────────────────────────────────
Employee.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Department.hasMany(Employee, { foreignKey: 'department_id', as: 'employees' });

// ─── Department ↔ Head / Parent / Children ────────────────────────────────────
Department.belongsTo(Department, { foreignKey: 'parent_id', as: 'parent' });
Department.hasMany(Department, { foreignKey: 'parent_id', as: 'children' });

// ─── Department ↔ Company ────────────────────────────────────
Department.belongsTo(Company, {
  foreignKey: 'company_id',
  as: 'company',
});

Company.hasMany(Department, {
  foreignKey: 'company_id',
  as: 'departments',
});

// ─── Employee ↔ Designation ───────────────────────────────────────────────────
Employee.belongsTo(Designation, { foreignKey: 'designation_id', as: 'designation' });
Designation.hasMany(Employee, { foreignKey: 'designation_id', as: 'employees' });
Designation.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Department.hasMany(Designation, { foreignKey: 'department_id', as: 'designations' });

// ─── Employee ↔ Manager ───────────────────────────────────────────────────────
Employee.belongsTo(Employee, { foreignKey: 'reporting_manager_id', as: 'manager' });
Employee.hasMany(Employee, { foreignKey: 'reporting_manager_id', as: 'reportees' });

// ─── Employee ↔ Attendance ────────────────────────────────────────────────────
Employee.hasMany(Attendance, { foreignKey: 'employee_id', as: 'attendance' });
Attendance.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// ─── Employee ↔ LeaveRequest ──────────────────────────────────────────────────
Employee.hasMany(LeaveRequest, { foreignKey: 'employee_id', as: 'leaveRequests' });
LeaveRequest.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
LeaveRequest.belongsTo(LeaveType, { foreignKey: 'leave_type_id', as: 'leaveType' });
LeaveType.hasMany(LeaveRequest, { foreignKey: 'leave_type_id', as: 'requests' });

// ─── Employee ↔ Company ──────────────────────────────────────────────────
Employee.belongsTo(Company, { foreignKey: 'company_id', as: 'company',});
Company.hasMany(Employee, { foreignKey: 'company_id', as: 'employees',});

// ─── PayrollRun ↔ Payslip ─────────────────────────────────────────────────────
PayrollRun.hasMany(Payslip, { foreignKey: 'payroll_run_id', as: 'payslips' });
Payslip.belongsTo(PayrollRun, { foreignKey: 'payroll_run_id', as: 'payrollRun' });
Employee.hasMany(Payslip, { foreignKey: 'employee_id', as: 'payslips' });
Payslip.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// ─── Role ↔ Permissions (many-to-many via role_permissions) ───────────────────
Role.belongsToMany(Permission, {
  through: RolePermission, foreignKey: 'role_id',
  otherKey: 'permission_id', as: 'permissions',
});
Permission.belongsToMany(Role, {
  through: RolePermission, foreignKey: 'permission_id',
  otherKey: 'role_id', as: 'roles',
});
RolePermission.belongsTo(Permission, { foreignKey: 'permission_id', as: 'permission' });
RolePermission.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// ─── Role ↔ FieldPermission (legacy field-level, module+field_name keyed) ─────
Role.hasMany(FieldPermission, { foreignKey: 'role_id', as: 'fieldPermissions' });
FieldPermission.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// ─── AptitudeTest associations (also defined inside AptitudeTest.ts) ──────────
Candidate.hasMany(CandidateAnswer, { foreignKey: 'candidate_id', as: 'aptitudeAnswers' });
CandidateAnswer.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });

// ─── Form Builder ─────────────────────────────────────────────────────────────
// HrModule ↔ FormDefinition
HrModule.hasMany(FormDefinition, { foreignKey: 'module_id', as: 'forms' });
FormDefinition.belongsTo(HrModule, { foreignKey: 'module_id', as: 'module' });

// FormDefinition ↔ DynamicField
FormDefinition.hasMany(DynamicField, { foreignKey: 'form_id', as: 'fields' });
DynamicField.belongsTo(FormDefinition, { foreignKey: 'form_id', as: 'form' });

// DynamicField ↔ FieldOption
DynamicField.hasMany(FieldOption, { foreignKey: 'field_id', as: 'options' });
FieldOption.belongsTo(DynamicField, { foreignKey: 'field_id', as: 'field' });

// DynamicField ↔ FieldPermissionV2 (new field-level RBAC keyed by field_id)
DynamicField.hasMany(FieldPermissionV2, { foreignKey: 'field_id', as: 'fieldPerms' });
FieldPermissionV2.belongsTo(DynamicField, { foreignKey: 'field_id', as: 'field' });

PermissionGroup.belongsToMany(Permission, { through: GroupPermission, foreignKey: 'group_id', otherKey: 'permission_id', as: 'permissions' });
Permission.belongsToMany(PermissionGroup, { through: GroupPermission, foreignKey: 'permission_id', otherKey: 'group_id', as: 'groups' });
GroupPermission.belongsTo(Permission,      { foreignKey: 'permission_id', as: 'permission' });
GroupPermission.belongsTo(PermissionGroup, { foreignKey: 'group_id',      as: 'group' });
PermissionGroup.belongsToMany(User, { through: UserGroup, foreignKey: 'group_id', otherKey: 'user_id', as: 'members' });
User.belongsToMany(PermissionGroup, { through: UserGroup, foreignKey: 'user_id',  otherKey: 'group_id', as: 'permissionGroups' });
UserGroup.belongsTo(PermissionGroup, { foreignKey: 'group_id', as: 'group' });
UserGroup.belongsTo(User,            { foreignKey: 'user_id',  as: 'user' });

export {
  User, Employee, Department, Designation,
  Attendance, LeaveType, LeaveRequest,
  Candidate,
  AptitudeTest, AptitudeQuestion, CandidateAnswer,
  PayrollRun, Payslip,
  Notification, ActivityLog,
  Role, Permission, FieldPermission, RolePermission,
  EmailBranding, EmailTemplate,
  HrModule, FormDefinition, DynamicField, FieldOption,
  FieldPermissionV2, RoleAssignment,
  Company,PermissionGroup, GroupPermission, UserGroup, UserModulePermission, UserFieldPermission
};