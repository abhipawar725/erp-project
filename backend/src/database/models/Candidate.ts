import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ─── STATUS TYPE ──────────────────────────────────────────────────────────────
export type CandidateStatus =
  | 'Applied'
  | 'Shortlisted'
  | 'Interview'
  | 'Technical'
  | 'HR Round'
  | 'Offered'
  | 'Hired'
  | 'Rejected'
  | 'Withdrawn'
  | 'On Hold';

// ─── ATTRIBUTES ───────────────────────────────────────────────────────────────
export interface CandidateAttributes {
  id: number;
  company_id: number;

  candidate_name: string;
  email?: string | null;
  phone_number?: string | null;

  gender?: string | null;
  date_of_birth?: Date | null;

  current_company_name?: string | null;
  last_company_designation?: string | null;

  qualification?: string | null;
  location?: string | null;

  total_experience?: number | null;
  relevant_experience?: number | null;

  skills?: any; // ✅ FIX: JSON safer than string[]

  current_salary?: number | null;
  expected_salary?: number | null;

  notice_period?: number | null;
  notice_period_unit?: string | null;

  immediate_joiner?: boolean | null;
  expected_joining_date?: Date | null;

  own_vehicle?: boolean | null;

  source?: string | null;
  reference_source?: string | null;

  remarks?: string | null;

  job_id?: number | null;

  status: CandidateStatus;

  created_by?: number | null;
  updated_by?: number | null;
  deleted_by?: number | null;

  // timestamps (Sequelize mapped)
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

// ─── CREATE ATTRIBUTES ────────────────────────────────────────────────────────
export interface CandidateCreationAttributes
  extends Optional<
    CandidateAttributes,
    | 'id'
    | 'status'
    | 'email'
    | 'phone_number'
    | 'gender'
    | 'date_of_birth'
    | 'current_company_name'
    | 'last_company_designation'
    | 'qualification'
    | 'location'
    | 'total_experience'
    | 'relevant_experience'
    | 'skills'
    | 'current_salary'
    | 'expected_salary'
    | 'notice_period'
    | 'notice_period_unit'
    | 'immediate_joiner'
    | 'expected_joining_date'
    | 'own_vehicle'
    | 'source'
    | 'reference_source'
    | 'remarks'
    | 'job_id'
    | 'created_by'
    | 'updated_by'
    | 'deleted_by'
  > {}

// ─── MODEL CLASS ──────────────────────────────────────────────────────────────
export class Candidate
  extends Model<CandidateAttributes, CandidateCreationAttributes>
  implements CandidateAttributes
{
  public id!: number;
  public company_id!: number;

  public candidate_name!: string;
  public email!: string | null;
  public phone_number!: string | null;

  public gender!: string | null;
  public date_of_birth!: Date | null;

  public current_company_name!: string | null;
  public last_company_designation!: string | null;

  public qualification!: string | null;
  public location!: string | null;

  public total_experience!: number | null;
  public relevant_experience!: number | null;

  public skills!: any;

  public current_salary!: number | null;
  public expected_salary!: number | null;

  public notice_period!: number | null;
  public notice_period_unit!: string | null;

  public immediate_joiner!: boolean | null;
  public expected_joining_date!: Date | null;

  public own_vehicle!: boolean | null;

  public source!: string | null;
  public reference_source!: string | null;

  public remarks!: string | null;

  public job_id!: number | null;

  public status!: CandidateStatus;

  public created_by!: number | null;
  public updated_by!: number | null;
  public deleted_by!: number | null;

  // timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
Candidate.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    company_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },

    candidate_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    email: DataTypes.STRING(200),
    phone_number: DataTypes.STRING(50),

    gender: DataTypes.STRING(20),
    date_of_birth: DataTypes.DATE,

    current_company_name: DataTypes.STRING(200),
    last_company_designation: DataTypes.STRING(200),

    qualification: DataTypes.STRING(200),
    location: DataTypes.STRING(200),

    total_experience: DataTypes.FLOAT,
    relevant_experience: DataTypes.FLOAT,

    skills: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    current_salary: DataTypes.FLOAT,
    expected_salary: DataTypes.FLOAT,

    notice_period: DataTypes.INTEGER,
    notice_period_unit: DataTypes.STRING(20),

    immediate_joiner: DataTypes.BOOLEAN,
    expected_joining_date: DataTypes.DATE,

    own_vehicle: DataTypes.BOOLEAN,

    source: DataTypes.STRING(100),
    reference_source: DataTypes.STRING(200),

    remarks: DataTypes.TEXT,

    job_id: DataTypes.INTEGER,

    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'Applied',
    },

    created_by: DataTypes.INTEGER,
    updated_by: DataTypes.INTEGER,
    deleted_by: DataTypes.INTEGER,
  },
  {
    sequelize,
    tableName: 'candidates',
    modelName: 'Candidate',

    timestamps: true,
    paranoid: true,

    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  },
);