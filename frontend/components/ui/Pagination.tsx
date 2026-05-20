'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Generate visible page numbers
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--ink4)' }}>
        Showing {from}–{to} of {total}
      </span>
      <div className="pag">
        <button
          className="pag-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} style={{ fontSize: 11, color: 'var(--ink4)', padding: '0 4px' }}>…</span>
          ) : (
            <button
              key={p}
              className={`pag-btn${p === page ? ' on' : ''}`}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </button>
          ),
        )}
        <button
          className="pag-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          ›
        </button>
      </div>
    </div>
  );
}
