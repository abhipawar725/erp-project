import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

// ─── Question ─────────────────────────────────────────────────────────────────
interface AptitudeQuestionAttributes {
  id:            number;
  company_id:    number;
  test_id:       number;
  question_text: string;
  option_a:      string;
  option_b:      string;
  option_c:      string;
  option_d:      string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  marks:         number;         // marks for correct answer
  negative_marks: number;       // marks deducted for wrong answer (0 = no negative)
  order_index:   number;
  is_active:     boolean;
}

type AptitudeQuestionCreation = Optional<AptitudeQuestionAttributes, 'id' | 'negative_marks' | 'is_active'>;

export class AptitudeQuestion
  extends Model<AptitudeQuestionAttributes, AptitudeQuestionCreation>
  implements AptitudeQuestionAttributes
{
  public id!:             number;
  public company_id!:     number;
  public test_id!:        number;
  public question_text!:  string;
  public option_a!:       string;
  public option_b!:       string;
  public option_c!:       string;
  public option_d!:       string;
  public correct_option!: 'A' | 'B' | 'C' | 'D';
  public marks!:          number;
  public negative_marks!: number;
  public order_index!:    number;
  public is_active!:      boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

AptitudeQuestion.init(
  {
    id:             { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    company_id:     { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    test_id:        { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    question_text:  { type: DataTypes.TEXT, allowNull: false },
    option_a:       { type: DataTypes.TEXT, allowNull: false },
    option_b:       { type: DataTypes.TEXT, allowNull: false },
    option_c:       { type: DataTypes.TEXT, allowNull: false },
    option_d:       { type: DataTypes.TEXT, allowNull: false },
    correct_option: { type: DataTypes.ENUM('A','B','C','D'), allowNull: false },
    marks:          { type: DataTypes.DECIMAL(5,2), defaultValue: 1, allowNull: false },
    negative_marks: { type: DataTypes.DECIMAL(5,2), defaultValue: 0, allowNull: false },
    order_index:    { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
    is_active:      { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    sequelize, tableName: 'aptitude_questions', modelName: 'AptitudeQuestion',
  },
);

// ─── Test (paper) ─────────────────────────────────────────────────────────────
export interface AptitudeTestAttributes {
  id:               number;
  company_id:       number;
  title:            string;
  description?:     string | null;
  duration_minutes: number;        // total time allowed
  total_marks:      number;
  pass_marks?:      number | null; // HR can set pass mark (optional)
  is_active:        boolean;
  created_by?:      number | null;
}

type AptitudeTestCreation = Optional<AptitudeTestAttributes, 'id' | 'is_active' | 'pass_marks'>;

export class AptitudeTest
  extends Model<AptitudeTestAttributes, AptitudeTestCreation>
  implements AptitudeTestAttributes
{
  public id!:               number;
  public company_id!:       number;
  public title!:            string;
  public description!:      string | null;
  public duration_minutes!: number;
  public total_marks!:      number;
  public pass_marks!:       number | null;
  public is_active!:        boolean;
  public created_by!:       number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

AptitudeTest.init(
  {
    id:               { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    company_id:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title:            { type: DataTypes.STRING(300), allowNull: false },
    description:      { type: DataTypes.TEXT, allowNull: true },
    duration_minutes: { type: DataTypes.INTEGER, allowNull: false },
    total_marks:      { type: DataTypes.DECIMAL(6,2), allowNull: false },
    pass_marks:       { type: DataTypes.DECIMAL(6,2), allowNull: true },
    is_active:        { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    sequelize, tableName: 'aptitude_tests', modelName: 'AptitudeTest',
  },
);

// ─── Candidate Answer Sheet ───────────────────────────────────────────────────
interface CandidateAnswerAttributes {
  id:           number;
  candidate_id: number;
  test_id:      number;
  question_id:  number;
  selected:     'A' | 'B' | 'C' | 'D' | null;  // null = skipped
  is_correct:   boolean;
  marks_earned: number;
}

type CandidateAnswerCreation = Optional<CandidateAnswerAttributes, 'id'>;

export class CandidateAnswer
  extends Model<CandidateAnswerAttributes, CandidateAnswerCreation>
  implements CandidateAnswerAttributes
{
  public id!:           number;
  public candidate_id!: number;
  public test_id!:      number;
  public question_id!:  number;
  public selected!:     'A' | 'B' | 'C' | 'D' | null;
  public is_correct!:   boolean;
  public marks_earned!: number;
  public readonly created_at!: Date;
}

CandidateAnswer.init(
  {
    id:           { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    candidate_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    test_id:      { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    question_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    selected:     { type: DataTypes.ENUM('A','B','C','D'), allowNull: true },
    is_correct:   { type: DataTypes.BOOLEAN, defaultValue: false },
    marks_earned: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
  },
  {
    sequelize, tableName: 'candidate_answers', modelName: 'CandidateAnswer',
    timestamps: true, createdAt: 'created_at', updatedAt: false,
  },
);

// Associations
AptitudeTest.hasMany(AptitudeQuestion, { foreignKey: 'test_id', as: 'questions' });
AptitudeQuestion.belongsTo(AptitudeTest, { foreignKey: 'test_id', as: 'test' });
CandidateAnswer.belongsTo(AptitudeQuestion, { foreignKey: 'question_id', as: 'question' });
