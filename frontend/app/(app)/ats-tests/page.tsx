'use client';
import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { useAppDispatch }      from '../../../store';
import { setPageTitle }        from '../../../store/slices/uiSlice';
import { AppShell }            from '../../../layouts/AppLayout';
import { StatCard }            from '../../../components/ui/StatCard';
import { usePermission }       from '../../../features/auth/hooks/usePermission';
import {
  useAptitudeTests, useCreateAptitudeTest,
  TestFormModal, TestCard,
  type AptitudeTest,
} from '../../../features/ats-tests';

export default function AptitudeTestsPage() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  const { canManageEmployees } = usePermission();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AptitudeTest | null>(null);

  const { data: tests = [], isLoading } = useAptitudeTests();

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Aptitude Tests', breadcrumb: 'ATS' }));
  }, [dispatch]);

  const totalQuestions = tests.reduce((s, t) => s + (t.questions?.length ?? 0), 0);
  const activeTests    = tests.filter(t => t.is_active).length;
  const withPassMark   = tests.filter(t => t.pass_marks != null).length;

  return (
    <AppShell onAddNew={canManageEmployees ? () => setCreateOpen(true) : undefined}>
      <div className="pg-enter">

        <div className="ph">
          <div>
            <h1>Aptitude Tests</h1>
            <p>Create MCQ test papers · Set pass marks · View candidate results (HR only)</p>
          </div>
          <div className="ph-r">
            {canManageEmployees && (
              <button className="btn btn-pri btn-sm" onClick={() => setCreateOpen(true)}>
                + New Test
              </button>
            )}
          </div>
        </div>

        <div className="g4 mb14">
          <StatCard label="Total tests"     value={tests.length}    color="var(--blue)"   />
          <StatCard label="Active"          value={activeTests}     color="var(--green)"  />
          <StatCard label="Total questions" value={totalQuestions}  color="var(--teal)"   />
          <StatCard label="With pass mark"  value={withPassMark}    color="var(--amber)"  />
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card cp">
                <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 12, width: '40%' }} />
              </div>
            ))}
          </div>
        ) : tests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink4)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>No aptitude tests yet</div>
            <div style={{ fontSize: 12, marginBottom: 20 }}>Create your first test to start evaluating candidates</div>
            {canManageEmployees && (
              <button className="btn btn-pri btn-sm" onClick={() => setCreateOpen(true)}>
                + Create First Test
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {tests.map(test => (
              <TestCard
                key={test.id}
                test={test}
                onEdit={t => { setEditTarget(t); setCreateOpen(true); }}
                canManage={canManageEmployees}
              />
            ))}
          </div>
        )}
      </div>

      <TestFormModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditTarget(null); }}
        test={editTarget}
        onCreated={test => router.push(`/ats-tests/${test.id}`)}
      />
    </AppShell>
  );
}
