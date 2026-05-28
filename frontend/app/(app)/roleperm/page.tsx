'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
export default function OldRolePermPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/settings/roles'); }, [router]);
  return null;
}
