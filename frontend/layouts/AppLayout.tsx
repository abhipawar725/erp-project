'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useAppSelector } from '@/store';
import { selectIsAuthenticated } from '@/store/slices/authSlice';

interface AppShellProps {
  children: React.ReactNode;
  onAddNew?: () => void;
  allowedRoles?: string[];
}

export function AppShell({ children, onAddNew }: AppShellProps) {
  const router = useRouter();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;
  console.log(isAuthenticated) 
  return (
    <div id="shell">
      <Sidebar />
      <div id="main">
        <Topbar onAddNew={onAddNew} />
        <div id="content">
          {children}
        </div>
      </div>
    </div>
  );
}