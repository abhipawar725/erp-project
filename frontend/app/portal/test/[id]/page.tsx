'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../../../../services/api/client';
import type { ApiResponse } from '../../../../types/api.types';

interface Question {
  id: number; question_text: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  marks: number; order_index: number;
}

interface Test {
  id: number; title: string; description?: string;
  duration_minutes: number; total_marks: number;
  questions: Question[];
}

export default function AptitudeTestPage() {
  const params    = useParams();
  const router    = useRouter();
  const testId    = params.id as string;
  const token     = typeof window !== 'undefined' ? localStorage.getItem('portal_token') : '';

  const [started,   setStarted]   = useState(false);
  const [answers,   setAnswers]   = useState<Record<number, 'A'|'B'|'C'|'D'>>({});
  const [current,   setCurrent]   = useState(0);
  const [timeLeft,  setTimeLeft]  = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: testData, isLoading } = useQuery({
    queryKey: ['portal-test', testId],
    queryFn:  () => apiClient.get<unknown, ApiResponse<Test>>(`/aptitude/portal/${testId}`, { headers: { Authorization: `Bearer ${token}` } }),
    enabled:  !!token,
    select:   (res) => res.data,
  });

  const test = testData;
  const questions = test?.questions?.sort((a, b) => a.order_index - b.order_index) || [];

  useEffect(() => {
    if (started && test && !submitted) {
      setTimeLeft(test.duration_minutes * 60);
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(intervalRef.current!); handleSubmit(true); return 0; }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(intervalRef.current!);
    }
  }, [started, test]);

  const submitMutation = useMutation({
    mutationFn: (payload: { answers: any[]; time_taken: number }) =>
      apiClient.post<unknown, ApiResponse<any>>(`/aptitude/portal/${testId}/submit`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = (autoSubmit = false) => {
    const timeTaken = (test?.duration_minutes || 0) * 60 - timeLeft;
    const answerArray = questions.map(q => ({ question_id: q.id, selected: answers[q.id] || null }));
    submitMutation.mutate({ answers: answerArray, time_taken: timeTaken });
  };

  const formatTime = (secs: number) => `${Math.floor(secs/60).toString().padStart(2,'0')}:${(secs%60).toString().padStart(2,'0')}`;

  if (isLoading) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink4)' }}>Loading test…</div>;

  if (!test) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)' }}>Test not found.</div>;

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', padding: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '40px 48px', textAlign: 'center', maxWidth: 480, boxShadow: 'var(--sh3)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Test Submitted!</div>
          <div style={{ fontSize: 13, color: 'var(--ink4)', lineHeight: 1.7, marginBottom: 24 }}>
            You answered {Object.keys(answers).length} out of {questions.length} questions.<br/>
            Results will be reviewed by HR and you will be notified.<br/>
            <strong>Scores are not visible to candidates.</strong>
          </div>
          <button className="btn btn-pri" onClick={() => router.push('/portal/dashboard')}>← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', padding: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '36px 40px', maxWidth: 480, boxShadow: 'var(--sh3)' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🧠</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>{test.title}</div>
          {test.description && <div style={{ fontSize: 13, color: 'var(--ink4)', marginBottom: 20, lineHeight: 1.6 }}>{test.description}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {[['Questions', questions.length],['Duration',`${test.duration_minutes} min`],['Total Marks', test.total_marks],['Results', 'HR will share']].map(([l,v]) => (
              <div key={l as string} style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--amber)', marginBottom: 20 }}>
            ⚠ Once started, the timer cannot be paused. Ensure you have a stable connection.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sec" onClick={() => router.push('/portal/dashboard')}>← Back</button>
            <button className="btn btn-pri" style={{ flex: 1 }} onClick={() => setStarted(true)}>Start Test →</button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const answeredCount = Object.keys(answers).length;
  const isLast = current === questions.length - 1;
  const timeWarning = timeLeft < 300; // less than 5 min

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
      {/* Header bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{test.title}</div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--ink4)' }}>{answeredCount}/{questions.length} answered</span>
          <div style={{ background: timeWarning ? 'var(--red-lt)' : 'var(--blue-lt)', border: `1px solid ${timeWarning ? 'var(--red-bd)' : 'var(--blue-md)'}`, borderRadius: 'var(--r)', padding: '4px 12px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--mono)', color: timeWarning ? 'var(--red)' : 'var(--blue)' }}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        {/* Question navigation */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {questions.map((qu, idx) => (
            <button key={qu.id} onClick={() => setCurrent(idx)} style={{ width: 34, height: 34, border: `1px solid ${current === idx ? 'var(--blue)' : answers[qu.id] ? 'var(--green)' : 'var(--border2)'}`, borderRadius: 6, background: current === idx ? 'var(--blue)' : answers[qu.id] ? 'var(--green-lt)' : 'var(--surface2)', color: current === idx ? '#fff' : answers[qu.id] ? 'var(--green)' : 'var(--ink4)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Question card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '24px 28px', marginBottom: 16, boxShadow: 'var(--sh)' }}>
          <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 8, fontWeight: 600 }}>Question {current + 1} of {questions.length} · {q.marks} mark{q.marks !== 1 ? 's' : ''}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 20 }}>{q.question_text}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(['A','B','C','D'] as const).map((opt) => {
              const text = q[`option_${opt.toLowerCase()}` as keyof Question] as string;
              const isSelected = answers[q.id] === opt;
              return (
                <label key={opt} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: isSelected ? 'var(--blue-lt)' : 'var(--surface2)', border: `1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`, borderRadius: 'var(--r)', cursor: 'pointer', transition: 'all .1s' }}>
                  <input type="radio" name={`q-${q.id}`} checked={isSelected} onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))} style={{ display: 'none' }} />
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: isSelected ? 'var(--blue)' : 'var(--surface)', border: `2px solid ${isSelected ? 'var(--blue)' : 'var(--border2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: isSelected ? '#fff' : 'var(--ink4)', flexShrink: 0 }}>
                    {opt}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{text}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <button className="btn btn-sec" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>← Prev</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isLast && <button className="btn btn-pri" onClick={() => setCurrent(c => c + 1)}>Next →</button>}
            {isLast && (
              <button
                className="btn btn-pri"
                style={{ background: 'var(--green)' }}
                onClick={() => handleSubmit()}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? 'Submitting…' : '✓ Submit Test'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
