import { body, param, query, ValidationChain } from 'express-validator';

const SOURCES  = ['Naukri','LinkedIn','CollarCheck','Referral','Walk-in','Indeed','Direct','Other'];
const STATUSES = ['Applied','Shortlisted','Interview_Scheduled','Technical','HR_Round','Interview_Result','Offered','Hired','Rejected','Withdrawn','On_Hold'];

export const listCandidateValidation: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString().trim().isLength({ max: 100 }),
  query('status').optional().isIn(STATUSES),
  query('source').optional().isIn(SOURCES),
  query('min_experience').optional().isFloat({ min: 0 }),
  query('max_experience').optional().isFloat({ min: 0 }),
];

export const createCandidateValidation: ValidationChain[] = [
  body('candidate_name').trim().notEmpty().withMessage('Candidate name is required').isLength({ max: 200 }),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('phone_number').optional({ nullable: true }).matches(/^[+\d\s\-()]{7,20}$/),
  body('gender').optional({ nullable: true }).isIn(['Male','Female','Other','Prefer not to say']),
  body('total_experience').optional({ nullable: true }).isFloat({ min: 0, max: 60 }),
  body('relevant_experience').optional({ nullable: true }).isFloat({ min: 0, max: 60 }),
  body('current_salary').optional({ nullable: true }).isFloat({ min: 0 }),
  body('expected_salary').optional({ nullable: true }).isFloat({ min: 0 }),
  body('notice_period').optional({ nullable: true }).isInt({ min: 0 }),
  body('immediate_joiner').optional().isBoolean(),
  body('own_vehicle').optional().isBoolean(),
  body('expected_joining_date').optional({ nullable: true }).isISO8601(),
  body('source').optional({ nullable: true }).isIn(SOURCES),
  body('skills').optional({ nullable: true }).isArray(),
];

export const updateCandidateValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }),
  body('status').optional().isIn(STATUSES),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('phone_number').optional({ nullable: true }).matches(/^[+\d\s\-()]{7,20}$/),
  body('total_experience').optional({ nullable: true }).isFloat({ min: 0, max: 60 }),
  body('source').optional({ nullable: true }).isIn(SOURCES),
];

export const scheduleInterviewValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }),
  body('interview_date').notEmpty().isISO8601().withMessage('Valid interview date required'),
  body('interview_time').notEmpty().matches(/^\d{2}:\d{2}$/).withMessage('Time must be HH:MM'),
  body('interview_type').notEmpty().isIn(['Online','Offline','Phone']),
  body('interview_link').optional({ nullable: true }).isURL(),
  body('interview_instructions').optional({ nullable: true }).isString(),
];

export const moveStatusValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }),
  body('status').notEmpty().isIn(STATUSES),
  body('remarks').optional({ nullable: true }).isString().isLength({ max: 1000 }),
];

export const idValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }),
];


export const interviewResultValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }),
  body('interview_result_by')
    .isInt({ min: 1 }).withMessage('Interviewer (employee) is required'),
  body('interview_result_mode')
    .notEmpty().withMessage('Interview mode is required')
    .isIn(['Online','Offline']).withMessage('Mode must be Online or Offline'),
  body('interview_result_date')
    .notEmpty().withMessage('Interview date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('interview_result_feedback')
    .optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body('candidate_decision')
    .notEmpty().withMessage('Candidate decision is required')
    .isIn(['Select','Reject','On_Hold']).withMessage('Decision must be Select, Reject, or On_Hold'),
  body('decision_reason')
    .optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body('decision_joining_date')
    .optional({ nullable: true }).isISO8601().withMessage('Invalid joining date format'),
];

export const portalLoginValidation: ValidationChain[] = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export const rescheduleValidation: ValidationChain[] = [
  body('reason').notEmpty().withMessage('Reason is required').isLength({ max: 500 }),
  body('proposed_date').optional({ nullable: true }).isISO8601(),
  body('proposed_time').optional({ nullable: true }).matches(/^\d{2}:\d{2}$/),
];

export const handleRescheduleValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }),
  body('decision').notEmpty().isIn(['Approved','Rejected']),
  body('new_date').optional({ nullable: true }).isISO8601(),
  body('new_time').optional({ nullable: true }).matches(/^\d{2}:\d{2}$/),
];

// ─── Send offer ───────────────────────────────────────────────────────────────
export const sendOfferValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }),
  body('offered_ctc')
    .isFloat({ min: 1 }).withMessage('Offered CTC must be a positive number'),
  body('confirmed_joining_date')
    .notEmpty().withMessage('Confirmed joining date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('offer_valid_till')
    .notEmpty().withMessage('Offer valid till date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('offer_letter_url')
    .optional({ nullable: true }).isURL().withMessage('Invalid URL for offer letter'),
];

// ─── Hire candidate ───────────────────────────────────────────────────────────
export const hireCandidateValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }),
  body('department_id')
    .isInt({ min: 1 }).withMessage('Department is required'),
  body('designation_id')
    .isInt({ min: 1 }).withMessage('Designation is required'),
  body('employment_type')
    .notEmpty().withMessage('Employment type is required')
    .isIn(['Full-time','Part-time','Contract','Intern']),
  body('date_of_joining')
    .notEmpty().withMessage('Date of joining is required')
    .isISO8601().withMessage('Invalid date format'),
  body('reporting_manager_id')
    .optional({ nullable: true }).isInt({ min: 1 }),
];

// ─── Withdraw ─────────────────────────────────────────────────────────────────
export const withdrawValidation: ValidationChain[] = [
  param('id').isInt({ min: 1 }),
  body('reason')
    .trim().notEmpty().withMessage('Withdrawal reason is required')
    .isLength({ min: 5, max: 1000 }).withMessage('Reason must be between 5 and 1000 characters'),
];
