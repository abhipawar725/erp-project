export interface DesignationDepartment {
  id:    number;
  name:  string;
  code?: string | null;
}

export interface DesignationEmployee {
  id:             number;
  first_name:     string;
  last_name:      string;
  employee_code:  string;
  status:         string;
  avatar_url?:    string | null;
  department_id?: number | null;
}

export interface Designation {
  id:             number;
  company_id:     number;
  department_id?: number | null;
  name:           string;
  grade?:         string | null;
  is_active:      boolean;
  created_at?:    string;
  updated_at?:    string;
  // Computed (from aggregated query)
  employee_count?: number;
  // Associations
  department?:    DesignationDepartment | null;
  employees?:     DesignationEmployee[];
}

export interface DesignationStats {
  total:           number;
  active:          number;
  inactive:        number;
  withGrade:       number;
  withoutGrade:    number;
  crossFunctional: number;
  deptSpecific:    number;
  topDesignation:  { id: number; name: string; count: number } | null;
}

export interface CreateDesignationDto {
  name:           string;
  grade?:         string | null;
  department_id?: number | null;
}

export interface UpdateDesignationDto {
  name?:          string;
  grade?:         string | null;
  department_id?: number | null;
  is_active?:     boolean;
}

export interface DesignationQueryParams {
  department_id?: number;
  is_active?:     'true' | 'false' | 'all';
  search?:        string;
}
