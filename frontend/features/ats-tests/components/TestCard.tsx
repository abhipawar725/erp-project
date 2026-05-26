'use client';
import { useRouter }  from 'next/navigation';
import { Chip }       from '../../../components/ui/Chip';
import { type AptitudeTest } from '../types/ats-test.types';

interface Props {
  test:       AptitudeTest;
  onEdit:     (t: AptitudeTest) => void;
  canManage:  boolean;
}

export function TestCard({ test, onEdit, canManage }: Props) {
  const router       = useRouter();
  const questionCount = test.questions?.length ?? 0;

  return (
    <div
      className="card"
      style={{ overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .12s' }}
      onClick={() => router.push(`/ats-tests/${test.id}`)}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--sh2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--sh)';  }}
    >
      {/* Status stripe */}
      <div style={{ height: 3, background: test.is_active ? 'var(--blue)' : 'var(--border2)' }} />

      <div className="cp">
        {/* Title + status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', flex: 1, marginRight: 8 }}>
            {test.title}
          </div>
          <Chip variant={test.is_active ? 'green' : 'gray'}>
            {test.is_active ? 'Active' : 'Inactive'}
          </Chip>
        </div>

        {/* Description */}
        {test.description && (
          <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 12, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {test.description}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: '⏱ Duration',   value: `${test.duration_minutes}m` },
            { label: '📊 Total',     value: String(test.total_marks)     },
            { label: '❓ Questions', value: String(questionCount)        },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 500, fontFamily: 'var(--mono)', color: 'var(--blue)' }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'var(--ink4)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pass mark */}
        {test.pass_marks != null && (
          <div style={{ fontSize: 11, color: 'var(--green)', background: 'var(--green-lt)', border: '1px solid var(--green-bd)', borderRadius: 'var(--r)', padding: '4px 10px', marginBottom: 12 }}>
            Pass mark: {test.pass_marks} / {test.total_marks}
            {test.total_marks > 0 && ` (${Math.round((test.pass_marks / test.total_marks) * 100)}%)`}
          </div>
        )}

        {/* Actions */}
        {canManage && (
          <div
            style={{ paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}
            onClick={e => e.stopPropagation()}
          >
            <Chip variant="blue" onClick={() => router.push(`/ats-tests/${test.id}`)}>
              Manage questions →
            </Chip>
            <Chip variant="gray" onClick={() => onEdit(test)}>Edit settings</Chip>
          </div>
        )}
      </div>
    </div>
  );
}
