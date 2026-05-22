import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export type CandidateStatus =
  | 'Applied' | 'Shortlisted' | 'Interview Scheduled' | 'Technical'
  | 'HR_Round' | 'Offered' | 'Hired' | 'Rejected' | 'Withdrawn' | 'On Hold';

export type CandidateSource =
  | 'Naukri' | 'LinkedIn' | 'CollarCheck' | 'Referral'
  | 'Walk-in' | 'Indeed' | 'Direct' | 'Other';

export type CandidateGender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';
export type InterviewType = 'Online' | 'Offline' | 'Phone';
export type RescheduleStatus = 'Pending' | 'Approved' | 'Rejected';

export interface CandidateAttributes {
  id:                       number;
  company_id:               number;
  job_id?:                  number | null;

  // ── Personal ──────────────────────────────────────────────────────────────
  candidate_name:           string;
  email?:                   string | null;
  phone_number?:            string | null;
  gender?:                  CandidateGender | null;
  date_of_birth?:           Date | null;

  // ── Professional ──────────────────────────────────────────────────────────
  current_company_name?:    string | null;
  last_company_designation?: string | null;
  qualification?:           string | null;
  location?:                string | null;
  total_experience?:        number | null;
  relevant_experience?:     number | null;
  skills?:                  string[] | null;

  // ── Compensation ──────────────────────────────────────────────────────────
  current_salary?:          number | null;
  expected_salary?:         number | null;

  // ── Availability ──────────────────────────────────────────────────────────
  notice_period?:           number | null;
  immediate_joiner?:        boolean;
  expected_joining_date?:   Date | null;
  own_vehicle?:             boolean;

  // ── Sourcing ──────────────────────────────────────────────────────────────
  source?:                  CandidateSource | null;
  reference_source?:        string | null;
  remarks?:                 string | null;

  // ── Resume ────────────────────────────────────────────────────────────────
  resume_url?:              string | null;

  // ── ATS Status ────────────────────────────────────────────────────────────
  status:                   CandidateStatus;

  // ── Interview ─────────────────────────────────────────────────────────────
  interview_date?:          Date | null;
  interview_time?:          string | null;         // HH:MM
  interview_type?:          InterviewType | null;
  interview_link?:          string | null;
  interview_instructions?:  string | null;
  interview_accepted?:      boolean | null;         // null=pending, true=accepted, false=rejected
  interview_response_at?:   Date | null;

  // ── Reschedule ────────────────────────────────────────────────────────────
  reschedule_requested?:    boolean;
  reschedule_reason?:       string | null;
  reschedule_status?:       RescheduleStatus | null;
  reschedule_proposed_date?: Date | null;
  reschedule_proposed_time?: string | null;

  // ── Portal auth ───────────────────────────────────────────────────────────
  portal_password_hash?:    string | null;
  portal_access_token?:     string | null;       // magic link token
  portal_token_expires?:    Date | null;
  is_portal_user?:          boolean;
  portal_last_login?:       Date | null;

  // ── Pre-joining form ──────────────────────────────────────────────────────
  prejoin_form_data?:       Record<string, unknown> | null;
  prejoin_form_status?:     'Not_Started' | 'Draft' | 'Submitted' | null;
  prejoin_submitted_at?:    Date | null;

  // ── Aptitude test ─────────────────────────────────────────────────────────
  aptitude_score?:          number | null;
  aptitude_attempted_at?:   Date | null;
  aptitude_time_taken?:     number | null;       // seconds

  // ── Audit ─────────────────────────────────────────────────────────────────
  created_by?:              number | null;
  updated_by?:              number | null;
  deleted_by?:              number | null;

  created_at?:              Date;
  updated_at?:              Date;
  deleted_at?:              Date | null;
}

type CandidateCreationAttributes = Optional<
  CandidateAttributes,
  'id' | 'status' | 'immediate_joiner' | 'own_vehicle' | 'is_portal_user' | 'reschedule_requested'
>;

export class Candidate
  extends Model<CandidateAttributes, CandidateCreationAttributes>
  implements CandidateAttributes
{
  public id!:                       number;
  public company_id!:               number;
  public job_id!:                   number | null;
  public candidate_name!:           string;
  public email!:                    string | null;
  public phone_number!:             string | null;
  public gender!:                   CandidateGender | null;
  public date_of_birth!:            Date | null;
  public current_company_name!:     string | null;
  public last_company_designation!: string | null;
  public qualification!:            string | null;
  public location!:                 string | null;
  public total_experience!:         number | null;
  public relevant_experience!:      number | null;
  public skills!:                   string[] | null;
  public current_salary!:           number | null;
  public expected_salary!:          number | null;
  public notice_period!:            number | null;
  public immediate_joiner!:         boolean;
  public expected_joining_date!:    Date | null;
  public own_vehicle!:              boolean;
  public source!:                   CandidateSource | null;
  public reference_source!:         string | null;
  public remarks!:                  string | null;
  public resume_url!:               string | null;
  public status!:                   CandidateStatus;
  public interview_date!:           Date | null;
  public interview_time!:           string | null;
  public interview_type!:           InterviewType | null;
  public interview_link!:           string | null;
  public interview_instructions!:   string | null;
  public interview_accepted!:       boolean | null;
  public interview_response_at!:    Date | null;
  public reschedule_requested!:     boolean;
  public reschedule_reason!:        string | null;
  public reschedule_status!:        RescheduleStatus | null;
  public reschedule_proposed_date!: Date | null;
  public reschedule_proposed_time!: string | null;
  public portal_password_hash!:     string | null;
  public portal_access_token!:      string | null;
  public portal_token_expires!:     Date | null;
  public is_portal_user!:           boolean;
  public portal_last_login!:        Date | null;
  public prejoin_form_data!:        Record<string, unknown> | null;
  public prejoin_form_status!:      'Not_Started' | 'Draft' | 'Submitted' | null;
  public prejoin_submitted_at!:     Date | null;
  public aptitude_score!:           number | null;
  public aptitude_attempted_at!:    Date | null;
  public aptitude_time_taken!:      number | null;
  public created_by!:               number | null;
  public updated_by!:               number | null;
  public deleted_by!:               number | null;
  public readonly created_at!:      Date;
  public readonly updated_at!:      Date;
  public readonly deleted_at!:      Date | null;
}

Candidate.init(
  {
    id:            { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    company_id:    { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    job_id:        { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },

    candidate_name:           { type: DataTypes.STRING(200), allowNull: false },
    email:                    { type: DataTypes.STRING(255), allowNull: true, validate: { isEmail: true } },
    phone_number:             { type: DataTypes.STRING(20),  allowNull: true },
    gender: {
      type: DataTypes.ENUM('Male','Female','Other','Prefer not to say'),
      allowNull: true,
    },
    date_of_birth:            { type: DataTypes.DATEONLY, allowNull: true },
    current_company_name:     { type: DataTypes.STRING(200), allowNull: true },
    last_company_designation: { type: DataTypes.STRING(200), allowNull: true },
    qualification:            { type: DataTypes.STRING(200), allowNull: true },
    location:                 { type: DataTypes.STRING(200), allowNull: true },
    total_experience:         { type: DataTypes.DECIMAL(5,1), allowNull: true },
    relevant_experience:      { type: DataTypes.DECIMAL(5,1), allowNull: true },
    skills:                   { type: DataTypes.JSON, allowNull: true },

    current_salary:           { type: DataTypes.DECIMAL(12,2), allowNull: true },
    expected_salary:          { type: DataTypes.DECIMAL(12,2), allowNull: true },

    notice_period:            { type: DataTypes.INTEGER, allowNull: true },
    immediate_joiner:         { type: DataTypes.BOOLEAN, defaultValue: false },
    expected_joining_date:    { type: DataTypes.DATEONLY, allowNull: true },
    own_vehicle:              { type: DataTypes.BOOLEAN, defaultValue: false },

    source: {
      type: DataTypes.ENUM('Naukri','LinkedIn','CollarCheck','Referral','Walk-in','Indeed','Direct','Other'),
      allowNull: true,
    },
    reference_source:         { type: DataTypes.STRING(300), allowNull: true },
    remarks:                  { type: DataTypes.TEXT, allowNull: true },
    resume_url:               { type: DataTypes.STRING(500), allowNull: true },

    status: {
      type: DataTypes.ENUM('Applied','Shortlisted','Interview Scheduled','Technical','HR Round','Offered','Hired','Rejected','Withdrawn','On Hold'),
      defaultValue: 'Applied',
      allowNull: false,
    },

    // ── Interview ──────────────────────────────────────────────────────────
    interview_date:           { type: DataTypes.DATEONLY, allowNull: true },
    interview_time:           { type: DataTypes.STRING(5), allowNull: true },
    interview_type:           { type: DataTypes.ENUM('Online','Offline','Phone'), allowNull: true },
    interview_link:           { type: DataTypes.STRING(500), allowNull: true },
    interview_instructions:   { type: DataTypes.TEXT, allowNull: true },
    interview_accepted:       { type: DataTypes.BOOLEAN, allowNull: true },
    interview_response_at:    { type: DataTypes.DATE, allowNull: true },

    // ── Reschedule ─────────────────────────────────────────────────────────
    reschedule_requested:     { type: DataTypes.BOOLEAN, defaultValue: false },
    reschedule_reason:        { type: DataTypes.TEXT, allowNull: true },
    reschedule_status:        { type: DataTypes.ENUM('Pending','Approved','Rejected'), allowNull: true },
    reschedule_proposed_date: { type: DataTypes.DATEONLY, allowNull: true },
    reschedule_proposed_time: { type: DataTypes.STRING(5), allowNull: true },

    // ── Portal ─────────────────────────────────────────────────────────────
    portal_password_hash:     { type: DataTypes.STRING(255), allowNull: true },
    portal_access_token:      { type: DataTypes.STRING(255), allowNull: true },
    portal_token_expires:     { type: DataTypes.DATE, allowNull: true },
    is_portal_user:           { type: DataTypes.BOOLEAN, defaultValue: false },
    portal_last_login:        { type: DataTypes.DATE, allowNull: true },

    // ── Pre-join ───────────────────────────────────────────────────────────
    prejoin_form_data:        { type: DataTypes.JSON, allowNull: true },
    prejoin_form_status: {
      type: DataTypes.ENUM('Not_Started','Draft','Submitted'),
      allowNull: true,
      defaultValue: 'Not_Started',
    },
    prejoin_submitted_at:     { type: DataTypes.DATE, allowNull: true },

    // ── Aptitude ───────────────────────────────────────────────────────────
    aptitude_score:           { type: DataTypes.DECIMAL(5,2), allowNull: true },
    aptitude_attempted_at:    { type: DataTypes.DATE, allowNull: true },
    aptitude_time_taken:      { type: DataTypes.INTEGER, allowNull: true },

    // ── Audit ──────────────────────────────────────────────────────────────
    created_by:               { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    updated_by:               { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    deleted_by:               { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    sequelize,
    tableName:  'candidates',
    modelName:  'Candidate',
    paranoid:   true,
    indexes: [
      { fields: ['company_id'] },
      { fields: ['status'] },
      { fields: ['email'] },
      { unique: true, fields: ['company_id', 'email'], where: { deleted_at: null } },
      { fields: ['portal_access_token'] },
    ],
  },
);
