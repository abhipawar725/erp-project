import { body, query, param, ValidationChain } from 'express-validator';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const optional = (chain: ValidationChain) => chain.optional({ nullable: true, checkFalsy: false });

// ─── Step 1: Basic Info ───────────────────────────────────────────────────────
export const basicInfoValidation: ValidationChain[] = [
  body('employee_code')
    .trim()
    .notEmpty().withMessage('Employee code is required')
    .isLength({ max: 50 }).withMessage('Employee code max 50 chars'),

  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 100 }).withMessage('First name max 100 chars'),

  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 100 }).withMessage('Last name max 100 chars'),

  body('email')
    .trim()
    .isEmail().withMessage('Valid work email is required')
    .normalizeEmail()
    .isLength({ max: 255 }),

  optional(body('personal_email').trim().isEmail().withMessage('Invalid personal email')),
  optional(body('phone').trim().matches(/^[+\d\s\-()]{7,20}$/).withMessage('Invalid phone number')),
  optional(body('date_of_birth').isISO8601().withMessage('Invalid date of birth')),
  optional(body('gender').isIn(['Male', 'Female', 'Other', 'Prefer not to say'])),
  optional(body('blood_group').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])),
  optional(body('marital_status').isIn(['Single', 'Married', 'Divorced', 'Widowed'])),
  optional(body('nationality').trim().isLength({ max: 100 })),
];

// ─── Step 2: Employment ───────────────────────────────────────────────────────
export const employmentValidation: ValidationChain[] = [
  body('employment_type')
    .notEmpty().withMessage('Employment type is required')
    .isIn(['Full-time', 'Part-time', 'Contract', 'Intern'])
    .withMessage('Invalid employment type'),

  body('work_location')
    .notEmpty().withMessage('Work location is required')
    .isIn(['Office', 'WFH', 'Hybrid'])
    .withMessage('Invalid work location'),

  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['Active', 'On_Probation', 'Left', 'Absconding'])
    .withMessage('Invalid employee status'),

  optional(body('department_id').isInt({ min: 1 })),
  optional(body('designation_id').isInt({ min: 1 })),
  optional(body('reporting_manager_id').isInt({ min: 1 })),
  optional(body('date_of_joining').isISO8601().withMessage('Invalid joining date')),
  optional(body('date_of_confirmation').isISO8601().withMessage('Invalid confirmation date')),
];

// ─── Step 3: Address ─────────────────────────────────────────────────────────
export const addressValidation: ValidationChain[] = [
  optional(body('address_line1').trim().isLength({ max: 300 })),
  optional(body('address_line2').trim().isLength({ max: 300 })),
  optional(body('city').trim().isLength({ max: 100 })),
  optional(body('state').trim().isLength({ max: 100 })),
  optional(body('pincode').trim().isLength({ min: 4, max: 10 }).withMessage('Invalid pincode')),
];

// ─── Step 4: Statutory ────────────────────────────────────────────────────────
export const statutoryValidation: ValidationChain[] = [
  optional(
    body('aadhaar_number')
      .trim()
      .matches(/^\d{12}$/)
      .withMessage('Aadhaar must be 12 digits'),
  ),
  optional(
    body('pan_number')
      .trim()
      .toUpperCase()
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
      .withMessage('PAN must be in format ABCDE1234F'),
  ),
  optional(body('passport_number').trim().isLength({ max: 30 })),
  optional(body('uan_number').trim().matches(/^\d{12}$/).withMessage('UAN must be 12 digits')),
  optional(body('pf_number').trim().isLength({ max: 30 })),
  optional(body('esi_number').trim().isLength({ max: 30 })),
];

// ─── Step 5: Bank ─────────────────────────────────────────────────────────────
export const bankValidation: ValidationChain[] = [
  optional(body('bank_name').trim().isLength({ max: 200 })),
  optional(
    body('bank_account_number')
      .trim()
      .matches(/^\d{9,18}$/)
      .withMessage('Bank account number must be 9–18 digits'),
  ),
  optional(
    body('ifsc_code')
      .trim()
      .toUpperCase()
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
      .withMessage('IFSC must be in format ABCD0123456'),
  ),
];

// ─── Full create (all steps combined) ────────────────────────────────────────
export const createEmployeeValidation: ValidationChain[] = [
  ...basicInfoValidation,
  ...employmentValidation,
  ...addressValidation,
  ...statutoryValidation,
  ...bankValidation,
];

// ─── Query params ─────────────────────────────────────────────────────────────
export const listEmployeeValidation: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['Active', 'On_Probation', 'Left', 'Absconding']),
  query('employment_type').optional().isIn(['Full-time', 'Part-time', 'Contract', 'Intern']),
  query('work_location').optional().isIn(['Office', 'WFH', 'Hybrid']),
  query('order').optional().isIn(['ASC', 'DESC']),
];

export const employeeIdValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('Invalid employee ID'),
];
