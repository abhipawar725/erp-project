import { z } from 'zod';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const optStr = z.string().optional().or(z.literal(''));
const optDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional().or(z.literal(''));

// ─── Step 1: Basic Info ───────────────────────────────────────────────────────
export const basicInfoSchema = z.object({
  employee_code: z
    .string()
    .min(1, 'Employee code is required')
    .max(50, 'Max 50 characters')
    .trim(),
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'Max 100 characters')
    .trim(),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Max 100 characters')
    .trim(),
  email: z
    .string()
    .min(1, 'Work email is required')
    .email('Enter a valid email address')
    .toLowerCase()
    .trim(),
  personal_email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[+\d\s\-()]{7,20}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  date_of_birth: optDate,
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say', '']).optional(),
  blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']).optional(),
  marital_status: z.enum(['Single', 'Married', 'Divorced', 'Widowed', '']).optional(),
  nationality: optStr,
});

// ─── Step 2: Employment ───────────────────────────────────────────────────────
export const employmentSchema = z.object({
  department_id: z.union([z.number().int().positive(), z.literal(''), z.undefined()]).nullable().optional(),
  designation_id: z.union([z.number().int().positive(), z.literal(''), z.undefined()]).nullable().optional(),
  reporting_manager_id: z.union([z.number().int().positive(), z.literal(''), z.undefined()]).nullable().optional(),
  employment_type: z.enum(['Full-time', 'Part-time', 'Contract', 'Intern'], {
    required_error: 'Employment type is required',
  }),
  work_location: z.enum(['Office', 'WFH', 'Hybrid'], {
    required_error: 'Work location is required',
  }),
  date_of_joining: optDate,
  date_of_confirmation: optDate,
  status: z.enum(['Active', 'On_Probation', 'Left', 'Absconding'], {
    required_error: 'Status is required',
  }),
});

// ─── Step 3: Address ─────────────────────────────────────────────────────────
export const addressSchema = z.object({
  address_line1: optStr,
  address_line2: optStr,
  city: optStr,
  state: optStr,
  pincode: z
    .string()
    .regex(/^\d{4,10}$/, 'Pincode must be 4–10 digits')
    .optional()
    .or(z.literal('')),
});

// ─── Step 4: Statutory ────────────────────────────────────────────────────────
export const statutorySchema = z.object({
  aadhaar_number: z
    .string()
    .regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits')
    .optional()
    .or(z.literal('')),
  pan_number: z
    .string()
    .optional()
    .or(z.literal('')),
  passport_number: z.string().max(30).optional().or(z.literal('')),
  uan_number: z
    .string()
    .regex(/^\d{12}$/, 'UAN must be exactly 12 digits')
    .optional()
    .or(z.literal('')),
  pf_number: z.string().max(30).optional().or(z.literal('')),
  esi_number: z.string().max(30).optional().or(z.literal('')),
});

// ─── Step 5: Bank ─────────────────────────────────────────────────────────────
export const bankSchema = z.object({
  bank_name: z.string().max(200).optional().or(z.literal('')),
  bank_account_number: z
    .string()
    .regex(/^\d{9,18}$/, 'Account number must be 9–18 digits')
    .optional()
    .or(z.literal('')),
  ifsc_code: z
    .string()
    .toUpperCase()
    .optional()
    .or(z.literal('')),
});

// ─── Full schema (all steps) ──────────────────────────────────────────────────
export const fullEmployeeSchema = basicInfoSchema
  .merge(employmentSchema)
  .merge(addressSchema)
  .merge(statutorySchema)
  .merge(bankSchema);

// ─── Types ────────────────────────────────────────────────────────────────────
export type BasicInfoFormData      = z.infer<typeof basicInfoSchema>;
export type EmploymentFormData     = z.infer<typeof employmentSchema>;
export type AddressFormData        = z.infer<typeof addressSchema>;
export type StatutoryFormData      = z.infer<typeof statutorySchema>;
export type BankFormData           = z.infer<typeof bankSchema>;
export type FullEmployeeFormData   = z.infer<typeof fullEmployeeSchema>;
