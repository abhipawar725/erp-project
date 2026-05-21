'use client';
import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { useAppDispatch }      from '../../../store';
import { setPageTitle }        from '../../../store/slices/uiSlice';
import { AppShell }            from '../../../layouts/AppLayout';
import { StatCard }            from '../../../components/ui/StatCard';
import { Chip }                from '../../../components/ui/Chip';
import { Modal }               from '../../../components/ui/Modal';
import { CandidateFormModal }  from '../../../features/candidates/components/CandidateFormModal';
import { BulkUploadModal }     from '../../../features/candidates/components/BulkUploadModal';
import { StatusMoveModal }     from '../../../features/candidates/components/StatusMoveModal';
import { useCandidates, useCandidateStats, useDeleteCandidate } from '../../../features/candidates/hooks/useCandidates';
import { usePermission }       from '../../../features/auth/hooks/usePermission';
import { useDebounce }         from '../../../hooks/useDebounce';
import type { Candidate }      from '../../../features/candidates/types/candidate.types';
import {
  ALL_STATUSES, ALL_SOURCES, STATUS_COLORS, SOURCE_EMOJI, PIPELINE_STAGES,
} from '../../../features/candidates/types/candidate.types';
import { formatDate }          from '../../../utils/formatters';

export default function ATSPage() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const { isHR, isAdmin, isManager } = usePermission();
  const canManage = isHR || isAdmin || isManager;

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [viewMode,     setViewMode]     = useState<'list' | 'kanban'>('list');
  const [formOpen,     setFormOpen]     = useState(false);
  const [bulkOpen,     setBulkOpen]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<Candidate | null>(null);
  const [moveTarget,   setMoveTarget]   = useState<Candidate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [page,         setPage]         = useState(1);

  const debouncedSearch = useDebounce(search, 380);
  const deleteMutation  = useDeleteCandidate();

  const { data, isLoading } = useCandidates({
    page,
    limit:   20,
    search:  debouncedSearch  || undefined,
    status:  statusFilter     || undefined,
    source:  sourceFilter     || undefined,
  });

  const { data: stats } = useCandidateStats();
  const candidates = data?.data ?? [];
  const meta       = data?.meta;

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Candidate Sourcing', breadcrumb: 'Recruitment' }));
  }, [dispatch]);

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit   = (c: Candidate) => { setEditTarget(c); setFormOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  // ─── Status chip ─────────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => {
    const c = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
    if (!c) return <Chip variant="gray">{status}</Chip>;
    return (
      <span style={{
        display:      'inline-flex', alignItems: 'center',
        background:   c.bg, color: c.text, border: `1px solid ${c.border}`,
        borderRadius: 99, padding: '2px 9px', fontSize: 10, fontWeight: 700,
        letterSpacing: '.04em', whiteSpace: 'nowrap',
      }}>
        {status}
      </span>
    );
  };

  // ─── Kanban view ──────────────────────────────────────────────────────────
  const KanbanBoard = () => {
    // group candidates by stage (active pipeline stages only)
    const grouped = PIPELINE_STAGES.reduce((acc, s) => {
      acc[s] = candidates.filter((c) => c.status === s);
      return acc;
    }, {} as Record<string, Candidate[]>);

    return (
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {PIPELINE_STAGES.map((stage) => {
          const col = STATUS_COLORS[stage];
          const cards = grouped[stage] || [];
          return (
            <div key={stage} style={{ minWidth: 220, maxWidth: 240, flexShrink: 0 }}>
              {/* Column header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', background: col.bg, border: `1px solid ${col.border}`,
                borderRadius: 'var(--r) var(--r) 0 0', marginBottom: 0,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: col.text }}>{stage}</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', background: col.text, color: '#fff', borderRadius: 99, padding: '1px 7px' }}>
                  {cards.length}
                </span>
              </div>
              {/* Cards */}
              <div style={{ background: 'var(--surface2)', border: `1px solid ${col.border}`, borderTop: 'none', borderRadius: '0 0 var(--r) var(--r)', minHeight: 120, padding: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {cards.map((c) => (
                  <div
                    key={c.id}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 11px', cursor: 'pointer', boxShadow: 'var(--sh)', transition: 'box-shadow .1s' }}
                    onClick={() => router.push(`/ats/${c.id}`)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--sh2)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--sh)'; }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.candidate_name}
                    </div>
                    {c.current_company_name && (
                      <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.current_company_name}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {c.total_experience != null && (
                        <span style={{ fontSize: 10, color: 'var(--ink4)' }}>{c.total_experience}yr exp</span>
                      )}
                      {c.source && (
                        <span style={{ fontSize: 10 }}>{SOURCE_EMOJI[c.source] || ''}</span>
                      )}
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMoveTarget(c); }}
                        style={{ marginTop: 7, width: '100%', padding: '3px 0', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 5, fontSize: 10, color: 'var(--ink4)', cursor: 'pointer', fontFamily: 'var(--font)' }}
                      >
                        Move →
                      </button>
                    )}
                  </div>
                ))}
                {cards.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 11, color: 'var(--ink4)' }}>
                    No candidates
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AppShell onAddNew={canManage ? openCreate : undefined}>
      <div className="pg-enter">

        {/* Header */}
        <div className="ph">
          <div>
            <h1>Candidate Sourcing</h1>
            <p>Recruitment pipeline · Bulk import · Status tracking · Resume management</p>
          </div>
          <div className="ph-r">
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 2, gap: 2 }}>
              {([['list', '☰ List'], ['kanban', '⊞ Kanban']] as const).map(([v, label]) => (
                <button key={v} onClick={() => setViewMode(v)} style={{ padding: '4px 12px', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: viewMode === v ? 'var(--surface)' : 'transparent', color: viewMode === v ? 'var(--ink)' : 'var(--ink4)', boxShadow: viewMode === v ? 'var(--sh)' : 'none', fontFamily: 'var(--font)', transition: 'all .1s' }}>
                  {label}
                </button>
              ))}
            </div>
            {canManage && (
              <>
                <button className="btn btn-sec btn-sm" onClick={() => setBulkOpen(true)}>↑ Bulk Import</button>
                <button className="btn btn-pri btn-sm" onClick={openCreate}>+ Add Candidate</button>
              </>
            )}
          </div>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="g4 mb14">
            <StatCard label="Total Candidates" value={stats.summary.total}          color="var(--blue)"   />
            <StatCard label="Active in Pipeline" value={stats.summary.active}        color="var(--purple)" />
            <StatCard label="Hired"             value={stats.summary.hired}         color="var(--green)"  />
            <StatCard label="This Month"        value={stats.summary.thisMonth}     color="var(--teal)"   />
          </div>
        )}

        {/* Pipeline stage bar */}
        {stats?.pipeline && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
            {stats.pipeline.map(({ status, count }) => {
              const c = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
              if (!c) return null;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
                  style={{
                    display:      'flex', flexDirection: 'column', alignItems: 'center',
                    padding:      '8px 14px', border: `1px solid ${statusFilter === status ? c.text : c.border}`,
                    borderRadius: 'var(--r)', background: statusFilter === status ? c.text : c.bg,
                    cursor:       'pointer', flexShrink: 0, minWidth: 80, fontFamily: 'var(--font)',
                  }}
                >
                  <span style={{ fontSize: 16, fontFamily: 'var(--mono)', fontWeight: 700, color: statusFilter === status ? '#fff' : c.text }}>
                    {count}
                  </span>
                  <span style={{ fontSize: 9, color: statusFilter === status ? 'rgba(255,255,255,.85)' : c.text, fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap' }}>
                    {status}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ maxWidth: 280 }}>
            <span style={{ color: 'var(--ink4)' }}>⌕</span>
            <input
              type="text"
              placeholder="Search name, email, company…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 10px', fontSize: 12, fontFamily: 'var(--font)', outline: 'none' }}
          >
            <option value="">All Stages</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 10px', fontSize: 12, fontFamily: 'var(--font)', outline: 'none' }}
          >
            <option value="">All Sources</option>
            {ALL_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_EMOJI[s]} {s}</option>)}
          </select>
          {(statusFilter || sourceFilter || search) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setStatusFilter(''); setSourceFilter(''); setPage(1); }}
            >
              ✕ Clear filters
            </button>
          )}
          <span style={{ fontSize: 11, color: 'var(--ink4)', marginLeft: 'auto' }}>
            {meta?.total ?? '…'} candidate{(meta?.total ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── KANBAN VIEW ── */}
        {viewMode === 'kanban' && <KanbanBoard />}

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && (
          <div className="card">
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Contact</th>
                    <th>Experience</th>
                    <th>Expected CTC</th>
                    <th>Notice</th>
                    <th>Source</th>
                    <th>Stage</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          {[160,120,80,90,70,90,90,100].map((w,j) => (
                            <td key={j}><div className="skeleton" style={{ height: 13, width: w }} /></td>
                          ))}
                        </tr>
                      ))
                    : candidates.length === 0
                    ? (
                        <tr>
                          <td colSpan={canManage ? 8 : 7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink4)' }}>
                            <div style={{ fontSize: 28, marginBottom: 12 }}>🔍</div>
                            <div style={{ fontWeight: 600, marginBottom: 6 }}>No candidates found</div>
                            <div style={{ fontSize: 12, marginBottom: 16 }}>
                              {search || statusFilter || sourceFilter ? 'Try adjusting your filters' : 'Add your first candidate to begin'}
                            </div>
                            {canManage && !search && !statusFilter && !sourceFilter && (
                              <button className="btn btn-pri btn-sm" onClick={openCreate}>+ Add Candidate</button>
                            )}
                          </td>
                        </tr>
                      )
                    : candidates.map((c) => (
                        <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/ats/${c.id}`)}>
                          {/* Name + company */}
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{c.candidate_name}</div>
                            {c.current_company_name && (
                              <div style={{ fontSize: 10, color: 'var(--ink4)' }}>
                                {c.current_company_name}
                                {c.last_company_designation && ` · ${c.last_company_designation}`}
                              </div>
                            )}
                            {c.location && <div style={{ fontSize: 10, color: 'var(--ink4)' }}>📍 {c.location}</div>}
                          </td>
                          {/* Contact */}
                          <td>
                            {c.email    && <div style={{ fontSize: 11 }}>{c.email}</div>}
                            {c.phone_number && <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{c.phone_number}</div>}
                          </td>
                          {/* Experience */}
                          <td style={{ textAlign: 'center' }}>
                            {c.total_experience != null
                              ? <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--blue)' }}>{c.total_experience} yr</span>
                              : <span style={{ color: 'var(--ink4)' }}>—</span>}
                            {c.relevant_experience != null && (
                              <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{c.relevant_experience}yr rel.</div>
                            )}
                          </td>
                          {/* Expected CTC */}
                          <td style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                            {c.expected_salary
                              ? `₹${((c.expected_salary * 12) / 100000).toFixed(1)}L`
                              : <span style={{ color: 'var(--ink4)' }}>—</span>}
                            {c.immediate_joiner && (
                              <div style={{ fontSize: 9, color: 'var(--green)', fontFamily: 'var(--font)', fontWeight: 700 }}>⚡ IMMEDIATE</div>
                            )}
                          </td>
                          {/* Notice */}
                          <td style={{ fontSize: 12, color: 'var(--ink3)' }}>
                            {c.notice_period != null
                              ? `${c.notice_period} ${c.notice_period_unit || 'Days'}`
                              : <span style={{ color: 'var(--ink4)' }}>—</span>}
                          </td>
                          {/* Source */}
                          <td>
                            {c.source
                              ? <Chip variant="blue">{SOURCE_EMOJI[c.source as keyof typeof SOURCE_EMOJI] || ''} {c.source}</Chip>
                              : <span style={{ color: 'var(--ink4)' }}>—</span>}
                          </td>
                          {/* Status */}
                          <td><StatusBadge status={c.status} /></td>
                          {/* Actions */}
                          {canManage && (
                            <td onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <Chip variant="gray"   onClick={() => openEdit(c)}>Edit</Chip>
                                <Chip variant="purple" onClick={() => setMoveTarget(c)}>Move</Chip>
                                <Chip variant="red"    onClick={() => setDeleteTarget(c)}>Delete</Chip>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <span style={{ color: 'var(--ink4)' }}>
                  Page {meta.page} of {meta.totalPages} · {meta.total} total
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sec btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <button className="btn btn-sec btn-sm" disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CandidateFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        candidate={editTarget}
      />
      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
      <StatusMoveModal
        open={!!moveTarget}
        onClose={() => setMoveTarget(null)}
        candidate={moveTarget}
      />
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Candidate"
        subtitle={`Remove ${deleteTarget?.candidate_name} from the system?`}
        footer={
          <>
            <button className="btn btn-sec" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Removing…' : 'Yes, Remove'}
            </button>
          </>
        }
      >
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)' }}>
          ⚠ This performs a soft delete. The candidate record is preserved in audit logs.
        </div>
      </Modal>
    </AppShell>
  );
}
