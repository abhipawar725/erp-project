export type CandidateStatus =
  | 'Applied' | 'Shortlisted' | 'Interview' | 'Technical' | 'HR Round'
  | 'Offered' | 'Hired' | 'Rejected' | 'Withdrawn' | 'On Hold';

export type CandidateSource =
  | 'Naukri' | 'LinkedIn' | 'CollarCheck' | 'Referral'
  | 'Walk-in' | 'Indeed' | 'Direct' | 'Other';

export type CandidateGender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';
export type NoticePeriodUnit = 'Days' | 'Months';

export interface Candidate {
  id:                       number;
  company_id:               number;
  job_id?:                  number | null;
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
  status:                   CandidateStatus;
  remarks?:                 string | null;
  resume_url?:              string | null;
  created_at:               string;
  updated_at:               string;
}

export interface CandidateStats {
  summary: {
    total: number; hired: number; active: number;
    rejected: number; thisMonth: number; conversionRate: number;
  };
  pipeline: { status: string; count: number }[];
  sources:  { source: string; count: number }[];
}

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
}

export type UpdateCandidateDto = Partial<CreateCandidateDto> & { status?: CandidateStatus };

export interface CandidateQueryParams {
  page?:           number;
  limit?:          number;
  search?:         string;
  status?:         string;
  source?:         string;
  min_experience?: number;
  max_experience?: number;
  sort?:           string;
  order?:          'ASC' | 'DESC';
}

export interface BulkUploadResult {
  total:    number;
  success:  number;
  failed:   number;
  errors:   { row: number; name: string; reason: string }[];
  inserted: number[];
}

export const PIPELINE_STAGES: CandidateStatus[] = [
  'Applied', 'Shortlisted', 'Interview', 'Technical',
  'HR Round', 'Offered', 'Hired',
];

export const ALL_STATUSES: CandidateStatus[] = [
  'Applied', 'Shortlisted', 'Interview', 'Technical', 'HR Round',
  'Offered', 'Hired', 'Rejected', 'Withdrawn', 'On Hold',
];

export const ALL_SOURCES: CandidateSource[] = [
  'Naukri', 'LinkedIn', 'CollarCheck', 'Referral', 'Walk-in', 'Indeed', 'Direct', 'Other',
];

export const STATUS_COLORS: Record<CandidateStatus, { bg: string; text: string; border: string }> = {
  'Applied':     { bg: 'var(--blue-lt)',   text: 'var(--blue)',   border: 'var(--blue-md)'   },
  'Shortlisted': { bg: 'var(--teal-lt)',   text: 'var(--teal)',   border: 'var(--teal-bd)'   },
  'Interview':   { bg: 'var(--purple-lt)', text: 'var(--purple)', border: 'var(--purple-bd)' },
  'Technical':   { bg: 'var(--amber-lt)',  text: 'var(--amber)',  border: 'var(--amber-bd)'  },
  'HR Round':    { bg: 'var(--pink-lt)',   text: 'var(--pink)',   border: 'var(--pink-bd)'   },
  'Offered':     { bg: 'var(--green-lt)',  text: 'var(--green)',  border: 'var(--green-bd)'  },
  'Hired':       { bg: 'var(--green-lt)',  text: 'var(--green)',  border: 'var(--green-bd)'  },
  'Rejected':    { bg: 'var(--red-lt)',    text: 'var(--red)',    border: 'var(--red-bd)'    },
  'Withdrawn':   { bg: 'var(--surface2)',  text: 'var(--ink4)',   border: 'var(--border)'    },
  'On Hold':     { bg: 'var(--amber-lt)',  text: 'var(--amber)',  border: 'var(--amber-bd)'  },
};

export const SOURCE_EMOJI: Record<string, string> = {
  'Naukri': '🔵', 'LinkedIn': '💼', 'CollarCheck': '🟣',
  'Referral': '🤝', 'Walk-in': '🚶', 'Indeed': '🔍',
  'Direct': '📧', 'Other': '➕',
};
