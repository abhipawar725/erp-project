import { Op, WhereOptions } from 'sequelize';
import {
  Asset, AssetCategory, AssetAssignment, AssetRequest, AssetMaintenance,
  type AssetStatus, type AssetCondition,
} from '../../database/models/AssetModels';
import { Employee } from '../../database/models/Employee';
import { Department } from '../../database/models/Department';
import { AppError } from '../../middleware/errorHandler.middleware';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import { logActivity } from '../../utils/activityLogger';

// ─── Code generator ───────────────────────────────────────────────────────────

async function generateAssetCode(companyId: number, categoryId: number): Promise<string> {
  const cat = await AssetCategory.findByPk(categoryId);
  const prefix = cat?.prefix || 'AST';
  const year   = new Date().getFullYear();
  const count  = await Asset.count({ where: { company_id: companyId, category_id: categoryId } });
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

// ─── Asset Service ────────────────────────────────────────────────────────────

export class AssetService {

  // ════════ DASHBOARD STATS ════════

  async getDashboardStats(companyId: number) {
    const [
      total, available, assigned, inRepair, damaged,
      warrantyExpiringSoon, pendingRequests, pendingMaintenance,
    ] = await Promise.all([
      Asset.count({ where: { company_id: companyId } }),
      Asset.count({ where: { company_id: companyId, status: 'available' } }),
      Asset.count({ where: { company_id: companyId, status: 'assigned' } }),
      Asset.count({ where: { company_id: companyId, status: 'in_repair' } }),
      Asset.count({ where: { company_id: companyId, status: 'damaged' } }),
      Asset.count({
        where: {
          company_id: companyId,
          warranty_expiry: { [Op.between]: [new Date(), new Date(Date.now() + 30*24*60*60*1000)] },
        },
      }),
      AssetRequest.count({ where: { company_id: companyId, status: 'pending' } }),
      AssetMaintenance.count({ where: { company_id: companyId, status: 'scheduled' } }),
    ]);

    return { total, available, assigned, inRepair, damaged, warrantyExpiringSoon, pendingRequests, pendingMaintenance };
  }

  // ════════ CATEGORIES ════════

  async listCategories(companyId: number) {
    return AssetCategory.findAll({
      where: { company_id: companyId },
      include: [
        { model: AssetCategory, as: 'children', required: false },
        { model: AssetCategory, as: 'parent',   required: false, attributes: ['id','name'] },
      ],
      order: [['sort_order','ASC'],['name','ASC']],
    });
  }

  async createCategory(companyId: number, dto: {
    name: string; prefix?: string; parent_id?: number; icon?: string;
    description?: string; depreciation_type?: string;
    depreciation_rate?: number; useful_life_months?: number;
  }, createdBy?: number) {
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g,'_');
    const cat  = await AssetCategory.create({
      company_id: companyId, name: dto.name, slug,
      prefix:              dto.prefix?.toUpperCase() || dto.name.slice(0,3).toUpperCase(),
      parent_id:           dto.parent_id || null,
      icon:                dto.icon || null,
      description:         dto.description || null,
      depreciation_type:   dto.depreciation_type || 'straight_line',
      depreciation_rate:   dto.depreciation_rate || null,
      useful_life_months:  dto.useful_life_months || null,
      is_active: true, sort_order: 0,
      created_by: createdBy || null,
    });
    await logActivity({ companyId, employeeId: createdBy, action: 'ASSET_CATEGORY_CREATED', module: 'assets', entityId: cat.id, newValues: { name: cat.name } });
    return cat;
  }

  async updateCategory(id: number, companyId: number, dto: any, updatedBy?: number) {
    const cat = await AssetCategory.findOne({ where: { id, company_id: companyId } });
    if (!cat) throw new AppError('Category not found', 404);
    await cat.update(dto);
    return cat;
  }

  async deleteCategory(id: number, companyId: number) {
    const cat = await AssetCategory.findOne({ where: { id, company_id: companyId } });
    if (!cat) throw new AppError('Category not found', 404);
    const assetCount = await Asset.count({ where: { category_id: id } });
    if (assetCount > 0) throw new AppError(`Cannot delete: ${assetCount} assets use this category`, 409);
    await cat.destroy();
    return { deleted: true };
  }

  // ════════ ASSETS ════════

  async listAssets(companyId: number, query: Record<string, any>) {
    const { page, limit, offset } = parsePaginationParams(query);
    const where: WhereOptions = { company_id: companyId };

    if (query.status)      (where as any).status      = query.status;
    if (query.category_id) (where as any).category_id = query.category_id;
    if (query.condition)   (where as any).condition   = query.condition;
    if (query.location)    (where as any).location    = { [Op.like]: `%${query.location}%` };
    if (query.branch)      (where as any).branch      = query.branch;
    if (query.department_id) (where as any).department_id = query.department_id;
    if (query.search) {
      (where as any)[Op.or] = [
        { name:         { [Op.like]: `%${query.search}%` } },
        { asset_code:   { [Op.like]: `%${query.search}%` } },
        { serial_number:{ [Op.like]: `%${query.search}%` } },
        { brand:        { [Op.like]: `%${query.search}%` } },
        { model:        { [Op.like]: `%${query.search}%` } },
      ];
    }
    if (query.warranty_expiring) {
      (where as any).warranty_expiry = { [Op.lte]: new Date(Date.now() + 30*24*60*60*1000) };
    }

    const { count, rows } = await Asset.findAndCountAll({
      where, limit, offset,
      include: [
        { model: AssetCategory, as: 'category', attributes: ['id','name','prefix','icon'] },
        {
          model: AssetAssignment, as: 'currentAssignment',
          required: false,
          where: { is_active: true },
          include: [{ model: Employee, as: 'employee', attributes: ['id','first_name','last_name','employee_code'] }],
        },
      ],
      order: [['created_at','DESC']],
    });

    return { rows, meta: buildPaginationMeta(page, limit, count) };
  }

  async getAssetById(id: number, companyId: number) {
    const asset = await Asset.findOne({
      where: { id, company_id: companyId },
      include: [
        { model: AssetCategory, as: 'category' },
        {
          model: AssetAssignment, as: 'assignments',
          order: [['assignment_date','DESC']],
          include: [{ model: Employee, as: 'employee', attributes: ['id','first_name','last_name','employee_code','email'] }],
        },
        { model: AssetMaintenance, as: 'maintenanceRecords', order: [['created_at','DESC']] },
      ],
    });
    if (!asset) throw new AppError('Asset not found', 404);
    return asset;
  }

  async createAsset(companyId: number, dto: {
    name: string; category_id: number;
    brand?: string; model?: string; serial_number?: string;
    purchase_date?: string; purchase_cost?: number; vendor?: string;
    warranty_expiry?: string; condition?: AssetCondition;
    location?: string; branch?: string; department_id?: number;
    description?: string; notes?: string; custom_fields?: Record<string,unknown>;
  }, createdBy?: number) {
    const asset_code = await generateAssetCode(companyId, dto.category_id);
    const asset = await Asset.create({
      company_id: companyId,
      asset_code,
      name:          dto.name,
      category_id:   dto.category_id,
      brand:         dto.brand || null,
      model:         dto.model || null,
      serial_number: dto.serial_number || null,
      purchase_date: dto.purchase_date ? new Date(dto.purchase_date) : null,
      purchase_cost: dto.purchase_cost || null,
      vendor:        dto.vendor || null,
      warranty_expiry: dto.warranty_expiry ? new Date(dto.warranty_expiry) : null,
      condition:     dto.condition || 'good',
      status:        'available',
      location:      dto.location || null,
      branch:        dto.branch || null,
      department_id: dto.department_id || null,
      description:   dto.description || null,
      notes:         dto.notes || null,
      custom_fields: dto.custom_fields || null,
      current_value: dto.purchase_cost || null,
      created_by:    createdBy || null,
    });

    await logActivity({ companyId, employeeId: createdBy, action: 'ASSET_CREATED', module: 'assets', entityId: asset.id, newValues: { name: asset.name, asset_code } });
    return this.getAssetById(asset.id, companyId);
  }

  async updateAsset(id: number, companyId: number, dto: any, updatedBy?: number) {
    const asset = await Asset.findOne({ where: { id, company_id: companyId } });
    if (!asset) throw new AppError('Asset not found', 404);
    const oldValues = { status: asset.status, condition: asset.condition };
    await asset.update({ ...dto, updated_by: updatedBy || null });
    await logActivity({ companyId, employeeId: updatedBy, action: 'ASSET_UPDATED', module: 'assets', entityId: id, oldValues, newValues: dto });
    return asset;
  }

  async deleteAsset(id: number, companyId: number, deletedBy?: number) {
    const asset = await Asset.findOne({ where: { id, company_id: companyId } });
    if (!asset) throw new AppError('Asset not found', 404);
    if (asset.status === 'assigned') throw new AppError('Cannot delete an assigned asset. Return it first.', 409);
    await logActivity({ companyId, employeeId: deletedBy, action: 'ASSET_DELETED', module: 'assets', entityId: id, oldValues: { name: asset.name, asset_code: asset.asset_code } });
    await asset.destroy();
    return { deleted: true };
  }

  // ════════ ASSIGNMENTS ════════

  async assignAsset(companyId: number, dto: {
    asset_id: number; employee_id: number; assigned_by: number;
    assignment_date: string; expected_return_date?: string;
    is_temporary?: boolean; condition_before?: AssetCondition;
    remarks?: string;
  }) {
    const asset = await Asset.findOne({ where: { id: dto.asset_id, company_id: companyId } });
    if (!asset) throw new AppError('Asset not found', 404);
    if (asset.status !== 'available' && asset.status !== 'reserved') {
      throw new AppError(`Asset is currently ${asset.status} and cannot be assigned`, 409);
    }

    const assignment = await AssetAssignment.create({
      company_id:          companyId,
      asset_id:            dto.asset_id,
      employee_id:         dto.employee_id,
      assigned_by:         dto.assigned_by,
      assignment_date:     new Date(dto.assignment_date),
      expected_return_date:dto.expected_return_date ? new Date(dto.expected_return_date) : null,
      is_temporary:        dto.is_temporary || false,
      is_active:           true,
      condition_before:    dto.condition_before || asset.condition,
      remarks:             dto.remarks || null,
    });

    await asset.update({ status: 'assigned' });
    await logActivity({ companyId, employeeId: dto.assigned_by, action: 'ASSET_ASSIGNED', module: 'assets', entityId: dto.asset_id, newValues: { employee_id: dto.employee_id } });
    return assignment;
  }

  async returnAsset(assignmentId: number, companyId: number, dto: {
    actual_return_date: string; condition_after: AssetCondition;
    return_notes?: string; damage_notes?: string; returned_by: number;
  }) {
    const assignment = await AssetAssignment.findOne({
      where: { id: assignmentId, company_id: companyId, is_active: true },
      include: [{ model: Asset, as: 'asset' }],
    });
    if (!assignment) throw new AppError('Active assignment not found', 404);

    await assignment.update({
      is_active:          false,
      actual_return_date: new Date(dto.actual_return_date),
      condition_after:    dto.condition_after,
      return_notes:       dto.return_notes || null,
      damage_notes:       dto.damage_notes || null,
    });

    const newStatus: AssetStatus = dto.damage_notes ? 'damaged' : 'available';
    await (assignment.asset as Asset).update({ status: newStatus, condition: dto.condition_after });

    await logActivity({ companyId, employeeId: dto.returned_by, action: 'ASSET_RETURNED', module: 'assets', entityId: assignment.asset_id, newValues: { condition_after: dto.condition_after } });
    return assignment;
  }

  async getEmployeeAssets(employeeId: number, companyId: number) {
    return AssetAssignment.findAll({
      where: { employee_id: employeeId, company_id: companyId },
      include: [{ model: Asset, as: 'asset', include: [{ model: AssetCategory, as: 'category' }] }],
      order: [['assignment_date','DESC']],
    });
  }

  // ════════ REQUESTS ════════

  async listRequests(companyId: number, query: Record<string, any>) {
    const { page, limit, offset } = parsePaginationParams(query);
    const where: any = { company_id: companyId };
    if (query.status)      where.status      = query.status;
    if (query.request_type) where.request_type = query.request_type;
    if (query.employee_id) where.employee_id = query.employee_id;

    const { count, rows } = await AssetRequest.findAndCountAll({
      where, limit, offset,
      include: [
        { model: Employee, as: 'employee', attributes: ['id','first_name','last_name','employee_code'] },
        { model: AssetCategory, as: 'category', attributes: ['id','name'], required: false },
        { model: Asset, as: 'asset', attributes: ['id','name','asset_code'], required: false },
      ],
      order: [['created_at','DESC']],
    });
    return { rows, meta: buildPaginationMeta(page, limit, count) };
  }

  async createRequest(companyId: number, dto: {
    employee_id: number; category_id?: number; request_type?: string;
    reason: string; urgency?: string; notes?: string;
  }) {
    return AssetRequest.create({
      company_id:   companyId,
      employee_id:  dto.employee_id,
      category_id:  dto.category_id || null,
      request_type: dto.request_type || 'new',
      reason:       dto.reason,
      urgency:      dto.urgency || 'medium',
      status:       'pending',
      notes:        dto.notes || null,
    });
  }

  async approveRequest(id: number, companyId: number, dto: {
    action: 'approve' | 'reject'; approved_by: number;
    rejection_reason?: string; fulfilled_asset_id?: number;
  }) {
    const req = await AssetRequest.findOne({ where: { id, company_id: companyId } });
    if (!req) throw new AppError('Request not found', 404);

    await req.update({
      status:             dto.action === 'approve' ? 'approved' : 'rejected',
      approved_by:        dto.approved_by,
      approved_at:        new Date(),
      rejection_reason:   dto.rejection_reason || null,
      fulfilled_asset_id: dto.fulfilled_asset_id || null,
    });

    await logActivity({ companyId, employeeId: dto.approved_by, action: `ASSET_REQUEST_${dto.action.toUpperCase()}D`, module: 'assets', entityId: id });
    return req;
  }

  // ════════ MAINTENANCE ════════

  async listMaintenance(companyId: number, query: Record<string, any>) {
    const { page, limit, offset } = parsePaginationParams(query);
    const where: any = { company_id: companyId };
    if (query.asset_id) where.asset_id = query.asset_id;
    if (query.status)   where.status   = query.status;

    const { count, rows } = await AssetMaintenance.findAndCountAll({
      where, limit, offset,
      include: [{ model: Asset, as: 'asset', attributes: ['id','name','asset_code'], include: [{ model: AssetCategory, as: 'category', attributes: ['id','name'] }] }],
      order: [['created_at','DESC']],
    });
    return { rows, meta: buildPaginationMeta(page, limit, count) };
  }

  async createMaintenance(companyId: number, dto: {
    asset_id: number; maintenance_type?: string; description: string;
    vendor?: string; cost?: number; scheduled_date?: string;
    start_date?: string;
  }, createdBy?: number) {
    const asset = await Asset.findOne({ where: { id: dto.asset_id, company_id: companyId } });
    if (!asset) throw new AppError('Asset not found', 404);

    const record = await AssetMaintenance.create({
      company_id:       companyId,
      asset_id:         dto.asset_id,
      maintenance_type: dto.maintenance_type || 'service',
      description:      dto.description,
      vendor:           dto.vendor || null,
      cost:             dto.cost || null,
      scheduled_date:   dto.scheduled_date ? new Date(dto.scheduled_date) : null,
      start_date:       dto.start_date ? new Date(dto.start_date) : null,
      status:           'scheduled',
      created_by:       createdBy || null,
    });

    if (dto.start_date) await asset.update({ status: 'under_maintenance' });
    await logActivity({ companyId, employeeId: createdBy, action: 'ASSET_MAINTENANCE_CREATED', module: 'assets', entityId: dto.asset_id });
    return record;
  }

  async completeMaintenance(id: number, companyId: number, dto: {
    end_date: string; notes?: string; cost?: number; completed_by: number;
  }) {
    const record = await AssetMaintenance.findOne({ where: { id, company_id: companyId }, include: [{ model: Asset, as: 'asset' }] });
    if (!record) throw new AppError('Maintenance record not found', 404);

    await record.update({ status: 'completed', end_date: new Date(dto.end_date), notes: dto.notes || null, cost: dto.cost || record.cost });
    await (record.asset as Asset).update({ status: 'available' });
    await logActivity({ companyId, employeeId: dto.completed_by, action: 'ASSET_MAINTENANCE_COMPLETED', module: 'assets', entityId: record.asset_id });
    return record;
  }
}
