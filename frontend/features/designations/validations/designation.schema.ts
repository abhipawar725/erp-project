import { z } from 'zod';

export const createDesignationSchema = z.object({
  name: z
    .string()
    .min(1, 'Designation name is required')
    .max(200, 'Name must be 200 characters or less')
    .trim(),
  grade: z
    .string()
    .max(20, 'Grade must be 20 characters or less')
    .trim()
    .optional()
    .or(z.literal('')),
  department_id: z
    .number({ invalid_type_error: 'Select a valid department' })
    .int()
    .positive()
    .optional()
    .nullable(),
});

export const updateDesignationSchema = createDesignationSchema.extend({
  is_active: z.boolean().optional(),
}).partial();

export type CreateDesignationFormData = z.infer<typeof createDesignationSchema>;
export type UpdateDesignationFormData = z.infer<typeof updateDesignationSchema>;
