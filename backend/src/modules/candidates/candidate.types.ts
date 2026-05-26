import type { CandidateStatus, CandidateSource, CandidateGender } from '../../database/models/Candidate';

export interface CreateCandidateDto {
  candidate_name: string;
  email?: string | null;
  phone_number?: string | null;
  gender?: CandidateGender | null;
  date_of_birth?: Date | null;
  current_company_name?: string | null;
  current_company_designation?: string | null;
  qualification?: string | null;
  location?: string | null;
  total_experience?: number | null;
  relevant_experience?: number | null;
  apply_department?: string | null;
  apply_designation?: string | null;
  current_salary?: number | null;
  expected_salary?: number | null;
  notice_period?: number | null;
  immediate_joiner?: boolean;
  expected_joining_date?: Date | null;
  own_vehicle?: boolean;
  source?: CandidateSource | null;
  reference_source?: string | null;
  remarks?: string | null;
  job_id?: number | null;
}

export type UpdateCandidateDto = Partial<CreateCandidateDto> & { status?: CandidateStatus };

export interface CandidateQueryParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
  status?: string;
  source?: string;
  min_experience?: number | string;
  max_experience?: number | string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface BulkCandidateRow {
  candidate_name: string;
  email?: string;
  phone_number?: string;
  gender?: string;
  date_of_birth?: Date;
  current_company_name?: string;
  current_company_designation?: string;
  qualification?: string;
  location?: string;
  total_experience?: string | number;
  relevant_experience?: string | number;
  apply_department?: string;
  apply_designation?: string;
  current_salary?: string | number;
  expected_salary?: string | number;
  notice_period?: string | number;
  immediate_joiner?: string | boolean;
  expected_joining_date?: Date;
  own_vehicle?: string | boolean;
  source?: string;
  reference_source?: string;
  remarks?: string;
}

export interface BulkUploadResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; name: string; reason: string }[];
  inserted: number[];
}
