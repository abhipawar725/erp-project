import { body, param, query, ValidationChain } from 'express-validator';

const SOURCES  = ['Naukri','LinkedIn','CollarCheck','Referral','Walk-in','Indeed','Direct','Other'];
const STATUSES = ['Applied','Shortlisted','Interview Scheduled','Technical','HR Round','Offered','Hired','Rejected','Withdrawn','On Hold'];

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
