export const WIZARD_STEPS = [
  { key: 'basic',           label: 'Basic Info',             icon: 'user',         required: true,  sensitive: false },
  { key: 'employment',      label: 'Employment Details',     icon: 'briefcase',    required: true,  sensitive: false },
  { key: 'reporting',       label: 'Reporting & Contact',    icon: 'users',        required: true,  sensitive: false },
  { key: 'commitment',      label: 'Commitment & Probation', icon: 'calendar',     required: true,  sensitive: false },
  { key: 'schemes',         label: 'Enrolled Schemes',       icon: 'shield',       required: true,  sensitive: false },
  { key: 'personal',        label: 'Personal Details',       icon: 'heart',        required: true,  sensitive: false },
  { key: 'address',         label: 'Address',                icon: 'map-pin',      required: true,  sensitive: false },
  { key: 'family',          label: 'Family Details',         icon: 'users',        required: true,  sensitive: false },
  { key: 'emergency',       label: 'Emergency Contact',      icon: 'phone',        required: true,  sensitive: false },
  { key: 'statutory',       label: 'Documents & Govt IDs',   icon: 'file-text',    required: true,  sensitive: true  },
  { key: 'bank',            label: 'Bank Details',           icon: 'credit-card',  required: true,  sensitive: true  },
  { key: 'experience',      label: 'Experience & Education', icon: 'book',         required: true,  sensitive: false },
  { key: 'salary',          label: 'Salary & Deductions',    icon: 'indian-rupee', required: true,  sensitive: true  },
  { key: 'onboarding_docs', label: 'Onboarding Documents',   icon: 'check-square', required: true,  sensitive: false },
  { key: 'review',          label: 'Review & Submit',        icon: 'check-circle', required: true,  sensitive: false },
] as const;

export const EMPLOYEE_STATUS      = ['Active', 'Left', 'Retired'] as const;
export const EMPLOYMENT_TYPE      = ['Permanent', 'Contractual'] as const;
export const COMMITMENT_TERM      = ['36 Months', '60 Months', 'N/A'] as const;
export const CONFIRMATION_STATUS  = ['Confirmed', 'Failed', 'Not Applicable'] as const;
export const PF_EMPLOYER_FROM     = ['Employee', 'Employer', 'N/A'] as const;
export const MEDICLAIM_STATUS     = ['Yes', 'No', 'Deactivate'] as const;
export const RD_TERM              = ['6 Months', '12 Months', '18 Months', '24 Months', '30 Months', '36 Months', 'N/A'] as const;
export const HOUSE_TYPE           = ['Own', 'Rent'] as const;
export const PERM_ADDRESS_TYPE    = ['Same as Present', 'Other'] as const;
export const FATHER_SALUTATION    = ['Mr.', 'Late'] as const;
export const MOTHER_SALUTATION    = ['Mrs.', 'Late'] as const;
export const PARENT_STATUS        = ['Working', 'Retired', 'Not Applicable'] as const;
export const MOTHER_STATUS        = ['Working', 'Retired', 'Not Applicable', 'House Wife'] as const;
export const SALARY_MODE          = ['Transfer', 'Cheque'] as const;
export const DEDUCTION_FROM       = ['Salary', 'AMDB', 'N/A'] as const;
export const DEDUCTION_MONTHS     = ['3 Months','6 Months','9 Months','12 Months','15 Months','18 Months','21 Months','24 Months','27 Months','30 Months','33 Months','36 Months','40 Months','N/A'] as const;
export const GENDER               = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;
export const BLOOD_GROUP          = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export const MARITAL_STATUS       = ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'] as const;
export const AMDB_PERCENTAGE      = 0.30;

// Helper: convert constant arrays to Select options
export const toOpts = (arr: readonly string[]) => arr.map(v => ({ value: v, label: v }));