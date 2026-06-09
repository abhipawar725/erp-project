import { Role }            from '../../database/models/RoleModels';
import { Department }     from '../../database/models/Department';
import { Designation }    from '../../database/models/Designation';
import { Employee }       from '../../database/models/Employee';
import { LeaveType }      from '../../database/models/LeaveModels';
import { AssetCategory }  from '../../database/models/AssetModels';
import type { DynamicSource } from '../../database/models/FormBuilder';
import { AppError }        from '../../middleware/errorHandler.middleware';

export interface SourceOption {
  label: string;
  value: string | number;
  meta?: Record<string, unknown>;
}

export class DynamicSourceService {

  async resolve(
    source:      DynamicSource,
    companyId:   number,
    labelField?: string,
    valueField?: string,
    filterJson?: string,
  ): Promise<SourceOption[]> {
    const filter = this.parseFilter(filterJson);

    switch (source) {
      case 'departments':
        return this.resolveModel(Department, companyId, labelField || 'name', valueField || 'id', filter);
      case 'designations':
        return this.resolveModel(Designation, companyId, labelField || 'name', valueField || 'id', filter);
      case 'employees':
        return this.resolveEmployees(companyId, labelField, valueField, filter);
      case 'roles':
        return this.resolveModel(Role, companyId, labelField || 'name', valueField || 'id', filter);
      case 'leave_types':
        return this.resolveModel(LeaveType, companyId, labelField || 'name', valueField || 'id', filter);
      case 'asset_categories':
        return this.resolveModel(AssetCategory, companyId, labelField || 'name', valueField || 'id', filter);
      case 'custom':
        return []; // custom = uses static field_options from DB
      default:
        throw new AppError(`Unknown dynamic source: ${source}`, 400);
    }
  }

  private async resolveModel(
    model:       any,
    companyId:   number,
    labelField:  string,
    valueField:  string,
    filter:      Record<string, unknown>,
  ): Promise<SourceOption[]> {
    const rows = await model.findAll({
      where:      { company_id: companyId, is_active: true, ...filter },
      attributes: [valueField, labelField],
      order:      [[labelField, 'ASC']],
      raw:        true,
    });
    return rows.map((r: any) => ({
      value: r[valueField],
      label: r[labelField],
    }));
  }

  private async resolveEmployees(
    companyId:   number,
    labelField?: string,
    valueField?: string,
    filter:      Record<string, unknown> = {},
  ): Promise<SourceOption[]> {
    const rows = await Employee.findAll({
      where:      { company_id: companyId, portal_access: true, ...filter },
      attributes: ['id', 'first_name', 'last_name', 'employee_code'],
      order:      [['first_name', 'ASC']],
      raw:        true,
    });
    const vf = valueField || 'id';
    return rows.map((r: any) => ({
      value: r[vf],
      label: `${r.first_name} ${r.last_name} (${r.employee_code})`,
    }));
  }

  private parseFilter(filterJson?: string | null): Record<string, unknown> {
    if (!filterJson) return {};
    try { return JSON.parse(filterJson); }
    catch { return {}; }
  }

  // Used by the form builder UI to show all available sources
  static getSourceMeta(): { key: DynamicSource; label: string; description: string }[] {
    return [
      { key: 'departments',     label: 'Departments',     description: 'List of company departments' },
      { key: 'designations',    label: 'Designations',    description: 'List of company designations' },
      { key: 'employees',       label: 'Employees',       description: 'List of active employees' },
      { key: 'roles',           label: 'Roles',           description: 'List of company roles' },
      { key: 'leave_types',     label: 'Leave Types',     description: 'List of leave types' },
      { key: 'asset_categories',label: 'Asset Categories','description': 'Asset category list' },
      { key: 'custom',          label: 'Custom Options',  description: 'Manually defined options' },
    ];
  }
}