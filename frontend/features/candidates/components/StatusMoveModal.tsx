'use client';
import { useState } from 'react';
import { Modal }    from '../../../components/ui/Modal';
import { useMoveStatus } from '../hooks/useCandidates';
import { ALL_STATUSES, STATUS_COLORS, type CandidateStatus, type Candidate } from '../types/candidate.types';

interface Props {
  open:      boolean;
  onClose:   () => void;
  candidate: Candidate | null;
}

export function StatusMoveModal({ open, onClose, candidate }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<CandidateStatus | ''>('');
  const [remarks, setRemarks] = useState('');
  const moveMutation = useMoveStatus();

  const handleMove = async () => {
    if (!candidate || !selectedStatus) return;
    await moveMutation.mutateAsync({ id: candidate.id, status: selectedStatus, remarks: remarks || undefined });
    setSelectedStatus('');
    setRemarks('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Move Stage"
      subtitle={candidate ? `Update pipeline stage for ${candidate.candidate_name}` : ''}
      width={420}
      footer={
        <>
          <button className="btn btn-sec" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-pri"
            onClick={handleMove}
            disabled={!selectedStatus || moveMutation.isPending}
          >
            {moveMutation.isPending ? 'Moving…' : '→ Move'}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Select new stage</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ALL_STATUSES.map((s) => {
            const c = STATUS_COLORS[s];
            const isCurrent  = s === candidate?.status;
            const isSelected = s === selectedStatus;
            return (
              <button
                key={s}
                type="button"
                disabled={isCurrent}
                onClick={() => setSelectedStatus(s)}
                style={{
                  padding:      '6px 12px',
                  border:       `1px solid ${isSelected ? c.text : isCurrent ? 'var(--border)' : c.border}`,
                  borderRadius: 99,
                  background:   isSelected ? c.text : isCurrent ? 'var(--surface2)' : c.bg,
                  color:        isSelected ? '#fff' : isCurrent ? 'var(--ink4)' : c.text,
                  fontSize:     11,
                  fontWeight:   600,
                  cursor:       isCurrent ? 'not-allowed' : 'pointer',
                  opacity:      isCurrent ? .5 : 1,
                  fontFamily:   'var(--font)',
                  transition:   'all .1s',
                }}
              >
                {isCurrent ? `${s} (current)` : s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fg">
        <label>Remarks (optional)</label>
        <textarea
          rows={3}
          placeholder="Add notes about this stage change…"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>
    </Modal>
  );
}
