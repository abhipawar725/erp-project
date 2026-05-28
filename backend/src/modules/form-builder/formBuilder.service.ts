import { Op, Transaction } from 'sequelize';
import { sequelize }       from '../../config/database';
import {
  HrModule, FormDefinition, DynamicField, FieldOption,
  FieldPermissionV2, FIELD_TYPES,
} from '../../database/models/FormBuilder';
import { Role }            from '../../database/models/RoleModels';
import { AppError }        from '../../middleware/errorHandler.middleware';
import { logActivity }     from '../../utils/activityLogger';

// ─── Default system modules seeded on company creation ────────────────────────
export const SYSTEM_MODULES = [
  { name:'Employee',       slug:'employee',       icon:'👤', description:'Employee records and profile management' },
  { name:'Candidate',      slug:'candidate',      icon:'📋', description:'ATS candidate management' },
  { name:'Attendance',     slug:'attendance',     icon:'📅', description:'Daily attendance tracking' },
  { name:'Leave',          slug:'leave',          icon:'🏖', description:'Leave applications and balances' },
  { name:'Payroll',        slug:'payroll',        icon:'💰', description:'Payroll processing and payslips' },
  { name:'Recruitment',    slug:'recruitment',    icon:'🎯', description:'End-to-end recruitment workflow' },
  { name:'Performance',    slug:'performance',    icon:'📈', description:'KRA, KPI and appraisals' },
  { name:'Assets',         slug:'assets',         icon:'🖥',  description:'Company asset tracking' },
];

export class FormBuilderService {

  // ════════════════════════ MODULES ════════════════════════

  async listModules(companyId: number) {
    return HrModule.findAll({
      where: { company_id: companyId },
      include: [{ model: FormDefinition, as: 'forms', required: false, where: { is_active: true }, attributes: ['id','name','slug'] }],
      order: [['sort_order','ASC'],['name','ASC']],
    });
  }

  async createModule(companyId: number, dto: {
    name: string; slug?: string; icon?: string; description?: string; sort_order?: number;
  }, createdBy?: number) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g,'_');
    const exists = await HrModule.findOne({ where: { company_id: companyId, slug } });
    if (exists) throw new AppError('Module with this slug already exists', 409);

    const mod = await HrModule.create({ company_id: companyId, name: dto.name, slug, icon: dto.icon||null, description: dto.description||null, sort_order: dto.sort_order||0, is_active: true, is_system: false });
    await logActivity({ companyId, userId: createdBy, action: 'MODULE_CREATED', module: 'settings', entityId: mod.id, newValues: { name: mod.name } });
    return mod;
  }

  async updateModule(id: number, companyId: number, dto: {
    name?: string; icon?: string; description?: string; sort_order?: number; is_active?: boolean;
  }, updatedBy?: number) {
    const mod = await HrModule.findOne({ where: { id, company_id: companyId } });
    if (!mod) throw new AppError('Module not found', 404);
    await mod.update(dto as any);
    await logActivity({ companyId, userId: updatedBy, action: 'MODULE_UPDATED', module: 'settings', entityId: id });
    return mod;
  }

  async deleteModule(id: number, companyId: number, deletedBy?: number) {
    const mod = await HrModule.findOne({ where: { id, company_id: companyId } });
    if (!mod) throw new AppError('Module not found', 404);
    if (mod.is_system) throw new AppError('System modules cannot be deleted', 403);
    // Cascade: destroy forms and their fields
    const forms = await FormDefinition.findAll({ where: { module_id: id, company_id: companyId } });
    for (const f of forms) {
      await DynamicField.destroy({ where: { form_id: f.id } });
    }
    await FormDefinition.destroy({ where: { module_id: id } });
    await mod.destroy();
    await logActivity({ companyId, userId: deletedBy, action: 'MODULE_DELETED', module: 'settings', entityId: id });
    return { deleted: true };
  }

  // ════════════════════════ FORMS ════════════════════════

  async listForms(moduleId: number, companyId: number) {
    return FormDefinition.findAll({
      where: { module_id: moduleId, company_id: companyId },
      order: [['sort_order','ASC'],['name','ASC']],
      include: [{ model: DynamicField, as: 'fields', where: { is_active: true }, required: false, attributes: ['id','label','field_key','field_type','sort_order','is_required'] }],
    });
  }

  async getFormWithFields(formId: number, companyId: number) {
    const form = await FormDefinition.findOne({
      where: { id: formId, company_id: companyId },
      include: [{
        model: DynamicField, as: 'fields',
        order: [['sort_order','ASC']],
        include: [{ model: FieldOption, as: 'options', where: { is_active: true }, required: false, order: [['sort_order','ASC']] }],
      }],
    });
    if (!form) throw new AppError('Form not found', 404);
    return form;
  }

  async createForm(moduleId: number, companyId: number, dto: {
    name: string; slug?: string; description?: string; sort_order?: number;
  }, createdBy?: number) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g,'_');
    const exists = await FormDefinition.findOne({ where: { company_id: companyId, module_id: moduleId, slug } });
    if (exists) throw new AppError('Form with this slug already exists in this module', 409);

    const form = await FormDefinition.create({ company_id: companyId, module_id: moduleId, name: dto.name, slug, description: dto.description||null, sort_order: dto.sort_order||0, is_active: true, is_system: false, created_by: createdBy||null });
    await logActivity({ companyId, userId: createdBy, action: 'FORM_CREATED', module: 'settings', entityId: form.id, newValues: { name: form.name } });
    return form;
  }

  async updateForm(formId: number, companyId: number, dto: {
    name?: string; description?: string; sort_order?: number; is_active?: boolean;
  }, updatedBy?: number) {
    const form = await FormDefinition.findOne({ where: { id: formId, company_id: companyId } });
    if (!form) throw new AppError('Form not found', 404);
    await form.update({ ...dto, updated_by: updatedBy||null } as any);
    return form;
  }

  async deleteForm(formId: number, companyId: number) {
    const form = await FormDefinition.findOne({ where: { id: formId, company_id: companyId } });
    if (!form) throw new AppError('Form not found', 404);
    if (form.is_system) throw new AppError('System forms cannot be deleted', 403);
    await DynamicField.destroy({ where: { form_id: formId } });
    await form.destroy();
    return { deleted: true };
  }

  // ════════════════════════ FIELDS ════════════════════════

  async createField(formId: number, companyId: number, dto: {
    field_type: string; label: string; field_key?: string;
    placeholder?: string; help_text?: string; section?: string;
    is_required?: boolean; is_readonly?: boolean; is_hidden?: boolean;
    is_unique?: boolean; default_value?: string;
    min_length?: number; max_length?: number;
    min_value?: number; max_value?: number;
    regex_pattern?: string; sort_order?: number;
    options?: { label: string; value: string; is_default?: boolean }[];
  }, createdBy?: number) {
    const form = await FormDefinition.findOne({ where: { id: formId, company_id: companyId } });
    if (!form) throw new AppError('Form not found', 404);
    if (!FIELD_TYPES.includes(dto.field_type as any)) throw new AppError('Invalid field type', 400);

    const field_key = dto.field_key || dto.label.toLowerCase().replace(/[^a-z0-9]+/g,'_');
    const duplicate = await DynamicField.findOne({ where: { form_id: formId, company_id: companyId, field_key } });
    if (duplicate) throw new AppError('A field with this key already exists in this form', 409);

    const t: Transaction = await sequelize.transaction();
    try {
      const field = await DynamicField.create({
        company_id: companyId, form_id: formId,
        field_type: dto.field_type as any, label: dto.label, field_key,
        placeholder: dto.placeholder||null, help_text: dto.help_text||null,
        is_required: dto.is_required||false, is_readonly: dto.is_readonly||false,
        is_hidden: dto.is_hidden||false, is_unique: dto.is_unique||false, is_active: true,
        default_value: dto.default_value||null,
        sort_order: dto.sort_order||0, section: dto.section||null,
        min_length: dto.min_length||null, max_length: dto.max_length||null,
        min_value: dto.min_value||null, max_value: dto.max_value||null,
        regex_pattern: dto.regex_pattern||null,
        created_by: createdBy||null,
      }, { transaction: t });

      if (dto.options?.length && ['select','multi_select','radio'].includes(dto.field_type)) {
        await FieldOption.bulkCreate(dto.options.map((o, i) => ({
          field_id: field.id, label: o.label, value: o.value,
          sort_order: i, is_active: true, is_default: o.is_default||false,
        })), { transaction: t });
      }

      await t.commit();
      await logActivity({ companyId, userId: createdBy, action: 'FIELD_CREATED', module: 'settings', entityId: field.id, newValues: { label: field.label, field_key } });
      return this.getFieldById(field.id, companyId);
    } catch(e) { await t.rollback(); throw e; }
  }

  async updateField(fieldId: number, companyId: number, dto: any, updatedBy?: number) {
    const field = await DynamicField.findOne({ where: { id: fieldId, company_id: companyId } });
    if (!field) throw new AppError('Field not found', 404);

    const { options, ...rest } = dto;
    await field.update({ ...rest, updated_by: updatedBy||null });

    if (options && Array.isArray(options)) {
      await FieldOption.destroy({ where: { field_id: fieldId } });
      await FieldOption.bulkCreate(options.map((o: any, i: number) => ({
        field_id: fieldId, label: o.label, value: o.value,
        sort_order: i, is_active: true, is_default: o.is_default||false,
      })));
    }

    await logActivity({ companyId, userId: updatedBy, action: 'FIELD_UPDATED', module: 'settings', entityId: fieldId });
    return this.getFieldById(fieldId, companyId);
  }

  async deleteField(fieldId: number, companyId: number) {
    const field = await DynamicField.findOne({ where: { id: fieldId, company_id: companyId } });
    if (!field) throw new AppError('Field not found', 404);
    await FieldOption.destroy({ where: { field_id: fieldId } });
    await FieldPermissionV2.destroy({ where: { field_id: fieldId } });
    await field.destroy();
    return { deleted: true };
  }

  async getFieldById(fieldId: number, companyId: number) {
    const field = await DynamicField.findOne({
      where: { id: fieldId, company_id: companyId },
      include: [{ model: FieldOption, as: 'options', required: false, order: [['sort_order','ASC']] }],
    });
    if (!field) throw new AppError('Field not found', 404);
    return field;
  }

  async reorderFields(formId: number, companyId: number, order: { id: number; sort_order: number }[]) {
    await Promise.all(order.map(({ id, sort_order }) =>
      DynamicField.update({ sort_order }, { where: { id, form_id: formId, company_id: companyId } })
    ));
    return { updated: true };
  }

  // ════════════════════════ FIELD PERMISSIONS ════════════════════════

  async getPermissionMatrix(companyId: number, formId: number) {
    const [form, roles] = await Promise.all([
      this.getFormWithFields(formId, companyId),
      Role.findAll({ where: { company_id: companyId }, order: [['is_system','DESC'],['name','ASC']] }),
    ]);

    const fields = (form.fields || []) as DynamicField[];
    if (!fields.length) return { roles, fields, matrix: {} };

    const fieldIds = fields.map(f => f.id);
    const perms = await FieldPermissionV2.findAll({
      where: { company_id: companyId, field_id: fieldIds },
    });

    // Build matrix: role_id → field_id → perms
    const matrix: Record<number, Record<number, {
      can_view: boolean; can_edit: boolean; can_copy: boolean;
      can_download: boolean; is_masked: boolean;
    }>> = {};

    for (const role of roles) {
      matrix[role.id] = {};
      for (const field of fields) {
        const existing = perms.find(p => p.role_id === role.id && p.field_id === field.id);
        matrix[role.id][field.id] = existing
          ? { can_view: existing.can_view, can_edit: existing.can_edit, can_copy: existing.can_copy, can_download: existing.can_download, is_masked: existing.is_masked }
          : { can_view: false, can_edit: false, can_copy: false, can_download: false, is_masked: false };
      }
    }

    return { roles, fields, matrix };
  }

  async setFieldPermission(companyId: number, roleId: number, fieldId: number, dto: {
    can_view?: boolean; can_edit?: boolean; can_copy?: boolean;
    can_download?: boolean; is_masked?: boolean;
  }, updatedBy?: number) {
    const [perm, created] = await FieldPermissionV2.findOrCreate({
      where: { role_id: roleId, field_id: fieldId },
      defaults: { role_id: roleId, field_id: fieldId, company_id: companyId, ...dto },
    });

    if (!created) await perm.update(dto as any);

    await logActivity({ companyId, userId: updatedBy, action: 'FIELD_PERMISSION_UPDATED', module: 'settings', entityId: fieldId, newValues: { roleId, ...dto } });
    return perm;
  }

  async bulkSetFieldPermissions(companyId: number, roleId: number, permissions: {
    field_id: number;
    can_view: boolean; can_edit: boolean; can_copy: boolean;
    can_download: boolean; is_masked: boolean;
  }[], updatedBy?: number) {
    const t = await sequelize.transaction();
    try {
      for (const p of permissions) {
        await FieldPermissionV2.upsert({
          role_id: roleId, field_id: p.field_id, company_id: companyId,
          can_view: p.can_view, can_edit: p.can_edit, can_copy: p.can_copy,
          can_download: p.can_download, is_masked: p.is_masked,
        }, { transaction: t });
      }
      await t.commit();
      await logActivity({ companyId, userId: updatedBy, action: 'FIELD_PERMISSIONS_BULK_UPDATED', module: 'settings', newValues: { roleId, count: permissions.length } });
      return { updated: permissions.length };
    } catch(e) { await t.rollback(); throw e; }
  }

  // ─── Runtime: resolve permissions for a user role on a form ──────────────────
  async resolveFormPermissions(formId: number, roleId: number, companyId: number) {
    const [fields, perms] = await Promise.all([
      DynamicField.findAll({ where: { form_id: formId, company_id: companyId, is_active: true }, include: [{ model: FieldOption, as: 'options', required: false }], order: [['sort_order','ASC']] }),
      FieldPermissionV2.findAll({ where: { role_id: roleId, company_id: companyId } }),
    ]);

    const permMap = new Map(perms.map(p => [p.field_id, p]));

    return fields.map(field => {
      const perm = permMap.get(field.id);
      return {
        ...field.toJSON(),
        // Permission-resolved view of the field
        resolved: {
          can_view:     perm ? perm.can_view     : true,
          can_edit:     perm ? perm.can_edit     : false,
          can_copy:     perm ? perm.can_copy     : false,
          can_download: perm ? perm.can_download : false,
          is_masked:    perm ? perm.is_masked    : false,
        },
      };
    });
  }
}
