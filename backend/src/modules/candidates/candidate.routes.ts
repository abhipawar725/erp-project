import { Router }            from 'express';
import multer                from 'multer';
import path                  from 'path';
import crypto                from 'crypto';
import { validate }          from '../../middleware/validate.middleware';
import { authenticate }      from '../../middleware/auth.middleware';
import {
  getCandidates, getCandidateStats, getCandidate,
  createCandidate, updateCandidate, moveCandidateStatus,
  deleteCandidate, uploadResume, bulkUploadCandidates,
} from './candidate.controller';
import {
  listCandidateValidation, createCandidateValidation,
  updateCandidateValidation, moveStatusValidation, idValidation,
} from './candidate.validation';
import { env } from '../../config/env';
import fs from 'fs';

// ─── Resume upload ────────────────────────────────────────────────────────────
const resumeDir = path.join(process.cwd(), env.upload.dir, 'resumes');
if (!fs.existsSync(resumeDir)) fs.mkdirSync(resumeDir, { recursive: true });

const resumeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, resumeDir),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const resumeUpload = multer({
  storage:    resumeStorage,
  limits:     { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// ─── Bulk CSV upload ──────────────────────────────────────────────────────────
const bulkDir = path.join(process.cwd(), env.upload.dir, 'bulk');
if (!fs.existsSync(bulkDir)) fs.mkdirSync(bulkDir, { recursive: true });

const csvUpload = multer({
  dest:   bulkDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, ext === '.csv');
  },
});

// ─── Routes ────────────────────────────────────────────────────────────────────
const router = Router();
router.use(authenticate);

// GET /api/candidates/stats — MUST be before /:id
router.get('/stats', getCandidateStats);

// GET /api/candidates
router.get('/', listCandidateValidation, validate, getCandidates);

// GET /api/candidates/:id
router.get('/:id', idValidation, validate, getCandidate);

// POST /api/candidates
router.post('/', createCandidateValidation, validate, createCandidate);

// POST /api/candidates/bulk
router.post('/bulk', csvUpload.single('file'), bulkUploadCandidates);

// PUT /api/candidates/:id
router.put('/:id', updateCandidateValidation, validate, updateCandidate);

// PATCH /api/candidates/:id/status
router.patch('/:id/status', moveStatusValidation, validate, moveCandidateStatus);

// DELETE /api/candidates/:id
router.delete('/:id', idValidation, validate, deleteCandidate);

// POST /api/candidates/:id/resume
router.post('/:id/resume', idValidation, validate, resumeUpload.single('resume'), uploadResume);

export default router;
