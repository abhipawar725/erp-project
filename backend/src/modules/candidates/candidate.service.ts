import { Op, WhereOptions, fn, col, DATE } from 'sequelize';
import crypto from 'crypto';
import { Candidate, CandidateStatus } from '../../database/models/Candidate';
import { AppError }    from '../../middleware/errorHandler.middleware';
import { Employee }     from '../../database/models/Employee';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import { logActivity } from '../../utils/activityLogger';
import { hashPassword, comparePassword } from '../../utils/hash';
import { mailer }      from '../../utils/mailer';
import type {
  CreateCandidateDto, UpdateCandidateDto,
  CandidateQueryParams, BulkCandidateRow, BulkUploadResult,
} from './candidate.types';

const VALID_SOURCES  = ['Naukri','LinkedIn','CollarCheck','Referral','Walk-in','Indeed','Direct','Other'];
const VALID_STATUSES = ['Applied','Shortlisted','Interview_Scheduled','Technical','HR_Round','Interview_Result','Offered','Hired','Rejected','Withdrawn','On_Hold'];

export class CandidateService {

  // ─── List ───────────────────────────────────────────────────────────────────
  async getAll(query: CandidateQueryParams, companyId: number) {
    const { page, limit, offset } = parsePaginationParams(query as any);
    const where: WhereOptions = { company_id: companyId };

    if (query.search) {
      const s = `%${query.search.trim()}%`;
      (where as any)[Op.or] = [
        { candidate_name: { [Op.like]: s } },
        { email:          { [Op.like]: s } },
        { phone_number:   { [Op.like]: s } },
        { current_company_name: { [Op.like]: s } },
        { location:       { [Op.like]: s } },
      ];
    }

    if (query.status)   where['status']   = query.status;
    if (query.source)   where['source']   = query.source;
    if (query.min_experience !== undefined)
      where['total_experience'] = { ...(where['total_experience'] as any || {}), [Op.gte]: Number(query.min_experience) };
    if (query.max_experience !== undefined)
      where['total_experience'] = { ...(where['total_experience'] as any || {}), [Op.lte]: Number(query.max_experience) };

    const sortField = ['candidate_name','created_at','total_experience','expected_salary','status'].includes(String(query.sort)) ? String(query.sort) : 'created_at';
    const { count, rows } = await Candidate.findAndCountAll({
      where, limit, offset,
      order:      [[sortField, query.order === 'ASC' ? 'ASC' : 'DESC']],
      attributes: { exclude: ['portal_password_hash','portal_access_token'] },
    });
    return { rows, meta: buildPaginationMeta(page, limit, count) };
  }

  // ─── Single ─────────────────────────────────────────────────────────────────
  async getById(id: number, companyId: number, forPortal = false) {
    const exclude = forPortal ? ['portal_password_hash'] : ['portal_password_hash','portal_access_token'];
    const c = await Candidate.findOne({
      where: { id, company_id: companyId },
      attributes: { exclude },
    });
    if (!c) throw new AppError('Candidate not found', 404);
    return c;
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────
  async getSummaryStats(companyId: number) {
    const [total, hired, active, thisMonth] = await Promise.all([
      Candidate.count({ where: { company_id: companyId } }),
      Candidate.count({ where: { company_id: companyId, status: 'Hired' } }),
      Candidate.count({ where: { company_id: companyId, status: ['Applied','Shortlisted','Interview_Scheduled','Technical','HR_Round','Offered','On_Hold'] } }),
      Candidate.count({ where: { company_id: companyId, created_at: { [Op.gte]: new Date(new Date().setDate(1)) } } }),
    ]);
    const conversionRate = total > 0 ? Math.round((hired / total) * 100) : 0;
    return { total, hired, active, rejected: total - hired - active, thisMonth, conversionRate };
  }

  async getPipelineStats(companyId: number) {
    const results = await Candidate.findAll({
      where: { company_id: companyId },
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });
    const statsMap = new Map((results as any[]).map(r => [r.status, Number(r.count)]));
    return VALID_STATUSES.map(status => ({ status, count: statsMap.get(status) ?? 0 }));
  }

  async getSourceBreakdown(companyId: number) {
    const results = await Candidate.findAll({
      where: { company_id: companyId },
      attributes: ['source', [fn('COUNT', col('id')), 'count']],
      group: ['source'],
      raw: true,
    });
    return (results as any[]).map(r => ({ source: r.source || 'Unknown', count: Number(r.count) }));
  }

  // ─── Create ─────────────────────────────────────────────────────────────────
  async create(companyId: number, dto: CreateCandidateDto, createdBy?: number) {
    // Uniqueness check: email AND phone
    if (dto.email) {
      const dup = await Candidate.findOne({ where: { company_id: companyId, email: dto.email.toLowerCase().trim() } });
      if (dup) throw new AppError(`Email "${dto.email}" already exists`, 409);
    }
    if (dto.phone_number) {
      const dup = await Candidate.findOne({ where: { company_id: companyId, phone_number: dto.phone_number.trim() } });
      if (dup) throw new AppError(`Phone "${dto.phone_number}" already exists`, 409);
    }
    // Joining date must not be in the past
    if (dto.expected_joining_date) {
      const today = new Date(); today.setHours(0,0,0,0);
      if (new Date(dto.expected_joining_date) < today)
        throw new AppError('Expected joining date cannot be in the past', 400);
    }

    const candidate = await Candidate.create({
      company_id:               companyId,
      candidate_name:           dto.candidate_name.trim(),
      email:                    dto.email?.toLowerCase().trim() || null,
      phone_number:             dto.phone_number?.trim()       || null,
      gender:                   (dto.gender || null) as any,
      date_of_birth:            dto.date_of_birth ? new Date(dto.date_of_birth) : null,
      current_company_name:     dto.current_company_name?.trim()     || null,
      current_company_designation: dto.current_company_designation?.trim() || null,
      qualification:            dto.qualification?.trim()            || null,
      location:                 dto.location?.trim()                 || null,
      total_experience:         dto.total_experience      ?? null,
      relevant_experience:      dto.relevant_experience   ?? null,
      apply_department:         dto.apply_department      ?? null,
      apply_designation:        dto.apply_designation     ?? null,    
      current_salary:           dto.current_salary        ?? null,
      expected_salary:          dto.expected_salary       ?? null,
      notice_period:            dto.notice_period         ?? null,
      immediate_joiner:         dto.immediate_joiner      ?? false,
      expected_joining_date:    dto.expected_joining_date ? new Date(dto.expected_joining_date) : null,
      own_vehicle:              dto.own_vehicle           ?? false,
      source:                   (dto.source || null)      as any,
      reference_source:         dto.reference_source?.trim() || null,
      remarks:                  dto.remarks?.trim()           || null,
      job_id:                   dto.job_id                ?? null,
      status:                   'Applied',
      preinterview_form_status: 'Not_Started',
      created_by:               createdBy                 ?? null,
    });

    await logActivity({ companyId, userId: createdBy, action: 'CANDIDATE_CREATED', module: 'candidates', entityId: candidate.id });
    return candidate;
  }

  // ─── Update ─────────────────────────────────────────────────────────────────
  async update(id: number, companyId: number, dto: UpdateCandidateDto, updatedBy?: number) {
    const candidate = await this.getById(id, companyId);

    if (dto.email && dto.email !== candidate.email) {
      const dup = await Candidate.findOne({ where: { company_id: companyId, email: dto.email.toLowerCase().trim(), id: { [Op.ne]: id } } });
      if (dup) throw new AppError(`Email "${dto.email}" already exists`, 409);
    }
    if (dto.phone_number && dto.phone_number !== candidate.phone_number) {
      const dup = await Candidate.findOne({ where: { company_id: companyId, phone_number: dto.phone_number.trim(), id: { [Op.ne]: id } } });
      if (dup) throw new AppError(`Phone "${dto.phone_number}" already exists`, 409);
    }
    if (dto.expected_joining_date) {
      const today = new Date(); today.setHours(0,0,0,0);
      if (new Date(dto.expected_joining_date) < today)
        throw new AppError('Expected joining date cannot be in the past', 400);
    }

    await candidate.update({ ...dto, email: dto.email?.toLowerCase().trim() || candidate.email, updated_by: updatedBy });
    await logActivity({ companyId, userId: updatedBy, action: 'CANDIDATE_UPDATED', module: 'candidates', entityId: id });
    return candidate;
  }

  // ─── Move status ─────────────────────────────────────────────────────────────
  async moveStatus(id: number, companyId: number, status: CandidateStatus, updatedBy?: number, remarks?: string) {
    const candidate = await this.getById(id, companyId);
    await candidate.update({ status, remarks: remarks ?? candidate.remarks, updated_by: updatedBy });
    await logActivity({ companyId, userId: updatedBy, action: 'CANDIDATE_STATUS_CHANGED', module: 'candidates', entityId: id, oldValues: { status: candidate.status }, newValues: { status, remarks } });
    return candidate;
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────
  async delete(id: number, companyId: number, deletedBy?: number) {
    const candidate = await this.getById(id, companyId);
    await candidate.update({ deleted_by: deletedBy });
    await candidate.destroy();
    await logActivity({ companyId, userId: deletedBy, action: 'CANDIDATE_DELETED', module: 'candidates', entityId: id });
  }

  // ─── Resume ─────────────────────────────────────────────────────────────────
  async updateResume(id: number, companyId: number, resumeUrl: string, updatedBy?: number) {
    const candidate = await this.getById(id, companyId);
    await candidate.update({ resume_url: resumeUrl, updated_by: updatedBy });
    return candidate;
  }

  // ─── Interview scheduling ─────────────────────────────────────────────────
  async scheduleInterview(
    id: number, companyId: number,
    dto: {
      interview_date:         string;
      interview_time:         string;
      interview_type:         'Online' | 'Offline' | 'Phone';
      interview_link?:        string;
      interview_instructions?: string;
    },
    scheduledBy?: number,
  ) {
    const candidate = await this.getById(id, companyId);

    const intDate = new Date(dto.interview_date);
    const today   = new Date(); today.setHours(0,0,0,0);
    if (intDate < today) throw new AppError('Interview date cannot be in the past', 400);

    await candidate.update({
      interview_date:        new Date(dto.interview_date) as any,
      interview_time:        dto.interview_time,
      interview_type:        dto.interview_type as any,
      interview_link:        dto.interview_link          || null,
      interview_instructions: dto.interview_instructions || null,
      interview_accepted:    null,   // reset response
      reschedule_requested:  false,
      reschedule_status:     null,
      status:                'Interview_Scheduled',
      updated_by:            scheduledBy,
    });

    // Send email to candidate
    if (candidate.email) {
      await mailer.sendInterviewScheduled(
        candidate.email,
        candidate.candidate_name,
        'Vacancy',  // job title placeholder until jobs module
        1,
        dto.interview_type,
        `${dto.interview_date} at ${dto.interview_time}`,
        60,
        'HR Team',
        dto.interview_link,
      );
    }

    await logActivity({ companyId, userId: scheduledBy, action: 'INTERVIEW_SCHEDULED', module: 'candidates', entityId: id });
    return candidate;
  }

  // ─── Candidate respond to interview (accept/reject) ───────────────────────
  async respondToInterview(id: number, companyId: number, accepted: boolean) {
    const candidate = await this.getById(id, companyId);
    if (candidate.status !== 'Interview_Scheduled')
      throw new AppError('No interview scheduled for this candidate', 400);

    await candidate.update({
      interview_accepted:    accepted,
      interview_response_at: new Date(),
    });

    return candidate;
  }

  // ─── Reschedule request ───────────────────────────────────────────────────
  async requestReschedule(
    id: number, companyId: number,
    reason: string,
    proposed_date?: string,
    proposed_time?: string,
  ) {
    const candidate = await this.getById(id, companyId);
    if (candidate.status !== 'Interview_Scheduled')
      throw new AppError('No interview scheduled', 400);

    await candidate.update({
      reschedule_requested:     true,
      reschedule_reason:        reason,
      reschedule_status:        'Pending',
      reschedule_proposed_date: proposed_date ? new Date(proposed_date) as any : null,
      reschedule_proposed_time: proposed_time || null,
    });

    // Notify HR
    await logActivity({ companyId, action: 'RESCHEDULE_REQUESTED', module: 'candidates', entityId: id, newValues: { reason, proposed_date, proposed_time } });

    // Email HR (use generic HR notification — real HR email would come from User table in future)
    // mailer.sendRescheduleRequestToHR(hrEmail, candidate.candidate_name, reason, proposed_date, proposed_time);

    return candidate;
  }

  // ─── HR approves/rejects reschedule ──────────────────────────────────────
  async handleReschedule(
    id: number, companyId: number,
    decision: 'Approved' | 'Rejected',
    newDate?: string,
    newTime?: string,
    updatedBy?: number,
  ) {
    const candidate = await this.getById(id, companyId);
    if (!candidate.reschedule_requested || candidate.reschedule_status !== 'Pending')
      throw new AppError('No pending reschedule request', 400);

    const update: any = {
      reschedule_status: decision,
      reschedule_requested: decision === 'Rejected' ? false : true,
      updated_by: updatedBy,
    };

    if (decision === 'Approved' && newDate && newTime) {
      update.interview_date = new Date(newDate);
      update.interview_time = newTime;
      update.interview_accepted = null;
    }

    await candidate.update(update);
    return candidate;
  }

  // ─── Portal auth ─────────────────────────────────────────────────────────
  async portalLogin(email: string, password: string, companyId: number) {
    const candidate = await Candidate.findOne({ where: { email: email.toLowerCase(), company_id: companyId, is_portal_user: true } });
    if (!candidate || !candidate.portal_password_hash)
      throw new AppError('Invalid email or password', 401);

    const valid = await comparePassword(password, candidate.portal_password_hash);
    if (!valid) throw new AppError('Invalid email or password', 401);

    await candidate.update({ portal_last_login: new Date() });
    return candidate;
  }

  async sendMagicLink(email: string, companyId: number) {
    const candidate = await Candidate.findOne({ where: { email: email.toLowerCase(), company_id: companyId } });
    if (!candidate) return; // always return OK

    const token = crypto.randomBytes(32).toString('hex');
    await candidate.update({
      portal_access_token:  token,
      portal_token_expires: new Date(Date.now() + 15 * 60 * 1000), // 15 min
      is_portal_user:       true,
    });

    const link = `${process.env.FRONTEND_URL}/portal/magic?token=${token}`;
    await mailer.sendPortalMagicLink(email, candidate.candidate_name, link);

    return token; // dev only
  }

  async verifyMagicToken(token: string, companyId: number) {
    const candidate = await Candidate.findOne({
      where: {
        company_id: companyId,
        portal_access_token: token,
        portal_token_expires: { [Op.gt]: new Date() },
      },
    });
    if (!candidate) throw new AppError('Invalid or expired login link', 401);

    await candidate.update({
      portal_access_token:  null,
      portal_token_expires: null,
      is_portal_user:       true,
      portal_last_login:    new Date(),
    });

    return candidate;
  }

  // ─── Pre-joining form ─────────────────────────────────────────────────────
  async savePreInterviewForm(id: number, companyId: number, data: Record<string, unknown>, isDraft: boolean) {
    const candidate = await this.getById(id, companyId);
    const update: any = {
      prejoin_form_data:   data,
      prejoin_form_status: isDraft ? 'Draft' : 'Submitted',
    };
    if (!isDraft) update.prejoin_submitted_at = new Date();
    await candidate.update(update);
    return candidate;
  }



  // ─── Submit interview result & auto-advance status ────────────────────────
  async submitInterviewResult(
    id:        number,
    companyId: number,
    dto: {
      interview_result_by:        number;
      interview_result_mode:      'Online' | 'Offline';
      interview_result_date:      string;
      interview_result_feedback?: string;
      candidate_decision:         'Select' | 'Reject' | 'On_Hold';
      decision_reason?:           string;
      decision_joining_date?:     string;
    },
    updatedBy?: number,
  ) {
    const candidate = await this.getById(id, companyId);

    // Decision → next status mapping
    const nextStatus: Record<string, string> = {
      Select:  'Offered',
      Reject:  'Rejected',
      On_Hold: 'On_Hold',
    };
    const targetStatus = nextStatus[dto.candidate_decision];
    if (!targetStatus) throw new AppError('Invalid candidate decision', 400);

    // Joining date must not be in the past when selecting
    if (dto.candidate_decision === 'Select' && dto.decision_joining_date) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(dto.decision_joining_date) < today)
        throw new AppError('Expected joining date cannot be in the past', 400);
    }

    await candidate.update({
      interview_result_by:        dto.interview_result_by,
      interview_result_mode:      dto.interview_result_mode as any,
      interview_result_date:      dto.interview_result_date ? new Date(dto.interview_result_date) : null,
      interview_result_feedback:  dto.interview_result_feedback || null,
      candidate_decision:         dto.candidate_decision as any,
      decision_reason:            dto.decision_reason       || null,
      decision_joining_date:      dto.decision_joining_date ? new Date(dto.decision_joining_date) as any : null,
      status:                     targetStatus as any,
      updated_by:                 updatedBy ?? null,
    });

    await logActivity({
      companyId,
      userId:    updatedBy,
      action:    'INTERVIEW_RESULT_SUBMITTED',
      module:    'candidates',
      entityId:  id,
      oldValues: { status: candidate.status },
      newValues: { status: targetStatus, candidate_decision: dto.candidate_decision },
    });

    return candidate;
  }

  // ─── Send offer letter ────────────────────────────────────────────────────
  async sendOffer(
    id:        number,
    companyId: number,
    dto: {
      offered_ctc:          number;
      confirmed_joining_date: string;
      offer_valid_till:     string;
      offer_letter_url?:    string;
    },
    updatedBy?: number,
  ) {
    const candidate = await this.getById(id, companyId);
    if (candidate.status !== 'Offered')
      throw new AppError('Candidate must be in Offered status', 400);

    const today = new Date(); today.setHours(0,0,0,0);
    if (new Date(dto.confirmed_joining_date) < today)
      throw new AppError('Joining date cannot be in the past', 400);

    await candidate.update({
      offered_ctc:            dto.offered_ctc,
      confirmed_joining_date: new Date(dto.confirmed_joining_date) as any,
      offer_valid_till:       new Date(dto.offer_valid_till),
      offer_letter_url:       dto.offer_letter_url || null,
      offer_sent_at:          new Date(),
      updated_by:             updatedBy ?? null,
    });

    // Grant portal access if not already done
    if (!candidate.is_portal_user && candidate.email) {
      const crypto = await import('crypto');
      const rawPwd = crypto.randomBytes(6).toString('hex');
      await candidate.update({
        portal_password_hash: await hashPassword(rawPwd),
        is_portal_user:       true,
      });
    }

    // Email offer letter
    if (candidate.email) {
      const joiningFormatted = new Date(dto.confirmed_joining_date).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
      const validTillFormatted = new Date(dto.offer_valid_till).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
      const ctcFormatted = `₹${(dto.offered_ctc * 12 / 100000).toFixed(2)}L/yr`;
      await mailer.sendOfferLetter(
        candidate.email,
        candidate.candidate_name,
        candidate.current_company_designation || 'the position',
        ctcFormatted,
        joiningFormatted,
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/dashboard`,
        validTillFormatted,
      );
    }

    await logActivity({ companyId, userId: updatedBy, action: 'OFFER_SENT', module: 'candidates', entityId: id });
    return candidate;
  }

  // ─── Mark as hired & convert to employee ─────────────────────────────────
  async hireCandidate(
    id:        number,
    companyId: number,
    dto: {
      department_id?:         number;
      designation_id?:        number;
      employment_type?:       string;
      reporting_manager_id?:  number;
      date_of_joining?:       string;
    },
    createdBy?: number,
  ) {
    const candidate = await this.getById(id, companyId);

    // Create employee record from candidate data
    const employee = await Employee.create({
      company_id:           companyId,
      first_name:           candidate.candidate_name.split(' ')[0] || candidate.candidate_name,
      last_name:            candidate.candidate_name.split(' ').slice(1).join(' ') || '-',
      email:                candidate.email || `candidate${candidate.id}@placeholder.com`,
      phone:                candidate.phone_number || null,
      date_of_birth:        candidate.date_of_birth || null,
      gender:               (candidate.gender as any) || null,
      department_id:        dto.department_id    || null,
      designation_id:       dto.designation_id   || null,
      employment_type:      (dto.employment_type as any) || 'Full-time',
      work_location:        'Office' as any,
      date_of_joining:      dto.date_of_joining
                              ? new Date(dto.date_of_joining)
                              : (candidate.confirmed_joining_date || new Date()),
      reporting_manager_id: dto.reporting_manager_id || null,
      status:               'On Probation' as any,
      created_by:           createdBy ?? null,
    } as any);

    // Mark candidate as hired
    await candidate.update({
      status:                'Hired',
      hired_at:              new Date(),
      converted_employee_id: employee.id,
      updated_by:            createdBy ?? null,
    });

    await logActivity({ companyId, userId: createdBy, action: 'CANDIDATE_HIRED', module: 'candidates', entityId: id, newValues: { employee_id: employee.id } });
    return { candidate, employee };
  }

  // ─── Withdraw candidate ───────────────────────────────────────────────────
  async withdrawCandidate(
    id:        number,
    companyId: number,
    reason:    string,
    updatedBy?: number,
  ) {
    const candidate = await this.getById(id, companyId);

    // Can withdraw from most active stages
    const terminalStatuses = ['Hired', 'Withdrawn'];
    if (terminalStatuses.includes(candidate.status))
      throw new AppError(`Cannot withdraw a ${candidate.status} candidate`, 400);

    await candidate.update({
      status:            'Withdrawn',
      withdrawal_reason: reason.trim(),
      withdrawn_at:      new Date(),
      updated_by:        updatedBy ?? null,
    });

    await logActivity({ companyId, userId: updatedBy, action: 'CANDIDATE_WITHDRAWN', module: 'candidates', entityId: id, oldValues: { status: candidate.status }, newValues: { withdrawal_reason: reason } });
    return candidate;
  }

  // ─── Send aptitude test link (any status, HR triggered) ──────────────────
  async sendAptitudeTestLink(
    id:        number,
    companyId: number,
    testId:    number,
    sentBy?:   number,
  ) {
    const candidate = await this.getById(id, companyId);
    if (!candidate.email) throw new AppError('Candidate has no email address', 400);

    // Ensure portal access
    if (!candidate.is_portal_user) {
      const crypto = await import('crypto');
      const rawPwd = crypto.randomBytes(6).toString('hex');
      await candidate.update({
        portal_password_hash: await hashPassword(rawPwd),
        is_portal_user:       true,
      });
    }

    const testUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/test/${testId}`;

    await mailer.sendAptitudeTestInvite(
      candidate.email,
      candidate.candidate_name,
      `Aptitude Test`,
      45,
      testUrl,
    );

    // Mark as sent
    await candidate.update({
      aptitude_test_sent:    true,
      aptitude_test_sent_at: new Date(),
    });

    await logActivity({ companyId, userId: sentBy, action: 'APTITUDE_TEST_SENT', module: 'candidates', entityId: id, newValues: { testId } });
    return { sent: true, testUrl };
  }

  // ─── Send pre-interview form link (after interview accepted) ─────────────
  async sendPreInterviewForm(id: number, companyId: number, sentBy?: number) {
    const candidate = await this.getById(id, companyId);
    if (!candidate.email) throw new AppError('Candidate has no email address', 400);

    const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/dashboard`;

    // Ensure portal access exists
    if (!candidate.is_portal_user) {
      const crypto = await import('crypto');
      const rawPwd = crypto.randomBytes(6).toString('hex');
      await candidate.update({
        portal_password_hash: await hashPassword(rawPwd),
        is_portal_user:       true,
      });
    }

    await mailer.sendSystemNotification(
      candidate.email,
      'Pre-Interview Form — Action Required',
      'Complete Your Pre-Interview Form',
      `Dear ${candidate.candidate_name},<br/><br/>
      Congratulations on your upcoming interview! To help us prepare, please complete the
      <strong>Pre-Interview Declaration Form</strong> on the candidate portal before your interview.<br/><br/>
      This form includes your personal details, experience summary, and a declaration that is
      required for our onboarding records.`,
      'Open Candidate Portal →',
      portalUrl,
      'blue',
    );

    // Mark as sent
    await candidate.update({
      pre_interview_form_sent:    true,
      pre_interview_form_sent_at: new Date(),
    });

    await logActivity({ companyId, userId: sentBy, action: 'PRE_INTERVIEW_FORM_SENT', module: 'candidates', entityId: id });
    return { sent: true };
  }

  // ─── Save pre-joining form (separate from pre-interview) ─────────────────
  async savePreJoiningForm(id: number, companyId: number, data: Record<string, unknown>, isDraft: boolean) {
    const candidate = await this.getById(id, companyId);
    const update: any = {
      prejoining_form_data:   data,
      prejoining_form_status: isDraft ? 'Draft' : 'Submitted',
    };
    if (!isDraft) update.prejoining_submitted_at = new Date();
    await candidate.update(update);
    await logActivity({ companyId, userId: undefined, action: isDraft ? 'PREJOINING_DRAFT_SAVED' : 'PREJOINING_SUBMITTED', module: 'candidates', entityId: id });
    return candidate;
  }

    // ─── Get pre-interview form data (HR view) ────────────────────────────────
  async getPreInterviewForm(id: number, companyId: number) {
    const candidate = await this.getById(id, companyId);
    return {
      candidate_name:       candidate.candidate_name,
      candidate_id:         candidate.id,
      apply_designation:     candidate.apply_designation,
      status:               candidate.status,
      form_status:          candidate.preinterview_form_status || 'Not_Started',
      submitted_at:         candidate.preinterview_submitted_at,
      form_data:            candidate.preinterview_form_data || null,
    };
  }

  // ─── Get pre-joining form data (HR view) ─────────────────────────────────
  async getPreJoiningForm(id: number, companyId: number) {
    const candidate = await this.getById(id, companyId);
    return {
      candidate_name:       candidate.candidate_name,
      candidate_id:         candidate.id,
      apply_designation:     candidate.apply_designation,
      status:               candidate.status,
      form_status:          candidate.prejoining_form_status || 'Not_Started',
      submitted_at:         candidate.prejoining_submitted_at,
      form_data:            candidate.prejoining_form_data || null,
    };
  }

  // ─── Bulk upload ─────────────────────────────────────────────────────────
  async bulkUpload(rows: BulkCandidateRow[], companyId: number, createdBy?: number): Promise<BulkUploadResult> {
    const result: BulkUploadResult = { total: rows.length, success: 0, failed: 0, errors: [], inserted: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        if (!row.candidate_name?.toString().trim()) throw new Error('candidate_name is required');
        if (row.email) {
          const dup = await Candidate.findOne({ where: { company_id: companyId, email: String(row.email).toLowerCase().trim() } });
          if (dup) throw new Error(`Email "${row.email}" already exists`);
        }
        if (row.phone_number) {
          const dup = await Candidate.findOne({ where: { company_id: companyId, phone_number: String(row.phone_number).trim() } });
          if (dup) throw new Error(`Phone "${row.phone_number}" already exists`);
        }

        const dto: CreateCandidateDto = {
          candidate_name:           String(row.candidate_name).trim(),
          email:                    row.email?.toString().trim()       || null,
          phone_number:             row.phone_number?.toString().trim() || null,
          gender:                   null as any,
          date_of_birth:            row.date_of_birth ? new Date(row.date_of_birth) : null,
          current_company_name:     row.current_company_name?.toString().trim() || null,
          current_company_designation: row.current_company_designation?.toString().trim() || null,
          qualification:            row.qualification?.toString().trim()  || null,
          location:                 row.location?.toString().trim()       || null,
          total_experience:         row.total_experience != null ? Number(row.total_experience) : null,
          relevant_experience:      row.relevant_experience != null ? Number(row.relevant_experience) : null,
          apply_department:         row.apply_department?.toString().trim() || null,
          apply_designation:        row.apply_designation?.toString().trim() || null,
          current_salary:           row.current_salary != null ? Number(row.current_salary) : null,
          expected_salary:          row.expected_salary != null ? Number(row.expected_salary) : null,
          notice_period:            row.notice_period != null ? Number(row.notice_period) : null,
          immediate_joiner:         ['true','1','yes'].includes(String(row.immediate_joiner).toLowerCase()),
          expected_joining_date:    row.expected_joining_date ? new Date(row.expected_joining_date) : null,
          own_vehicle:              ['true','1','yes'].includes(String(row.own_vehicle).toLowerCase()),
          source:                   (VALID_SOURCES.includes(String(row.source)) ? row.source : 'Other') as any,
          reference_source:         row.reference_source?.toString().trim() || null,
          remarks:                  row.remarks?.toString().trim()           || null,
        };

        const created = await this.create(companyId, dto, createdBy);
        result.inserted.push(created.id);
        result.success++;
      } catch (err: any) {
        result.failed++;
        result.errors.push({ row: rowNum, name: String(row.candidate_name || 'Unknown'), reason: err?.message || 'Unknown error' });
      }
    }

    return result;
  }
}