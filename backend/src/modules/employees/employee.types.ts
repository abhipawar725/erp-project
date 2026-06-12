/**
 * employees.types.ts
 * All DTOs and interfaces derived from the UNG Master Data Form spreadsheet.
 * 204 fields mapped across 15 normalized tables.
 */

import type {
  EmployeeStatus, EmploymentType, CommitmentTerm, ConfirmationStatus,
  PfEmployerFrom, MediclaimStatus, RdTerm, HouseType, PermAddressType,
  FatherSalutation, MotherSalutation, MotherOccupationStatus,
  ParentOccupationStatus, SalaryMode, DeductionFrom, DeductionMonths,
  Gender, BloodGroup, MaritalStatus, StepKey,
} from './employee.constants';

// ─── Query params ─────────────────────────────────────────────────────────────
export interface EmployeeQueryParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
  status?: EmployeeStatus;
  employment_type?: EmploymentType;
  department_id?: number | string;
  designation_id?: number | string;
  company_id?: number | string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

// ─── Step 1: Basic Info ───────────────────────────────────────────────────────
export interface BasicInfoDto {
  company_id:       number;
  employee_code:    string;
  first_name:       string;           // MANDATORY
  middle_name?:     string | null;    // optional
  last_name:        string;           // MANDATORY
  status:           EmployeeStatus;   // MANDATORY
  employment_type:  EmploymentType;   // MANDATORY
  department_id?:   number | null;    // MANDATORY (set in employment step)
  sub_department_id?: number | null;
  designation_id?:  number | null;    // MANDATORY
  sub_designation?: string | null;
}

// ─── Step 2: Employment Details ───────────────────────────────────────────────
export interface EmploymentDto {
  working_site:             string;   // MANDATORY
  working_city:             string;   // MANDATORY
  working_state_country:    string;   // MANDATORY
  pay_register_location:    string;   // MANDATORY
  saturday_off:             boolean;  // MANDATORY
  shift_id:                 number;   // MANDATORY
  grace_minutes?:           number;
}

// ─── Step 3: Reporting & Official Contact ─────────────────────────────────────
export interface ReportingDto {
  l1_manager_id:     number;          // MANDATORY (resolved from emp code)
  l2_manager_id?:    number | null;   // optional
  official_email?:   string | null;   // optional
  official_mobile:   string;          // MANDATORY
  actual_doj:        string;          // MANDATORY  DD-MM-YYYY
  current_doj?:      string | null;   // AUTO
}

// ─── Step 4: Commitment & Probation ──────────────────────────────────────────
export interface CommitmentProbationDto {
  commitment:                  boolean;           // MANDATORY
  commitment_term?:            CommitmentTerm;
  commitment_entered_on?:      string | null;     // DATE
  on_probation:                boolean;           // MANDATORY
  probation_period?:           string | null;
  probation_extended_period?:  string | null;
  confirmation_status?:        ConfirmationStatus; // SKIP FIRST TIME
  confirmed_on?:               string | null;
}

// ─── Step 5: Enrolled Schemes ─────────────────────────────────────────────────
export interface SchemesDto {
  // PF
  pf_status:              boolean;               // MANDATORY
  uan_number?:            string | null;
  epfo_member_id?:        string | null;
  pf_contribution_pct?:   number | null;
  pf_employer_from?:      PfEmployerFrom;
  // ESIC
  esic_status:            boolean;               // MANDATORY
  esic_number?:           string | null;
  // Mediclaim
  mediclaim_status:       MediclaimStatus;       // MANDATORY
  mediclaim_number?:      string | null;
  mediclaim_amount?:      number | null;
  // RD
  rd_scheme:              boolean;               // MANDATORY
  rd_term?:               RdTerm;
  rd_opening_date?:       string | null;
  rd_account_number?:     string | null;
  rd_deduction_from?:     DeductionFrom;
  rd_amount_employee?:    number | null;
  rd_amount_employer?:    number | null;
}

// ─── Step 6: Personal Details ─────────────────────────────────────────────────
export interface PersonalDto {
  personal_email:   string;           // MANDATORY
  personal_mobile:  string;           // MANDATORY
  date_of_birth:    string;           // MANDATORY  DD-MM-YYYY
  gender:           Gender;           // MANDATORY
  shirt_size:       string;           // MANDATORY
  tshirt_size:      string;           // MANDATORY
  nationality:      string;           // MANDATORY
  religion:         string;           // MANDATORY
  blood_group:      BloodGroup;       // MANDATORY
  marital_status:   MaritalStatus;    // MANDATORY
  marriage_date?:   string | null;
  spouse_name?:     string | null;
  spouse_dob?:      string | null;
  child1_name?:     string | null;
  child1_dob?:      string | null;
  child2_name?:     string | null;
  child2_dob?:      string | null;
  child3_name?:     string | null;
  child3_dob?:      string | null;
}

// ─── Step 7: Address ─────────────────────────────────────────────────────────
export interface AddressDto {
  // Present (all MANDATORY)
  present_house_type:   HouseType;
  present_house_no:     string;
  present_area?:        string | null;
  present_district:     string;
  present_city:         string;
  present_state:        string;
  present_country:      string;
  present_pincode:      string;
  // Permanent
  perm_address_type:    PermAddressType;  // MANDATORY
  perm_house_type?:     HouseType;
  perm_house_no?:       string | null;
  perm_area?:           string | null;
  perm_district?:       string | null;
  perm_city?:           string | null;
  perm_state?:          string | null;
  perm_country?:        string | null;
  perm_pincode?:        string | null;
}

// ─── Step 8: Family Details ───────────────────────────────────────────────────
export interface FamilyDto {
  father_salutation:   FatherSalutation;        // MANDATORY
  father_name:         string;                  // MANDATORY
  father_age_dob?:     string | null;
  father_occupation?:  string | null;
  father_status?:      ParentOccupationStatus;
  mother_salutation:   MotherSalutation;        // MANDATORY
  mother_name:         string;                  // MANDATORY
  mother_age_dob?:     string | null;
  mother_occupation?:  MotherOccupationStatus;
}

// ─── Step 9: Emergency Contact ────────────────────────────────────────────────
export interface EmergencyContactDto {
  contact_name:    string;           // MANDATORY
  contact_number:  string;           // MANDATORY
  relationship:    string;           // MANDATORY
}

// ─── Step 10: Statutory / Govt IDs ───────────────────────────────────────────
export interface StatutoryDto {
  // Travel documents (MANDATORY)
  passport_number:          string;
  passport_expiry:          string;
  yellow_fever:             boolean;
  yellow_fever_date?:       string | null;
  // License (MANDATORY)
  driving_license_number:   string;
  driving_license_expiry:   string;
  // Govt IDs (all MANDATORY)
  aadhaar_number:           string;
  aadhaar_address:          string;
  pan_number:               string;
  pan_full_name:            string;
  pan_dob:                  string;
  pan_parent_spouse_name:   string;
}

// ─── Step 11: Bank Details ────────────────────────────────────────────────────
export interface BankDto {
  // Personal bank (all MANDATORY)
  personal_bank_name:     string;
  personal_bank_account:  string;
  personal_ifsc:          string;
  personal_bank_branch:   string;
  // Official bank (all optional)
  official_bank_name?:    string | null;
  official_bank_account?: string | null;
  official_ifsc?:         string | null;
  official_bank_branch?:  string | null;
}

// ─── Step 12: Experience & Education ─────────────────────────────────────────
export interface ExperienceEducationDto {
  is_experienced:          boolean;      // MANDATORY
  last_company_name?:      string | null;
  last_designation?:       string | null;
  last_working_day?:       string | null;
  exp_contact_name?:       string | null;
  exp_contact_number?:     string | null;
  exp_contact_designation?: string | null;
  last_inhand_salary?:     number | null;
  highest_education:       string;       // MANDATORY
  education_stream?:       string | null;
  education_mode?:         string | null;
  institute_name?:         string | null;
  passing_year?:           number | null;
  education_marks?:        string | null;
}

// ─── Step 13: Salary & Asset Deduction ───────────────────────────────────────
export interface SalaryDto {
  salary_mode:          SalaryMode;    // MANDATORY
  // Current salary (all MANDATORY)
  current_basic:        number;
  current_hra:          number;
  current_allowance1:   number;
  current_amdb:         number;
  // Joining salary (all MANDATORY)
  joining_basic:        number;
  joining_hra:          number;
  joining_allowance1:   number;
  joining_amdb:         number;
  // Asset deduction
  asset_deduction_applicable: boolean; // MANDATORY
  security_amount?:     number | null;
  deduction_months?:    DeductionMonths;
  deduction_from?:      DeductionFrom;
  monthly_deduction?:   number | null;
}

// ─── Step 14: Onboarding Documents ───────────────────────────────────────────
export interface OnboardingDocsDto {
  offer_letter:               boolean; // MANDATORY
  address_verification:       boolean; // MANDATORY
  service_agreement:          boolean; // MANDATORY
  indemnity_bond:             boolean; // MANDATORY
  asset_deduction_letter:     boolean; // MANDATORY
  account_opening_letter:     boolean; // MANDATORY
  nda:                        boolean; // MANDATORY
}

// ─── Transfer Record (optional, up to 5) ─────────────────────────────────────
export interface TransferDto {
  transfer_order:    number;    // 1-5
  transferred_on?:   string | null;
  new_company?:      string | null;
  new_joining_date?: string | null;
  new_location?:     string | null;
  new_department?:   string | null;
  new_job_title?:    string | null;
  old_company?:      string | null;
  exit_date?:        string | null;
  old_location?:     string | null;
  old_department?:   string | null;
  old_job_title?:    string | null;
  old_emp_code?:     string | null;
}

// ─── Exit Details ─────────────────────────────────────────────────────────────
export interface ExitDto {
  resignation_submitted?:  boolean;
  resignation_date?:       string | null;
  notice_period?:          string | null;
  last_working_day?:       string | null;
  exit_formalities_done?:  boolean;
  exit_status?:            string | null;
  exit_remarks?:           string | null;
}

// ─── Step update union ────────────────────────────────────────────────────────
export type StepUpdateDto =
  | BasicInfoDto
  | EmploymentDto
  | ReportingDto
  | CommitmentProbationDto
  | SchemesDto
  | PersonalDto
  | AddressDto
  | FamilyDto
  | EmergencyContactDto
  | StatutoryDto
  | BankDto
  | ExperienceEducationDto
  | SalaryDto
  | OnboardingDocsDto
  | { transfers: TransferDto[] }
  | ExitDto;

// ─── Full employee response ───────────────────────────────────────────────────
export interface EmployeeFullResponse {
  id:                  number;
  reference_code:      string;
  status:              EmployeeStatus;
  first_name:          string;
  middle_name?:        string | null;
  last_name:           string;
  full_name:           string;
  employment_type:     EmploymentType;
  form_completion_pct: number;
  department?:         { id: number; name: string };
  designation?:        { id: number; name: string };
  company?:            { id: number; name: string };
  l1_manager?:         { id: number; first_name: string; last_name: string; official_email?: string };
  shift?:              { id: number; name: string; start_time: string; end_time: string };
  commitment_probation?: CommitmentProbationDto;
  schemes?:            SchemesDto;
  personal?:           PersonalDto;
  addresses?:          AddressDto;
  family?:             FamilyDto;
  emergency_contact?:  EmergencyContactDto;
  statutory?:          Partial<StatutoryDto>; // may be masked
  bank?:               Partial<BankDto>;       // may be masked
  experience_education?: ExperienceEducationDto;
  salary?:             Partial<SalaryDto>;     // may be masked
  onboarding_docs?:    OnboardingDocsDto;
  transfers?:          TransferDto[];
  exit?:               ExitDto;
  created_at:          string;
  updated_at:          string;
}

// ─── Field permission types ───────────────────────────────────────────────────
export interface FieldPermEntry {
  can_view:     boolean;
  can_edit:     boolean;
  can_copy:     boolean;
  can_download: boolean;
  is_masked:    boolean;
}

export type FieldPermissionMap = Record<string, FieldPermEntry>;

// ─── Bulk upload ─────────────────────────────────────────────────────────────
export interface BulkUploadRow {
  first_name:       string;
  last_name:        string;
  employment_type?: string;
  working_city?:    string;
  actual_doj?:      string;
  department?:      string;
  designation?:     string;
  [key: string]:    unknown;
}

export interface BulkUploadResult {
  total:    number;
  success:  number;
  failed:   number;
  errors:   Array<{ row: number; name: string; reason: string }>;
  created:  number[];
}