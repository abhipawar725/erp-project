import { SuperAdminShell } from '../../../layouts/SuperAdminLayout';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminShell>{children}</SuperAdminShell>;
}
