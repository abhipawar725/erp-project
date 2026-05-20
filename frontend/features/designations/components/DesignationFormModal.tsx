'use client';
import { useEffect } from 'react';
import { useForm }   from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal }     from '../../../components/ui/Modal';
import { useCreateDesignation, useUpdateDesignation } from '../hooks/useDesignations';
import {
  createDesignationSchema,
  type CreateDesignationFormData,
} from '../validations/designation.schema';
import type { Designation } from '../types/designation.types';
import type { Department }  from '../../departments/types/department.types';

interface Props {
  open:         boolean;
  onClose:      () => void;
  designation?: Designation | null;   // null = create mode
  departments:  { value: number; label: string }[];
}

export function DesignationFormModal({ open, onClose, designation, departments }: Props) {
  const isEdit        = !!designation;
  const createMutation = useCreateDesignation();
  const updateMutation = useUpdateDesignation(designation?.id ?? 0);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateDesignationFormData>({
    resolver: zodResolver(createDesignationSchema),
  });

  // Pre-fill form in edit mode
  useEffect(() => {
    if (open && designation) {
      reset({
        name:          designation.name,
        grade:         designation.grade ?? '',
        department_id: designation.department_id ?? undefined,
      });
    } else if (open) {
      reset({ name: '', grade: '', department_id: undefined });
    }
  }, [open, designation, reset]);

  const onSubmit = async (data: CreateDesignationFormData) => {
    const payload : any = {
      name:          data.name,
      grade:         data.grade || null,
      department_id: data.department_id || null,
    };

    if (isEdit) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
    onClose();
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Designation — ${designation?.name}` : 'Add Designation'}
      subtitle={isEdit ? 'Update designation details' : 'Create a new designation for your organisation'}
      width={440}
      footer={
        <>
          <button className="btn btn-sec" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            className="btn btn-pri"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {isSaving && (
              <span style={{
                width: 12, height: 12,
                border: '2px solid rgba(255,255,255,.4)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin .7s linear infinite',
              }} />
            )}
            {isSaving ? 'Saving…' : isEdit ? '✓ Save Changes' : '✓ Create Designation'}
          </button>
        </>
      }
    >
      {/* Name */}
      <div className="fg">
        <label>Designation Name *</label>
        <input
          placeholder="e.g. Software Engineer, Product Manager"
          {...register('name')}
          autoFocus
        />
        {errors.name && <span className="err">{errors.name.message}</span>}
      </div>

      {/* Grade */}
      <div className="fg">
        <label>Grade / Level</label>
        <input
          placeholder="e.g. L2, M3, IC4, Senior"
          {...register('grade')}
        />
        {errors.grade && <span className="err">{errors.grade.message}</span>}
        <span style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>
          Optional — used for pay bands and reporting
        </span>
      </div>

      {/* Department */}
      <div className="fg">
        <label>Department</label>
        <select {...register('department_id', { setValueAs: (v) => v ? Number(v) : null })}>
          <option value="">— Cross-functional / No specific department —</option>
          {departments.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        {errors.department_id && <span className="err">{errors.department_id.message}</span>}
        <span style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>
          Leave blank if this designation spans multiple departments
        </span>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
