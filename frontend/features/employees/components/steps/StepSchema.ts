'use client';
import { useWatch } from 'react-hook-form';
import { FormToggle } from '../../../../../components/form/FormToggle';
import { FormSelect } from '../../../../../components/form/FormSelect';
import { FormInput } from '../../../../../components/form/FormInput';
import { FormCurrencyInput } from '../../../../../components/form/FormCurrencyInput';
import { FormDatePicker } from '../../../../../components/form/FormDatePicker';
import { SectionTitle } from '../../../../../components/form/SectionTitle';
import { toOpts, PF_EMPLOYER_FROM, MEDICLAIM_STATUS, RD_TERM, DEDUCTION_FROM } from '../../constants/employee.constants';

export function StepSchemes() {
  const pfStatus      = useWatch({ name: 'pf_status' });
  const esicStatus    = useWatch({ name: 'esic_status' });
  const mediStatus    = useWatch({ name: 'mediclaim_status' });
  const rdScheme      = useWatch({ name: 'rd_scheme' });

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* PF */}
      <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r2)', padding: 16 }}>
        <SectionTitle title="PF (Provident Fund)" />
        <FormToggle name="pf_status" label="PF Applicable" />
        {pfStatus && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            <FormInput name="uan_number" label="UAN Number" placeholder="12 digits" maxLength={12} hint="Universal Account Number" />
            <FormInput name="epfo_member_id" label="EPFO Member ID" />
            <FormInput name="pf_contribution_pct" label="PF Contribution % of Basic" type="number" hint="e.g. 12" />
            <FormSelect name="pf_employer_from" label="Employer Contribution From" options={toOpts(PF_EMPLOYER_FROM)} placeholder="Select" />
          </div>
        )}
      </div>

      {/* ESIC */}
      <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r2)', padding: 16 }}>
        <SectionTitle title="ESIC (Health Insurance)" />
        <FormToggle name="esic_status" label="ESIC Applicable" />
        {esicStatus && (
          <div style={{ marginTop: 12 }}>
            <FormInput name="esic_number" label="ESIC Number" />
          </div>
        )}
      </div>

      {/* Mediclaim */}
      <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r2)', padding: 16 }}>
        <SectionTitle title="Mediclaim (Health Insurance)" />
        <FormSelect name="mediclaim_status" label="Mediclaim Status" required options={toOpts(MEDICLAIM_STATUS)} />
        {mediStatus === 'Yes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <FormInput name="mediclaim_number" label="Mediclaim Policy Number" />
            <FormCurrencyInput name="mediclaim_amount" label="Mediclaim Amount" />
          </div>
        )}
      </div>

      {/* RD Scheme */}
      <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r2)', padding: 16 }}>
        <SectionTitle title="RD Scheme (Retention Scheme)" subtitle="Recurring Deposit deducted from salary" />
        <FormToggle name="rd_scheme" label="RD Scheme Applicable" />
        {rdScheme && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            <FormSelect name="rd_term" label="RD Term" options={toOpts(RD_TERM)} placeholder="Select term" />
            <FormDatePicker name="rd_opening_date" label="RD Opening Date" />
            <FormInput name="rd_account_number" label="RD Account Number" />
            <FormSelect name="rd_deduction_from" label="Deduction From" options={toOpts(DEDUCTION_FROM)} placeholder="Select" />
            <FormCurrencyInput name="rd_amount_employee" label="RD Amount (Employee)" />
            <FormCurrencyInput name="rd_amount_employer" label="RD Amount (Employer)" />
            <div className="form-field">
              <label className="field-label">RD Maturity Date</label>
              <input type="text" className="form-input readonly" readOnly value="Auto-computed" />
            </div>
            <div className="form-field">
              <label className="field-label">RD Maturity Amount</label>
              <input type="text" className="form-input readonly" readOnly value="Auto-computed" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}