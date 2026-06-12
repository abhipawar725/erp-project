/**
 * employee.service.ts  (frontend)
 * All API calls for the employee module.
 */
import apiClient from '../api/client';

export const employeeService = {
  getAll:              (params?: object)   => apiClient.get('/employees', { params }),
  getById:             (id: number)        => apiClient.get(`/employees/${id}`),
  create:              (data: object)      => apiClient.post('/employees', data),
  updateStep:          (id: number, step: string, data: object) =>
                                             apiClient.patch(`/employees/${id}/step/${step}`, data),
  delete:              (id: number)        => apiClient.delete(`/employees/${id}`),
  summary:             ()                  => apiClient.get('/employees/summary'),
  nextCode:            ()                  => apiClient.get('/employees/next-code'),
  fieldPermissions:    ()                  => apiClient.get('/employees/field-permissions'),
  managerById:         (id: number)        => apiClient.get(`/employees/managers/${id}`),
  saveDraft:           (data: object)      => apiClient.post('/employees/draft', data),
  getDraft:            (sid: string)       => apiClient.get(`/employees/draft/${sid}`),
  discardDraft:        (sid: string)       => apiClient.delete(`/employees/draft/${sid}`),
  downloadTemplate:    ()                  => apiClient.get('/employees/template', { responseType: 'blob' }),
  bulkUpload:          (file: File)        => {
    const fd = new FormData(); fd.append('file', file);
    return apiClient.post('/employees/bulk-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadAvatar:        (id: number, file: File) => {
    const fd = new FormData(); fd.append('avatar', file);
    return apiClient.post(`/employees/${id}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// Search managers by name/code — returns list [{id, employee_code, first_name, last_name, official_email}]
// Uses employee_id (integer) as the stored value, NOT employee_code
export const searchManagers = (q: string, excludeId?: number): any =>
  apiClient.get('/employees/managers/search', { params: { q, ...(excludeId ? { exclude: excludeId } : {}) } });

// Resolve a single manager by employee_id (to display after form load)
export const getManagerById = (id: number): any =>
  apiClient.get(`/employees/managers/${id}`);