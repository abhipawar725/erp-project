import { ReactNode } from 'react';

// This layout wraps all authenticated pages.
// AppShell handles the auth redirect + sidebar + topbar.
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
