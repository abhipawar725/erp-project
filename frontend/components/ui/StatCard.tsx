import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string; // CSS var, e.g. 'var(--blue)'
  chip?: ReactNode;
  sub?: string;
}

export function StatCard({ label, value, color = 'var(--blue)', chip, sub }: StatCardProps) {
  return (
    <div className="stat">
      <div className="s-bar" style={{ background: color }} />
      <div className="s-lbl">{label}</div>
      <div className="s-val" style={{ color }}>{value}</div>
      {sub && <div className="s-sub">{sub}</div>}
      {chip && <div className="s-chip">{chip}</div>}
    </div>
  );
}
