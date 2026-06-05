'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../store';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { selectUser, selectIsSuperAdmin } from '../../store/slices/authSlice';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { usePermission } from '../../features/auth/hooks/usePermission';

// ─── Nav definition ───────────────────────────────────────────────────────────
// permission: null = always visible
// permission: 'slug' = visible only if user has that slug OR is super admin

interface NavItem {
  id:          string;
  label:       string;
  icon:        string;
  href:        string;
  count?:      number;
  permission:  string | null;
}

interface NavSection {
  label:       string;
  permission?: string | null;  // section hidden if no item is visible
  items:       NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { id:'dashboard', label:'Dashboard', icon:'⬡', href:'/dashboard', permission: null },
    ],
  },
  {
    label: 'Talent Acquisition',
    items: [
      { id:'ats',        label:'Sourcing (ATS)',     icon:'⇧', href:'/ats', permission:'recruitment:view' },
      { id:'pipeline',   label:'Pipeline / Kanban',  icon:'▤', href:'/pipeline',   permission:'recruitment:view' },
      { id:'interviews', label:'Interviews',          icon:'📅',href:'/interviews', permission:'recruitment:view' },
      { id:'evaluation', label:'Evaluation Forms',    icon:'★', href:'/evaluation', permission:'recruitment:view' },
      { id:'pool',       label:'Candidate Pool',      icon:'◙', href:'/pool', permission:'recruitment:view' },
    ],
  },
  {
    label: 'Offer & Onboarding',
    items: [
      { id:'offers',     label:'Offer Management',    icon:'◎', href:'/offers',    count:5, permission:'recruitment:view'  },
      { id:'prejoin',    label:'Pre-Joining Portal',  icon:'⬢', href:'/prejoin',   count:3, permission:'recruitment:view'  },
      { id:'onboarding', label:'Onboarding',          icon:'▶', href:'/onboarding',         permission:'recruitment:view'  },
    ],
  },
  {
    label: 'Lifecycle',
    items: [
      { id:'exit',       label:'Exit & FNF',          icon:'↗', href:'/exit',      count:2, permission:'employees:view'    },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id:'payroll',    label:'Payroll',              icon:'₹', href:'/payroll',            permission:'payroll:view'      },
      { id:'attendance', label:'Attendance',           icon:'◔', href:'/attendance',         permission:'attendance:view'   },
      { id:'leaves',     label:'Leave Management',     icon:'◑', href:'/leaves',    count:9, permission:'leaves:view'       },
      { id:'assets',     label:'Assets',               icon:'☇', href:'/assets',             permission:'assets:view'       },
      { id:'emails',     label:'Template Management',  icon:'📄',href:'/emails',             permission:'settings:view'     },
    ],
  },
  {
    label: 'People & Performance',
    items: [
      { id:'employees',  label:'Employees',            icon:'👥',href:'/employees',           permission:'employees:view'    },
      { id:'kra',        label:'KRA / KPI',            icon:'◆', href:'/kra',                 permission:'employees:view'    },
      { id:'tasks',      label:'Tasks & Workflows',    icon:'□', href:'/tasks',     count:12, permission:'employees:view'    },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id:'analytics',  label:'Analytics & Reports',  icon:'📊',href:'/analytics',           permission:'reports:view'      },
      { id:'compliance', label:'Compliance & Audit',   icon:'🛡',href:'/compliance',           permission:'settings:view'     },
    ],
  },
  {
    label: 'Settings',
    items: [
      { id:'settings',      label:'Settings Overview',    icon:'⚙',  href:'/settings',                      permission:'settings:view'     },
      { id:'roles',         label:'Roles & Permissions',  icon:'🔑', href:'/settings/roles',                permission:'settings:view'     },
      { id:'perm-groups',   label:'Permission Groups',    icon:'🔐', href:'/settings/permission-groups',    permission:'settings:view'     },
      { id:'forms',         label:'Form Builder',         icon:'🧩', href:'/settings/forms',                permission:'settings:view'     },
      { id:'perm-matrix',   label:'Permission Matrix',    icon:'▦',  href:'/settings/permissions',          permission:'settings:view'     },
      { id:'user-perms',    label:'User Permissions',     icon:'👤', href:'/settings/user-permissions',     permission:'settings:view'     },
      { id:'email-tpl',     label:'Email Templates',      icon:'📧', href:'/settings/email-templates',      permission:'settings:view'     },
      // Super admin only items
      { id:'companies',     label:'Companies',            icon:'🏢', href:'/settings/companies',            permission:'companies:view'    },
      { id:'super-admins',  label:'Super Admins',         icon:'⚡', href:'/settings/super-admins',         permission:'super_admin:manage' },
    ],
  },
];

// ─── Role labels ──────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  hr:         'HR Manager',
  admin:      'Admin',
  mgr:        'Manager',
  emp:        'Employee',
  candidate:  'Candidate',
  super_admin:'Super Admin',
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  hr:    'rb-hr',
  admin: 'rb-admin',
  mgr:   'rb-mgr',
  emp:   'rb-emp',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname     = usePathname();
  const router       = useRouter();
  const dispatch     = useAppDispatch();
  const collapsed    = useAppSelector((s) => s.ui.sidebarCollapsed);
  const user         = useAppSelector(selectUser);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const { logout }   = useAuth();
  const { hasPermission } = usePermission();

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  const roleSlug  = user?.roleSlug || 'emp';
  const roleLabel = isSuperAdmin ? 'Super Admin' : (ROLE_LABEL[roleSlug] ?? roleSlug);
  const badgeClass = isSuperAdmin ? 'rb-super' : (ROLE_BADGE_CLASS[roleSlug] ?? 'rb-emp');

  return (
    <div id="sb" className={collapsed ? 'slim' : ''}>
      {/* Logo */}
      <div className="sb-top">
        <div className="sb-mark">NX</div>
        <div className="sb-wordmark">
          <div className="sb-app">NexHR ERP</div>
          <div className="sb-tagline">Enterprise Suite</div>
        </div>
      </div>

      {/* Role display */}
      <div className="role-sw">
        <div className="role-tabs">
          <div className={`rtab on`} style={{ pointerEvents:'none' }}>{roleLabel}</div>
        </div>
      </div>

      {/* Company selector */}
      <div className="sb-co">
        <div className="co-dot" />
        <div className="co-name">
          {isSuperAdmin ? 'Platform Admin' : 'Nexgen Solutions Pvt Ltd'}
        </div>
        <div className="co-arr">▼</div>
      </div>

      {/* Super admin badge */}
      {isSuperAdmin && !collapsed && (
        <div style={{ margin:'4px 10px 6px', background:'var(--red-lt)', border:'1px solid var(--red-bd)', borderRadius:'var(--r)', padding:'5px 10px', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12 }}>⚡</span>
          <span style={{ fontSize:10, fontWeight:700, color:'var(--red)', letterSpacing:'.04em' }}>SUPER ADMIN</span>
        </div>
      )}

      {/* Navigation */}
      <div className="sb-nav">
        {NAV_SECTIONS.map(section => {
          // Filter items by permission
          const visibleItems = section.items.filter(item =>
            item.permission === null || hasPermission(item.permission)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              <div className="sb-sec">{section.label}</div>
              {visibleItems.map(item => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <div
                    key={item.id}
                    className={`ni${isActive ? ' on' : ''}`}
                    onClick={() => router.push(item.href)}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="ni-ic">{item.icon}</span>
                    <span className="ni-lb">{item.label}</span>
                    {item.count !== undefined && (
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
        <div className="sb-user" onClick={() => logout()} style={{ cursor:'pointer' }}>
          <div className="u-av">{initials}</div>
          <div style={{ flex:1, overflow:'hidden' }}>
            <div className="u-nm">{user?.fullName || user?.email || 'User'}</div>
            <div className={`u-rl ${badgeClass}`}>{roleLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
