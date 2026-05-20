'use client';

import { useFormContext } from 'react-hook-form';

import type { FullEmployeeFormData } from '../../validations/employee.schema';

interface Props {
  isEdit?: boolean;
}

export function StepStatutory({
  isEdit,
}: Props) {
  const {
    register,
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
          Statutory Details
        </div>

        <div
          style={{
            fontSize: 11,
            color: 'var(--ink4)',
          }}
        >
          Government IDs and compliance
          numbers — stored securely
        </div>
      </div>

      {/* SECURITY NOTICE */}

      <div
        style={{
          background: 'var(--amber-lt)',
          border:
            '1px solid var(--amber-bd)',
          borderRadius: 'var(--r)',
          padding: '10px 14px',
          fontSize: 11,
          color: 'var(--amber)',
          marginBottom: 18,
        }}
      >
        🔒 Sensitive data — only HR and
        Admin can view these fields.
        Data is encrypted at rest.
      </div>

      {/* FORM */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0 18px',
        }}
      >
        {/* AADHAAR */}

        <div className="fg">
          <label>Aadhaar Number</label>

          <input
            placeholder="123456789012"
            maxLength={12}
            autoComplete="off"
            style={{
              fontFamily: 'var(--mono)',
            }}
            {...register(
              'aadhaar_number',
            )}
          />

          {errors.aadhaar_number && (
            <span className="err">
              {
                errors.aadhaar_number
                  .message
              }
            </span>
          )}

          <span
            style={{
              fontSize: 10,
              color: 'var(--ink4)',
            }}
          >
            12 digits, no spaces
          </span>
        </div>

        {/* PAN */}

        <div className="fg">
          <label>PAN Number</label>

          <input
            placeholder="ABCDE1234F"
            maxLength={10}
            autoComplete="off"
            style={{
              textTransform:
                'uppercase',
              fontFamily: 'var(--mono)',
            }}
            {...register('pan_number')}
          />

          {errors.pan_number && (
            <span className="err">
              {errors.pan_number.message}
            </span>
          )}

          <span
            style={{
              fontSize: 10,
              color: 'var(--ink4)',
            }}
          >
            Format: ABCDE1234F
          </span>
        </div>

        {/* PASSPORT */}

        <div className="fg">
          <label>
            Passport Number
          </label>

          <input
            placeholder="A1234567"
            autoComplete="off"
            style={{
              fontFamily: 'var(--mono)',
            }}
            {...register(
              'passport_number',
            )}
          />
        </div>

        {/* UAN */}

        <div className="fg">
          <label>UAN Number</label>

          <input
            placeholder="100000000000"
            maxLength={12}
            autoComplete="off"
            style={{
              fontFamily: 'var(--mono)',
            }}
            {...register('uan_number')}
          />

          {errors.uan_number && (
            <span className="err">
              {errors.uan_number.message}
            </span>
          )}
        </div>

        {/* PF */}

        <div className="fg">
          <label>PF Number</label>

          <input
            placeholder="MH/BAN/1234567/000/1234567"
            autoComplete="off"
            style={{
              fontFamily: 'var(--mono)',
            }}
            {...register('pf_number')}
          />
        </div>

        {/* ESI */}

        <div className="fg">
          <label>ESI Number</label>

          <input
            placeholder="ESI number"
            autoComplete="off"
            style={{
              fontFamily: 'var(--mono)',
            }}
            {...register('esi_number')}
          />
        </div>
      </div>
    </div>
  );
}