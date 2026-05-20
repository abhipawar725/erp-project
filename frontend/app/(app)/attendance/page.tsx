'use client';
import { useEffect } from 'react';
import { useAppDispatch } from '../../../store';
import { setPageTitle } from '../../../store/slices/uiSlice';
import { AppShell } from '../../../layouts/AppLayout';
import { StatCard } from '../../../components/ui/StatCard';

const WEEKS = [
  { label: 'Week 1', days: ['P','P','W','P','P','—','—'] },
  { label: 'Week 2', days: ['P','A','P','P','P','—','—'] },
  { label: 'Week 3', days: ['H','P','P','W','P','—','—'] },
  { label: 'Week 4', days: ['L','L','L','P','P','—','—'] },
];

const DAY_STYLE: Record<string, string> = {
  P: 'ag-p', A: 'ag-a', W: 'ag-w', L: 'ag-l', H: 'ag-h', '—': 'ag-off',
};

export default function AttendancePage() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Attendance & Time', breadcrumb: 'Operations' }));
  }, [dispatch]);

  return (
    <AppShell>
      <div className="pg-enter">
        <div className="ph">
          <div>
            <h1>Attendance &amp; Time</h1>
            <p>Biometric API-ready · Geo-fenced mobile · Shift management · May 2026</p>
          </div>
          <div className="ph-r">
            <button className="btn btn-sec btn-sm">↓ Export</button>
            <button className="btn btn-pri btn-sm">+ Mark Attendance</button>
          </div>
        </div>

        <div className="g4 mb14">
          <StatCard label="Present Today" value={241} color="var(--green)" />
          <StatCard label="Absent" value={18} color="var(--red)" />
          <StatCard label="WFH" value={14} color="var(--blue)" />
          <StatCard label="Avg Attendance %" value="94.2%" color="var(--teal)" />
        </div>

        {/* Attendance Grid */}
        <div className="card cp mb14">
          <div className="ct">Anil Mehta — May 2026 Attendance Sheet</div>
          <div className="att-grid">
            <div className="ag-hd" />
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
              <div key={d} className="ag-hd">{d}</div>
            ))}
            {WEEKS.map((week) => (
              <>
                <div key={`lbl-${week.label}`} className="ag-lbl">{week.label}</div>
                {week.days.map((day, i) => (
                  <div key={i} className={`ag-cell ${DAY_STYLE[day] || 'ag-off'}`}>{day}</div>
                ))}
              </>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 11, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>P — Present</span>
            <span style={{ color: 'var(--red)', fontWeight: 600 }}>A — Absent</span>
            <span style={{ color: 'var(--amber)', fontWeight: 600 }}>H — Holiday</span>
            <span style={{ color: 'var(--blue)', fontWeight: 600 }}>W — WFH</span>
            <span style={{ color: 'var(--purple)', fontWeight: 600 }}>L — Leave</span>
          </div>
        </div>

        {/* Today's roster */}
        <div className="card">
          <div style={{ padding: '13px 17px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
            Today's Roster
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Amit Kumar', dept: 'Engineering', status: 'P', checkIn: '09:02', checkOut: '—', hours: '—' },
                  { name: 'Neha Joshi', dept: 'Design', status: 'P', checkIn: '09:14', checkOut: '—', hours: '—' },
                  { name: 'Sunita Rao', dept: 'Finance', status: 'L', checkIn: '—', checkOut: '—', hours: '—' },
                  { name: 'Pradeep Singh', dept: 'Engineering', status: 'W', checkIn: '09:30', checkOut: '—', hours: '—' },
                  { name: 'Rajesh Kumar', dept: 'Sales', status: 'A', checkIn: '—', checkOut: '—', hours: '—' },
                ].map((row) => (
                  <tr key={row.name}>
                    <td><strong>{row.name}</strong></td>
                    <td>{row.dept}</td>
                    <td>
                      <span className={`ag-cell ${DAY_STYLE[row.status]}`} style={{ width: 24, height: 24, display: 'inline-flex', fontSize: 10 }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{row.checkIn}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{row.checkOut}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{row.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}