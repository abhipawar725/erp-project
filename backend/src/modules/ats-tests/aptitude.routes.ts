import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate }   from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import {
  createTest, getTests, getTest,
  addQuestion, updateQuestion, deleteQuestion,
  getCandidateResult,
  portalGetTest, portalSubmitTest,
} from './aptitude.controller';

const router = Router();

// ─── HR routes ────────────────────────────────────────────────────────────────
router.get('/', authenticate, getTests);
router.get('/:id', authenticate, getTest);
router.post('/',
  authenticate,
  [
    body('title').notEmpty().withMessage('Title required'),
    body('duration_minutes').isInt({ min: 1 }).withMessage('Duration required'),
    body('total_marks').isFloat({ min: 0 }).withMessage('Total marks required'),
  ],
  validate,
  createTest,
);

router.post('/:id/questions',
  authenticate,
  [
    param('id').isInt({ min: 1 }),
    body('question_text').notEmpty(),
    body('option_a').notEmpty(), body('option_b').notEmpty(),
    body('option_c').notEmpty(), body('option_d').notEmpty(),
    body('correct_option').isIn(['A','B','C','D']),
    body('marks').optional().isFloat({ min: 0 }),
    body('negative_marks').optional().isFloat({ min: 0 }),
  ],
  validate,
  addQuestion,
);

router.put('/:id/questions/:qid', authenticate, updateQuestion);
router.delete('/:id/questions/:qid', authenticate, deleteQuestion);
router.get('/:id/candidates/:candidateId/result', authenticate, getCandidateResult);

// ─── Portal routes (candidate) ────────────────────────────────────────────────
router.get('/portal/:id',        portalGetTest);
router.post('/portal/:id/submit',
  [body('answers').isArray({ min: 1 }).withMessage('Answers required'), body('time_taken').optional().isInt()],
  validate,
  portalSubmitTest,
);

export default router;
