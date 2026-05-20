'use client';
import { ReactNode } from 'react';
import { TableRowSkeleton } from './Skeleton';
import { Pagination } from './Pagination';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  // Pagination
  page?: number;
  totalPages?: number;
  total?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  // Toolbar
  toolbar?: ReactNode;
  emptyText?: string;
}

export function DataTable<T>({
  columns, data, isLoading, rowKey, onRowClick,
  page, totalPages, total, limit, onPageChange,
  toolbar, emptyText = 'No records found.',
}: DataTableProps<T>) {
  return (
    <div className="card">
      {toolbar && (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 17px', borderBottom: '1px solid var(--border)',
            flexWrap: 'wrap', gap: 8,
          }}
        >
          {toolbar}
        </div>
      )}
      <div className="tw">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={columns.length} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ink4)' }}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={rowKey(row)} onClick={() => onRowClick?.(row)}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(row, index)
                        : (row as Record<string, unknown>)[col.key] as ReactNode}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {page !== undefined && totalPages !== undefined && total !== undefined && limit !== undefined && onPageChange && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
