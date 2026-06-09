'use client';
/**
 * MultiStepForm.tsx — Reusable multi-step form renderer
 *
 * Works with any form built in Form Builder.
 * If a form has multiple sections, it renders as a multi-step wizard.
 * If a form has only one section, it renders as a single-page form.
 *
 * Usage:
 *   <MultiStepForm
 *     formId={1}
 *     roleId={user.roleId}
 *     initialValues={{ department_id: 2 }}
 *     onSubmit={(values) => createEmployee(values)}
 *     onCancel={() => router.back()}
 *   />
 */
import { useState, useEffect, useMemo } from 'react';
import { useQuery }   from '@tanstack/react-query';
import apiClient      from '../../services/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResolvedField {
  id:               number;
  field_type:       string;
  label:            string;
  field_key:        string;
  section:          string | null;
  placeholder?:     string | null;
  help_text?:       string | null;
  is_required:      boolean;
  is_readonly:      boolean;
  width:            number;
  options?:         { label:string; value:string }[];
  dynamic_source?:  string | null;
  resolved: {
    can_view:     boolean;
    can_edit:     boolean;
    can_copy:     boolean;
    can_download: boolean;
    is_masked:    boolean;
  };
}

interface MultiStepFormProps {
  formId:         number;
  roleId:         number;
  initialValues?: Record<string, any>;
  onSubmit:       (values: Record<string, any>) => void | Promise<void>;
  onCancel?:      () => void;
  submitLabel?:   string;
  isSubmitting?:  boolean;
  readOnly?:      boolean;
}

// ─── Dynamic source options hook ──────────────────────────────────────────────

function useDynamicOptions(source: string | null | undefined) {
  return useQuery({
    queryKey: ['dyn-source', source],
    queryFn:  () => apiClient.get<any,any>(`/rbac/dynamic-source/${source}`),
    enabled:  !!source && source !== 'custom',
    select:   (r:any) => r.data as { label:string; value:string|number }[],
    staleTime: 5 * 60_000,
  });
}

// ─── Single Field Renderer ────────────────────────────────────────────────────

function FieldRenderer({ field, value, onChange, readOnly }: {
  field:    ResolvedField;
  value:    any;
  onChange: (key: string, value: any) => void;
  readOnly: boolean;
}) {
  const { resolved, field_type, field_key } = field;
  const { data: dynOptions } = useDynamicOptions(field.dynamic_source);

  if (!resolved.can_view) return null;

  const isDisabled = readOnly || field.is_readonly || !resolved.can_edit;
  const displayValue = resolved.is_masked && value
    ? '•'.repeat(String(value).length || 8)
    : value;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid var(--border2)',
    borderRadius: 'var(--r)', fontSize: 12, fontFamily: 'var(--font)',
    background: isDisabled ? 'var(--surface2)' : 'var(--surface)',
    color: resolved.is_masked ? 'var(--ink4)' : 'var(--ink)',
    outline: 'none',
  };

  const options = field.dynamic_source && field.dynamic_source !== 'custom'
    ? (dynOptions || []).map(o => ({ label: String(o.label), value: String(o.value) }))
    : (field.options || []);

  const handleChange = (v: any) => {
    if (!isDisabled) onChange(field_key, v);
  };

  const renderInput = () => {
    if (resolved.is_masked) {
      return <input type="password" value={displayValue || ''} disabled={true} style={inputStyle} />;
    }

    switch (field_type) {
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={e => handleChange(e.target.value)}
            disabled={isDisabled}
            placeholder={field.placeholder || ''}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font)' }}
          />
        );

      case 'select':
      case 'multi_select':
        return (
          <select
            value={value || ''}
            onChange={e => handleChange(e.target.value)}
            disabled={isDisabled}
            style={inputStyle}
          >
            <option value="">{field.placeholder || `— Select ${field.label} —`}</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
            {options.map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: isDisabled ? 'default' : 'pointer' }}>
                <input type="radio" name={field_key} value={opt.value} checked={value === opt.value}
                  onChange={() => handleChange(opt.value)} disabled={isDisabled}
                  style={{ accentColor: 'var(--blue)', width: 14, height: 14 }} />
                {opt.label}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        if (options.length > 0) {
          const checked: string[] = Array.isArray(value) ? value : [];
          return (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
              {options.map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: isDisabled ? 'default' : 'pointer' }}>
                  <input type="checkbox" checked={checked.includes(opt.value)}
                    onChange={e => {
                      const next = e.target.checked
                        ? [...checked, opt.value]
                        : checked.filter(v => v !== opt.value);
                      handleChange(next);
                    }}
                    disabled={isDisabled}
                    style={{ accentColor: 'var(--blue)', width: 14, height: 14 }} />
                  {opt.label}
                </label>
              ))}
            </div>
          );
        }
        return (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: isDisabled ? 'default' : 'pointer', marginTop: 4 }}>
            <input type="checkbox" checked={!!value} onChange={e => handleChange(e.target.checked)}
              disabled={isDisabled} style={{ accentColor: 'var(--blue)', width: 14, height: 14 }} />
            {field.label}
          </label>
        );

      case 'date':
      case 'datetime':
        return (
          <input type={field_type === 'datetime' ? 'datetime-local' : 'date'}
            value={value || ''}
            onChange={e => handleChange(e.target.value)}
            disabled={isDisabled}
            style={inputStyle}
          />
        );

      case 'file':
      case 'image':
        return (
          <input type="file"
            accept={field_type === 'image' ? 'image/*' : '*'}
            onChange={e => handleChange(e.target.files?.[0] || null)}
            disabled={isDisabled}
            style={{ ...inputStyle, padding: '6px 10px' }}
          />
        );

      case 'password':
        return <input type="password" value={value || ''} onChange={e => handleChange(e.target.value)} disabled={isDisabled} placeholder={field.placeholder || ''} style={inputStyle} />;

      case 'email':
        return <input type="email" value={value || ''} onChange={e => handleChange(e.target.value)} disabled={isDisabled} placeholder={field.placeholder || ''} style={inputStyle} />;

      case 'phone':
        return <input type="tel" value={value || ''} onChange={e => handleChange(e.target.value)} disabled={isDisabled} placeholder={field.placeholder || '+91 9999999999'} style={inputStyle} />;

      case 'url':
        return <input type="url" value={value || ''} onChange={e => handleChange(e.target.value)} disabled={isDisabled} placeholder={field.placeholder || 'https://'} style={inputStyle} />;

      case 'number':
      case 'currency':
      case 'percentage':
        return (
          <div style={{ position: 'relative' }}>
            {field_type === 'currency' && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--ink4)' }}>₹</span>}
            {field_type === 'percentage' && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--ink4)' }}>%</span>}
            <input type="number"
              value={value ?? ''}
              onChange={e => handleChange(e.target.value)}
              disabled={isDisabled}
              placeholder={field.placeholder || ''}
              style={{ ...inputStyle, paddingLeft: field_type === 'currency' ? 24 : 10, paddingRight: field_type === 'percentage' ? 28 : 10 }}
            />
          </div>
        );

      default:
        return <input type="text" value={value || ''} onChange={e => handleChange(e.target.value)} disabled={isDisabled} placeholder={field.placeholder || ''} style={inputStyle} />;
    }
  };

  return (
    <div style={{ width: `${field.width || 100}%`, paddingRight: field.width < 100 ? 12 : 0, marginBottom: 14 }}>
      {field_type !== 'checkbox' && (
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink3)', marginBottom: 5 }}>
          {field.label}
          {field.is_required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
          {resolved.is_masked && <span style={{ fontSize: 9, color: 'var(--amber)', background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)', borderRadius: 3, padding: '1px 4px', marginLeft: 6, fontWeight: 700 }}>MASKED</span>}
        </label>
      )}
      {renderInput()}
      {field.help_text && (
        <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 4, lineHeight: 1.5 }}>{field.help_text}</div>
      )}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ sections, currentStep }: { sections: string[]; currentStep: number }) {
  if (sections.length <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
      {sections.map((sec, i) => (
        <div key={sec} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: i < currentStep ? 'var(--green)' : i === currentStep ? 'var(--blue)' : 'var(--surface2)',
              border: `2px solid ${i <= currentStep ? (i < currentStep ? 'var(--green)' : 'var(--blue)') : 'var(--border2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              color: i <= currentStep ? '#fff' : 'var(--ink4)',
              transition: 'all .2s',
            }}>
              {i < currentStep ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: 10, fontWeight: i === currentStep ? 600 : 400, color: i === currentStep ? 'var(--blue)' : 'var(--ink4)', marginTop: 4, textAlign: 'center', maxWidth: 80 }}>
              {sec}
            </div>
          </div>
          {i < sections.length - 1 && (
            <div style={{ height: 2, flex: 1, background: i < currentStep ? 'var(--green)' : 'var(--border)', marginTop: -16, transition: 'background .2s' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MultiStepForm({
  formId, roleId, initialValues = {}, onSubmit, onCancel,
  submitLabel = 'Submit', isSubmitting = false, readOnly = false,
}: MultiStepFormProps) {

  const { data: resolvedFields = [], isLoading } = useQuery({
    queryKey: ['resolved-form', formId, roleId],
    queryFn:  () => apiClient.get<any,any>(`/rbac/forms/${formId}/resolve?role_id=${roleId}`),
    select:   (r:any) => (r.data as ResolvedField[]).filter(f => f.resolved.can_view),
    enabled:  !!formId && !!roleId,
  });

  const [values, setValues]   = useState<Record<string,any>>(initialValues);
  const [step, setStep]       = useState(0);
  const [errors, setErrors]   = useState<Record<string,string>>({});

  useEffect(() => { setValues(v => ({ ...initialValues, ...v })); }, []);

  // Group fields by section — order preserved
  const sections = useMemo(() => {
    const map = new Map<string, ResolvedField[]>();
    for (const f of resolvedFields) {
      const sec = f.section || 'General';
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(f);
    }
    return [...map.entries()];
  }, [resolvedFields]);

  const sectionNames  = sections.map(([name]) => name);
  const isMultiStep   = sectionNames.length > 1;
  const currentFields = sections[step]?.[1] || [];
  const isLastStep    = step === sectionNames.length - 1;

  const handleChange = (key: string, val: any) => {
    setValues(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => { const n = {...prev}; delete n[key]; return n; });
  };

  const validate = (fields: ResolvedField[]): boolean => {
    const errs: Record<string,string> = {};
    for (const f of fields) {
      if (f.is_required && f.resolved.can_edit) {
        const v = values[f.field_key];
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
          errs[f.field_key] = `${f.label} is required`;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validate(currentFields)) return;
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!validate(currentFields)) return;
    await onSubmit(values);
  };

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink4)' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
        <div>Loading form…</div>
      </div>
    );
  }

  if (resolvedFields.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink4)' }}>
        <div>No fields visible for your role.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Step indicator */}
      <StepIndicator sections={sectionNames} currentStep={step} />

      {/* Section heading */}
      {isMultiStep && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{sectionNames[step]}</div>
          <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>Step {step + 1} of {sectionNames.length}</div>
        </div>
      )}

      {/* Fields — flex wrap respects width% */}
      <div style={{ display: 'flex', flexWrap: 'wrap', margin: '0 -6px' }}>
        {currentFields.map(field => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={values[field.field_key]}
            onChange={handleChange}
            readOnly={readOnly}
          />
        ))}
      </div>

      {/* Validation errors */}
      {Object.keys(errors).length > 0 && (
        <div style={{ background: 'var(--red-lt)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>
          {Object.values(errors).map((e, i) => <div key={i}>⚠ {e}</div>)}
        </div>
      )}

      {/* Navigation */}
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div>
            {step > 0 && (
              <button className="btn btn-sec" onClick={handleBack}>← Back</button>
            )}
            {onCancel && step === 0 && (
              <button className="btn btn-sec" onClick={onCancel}>Cancel</button>
            )}
          </div>
          <div>
            {!isLastStep ? (
              <button className="btn btn-pri" onClick={handleNext}>
                Next: {sectionNames[step + 1]} →
              </button>
            ) : (
              <button className="btn btn-pri" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : submitLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
