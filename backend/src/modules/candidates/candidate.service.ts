import { Op, fn, col, WhereOptions } from 'sequelize';
import { Candidate, CandidateStatus } from '../../database/models/Candidate';
import { AppError } from '../../middleware/errorHandler.middleware';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import { logActivity } from '../../utils/activityLogger';

import type {
  CreateCandidateDto,
  UpdateCandidateDto,
  CandidateQueryParams,
  BulkCandidateRow,
  BulkUploadResult,
} from './candidate.types';

// Constants
const VALID_STATUSES: CandidateStatus[] = [
  'Applied', 'Shortlisted', 'Interview', 'Technical', 'HR Round',
  'Offered', 'Hired', 'Rejected', 'Withdrawn', 'On Hold'
];

export class CandidateService {

  // ─── LIST ─────────────────────────────────────────────
  async getAll(query: CandidateQueryParams, companyId: number) {
    const { page, limit, offset } =
      parsePaginationParams(query as Record<string, unknown>);

    const where: WhereOptions<any> = {
      company_id: companyId,
    };

    // SEARCH FIX
    if (query.search) {
      const s = `%${query.search.trim()}%`;

      where[Op.or] = [
        { candidate_name: { [Op.like]: s } },
        { email: { [Op.like]: s } },
        { phone_number: { [Op.like]: s } },
        { current_company_name: { [Op.like]: s } },
        { last_company_designation: { [Op.like]: s } },
        { location: { [Op.like]: s } },
      ];
    }

    if (query.status) where.status = query.status;
    if (query.source) where.source = query.source;
    if (query.job_id) where.job_id = Number(query.job_id);

    if (query.location) {
      where.location = { [Op.like]: `%${query.location}%` };
    }

    // EXPERIENCE FIX
    if (query.min_experience !== undefined || query.max_experience !== undefined) {
      where.total_experience = {
        ...(query.min_experience !== undefined
          ? { [Op.gte]: Number(query.min_experience) }
          : {}),
        ...(query.max_experience !== undefined
          ? { [Op.lte]: Number(query.max_experience) }
          : {}),
      };
    }

    const sortField =
      ['candidate_name', 'created_at', 'total_experience', 'expected_salary', 'status']
        .includes(String(query.sort))
        ? String(query.sort)
        : 'created_at';

    const sortOrder = query.order === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await Candidate.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sortField, sortOrder]],
    });

    return {
      rows,
      meta: buildPaginationMeta(page, limit, count),
    };
  }

  // ─── GET BY ID ─────────────────────────────────────────
  async getById(id: number, companyId: number) {
    const c = await Candidate.findOne({
      where: { id, company_id: companyId },
    });

    if (!c) throw new AppError('Candidate not found', 404);
    return c;
  }

  // ─── PIPELINE STATS ───────────────────────────────────
  async getPipelineStats(companyId: number) {
    const results = await Candidate.findAll({
      where: { company_id: companyId },
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const map = new Map(
      (results as any[]).map(r => [r.status, Number(r.count)]),
    );

    return VALID_STATUSES.map(status => ({
      status,
      count: map.get(status) ?? 0,
    }));
  }

  // ─── SOURCE BREAKDOWN ──────────────────────────────────
  async getSourceBreakdown(companyId: number) {
    const results = await Candidate.findAll({
      where: { company_id: companyId },
      attributes: ['source', [fn('COUNT', col('id')), 'count']],
      group: ['source'],
      raw: true,
    });

    return (results as any[]).map(r => ({
      source: r.source || 'Unknown',
      count: Number(r.count),
    }));
  }

  // ─── SUMMARY STATS (FIXED Op.in + typing) ──────────────
  async getSummaryStats(companyId: number) {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const activeStatuses: CandidateStatus[] = [
      'Applied', 'Shortlisted', 'Interview', 'Technical',
      'HR Round', 'Offered', 'On Hold'
    ];

    const [total, hired, active, thisMonth] = await Promise.all([
      Candidate.count({ where: { company_id: companyId } }),

      Candidate.count({
        where: { company_id: companyId, status: 'Hired' },
      }),

      Candidate.count({
        where: {
          company_id: companyId,
          status: { [Op.in]: activeStatuses },
        },
      }),

      Candidate.count({
        where: {
          company_id: companyId,
          created_at: { [Op.gte]: start },
        },
      }),
    ]);

    return {
      total,
      hired,
      active,
      rejected: total - hired - active,
      thisMonth,
      conversionRate: total ? Math.round((hired / total) * 100) : 0,
    };
  }

  // ─── CREATE (SAFE SERIALIZATION FIX) ───────────────────
  async create(companyId: number, dto: CreateCandidateDto, createdBy?: number) {

    const existing = dto.email
      ? await Candidate.findOne({
        where: {
          company_id: companyId,
          email: dto.email.toLowerCase().trim(),
        },
      })
      : null;

    if (existing) {
      throw new AppError('Candidate already exists', 409);
    }

    const candidate = await Candidate.create({
      company_id: companyId,
      candidate_name: dto.candidate_name.trim(),
      email: dto.email?.toLowerCase().trim() || null,
      phone_number: dto.phone_number?.trim() || null,
      gender: dto.gender || null,
      date_of_birth: dto.date_of_birth ? new Date(dto.date_of_birth) : null,
      current_company_name: dto.current_company_name || null,
      last_company_designation: dto.last_company_designation || null,
      qualification: dto.qualification || null,
      location: dto.location || null,
      total_experience: dto.total_experience ?? null,
      relevant_experience: dto.relevant_experience ?? null,
      skills: dto.skills ?? null,
      current_salary: dto.current_salary ?? null,
      expected_salary: dto.expected_salary ?? null,
      notice_period: dto.notice_period ?? null,
      notice_period_unit: dto.notice_period_unit || 'Days',
      immediate_joiner: dto.immediate_joiner ?? false,
      expected_joining_date: dto.expected_joining_date
        ? new Date(dto.expected_joining_date)
        : null,
      own_vehicle: dto.own_vehicle ?? false,
      source: dto.source || null,
      reference_source: dto.reference_source || null,
      remarks: dto.remarks || null,
      job_id: dto.job_id ?? null,
      status: 'Applied',
      created_by: createdBy ?? null,
    });

    await logActivity({
      companyId,
      userId: createdBy,
      action: 'CANDIDATE_CREATED',
      module: 'candidates',
      entityId: candidate.id,
      newValues: {
        id: candidate.id,
        name: candidate.candidate_name,
        email: candidate.email,
        status: candidate.status,
      },
    });

    return candidate;
  }

  // ─── UPDATE (SAFE SERIALIZATION FIX) ───────────────────
  async update(id: number, companyId: number, dto: UpdateCandidateDto, updatedBy?: number) {
    const candidate = await this.getById(id, companyId);

    const before = {
      status: candidate.status,
      email: candidate.email,
    };

    const updatePayload: any = {
      ...dto,

      email: dto.email?.toLowerCase().trim() ?? candidate.email,

      date_of_birth: dto.date_of_birth
        ? new Date(dto.date_of_birth)
        : candidate.date_of_birth,

      expected_joining_date: dto.expected_joining_date
        ? new Date(dto.expected_joining_date)
        : candidate.expected_joining_date,

      updated_by: updatedBy ?? null,
    };

    await candidate.update(updatePayload);

    await logActivity({
      companyId,
      userId: updatedBy,
      action: 'CANDIDATE_UPDATED',
      module: 'candidates',
      entityId: id,
      oldValues: before,
      newValues: {
        id: candidate.id,
        status: candidate.status,
      },
    });

    return candidate;
  }
}