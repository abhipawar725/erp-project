import { z } from 'zod';

// ─── Create / edit test ───────────────────────────────────────────────────────

export const createTestSchema = z.object({
  title: z
    .string()
    .min(1, 'Test title is required')
    .max(300, 'Title must be 300 characters or less')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional()
    .or(z.literal('')),
  duration_minutes: z
    .number({ invalid_type_error: 'Enter a number' })
    .int('Must be a whole number')
    .min(1, 'Minimum 1 minute')
    .max(180, 'Maximum 180 minutes'),
  total_marks: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'Cannot be negative'),
  pass_marks: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'Cannot be negative')
    .optional()
    .nullable(),
});

export const updateTestSchema = createTestSchema
  .extend({ is_active: z.boolean().optional() })
  .partial();

export type CreateTestFormData = z.infer<typeof createTestSchema>;
export type UpdateTestFormData = z.infer<typeof updateTestSchema>;

// ─── Add / edit question ──────────────────────────────────────────────────────

export const questionSchema = z.object({
  question_text: z
    .string()
    .min(1, 'Question text is required')
    .max(2000, 'Question must be 2000 characters or less')
    .trim(),
  option_a: z
    .string()
    .min(1, 'Option A is required')
    .max(500)
    .trim(),
  option_b: z
    .string()
    .min(1, 'Option B is required')
    .max(500)
    .trim(),
  option_c: z
    .string()
    .min(1, 'Option C is required')
    .max(500)
    .trim(),
  option_d: z
    .string()
    .min(1, 'Option D is required')
    .max(500)
    .trim(),
  correct_option: z
    .enum(['A', 'B', 'C', 'D'], { errorMap: () => ({ message: 'Select the correct answer' }) }),
  marks: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'Cannot be negative')
    .max(100, 'Max 100 marks per question'),
  negative_marks: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'Cannot be negative')
    .max(100, 'Max 100 marks'),
  order_index: z
    .number({ invalid_type_error: 'Enter a number' })
    .int()
    .min(0),
});

export type QuestionFormData = z.infer<typeof questionSchema>;
