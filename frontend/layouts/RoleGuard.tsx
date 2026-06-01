'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../store';
import { selectUser } from '../store/slices/authSlice';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
}

export function RoleGuard({
  children,
  allowedRoles,
}: RoleGuardProps) {
  const router = useRouter();
  const user = useAppSelector(selectUser);

  const roleSlug = user?.roleSlug;

  if (!roleSlug) {
    return null;
  }

  if (!allowedRoles.includes(roleSlug)) {
    router.replace('/unauthorized');
    return null;
  }

  return <>{children}</>;
}