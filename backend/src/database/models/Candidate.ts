import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export type CandidateStatus =
  | 'Applied' | 'Shortlisted' | 'Interview' | 'Offered' | 'Hired' | 'Rejected' | 'Withdrawn';
export type CandidateSource = 'Naukri' | 'LinkedIn' | 'CollarCheck' | 'Referral' | 'Direct' | 'Other';

interface CandidateAttributes {
  id: number;
  company_id: number;
  job_id?: number | null;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  current_company?: string | null;
  current_role?: string | null;
  experience_years?: number | null;
  expected_ctc?: number | null;
  current_ctc?: number | null;
  notice_period?: number | null;
  source?: CandidateSource | null;
  status: CandidateStatus;
  resume_url?: string | null;
  created_by?: number | null;
}

export class Candidate
  extends Model<CandidateAttributes, Optional<CandidateAttributes, 'id' | 'status'>>
  implements CandidateAttributes
{
  public id!: number;
  public company_id!: number;
  public job_id!: number | null;
  public first_name!: string;
  public last_name!: string | null;
  public email!: string | null;
  public phone!: string | null;
  public current_company!: string | null;
  public current_role!: string | null;
  public experience_years!: number | null;
  public expected_ctc!: number | null;
  public current_ctc!: number | null;
  public notice_period!: number | null;
  public source!: CandidateSource | null;
  public status!: CandidateStatus;
  public resume_url!: string | null;
  public created_by!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;
}

Candidate.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    company_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    job_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    current_company: { type: DataTypes.STRING(200), allowNull: true },
    current_role: { type: DataTypes.STRING(200), allowNull: true },
    experience_years: { type: DataTypes.DECIMAL(4, 1), allowNull: true },
    expected_ctc: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    current_ctc: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    notice_period: { type: DataTypes.INTEGER, allowNull: true, comment: 'days' },
    source: {
      type: DataTypes.ENUM('Naukri', 'LinkedIn', 'CollarCheck', 'Referral', 'Direct', 'Other'),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Applied', 'Shortlisted', 'Interview', 'Offered', 'Hired', 'Rejected', 'Withdrawn'),
      defaultValue: 'Applied',
    },
    resume_url: { type: DataTypes.STRING(500), allowNull: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    sequelize,
    tableName: 'candidates',
    modelName: 'Candidate',
    paranoid: true,
    indexes: [{ fields: ['company_id'] }, { fields: ['status'] }],
  },
);
