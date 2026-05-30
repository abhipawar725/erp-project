import { Router }     from 'express';
import multer         from 'multer';
import path           from 'path';
import crypto         from 'crypto';
import fs             from 'fs';
import { validate }   from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getCandidates, getCandidateStats, getCandidate,
  createCandidate, updateCandidate, moveCandidateStatus,
  deleteCandidate, uploadResume, bulkUploadCandidates,
  scheduleInterview, handleReschedule, grantPortalAccess, submitInterviewResult,
  sendOffer, hireCandidate, withdrawCandidate, sendPreInterviewForm, sendAptitudeTestLink,
  getPreInterviewForm, getPreJoiningForm,
  portalLogin, portalMagicLink, portalVerifyMagic,
  portalAuthenticate, portalGetProfile, portalGetCompanyInfo, portalSavePreJoining,
  portalRespondInterview, portalRequestReschedule, portalSavePreinterview,sendPreJoiningFormLink
} from './candidate.controller';
import {
  listCandidateValidation, createCandidateValidation,
  updateCandidateValidation, scheduleInterviewValidation,
  moveStatusValidation, interviewResultValidation, idValidation,
  sendOfferValidation, hireCandidateValidation, withdrawValidation,
  portalLoginValidation, rescheduleValidation, handleRescheduleValidation,
} from './candidate.validation';
import { env } from '../../config/env';

// ─── Multer: Resume ───────────────────────────────────────────────────────────
const resumeDir = path.join(process.cwd(), env.upload.dir, 'resumes');
if (!fs.existsSync(resumeDir)) fs.mkdirSync(resumeDir, { recursive: true });

const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, resumeDir),
    filename:    (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, ['.pdf','.doc','.docx'].includes(ext));
  },
});

// ─── Multer: CSV bulk ─────────────────────────────────────────────────────────
const bulkDir = path.join(process.cwd(), env.upload.dir, 'bulk');
if (!fs.existsSync(bulkDir)) fs.mkdirSync(bulkDir, { recursive: true });

const allowedExtensions = ['.csv', '.xlsx', '.xls'];

export const bulkUpload = multer({
  dest: bulkDir,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (_req, file, cb) => {
    const ext = path
      .extname(file.originalname)
      .toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return cb(
        new Error(
          'Only CSV, XLSX and XLS files are allowed',
        ),
      );
    }

    cb(null, true);
  },
});

const router = Router();

// ─── HR routes (JWT protected) ────────────────────────────────────────────────
router.get('/stats', authenticate, getCandidateStats);
router.get('/',      authenticate, listCandidateValidation, validate, getCandidates);
router.get('/:id',   authenticate, idValidation, validate, getCandidate);

router.post('/',     authenticate, createCandidateValidation, validate, createCandidate);
router.post('/bulk', authenticate, bulkUpload.single('file'), bulkUploadCandidates);

router.put('/:id',   authenticate, updateCandidateValidation, validate, updateCandidate);

router.patch('/:id/status',   authenticate, moveStatusValidation, validate, moveCandidateStatus);
router.patch('/:id/interview', authenticate, scheduleInterviewValidation, validate, scheduleInterview);
router.patch('/:id/reschedule-decision', authenticate, handleRescheduleValidation, validate, handleReschedule);
router.patch('/:id/portal-access', authenticate, grantPortalAccess);

router.delete('/:id', authenticate, idValidation, validate, deleteCandidate);

router.post('/:id/resume', authenticate, idValidation, validate, resumeUpload.single('resume'), uploadResume);


// PATCH /api/candidates/:id/interview-result
router.patch('/:id/interview-result', authenticate, interviewResultValidation, validate, submitInterviewResult);


// ─── Offer / Hire / Withdrawal / Pre-interview form ──────────────────────────
router.patch('/:id/send-offer',           authenticate, sendOfferValidation,      validate, sendOffer);
router.patch('/:id/hire',                 authenticate, hireCandidateValidation,   validate, hireCandidate);
router.patch('/:id/withdraw',             authenticate, withdrawValidation,        validate, withdrawCandidate);
router.post('/:id/send-pre-interview',    authenticate, idValidation,             validate, sendPreInterviewForm);
router.post('/:id/send-aptitude-test',     authenticate, idValidation,             validate, sendAptitudeTestLink);
router.get('/:id/form/pre-interview',       authenticate, idValidation,             validate, getPreInterviewForm);
router.get('/:id/form/pre-joining',         authenticate, idValidation,             validate, getPreJoiningForm);
router.post('/:id/send-pre-joining',        authenticate, idValidation,             validate, sendPreJoiningFormLink);

// ─── Candidate portal routes (portal JWT) ────────────────────────────────────
router.post('/portal/login',        portalLoginValidation, validate, portalLogin);
router.post('/portal/magic-link',   portalMagicLink);
router.post('/portal/verify-magic', portalVerifyMagic);
router.get('/portal/profile',       portalAuthenticate, portalGetProfile);
router.get('/portal/company-info',   portalAuthenticate, portalGetCompanyInfo);
router.post('/portal/interview-response', portalAuthenticate, portalRespondInterview);
router.post('/portal/reschedule',         portalAuthenticate, rescheduleValidation, validate, portalRequestReschedule);
router.post('/portal/reschedule',         portalAuthenticate, rescheduleValidation, validate, portalRequestReschedule);
router.post('/portal/preinterview',            portalAuthenticate, portalSavePreinterview);
router.post('/portal/prejoining',         portalAuthenticate, portalSavePreJoining);

export default router;
