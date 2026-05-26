'use client';
import { useState }  from 'react';
import { Chip }      from '../../../components/ui/Chip';
import { useCandidateTestResult } from '../hooks/useAtsTests';
import { type CorrectOption }     from '../types/ats-test.types';
import { formatDate }             from '../../../utils/formatters';

interface Props {
  testId:         number;
  totalMarks:     number;
  passMark?:      number | null;
}

export function TestResultPanel({ testId, totalMarks, passMark }: Props) {
  const [candidateId, setCandidateId] = useState<number | null>(null);
  const [inputVal,    setInputVal]    = useState('');

  const { data: result, isLoading, isError } = useCandidateTestResult(testId, candidateId);

  const handleLookup = () => {
    const n = parseInt(inputVal, 10);
    if (!isNaN(n) && n > 0) setCandidateId(n);
  };

  const barWidth = (n: number, total: number) =>
    total > 0 ? Math.round(Math.min(100, (n / total) * 100)) : 0;

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 10 }}>
        Enter a candidate ID to view their score. This data is never shown to the candidate.
      </div>

      {/* Lookup input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="number"
          min="1"
          placeholder="Candidate ID"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLookup()}
          style={{ flex: 1 }}
        />
        <button className="btn btn-sec btn-sm" onClick={handleLookup} disabled={!inputVal}>
          Look up
        </button>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--ink4)' }}>
          Loading result…
        </div>
      )}

      {isError && candidateId && (
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)' }}>
          No test result found for candidate #{candidateId}.
        </div>
      )}

      {result && (
        <div>
          {/* Candidate name */}
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 12 }}>
            {result.candidate.candidate_name}
            <span style={{ fontSize: 11, color: 'var(--ink4)', marginLeft: 8, fontWeight: 400 }}>
              #{result.candidate.id}
            </span>
          </div>

          {/* Score summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 500, fontFamily: 'var(--mono)', color: 'var(--blue)' }}>
                {result.score}
              </div>
              <div style={{ fontSize: 10, color: 'var(--blue)', marginTop: 2 }}>
                score / {result.total_marks}
              </div>
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 500, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>
                {result.percentage.toFixed(1)}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>percentage</div>
            </div>
          </div>

          {/* Score bar */}
          <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${barWidth(result.score, result.total_marks)}%`, background: 'var(--blue)', borderRadius: 99, transition: 'width .4s' }} />
          </div>
          {passMark != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink4)', marginBottom: 12 }}>
              <span>Pass mark: {passMark}</span>
              <span style={{ color: barWidth(result.score, result.total_marks) >= barWidth(passMark, result.total_marks) ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                {barWidth(result.score, result.total_marks) >= barWidth(passMark, result.total_marks) ? '✓ Passed' : '✗ Failed'}
              </span>
            </div>
          )}

          {/* Meta row */}
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--ink4)', marginBottom: 14, flexWrap: 'wrap' }}>
            {result.candidate.aptitude_attempted_at && (
              <span>Attempted: {formatDate(result.candidate.aptitude_attempted_at)}</span>
            )}
            {result.time_taken_secs != null && (
              <span>Time: {Math.floor(result.time_taken_secs / 60)}m {result.time_taken_secs % 60}s</span>
            )}
            <span>Answered: {result.answers.filter(a => a.selected).length}/{result.answers.length}</span>
          </div>

          {/* Per-question breakdown */}
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>Per-question breakdown</div>
          <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
            {result.answers.map((a, idx) => (
              <div
                key={a.question_id}
                style={{
                  display: 'flex', gap: 8, padding: '7px 10px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 11,
                  alignItems: 'flex-start',
                  background: a.is_correct
                    ? 'var(--green-lt)'
                    : a.selected
                    ? 'var(--red-lt)'
                    : undefined,
                }}
              >
                {/* Index */}
                <span style={{ flexShrink: 0, width: 22, fontFamily: 'var(--mono)', color: 'var(--ink4)' }}>
                  Q{idx + 1}
                </span>

                {/* Question (truncated) */}
                <span style={{ flex: 1, color: 'var(--ink)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.question_text}
                </span>

                {/* Selected → correct */}
                <span style={{ flexShrink: 0, fontFamily: 'var(--mono)', fontWeight: 500, whiteSpace: 'nowrap',
                  color: a.is_correct ? 'var(--green)' : a.selected ? 'var(--red)' : 'var(--ink4)' }}>
                  {a.selected
                    ? a.is_correct
                      ? `${a.selected} ✓`
                      : `${a.selected} ✗ (${a.correct_option})`
                    : `— skip`}
                </span>

                {/* Marks earned */}
                <span style={{ flexShrink: 0, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500,
                  color: Number(a.marks_earned) > 0 ? 'var(--green)' : Number(a.marks_earned) < 0 ? 'var(--red)' : 'var(--ink4)' }}>
                  {Number(a.marks_earned) >= 0 ? '+' : ''}{a.marks_earned}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
