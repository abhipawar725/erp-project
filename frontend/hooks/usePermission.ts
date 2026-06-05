import { useAppSelector } from '../store';
import { selectUser, selectIsSuperAdmin, selectCurrentRole, selectPermissions } from '../store/slices/authSlice';

export function usePermission() {
  const user = useAppSelector(selectUser);
  const permissions = useAppSelector(selectPermissions);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);

  const hasPermission = (slug: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;

    return (
      permissions.includes('*') ||
      permissions.includes(slug)
    );
  };

  const hasAnyPermission = (...slugs: string[]) =>
    slugs.some(hasPermission);

  const hasAllPermissions = (...slugs: string[]) =>
    slugs.every(hasPermission);

  const canView = (module: string) =>
    hasPermission(`${module}:view`);

  const canEdit = (module: string) =>
    hasPermission(`${module}:edit`);

  const canDelete = (module: string) =>
    hasPermission(`${module}:delete`);

  const canDownload = (module: string) =>
    hasPermission(`${module}:download`);

  const canMask = (module: string) =>
    hasPermission(`${module}:mask`);

  return {
    user,
    permissions,
    isSuperAdmin,
    employeeId: user?.employeeId ?? null,

    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    canView,
    canEdit,
    canDelete,
    canDownload,
    canMask,
  };
}