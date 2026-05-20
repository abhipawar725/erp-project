'use client';

import { useFormContext } from 'react-hook-form';

import type { FullEmployeeFormData } from '../../validations/employee.schema';

interface Props {
  isEdit?: boolean;
  autoCode?: string;
}

export function StepBasicInfo({
  isEdit,
  autoCode,
}: Props) {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<FullEmployeeFormData>();

  return (
    <div>
      {/* HEADER */}

      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: 4,
          }}
        >
          Personal Details
        </div>

        <div
          style={{
            fontSize: 11,
            color: 'var(--ink4)',
          }}
        >
          Basic personal and contact information
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
        {/* EMPLOYEE CODE */}

        <div
          className="fg"
          style={{ gridColumn: '1 / -1' }}
        >
          <label>Employee Code *</label>

          <div
            style={{
              display: 'flex',
              gap: 8,
            }}
          >
            <input
              placeholder="EMP-0001"
              style={{ flex: 1 }}
              readOnly={isEdit}
              {...register('employee_code')}
            />

            {!isEdit && autoCode && (
              <button
                type="button"
                className="btn btn-sec btn-sm"
                style={{
                  whiteSpace: 'nowrap',
                }}
                onClick={() =>
                  setValue(
                    'employee_code',
                    autoCode,
                    {
                      shouldValidate: true,
                    },
                  )
                }
              >
                Auto-fill
              </button>
            )}
          </div>

          {errors.employee_code && (
            <span className="err">
              {errors.employee_code.message}
            </span>
          )}
        </div>

        {/* FIRST NAME */}

        <div className="fg">
          <label>First Name *</label>

          <input
            placeholder="Amit"
            {...register('first_name')}
          />

          {errors.first_name && (
            <span className="err">
              {errors.first_name.message}
            </span>
          )}
        </div>

        {/* LAST NAME */}

        <div className="fg">
          <label>Last Name *</label>

          <input
            placeholder="Kumar"
            {...register('last_name')}
          />

          {errors.last_name && (
            <span className="err">
              {errors.last_name.message}
            </span>
          )}
        </div>

        {/* WORK EMAIL */}

        <div className="fg">
          <label>Work Email *</label>

          <input
            type="email"
            autoComplete="off"
            placeholder="amit@company.com"
            readOnly={isEdit}
            {...register('email')}
          />

          {errors.email && (
            <span className="err">
              {errors.email.message}
            </span>
          )}
        </div>

        {/* PERSONAL EMAIL */}

        <div className="fg">
          <label>Personal Email</label>

          <input
            type="email"
            placeholder="amit@gmail.com"
            {...register('personal_email')}
          />

          {errors.personal_email && (
            <span className="err">
              {
                errors.personal_email
                  .message
              }
            </span>
          )}
        </div>

        {/* PHONE */}

        <div className="fg">
          <label>Phone</label>

          <input
            type="tel"
            placeholder="+91 9876543210"
            {...register('phone')}
          />

          {errors.phone && (
            <span className="err">
              {errors.phone.message}
            </span>
          )}
        </div>

        {/* DOB */}

        <div className="fg">
          <label>Date of Birth</label>

          <input
            type="date"
            {...register('date_of_birth')}
          />
        </div>

        {/* GENDER */}

        <div className="fg">
          <label>Gender</label>

          <select {...register('gender')}>
            <option value="">
              — Select —
            </option>

            <option value="Male">
              Male
            </option>

            <option value="Female">
              Female
            </option>

            <option value="Other">
              Other
            </option>

            <option value="Prefer not to say">
              Prefer not to say
            </option>
          </select>
        </div>

        {/* BLOOD GROUP */}

        <div className="fg">
          <label>Blood Group</label>

          <select
            {...register('blood_group')}
          >
            <option value="">
              — Select —
            </option>

            {[
              'A+',
              'A-',
              'B+',
              'B-',
              'AB+',
              'AB-',
              'O+',
              'O-',
            ].map((group) => (
              <option
                key={group}
                value={group}
              >
                {group}
              </option>
            ))}
          </select>
        </div>

        {/* MARITAL STATUS */}

        <div className="fg">
          <label>Marital Status</label>

          <select
            {...register(
              'marital_status',
            )}
          >
            <option value="">
              — Select —
            </option>

            <option value="Single">
              Single
            </option>

            <option value="Married">
              Married
            </option>

            <option value="Divorced">
              Divorced
            </option>

            <option value="Widowed">
              Widowed
            </option>
          </select>
        </div>

        {/* NATIONALITY */}

        <div className="fg">
          <label>Nationality</label>

          <input
            placeholder="Indian"
            {...register('nationality')}
          />
        </div>
      </div>
    </div>
  );
}