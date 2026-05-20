type ChipVariant = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'teal' | 'pink' | 'gray';

const VARIANT_CLASS: Record<ChipVariant, string> = {
  green: 'cg',
  amber: 'ca',
  red: 'cr',
  blue: 'cb',
  purple: 'cp2',
  teal: 'ct2',
  pink: 'cpk',
  gray: 'cgr',
};

interface ChipProps {
  children: React.ReactNode;
  variant?: ChipVariant;
  className?: string;
   onClick?: (
    e: React.MouseEvent<HTMLDivElement>
  ) => void;
}

export function Chip({ children, variant = 'gray', className = '', onClick }: ChipProps) {
  return (
    <span
      className={`chip ${VARIANT_CLASS[variant]} ${className}`}
      style={onClick ? { cursor: 'pointer' } : undefined}
      onClick={onClick}
    >
      {children}
    </span>
  );
}

// Convenience: map employee status → chip variant
export function statusToVariant(status: string): ChipVariant {
  const map: Record<string, ChipVariant> = {
    Active: 'green',
    'On Probation': 'amber',
    Left: 'red',
    Absconding: 'purple',
    Present: 'green',
    Absent: 'red',
    WFH: 'blue',
    Leave: 'purple',
    Pending: 'amber',
    Approved: 'green',
    Rejected: 'red',
    Cancelled: 'gray',
    Draft: 'gray',
    Shortlisted: 'blue',
    Interview: 'teal',
    Offered: 'purple',
    Hired: 'green',
  };
  return map[status] || 'gray';
}
