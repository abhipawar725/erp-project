'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../store';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { selectUser } from '../../store/slices/authSlice';
import { useAuth } from '../../features/auth/hooks/useAuth';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  count?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  // {
  //   label: 'Overview',
  //   items: [{ id: 'dashboard', label: 'Dashboard', icon: '⬡', href: '/dashboard' }],
  // },
  {
    label: 'Talent Acquisition',
    items: [
      { id: 'ats', label: 'Sourcing (ATS)', icon: '⇧', href: '/ats' },
      { id: 'ats-tests', label: 'Aptitude Tests', icon: '🧠', href: '/ats-tests' },
    ],
  },

  {
    label: 'People & Performance',
    items: [
      { id: 'employees', label: 'Employees', icon: '👥', href: '/employees' },
      { id: 'departments', label: 'Departments', icon: '🏢', href: '/departments' },
      { id: 'designations', label: 'Designations', icon: '🎯', href: '/designations' },
    ],
  },
];

const ROLE_LABELS: Record<string, { badge: string; badgeClass: string }> = {
  hr: { badge: 'HR Manager', badgeClass: 'rb-hr' },
  admin: { badge: 'Admin', badgeClass: 'rb-admin' },
  mgr: { badge: 'Manager', badgeClass: 'rb-mgr' },
  emp: { badge: 'Employee', badgeClass: 'rb-emp' },
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const user = useAppSelector(selectUser);
  const { logout } = useAuth();

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const role = user?.roleSlug || 'hr';
  const { badge } = ROLE_LABELS[role] || ROLE_LABELS.hr;

  return (
    <div id="sb" className={collapsed ? 'slim' : ''}>
      {/* Logo */}
      <div className="sb-top">
        <div className="sb-mark">UNG</div>
        <div className="sb-wordmark">
          <div className="sb-app">UNG HRMS </div>
          <div className="sb-tagline">Enterprise Suite</div>
        </div>
      </div>

      {/* Role switcher — visual only, actual role from server */}
      {/* <div className="role-sw">
        <div className="role-tabs">
          {['HR', 'Admin', 'Mgr', 'Emp'].map((r) => (
            <div
              key={r}
              className={`rtab${role === r.toLowerCase() ? ' on' : ''}`}
            >
              {r}
            </div>
          ))}
        </div>
      </div> */}

      {/* Company selector */}
      {/* <div className="sb-co">
        <div className="co-dot" />
        <div className="co-name">Nexgen Solutions Pvt Ltd</div>
        <div className="co-arr">▼</div>
      </div> */}

      {/* Navigation */}
      <div className="sb-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="sb-sec">{section.label}</div>
            {section.items.map((item) => {
              const isActive = pathname.startsWith(item.href);
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
        ))}
      </div>

      {/* User footer */}
      <div className="sb-foot">
        <div className="sb-user" onClick={() => logout()}>
          <div className="u-av">{initials}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="u-nm">{user?.fullName || 'User'}</div>
            <div className="u-rl">{badge}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
