export interface AuthUser {
  userId: number;
  companyId: number | null;
  roleId: number;
  roleSlug: string;
  email: string;
  isSuperAdmin: boolean;
  viewingCompanyId?: number | null;
  viewingCompanyName?: string | null;
}