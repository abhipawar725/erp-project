'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch }       from '../../../../store';
import { setPageTitle }         from '../../../../store/slices/uiSlice';
import { AppShell }             from '../../../../layouts/AppLayout';
import { Chip }                 from '../../../../components/ui/Chip';
import { usePermission }        from '../../../../features/auth/hooks/usePermission';
import {
  useAptitudeTest,
  TestFormModal, QuestionFormModal, QuestionCard, TestResultPanel,
  type AptitudeTest, type AptitudeQuestion, BLANK_QUESTION_FORM,
} from '../../../../features/ats-tests';

export default function AptitudeTestDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const dispatch = useAppDispatch();
  const testId  = parseInt(params.id as string, 10);
  const { canManageEmployees } = usePermission();

  const [editTestOpen, setEditTestOpen]   = useState(false);
  const [addQOpen,     setAddQOpen]       = useState(false);
  const [editQ,        setEditQ]          = useState<AptitudeQuestion | null>(null);

  const { data: test, isLoading } = useAptitudeTest(testId);

  useEffect(() => {
    if (test) dispatch(setPageTitle({ title: test.title, breadcrumb: 'Aptitude Tests' }));
  }, [test, dispatch]);

  if (isLoading || !test) {
    return (
      <AppShell>
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink4)', fontSize: 13 }}>
          Loading test…
        </div>
      </AppShell>
    );
  }

  const sortedQ    = [...(test.questions || [])].sort((a, b) => a.order_index - b.order_index);
  const nextOrder  = sortedQ.length > 0 ? Math.max(...sortedQ.map(q => q.order_index)) + 1 : 0;

  return (
    <AppShell>
      <div className="pg-enter">

        {/* Header */}
        <div className="ph">
          <div>
            <h1>{test.title}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
              <Chip variant={test.is_active ? 'green' : 'gray'}>{test.is_active ? 'Active' : 'Inactive'}</Chip>
              <span style={{ fontSize: 12, color: 'var(--ink4)' }}>
                ⏱ {test.duration_minutes} min · 📊 {test.total_marks} marks · ❓ {sortedQ.length} questions
              </span>
              {test.pass_marks != null && (
                <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                  Pass mark: {test.pass_marks}
                </span>
              )}
            </div>
            {test.description && (
              <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 6, maxWidth: 600, lineHeight: 1.5 }}>
                {test.description}
              </div>
            )}
          </div>
          <div className="ph-r">
            <button className="btn btn-sec btn-sm" onClick={() => router.push('/ats-tests')}>← Back</button>
            {canManageEmployees && (
              <>
                <button className="btn btn-sec btn-sm" onClick={() => setEditTestOpen(true)}>Edit settings</button>
                <button className="btn btn-pri btn-sm" onClick={() => setAddQOpen(true)}>+ Add Question</button>
              </>
            )}
          </div>
        </div>

        <div className="g2">
          {/* LEFT — question list */}
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                Questions
                <span style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 400, marginLeft: 6 }}>
                  {sortedQ.length} total
                </span>
              </span>
              {canManageEmployees && (
                <button className="btn btn-sec btn-sm" onClick={() => setAddQOpen(true)}>+ Add</button>
              )}
            </div>

            {sortedQ.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: 'var(--surface2)', borderRadius: 'var(--r2)', color: 'var(--ink4)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>❓</div>
                No questions yet.
                {canManageEmployees && (
                  <div style={{ marginTop: 12 }}>
                    <button className="btn btn-pri btn-sm" onClick={() => setAddQOpen(true)}>
                      + Add First Question
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sortedQ.map((q, idx) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={idx}
                    testId={testId}
                    onEdit={q => setEditQ(q)}
                    canManage={canManageEmployees}
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — test summary + result viewer */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

            {/* Test summary */}
            <div className="card cp">
              <div className="ct">Test details</div>
              {[
                { label: 'Duration',     value: `${test.duration_minutes} minutes` },
                { label: 'Total marks',  value: String(test.total_marks) },
                { label: 'Pass mark',    value: test.pass_marks != null ? `${test.pass_marks} (${Math.round((test.pass_marks / test.total_marks) * 100)}%)` : 'Not set' },
                { label: 'Questions',    value: `${sortedQ.filter(q => q.is_active).length} active` },
                { label: 'Avg marks/Q', value: sortedQ.length > 0
                    ? (sortedQ.reduce((s, q) => s + Number(q.marks), 0) / sortedQ.length).toFixed(1)
                    : '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--ink4)' }}>{row.label}</span>
                  <span style={{ fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Candidate result lookup */}
            <div className="card cp">
              <div className="ct">Candidate result</div>
              <TestResultPanel
                testId={testId}
                totalMarks={test.total_marks}
                passMark={test.pass_marks}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit test modal */}
      <TestFormModal
        open={editTestOpen}
        onClose={() => setEditTestOpen(false)}
        test={test}
      />

      {/* Add question modal */}
      <QuestionFormModal
        open={addQOpen}
        onClose={() => setAddQOpen(false)}
        testId={testId}
        nextOrder={nextOrder}
      />

      {/* Edit question modal */}
      <QuestionFormModal
        open={!!editQ}
        onClose={() => setEditQ(null)}
        testId={testId}
        question={editQ}
      />
    </AppShell>
  );
}
