'use client';
import { useEffect } from 'react';
import { useAppDispatch } from '../../../store';
import { setPageTitle } from '../../../store/slices/uiSlice';
import { AppShell } from '../../../layouts/AppLayout';
import { StatCard } from '../../../components/ui/StatCard';
import { Chip } from '../../../components/ui/Chip';

const PAYROLL_STEPS = [
  { num: '✓', label: 'Attendance lock', sub: 'Finalized 30 Apr 2026', status: 'Done', cls: 'prs-ok', chipVariant: 'green' as const },
  { num: '✓', label: 'LOP & variable pay', sub: '3 LOP · 12 variable payouts', status: 'Done', cls: 'prs-ok', chipVariant: 'green' as const },
  { num: '3', label: 'PF, ESI, PT, TDS compute', sub: 'Statutory calculations running', status: 'Running', cls: 'prs-cur', chipVariant: 'amber' as const },
  { num: '4', label: 'Finance / CFO approval', sub: 'Awaiting sign-off', status: 'Pending', cls: 'prs-pen', chipVariant: 'gray' as const },
  { num: '5', label: 'NEFT bank file generation', sub: 'Bulk transfer setup', status: 'Pending', cls: 'prs-pen', chipVariant: 'gray' as const },
  { num: '6', label: 'Payslip generation & email', sub: 'Auto-email to all 284 employees', status: 'Pending', cls: 'prs-pen', chipVariant: 'gray' as const },
];

export default function PayrollPage() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Payroll', breadcrumb: 'Operations' }));
  }, [dispatch]);

  return (
    <AppShell>
      <div className="pg-enter">
        <div className="ph">
          <div>
            <h1>Payroll</h1>
            <p>May 2026 · 284 employees · Statutory-compliant · Auto payslip</p>
          </div>
          <div className="ph-r">
            <button className="btn btn-sec btn-sm">↓ Download Report</button>
            <button className="btn btn-pri btn-sm">▶ Run Payroll</button>
          </div>
        </div>

        <div className="g4 mb14">
          <StatCard label="Gross Payroll (May)" value="₹2.1Cr" color="var(--green)" />
          <StatCard label="PF Contribution" value="₹18.4L" color="var(--teal)" />
          <StatCard label="TDS Deducted" value="₹9.2L" color="var(--red)" />
          <StatCard label="Net Disbursed (Apr)" value="₹1.8Cr" color="var(--blue)" chip={<Chip variant="blue">Completed</Chip>} />
        </div>

        <div className="g2">
          {/* Payroll Steps */}
          <div className="card cp">
            <div className="ct">Payroll Run Steps — May 2026</div>
            {PAYROLL_STEPS.map((step, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < PAYROLL_STEPS.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    background: step.cls === 'prs-ok'
                      ? 'var(--green)'
                      : step.cls === 'prs-cur'
                      ? 'var(--blue)'
                      : 'var(--surface3)',
                    color: step.cls === 'prs-pen' ? 'var(--ink4)' : '#fff',
                  }}
                >
                  {step.num}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{step.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{step.sub}</div>
                </div>
                <Chip variant={step.chipVariant}>{step.status}</Chip>
              </div>
            ))}
          </div>

          {/* Sample Payslip */}
          <div className="card cp">
            <div className="ct">Sample Payslip — Ananya Das · May 2026</div>
            <div
              style={{
                display: 'flex', justifyContent: 'space-between',
                marginBottom: 12, paddingBottom: 11,
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Ananya Das</div>
                <div style={{ fontSize: 11, color: 'var(--ink4)' }}>Product Manager · Grade M4</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--ink4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Net Pay
                </div>
                <div style={{ fontSize: 21, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                  ₹1,68,500
                </div>
              </div>
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink4)', marginBottom: 6 }}>
              Earnings
            </div>
            {[
              { label: 'Basic Salary', value: '₹1,00,000' },
              { label: 'HRA', value: '₹40,000' },
              { label: 'Special Allowance', value: '₹40,000' },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                <span style={{ color: 'var(--ink3)' }}>{row.label}</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}

            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink4)', margin: '12px 0 6px' }}>
              Deductions
            </div>
            {[
              { label: 'PF (12%)', value: '−₹1,800' },
              { label: 'TDS', value: '−₹8,200' },
              { label: 'Professional Tax', value: '−₹200' },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                <span style={{ color: 'var(--ink3)' }}>{row.label}</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--red)' }}>{row.value}</span>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
              <button className="btn btn-sec btn-sm">↓ Download PDF</button>
              <button className="btn btn-sec btn-sm">📧 Email Employee</button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}