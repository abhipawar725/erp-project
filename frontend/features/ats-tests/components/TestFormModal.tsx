'use client';
import { useEffect } from 'react';
import { useForm }   from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal }     from '../../../components/ui/Modal';
import { useCreateAptitudeTest, useUpdateAptitudeTest } from '../hooks/useAtsTests';
import { createTestSchema, type CreateTestFormData } from '../validations/ats-test.schema';
import type { AptitudeTest } from '../types/ats-test.types';

interface Props {
  open:   boolean;
  onClose: () => void;
  test?:  AptitudeTest | null;
  onCreated?: (test: AptitudeTest) => void;
}

export function TestFormModal({ open, onClose, test, onCreated }: Props) {
  const isEdit         = !!test;
  const createMutation = useCreateAptitudeTest();
  const updateMutation = useUpdateAptitudeTest(test?.id ?? 0);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateTestFormData>({
    resolver: zodResolver(createTestSchema),
    defaultValues: { duration_minutes: 30, total_marks: 0 },
  });

  useEffect(() => {
    if (!open) return;
    reset(test
      ? {
          title:            test.title,
          description:      test.description ?? '',
          duration_minutes: test.duration_minutes,
          total_marks:      test.total_marks,
          pass_marks:       test.pass_marks ?? undefined,
        }
      : { duration_minutes: 30, total_marks: 0 },
    );
  }, [open, test, reset]);

  const onSubmit = async (data: CreateTestFormData) => {
    const payload = {
      title:            data.title,
      description:      data.description || null,
      duration_minutes: data.duration_minutes,
      total_marks:      data.total_marks,
      pass_marks:       data.pass_marks ?? null,
    };

    if (isEdit) {
      await updateMutation.mutateAsync(payload);
      onClose();
    } else {
      const res = await createMutation.mutateAsync(payload);
      onCreated?.(res.data);
      onClose();
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${test?.title}` : 'Create Aptitude Test'}
      subtitle={isEdit
        ? 'Update test settings. Questions are managed separately.'
        : 'Set up the test paper. You will add questions after creation.'}
      width={480}
      footer={
        <>
          <button className="btn btn-sec" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button
            className="btn btn-pri"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {isSaving && <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />}
            {isSaving ? 'Saving…' : isEdit ? '✓ Save Changes' : '✓ Create & Add Questions'}
          </button>
        </>
      }
    >
      <div className="fg">
        <label>Test Title *</label>
        <input placeholder="e.g. Technical Aptitude Round 1" {...register('title')} autoFocus />
        {errors.title && <span className="err">{errors.title.message}</span>}
      </div>

      <div className="fg">
        <label>Description</label>
        <textarea rows={2} placeholder="Brief description of what this test covers…" style={{ resize: 'vertical' }} {...register('description')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, whiteSpace: 'nowrap' }}>
        <div className="fg">
          <label>Duration (min) *</label>
          <input type="number" min="1" max="180" {...register('duration_minutes', { valueAsNumber: true })} />
          {errors.duration_minutes && <span className="err">{errors.duration_minutes.message}</span>}
        </div>
        <div className="fg">
          <label>Total marks *</label>
          <input type="number" min="0" step="0.5" {...register('total_marks', { valueAsNumber: true })} />
          {errors.total_marks && <span className="err">{errors.total_marks.message}</span>}
        </div>
        <div className="fg">
          <label>Pass mark</label>
          <input type="number" min="0" step="0.5" placeholder="Optional" {...register('pass_marks', { valueAsNumber: true })} />
          {errors.pass_marks && <span className="err">{errors.pass_marks.message}</span>}
        </div>
      </div>

      <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-md)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 11, color: 'var(--blue)' }}>
        {isEdit
          ? 'Changes apply immediately. Questions are not affected by updating test settings.'
          : 'After creation you will be redirected to the question editor.'}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
