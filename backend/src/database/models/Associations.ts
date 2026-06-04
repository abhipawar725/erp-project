// ─── Core ─────────────────────────────────────────────────────────────────────
import { Employee }    from './Employee';
import { Company }     from './Company';
import { Department }  from './Department';
import { Designation } from './Designation';

// ─── Auth (new — employee-as-identity) ───────────────────────────────────────
import {
  OtpRequest,
  EmployeeRole,
  RoleTemplate,
  RoleTemplatePermission,
} from './AuthModels';

// ─── Roles & Permissions ──────────────────────────────────────────────────────
import {
  Role,
  Permission,
  FieldPermission,
  RolePermission,
  RoleModulePermission,
} from './RoleModels';

// ─── HR Modules ───────────────────────────────────────────────────────────────
import { Attendance }                                    from './Attendance';
import { LeaveType, LeaveRequest }                       from './LeaveModels';
import { Candidate }                                     from './Candidate';
import { AptitudeTest, AptitudeQuestion, CandidateAnswer } from './AptitudeTest';
import { PayrollRun, Payslip }                           from './PayrollModels';
import { Notification }                                  from './Notification';
import { ActivityLog }                                   from './ActivityLog';
import { EmailBranding, EmailTemplate }                  from './EmailTemplate';
import {
  HrModule, FormDefinition, DynamicField, FieldOption,
  FieldPermissionV2, RoleAssignment,
}                                                        from './FormBuilder';
import { UserModulePermission, UserFieldPermission }     from './UserPermission';
import {
  PermissionGroup,
  GroupPermission,
  UserGroup,
}                                                        from './PermissionGroups';
import {
  Asset, AssetCategory, AssetAssignment,
  AssetRequest, AssetMaintenance,
}                                                        from './AssetModels';


// ─── Company ──────────────────────────────────────────────────────────────────
Employee.belongsTo(Company,  { foreignKey: 'company_id', as: 'company'   });
Company.hasMany(Employee,    { foreignKey: 'company_id', as: 'employees' });

// ─── Employee ↔ Department ────────────────────────────────────────────────────
Employee.belongsTo(Department,  { foreignKey: 'department_id',  as: 'department'  });
Department.hasMany(Employee,    { foreignKey: 'department_id',  as: 'employees'   });

// ─── Employee ↔ Designation ───────────────────────────────────────────────────
Employee.belongsTo(Designation, { foreignKey: 'designation_id', as: 'designation' });
Designation.hasMany(Employee,   { foreignKey: 'designation_id', as: 'employees'   });

// ─── Employee ↔ Manager (self-referential) ───────────────────────────────────
Employee.belongsTo(Employee, { foreignKey: 'reporting_manager_id', as: 'manager'   });
Employee.hasMany(Employee,   { foreignKey: 'reporting_manager_id', as: 'reportees' });

// ─── Department hierarchy ─────────────────────────────────────────────────────
Department.belongsTo(Employee,   { foreignKey: 'head_id',   as: 'head'     });
Department.belongsTo(Department, { foreignKey: 'parent_id', as: 'parent'   });
Department.hasMany(Department,   { foreignKey: 'parent_id', as: 'children' });

Designation.belongsTo(Department, { foreignKey: 'department_id', as: 'department'   });
Department.hasMany(Designation,   { foreignKey: 'department_id', as: 'designations' });

// ─── OTP Requests (auth log) ──────────────────────────────────────────────────
Employee.hasMany(OtpRequest,   { foreignKey: 'employee_id', as: 'otpRequests' });
OtpRequest.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee'   });

// ─── Employee ↔ Role (many-to-many via employee_roles) ───────────────────────
//
// This is the KEY association that was missing and caused:
// "Role is not associated to EmployeeRole!"
//
Employee.belongsToMany(Role, {
  through:    EmployeeRole,
  foreignKey: 'employee_id',
  otherKey:   'role_id',
  as:         'roles',
});
Role.belongsToMany(Employee, {
  through:    EmployeeRole,
  foreignKey: 'role_id',
  otherKey:   'employee_id',
  as:         'employees',
});

// EmployeeRole direct associations (needed for include: [{ model: Role, as: 'role' }])
EmployeeRole.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
EmployeeRole.belongsTo(Role,     { foreignKey: 'role_id',     as: 'role'     });
Employee.hasMany(EmployeeRole,   { foreignKey: 'employee_id', as: 'employeeRoles' });
Role.hasMany(EmployeeRole,       { foreignKey: 'role_id',     as: 'employeeRoles' });

// ─── Role ↔ RoleModulePermission ──────────────────────────────────────────────
Role.hasMany(RoleModulePermission,          { foreignKey: 'role_id', as: 'modulePermissions' });
RoleModulePermission.belongsTo(Role,        { foreignKey: 'role_id', as: 'role'              });

// ─── Role ↔ Permission (slug-based, legacy) ───────────────────────────────────
Role.belongsToMany(Permission, {
  through: RolePermission, foreignKey: 'role_id',
  otherKey: 'permission_id', as: 'permissions',
});
Permission.belongsToMany(Role, {
  through: RolePermission, foreignKey: 'permission_id',
  otherKey: 'role_id', as: 'roles',
});
RolePermission.belongsTo(Permission, { foreignKey: 'permission_id', as: 'permission' });
RolePermission.belongsTo(Role,       { foreignKey: 'role_id',       as: 'role'       });

// ─── Role ↔ FieldPermission ───────────────────────────────────────────────────
Role.hasMany(FieldPermission,    { foreignKey: 'role_id', as: 'fieldPermissions' });
FieldPermission.belongsTo(Role,  { foreignKey: 'role_id', as: 'role'             });

// ─── RoleTemplate ↔ RoleTemplatePermission ───────────────────────────────────
RoleTemplate.hasMany(RoleTemplatePermission,    { foreignKey: 'template_id', as: 'permissions' });
RoleTemplatePermission.belongsTo(RoleTemplate,  { foreignKey: 'template_id', as: 'template'    });

// ─── Role ↔ RoleTemplate ─────────────────────────────────────────────────────
Role.belongsTo(RoleTemplate,   { foreignKey: 'template_id', as: 'template' });
RoleTemplate.hasMany(Role,     { foreignKey: 'template_id', as: 'roles'    });

// ─── Attendance ───────────────────────────────────────────────────────────────
Employee.hasMany(Attendance,   { foreignKey: 'employee_id', as: 'attendance' });
Attendance.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee'   });

// ─── Leave ────────────────────────────────────────────────────────────────────
Employee.hasMany(LeaveRequest,    { foreignKey: 'employee_id',   as: 'leaveRequests' });
LeaveRequest.belongsTo(Employee,  { foreignKey: 'employee_id',   as: 'employee'      });
LeaveRequest.belongsTo(LeaveType, { foreignKey: 'leave_type_id', as: 'leaveType'     });
LeaveType.hasMany(LeaveRequest,   { foreignKey: 'leave_type_id', as: 'requests'      });

// ─── Payroll ──────────────────────────────────────────────────────────────────
PayrollRun.hasMany(Payslip,   { foreignKey: 'payroll_run_id', as: 'payslips'   });
Payslip.belongsTo(PayrollRun, { foreignKey: 'payroll_run_id', as: 'payrollRun' });
Employee.hasMany(Payslip,     { foreignKey: 'employee_id',    as: 'payslips'   });
Payslip.belongsTo(Employee,   { foreignKey: 'employee_id',    as: 'employee'   });

// ─── Candidates ───────────────────────────────────────────────────────────────
Candidate.hasMany(CandidateAnswer,   { foreignKey: 'candidate_id', as: 'aptitudeAnswers' });
CandidateAnswer.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate'       });

// ─── Form Builder ─────────────────────────────────────────────────────────────
HrModule.hasMany(FormDefinition,      { foreignKey: 'module_id', as: 'forms'  });
FormDefinition.belongsTo(HrModule,    { foreignKey: 'module_id', as: 'module' });
FormDefinition.hasMany(DynamicField,  { foreignKey: 'form_id',   as: 'fields' });
DynamicField.belongsTo(FormDefinition,{ foreignKey: 'form_id',   as: 'form'   });
DynamicField.hasMany(FieldOption,     { foreignKey: 'field_id',  as: 'options'});
FieldOption.belongsTo(DynamicField,   { foreignKey: 'field_id',  as: 'field'  });
DynamicField.hasMany(FieldPermissionV2, { foreignKey: 'field_id', as: 'fieldPerms' });
FieldPermissionV2.belongsTo(DynamicField, { foreignKey: 'field_id', as: 'field' });

// ─── PermissionGroup ↔ Permission (via GroupPermission) ──────────────────────
PermissionGroup.belongsToMany(Permission, {
  through:    GroupPermission,
  foreignKey: 'group_id',
  otherKey:   'permission_id',
  as:         'permissions',
});
Permission.belongsToMany(PermissionGroup, {
  through:    GroupPermission,
  foreignKey: 'permission_id',
  otherKey:   'group_id',
  as:         'groups',
});
GroupPermission.belongsTo(PermissionGroup, { foreignKey: 'group_id',      as: 'group'      });
GroupPermission.belongsTo(Permission,      { foreignKey: 'permission_id', as: 'permission' });
PermissionGroup.hasMany(GroupPermission,   { foreignKey: 'group_id',      as: 'groupPermissions' });

// ─── PermissionGroup ↔ Employee (via UserGroup) ───────────────────────────────
// UserGroup.employee_id links to Employee (was user_id — migrated)
PermissionGroup.belongsToMany(Employee, {
  through:    UserGroup,
  foreignKey: 'group_id',
  otherKey:   'employee_id',
  as:         'members',
});
Employee.belongsToMany(PermissionGroup, {
  through:    UserGroup,
  foreignKey: 'employee_id',
  otherKey:   'group_id',
  as:         'permissionGroups',
});
UserGroup.belongsTo(PermissionGroup, { foreignKey: 'group_id',    as: 'group'    });
UserGroup.belongsTo(Employee,        { foreignKey: 'employee_id', as: 'employee' });
PermissionGroup.hasMany(UserGroup,   { foreignKey: 'group_id',    as: 'userGroups' });
Employee.hasMany(UserGroup,          { foreignKey: 'employee_id', as: 'userGroups' });

// ─── Assets ───────────────────────────────────────────────────────────────────
AssetAssignment.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee'       });
Employee.hasMany(AssetAssignment,   { foreignKey: 'employee_id', as: 'assetAssignments'});
AssetRequest.belongsTo(Employee,    { foreignKey: 'employee_id', as: 'employee'        });
Employee.hasMany(AssetRequest,      { foreignKey: 'employee_id', as: 'assetRequests'   });

export {
  // Auth / Identity
  Employee, OtpRequest, EmployeeRole,
  RoleTemplate, RoleTemplatePermission,

  // Org structure
  Company, Department, Designation,

  // Roles & Permissions
  Role, Permission, FieldPermission,
  RolePermission, RoleModulePermission,

  // HR modules
  Attendance,
  LeaveType, LeaveRequest,
  Candidate,
  AptitudeTest, AptitudeQuestion, CandidateAnswer,
  PayrollRun, Payslip,
  Notification, ActivityLog,
  EmailBranding, EmailTemplate,
  HrModule, FormDefinition, DynamicField, FieldOption,
  FieldPermissionV2, RoleAssignment,
  UserModulePermission, UserFieldPermission,
  PermissionGroup, GroupPermission, UserGroup,
  Asset, AssetCategory, AssetAssignment, AssetRequest, AssetMaintenance,
};
