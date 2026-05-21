import { body, param, query, ValidationChain } from 'express-validator';

const SOURCES  = ['Naukri','LinkedIn','CollarCheck','Referral','Walk-in','Indeed','Direct','Other'];
const STATUSES = ['Applied','Shortlisted','Interview','Technical','HR Round','Offered','Hired','Rejected','Withdrawn','On Hold'];

// ─── List query ───────────────────────────────────────────────────────────────
export const listCandidateValidation: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString().trim().isLength({ max: 100 }),
  query('status').optional().isIn(STATUSES),
  query('source').optional().isIn(SOURCES),
  query('job_id').optional().isInt({ min: 1 }),
  query('min_experience').optional().isFloat({ min: 0 }),
  query('max_experience').optional().isFloat({ min: 0 }),
  query('sort').optional().isIn(['candidate_name','created_at','total_experience','expected_salary','status']),
  query('order').optional().isIn(['ASC','DESC']),
];

// ─── Create ───────────────────────────────────────────────────────────────────
export const createCandidateValidation: ValidationChain[] = [
  body('candidate_name')
    .trim().notEmpty().withMessage('Candidate name is required')
    .isLength({ max: 200 }).withMessage('Name max 200 characters'),
  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Enter a valid email address')
    .normalizeEmail(),
  body('phone_number')
    .optional({ nullable: true })
    .trim().matches(/^[+\d\s\-()]{7,20}$/).withMessage('Invalid phone number'),
  body('gender')
    .optional({ nullable: true })
    .isIn(['Male','Female','Other','Prefer not to say']),
  body('date_of_birth')
    .optional({ nullable: true })
    .isISO8601().withMessage('Invalid date format'),
  body('total_experience')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 60 }).withMessage('Experience must be 0–60'),
  body('relevant_experience')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 60 }).withMessage('Relevant experience must be 0–60'),
  body('current_salary')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Salary must be a positive number'),
  body('expected_salary')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Expected salary must be a positive number'),
  body('notice_period')
    .optional({ nullable: true })
    .isInt({ min: 0 }).withMessage('Notice period must be a non-negative integer'),
  body('notice_period_unit')
    .optional({ nullable: true })
    .isIn(['Days','Months']),
  body('immediate_joiner')
    .optional().isBoolean(),
  body('own_vehicle')
    .optional().isBoolean(),
  body('expected_joining_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('Invalid date format'),
  body('source')
    .optional({ nullable: true })
    .isIn(SOURCES).withMessage(`Source must be one of: ${SOURCES.join(', ')}`),
  body('skills')
    .optional({ nullable: true })
    .isArray().withMessage('Skills must be an array'),
];

// ─── Update ───────────────────────────────────────────────────────────────────
export const updateCandidateValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('Invalid candidate ID'),
  body('status')
    .optional()
    .isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  body('email')
    .optional({ nullable: true })
    .isEmail().normalizeEmail(),
  body('phone_number')
    .optional({ nullable: true })
    .matches(/^[+\d\s\-()]{7,20}$/),
  body('total_experience')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 60 }),
  body('relevant_experience')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 60 }),
  body('source')
    .optional({ nullable: true })
    .isIn(SOURCES),
];

// ─── Move status ──────────────────────────────────────────────────────────────
export const moveStatusValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(STATUSES).withMessage(`Invalid status`),
  body('remarks')
    .optional({ nullable: true })
    .isString().isLength({ max: 1000 }),
];

// ─── ID param ─────────────────────────────────────────────────────────────────
export const idValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }).withMessage('Invalid candidate ID'),
];
