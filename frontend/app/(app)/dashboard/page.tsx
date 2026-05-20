'use client';
import { useEffect } from 'react';
import { useAppDispatch } from '@/store';
import { setPageTitle } from '@/store/slices/uiSlice';
import { AppShell } from '@/layouts/AppLayout';
import { StatCard } from '@/components/ui/StatCard';
import { Chip } from '@/components/ui/Chip';

export default function DashboardPage() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Dashboard', breadcrumb: 'Overview' }));
  }, [dispatch]);

  return (
    <AppShell>
      <div className="pg-enter">

        {/* Welcome Banner */}
        <div className="wl">
          <div className="wl-ttl">Good morning, Aarav 👋</div>
          <div className="wl-sub">9 pending approvals · 3 new applications · May payroll running</div>
          <div className="wl-meta">
            Monday, 4 May 2026 &nbsp;·&nbsp; FY 2026–27 &nbsp;·&nbsp; Nexgen Solutions Pvt Ltd
          </div>
        </div>

        {/* KPI Stats */}
        <div className="g4 mb14">
          <StatCard
            label="Total Employees"
            value={284}
            color="var(--blue)"
            chip={<Chip variant="blue">⇧ 12 this month</Chip>}
          />
          <StatCard
            label="Open Positions"
            value={31}
            color="var(--amber)"
            chip={<Chip variant="amber">8 departments</Chip>}
          />
          <StatCard
            label="Attrition Rate"
            value="4.2%"
            color="var(--red)"
            chip={<Chip variant="red">⇧ 0.3% MoM</Chip>}
          />
          <StatCard
            label="Payroll Apr"
            value="₹1.8Cr"
            color="var(--green)"
            chip={<Chip variant="green">Disbursed</Chip>}
          />
        </div>

        {/* Two-column cards */}
        <div className="g2 mb14">
          {/* Pending Actions */}
          <div className="card cp">
            <div className="ct">
              Pending Actions
              <span className="cl">View all →</span>
            </div>
            {[
              { icon: '📋', text: '9 leave approvals pending', chip: <Chip variant="amber">Urgent</Chip> },
              { icon: '📄', text: 'Rajesh Kumar FNF to review', chip: <Chip variant="red">Today</Chip> },
              { icon: '📧', text: '3 offer letters awaiting sign-off', chip: <Chip variant="blue">Review</Chip> },
              { icon: '🎯', text: 'Q1 KRA cycle closes in 27 days', chip: <Chip variant="amber">Reminder</Chip> },
              { icon: '💻', text: 'Laptop not returned — Rajesh K.', chip: <Chip variant="red">Overdue</Chip> },
            ].map((item, i) => (
              <div key={i} className="pend">
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span className="pend-ttl">{item.text}</span>
                {item.chip}
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="card cp">
            <div className="ct">Recent Activity</div>
            {[
              { bg: 'var(--green-lt)', bd: 'var(--green-bd)', ico: '✓', title: 'Priya Sharma offer sent', sub: '10 min ago · Senior Designer' },
              { bg: 'var(--blue-lt)', bd: 'var(--blue-md)', ico: '⇧', title: '12 candidates from Naukri', sub: '1 hr ago · Backend Engineer' },
              { bg: 'var(--amber-lt)', bd: 'var(--amber-bd)', ico: '◑', title: 'Anil Mehta leave approved (3d CL)', sub: '2 hr ago' },
              { bg: 'var(--purple-lt)', bd: 'var(--purple-bd)', ico: '★', title: 'Neha Joshi onboarded', sub: 'Yesterday · Product team' },
              { bg: 'var(--teal-lt)', bd: 'var(--teal-bd)', ico: '🛡', title: 'PF filing submitted — Apr 2026', sub: '2 days ago · Compliance' },
            ].map((item, i) => (
              <div key={i} className="act">
                <div className="act-ico" style={{ background: item.bg, borderColor: item.bd }}>
                  {item.ico}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Three-column cards */}
        <div className="g3">
          {/* Hiring Funnel */}
          <div className="card cp">
            <div className="ct">Hiring Funnel</div>
            {[
              { label: 'Applied', value: 248, pct: 100, color: 'var(--blue)' },
              { label: 'Shortlisted', value: 89, pct: 36, color: 'var(--teal)' },
              { label: 'Interviewed', value: 41, pct: 16, color: 'var(--amber)' },
              { label: 'Offered', value: 12, pct: 5, color: 'var(--green)' },
            ].map((item) => (
              <div key={item.label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>
                  <span style={{ color: 'var(--ink3)' }}>{item.label}</span>
                  <span>{item.value}</span>
                </div>
                <div className="pb">
                  <div className="pb-f" style={{ width: `${item.pct}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Headcount by Dept */}
          <div className="card cp">
            <div className="ct">Headcount by Dept</div>
            <div style={{ fontSize: 12 }}>
              {[
                { dept: 'Engineering', count: 82 },
                { dept: 'Sales', count: 54 },
                { dept: 'Operations', count: 48 },
                { dept: 'Finance', count: 29 },
                { dept: 'Others', count: 71 },
              ].map((item, i) => (
                <div
                  key={item.dept}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '5px 0',
                    borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span style={{ color: 'var(--ink3)' }}>{item.dept}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance Today */}
          <div className="card cp">
            <div className="ct">Attendance Today</div>
            <div style={{ textAlign: 'center', margin: '8px 0 13px' }}>
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--green)', letterSpacing: -1 }}>
                241
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>Present of 284</div>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              {[
                { label: 'Absent', value: 18, bg: 'var(--red-lt)', bd: 'var(--red-bd)', color: 'var(--red)' },
                { label: 'WFH', value: 14, bg: 'var(--amber-lt)', bd: 'var(--amber-bd)', color: 'var(--amber)' },
                { label: 'Leave', value: 11, bg: 'var(--blue-lt)', bd: 'var(--blue-md)', color: 'var(--blue)' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    flex: 1, textAlign: 'center', padding: 7,
                    background: item.bg, borderRadius: 7,
                    border: `1px solid ${item.bd}`,
                  }}
                >
                  <div style={{ color: item.color, fontWeight: 700, fontSize: 15, fontFamily: 'var(--mono)' }}>
                    {item.value}
                  </div>
                  <div style={{ color: item.color, fontSize: 10, fontWeight: 600, marginTop: 1 }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
