"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermission } from "../features/auth/hooks/useAuth";

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
}

export function PermissionGuard({
  permission,
  children,
}: PermissionGuardProps) {
  const router = useRouter();
  const { hasPermission } = usePermission();

  const canView = hasPermission(permission);

  useEffect(() => {
    if (!canView) {
      router.replace("/dashboard");
    }
  }, [canView, router]);

  if (!canView) {
    return null;
  }

  return <>{children}</>;
}