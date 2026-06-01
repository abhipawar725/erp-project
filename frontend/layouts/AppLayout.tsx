'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { CompanyViewBanner } from '../components/layout/CompanyViewBanner';

import { useAppSelector } from '../store';
import {
  selectIsAuthenticated,
  selectIsViewingCompany,
} from '../store/slices/authSlice';

interface AppShellProps {
  children: ReactNode;
  onAddNew?: () => void;
}

export function AppShell({
  children,
  onAddNew,
}: AppShellProps) {
  const router = useRouter();

  const isAuthenticated =
    useAppSelector(selectIsAuthenticated);

  const isViewing =
    useAppSelector(selectIsViewingCompany);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <CompanyViewBanner />

      <div
        id="shell"
        style={{
          marginTop: isViewing ? 36 : 0,
          transition: 'margin-top .15s',
        }}
      >
        <Sidebar />

        <div id="main" className='pt-20'>
          <Topbar onAddNew={onAddNew} />

          <div id="content">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}