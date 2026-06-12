/**
 * employees.validation.ts
 * express-validator chains for every wizard step.
 * All rules derived from spreadsheet data validations and field types.
 */

import { body, query, param, ValidationChain } from 'express-validator';
import {
  EMPLOYEE_STATUS, EMPLOYMENT_TYPE, COMMITMENT_TERM, CONFIRMATION_STATUS,
  PF_EMPLOYER_FROM, MEDICLAIM_STATUS, RD_TERM, HOUSE_TYPE, PERM_ADDRESS_TYPE,
  FATHER_SALUTATION, MOTHER_SALUTATION, SALARY_MODE, DEDUCTION_FROM,
  DEDUCTION_MONTHS, GENDER, BLOOD_GROUP, MARITAL_STATUS, YES_NO,
} from './employee.constants';

const opt = (c: ValidationChain) => c.optional({ nullable: true, checkFalsy: false });
const optDate = (field: string) => opt(body(field).isISO8601().withMessage(`${field}: invalid date`));

// ─── List query params ────────────────────────────────────────────────────────
export const listValidation: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(EMPLOYEE_STATUS),
  query('employment_type').optional().isIn(EMPLOYMENT_TYPE),
  query('sort').optional().isIn(['created_at', 'first_name', 'last_name', 'employee_code', 'actual_doj']),
  query('order').optional().isIn(['ASC', 'DESC']),
];

export const idValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('Invalid employee ID'),
];

// ─── Step 1: Basic Info ───────────────────────────────────────────────────────
export const basicValidation: ValidationChain[] = [
  body('first_name').trim().notEmpty().withMessage('First name is required').isLength({ max: 100 }),
  body('last_name').trim().notEmpty().withMessage('Last name is required').isLength({ max: 100 }),
  opt(body('middle_name').trim().isLength({ max: 100 })),
  body('status').isIn(EMPLOYEE_STATUS).withMessage('Invalid status'),
  body('employment_type').isIn(EMPLOYMENT_TYPE).withMessage('Invalid employment type'),
  opt(body('department_id').isInt({ min: 1 })),
  opt(body('sub_department_id').isInt({ min: 1 })),
  opt(body('designation_id').isInt({ min: 1 })),
  opt(body('sub_designation').trim().isLength({ max: 200 })),
  opt(body('employee_code').trim().isLength({ min: 1, max: 30 })),
];

// ─── Step 2: Employment Details ───────────────────────────────────────────────
export const employmentValidation: ValidationChain[] = [
  body('working_site').trim().notEmpty().withMessage('Working site is required'),
  body('working_city').trim().notEmpty().withMessage('Working city is required'),
  body('working_state_country').trim().notEmpty().withMessage('Working state/country is required'),
  body('pay_register_location').trim().notEmpty().withMessage('Pay register location is required'),
  body('saturday_off').isBoolean().withMessage('Saturday off must be boolean'),
  body('shift_id').isInt({ min: 1 }).withMessage('Working shift is required'),
  opt(body('grace_minutes').isInt({ min: 0, max: 120 })),
];

// ─── Step 3: Reporting & Official Contact ─────────────────────────────────────
export const reportingValidation: ValidationChain[] = [
  body('l1_manager_id').notEmpty().withMessage('L1 Manager is required'),
  opt(body('l2_manager_id')),
  opt(body('official_email').isEmail().withMessage('Invalid official email')),
  body('official_mobile').notEmpty().withMessage('Official mobile is required').matches(/^[+\d\s\-()\s]{7,20}$/).withMessage('Invalid mobile number'),
  body('actual_doj').notEmpty().withMessage('Actual date of joining is required'),
];

// ─── Step 4: Commitment & Probation ──────────────────────────────────────────
export const commitmentValidation: ValidationChain[] = [
  body('commitment').isBoolean().withMessage('Commitment must be Yes/No'),
  opt(body('commitment_term').isIn(COMMITMENT_TERM)),
  optDate('commitment_entered_on'),
  body('on_probation').isBoolean().withMessage('Probation must be Yes/No'),
  opt(body('probation_period').trim().isLength({ max: 30 })),
  opt(body('probation_extended_period').trim().isLength({ max: 50 })),
  opt(body('confirmation_status').isIn(CONFIRMATION_STATUS)),
  optDate('confirmed_on'),
];

// ─── Step 5: Schemes ─────────────────────────────────────────────────────────
export const schemesValidation: ValidationChain[] = [
  body('pf_status').isBoolean().withMessage('PF status is required'),
  opt(body('uan_number').trim().matches(/^\d{12}$/).withMessage('UAN must be 12 digits')),
  opt(body('epfo_member_id').trim().isLength({ max: 30 })),
  opt(body('pf_contribution_pct').isFloat({ min: 0, max: 100 })),
  opt(body('pf_employer_from').isIn(PF_EMPLOYER_FROM)),
  body('esic_status').isBoolean().withMessage('ESIC status is required'),
  opt(body('esic_number').trim().isLength({ max: 30 })),
  body('mediclaim_status').isIn(MEDICLAIM_STATUS).withMessage('Invalid mediclaim status'),
  opt(body('mediclaim_number').trim().isLength({ max: 50 })),
  opt(body('mediclaim_amount').isFloat({ min: 0 })),
  body('rd_scheme').isBoolean().withMessage('RD scheme is required'),
  opt(body('rd_term').isIn(RD_TERM)),
  optDate('rd_opening_date'),
  opt(body('rd_account_number').trim().isLength({ max: 50 })),
  opt(body('rd_deduction_from').isIn(DEDUCTION_FROM)),
  opt(body('rd_amount_employee').isFloat({ min: 0 })),
  opt(body('rd_amount_employer').isFloat({ min: 0 })),
];

// ─── Step 6: Personal Details ─────────────────────────────────────────────────
export const personalValidation: ValidationChain[] = [
  body('personal_email').isEmail().withMessage('Valid personal email is required'),
  body('personal_mobile').notEmpty().matches(/^[+\d\s\-()\s]{7,20}$/).withMessage('Invalid personal mobile'),
  body('date_of_birth').notEmpty().withMessage('Date of birth is required'),
  body('gender').isIn(GENDER).withMessage('Invalid gender'),
  body('shirt_size').notEmpty().withMessage('Shirt size is required').isLength({ max: 10 }),
  body('tshirt_size').notEmpty().withMessage('T-shirt size is required').isLength({ max: 10 }),
  body('nationality').notEmpty().withMessage('Nationality is required').isLength({ max: 100 }),
  body('religion').notEmpty().withMessage('Religion is required').isLength({ max: 100 }),
  body('blood_group').isIn(BLOOD_GROUP).withMessage('Invalid blood group'),
  body('marital_status').isIn(MARITAL_STATUS).withMessage('Invalid marital status'),
  optDate('marriage_date'),
  opt(body('spouse_name').trim().isLength({ max: 200 })),
  optDate('spouse_dob'),
  opt(body('child1_name').trim().isLength({ max: 200 })),
  optDate('child1_dob'),
  opt(body('child2_name').trim().isLength({ max: 200 })),
  optDate('child2_dob'),
  opt(body('child3_name').trim().isLength({ max: 200 })),
  optDate('child3_dob'),
];

// ─── Step 7: Address ─────────────────────────────────────────────────────────
export const addressValidation: ValidationChain[] = [
  body('present_house_type').isIn(HOUSE_TYPE).withMessage('Invalid house type'),
  body('present_house_no').notEmpty().withMessage('House no is required'),
  body('present_district').notEmpty().withMessage('District is required'),
  body('present_city').notEmpty().withMessage('City is required'),
  body('present_state').notEmpty().withMessage('State is required'),
  body('present_country').notEmpty().withMessage('Country is required'),
  body('present_pincode').matches(/^\d{4,10}$/).withMessage('Invalid pin code'),
  body('perm_address_type').isIn(PERM_ADDRESS_TYPE).withMessage('Invalid permanent address type'),
  opt(body('perm_house_type').isIn(HOUSE_TYPE)),
  opt(body('perm_house_no').trim().isLength({ max: 50 })),
  opt(body('perm_district').trim().isLength({ max: 100 })),
  opt(body('perm_city').trim().isLength({ max: 100 })),
  opt(body('perm_state').trim().isLength({ max: 100 })),
  opt(body('perm_country').trim().isLength({ max: 100 })),
  opt(body('perm_pincode').matches(/^\d{4,10}$/)),
];

// ─── Step 8: Family Details ───────────────────────────────────────────────────
export const familyValidation: ValidationChain[] = [
  body('father_salutation').isIn(FATHER_SALUTATION).withMessage('Invalid father salutation'),
  body('father_name').notEmpty().withMessage('Father name is required').isLength({ max: 200 }),
  opt(body('father_age_dob').trim().isLength({ max: 50 })),
  opt(body('father_occupation').trim().isLength({ max: 100 })),
  body('mother_salutation').isIn(MOTHER_SALUTATION).withMessage('Invalid mother salutation'),
  body('mother_name').notEmpty().withMessage('Mother name is required').isLength({ max: 200 }),
  opt(body('mother_age_dob').trim().isLength({ max: 50 })),
];

// ─── Step 9: Emergency Contact ────────────────────────────────────────────────
export const emergencyValidation: ValidationChain[] = [
  body('contact_name').notEmpty().withMessage('Contact name is required').isLength({ max: 200 }),
  body('contact_number').notEmpty().matches(/^[+\d\s\-()\s]{7,20}$/).withMessage('Invalid contact number'),
  body('relationship').notEmpty().withMessage('Relationship is required').isLength({ max: 100 }),
];

// ─── Step 10: Statutory / Govt IDs ───────────────────────────────────────────
export const statutoryValidation: ValidationChain[] = [
  body('passport_number').notEmpty().withMessage('Passport number is required').isLength({ max: 30 }),
  body('passport_expiry').notEmpty().withMessage('Passport expiry is required'),
  body('yellow_fever').isBoolean().withMessage('Yellow fever must be Yes/No'),
  opt(body('yellow_fever_date')),
  body('driving_license_number').notEmpty().withMessage('Driving license is required').isLength({ max: 30 }),
  body('driving_license_expiry').notEmpty().withMessage('Driving license expiry is required'),
  body('aadhaar_number').notEmpty().withMessage('Aadhaar is required').matches(/^\d{12}$/).withMessage('Aadhaar must be 12 digits'),
  body('aadhaar_address').notEmpty().withMessage('Aadhaar address is required'),
  body('pan_number').notEmpty().withMessage('PAN is required')
    .toUpperCase().matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('Invalid PAN format (ABCDE1234F)'),
  body('pan_full_name').notEmpty().withMessage('PAN name is required').isLength({ max: 200 }),
  body('pan_dob').notEmpty().withMessage('PAN DOB is required'),
  body('pan_parent_spouse_name').notEmpty().withMessage('PAN parent/spouse name is required').isLength({ max: 200 }),
];

// ─── Step 11: Bank Details ────────────────────────────────────────────────────
export const bankValidation: ValidationChain[] = [
  body('personal_bank_name').notEmpty().withMessage('Bank name is required').isLength({ max: 200 }),
  body('personal_bank_account').notEmpty().withMessage('Account number is required')
    .matches(/^\d{9,18}$/).withMessage('Account number must be 9-18 digits'),
  body('personal_ifsc').notEmpty().withMessage('IFSC is required')
    .toUpperCase().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Invalid IFSC format'),
  body('personal_bank_branch').notEmpty().withMessage('Branch name is required').isLength({ max: 200 }),
  opt(body('official_bank_name').trim().isLength({ max: 200 })),
  opt(body('official_bank_account').trim().matches(/^\d{9,18}$/)),
  opt(body('official_ifsc').trim().toUpperCase().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)),
  opt(body('official_bank_branch').trim().isLength({ max: 200 })),
];

// ─── Step 12: Experience & Education ─────────────────────────────────────────
export const experienceValidation: ValidationChain[] = [
  body('is_experienced').isBoolean().withMessage('Experienced must be Yes/No'),
  opt(body('last_company_name').trim().isLength({ max: 300 })),
  opt(body('last_designation').trim().isLength({ max: 200 })),
  opt(body('last_working_day')),
  opt(body('exp_contact_name').trim().isLength({ max: 200 })),
  opt(body('exp_contact_number').trim().matches(/^[+\d\s\-()\s]{7,20}$/)),
  opt(body('last_inhand_salary').isFloat({ min: 0 })),
  body('highest_education').notEmpty().withMessage('Highest education is required').isLength({ max: 100 }),
  opt(body('education_stream').trim().isLength({ max: 100 })),
  opt(body('education_mode').trim().isLength({ max: 50 })),
  opt(body('institute_name').trim().isLength({ max: 300 })),
  opt(body('passing_year').isInt({ min: 1950, max: new Date().getFullYear() + 1 })),
  opt(body('education_marks').trim().isLength({ max: 20 })),
];

// ─── Step 13: Salary & Asset Deduction ───────────────────────────────────────
export const salaryValidation: ValidationChain[] = [
  body('salary_mode').isIn(SALARY_MODE).withMessage('Invalid salary mode'),
  body('current_basic').isFloat({ min: 0 }).withMessage('Current basic is required'),
  body('current_hra').isFloat({ min: 0 }).withMessage('Current HRA is required'),
  body('current_allowance1').isFloat({ min: 0 }).withMessage('Current allowance is required'),
  body('current_amdb').isFloat({ min: 0 }).withMessage('Current AMDB is required'),
  body('joining_basic').isFloat({ min: 0 }).withMessage('Joining basic is required'),
  body('joining_hra').isFloat({ min: 0 }).withMessage('Joining HRA is required'),
  body('joining_allowance1').isFloat({ min: 0 }).withMessage('Joining allowance is required'),
  body('joining_amdb').isFloat({ min: 0 }).withMessage('Joining AMDB is required'),
  body('asset_deduction_applicable').isBoolean().withMessage('Asset deduction must be Yes/No'),
  opt(body('security_amount').isFloat({ min: 0 })),
  opt(body('deduction_months').isIn(DEDUCTION_MONTHS)),
  opt(body('deduction_from').isIn(DEDUCTION_FROM)),
  opt(body('monthly_deduction').isFloat({ min: 0 })),
];

// ─── Step 14: Onboarding Documents ───────────────────────────────────────────
export const onboardingDocsValidation: ValidationChain[] = [
  body('offer_letter').isBoolean().withMessage('Offer letter status required'),
  body('address_verification').isBoolean().withMessage('Address verification status required'),
  body('service_agreement').isBoolean().withMessage('Service agreement status required'),
  body('indemnity_bond').isBoolean().withMessage('Indemnity bond status required'),
  body('asset_deduction_letter').isBoolean().withMessage('Asset deduction letter status required'),
  body('account_opening_letter').isBoolean().withMessage('Account opening letter status required'),
  body('nda').isBoolean().withMessage('NDA status required'),
];

// Step validation map for dynamic routing
export const STEP_VALIDATORS: Record<string, ValidationChain[]> = {
  basic:           basicValidation,
  employment:      employmentValidation,
  reporting:       reportingValidation,
  commitment:      commitmentValidation,
  schemes:         schemesValidation,
  personal:        personalValidation,
  address:         addressValidation,
  family:          familyValidation,
  emergency:       emergencyValidation,
  statutory:       statutoryValidation,
  bank:            bankValidation,
  experience:      experienceValidation,
  salary:          salaryValidation,
  onboarding_docs: onboardingDocsValidation,
  review:          [],
};