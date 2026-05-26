'use client';
import { useEffect } from 'react';
import { useForm }   from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }         from 'zod';
import { Modal }     from '../../../components/ui/Modal';
import { useHireCandidate } from '../hooks/useCandidates';
import { useDepartmentOptions } from '../../departments/hooks/useDepartments';
import { useDesignationsByDepartment } from '../../designations/hooks/useDesignations';
import { useEmployees } from '../../employees/hooks/useEmployees';
import type { Candidate } from '../types/candidate.types';
import { useRouter } from 'next/navigation';

const today = new Date().toISOString().slice(0, 10);

const schema = z.object({
  department_id:       z.number({ invalid_type_error: 'Department is required' }).int().positive('Department is required'),
  designation_id:      z.number({ invalid_type_error: 'Designation is required' }).int().positive('Designation is required'),
  employment_type:     z.enum(['Full-time', 'Part-time', 'Contract', 'Intern'], { errorMap: () => ({ message: 'Select employment type' }) }),
  date_of_joining:     z.string().min(1, 'Date of joining is required').refine(d => d >= today, 'Joining date cannot be in the past'),
  reporting_manager_id: z.number().int().positive().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open:      boolean;
  onClose:   () => void;
  candidate: Candidate | null;
}

export function HireCandidateModal({ open, onClose, candidate }: Props) {
  const router       = useRouter();
  const hireMutation = useHireCandidate(candidate?.id ?? 0);

  const {
    register, handleSubmit, reset, watch,
    setValue, formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { employment_type: 'Full-time' },
  });

  const selectedDeptId = watch('department_id');

  const { data: deptOptions }  = useDepartmentOptions();
  const { data: desigData }    = useDesignationsByDepartment(selectedDeptId);
  const { data: empData }      = useEmployees({ limit: 200, status: 'Active' as any });

  const designations = desigData ?? [];
  const managers     = empData?.data ?? [];

  useEffect(() => {
    if (open) {
      reset({
        employment_type:  'Full-time',
        date_of_joining:  candidate?.confirmed_joining_date?.slice(0, 10)
                          || candidate?.decision_joining_date?.slice(0, 10)
                          || today,
        reporting_manager_id: null,
      });
    }
  }, [open, candidate, reset]);

  // Reset designation when department changes
  useEffect(() => {
    setValue('designation_id', undefined as any);
  }, [selectedDeptId, setValue]);

  const onSubmit = async (data: FormData) => {
    const result = await hireMutation.mutateAsync({
      department_id:        data.department_id,
      designation_id:       data.designation_id,
      employment_type:      data.employment_type,
      date_of_joining:      data.date_of_joining,
      reporting_manager_id: data.reporting_manager_id || null,
    });

    onClose();

    // Navigate to the new employee record
    if ((result as any).data?.employee?.id) {
      setTimeout(() => router.push(`/employees/${(result as any).data.employee.id}`), 300);
    }
  };

  const isBusy = hireMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Hire Candidate"
      subtitle={`Convert ${candidate?.candidate_name ?? ''} to an employee record`}
      width={540}
      footer={
        <>
          <button className="btn btn-sec" onClick={onClose} disabled={isBusy}>Cancel</button>
          <button
            className="btn btn-pri"
            onClick={handleSubmit(onSubmit)}
            disabled={isBusy}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            {isBusy && <Spinner />}
            {isBusy ? 'Creating record…' : '🎉 Confirm Hire'}
          </button>
        </>
      }
    >
      {/* Candidate summary strip */}
      <div style={{
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 18,
        display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12,
      }}>
        {[
          ['Email',       candidate?.email],
          ['Phone',       candidate?.phone_number],
          ['Experience',  candidate?.total_experience != null ? `${candidate.total_experience} yr` : null],
          ['Joining',     candidate?.confirmed_joining_date?.slice(0, 10) || candidate?.decision_joining_date?.slice(0, 10)],
        ].filter(([, v]) => v).map(([label, value]) => (
          <div key={label as string}>
            <span style={{ color: 'var(--ink4)' }}>{label}: </span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>

        {/* Department */}
        <div className="fg">
          <label>Department *</label>
          <select
            {...register('department_id', { valueAsNumber: true })}
          >
            <option value="">— Select department —</option>
            {(deptOptions ?? []).map((d: any) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          {errors.department_id && <span className="err">{errors.department_id.message}</span>}
        </div>

        {/* Designation */}
        <div className="fg">
          <label>Designation *</label>
          <select
            {...register('designation_id', { valueAsNumber: true })}
            disabled={!selectedDeptId}
          >
            <option value="">— Select designation —</option>
            {designations.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {errors.designation_id && <span className="err">{errors.designation_id.message}</span>}
        </div>

        {/* Employment type */}
        <div className="fg">
          <label>Employment Type *</label>
          <select {...register('employment_type')}>
            {['Full-time','Part-time','Contract','Intern'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {errors.employment_type && <span className="err">{errors.employment_type.message}</span>}
        </div>

        {/* Date of joining */}
        <div className="fg">
          <label>Date of Joining *</label>
          <input type="date" min={today} {...register('date_of_joining')} />
          {errors.date_of_joining && <span className="err">{errors.date_of_joining.message}</span>}
        </div>

        {/* Reporting manager */}
        <div className="fg" style={{ gridColumn: '1 / -1' }}>
          <label>Reporting Manager <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--ink4)' }}>— optional</span></label>
          <select {...register('reporting_manager_id', { valueAsNumber: true })}>
            <option value="">— None —</option>
            {managers.map(m => (
              <option key={m.id} value={m.id}>
                {m.first_name} {m.last_name} · {m.designation?.name || m.employee_code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{
        background: 'var(--blue-lt)', border: '1px solid var(--blue-md)',
        borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--blue)', marginTop: 4,
      }}>
        ℹ An employee record will be created automatically from this candidate's profile data. You can complete remaining details in the employee profile.
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Modal>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 12, height: 12,
      border: '2px solid rgba(255,255,255,.35)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin .65s linear infinite',
    }} />
  );
}
