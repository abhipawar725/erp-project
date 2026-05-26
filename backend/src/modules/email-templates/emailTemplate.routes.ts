import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate }    from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getBranding, saveBranding,
  getAllTemplates, getTemplate, saveTemplate,
  resetTemplate, toggleTemplate,
  getPreview, sendTestEmail,
} from './emailTemplate.controller';
import { EMAIL_TEMPLATE_TYPES } from '../../database/models/EmailTemplate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── Branding ─────────────────────────────────────────────────────────────────
router.get('/branding',  getBranding);
router.put('/branding',  saveBranding);
router.post('/branding', saveBranding);

// ─── Templates ────────────────────────────────────────────────────────────────
router.get('/', getAllTemplates);

router.get('/:type',
  [param('type').isIn(EMAIL_TEMPLATE_TYPES)],
  validate,
  getTemplate,
);

router.put('/:type',
  [
    param('type').isIn(EMAIL_TEMPLATE_TYPES),
    body('subject').optional({ nullable: true }).isString().isLength({ max: 500 }),
    body('body_html').optional({ nullable: true }).isString(),
    body('preview_text').optional({ nullable: true }).isString().isLength({ max: 200 }),
    body('is_active').optional().isBoolean(),
  ],
  validate,
  saveTemplate,
);

router.post('/:type',
  [param('type').isIn(EMAIL_TEMPLATE_TYPES)],
  validate,
  saveTemplate,
);

router.delete('/:type/reset',
  [param('type').isIn(EMAIL_TEMPLATE_TYPES)],
  validate,
  resetTemplate,
);

router.patch('/:type/toggle',
  [
    param('type').isIn(EMAIL_TEMPLATE_TYPES),
    body('is_active').isBoolean().withMessage('is_active must be boolean'),
  ],
  validate,
  toggleTemplate,
);

router.post('/:type/preview',
  [param('type').isIn(EMAIL_TEMPLATE_TYPES)],
  validate,
  getPreview,
);

router.post('/:type/test',
  [
    param('type').isIn(EMAIL_TEMPLATE_TYPES),
    body('to_email').isEmail().normalizeEmail(),
  ],
  validate,
  sendTestEmail,
);

export default router;
