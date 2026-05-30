import { sequelize } from '../../config/database';

import { User } from './User';
import { Employee } from './Employee';
import { Department } from './Department';
import { Designation } from './Designation';
import { Attendance } from './Attendance';
import { LeaveType, LeaveRequest } from './LeaveModels';
import { Candidate } from './Candidate';
import {
  AptitudeTest,
  AptitudeQuestion,
  CandidateAnswer,
} from './AptitudeTest';
import { PayrollRun, Payslip } from './PayrollModels';
import { Notification } from './Notification';
import { ActivityLog } from './ActivityLog';
import { Role, Permission, FieldPermission } from './RoleModels';
import { PermissionGroup, GroupPermission, UserGroup } from './PermissionGroups';
import { UserModulePermission, UserFieldPermission } from './UserPermission';

// IMPORTANT
import './Associations';

export {
  sequelize,

  User, Employee, Department, Designation,
  Attendance, LeaveType, LeaveRequest,
  Candidate,
  AptitudeTest, AptitudeQuestion, CandidateAnswer,
  PayrollRun, Payslip,
  Notification, ActivityLog,
  Role, Permission, FieldPermission,PermissionGroup, GroupPermission, UserGroup,
  UserModulePermission, UserFieldPermission
};