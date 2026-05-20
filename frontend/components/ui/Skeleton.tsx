interface SkeletonProps {
  height?: number | string;
  width?: number | string;
  className?: string;
}

export function Skeleton({ height = 16, width = '100%', className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ height, width }}
    />
  );
}

// Preset: stat card skeleton
export function StatCardSkeleton() {
  return (
    <div className="stat">
      <div className="s-bar" style={{ background: 'var(--surface3)' }} />
      <Skeleton height={10} width={80} className="mb14" />
      <Skeleton height={28} width={60} />
      <div style={{ marginTop: 8 }}>
        <Skeleton height={20} width={90} />
      </div>
    </div>
  );
}

// Preset: table row skeleton
export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '12px 14px' }}>
          <Skeleton height={14} width={i === 0 ? 140 : 80} />
        </td>
      ))}
    </tr>
  );
}
