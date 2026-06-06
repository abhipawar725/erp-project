'use client';
/**
 * CompanySelector.tsx
 *
 * Reusable company picker for any settings page (roles, permissions,
 * permission groups, user permissions, form builder, etc.)
 *
 * Shows only for:
 *   - Super admins (can switch to any company)
 *   - Employees managing multiple companies
 *
 * Single-company employees see nothing — companyId is implicit.
 *
 * Usage:
 *   const { companyId } = useCompanySelector();
 *   // Then use companyId in all queries on the page
 *
 *   // OR embed the dropdown directly:
 *   <CompanySelector onChange={id => setCompanyId(id)} />
 */
import { useState }     from 'react';
import { useCompany }   from '../../features/company/hooks/useCompany';
import { ManagedCompany } from '../../types/auth.types';

interface CompanySelectorProps {
  onChange?: (companyId: number) => void;
  label?:    string;
  size?:     'sm' | 'md';
}

export function CompanySelector({ onChange, label = 'Company', size = 'md' }: CompanySelectorProps) {
  const { companyId, companies, switchCompany, canSwitchCompany, isSuperAdmin } = useCompany();

  if (!canSwitchCompany) return null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    switchCompany(id);
    onChange?.(id);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      {size === 'md' && (
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink4)', whiteSpace: 'nowrap' }}>
          {label}:
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <select
          value={companyId}
          onChange={handleChange}
          style={{
            padding: size === 'sm' ? '5px 28px 5px 10px' : '7px 32px 7px 12px',
            border: '1px solid var(--border2)',
            borderRadius: 'var(--r)',
            fontSize: size === 'sm' ? 11 : 12,
            fontFamily: 'var(--font)',
            fontWeight: 600,
            background: 'var(--surface)',
            color: 'var(--ink)',
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            minWidth: 180,
            outline: 'none',
          }}
        >
          {companies.map((co: ManagedCompany) => (
            <option key={co.id} value={co.id} disabled={!co.is_active}>
              {co.name}
              {!co.is_active ? ' (Suspended)' : ''}
              {isSuperAdmin ? '' : ` · ${co.manager_role}`}
            </option>
          ))}
        </select>
        {/* Custom chevron */}
        <div style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', fontSize: 10, color: 'var(--ink4)',
        }}>
          ▾
        </div>
      </div>

      {/* Company status badge */}
      {companies.find((c: ManagedCompany) => c.id === companyId)?.is_active === false && (
        <span style={{ fontSize: 10, color: 'var(--red)', background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>
          Suspended
        </span>
      )}
    </div>
  );
}

// ─── Page header bar with company selector ────────────────────────────────────
// Use this as a consistent header on all settings pages

interface PageHeaderWithCompanyProps {
  title:       string;
  description?: string;
  actions?:    React.ReactNode;
}

export function PageHeaderWithCompany({ title, description, actions }: PageHeaderWithCompanyProps) {
  const { canSwitchCompany } = useCompany();

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12, marginBottom: 20,
    }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.4px' }}>{title}</h1>
        {description && (
          <p style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 4 }}>{description}</p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {canSwitchCompany && (
          <CompanySelector size="md" />
        )}
        {actions}
      </div>
    </div>
  );
}

// ─── Hook for pages that need companyId ───────────────────────────────────────

export function useCompanySelector() {
  const { companyId, company, companies, switchCompany, canSwitchCompany } = useCompany();
  return { companyId, company, companies, switchCompany, canSwitchCompany };
}
