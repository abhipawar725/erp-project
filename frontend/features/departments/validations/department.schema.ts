import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z
    .string().min(1, 'Department name is required').max(200).trim(),
  code: z
    .string().max(20, 'Code max 20 characters').trim().optional().or(z.literal('')),
  head_id:   z.number().int().positive().optional().nullable(),
  parent_id: z.number().int().positive().optional().nullable(),
});

export const updateDepartmentSchema = createDepartmentSchema
  .extend({ is_active: z.boolean().optional() })
  .partial();

export type CreateDepartmentFormData = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentFormData = z.infer<typeof updateDepartmentSchema>;
