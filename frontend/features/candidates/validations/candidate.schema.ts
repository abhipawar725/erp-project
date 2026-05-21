import { z } from 'zod';

const SOURCES  = ['Naukri','LinkedIn','CollarCheck','Referral','Walk-in','Indeed','Direct','Other'] as const;
const GENDERS  = ['Male','Female','Other','Prefer not to say'] as const;

export const candidateSchema = z.object({
  // ── Required ──────────────────────────────────────────────────────────────
  candidate_name: z
    .string().min(1, 'Candidate name is required').max(200).trim(),

  // ── Personal ──────────────────────────────────────────────────────────────
  email: z
    .string().email('Enter a valid email').optional().or(z.literal('')),
  phone_number: z
    .string().regex(/^[+\d\s\-()]{7,20}$/, 'Invalid phone number').optional().or(z.literal('')),
  gender: z
    .enum([...GENDERS, '']).optional(),
  date_of_birth: z
    .string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format').optional().or(z.literal('')),

  // ── Professional ──────────────────────────────────────────────────────────
  current_company_name:    z.string().max(200).optional().or(z.literal('')),
  last_company_designation: z.string().max(200).optional().or(z.literal('')),
  qualification:           z.string().max(200).optional().or(z.literal('')),
  location:                z.string().max(200).optional().or(z.literal('')),
  total_experience: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'Min 0').max(60, 'Max 60')
    .optional().nullable(),
  relevant_experience: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0).max(60)
    .optional().nullable(),
  skills: z.string().optional().or(z.literal('')), // comma-separated input → array on submit

  // ── Compensation ──────────────────────────────────────────────────────────
  current_salary: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0).optional().nullable(),
  expected_salary: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0).optional().nullable(),

  // ── Availability ──────────────────────────────────────────────────────────
  notice_period: z
    .number({ invalid_type_error: 'Enter a number' })
    .int().min(0).optional().nullable(),
  notice_period_unit:    z.enum(['Days', 'Months', '']).optional(),
  immediate_joiner:      z.boolean().optional(),
  expected_joining_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  own_vehicle:           z.boolean().optional(),

  // ── Sourcing ──────────────────────────────────────────────────────────────
  source:           z.enum([...SOURCES, '']).optional(),
  reference_source: z.string().max(300).optional().or(z.literal('')),
  remarks:          z.string().max(1000).optional().or(z.literal('')),
});

export type CandidateFormData = z.infer<typeof candidateSchema>;
