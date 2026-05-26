'use client';
import { Chip } from '../../../components/ui/Chip';
import { useDeleteQuestion } from '../hooks/useAtsTests';
import { type AptitudeQuestion, OPTIONS } from '../types/ats-test.types';

interface Props {
  question:  AptitudeQuestion;
  index:     number;
  testId:    number;
  onEdit:    (q: AptitudeQuestion) => void;
  canManage: boolean;
}

export function QuestionCard({ question: q, index, testId, onEdit, canManage }: Props) {
  const deleteMutation = useDeleteQuestion(testId);

  return (
    <div style={{
      background: 'var(--surface)',
      border:     '1px solid var(--border)',
      borderRadius: 'var(--r2)',
      padding:    '14px 16px',
      opacity:    q.is_active ? 1 : 0.55,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
          {/* Question number badge */}
          <span style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0, marginTop: 1,
            background: 'var(--blue-lt)', border: '1px solid var(--blue-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 500, color: 'var(--blue)',
          }}>
            {index + 1}
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.5 }}>
            {q.question_text}
          </span>
        </div>

        {/* Scoring badges */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <span style={{
            background: 'var(--green-lt)', color: 'var(--green)',
            border: '1px solid var(--green-bd)',
            borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 500,
          }}>
            +{q.marks}
          </span>
          {q.negative_marks > 0 && (
            <span style={{
              background: 'var(--red-lt)', color: 'var(--red)',
              border: '1px solid var(--red-bd)',
              borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 500,
            }}>
              −{q.negative_marks}
            </span>
          )}
        </div>
      </div>

      {/* Options grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
        {OPTIONS.map(opt => {
          const text      = q[`option_${opt.toLowerCase()}` as keyof AptitudeQuestion] as string;
          const isCorrect = q.correct_option === opt;
          return (
            <div
              key={opt}
              style={{
                display:      'flex',
                alignItems:   'flex-start',
                gap:          8,
                padding:      '7px 10px',
                background:   isCorrect ? 'var(--green-lt)' : 'var(--surface2)',
                border:       `1px solid ${isCorrect ? 'var(--green-bd)' : 'var(--border)'}`,
                borderRadius: 6,
                fontSize:     12,
              }}
            >
              {/* Option circle */}
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: isCorrect ? 'var(--green)' : 'var(--border2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 500,
                color: isCorrect ? '#fff' : 'var(--ink4)',
              }}>
                {opt}
              </span>
              <span style={{ color: isCorrect ? 'var(--green)' : 'var(--ink)', fontWeight: isCorrect ? 500 : 400, lineHeight: 1.4 }}>
                {text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--ink4)' }}>
          Order: {q.order_index} · {q.is_active ? 'Active' : 'Inactive'}
        </span>

        {canManage && (
          <div style={{ display: 'flex', gap: 5 }}>
            <Chip variant="gray" onClick={() => onEdit(q)}>Edit</Chip>
            <Chip variant="red" onClick={() => {
              if (window.confirm(`Delete this question?`)) {
                deleteMutation.mutate(q.id);
              }
            }}>
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Chip>
          </div>
        )}
      </div>
    </div>
  );
}
