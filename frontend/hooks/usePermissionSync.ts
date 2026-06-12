'use client';
import { useEffect, useRef } from 'react';
import { useRouter }         from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../store';
import {
  selectUser,
  selectActiveCompanyId,
  setPermissions,
  clearCredentials,
} from '../store/slices/authSlice';
import { socketService }       from '../services/socket.service';
import { authService }         from '../services/api/auth.service';
import { showPermissionToast } from '../components/ui/PermissionToast';

export function usePermissionSync(): void {
  const dispatch        = useAppDispatch();
  const router          = useRouter();
  const user            = useAppSelector(selectUser);
  const activeCompanyId = useAppSelector(selectActiveCompanyId);
  const connectedRef    = useRef(false);

  // ── 1. Connect socket when user is authenticated ────────────────────────
  useEffect(() => {
    if (!user) {
      socketService.disconnect();
      connectedRef.current = false;
      return;
    }

    const managedIds = user.managedCompanies?.map(c => c.id) ?? [];
    socketService.connect(managedIds);
    connectedRef.current = true;

    return () => {
    };
  }, [user?.employeeId]);

  // ── 2. Listen: permissions:updated ─────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    return socketService.on('permissions:updated', async (event) => {
  if (event.actorEmployeeId === user.employeeId) {
    return;
  }      
      if (event.companyId !== activeCompanyId && !user.isSuperAdmin) return;

      // Acknowledge receipt
      socketService.acknowledge(user.employeeId);
     try {
        const response  = await authService.getMe();
        const freshUser = response.data;

        if (freshUser?.permissions) {
          dispatch(setPermissions(freshUser.permissions));
        }
      } catch {        
      }

      // ── Show toast ────────────────────────────────────────────────────────
  showPermissionToast({
    type: resolveToastType(event.eventType),
    message: event.message,
    triggeredBy: event.triggeredBy,
    changes: event.changes,
  });
    });
  }, [user, activeCompanyId, dispatch]);

  // ── 3. Listen: access:revoked ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    return socketService.on('access:revoked', (event) => {
      showPermissionToast({
        type:     'warning',
        message:  event.message,
        duration: 8000,
      });

      if (event.companyId === activeCompanyId) {
        // Find another company to switch to
        const other = user.managedCompanies?.find(c => c.id !== event.companyId && c.is_active);
        if (other) {
          // Let the company switcher handle the redirect
          setTimeout(() => router.push('/dashboard'), 2000);
        } else {
          // No other company — log out after short delay
          setTimeout(() => {
            dispatch(clearCredentials());
            router.push('/login');
          }, 3000);
        }
      }
    });
  }, [user, activeCompanyId, dispatch, router]);

  // ── 4. Listen: company:suspended ────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    return socketService.on('company:suspended', (event) => {
      if (event.companyId !== activeCompanyId) return;

      showPermissionToast({
        type:     'error',
        message:  event.message,
        duration: 0, // sticky — user must see this
      });

      setTimeout(() => {
        dispatch(clearCredentials());
        router.push('/login');
      }, 4000);
    });
  }, [user, activeCompanyId, dispatch, router]);
}

// ── Disconnect helper — call from logout handler ────────────────────────────
export function disconnectSocket(): void {
  socketService.disconnect();
}

function resolveToastType(eventType: string): 'success' | 'info' | 'warning' | 'error' {
  switch (eventType) {
    case 'role_assigned':            return 'success';
    case 'permissions_updated':      return 'info';
    case 'bulk_permissions_updated': return 'info';
    case 'role_removed':             return 'warning';
    case 'access_revoked':           return 'error';
    default:                         return 'info';
  }
}
