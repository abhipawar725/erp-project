'use client';
import { useWatch } from 'react-hook-form';
import { FormInput } from '../../../../../components/form/FormInput';
import { FormDatePicker } from '../../../../../components/form/FormDatePicker';
import { FormToggle } from '../../../../../components/form/FormToggle';
import { SectionTitle } from '../../../../../components/form/SectionTitle';
import { useFieldPermissions } from '../../hooks/useEmployees';

export function StepStatutory() {
  const { data: fp } = useFieldPermissions();
  const yellowFever  = useWatch({ name: 'yellow_fever' });
  const f = (n: string) => fp?.[n];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ padding: '8px 12px', background: 'var(--amber-lt)', borderRadius: 'var(--r)', border: '1px solid var(--amber-bd)', fontSize: 12, color: 'var(--amber)' }}>
        ⚠️ This section contains sensitive government ID information. Access is role-restricted and fields may be masked based on your permissions.
      </div>

      <SectionTitle title="Travel Documents" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormInput      name="passport_number" label="Passport Number" required placeholder="A1234567" fieldPerm={f('passport_number')} />
        <FormDatePicker name="passport_expiry" label="Passport Expiry" required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormToggle name="yellow_fever" label="Yellow Fever Vaccination" />
        {yellowFever && <FormDatePicker name="yellow_fever_date" label="Date of Injection" />}
      </div>

      <SectionTitle title="Driving License" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormInput      name="driving_license_number" label="Driving License No." required fieldPerm={f('driving_license_number')} />
        <FormDatePicker name="driving_license_expiry" label="Driving License Expiry" required />
      </div>

      <SectionTitle title="Government IDs" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormInput name="aadhaar_number" label="Aadhaar Number" required placeholder="XXXX XXXX XXXX" maxLength={12} hint="12 digits" fieldPerm={f('aadhaar_number')} />
        <FormInput name="pan_number"     label="PAN Number"     required placeholder="ABCDE1234F"   maxLength={10} hint="Format: ABCDE1234F" fieldPerm={f('pan_number')} />
      </div>
      <FormInput name="aadhaar_address" label="Address as in Aadhaar Card" required />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormInput      name="pan_full_name"          label="Full Name as per PAN" required fieldPerm={f('pan_full_name')} />
        <FormDatePicker name="pan_dob"                label="DOB in PAN Card"     required />
      </div>
      <FormInput name="pan_parent_spouse_name" label="Parent's / Spouse's Name as per PAN" required />
    </div>
  );
}