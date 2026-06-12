import { sequelize } from '../../config/database';

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
import { CompanyManager } from './CompanyManager';
import { EmployeePermission } from './EmployeePermission';
import { EmployeeExperience, EmployeeExit, EmployeeOnboardingDocs, EmployeeTransfer, EmployeeCommitmentProbation, EmployeeAddress, EmployeeAssetDeduction, EmployeeBankDetail, EmployeeEducation, EmployeeSchemes, EmployeePersonal, EmployeeFamily, EmployeeEmergencyContact, EmployeeStatutory, EmployeeSalary } from './Employee';

// IMPORTANT
import './Associations';

export {
  sequelize,

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
  CompanyManager,   EmployeePermission, EmployeeExperience, EmployeeExit, EmployeeOnboardingDocs, EmployeeTransfer, EmployeeCommitmentProbation, EmployeeAddress, EmployeeAssetDeduction, EmployeeBankDetail, EmployeeEducation, EmployeeSchemes, EmployeePersonal, EmployeeFamily, EmployeeEmergencyContact, EmployeeStatutory, EmployeeSalary
};