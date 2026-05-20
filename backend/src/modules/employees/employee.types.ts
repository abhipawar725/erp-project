// ─── All Employee DTOs & Interfaces ──────────────────────────────────────────

export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
export type WorkLocation  = 'Office' | 'WFH' | 'Hybrid';
export type EmployeeStatus = 'Active' | 'On_Probation' | 'Left' | 'Absconding';
export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';
export type MaritalStatus = 'Single' | 'Married' | 'Divorced' | 'Widowed';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

// ─── Step 1: Basic Info ───────────────────────────────────────────────────────
export interface BasicInfoDto {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  personal_email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: Gender | null;
  blood_group?: BloodGroup | null;
  marital_status?: MaritalStatus | null;
  nationality?: string;
}

// ─── Step 2: Employment Details ───────────────────────────────────────────────
export interface EmploymentDetailsDto {
  department_id?: number | null;
  designation_id?: number | null;
  reporting_manager_id?: number | null;
  employment_type: EmploymentType;
  work_location: WorkLocation;
  date_of_joining?: string | null;
  date_of_confirmation?: string | null;
  status: EmployeeStatus;
}

// ─── Step 3: Address ─────────────────────────────────────────────────────────
export interface AddressDto {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

// ─── Step 4: Statutory (sensitive) ───────────────────────────────────────────
export interface StatutoryDto {
  aadhaar_number?: string | null;
  pan_number?: string | null;
  passport_number?: string | null;
  uan_number?: string | null;
  pf_number?: string | null;
  esi_number?: string | null;
}

// ─── Step 5: Bank (sensitive) ─────────────────────────────────────────────────
export interface BankDetailsDto {
  bank_name?: string | null;
  bank_account_number?: string | null;
  ifsc_code?: string | null;
}

// ─── Full Create DTO (all steps merged) ───────────────────────────────────────
export interface CreateEmployeeDto
  extends BasicInfoDto,
    EmploymentDetailsDto,
    AddressDto,
    StatutoryDto,
    BankDetailsDto {
  company_id: number;
  created_by?: number | null;
}

// ─── Update DTO (all fields optional) ─────────────────────────────────────────
export type UpdateEmployeeDto = Partial<
  BasicInfoDto & EmploymentDetailsDto & AddressDto & StatutoryDto & BankDetailsDto
> & { updated_by?: number };

// ─── Query Params ─────────────────────────────────────────────────────────────
export interface EmployeeQueryParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
  department_id?: number | string;
  designation_id?: number | string;
  status?: EmployeeStatus | string;
  employment_type?: EmploymentType | string;
  work_location?: WorkLocation | string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

// ─── Safe response (excludes sensitive fields unless permitted) ───────────────
export const SENSITIVE_FIELDS = [
  'aadhaar_number',
  'pan_number',
  'passport_number',
  'uan_number',
  'pf_number',
  'esi_number',
  'bank_name',
  'bank_account_number',
  'ifsc_code',
] as const;

export type SensitiveField = (typeof SENSITIVE_FIELDS)[number];
