'use client';
import { useEffect } from 'react';
import { useForm }   from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal }     from '../../../components/ui/Modal';
import { useAddQuestion, useUpdateQuestion } from '../hooks/useAtsTests';
import { questionSchema, type QuestionFormData } from '../validations/ats-test.schema';
import { type AptitudeQuestion, OPTIONS, BLANK_QUESTION_FORM } from '../types/ats-test.types';

interface Props {
  open:       boolean;
  onClose:    () => void;
  testId:     number;
  question?:  AptitudeQuestion | null;
  nextOrder?: number;
}

export function QuestionFormModal({ open, onClose, testId, question, nextOrder = 0 }: Props) {
  const isEdit         = !!question;
  const addMutation    = useAddQuestion(testId);
  const updateMutation = useUpdateQuestion(testId);

  const {
    register, handleSubmit, reset, watch,
    formState: { errors },
  } = useForm<QuestionFormData>({
    resolver:      zodResolver(questionSchema),
    defaultValues: { ...BLANK_QUESTION_FORM, order_index: nextOrder },
  });

  useEffect(() => {
    if (!open) return;
    reset(question
      ? {
          question_text:  question.question_text,
          option_a:       question.option_a,
          option_b:       question.option_b,
          option_c:       question.option_c,
          option_d:       question.option_d,
          correct_option: question.correct_option,
          marks:          question.marks,
          negative_marks: question.negative_marks,
          order_index:    question.order_index,
        }
      : { ...BLANK_QUESTION_FORM, order_index: nextOrder },
    );
  }, [open, question, nextOrder, reset]);

  const onSubmit = async (data: QuestionFormData) => {
    if (isEdit) {
      await updateMutation.mutateAsync({ questionId: question!.id, data });
    } else {
      await addMutation.mutateAsync(data);
    }
    onClose();
  };

  const isSaving   = addMutation.isPending || updateMutation.isPending;
  const correctOpt = watch('correct_option');

  const optionLabel = (opt: string) =>
    ({ A: question?.option_a || '', B: question?.option_b || '', C: question?.option_c || '', D: question?.option_d || '' }[opt as string] || '');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Question' : 'Add Question'}
      subtitle={isEdit ? 'Update question text, options, or scoring' : 'Add a new multiple-choice question to this test'}
      width={600}
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
            {isSaving ? 'Saving…' : isEdit ? '✓ Save Changes' : '✓ Add Question'}
          </button>
        </>
      }
    >
      {/* Question text */}
      <div className="fg">
        <label>Question *</label>
        <textarea
          rows={3}
          placeholder="Write the question text here…"
          style={{ resize: 'vertical' }}
          {...register('question_text')}
          autoFocus
        />
        {errors.question_text && <span className="err">{errors.question_text.message}</span>}
      </div>

      {/* Options grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        {OPTIONS.map(opt => {
          const field = `option_${opt.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d';
          const isCorrect = correctOpt === opt;
          return (
            <div
              key={opt}
              className="fg"
              style={{
                background:   isCorrect ? 'var(--green-lt)' : undefined,
                border:       isCorrect ? '1px solid var(--green-bd)' : undefined,
                borderRadius: isCorrect ? 'var(--r)' : undefined,
                padding:      isCorrect ? '0 8px 8px' : undefined,
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <input
                  type="radio"
                  value={opt}
                  {...register('correct_option')}
                  style={{ accentColor: 'var(--green)', cursor: 'pointer', width: 14, height: 14 }}
                />
                <span style={{ color: isCorrect ? 'var(--green)' : undefined, fontWeight: isCorrect ? 500 : 400 }}>
                  Option {opt} {isCorrect && '✓ Correct answer'}
                </span>
              </label>
              <input
                placeholder={`Option ${opt} text…`}
                {...register(field)}
              />
              {errors[field] && <span className="err">{(errors[field] as any)?.message}</span>}
            </div>
          );
        })}
      </div>
      {errors.correct_option && <span className="err">{errors.correct_option.message}</span>}

      {/* Scoring row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 4 }}>
        <div className="fg">
          <label>Marks (correct)</label>
          <input type="number" min="0" step="0.5" {...register('marks', { valueAsNumber: true })} />
          {errors.marks && <span className="err">{errors.marks.message}</span>}
        </div>
        <div className="fg">
          <label>Negative marks (wrong)</label>
          <input type="number" min="0" step="0.25" {...register('negative_marks', { valueAsNumber: true })} />
          <span style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>0 = no penalty</span>
          {errors.negative_marks && <span className="err">{errors.negative_marks.message}</span>}
        </div>
        <div className="fg">
          <label>Order / position</label>
          <input type="number" min="0" {...register('order_index', { valueAsNumber: true })} />
          <span style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>Lower = shown first</span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
