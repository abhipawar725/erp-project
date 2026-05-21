'use client';
import { useEffect } from 'react';
import { useForm }   from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal }     from '../../../components/ui/Modal';
import { useCreateDepartment, useUpdateDepartment } from '../hooks/useDepartments';
import { createDepartmentSchema, type CreateDepartmentFormData } from '../validations/department.schema';
import type { Department } from '../../../services/api/department.service';

interface Props {
  open:        boolean;
  onClose:     () => void;
  department?: Department | null;
  departments: { value: number; label: string }[];
  managers:    { value: number; label: string }[];
}

export function DepartmentFormModal({ open, onClose, department, departments, managers }: Props) {
  const isEdit = !!department;
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment(department?.id ?? 0);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateDepartmentFormData>({
    resolver: zodResolver(createDepartmentSchema),
  });

  useEffect(() => {
    if (open && department) {
      reset({
        name:      department.name,
        code:      department.code ?? '',
        head_id:   department.head_id   ?? undefined,
        parent_id: department.parent_id ?? undefined,
      });
    } else if (open) {
      reset({ name: '', code: '', head_id: undefined, parent_id: undefined });
    }
  }, [open, department, reset]);

  const onSubmit = async (data: CreateDepartmentFormData) => {
    const payload = {
      name:      data.name,
      code:      data.code || "",
      head_id:   data.head_id   || null,
      parent_id: data.parent_id || null,
    };
    if (isEdit) await updateMutation.mutateAsync(payload);
    else        await createMutation.mutateAsync(payload as any);
    onClose();
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${department?.name}` : 'Add Department'}
      subtitle={isEdit ? 'Update department details' : 'Create a new department for your organisation'}
      width={460}
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
            {isSaving ? 'Saving…' : isEdit ? '✓ Save Changes' : '✓ Create Department'}
          </button>
        </>
      }
    >
      <div className="fg">
        <label>Department Name *</label>
        <input placeholder="e.g. Engineering, Finance, Product" {...register('name')} autoFocus />
        {errors.name && <span className="err">{errors.name.message}</span>}
      </div>

      <div className="fg">
        <label>Department Code</label>
        <input
          placeholder="e.g. ENG, FIN, OPS"
          style={{ textTransform: 'uppercase' }}
          {...register('code')}
        />
        {errors.code && <span className="err">{errors.code.message}</span>}
        <span style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>Short code for reports and exports (optional)</span>
      </div>

      <div className="fg">
        <label>Department Head</label>
        <select {...register('head_id', { setValueAs: (v) => v ? Number(v) : null })}>
          <option value="">— Assign a head later —</option>
          {managers.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <span style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>The employee responsible for this department</span>
      </div>

      <div className="fg">
        <label>Parent Department</label>
        <select {...register('parent_id', { setValueAs: (v) => v ? Number(v) : null })}>
          <option value="">— Top-level department (no parent) —</option>
          {departments
            .filter((d) => d.value !== department?.id)
            .map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
        </select>
        <span style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>For sub-departments within a larger team</span>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
