import { useAppSelector } from '../../../store';
import { selectUser, selectIsSuperAdmin, selectCurrentRole } from '@/store/slices/authSlice';
export function usePermission() {
  const user         = useAppSelector(selectUser);
  const permissions  = useAppSelector((s: any) => s.auth.permissions);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const role        = useAppSelector(selectCurrentRole);

  const hasPermission = (slug: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return permissions.includes(slug) || permissions.includes('*');
  };

  return {
    user,           // user.userId works
    isSuperAdmin,
    permissions,
    hasPermission,
    isHR:       role === 'hr',
    isAdmin:    role === 'admin',
    isManager:  role === 'mgr',
    isEmployee: role === 'emp',    
    canManageEmployees: role === 'hr' || role === 'admin',
    canView:    (m: string) => hasPermission(`${m}:view`),
    canCreate:  (m: string) => hasPermission(`${m}:create`),
    canEdit:    (m: string) => hasPermission(`${m}:edit`),
    canDelete:  (m: string) => hasPermission(`${m}:delete`),
    canApprove: (m: string) => hasPermission(`${m}:approve`),
    canExport:  (m: string) => hasPermission(`${m}:export`),
  };
}
