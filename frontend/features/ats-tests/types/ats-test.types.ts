// ─── Core enums ──────────────────────────────────────────────────────────────

export type CorrectOption = 'A' | 'B' | 'C' | 'D';

// ─── Question (HR view — includes correct_option) ────────────────────────────

export interface AptitudeQuestion {
  id:             number;
  company_id:     number;
  test_id:        number;
  question_text:  string;
  option_a:       string;
  option_b:       string;
  option_c:       string;
  option_d:       string;
  correct_option: CorrectOption;
  marks:          number;
  negative_marks: number;
  order_index:    number;
  is_active:      boolean;
  created_at?:    string;
  updated_at?:    string;
}

// ─── Question (Candidate portal view — correct_option stripped) ───────────────

export interface AptitudeQuestionForCandidate {
  id:            number;
  test_id:       number;
  question_text: string;
  option_a:      string;
  option_b:      string;
  option_c:      string;
  option_d:      string;
  marks:         number;
  order_index:   number;
}

// ─── Test (HR view) ──────────────────────────────────────────────────────────

export interface AptitudeTest {
  id:               number;
  company_id:       number;
  title:            string;
  description?:     string | null;
  duration_minutes: number;
  total_marks:      number;
  pass_marks?:      number | null;
  is_active:        boolean;
  created_by?:      number | null;
  created_at?:      string;
  updated_at?:      string;
  // Populated when fetched with includes
  questions?:       AptitudeQuestion[];
}

// ─── Test (Candidate portal view — pass_marks stripped) ──────────────────────

export interface AptitudeTestForCandidate {
  id:               number;
  title:            string;
  description?:     string | null;
  duration_minutes: number;
  total_marks:      number;
  questions:        AptitudeQuestionForCandidate[];
}

// ─── Candidate answer ────────────────────────────────────────────────────────

export interface CandidateAnswer {
  id:           number;
  candidate_id: number;
  test_id:      number;
  question_id:  number;
  selected:     CorrectOption | null;
  is_correct:   boolean;
  marks_earned: number;
  created_at?:  string;
}

// ─── Result (HR only view) ───────────────────────────────────────────────────

export interface AnswerBreakdown {
  question_id:    number;
  question_text:  string;
  correct_option: CorrectOption;
  selected:       CorrectOption | null;
  is_correct:     boolean;
  marks_earned:   number;
}

export interface CandidateTestResult {
  candidate: {
    id:                    number;
    candidate_name:        string;
    aptitude_score:        number | null;
    aptitude_attempted_at: string | null;
    aptitude_time_taken:   number | null;
  };
  test: {
    id:               number;
    title:            string;
    total_marks:      number;
    pass_marks:       number | null;
    duration_minutes: number;
  };
  score:           number;
  total_marks:     number;
  percentage:      number;
  has_passed:      boolean | null;
  time_taken_secs: number | null;
  answers:         AnswerBreakdown[];
}

// ─── Submission payload (portal) ─────────────────────────────────────────────

export interface TestSubmission {
  answers: {
    question_id: number;
    selected:    CorrectOption | null;
  }[];
  time_taken: number;   // seconds
}

export interface TestSubmissionResult {
  submitted:          boolean;
  questions_answered: number;
  message:            string;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateTestDto {
  title:            string;
  description?:     string | null;
  duration_minutes: number;
  total_marks:      number;
  pass_marks?:      number | null;
}

export interface UpdateTestDto {
  title?:           string;
  description?:     string | null;
  duration_minutes?: number;
  total_marks?:     number;
  pass_marks?:      number | null;
  is_active?:       boolean;
}

export interface CreateQuestionDto {
  question_text:  string;
  option_a:       string;
  option_b:       string;
  option_c:       string;
  option_d:       string;
  correct_option: CorrectOption;
  marks?:         number;
  negative_marks?: number;
  order_index?:   number;
}

export interface UpdateQuestionDto {
  question_text?:  string;
  option_a?:       string;
  option_b?:       string;
  option_c?:       string;
  option_d?:       string;
  correct_option?: CorrectOption;
  marks?:          number;
  negative_marks?: number;
  order_index?:    number;
  is_active?:      boolean;
}

// ─── UI state ─────────────────────────────────────────────────────────────────

/** In-memory answer map used during the test-taking session */
export type AnswerMap = Map<number, CorrectOption>;

/** Used in the question editor form */
export interface QuestionFormState {
  question_text:  string;
  option_a:       string;
  option_b:       string;
  option_c:       string;
  option_d:       string;
  correct_option: CorrectOption;
  marks:          number;
  negative_marks: number;
  order_index:    number;
}

export const BLANK_QUESTION_FORM: QuestionFormState = {
  question_text:  '',
  option_a:       '',
  option_b:       '',
  option_c:       '',
  option_d:       '',
  correct_option: 'A',
  marks:          1,
  negative_marks: 0,
  order_index:    0,
};

export const OPTIONS: CorrectOption[] = ['A', 'B', 'C', 'D'];
