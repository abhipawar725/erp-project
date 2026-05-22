import { AptitudeTest, AptitudeQuestion, CandidateAnswer } from '../../database/models/AptitudeTest';
import { Candidate } from '../../database/models/Candidate';
import { AppError }  from '../../middleware/errorHandler.middleware';

export class AptitudeService {
  async createTest(companyId: number, dto: { title: string; description?: string; duration_minutes: number; total_marks: number; pass_marks?: number; }, createdBy?: number) {
    return AptitudeTest.create({ company_id: companyId, ...dto, created_by: createdBy ?? null });
  }
  async getTests(companyId: number) {
    return AptitudeTest.findAll({ where: { company_id: companyId }, include: [{ model: AptitudeQuestion, as: 'questions', attributes: ['id','question_text','order_index','marks'] }] });
  }
  async getTestById(testId: number, companyId: number) {
    const test = await AptitudeTest.findOne({ where: { id: testId, company_id: companyId }, include: [{ model: AptitudeQuestion, as: 'questions' }] });
    if (!test) throw new AppError('Test not found', 404);
    return test;
  }
  async addQuestion(testId: number, companyId: number, dto: { question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: 'A'|'B'|'C'|'D'; marks?: number; negative_marks?: number; order_index?: number; }) {
    const test = await AptitudeTest.findOne({ where: { id: testId, company_id: companyId } });
    if (!test) throw new AppError('Test not found', 404);
    return AptitudeQuestion.create({ test_id: testId, company_id: companyId, question_text: dto.question_text, option_a: dto.option_a, option_b: dto.option_b, option_c: dto.option_c, option_d: dto.option_d, correct_option: dto.correct_option, marks: dto.marks ?? 1, negative_marks: dto.negative_marks ?? 0, order_index: dto.order_index ?? 0 });
  }
  async updateQuestion(questionId: number, dto: any) {
    const q = await AptitudeQuestion.findByPk(questionId);
    if (!q) throw new AppError('Question not found', 404);
    await q.update(dto);
    return q;
  }
  async deleteQuestion(questionId: number) {
    const q = await AptitudeQuestion.findByPk(questionId);
    if (!q) throw new AppError('Question not found', 404);
    await q.destroy();
  }
  async getTestForCandidate(testId: number, companyId: number) {
    const test = await AptitudeTest.findOne({ where: { id: testId, company_id: companyId, is_active: true }, include: [{ model: AptitudeQuestion, as: 'questions', where: { is_active: true }, attributes: ['id','question_text','option_a','option_b','option_c','option_d','marks','order_index'] }] });
    if (!test) throw new AppError('Test not found', 404);
    const json = test.toJSON() as any;
    delete json.pass_marks;
    return json;
  }
  async submitTest(testId: number, candidateId: number, companyId: number, answers: { question_id: number; selected: 'A'|'B'|'C'|'D'|null }[], timeTaken: number) {
    const already = await CandidateAnswer.findOne({ where: { test_id: testId, candidate_id: candidateId } });
    if (already) throw new AppError('Already submitted', 400);
    const questions = await AptitudeQuestion.findAll({ where: { test_id: testId, is_active: true } });
    const qmap = new Map(questions.map(q => [q.id, q]));
    let score = 0;
    const rows: any[] = [];
    for (const ans of answers) {
      const q = qmap.get(ans.question_id);
      if (!q) continue;
      const correct = ans.selected !== null && ans.selected === q.correct_option;
      const wrong   = ans.selected !== null && ans.selected !== q.correct_option;
      const earned  = correct ? Number(q.marks) : wrong ? -Number(q.negative_marks) : 0;
      score += earned;
      rows.push({ candidate_id: candidateId, test_id: testId, question_id: ans.question_id, selected: ans.selected, is_correct: correct, marks_earned: earned });
    }
    score = Math.max(0, score);
    await CandidateAnswer.bulkCreate(rows);
    await Candidate.update({ aptitude_score: score, aptitude_attempted_at: new Date(), aptitude_time_taken: timeTaken }, { where: { id: candidateId, company_id: companyId } });
    return { submitted: true, questions_answered: rows.length, message: 'Test submitted. Results will be communicated by HR.' };
  }
  async getCandidateResult(testId: number, candidateId: number, companyId: number) {
    const candidate = await Candidate.findOne({ where: { id: candidateId, company_id: companyId }, attributes: ['id','candidate_name','aptitude_score','aptitude_attempted_at','aptitude_time_taken'] });
    if (!candidate) throw new AppError('Candidate not found', 404);
    const test    = await AptitudeTest.findByPk(testId, { attributes: ['id','title','total_marks','pass_marks','duration_minutes'] });
    const answers = await CandidateAnswer.findAll({ where: { test_id: testId, candidate_id: candidateId }, include: [{ model: AptitudeQuestion, as: 'question' }] });
    const score   = Number(candidate.aptitude_score ?? 0);
    const total   = Number(test?.total_marks ?? 0);
    const pass    = Number(test?.pass_marks ?? 0);
    return { candidate: candidate.toJSON(), test: test?.toJSON(), score, total_marks: total, percentage: total > 0 ? parseFloat(((score/total)*100).toFixed(2)) : 0, has_passed: pass > 0 ? score >= pass : null, time_taken_secs: candidate.aptitude_time_taken, answers: answers.map(a => ({ question_id: a.question_id, question_text: (a as any).question?.question_text, correct_option: (a as any).question?.correct_option, selected: a.selected, is_correct: a.is_correct, marks_earned: a.marks_earned })) };
  }
}
