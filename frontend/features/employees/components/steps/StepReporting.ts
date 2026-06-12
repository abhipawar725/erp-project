'use client';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormInput } from '../../../../../components/form/FormInput';
import { FormDatePicker } from '../../../../../components/form/FormDatePicker';
import { SectionTitle } from '../../../../../components/form/SectionTitle';
import { useFieldPermissions } from '../../hooks/useEmployees';
import { employeeService } from '../../services/employee.service';

interface Props { isEdit: boolean; employeeId: number | null }
interface ManagerResult { id: number; employee_code: string; first_name: string; last_name: string; official_email?: string }

function ManagerSearch({ fieldName, label, required, excludeId }: { fieldName: string; label: string; required?: boolean; excludeId?: number | null }) {
  const { setValue, watch } = useFormContext();
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState<ManagerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ManagerResult | null>(null);
  const currentId = watch(fieldName);

  const search = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res: any = await employeeService.searchManagers(q);
      setResults(res.data || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  const pick = (mgr: ManagerResult) => {
    setSelected(mgr);
    setValue(fieldName, mgr.id);     // Store employee_id (integer)
    setQuery(`${mgr.first_name} ${mgr.last_name} (${mgr.employee_code})`);
    setResults([]);
  };

  return (
    <div className="form-field">
      <label className="field-label">{label}{required && <span className="req-mark">*</span>}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="text" className="form-input"
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Search by name or employee code..."
        />
        {loading && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--ink4)' }}>Searching...</span>}
        {results.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', zIndex: 100, maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--sh2)' }}>
            {results.filter(r => !excludeId || r.id !== excludeId).map(r => (
              <div key={r.id} onClick={() => pick(r)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--blue-lt)')}
                onMouseOut={e => (e.currentTarget.style.background = '')}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{r.first_name} {r.last_name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{r.employee_code} · {r.official_email}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {currentId && <p className="field-hint" style={{ color: 'var(--green)' }}>✓ Manager ID: {currentId}</p>}
    </div>
  );
}

export function StepReporting({ employeeId }: Props) {
  const { data: fp } = useFieldPermissions();

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <SectionTitle title="Reporting Manager" subtitle="Search by name or employee code — manager is linked by ID" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ManagerSearch fieldName="l1_manager_id" label="L1 Manager (Direct)" required excludeId={employeeId} />
        <ManagerSearch fieldName="l2_manager_id" label="L2 Manager (Skip-level)" excludeId={employeeId} />
      </div>

      <SectionTitle title="Official Contact Details" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormInput name="official_email"  label="Official Email"  type="email" placeholder="rahul@company.com" fieldPerm={fp?.['official_email']} />
        <FormInput name="official_mobile" label="Official Mobile" required placeholder="+91-9876543210" fieldPerm={fp?.['official_mobile']} />
      </div>

      <SectionTitle title="Date of Joining" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormDatePicker name="actual_doj"  label="Actual DOJ" required max={new Date().toISOString().split('T')[0]} />
        <FormDatePicker name="current_doj" label="Current DOJ" hint="Leave blank to use Actual DOJ" />
      </div>
    </div>
  );
}