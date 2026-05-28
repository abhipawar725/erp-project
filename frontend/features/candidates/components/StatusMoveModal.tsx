'use client';
import { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { useMoveStatus } from '../hooks/useCandidates';
import {
  ALL_STATUSES, STATUS_COLORS, STATUS_LABEL, STATUS_ORDER, TERMINAL_STATUSES,
  type CandidateStatus, type Candidate,
} from '../types/candidate.types';

interface Props {
  open: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  /** Called when HR selects Interview_Result so the result form can open */
  onInterviewResult?: () => void;
}

export function StatusMoveModal({ open, onClose, candidate, onInterviewResult }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<CandidateStatus | ''>('');
  const [remarks, setRemarks] = useState('');
  const moveMutation = useMoveStatus();

  const handleMove = async () => {
    if (!candidate || !selectedStatus) return;

    await moveMutation.mutateAsync({ id: candidate.id, status: selectedStatus, remarks: remarks || undefined });
    setSelectedStatus('');
    setRemarks('');
    onClose();

    // If moved to Interview_Result, trigger the result form immediately
    if (selectedStatus === 'Interview_Result') {
      setTimeout(() => onInterviewResult?.(), 150);
    }
  };

  const currentStatus = candidate?.status;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Move Stage"
      subtitle={candidate ? `Update pipeline stage for ${candidate.candidate_name}` : ''}
      width={460}
      footer={
        <>
          <button className="btn btn-sec" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-pri"
            onClick={handleMove}
            disabled={!selectedStatus || moveMutation.isPending}
          >
            {moveMutation.isPending
              ? 'Moving…'
              : selectedStatus === 'Interview_Result'
                ? '→ Move & Record Result'
                : '→ Move'}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
          Select new stage
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {ALL_STATUSES.map(s => {
            const c = STATUS_COLORS[s];
            const currentOrder = currentStatus ? STATUS_ORDER[currentStatus] : 0;
            const statusOrder = STATUS_ORDER[s];
            const isCurrent = s === currentStatus;
            const isPreviousStage = statusOrder < currentOrder && !['Rejected', 'Withdrawn', 'On_Hold'].includes(s);
            const isTerminalCurrent =
              currentStatus &&
              TERMINAL_STATUSES.includes(currentStatus);
            const disabled =
              isTerminalCurrent
                ? s !== currentStatus
                : isCurrent || isPreviousStage;
            const isSelected = s === selectedStatus;
            const isResult = s === 'Interview_Result';

            return (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => setSelectedStatus(s)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? .45 : 1,
                  fontFamily: 'var(--font)',
                  transition: 'all .1s',
                  border: `1px solid ${isSelected ? c.text : isCurrent ? 'var(--border)' : c.border}`,
                  background: isSelected ? c.text : isCurrent ? 'var(--surface2)' : c.bg,
                  color: isSelected ? '#fff' : isCurrent ? 'var(--ink4)' : c.text,
                  // Highlight Interview_Result with a subtle glow
                  boxShadow: isResult && isSelected ? `0 0 0 3px ${c.border}` : undefined,
                }}
              >
                {
                  isCurrent
                    ? `${STATUS_LABEL[s]} (current)`
                    : isPreviousStage
                      ? `✓ ${STATUS_LABEL[s]}`
                      : STATUS_LABEL[s]
                }
                {isResult && !isCurrent && ' 🎯'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interview_Result hint */}
      {selectedStatus === 'Interview_Result' && (
        <div style={{ background: 'var(--teal-lt)', border: '1px solid var(--teal-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--teal)', marginBottom: 12 }}>
          ℹ Moving to <strong>Interview Result</strong> will immediately open the result form so you can record the interviewer details and decision.
        </div>
      )}

      <div className="fg">
        <label>Remarks <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--ink4)' }}>— optional</span></label>
        <textarea
          rows={2}
          placeholder="Add notes about this stage change…"
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
        />
      </div>
    </Modal>
  );
}
