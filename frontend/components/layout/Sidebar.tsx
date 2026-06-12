'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter }      from 'next/navigation';
import { useAppSelector } from '../../store';
import { selectUser, selectIsSuperAdmin } from '../../store/slices/authSlice';
import { useAuth, usePermission }      from '../../features/auth/hooks/useAuth';
import { useCompany }                  from '../../features/company/hooks/useCompany';

// ─── Nav definition ───────────────────────────────────────────────────────────

interface NavItem {
  id:         string;
  label:      string;
  icon:       string;
  href:       string;
  count?:     number;
  permission: string | null;  // null = always show
  superOnly?: boolean;        // only show to super admins
}
interface NavSection {
  label:       string;
  items:       NavItem[];
  superOnly?:  boolean;
}

const NAV: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { id:'dashboard',  label:'Dashboard',          icon:'⬡', href:'/dashboard',            permission: null },
    ],
  },
  {
    label: 'Talent Acquisition',
    items: [
      { id: 'ats', label: 'Sourcing (ATS)', icon: '⇧', href: '/ats', permission: 'recruitment:view' },
      { id: 'ats-tests', label: 'Aptitude Tests', icon: '🧠', href: '/ats-tests', permission: 'aptitude:view' },      
      // { id: 'pipeline', label: 'Pipeline / Kanban', icon: '▤', href: '/pipeline', permission: 'recruitment:view' },
      // { id: 'interviews', label: 'Interviews', icon: '📅', href: '/interviews', permission: 'recruitment:view' },
      // { id: 'evaluation', label: 'Evaluation Forms', icon: '★', href: '/evaluation', permission: 'recruitment:view' },
      // { id: 'pool', label: 'Candidate Pool', icon: '◙', href: '/pool', permission: 'recruitment:view' },
    ],
  },
  {
    label: 'People & Performance',
    items: [
      { id: 'employees', label: 'Employees', icon: '👥', href: '/employees',permission: 'employees:view' },
      { id: 'departments', label: 'Departments', icon: '🏢', href: '/departments', permission: 'department:view' },
      { id: 'designations', label: 'Designations', icon: '🎯', href: '/designations', permission: 'designation:view' },      
    ],
  }, 
  {
    label: 'Settings',
    items: [
      { id: 'settings', label: 'Settings Overview', icon: '⚙', href: '/settings', permission: 'settings:view' },
      { id: 'roles', label: 'Roles & Permissions', icon: '🔑', href: '/settings/roles', permission: 'settings:view' },
      // { id: 'perm-groups', label: 'Permission Groups', icon: '🔐', href: '/settings/permission-groups', permission: 'settings:view' },
      // { id: 'forms', label: 'Form Builder', icon: '🧩', href: '/settings/forms', permission: 'settings:view' },
      // { id: 'perm-matrix', label: 'Permission Matrix', icon: '▦', href: '/settings/permissions', permission: 'settings:view' },
      // { id: 'user-perms', label: 'User Permissions', icon: '👤', href: '/settings/user-permissions', permission: 'settings:view' },
      // { id: 'email-tpl', label: 'Email Templates', icon: '📧', href: '/settings/email-templates', permission: 'settings:view' },
      // Super admin only items
      { id: 'companies', label: 'Companies', icon: '🏢', href: '/settings/companies', permission: 'companies:view' },
      { id: 'super-admins', label: 'Super Admins', icon: '⚡', href: '/settings/super-admins', permission: 'super_admin:manage' },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  hr_manager: 'HR Manager', admin: 'Admin', mgr: 'Manager',
  emp: 'Employee', super_admin: 'Super Admin', employee: 'Employee',
};

// ─── Company Switcher Dropdown ─────────────────────────────────────────────────

function CompanySwitcher({ collapsed }: { collapsed: boolean }) {
  const { company, companies, companyId, switchCompany, canSwitchCompany, isSuperAdmin } = useCompany();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayName = company?.name || 'Select Company';

  if (!canSwitchCompany) {
    // Single company — just show name, no dropdown
    return (
      <div className="sb-co" style={{ cursor: 'default' }}>
        <div className="co-dot" style={{ background: 'var(--green)' }} />
        {!collapsed && (
          <div className="co-name" style={{ fontSize: 11 }}>{displayName}</div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        className="sb-co"
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', background: open ? 'var(--surface-active, var(--surface3))' : 'transparent' }}
      >
        <div className="co-dot" style={{ background: 'var(--green)', flexShrink: 0 }} />
        {!collapsed && (
          <>
            <div className="co-name" style={{ fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <div className="co-arr" style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</div>
          </>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 8, right: 8, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r2)', boxShadow: '0 8px 24px rgba(0,0,0,.12)',
          overflow: 'hidden', maxHeight: 280, overflowY: 'auto',
        }}>
          <div style={{ padding: '8px 12px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink4)', borderBottom: '1px solid var(--border)' }}>
            Your Companies
          </div>
          {companies.map(co => {
            const isActive = co.id === companyId;
            return (
              <div
                key={co.id}
                onClick={() => { switchCompany(co.id); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  cursor: 'pointer', borderBottom: '1px solid var(--border)',
                  background: isActive ? 'var(--blue-lt)' : 'transparent',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface2)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Company initial */}
                <div style={{
                  width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                  background: isActive
                    ? 'linear-gradient(135deg, var(--blue), var(--purple))'
                    : 'var(--surface2)',
                  border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  color: isActive ? '#fff' : 'var(--ink4)',
                }}>
                  {co.name[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--blue)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {co.name}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--ink4)', textTransform: 'capitalize' }}>
                    {co.manager_role} {co.is_primary ? '· Primary' : ''}
                  </div>
                </div>
                {isActive && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />
                )}
                {!co.is_active && (
                  <span style={{ fontSize: 9, color: 'var(--red)', background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>
                    Suspended
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar component ────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname     = usePathname();
  const router       = useRouter();
  const collapsed    = useAppSelector((s: any) => s.ui.sidebarCollapsed);
  const user         = useAppSelector(selectUser);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const { logout }   = useAuth();
  const { hasPermission } = usePermission();
  const { company, companyId, companies } = useCompany();
  const auth = useAppSelector((state: any) => state.auth);

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  const roleSlug  = user?.roleSlug || 'emp';
  const roleLabel = isSuperAdmin ? 'Super Admin' : (ROLE_LABEL[roleSlug] ?? roleSlug);

  return (
    <div id="sb" className={collapsed ? 'slim' : ''}>
      {/* Logo */}
      <div className="sb-top">
        <div className="sb-mark">NX</div>
        {!collapsed && (
          <div className="sb-wordmark">
            <div className="sb-app">NexHR ERP</div>
            <div className="sb-tagline">Enterprise Suite</div>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="role-sw">
          <div className="role-tabs">
            <div className="rtab on" style={{ pointerEvents: 'none' }}>{roleLabel}</div>
          </div>
        </div>
      )}

      {/* ── Company switcher ─────────────────────────────── */}
      <CompanySwitcher collapsed={collapsed} />

      {/* Super admin indicator */}
      {isSuperAdmin && !collapsed && (
        <div style={{
          margin: '4px 10px 6px',
          background: 'var(--red-lt)', border: '1px solid var(--red-bd)',
          borderRadius: 'var(--r)', padding: '5px 10px',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 12 }}>⚡</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', letterSpacing: '.04em' }}>
            SUPER ADMIN · {companies.length} {companies.length === 1 ? 'company' : 'companies'}
          </span>
        </div>
      )}

      {/* Multi-company indicator for non-super-admin managers */}
      {!isSuperAdmin && companies.length > 1 && !collapsed && (
        <div style={{
          margin: '4px 10px 6px',
          background: 'var(--blue-lt)', border: '1px solid var(--blue-md)',
          borderRadius: 'var(--r)', padding: '5px 10px',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 10 }}>🏢</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--blue)' }}>
            Managing {companies.length} companies
          </span>
        </div>
      )}

      {/* Navigation */}
      <div className="sb-nav">
        {NAV.map(section => {
          // Filter items
          const visibleItems = section.items.filter(item => {
            if (item.superOnly && !isSuperAdmin) return false;
            if (item.permission === null) return true;
            return hasPermission(item.permission);
          });
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              {!collapsed && <div className="sb-sec">{section.label}</div>}
              {visibleItems.map(item => {
                const isActive = pathname === item.href
                  || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <div
                    key={item.id}
                    className={`ni${isActive ? ' on' : ''}`}
                    onClick={() => router.push(item.href)}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="ni-ic">{item.icon}</span>
                    {!collapsed && <span className="ni-lb">{item.label}</span>}
                    {!collapsed && item.count !== undefined && (
                      <span className="ni-ct">{item.count}</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User footer */}
      <div className="sb-foot">
        <div className="sb-user" style={{ cursor: 'pointer' }} onClick={() => logout()}>
          <div className="u-av">{initials}</div>
          {!collapsed && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="u-nm">{user?.fullName || user?.email || 'User'}</div>
              <div className={`u-rl rb-${isSuperAdmin ? 'super' : roleSlug}`}>{roleLabel}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
