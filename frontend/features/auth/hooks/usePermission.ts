import { useAppSelector } from '../../../store';
import { selectUser, selectIsSuperAdmin, selectCurrentRole, selectPermissions } from '@/store/slices/authSlice';

export function usePermission() {
  const user         = useAppSelector(selectUser);
  const permissions  = useAppSelector(selectPermissions);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
    const role        = useAppSelector(selectCurrentRole);

  const has = (slug: string) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return permissions.includes(slug) || permissions.includes('*');
  };

  return {
    user,
    isSuperAdmin,
    permissions,
    employeeId:  user?.employeeId ?? null,   // no userId — use employeeId
    hasPermission: has,
    isHR:       role === 'hr',
    isAdmin:    role === 'admin',
    isManager:  role === 'mgr',
    isEmployee: role === 'emp',    
    canManageEmployees: role === 'hr' || role === 'admin',    
    canView:    (m: string) => has(`${m}:view`),
    canCreate:  (m: string) => has(`${m}:create`),
    canEdit:    (m: string) => has(`${m}:edit`),
    canDelete:  (m: string) => has(`${m}:delete`),
    canApprove: (m: string) => has(`${m}:approve`),
    canExport:  (m: string) => has(`${m}:export`),
  };
}
