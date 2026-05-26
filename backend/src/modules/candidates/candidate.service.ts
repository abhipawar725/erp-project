import { Op, WhereOptions, fn, col } from 'sequelize';
import crypto from 'crypto';
import { Candidate, CandidateStatus } from '../../database/models/Candidate';
import { AppError }    from '../../middleware/errorHandler.middleware';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import { logActivity } from '../../utils/activityLogger';
import { hashPassword, comparePassword } from '../../utils/hash';
import { mailer }      from '../../utils/mailer';
import type {
  CreateCandidateDto, UpdateCandidateDto,
  CandidateQueryParams, BulkCandidateRow, BulkUploadResult,
} from './candidate.types';

const VALID_SOURCES  = ['Naukri','LinkedIn','CollarCheck','Referral','Walk-in','Indeed','Direct','Other'];
const VALID_STATUSES = ['Applied','Shortlisted','Interview Scheduled','Technical','HR Round','Offered','Hired','Rejected','Withdrawn','On Hold'];

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
      Candidate.count({ where: { company_id: companyId, status: ['Applied','Shortlisted','Interview Scheduled','Technical','HR Round','Offered','On Hold'] } }),
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
      last_company_designation: dto.last_company_designation?.trim() || null,
      qualification:            dto.qualification?.trim()            || null,
      location:                 dto.location?.trim()                 || null,
      total_experience:         dto.total_experience      ?? null,
      relevant_experience:      dto.relevant_experience   ?? null,
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
      prejoin_form_status:      'Not_Started',
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
      status:                'Interview Scheduled',
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

    await logActivity({ companyId, userId: scheduledBy, action: 'INTERVIEW SCHEDULED', module: 'candidates', entityId: id });
    return candidate;
  }

  // ─── Candidate respond to interview (accept/reject) ───────────────────────
  async respondToInterview(id: number, companyId: number, accepted: boolean) {
    const candidate = await this.getById(id, companyId);
    if (candidate.status !== 'Interview Scheduled')
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
    if (candidate.status !== 'Interview Scheduled')
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
  async savePrejoinForm(id: number, companyId: number, data: Record<string, unknown>, isDraft: boolean) {
    const candidate = await this.getById(id, companyId);
    const update: any = {
      prejoin_form_data:   data,
      prejoin_form_status: isDraft ? 'Draft' : 'Submitted',
    };
    if (!isDraft) update.prejoin_submitted_at = new Date();
    await candidate.update(update);
    return candidate;
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
          last_company_designation: row.last_company_designation?.toString().trim() || null,
          qualification:            row.qualification?.toString().trim()  || null,
          location:                 row.location?.toString().trim()       || null,
          total_experience:         row.total_experience != null ? Number(row.total_experience) : null,
          relevant_experience:      row.relevant_experience != null ? Number(row.relevant_experience) : null,
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
