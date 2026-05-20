'use client';

import { useEffect, useRef } from 'react';

import {
  useFormContext,
  useWatch,
} from 'react-hook-form';

import { useDesignationsByDepartment } from '../../../designations/hooks/useDesignations';

import type { FullEmployeeFormData } from '../../validations/employee.schema';

interface SelectOption {
  value: number | string;
  label: string;
}

interface Props {
  departments?: SelectOption[];
  designations?: SelectOption[];
  managers?: SelectOption[];

  isEdit?: boolean;

  loading?: {
    departments?: boolean;
    designations?: boolean;
    managers?: boolean;
  };
}

export function StepEmployment({
  departments,
  managers,
  loading,
  isEdit,
}: Props) {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<FullEmployeeFormData>();

  /* ------------------------------------------------ */
  /* WATCH */
  /* ------------------------------------------------ */

  const selectedDepartmentId = useWatch({
    name: 'department_id',
  });

  const initialLoadRef = useRef(true);

  /* ------------------------------------------------ */
  /* SAFE IDS */
  /* ------------------------------------------------ */

  const deptId =
    selectedDepartmentId &&
    selectedDepartmentId !== ''
      ? Number(selectedDepartmentId)
      : undefined;

  /* ------------------------------------------------ */
  /* DESIGNATIONS */
  /* ------------------------------------------------ */

  const {
    data: designationData,
    isLoading: designationLoading,
  } = useDesignationsByDepartment(deptId);

  /* ------------------------------------------------ */
  /* RESET DESIGNATION ON DEPARTMENT CHANGE */
  /* ------------------------------------------------ */

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    setValue('designation_id', '');
  }, [selectedDepartmentId, setValue]);

  /* ------------------------------------------------ */
  /* SAFE OPTIONS */
  /* ------------------------------------------------ */

  const safeDepartments =
    departments ?? [];

  const safeManagers =
    managers ?? [];

  const safeDesignations =
    designationData?.map((d: any) => ({
      value: d.id ?? d.designation_id,
      label: d.name ?? d.designation_name,
    })) ?? [];

  /* ------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------ */

  return (
    <div>
      {/* HEADER */}

      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--ink)',
          }}
        >
          Employment Details
        </div>

        <div
          style={{
            fontSize: 11,
            color: 'var(--ink4)',
          }}
        >
          Role, department, work type and
          status
        </div>
      </div>

      {/* FORM */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0 18px',
        }}
      >
        {/* DEPARTMENT */}

        <div className="fg">
          <label>Department</label>

          <select
            {...register('department_id', {
              setValueAs: (v) => {
                if (
                  v === '' ||
                  v === undefined
                ) {
                  return null;
                }

                return Number(v);
              },
            })}
          >
            <option value="">
              — Select Department —
            </option>

            {safeDepartments.map((d) => (
              <option
                key={String(d.value)}
                value={d.value}
              >
                {d.label}
              </option>
            ))}
          </select>

          {errors.department_id && (
            <span className="err">
              {errors.department_id.message}
            </span>
          )}
        </div>

        {/* DESIGNATION */}

        <div className="fg">
          <label>Designation</label>

          <select
            {...register('designation_id', {
              setValueAs: (v) => {
                if (
                  v === '' ||
                  v === undefined
                ) {
                  return null;
                }

                return Number(v);
              },
            })}
          >
            <option value="">
              {designationLoading
                ? 'Loading designations...'
                : selectedDepartmentId
                ? '— Select Designation —'
                : 'Select Department First'}
            </option>

            {!designationLoading &&
              safeDesignations.map((d) => (
                <option
                  key={String(d.value)}
                  value={d.value}
                >
                  {d.label}
                </option>
              ))}
          </select>

          {errors.designation_id && (
            <span className="err">
              {
                errors.designation_id
                  .message
              }
            </span>
          )}
        </div>

        {/* MANAGER */}

        <div
          className="fg"
          style={{
            gridColumn: '1 / -1',
          }}
        >
          <label>
            Reporting Manager
          </label>

          <select
            {...register(
              'reporting_manager_id',
              {
                setValueAs: (v) => {
                  if (
                    v === '' ||
                    v === undefined
                  ) {
                    return null;
                  }

                  return Number(v);
                },
              },
            )}
          >
            <option value="">
              {loading?.managers
                ? 'Loading managers...'
                : '— No Manager / Select Later —'}
            </option>

            {safeManagers.map((m) => (
              <option
                key={String(m.value)}
                value={m.value}
              >
                {m.label}
              </option>
            ))}
          </select>

          {errors.reporting_manager_id && (
            <span className="err">
              {
                errors
                  .reporting_manager_id
                  .message
              }
            </span>
          )}
        </div>

        {/* EMPLOYMENT TYPE */}

        <div className="fg">
          <label>
            Employment Type *
          </label>

          <select
            {...register(
              'employment_type',
            )}
          >
            <option value="">
              — Select —
            </option>

            <option value="Full-time">
              Full-time
            </option>

            <option value="Part-time">
              Part-time
            </option>

            <option value="Contract">
              Contract
            </option>

            <option value="Intern">
              Intern
            </option>
          </select>

          {errors.employment_type && (
            <span className="err">
              {
                errors.employment_type
                  .message
              }
            </span>
          )}
        </div>

        {/* WORK LOCATION */}

        <div className="fg">
          <label>
            Work Location *
          </label>

          <select
            {...register(
              'work_location',
            )}
          >
            <option value="">
              — Select —
            </option>

            <option value="Office">
              Office
            </option>

            <option value="WFH">
              WFH
            </option>

            <option value="Hybrid">
              Hybrid
            </option>
          </select>

          {errors.work_location && (
            <span className="err">
              {
                errors.work_location
                  .message
              }
            </span>
          )}
        </div>

        {/* JOINING DATE */}

        <div className="fg">
          <label>
            Date of Joining
          </label>

          <input
            type="date"
            {...register(
              'date_of_joining',
            )}
          />
        </div>

        {/* CONFIRMATION DATE */}

        <div className="fg">
          <label>
            Confirmation Date
          </label>

          <input
            type="date"
            {...register(
              'date_of_confirmation',
            )}
          />
        </div>

        {/* STATUS */}

        <div
          className="fg"
          style={{
            gridColumn: '1 / -1',
          }}
        >
          <label>Status *</label>

          <select
            {...register('status')}
          >
            <option value="">
              — Select Status —
            </option>

            <option value="Active">
              Active
            </option>

            <option value="On_Probation">
              On Probation
            </option>

            <option value="Left">
              Left
            </option>

            <option value="Absconding">
              Absconding
            </option>
          </select>

          {errors.status && (
            <span className="err">
              {errors.status.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}