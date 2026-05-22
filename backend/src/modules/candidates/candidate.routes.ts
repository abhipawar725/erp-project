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
  scheduleInterview, handleReschedule, grantPortalAccess,
  portalLogin, portalMagicLink, portalVerifyMagic,
  portalAuthenticate, portalGetProfile,
  portalRespondInterview, portalRequestReschedule, portalSavePrejoin,
} from './candidate.controller';
import {
  listCandidateValidation, createCandidateValidation,
  updateCandidateValidation, scheduleInterviewValidation,
  moveStatusValidation, idValidation,
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

const csvUpload = multer({
  dest: bulkDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, path.extname(file.originalname).toLowerCase() === '.csv'),
});

const router = Router();

// ─── HR routes (JWT protected) ────────────────────────────────────────────────
router.get('/stats', authenticate, getCandidateStats);
router.get('/',      authenticate, listCandidateValidation, validate, getCandidates);
router.get('/:id',   authenticate, idValidation, validate, getCandidate);

router.post('/',     authenticate, createCandidateValidation, validate, createCandidate);
router.post('/bulk', authenticate, csvUpload.single('file'), bulkUploadCandidates);

router.put('/:id',   authenticate, updateCandidateValidation, validate, updateCandidate);

router.patch('/:id/status',   authenticate, moveStatusValidation, validate, moveCandidateStatus);
router.patch('/:id/interview', authenticate, scheduleInterviewValidation, validate, scheduleInterview);
router.patch('/:id/reschedule-decision', authenticate, handleRescheduleValidation, validate, handleReschedule);
router.patch('/:id/portal-access', authenticate, grantPortalAccess);

router.delete('/:id', authenticate, idValidation, validate, deleteCandidate);

router.post('/:id/resume', authenticate, idValidation, validate, resumeUpload.single('resume'), uploadResume);

// ─── Candidate portal routes (portal JWT) ────────────────────────────────────
router.post('/portal/login',        portalLoginValidation, validate, portalLogin);
router.post('/portal/magic-link',   portalMagicLink);
router.post('/portal/verify-magic', portalVerifyMagic);
router.get('/portal/profile',       portalAuthenticate, portalGetProfile);
router.post('/portal/interview-response', portalAuthenticate, portalRespondInterview);
router.post('/portal/reschedule',         portalAuthenticate, rescheduleValidation, validate, portalRequestReschedule);
router.post('/portal/prejoin',            portalAuthenticate, portalSavePrejoin);

export default router;
