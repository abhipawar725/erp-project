'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch }      from '../../../../store';
import { setPageTitle }        from '../../../../store/slices/uiSlice';
import { AppShell }            from '../../../../layouts/AppLayout';
import { Chip }                from '../../../../components/ui/Chip';
import { Modal }               from '../../../../components/ui/Modal';
import { usePermission }       from '../../../../features/auth/hooks/usePermission';
import apiClient               from '../../../../services/api/client';
import type { ApiResponse }    from '../../../../types/api.types';
import { showToast }           from '../../../../utils/toast';

interface Question {
  id:             number;
  question_text:  string;
  option_a:       string;
  option_b:       string;
  option_c:       string;
  option_d:       string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  marks:          number;
  negative_marks: number;
  order_index:    number;
  is_active:      boolean;
}

interface AptitudeTest {
  id:               number;
  title:            string;
  description?:     string | null;
  duration_minutes: number;
  total_marks:      number;
  pass_marks?:      number | null;
  is_active:        boolean;
  questions:        Question[];
}

type CorrectOption = 'A' | 'B' | 'C' | 'D';

const BLANK_Q: {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: CorrectOption;
  marks: number;
  negative_marks: number;
  order_index: number;
} = {
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
  marks: 1,
  negative_marks: 0,
  order_index: 0
};
export default function AptitudeTestDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const dispatch = useAppDispatch();
  const qc      = useQueryClient();
  const testId  = parseInt(params.id as string, 10);
  const { canManageEmployees } = usePermission();

  const [addQOpen,  setAddQOpen]  = useState(false);
  const [editQ,     setEditQ]     = useState<Question | null>(null);
  const [deleteQ,   setDeleteQ]   = useState<Question | null>(null);
  const [qForm,     setQForm]     = useState(BLANK_Q);
  const [resultCandidateId, setResultCandidateId] = useState<number | null>(null);
  const [resultCandidateName, setResultCandidateName] = useState('');

  const { data: test, isLoading } = useQuery({
    queryKey: ['aptitude-test', testId],
    queryFn:  () => apiClient.get<unknown, ApiResponse<AptitudeTest>>(`/aptitude/${testId}`).then(r => r.data),
  });

  const { data: resultData, isFetching: resultLoading } = useQuery({
    queryKey: ['aptitude-result', testId, resultCandidateId],
    queryFn:  () => apiClient.get<unknown, ApiResponse<any>>(`/aptitude/${testId}/candidates/${resultCandidateId}/result`).then(r => r.data),
    enabled:  !!resultCandidateId,
  });

  useEffect(() => {
    if (test) dispatch(setPageTitle({ title: test.title, breadcrumb: 'Aptitude Tests' }));
  }, [test, dispatch]);

  const addQMutation = useMutation({
    mutationFn: (data: typeof BLANK_Q) =>
      apiClient.post<unknown, ApiResponse<Question>>(`/aptitude/${testId}/questions`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['aptitude-test', testId] }); showToast('✓ Question added'); setAddQOpen(false); setQForm(BLANK_Q); },
    onError: (err: any) => showToast(err?.message || 'Failed'),
  });

  const updateQMutation = useMutation({
    mutationFn: ({ qid, data }: { qid: number; data: Partial<Question> }) =>
      apiClient.put<unknown, ApiResponse<Question>>(`/aptitude/${testId}/questions/${qid}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['aptitude-test', testId] }); showToast('✓ Question updated'); setEditQ(null); },
    onError: (err: any) => showToast(err?.message || 'Failed'),
  });

  const deleteQMutation = useMutation({
    mutationFn: (qid: number) => apiClient.delete(`/aptitude/${testId}/questions/${qid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['aptitude-test', testId] }); showToast('Question deleted'); setDeleteQ(null); },
  });

  const openEdit = (q: Question) => {
    setQForm({ question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_option: q.correct_option, marks: q.marks, negative_marks: q.negative_marks, order_index: q.order_index });
    setEditQ(q);
  };

  const QuestionFormFields = () => (
    <>
      <div className="fg"><label>Question *</label><textarea rows={3} style={{ resize: 'vertical' }} value={qForm.question_text} onChange={e => setQForm(f => ({ ...f, question_text: e.target.value }))} placeholder="Enter the question text…" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        {(['A','B','C','D'] as const).map(opt => (
          <div key={opt} className="fg" style={{ background: qForm.correct_option === opt ? 'var(--green-lt)' : undefined, borderRadius: 'var(--r)', padding: qForm.correct_option === opt ? '0 6px' : undefined, border: qForm.correct_option === opt ? '1px solid var(--green-bd)' : undefined }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="radio" name="correct" checked={qForm.correct_option === opt} onChange={() => setQForm(f => ({ ...f, correct_option: opt }))} style={{ accentColor: 'var(--green)', cursor: 'pointer' }} />
              <span style={{ color: qForm.correct_option === opt ? 'var(--green)' : undefined, fontWeight: qForm.correct_option === opt ? 700 : undefined }}>Option {opt} {qForm.correct_option === opt ? '✓ Correct' : ''}</span>
            </label>
            <input placeholder={`Option ${opt} text…`} value={qForm[`option_${opt.toLowerCase()}` as keyof typeof qForm] as string} onChange={e => setQForm(f => ({ ...f, [`option_${opt.toLowerCase()}`]: e.target.value }))} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div className="fg"><label>Marks (correct)</label><input type="number" min="0" step="0.5" value={qForm.marks} onChange={e => setQForm(f => ({ ...f, marks: Number(e.target.value) }))} /></div>
        <div className="fg"><label>Negative marks</label><input type="number" min="0" step="0.25" value={qForm.negative_marks} onChange={e => setQForm(f => ({ ...f, negative_marks: Number(e.target.value) }))} /><span style={{ fontSize: 10, color: 'var(--ink4)' }}>0 = no penalty</span></div>
        <div className="fg"><label>Order</label><input type="number" min="0" value={qForm.order_index} onChange={e => setQForm(f => ({ ...f, order_index: Number(e.target.value) }))} /></div>
      </div>
    </>
  );

  if (isLoading || !test) return <AppShell><div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink4)', fontSize: 13 }}>Loading…</div></AppShell>;

  const sortedQ = [...(test.questions || [])].sort((a, b) => a.order_index - b.order_index);

  return (
    <AppShell>
      <div className="pg-enter">

        {/* Header */}
        <div className="ph">
          <div>
            <h1>{test.title}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
              <Chip variant={test.is_active ? 'green' : 'gray'}>{test.is_active ? 'Active' : 'Inactive'}</Chip>
              <span style={{ fontSize: 12, color: 'var(--ink4)' }}>⏱ {test.duration_minutes} min · 📊 {test.total_marks} marks · ❓ {sortedQ.length} questions</span>
              {test.pass_marks != null && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>Pass: {test.pass_marks}</span>}
            </div>
          </div>
          <div className="ph-r">
            <button className="btn btn-sec btn-sm" onClick={() => router.push('/ats-tests')}>← Back</button>
            {canManageEmployees && <button className="btn btn-pri btn-sm" onClick={() => { setQForm(BLANK_Q); setAddQOpen(true); }}>+ Add Question</button>}
          </div>
        </div>

        <div className="g2">
          {/* LEFT — question list */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
              Questions
              <span style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 400, marginLeft: 6 }}>{sortedQ.length} total</span>
            </div>

            {sortedQ.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: 'var(--surface2)', borderRadius: 'var(--r2)', color: 'var(--ink4)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>❓</div>
                No questions yet. Add questions to build the test.
                {canManageEmployees && <div style={{ marginTop: 12 }}><button className="btn btn-pri btn-sm" onClick={() => { setQForm(BLANK_Q); setAddQOpen(true); }}>+ Add First Question</button></div>}
              </div>
            ) : sortedQ.map((q, idx) => (
              <div key={q.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '14px 16px', opacity: q.is_active ? 1 : 0.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--blue)', flexShrink: 0, marginTop: 1 }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.5 }}>{q.question_text}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <span style={{ background: 'var(--green-lt)', color: 'var(--green)', border: '1px solid var(--green-bd)', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 700 }}>+{q.marks}</span>
                    {q.negative_marks > 0 && <span style={{ background: 'var(--red-lt)', color: 'var(--red)', border: '1px solid var(--red-bd)', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 700 }}>-{q.negative_marks}</span>}
                  </div>
                </div>

                {/* Options grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  {(['A','B','C','D'] as const).map(opt => {
                    const text = q[`option_${opt.toLowerCase()}` as keyof Question] as string;
                    const isCorrect = q.correct_option === opt;
                    return (
                      <div key={opt} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', background: isCorrect ? 'var(--green-lt)' : 'var(--surface2)', border: `1px solid ${isCorrect ? 'var(--green-bd)' : 'var(--border)'}`, borderRadius: 6, padding: '6px 8px', fontSize: 11 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: isCorrect ? 'var(--green)' : 'var(--border2)', color: isCorrect ? '#fff' : 'var(--ink4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{opt}</span>
                        <span style={{ color: isCorrect ? 'var(--green)' : 'var(--ink)', fontWeight: isCorrect ? 600 : 400 }}>{text}</span>
                      </div>
                    );
                  })}
                </div>

                {canManageEmployees && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Chip variant="gray" onClick={() => openEdit(q)}>Edit</Chip>
                    <Chip variant="red"  onClick={() => setDeleteQ(q)}>Delete</Chip>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* RIGHT — test summary + result viewer */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Test summary */}
            <div className="card cp">
              <div className="ct">Test Summary</div>
              {[
                { label: 'Duration',   value: `${test.duration_minutes} minutes` },
                { label: 'Total Marks', value: String(test.total_marks) },
                { label: 'Pass Mark',  value: test.pass_marks != null ? String(test.pass_marks) : 'Not set' },
                { label: 'Questions',  value: `${sortedQ.length} active` },
                { label: 'Marks/Q avg', value: sortedQ.length > 0 ? `${(sortedQ.reduce((s,q) => s + Number(q.marks), 0) / sortedQ.length).toFixed(1)}` : '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ color: 'var(--ink4)' }}>{row.label}</span>
                  <span style={{ fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Candidate result lookup */}
            <div className="card cp">
              <div className="ct">View Candidate Result</div>
              <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 10 }}>Enter candidate ID to view their test score (hidden from candidates)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number" min="1" placeholder="Candidate ID"
                  value={resultCandidateId || ''}
                  onChange={e => setResultCandidateId(e.target.value ? Number(e.target.value) : null)}
                  style={{ flex: 1 }}
                />
              </div>

              {resultLoading && <div style={{ textAlign: 'center', padding: 12, fontSize: 12, color: 'var(--ink4)' }}>Loading result…</div>}

              {resultData && !resultLoading && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>{resultData.candidate?.candidate_name}</div>

                  {/* Score big display */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--blue)' }}>{resultData.score}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink4)' }}>Score / {resultData.total_marks}</div>
                    </div>
                    <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{resultData.percentage}%</div>
                      <div style={{ fontSize: 10, color: 'var(--ink4)' }}>Percentage</div>
                    </div>
                  </div>

                  {/* Pass/fail */}
                  {resultData.has_passed !== null && (
                    <div style={{ background: resultData.has_passed ? 'var(--green-lt)' : 'var(--red-lt)', border: `1px solid ${resultData.has_passed ? 'var(--green-bd)' : 'var(--red-bd)'}`, borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 12, color: resultData.has_passed ? 'var(--green)' : 'var(--red)', fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>
                      {resultData.has_passed ? '✓ PASSED' : '✗ FAILED'}
                    </div>
                  )}

                  {resultData.time_taken_secs != null && (
                    <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 10 }}>
                      Time: {Math.floor(resultData.time_taken_secs / 60)}m {resultData.time_taken_secs % 60}s
                    </div>
                  )}

                  {/* Per-question breakdown */}
                  <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
                    {(resultData.answers || []).map((a: any, idx: number) => (
                      <div key={a.question_id} style={{ display: 'flex', gap: 8, padding: '7px 10px', borderBottom: '1px solid var(--border)', fontSize: 11, alignItems: 'flex-start' }}>
                        <span style={{ flexShrink: 0, width: 20, fontFamily: 'var(--mono)', color: 'var(--ink4)' }}>Q{idx+1}</span>
                        <span style={{ flex: 1, color: 'var(--ink)', lineHeight: 1.4 }}>{a.question_text?.slice(0,60)}{(a.question_text?.length || 0) > 60 ? '…' : ''}</span>
                        <span style={{ flexShrink: 0, fontFamily: 'var(--mono)', fontWeight: 700, color: a.is_correct ? 'var(--green)' : a.selected ? 'var(--red)' : 'var(--ink4)' }}>
                          {a.selected || '—'} {a.is_correct ? '✓' : a.selected ? `✗(${a.correct_option})` : 'skip'}
                        </span>
                        <span style={{ flexShrink: 0, fontFamily: 'var(--mono)', color: Number(a.marks_earned) >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 10, fontWeight: 700 }}>
                          {Number(a.marks_earned) >= 0 ? '+' : ''}{a.marks_earned}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Question Modal */}
      <Modal open={addQOpen} onClose={() => setAddQOpen(false)} title="Add Question" subtitle="Add a new MCQ question to this test" width={580}
        footer={<>
          <button className="btn btn-sec" onClick={() => setAddQOpen(false)}>Cancel</button>
          <button className="btn btn-pri" onClick={() => addQMutation.mutate(qForm)} disabled={!qForm.question_text || !qForm.option_a || addQMutation.isPending}>
            {addQMutation.isPending ? 'Adding…' : '✓ Add Question'}
          </button>
        </>}
      >
        <QuestionFormFields />
      </Modal>

      {/* Edit Question Modal */}
      <Modal open={!!editQ} onClose={() => setEditQ(null)} title="Edit Question" width={580}
        footer={<>
          <button className="btn btn-sec" onClick={() => setEditQ(null)}>Cancel</button>
          <button className="btn btn-pri" onClick={() => updateQMutation.mutate({ qid: editQ!.id, data: qForm as any })} disabled={updateQMutation.isPending}>
            {updateQMutation.isPending ? 'Saving…' : '✓ Save Changes'}
          </button>
        </>}
      >
        <QuestionFormFields />
      </Modal>

      {/* Delete Question Modal */}
      <Modal open={!!deleteQ} onClose={() => setDeleteQ(null)} title="Delete Question" subtitle={`Remove Q: "${deleteQ?.question_text.slice(0,60)}…"?`}
        footer={<><button className="btn btn-sec" onClick={() => setDeleteQ(null)}>Cancel</button><button className="btn btn-danger" onClick={() => deleteQMutation.mutate(deleteQ!.id)} disabled={deleteQMutation.isPending}>{deleteQMutation.isPending ? 'Deleting…' : 'Delete'}</button></>}>
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)' }}>⚠ This question and all candidate answers for it cannot be recovered.</div>
      </Modal>
    </AppShell>
  );
}
