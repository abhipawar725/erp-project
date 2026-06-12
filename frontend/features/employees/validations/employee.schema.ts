import { z, ZodTypeAny } from 'zod'; 

// ─── Helpers ──────────────────────────────────────────────────────────────────
const optStr  = z.string().optional().or(z.literal('')).nullable();
const optDate = z.string().optional().or(z.literal('')).nullable();
const reqStr  = (msg: string) => z.string({ required_error: msg }).min(1, msg).trim();
const yesNo   = z.boolean({ required_error: 'This field is required' });
const optNum  = z.number({ coerce: true }).nonnegative().optional().nullable();
const optInt  = z.union([z.number().int().min(1), z.literal(''), z.null(), z.undefined()]).optional();

// ─── Step 1: Basic Info ───────────────────────────────────────────────────────
export const basicSchema = z.object({
  first_name:      reqStr('First name is required').max(100),
  middle_name:     optStr,
  last_name:       reqStr('Last name is required').max(100),
  status:          z.enum(['Active', 'Left', 'Retired']).default('Active'),
  employment_type: z.enum(['Permanent', 'Contractual']).default('Permanent'),
  employee_code:   optStr,
  department_id:   optInt,
  sub_department_id: optInt,
  designation_id:  optInt,
  sub_designation: optStr,
});

// ─── Step 2: Employment Details ───────────────────────────────────────────────
export const employmentSchema = z.object({
  working_site:            reqStr('Working site is required'),
  working_city:            reqStr('Working city is required'),
  working_state_country:   reqStr('Working state/country is required'),
  pay_register_location:   reqStr('Pay register location is required'),
  saturday_off:            yesNo,
  shift_id:                z.number({ required_error: 'Working shift is required' }).int().min(1),
  grace_minutes:           z.number({ coerce: true }).int().min(0).max(120).optional().default(0),
});

// ─── Step 3: Reporting & Official Contact ─────────────────────────────────────
export const reportingSchema = z.object({
  l1_manager_code:  reqStr('L1 Manager is required'),
  l2_manager_code:  optStr,
  email:   z.string().email().optional().or(z.literal('')).nullable(),
  phone:  reqStr('Official mobile is required')
    .regex(/^[+\d\s\-()]{7,20}$/, 'Invalid mobile number'),
  actual_doj:       reqStr('Date of joining is required'),
});

export const commitmentBaseSchema = z.object({
  commitment: yesNo,
  commitment_term: z.enum([
    '36 Months',
    '60 Months',
    'N/A'
  ]).optional().nullable(),
  commitment_entered_on: optDate,
  on_probation: yesNo,
  probation_period: optStr,
  probation_extended_period: optStr,
  confirmation_status: z.enum([
    'Confirmed',
    'Failed',
    'Not Applicable'
  ]).optional().nullable(),
  confirmed_on: optDate,
});

// ─── Step 4: Commitment & Probation ──────────────────────────────────────────
export const commitmentSchema = commitmentBaseSchema.refine(
  d => !d.commitment || d.commitment_term,
  {
    message: 'Commitment term required when commitment is Yes',
    path: ['commitment_term'],
  }
);

// ─── Step 5: Enrolled Schemes ─────────────────────────────────────────────────
export const schemesSchema = z.object({
  // PF
  pf_status:             yesNo,
  uan_number:            z.string().regex(/^\d{12}$/, 'UAN must be 12 digits').optional().or(z.literal('')).nullable(),
  epfo_member_id:        optStr,
  pf_contribution_pct:   optNum,
  pf_employer_from:      z.enum(['Employee', 'Employer', 'N/A']).optional().nullable(),
  // ESIC
  esic_status:           yesNo,
  esic_number:           optStr,
  // Mediclaim
  mediclaim_status:      z.enum(['Yes', 'No', 'Deactivate']),
  mediclaim_number:      optStr,
  mediclaim_amount:      optNum,
  // RD
  rd_scheme:             yesNo,
  rd_term:               z.enum(['6 Months', '12 Months', '18 Months', '24 Months', '30 Months', '36 Months', 'N/A']).optional().nullable(),
  rd_opening_date:       optDate,
  rd_account_number:     optStr,
  rd_deduction_from:     z.enum(['Salary', 'AMDB', 'N/A']).optional().nullable(),
  rd_amount_employee:    optNum,
  rd_amount_employer:    optNum,
});

// ─── Step 6: Personal Details ─────────────────────────────────────────────────
export const personalSchema = z.object({
  personal_email:   z.string({ required_error: 'Personal email is required' }).email('Invalid email'),
  personal_mobile:  reqStr('Personal mobile is required')
    .regex(/^[+\d\s\-()]{7,20}$/, 'Invalid mobile number'),
  date_of_birth:    reqStr('Date of birth is required'),
  gender:           z.enum(['Male', 'Female', 'Other', 'Prefer not to say'], { required_error: 'Gender is required' }),
  shirt_size:       reqStr('Shirt size is required').max(10),
  tshirt_size:      reqStr('T-shirt size is required').max(10),
  nationality:      reqStr('Nationality is required').max(100),
  religion:         reqStr('Religion is required').max(100),
  blood_group:      z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], { required_error: 'Blood group is required' }),
  marital_status:   z.enum(['Single', 'Married', 'Divorced', 'Widowed', 'Separated'], { required_error: 'Marital status is required' }),
  marriage_date:    optDate,
  spouse_name:      optStr,
  spouse_dob:       optDate,
  child1_name:      optStr,
  child1_dob:       optDate,
  child2_name:      optStr,
  child2_dob:       optDate,
  child3_name:      optStr,
  child3_dob:       optDate,
});

// ─── Step 7: Address ─────────────────────────────────────────────────────────
export const addressSchema = z.object({
  present_house_type:  z.enum(['Own', 'Rent'], { required_error: 'House type is required' }),
  present_house_no:    reqStr('House no is required'),
  present_area:        optStr,
  present_district:    reqStr('District is required'),
  present_city:        reqStr('City is required'),
  present_state:       reqStr('State is required'),
  present_country:     reqStr('Country is required'),
  present_pincode:     z.string().regex(/^\d{4,10}$/, 'Invalid pincode'),
  perm_address_type:   z.enum(['Same as Present', 'Other'], { required_error: 'Permanent address type is required' }),
  perm_house_type:     z.enum(['Own', 'Rent']).optional().nullable(),
  perm_house_no:       optStr,
  perm_area:           optStr,
  perm_district:       optStr,
  perm_city:           optStr,
  perm_state:          optStr,
  perm_country:        optStr,
  perm_pincode:        z.string().regex(/^\d{4,10}$/).optional().or(z.literal('')).nullable(),
});

// ─── Step 8: Family Details ───────────────────────────────────────────────────
export const familySchema = z.object({
  father_salutation:  z.enum(['Mr.', 'Late'], { required_error: 'Father salutation required' }),
  father_name:        reqStr('Father name is required').max(200),
  father_age_dob:     optStr,
  father_occupation:  optStr,
  father_status:      z.enum(['Working', 'Retired', 'Not Applicable']).optional().nullable(),
  mother_salutation:  z.enum(['Mrs.', 'Late'], { required_error: 'Mother salutation required' }),
  mother_name:        reqStr('Mother name is required').max(200),
  mother_age_dob:     optStr,
  mother_occupation:  z.enum(['Working', 'Retired', 'Not Applicable', 'House Wife']).optional().nullable(),
});

// ─── Step 9: Emergency Contact ────────────────────────────────────────────────
export const emergencySchema = z.object({
  contact_name:    reqStr('Contact name is required').max(200),
  contact_number:  reqStr('Contact number is required')
    .regex(/^[+\d\s\-()]{7,20}$/, 'Invalid phone number'),
  relationship:    reqStr('Relationship is required').max(100),
});

// ─── Step 10: Statutory / Govt IDs ───────────────────────────────────────────
export const statutorySchema = z.object({
  passport_number:         reqStr('Passport number is required').max(30),
  passport_expiry:         reqStr('Passport expiry is required'),
  yellow_fever:            yesNo,
  yellow_fever_date:       optDate,
  driving_license_number:  reqStr('Driving license is required').max(30),
  driving_license_expiry:  reqStr('Driving license expiry is required'),
  aadhaar_number:          z.string({ required_error: 'Aadhaar is required' })
    .regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits'),
  aadhaar_address:         reqStr('Aadhaar address is required'),
  pan_number:              z.string({ required_error: 'PAN is required' })
    .toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (ABCDE1234F)'),
  pan_full_name:           reqStr('PAN full name is required').max(200),
  pan_dob:                 reqStr('PAN date of birth is required'),
  pan_parent_spouse_name:  reqStr('PAN parent/spouse name is required').max(200),
});

// ─── Step 11: Bank Details ────────────────────────────────────────────────────
export const bankSchema = z.object({
  personal_bank_name:     reqStr('Bank name is required').max(200),
  personal_bank_account:  z.string({ required_error: 'Account number is required' })
    .regex(/^\d{9,18}$/, 'Account number must be 9-18 digits'),
  personal_ifsc:          z.string({ required_error: 'IFSC is required' })
    .toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format (ABCD0123456)'),
  personal_bank_branch:   reqStr('Branch name is required').max(200),
  official_bank_name:     optStr,
  official_bank_account:  z.string().regex(/^\d{9,18}$/).optional().or(z.literal('')).nullable(),
  official_ifsc:          z.string().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional().or(z.literal('')).nullable(),
  official_bank_branch:   optStr,
});

// ─── Step 12: Experience & Education ─────────────────────────────────────────
export const experienceSchema = z.object({
  is_experienced:          yesNo,
  last_company_name:       optStr,
  last_designation:        optStr,
  last_working_day:        optDate,
  exp_contact_name:        optStr,
  exp_contact_number:      z.string().regex(/^[+\d\s\-()]{7,20}$/).optional().or(z.literal('')).nullable(),
  exp_contact_designation: optStr,
  last_inhand_salary:      optNum,
  highest_education:       reqStr('Highest education is required').max(100),
  education_stream:        optStr,
  education_mode:          optStr,
  institute_name:          optStr,
  passing_year:            z.number({ coerce: true }).int().min(1950).max(new Date().getFullYear() + 1).optional().nullable(),
  education_marks:         optStr,
});

// ─── Step 13: Salary & Asset Deduction ───────────────────────────────────────
export const salarySchema = z.object({
  salary_mode:      z.enum(['Transfer', 'Cheque'], { required_error: 'Payment mode is required' }),
  // Current salary (all mandatory)
  current_basic:    z.number({ coerce: true, required_error: 'Current basic is required' }).nonnegative(),
  current_hra:      z.number({ coerce: true, required_error: 'Current HRA is required' }).nonnegative(),
  current_allowance1: z.number({ coerce: true, required_error: 'Current allowance is required' }).nonnegative(),
  current_amdb:     z.number({ coerce: true, required_error: 'Current AMDB is required' }).nonnegative(),
  // Joining salary (all mandatory)
  joining_basic:    z.number({ coerce: true, required_error: 'Joining basic is required' }).nonnegative(),
  joining_hra:      z.number({ coerce: true, required_error: 'Joining HRA is required' }).nonnegative(),
  joining_allowance1: z.number({ coerce: true, required_error: 'Joining allowance is required' }).nonnegative(),
  joining_amdb:     z.number({ coerce: true, required_error: 'Joining AMDB is required' }).nonnegative(),
  // Asset deduction
  asset_deduction_applicable: yesNo,
  security_amount:  optNum,
  deduction_months: z.string().optional().nullable(),
  deduction_from:   z.enum(['Salary', 'AMDB', 'N/A']).optional().nullable(),
  monthly_deduction: optNum,
});

// ─── Step 14: Onboarding Documents ───────────────────────────────────────────
export const onboardingDocsSchema = z.object({
  offer_letter:             yesNo,
  address_verification:     yesNo,
  service_agreement:        yesNo,
  indemnity_bond:           yesNo,
  asset_deduction_letter:   yesNo,
  account_opening_letter:   yesNo,
  nda:                      yesNo,
});

// ─── Full form schema ─────────────────────────────────────────────────────────
export const fullEmployeeSchema = basicSchema
  .merge(employmentSchema)
  .merge(reportingSchema)
  .merge(commitmentBaseSchema)
  .merge(schemesSchema)
  .merge(personalSchema)
  .merge(addressSchema)
  .merge(familySchema)
  .merge(emergencySchema)
  .merge(statutorySchema)
  .merge(bankSchema)
  .merge(experienceSchema)
  .merge(salarySchema)
  .merge(onboardingDocsSchema);

// ─── Step schema map ──────────────────────────────────────────────────────────
export const STEP_SCHEMA_MAP = {
  basic:           basicSchema,
  employment:      employmentSchema,
  reporting:       reportingSchema,
  commitment:      commitmentSchema,
  schemes:         schemesSchema,
  personal:        personalSchema,
  address:         addressSchema,
  family:          familySchema,
  emergency:       emergencySchema,
  statutory:       statutorySchema,
  bank:            bankSchema,
  experience:      experienceSchema,
  salary:          salarySchema,
  onboarding_docs: onboardingDocsSchema,
  review:          z.object({}).optional(),
} as const;

export type FullEmployeeForm = z.infer<typeof fullEmployeeSchema>;
export type StepSchemaKey = keyof typeof STEP_SCHEMA_MAP;