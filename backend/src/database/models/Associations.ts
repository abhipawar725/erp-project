import { Company } from "./Company";
import { User } from "./User";
import { Role } from "./RoleModels";
import { Employee } from "./Employee";
import { Department } from "./Department";
import { Designation } from "./Designation";
import { LeaveType } from "./LeaveModels";

// ======================================================
// COMPANY RELATIONS
// ======================================================

// Company -> Users
Company.hasMany(User, {
  foreignKey: "company_id",
  as: "users",
});

User.belongsTo(Company, {
  foreignKey: "company_id",
  as: "company",
});

// Company -> Employees
Company.hasMany(Employee, {
  foreignKey: "company_id",
  as: "employees",
});

Employee.belongsTo(Company, {
  foreignKey: "company_id",
  as: "company",
});

// Company -> Roles
Company.hasMany(Role, {
  foreignKey: "company_id",
  as: "roles",
});

Role.belongsTo(Company, {
  foreignKey: "company_id",
  as: "company",
});

// Company -> Departments
Company.hasMany(Department, {
  foreignKey: "company_id",
  as: "departments",
});

Department.belongsTo(Company, {
  foreignKey: "company_id",
  as: "company",
});

// Company -> Designations
Company.hasMany(Designation, {
  foreignKey: "company_id",
  as: "designations",
});

Designation.belongsTo(Company, {
  foreignKey: "company_id",
  as: "company",
});

// Company -> Leave Types
Company.hasMany(LeaveType, {
  foreignKey: "company_id",
  as: "leaveTypes",
});

LeaveType.belongsTo(Company, {
  foreignKey: "company_id",
  as: "company",
});

// ======================================================
// ROLE <-> USER
// ======================================================

Role.hasMany(User, {
  foreignKey: "role_id",
  as: "users",
});

User.belongsTo(Role, {
  foreignKey: "role_id",
  as: "role",
});

// ======================================================
// EMPLOYEE <-> USER
// ======================================================

Employee.hasOne(User, {
  foreignKey: "employee_id",
  as: "user",
});

User.belongsTo(Employee, {
  foreignKey: "employee_id",
  as: "employee",
});

// ======================================================
// DEPARTMENT <-> EMPLOYEE
// ======================================================

Department.hasMany(Employee, {
  foreignKey: "department_id",
  as: "employees",
});

Employee.belongsTo(Department, {
  foreignKey: "department_id",
  as: "department",
});

// ======================================================
// DESIGNATION <-> EMPLOYEE
// ======================================================

Designation.hasMany(Employee, {
  foreignKey: "designation_id",
  as: "employees",
});

Employee.belongsTo(Designation, {
  foreignKey: "designation_id",
  as: "designation",
});

// ======================================================
// DEPARTMENT <-> DESIGNATION
// ======================================================

Department.hasMany(Designation, {
  foreignKey: "department_id",
  as: "designations",
});

Designation.belongsTo(Department, {
  foreignKey: "department_id",
  as: "department",
});

// ======================================================
// EMPLOYEE SELF RELATION (MANAGER)
// ======================================================

// Manager -> Team Members
Employee.hasMany(Employee, {
  foreignKey: "reporting_manager_id",
  as: "subordinates",
});

// Employee -> Manager
Employee.belongsTo(Employee, {
  foreignKey: "reporting_manager_id",
  as: "manager",
});

// ======================================================
// EXPORT
// ======================================================

export {
  Company,
  User,
  Role,
  Employee,
  Department,
  Designation,
  LeaveType,
};