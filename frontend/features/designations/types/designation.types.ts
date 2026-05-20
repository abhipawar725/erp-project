export interface DesignationDepartment {
  id:    number;
  name:  string;
  code?: string | null;
}

export interface DesignationEmployee {
  id:            number;
  first_name:    string;
  last_name:     string;
  employee_code: string;
  status:        string;
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
  department?:    DesignationDepartment | null;
  employees?:     DesignationEmployee[];
}

export interface CreateDesignationDto {
  name:           string;
  grade?:         string;
  department_id?: number | null;
}

export interface UpdateDesignationDto {
  name?:          string;
  grade?:         string;
  department_id?: number | null;
  is_active?:     boolean;
}

export interface DesignationQueryParams {
  department_id?: number;
  is_active?:     boolean;
  search?:        string;
}
