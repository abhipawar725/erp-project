'use client';

import { useFormContext } from 'react-hook-form';

import type { FullEmployeeFormData } from '../../validations/employee.schema';

interface Props {
  isEdit?: boolean;
}

export function StepBank({ isEdit }: Props) {
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
          Bank Account Details
        </div>

        <div
          style={{
            fontSize: 11,
            color: 'var(--ink4)',
          }}
        >
          Salary disbursement account — stored securely
        </div>
      </div>

      {/* SECURITY NOTICE */}

      <div
        style={{
          background: 'var(--amber-lt)',
          border: '1px solid var(--amber-bd)',
          borderRadius: 'var(--r)',
          padding: '10px 14px',
          fontSize: 11,
          color: 'var(--amber)',
          marginBottom: 18,
        }}
      >
        🔒 Sensitive data — only HR and Admin can
        view bank details. All fields encrypted at
        rest.
      </div>

      {/* FORM */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0 18px',
        }}
      >
        {/* BANK NAME */}

        <div
          className="fg"
          style={{ gridColumn: '1 / -1' }}
        >
          <label>Bank Name</label>

          <input
            placeholder="State Bank of India"
            {...register('bank_name')}
          />
        </div>

        {/* ACCOUNT NUMBER */}

        <div className="fg">
          <label>Account Number</label>

          <input
            placeholder="1234567890123456"
            autoComplete="off"
            style={{
              fontFamily: 'var(--mono)',
            }}
            {...register('bank_account_number')}
          />

          {errors.bank_account_number && (
            <span className="err">
              {
                errors.bank_account_number
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
            9–18 digits, no spaces or dashes
          </span>
        </div>

        {/* IFSC */}

        <div className="fg">
          <label>IFSC Code</label>

          <input
            placeholder="SBIN0001234"
            maxLength={11}
            autoComplete="off"
            style={{
              textTransform: 'uppercase',
              fontFamily: 'var(--mono)',
            }}
            {...register('ifsc_code')}
          />

          {errors.ifsc_code && (
            <span className="err">
              {errors.ifsc_code.message}
            </span>
          )}

          <span
            style={{
              fontSize: 10,
              color: 'var(--ink4)',
            }}
          >
            Format: ABCD0123456
          </span>
        </div>
      </div>
    </div>
  );
}