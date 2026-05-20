'use client';
import { useEffect } from 'react';
import { useAppDispatch } from '../../../store';
import { setPageTitle } from '../../../store/slices/uiSlice';
import { AppShell } from '../../../layouts/AppLayout';
import { StatCard } from '../../../components/ui/StatCard';
import { Chip } from '../../../components/ui/Chip';

const LEAVE_REQUESTS = [
  { employee: 'Anil Mehta', type: 'CL', typeVariant: 'blue' as const, dates: '6–8 May', days: 3, reason: 'Personal' },
  { employee: 'Sunita Rao', type: 'SL', typeVariant: 'purple' as const, dates: '5 May', days: 1, reason: 'Medical' },
  { employee: 'Rohan Gupta', type: 'EL', typeVariant: 'green' as const, dates: '12–16 May', days: 5, reason: 'Vacation' },
];

const MAY_CALENDAR = [
  [null, null, null, null, 1, 2, 3],
  [4, 5, 6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15, 16, 17],
  [18, 19, 20, 21, 22, 23, 24],
  [25, 26, 27, 28, 29, 30, 31],
];

const LEAVE_DAYS = new Set([5, 6, 7, 8, 13, 14, 15, 16]);
const HOLIDAY_DAYS = new Set([19]);
const TODAY = 4;

export default function LeavesPage() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Leave Management', breadcrumb: 'Operations' }));
  }, [dispatch]);

  return (
    <AppShell>
      <div className="pg-enter">
        <div className="ph">
          <div>
            <h1>Leave Management</h1>
            <p>Policy-based · Multi-level approvals · Holiday calendar · 9 pending</p>
          </div>
          <button className="btn btn-pri btn-sm">+ Apply Leave</button>
        </div>

        {/* Stats */}
        <div className="g4 mb14">
          <StatCard label="Pending Approvals" value={9} color="var(--amber)" />
          <StatCard label="On Leave Today" value={11} color="var(--green)" />
          <StatCard label="Avg EL Balance" value="8.4d" color="var(--blue)" />
          <StatCard label="Holidays Remaining" value={14} color="var(--pink)" />
        </div>

        <div className="g2">
          {/* Pending Approvals Table */}
          <div className="card">
            <div style={{ padding: '13px 17px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
              Pending Approvals
            </div>
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {LEAVE_REQUESTS.map((req) => (
                    <tr key={req.employee}>
                      <td><strong>{req.employee}</strong></td>
                      <td><Chip variant={req.typeVariant}>{req.type}</Chip></td>
                      <td>{req.dates}</td>
                      <td>{req.days}</td>
                      <td>{req.reason}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Chip variant="green" onClick={() => {}}>Approve</Chip>
                          <Chip variant="red" onClick={() => {}}>Reject</Chip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* May Calendar */}
          <div className="card cp">
            <div className="ct">May 2026 Calendar</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 9 }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div
                  key={i}
                  style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--ink4)', padding: 3 }}
                >
                  {d}
                </div>
              ))}
              {MAY_CALENDAR.flat().map((day, i) => {
                const isLeave = day !== null && LEAVE_DAYS.has(day);
                const isHoliday = day !== null && HOLIDAY_DAYS.has(day);
                const isToday = day === TODAY;

                return (
                  <div
                    key={i}
                    style={{
                      textAlign: 'center', fontSize: 11, fontWeight: isToday ? 700 : 500,
                      padding: '6px 0', borderRadius: 5,
                      background: isToday
                        ? 'var(--blue)'
                        : isLeave
                        ? 'var(--green-lt)'
                        : isHoliday
                        ? 'var(--amber-lt)'
                        : 'transparent',
                      color: isToday
                        ? '#fff'
                        : isLeave
                        ? 'var(--green)'
                        : isHoliday
                        ? 'var(--amber)'
                        : day
                        ? 'var(--ink3)'
                        : 'transparent',
                      border: isLeave
                        ? '1px solid var(--green-bd)'
                        : isHoliday
                        ? '1px solid var(--amber-bd)'
                        : '1px solid transparent',
                    }}
                  >
                    {day ?? ''}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, flexWrap: 'wrap' }}>
              {[
                { color: 'var(--green-lt)', bd: 'var(--green-bd)', label: 'Leave' },
                { color: 'var(--amber-lt)', bd: 'var(--amber-bd)', label: 'Holiday' },
                { color: 'var(--blue)', bd: 'var(--blue)', label: 'Today' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: 9, height: 9, borderRadius: 2,
                      background: item.color, border: `1px solid ${item.bd}`,
                    }}
                  />
                  <span style={{ color: 'var(--ink4)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}