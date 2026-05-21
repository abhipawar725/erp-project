import type { CandidateStatus, CandidateSource, CandidateGender, NoticePeriodUnit } from '../../database/models/Candidate';

// ─── Create / Update DTOs ────────────────────────────────────────────────────

export interface CreateCandidateDto {
  candidate_name:           string;
  email?:                   string | null;
  phone_number?:            string | null;
  gender?:                  CandidateGender | null;
  date_of_birth?:           string | null;

  current_company_name?:    string | null;
  last_company_designation?: string | null;
  qualification?:           string | null;
  location?:                string | null;
  total_experience?:        number | null;
  relevant_experience?:     number | null;
  skills?:                  string[] | null;

  current_salary?:          number | null;
  expected_salary?:         number | null;

  notice_period?:           number | null;
  notice_period_unit?:      NoticePeriodUnit | null;
  immediate_joiner?:        boolean;
  expected_joining_date?:   string | null;
  own_vehicle?:             boolean;

  source?:                  CandidateSource | null;
  reference_source?:        string | null;
  remarks?:                 string | null;
  job_id?:                  number | null;
}

export type UpdateCandidateDto = Partial<CreateCandidateDto> & {
  status?: CandidateStatus;
};

// ─── Query params ────────────────────────────────────────────────────────────
export interface CandidateQueryParams {
  page?:           number | string;
  limit?:          number | string;
  search?:         string;
  status?:         CandidateStatus | string;
  source?:         CandidateSource | string;
  job_id?:         number | string;
  location?:       string;
  min_experience?: number | string;
  max_experience?: number | string;
  sort?:           string;
  order?:          'ASC' | 'DESC';
}

// ─── Bulk upload row shape ────────────────────────────────────────────────────
export interface BulkCandidateRow {
  candidate_name:           string;
  email?:                   string;
  phone_number?:            string;
  gender?:                  string;
  date_of_birth?:           string;
  current_company_name?:    string;
  last_company_designation?: string;
  qualification?:           string;
  location?:                string;
  total_experience?:        string | number;
  relevant_experience?:     string | number;
  skills?:                  string;          // comma-separated in CSV
  current_salary?:          string | number;
  expected_salary?:         string | number;
  notice_period?:           string | number;
  notice_period_unit?:      string;
  immediate_joiner?:        string | boolean;
  expected_joining_date?:   string;
  own_vehicle?:             string | boolean;
  source?:                  string;
  reference_source?:        string;
  remarks?:                 string;
}

// ─── Bulk upload result ───────────────────────────────────────────────────────
export interface BulkUploadResult {
  total:    number;
  success:  number;
  failed:   number;
  errors:   Array<{ row: number; name: string; reason: string }>;
  inserted: number[];  // IDs of created candidates
}
