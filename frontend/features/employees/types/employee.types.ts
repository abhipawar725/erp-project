export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
export type WorkLocation   = 'Office' | 'WFH' | 'Hybrid';
export type EmployeeStatus = 'Active' | 'On_Probation' | 'Left' | 'Absconding';
export type Gender         = 'Male' | 'Female' | 'Other' | 'Prefer not to say';
export type MaritalStatus  = 'Single' | 'Married' | 'Divorced' | 'Widowed';
export type BloodGroup     = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface Employee {
  id: number;
  company_id: number;
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
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  department_id?: number | null;
  designation_id?: number | null;
  reporting_manager_id?: number | null;
  employment_type: EmploymentType;
  work_location: WorkLocation;
  date_of_joining?: string | null;
  date_of_confirmation?: string | null;
  status: EmployeeStatus;
  aadhaar_number?: string | null;
  pan_number?: string | null;
  passport_number?: string | null;
  uan_number?: string | null;
  pf_number?: string | null;
  esi_number?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  ifsc_code?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
  department?: { id: number; name: string; code?: string };
  designation?: { id: number; name: string; grade?: string };
  manager?: { id: number; first_name: string; last_name: string; avatar_url?: string | null };
}

export interface BasicInfoFormData {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  personal_email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: Gender | '';
  blood_group?: BloodGroup | '';
  marital_status?: MaritalStatus | '';
  nationality?: string;
}

export interface EmploymentFormData {
  department_id?: number | '';
  designation_id?: number | '';
  reporting_manager_id?: number | '';
  employment_type: EmploymentType;
  work_location: WorkLocation;
  date_of_joining?: string;
  date_of_confirmation?: string;
  status: EmployeeStatus;
}

export interface AddressFormData {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface StatutoryFormData {
  aadhaar_number?: string;
  pan_number?: string;
  passport_number?: string;
  uan_number?: string;
  pf_number?: string;
  esi_number?: string;
}

export interface BankFormData {
  bank_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
}

export interface EmployeeWizardData extends BasicInfoFormData, EmploymentFormData, AddressFormData, StatutoryFormData, BankFormData {}

export type WizardStepKey = 'basic' | 'employment' | 'address' | 'statutory' | 'bank';

export interface WizardStep {
  id: number;
  key: WizardStepKey;
  label: string;
  icon: string;
  description: string;
  required: boolean;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, key: 'basic',      label: 'Basic Info',    icon: '👤', description: 'Personal details & contact',        required: true  },
  { id: 2, key: 'employment', label: 'Employment',    icon: '💼', description: 'Role, department & work details',   required: true  },
  { id: 3, key: 'address',    label: 'Address',       icon: '📍', description: 'Residential address',               required: false },
  { id: 4, key: 'statutory',  label: 'Statutory',     icon: '🛡',  description: 'Aadhaar, PAN, PF & ESI details',  required: false },
  { id: 5, key: 'bank',       label: 'Bank Details',  icon: '🏦', description: 'Salary account information',        required: false },
];

export interface EmployeeQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  department_id?: number;
  designation_id?: number;
  status?: EmployeeStatus;
  employment_type?: EmploymentType;
  work_location?: WorkLocation;
  sort?: string;
  order?: 'ASC' | 'DESC';
}
