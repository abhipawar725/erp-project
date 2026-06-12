/**
 * employees.constants.ts
 * Every dropdown value sourced directly from spreadsheet data validations.
 * Cell references included for traceability.
 */

// F6
export const EMPLOYEE_STATUS = ['Active', 'Left', 'Retired'] as const;
export type EmployeeStatus = typeof EMPLOYEE_STATUS[number];

// E15
export const EMPLOYMENT_TYPE = ['Permanent', 'Contractual'] as const;
export type EmploymentType = typeof EMPLOYMENT_TYPE[number];

// B50 (Yes/No fields — used across many cells)
export const YES_NO = ['Yes', 'No'] as const;

// E50
export const COMMITMENT_TERM = ['36 Months', '60 Months', 'N/A'] as const;
export type CommitmentTerm = typeof COMMITMENT_TERM[number];

// B60
export const CONFIRMATION_STATUS = ['Confirmed', 'Failed', 'Not Applicable'] as const;
export type ConfirmationStatus = typeof CONFIRMATION_STATUS[number];

// H67
export const PF_EMPLOYER_FROM = ['Employee', 'Employer', 'N/A'] as const;
export type PfEmployerFrom = typeof PF_EMPLOYER_FROM[number];

// E75
export const MEDICLAIM_STATUS = ['Yes', 'No', 'Deactivate'] as const;
export type MediclaimStatus = typeof MEDICLAIM_STATUS[number];

// E81
export const RD_TERM = ['6 Months', '12 Months', '18 Months', '24 Months', '30 Months', '36 Months', 'N/A'] as const;
export type RdTerm = typeof RD_TERM[number];

// B97 / F97
export const HOUSE_TYPE = ['Own', 'Rent'] as const;
export type HouseType = typeof HOUSE_TYPE[number];

// F95
export const PERM_ADDRESS_TYPE = ['Same as Present', 'Other'] as const;
export type PermAddressType = typeof PERM_ADDRESS_TYPE[number];

// B152
export const FATHER_SALUTATION = ['Mr.', 'Late'] as const;
export type FatherSalutation = typeof FATHER_SALUTATION[number];

// E154 — Mother's salutation
export const MOTHER_SALUTATION = ['Mrs.', 'Late'] as const;
export type MotherSalutation = typeof MOTHER_SALUTATION[number];

// B154 — Father's occupation status
export const PARENT_OCCUPATION_STATUS = ['Working', 'Retired', 'Not Applicable'] as const;
export type ParentOccupationStatus = typeof PARENT_OCCUPATION_STATUS[number];

// E156 — Mother's occupation (adds 'House Wife')
export const MOTHER_OCCUPATION_STATUS = ['Working', 'Retired', 'Not Applicable', 'House Wife'] as const;
export type MotherOccupationStatus = typeof MOTHER_OCCUPATION_STATUS[number];

// B197
export const SALARY_MODE = ['Transfer', 'Cheque'] as const;
export type SalaryMode = typeof SALARY_MODE[number];

// B213, E83
export const DEDUCTION_FROM = ['Salary', 'AMDB', 'N/A'] as const;
export type DeductionFrom = typeof DEDUCTION_FROM[number];

// H211 — Asset deduction months
export const DEDUCTION_MONTHS = [
  '3 Months', '6 Months', '9 Months', '12 Months', '15 Months',
  '18 Months', '21 Months', '24 Months', '27 Months', '30 Months',
  '33 Months', '36 Months', '40 Months', 'N/A',
] as const;
export type DeductionMonths = typeof DEDUCTION_MONTHS[number];

// Standard enums not in data validations but implied by form
export const GENDER = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;
export type Gender = typeof GENDER[number];

export const BLOOD_GROUP = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = typeof BLOOD_GROUP[number];

export const MARITAL_STATUS = ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'] as const;
export type MaritalStatus = typeof MARITAL_STATUS[number];

// AMDB % from salary calculator (Row 5, cell K5 = 0.3)
export const AMDB_PERCENTAGE = 0.30;

// Wizard steps — ordered exactly as spreadsheet sections
export const WIZARD_STEPS = [
  { key: 'basic',               label: 'Basic Info',             icon: 'user',         required: true,  sensitive: false },
  { key: 'employment',          label: 'Employment Details',     icon: 'briefcase',    required: true,  sensitive: false },
  { key: 'reporting',           label: 'Reporting & Contact',    icon: 'users',        required: true,  sensitive: false },
  { key: 'commitment',          label: 'Commitment & Probation', icon: 'calendar',     required: true,  sensitive: false },
  { key: 'schemes',             label: 'Enrolled Schemes',       icon: 'shield',       required: true,  sensitive: false },
  { key: 'personal',            label: 'Personal Details',       icon: 'heart',        required: true,  sensitive: false },
  { key: 'address',             label: 'Address',                icon: 'map-pin',      required: true,  sensitive: false },
  { key: 'family',              label: 'Family Details',         icon: 'users',        required: true,  sensitive: false },
  { key: 'emergency',           label: 'Emergency Contact',      icon: 'phone',        required: true,  sensitive: false },
  { key: 'statutory',           label: 'Documents & Govt IDs',   icon: 'file-text',    required: true,  sensitive: true  },
  { key: 'bank',                label: 'Bank Details',           icon: 'credit-card',  required: true,  sensitive: true  },
  { key: 'experience',          label: 'Experience & Education', icon: 'book',         required: true,  sensitive: false },
  { key: 'salary',              label: 'Salary & Asset Deduction','icon': 'indian-rupee', required: true, sensitive: true },
  { key: 'onboarding_docs',     label: 'Onboarding Documents',   icon: 'check-square', required: true,  sensitive: false },
  { key: 'review',              label: 'Review & Submit',        icon: 'check-circle', required: true,  sensitive: false },
] as const;

export type StepKey = typeof WIZARD_STEPS[number]['key'];

// Masked fields for field-level permissions
export const SENSITIVE_FIELDS = [
  'aadhaar_number', 'pan_number', 'passport_number',
  'account_number', 'ifsc_code',
  'basic', 'hra', 'allowance1', 'gross_salary_pm', 'amdb_pm', 'total_earning_pm',
  'last_inhand_salary',
] as const;

// Step completion weights (must total 100)
export const STEP_WEIGHTS: Record<StepKey, number> = {
  basic: 15,
  employment: 12,
  reporting: 8,
  commitment: 5,
  schemes: 8,
  personal: 8,
  address: 5,
  family: 5,
  emergency: 4,
  statutory: 8,
  bank: 8,
  experience: 4,
  salary: 8,
  onboarding_docs: 4,
  review: 0,
};