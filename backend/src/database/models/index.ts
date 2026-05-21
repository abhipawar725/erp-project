import { sequelize } from "../../config/database";

// import models ONLY
import { Company } from "./Company";
import { User } from "./User";
import { Role } from "./RoleModels";
import { Employee } from "./Employee";
import { Department } from "./Department";
import { Designation } from "./Designation";
import { LeaveType } from "./LeaveModels";
import { Candidate } from "./Candidate";

// init associations ONCE
import "./Associations";

export function initModels() {
  // force model registration order
  Company;
  User;
  Role;
  Employee;
  Department;
  Designation;
  LeaveType;
  Candidate;
}