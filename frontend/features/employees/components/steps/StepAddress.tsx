'use client';

import { useFormContext } from 'react-hook-form';
import type { FullEmployeeFormData } from '../../validations/employee.schema';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Chandigarh',
  'Puducherry',
];

interface Props {
  isEdit?: boolean;
}

export function StepAddress({ isEdit }: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext<FullEmployeeFormData>();

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: 4,
          }}
        >
          Residential Address
        </div>

        <div
          style={{
            fontSize: 11,
            color: 'var(--ink4)',
          }}
        >
          Current residential address
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0 18px',
        }}
      >
        {/* ADDRESS 1 */}

        <div
          className="fg"
          style={{ gridColumn: '1 / -1' }}
        >
          <label>Address Line 1</label>

          <input
            placeholder="Flat / House No., Street, Area"
            {...register('address_line1')}
          />
        </div>

        {/* ADDRESS 2 */}

        <div
          className="fg"
          style={{ gridColumn: '1 / -1' }}
        >
          <label>Address Line 2</label>

          <input
            placeholder="Landmark, Colony (optional)"
            {...register('address_line2')}
          />
        </div>

        {/* CITY */}

        <div className="fg">
          <label>City</label>

          <input
            placeholder="Mumbai"
            {...register('city')}
          />
        </div>

        {/* STATE */}

        <div className="fg">
          <label>State</label>

          <select {...register('state')}>
            <option value="">
              — Select State —
            </option>

            {INDIAN_STATES.map((state) => (
              <option
                key={state}
                value={state}
              >
                {state}
              </option>
            ))}
          </select>
        </div>

        {/* PINCODE */}

        <div className="fg">
          <label>Pincode</label>

          <input
            placeholder="400001"
            maxLength={6}
            {...register('pincode')}
          />

          {errors.pincode && (
            <span className="err">
              {errors.pincode.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}