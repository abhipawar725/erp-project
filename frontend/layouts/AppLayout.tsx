'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter }            from 'next/navigation';
import { Sidebar }              from '../components/layout/Sidebar';
import { Topbar }               from '../components/layout/Topbar';
import { useAppSelector }       from '../store';
import { selectIsAuthenticated } from '../store/slices/authSlice';
import { usePermissionSync } from '../hooks/usePermissionSync';

interface AppShellProps {
  children:  ReactNode;
  onAddNew?: () => void;
}

export function AppShell({ children, onAddNew }: AppShellProps) {
  const router          = useRouter();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  usePermissionSync()
  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div id="shell">
      <Sidebar />
      <div id="main" className='pt-20'>
        <Topbar/>
        <div id="content">
          {children}
        </div>
      </div>
    </div>
  );
}
