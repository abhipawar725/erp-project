'use client';
import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch }      from '../../../store';
import { setPageTitle }        from '../../../store/slices/uiSlice';
import { AppShell }            from '../../../layouts/AppLayout';
import { Chip }                from '../../../components/ui/Chip';
import { Modal }               from '../../../components/ui/Modal';
import { usePermission }       from '../../../features/auth/hooks/usePermission';
import apiClient               from '../../../services/api/client';
import type { ApiResponse }    from '../../../types/api.types';
import { showToast }           from '../../../utils/toast';

interface AptitudeTest {
  id:               number;
  title:            string;
  description?:     string | null;
  duration_minutes: number;
  total_marks:      number;
  pass_marks?:      number | null;
  is_active:        boolean;
  questions?:       { id: number; question_text: string; marks: number }[];
}

export default function AptitudeTestsPage() {
  const dispatch   = useAppDispatch();
  const router     = useRouter();
  const qc         = useQueryClient();
  const { canManageEmployees } = usePermission();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AptitudeTest | null>(null);
  const [form, setForm] = useState({ title: '', description: '', duration_minutes: 30, total_marks: 0, pass_marks: '' });

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Aptitude Tests', breadcrumb: 'ATS' }));
  }, [dispatch]);

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['aptitude-tests'],
    queryFn:  () => apiClient.get<unknown, ApiResponse<AptitudeTest[]>>('/aptitude').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiClient.post<unknown, ApiResponse<AptitudeTest>>('/aptitude', {
        title:            data.title,
        description:      data.description || null,
        duration_minutes: Number(data.duration_minutes),
        total_marks:      Number(data.total_marks),
        pass_marks:       data.pass_marks ? Number(data.pass_marks) : null,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['aptitude-tests'] });
      showToast(`✓ Test "${res.data.title}" created`);
      setCreateOpen(false);
      setForm({ title: '', description: '', duration_minutes: 30, total_marks: 0, pass_marks: '' });
      router.push(`/ats-tests/${res.data.id}`);
    },
    onError: (err: any) => showToast(err?.message || 'Failed to create test'),
  });

  return (
    <AppShell onAddNew={canManageEmployees ? () => setCreateOpen(true) : undefined}>
      <div className="pg-enter">

        {/* Header */}
        <div className="ph">
          <div>
            <h1>Aptitude Tests</h1>
            <p>Create MCQ test papers · Set pass marks · View candidate results</p>
          </div>
          <div className="ph-r">
            {canManageEmployees && <button className="btn btn-pri btn-sm" onClick={() => setCreateOpen(true)}>+ New Test</button>}
          </div>
        </div>

        {/* Stats */}
        <div className="g4 mb14">
          <div className="card cp" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--blue)' }}>{tests.length}</div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 4 }}>Total Tests</div>
          </div>
          <div className="card cp" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--green)' }}>{tests.filter(t => t.is_active).length}</div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 4 }}>Active</div>
          </div>
          <div className="card cp" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--teal)' }}>{tests.reduce((sum, t) => sum + (t.questions?.length || 0), 0)}</div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 4 }}>Total Questions</div>
          </div>
          <div className="card cp" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--amber)' }}>{tests.filter(t => t.pass_marks != null).length}</div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 4 }}>With Pass Mark</div>
          </div>
        </div>

        {/* Test cards */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="card cp"><div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 10 }} /><div className="skeleton" style={{ height: 12, width: '40%' }} /></div>)}
          </div>
        ) : tests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink4)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No aptitude tests yet</div>
            <div style={{ fontSize: 12, marginBottom: 20 }}>Create your first test to start evaluating candidates</div>
            {canManageEmployees && <button className="btn btn-pri btn-sm" onClick={() => setCreateOpen(true)}>+ Create First Test</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {tests.map((test) => (
              <div
                key={test.id}
                className="card"
                style={{ overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .1s' }}
                onClick={() => router.push(`/ats-tests/${test.id}`)}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--sh2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--sh)'; }}
              >
                <div style={{ height: 3, background: test.is_active ? 'var(--blue)' : 'var(--border2)' }} />
                <div className="cp">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{test.title}</div>
                    <Chip variant={test.is_active ? 'green' : 'gray'}>{test.is_active ? 'Active' : 'Inactive'}</Chip>
                  </div>
                  {test.description && <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 12, lineHeight: 1.5 }}>{test.description}</div>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {[
                      { label: '⏱ Duration', value: `${test.duration_minutes}m` },
                      { label: '📊 Marks',   value: String(test.total_marks) },
                      { label: '❓ Questions', value: String(test.questions?.length ?? 0) },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--blue)' }}>{s.value}</div>
                        <div style={{ fontSize: 9, color: 'var(--ink4)', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {test.pass_marks != null && (
                    <div style={{ fontSize: 11, color: 'var(--green)', background: 'var(--green-lt)', border: '1px solid var(--green-bd)', borderRadius: 'var(--r)', padding: '4px 10px', marginBottom: 10 }}>
                      Pass mark: {test.pass_marks} / {test.total_marks} ({((test.pass_marks / test.total_marks) * 100).toFixed(0)}%)
                    </div>
                  )}

                  <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <Chip variant="blue" onClick={() => router.push(`/ats-tests/${test.id}`)}>Manage →</Chip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Aptitude Test"
        subtitle="Set up a new MCQ test paper. Add questions after creation."
        width={480}
        footer={
          <>
            <button className="btn btn-sec" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn btn-pri" onClick={() => createMutation.mutate(form)} disabled={!form.title || createMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {createMutation.isPending && <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />}
              {createMutation.isPending ? 'Creating…' : '✓ Create Test'}
            </button>
          </>
        }
      >
        <div className="fg"><label>Test Title *</label><input placeholder="e.g. Technical Aptitude Round 1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus /></div>
        <div className="fg"><label>Description</label><textarea rows={2} placeholder="Brief description of what this test covers…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="fg"><label>Duration (min) *</label><input type="number" min="1" max="180" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} /></div>
          <div className="fg"><label>Total Marks *</label><input type="number" min="0" value={form.total_marks} onChange={e => setForm(f => ({ ...f, total_marks: Number(e.target.value) }))} /></div>
          <div className="fg"><label>Pass Mark</label><input type="number" min="0" placeholder="Optional" value={form.pass_marks} onChange={e => setForm(f => ({ ...f, pass_marks: e.target.value }))} /></div>
        </div>
        <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 11, color: 'var(--blue)' }}>
          ℹ After creating the test, you'll be taken to the question editor to add MCQ questions.
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </Modal>
    </AppShell>
  );
}
