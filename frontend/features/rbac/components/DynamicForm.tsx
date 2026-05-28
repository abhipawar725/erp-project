'use client';
import {
  useState, useCallback, useEffect, useRef, useMemo,
  type ChangeEvent,
} from 'react';
import type { DynamicField, FieldOption, FieldPermissionEntry } from '../types/rbac.types';
import { FIELD_TYPE_ICONS, FIELD_TYPE_LABELS } from '../types/rbac.types';
import { maskValue, validateForm, buildDefaultValues, type ValidationErrors } from '../../../utils/validationEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DynamicFormProps {
  /** Fields including resolved permission flags */
  fields:       DynamicField[];
  /** Initial/existing values (e.g. loaded from API) */
  initialValues?: Record<string, unknown>;
  /** Called on valid submit */
  onSubmit?:    (values: Record<string, unknown>) => void | Promise<void>;
  /** Called on every change — for controlled external usage */
  onChange?:    (key: string, value: unknown, allValues: Record<string, unknown>) => void;
  /** Read-only display mode (view-only, no editing) */
  readOnly?:    boolean;
  /** Show field permission badges */
  showPermBadges?: boolean;
  /** Label for submit button */
  submitLabel?: string;
  /** Whether to show the submit button */
  showSubmit?:  boolean;
  /** Extra class/style for the form wrapper */
  className?:  string;
}

// ─── Section grouper ──────────────────────────────────────────────────────────

function groupBySection(fields: DynamicField[]): Map<string, DynamicField[]> {
  const map = new Map<string, DynamicField[]>();
  for (const f of fields) {
    const section = f.section || '';
    const arr = map.get(section) || [];
    arr.push(f);
    map.set(section, arr);
  }
  return map;
}

// ─── Permission badge ─────────────────────────────────────────────────────────

function PermBadge({ resolved }: { resolved: FieldPermissionEntry }) {
  const flags = [
    resolved.can_view     && { label:'V', color:'var(--blue)'   },
    resolved.can_edit     && { label:'E', color:'var(--green)'  },
    resolved.can_copy     && { label:'C', color:'var(--teal)'   },
    resolved.can_download && { label:'D', color:'var(--purple)' },
    resolved.is_masked    && { label:'M', color:'var(--amber)'  },
  ].filter(Boolean) as { label: string; color: string }[];

  if (!flags.length) return null;

  return (
    <div style={{ display:'flex', gap:3 }}>
      {flags.map(f => (
        <span key={f.label} style={{
          width:16, height:16, borderRadius:3, background: f.color, color:'#fff',
          fontSize:8, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {f.label}
        </span>
      ))}
    </div>
  );
}

// ─── Individual field renderers ───────────────────────────────────────────────

interface FieldProps {
  field:       DynamicField;
  value:       unknown;
  onChange:    (v: unknown) => void;
  error?:      string;
  readOnly?:   boolean;
  showPermBadges?: boolean;
}

function FieldWrapper({ field, error, showPermBadges, children }: {
  field: DynamicField; error?: string; showPermBadges?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="fg" style={{ gridColumn: field.field_type === 'textarea' ? '1 / -1' : undefined }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
        <label style={{ flex:1 }}>
          {field.label}
          {field.is_required && <span style={{ color:'var(--red)', marginLeft:3 }}>*</span>}
        </label>
        {showPermBadges && field.resolved && <PermBadge resolved={field.resolved} />}
        <span style={{ fontSize:9, color:'var(--ink4)', fontFamily:'monospace' }}>
          {FIELD_TYPE_ICONS[field.field_type]}
        </span>
      </div>
      {children}
      {field.help_text && !error && (
        <span style={{ fontSize:11, color:'var(--ink4)', marginTop:2 }}>{field.help_text}</span>
      )}
      {error && <span className="err">{error}</span>}
    </div>
  );
}

function RenderField({ field, value, onChange, error, readOnly, showPermBadges }: FieldProps) {
  const perm   = field.resolved;
  const isEdit = !readOnly && (!perm || perm.can_edit);
  const isView = !perm || perm.can_view;
  const masked = perm?.is_masked;

  // If no view permission — render nothing
  if (!isView) return null;

  const strVal  = value != null ? String(value) : '';
  const numVal  = value != null && value !== '' ? Number(value) : '';

  // Apply mask to displayed value
  const displayVal = masked && strVal ? maskValue(strVal, field.field_key) : strVal;

  const commonProps = {
    disabled: !isEdit,
    className: error ? 'er' : '',
    placeholder: field.placeholder || '',
    style: { opacity: !isEdit ? .7 : 1 } as React.CSSProperties,
  };

  switch (field.field_type) {
    // ── Text variants ──────────────────────────────────────────────────────
    case 'text':
    case 'phone':
    case 'url':
      return (
        <FieldWrapper field={field} error={error} showPermBadges={showPermBadges}>
          <input type="text" value={masked ? displayVal : strVal} onChange={e => onChange(e.target.value)} {...commonProps} />
        </FieldWrapper>
      );

    case 'email':
      return (
        <FieldWrapper field={field} error={error} showPermBadges={showPermBadges}>
          <input type="email" value={strVal} onChange={e => onChange(e.target.value)} {...commonProps} />
        </FieldWrapper>
      );

    case 'password':
      return (
        <FieldWrapper field={field} error={error} showPermBadges={showPermBadges}>
          <input type={isEdit ? 'password' : 'text'} value={masked ? '••••••••' : strVal} onChange={e => onChange(e.target.value)} {...commonProps} />
        </FieldWrapper>
      );

    case 'textarea':
      return (
        <FieldWrapper field={field} error={error} showPermBadges={showPermBadges}>
          <textarea rows={3} value={strVal} onChange={e => onChange(e.target.value)} {...commonProps} />
        </FieldWrapper>
      );

    // ── Numeric ────────────────────────────────────────────────────────────
    case 'number':
      return (
        <FieldWrapper field={field} error={error} showPermBadges={showPermBadges}>
          <input type="number" value={numVal} onChange={e => onChange(e.target.value)} {...commonProps}
            min={field.min_value ?? undefined} max={field.max_value ?? undefined} />
        </FieldWrapper>
      );

    case 'currency':
      return (
        <FieldWrapper field={field} error={error} showPermBadges={showPermBadges}>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'var(--ink4)', pointerEvents:'none' }}>₹</span>
            <input type="number" value={masked ? '' : numVal} onChange={e => onChange(e.target.value)} {...commonProps}
              style={{ ...commonProps.style, paddingLeft:26 }}
              placeholder={masked ? '•••••••' : field.placeholder || '0'} />
          </div>
        </FieldWrapper>
      );

    case 'percentage':
      return (
        <FieldWrapper field={field} error={error} showPermBadges={showPermBadges}>
          <div style={{ position:'relative' }}>
            <input type="number" min="0" max="100" step="0.1" value={numVal} onChange={e => onChange(e.target.value)} {...commonProps}
              style={{ ...commonProps.style, paddingRight:30 }} />
            <span style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'var(--ink4)', pointerEvents:'none' }}>%</span>
          </div>
        </FieldWrapper>
      );

    // ── Date ───────────────────────────────────────────────────────────────
    case 'date':
      return (
        <FieldWrapper field={field} error={error} showPermBadges={showPermBadges}>
          <input type="date" value={strVal} onChange={e => onChange(e.target.value)} {...commonProps} />
        </FieldWrapper>
      );

    case 'datetime':
      return (
        <FieldWrapper field={field} error={error} showPermBadges={showPermBadges}>
          <input type="datetime-local" value={strVal} onChange={e => onChange(e.target.value)} {...commonProps} />
        </FieldWrapper>
      );

    // ── Select ─────────────────────────────────────────────────────────────
    case 'select': {
      const opts = field.options || [];
      return (
        <FieldWrapper field={field} error={error} showPermBadges={showPermBadges}>
          <select value={strVal} onChange={e => onChange(e.target.value)} {...commonProps}>
            <option value="">{field.placeholder || `— Select ${field.label} —`}</option>
            {opts.filter(o => o.is_active !== false).map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FieldWrapper>
      );
    }

    // ── Multi-select ───────────────────────────────────────────────────────
    case 'multi_select': {
      const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
      const opts = field.options || [];
      const toggle = (v: string) => {
        const next = selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v];
        onChange(next);
      };
      return (
        <FieldWrapper field={field} error={error} showPermBadges={showPermBadges}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {opts.filter(o => o.is_active !== false).map(o => {
              const on = selected.includes(o.value);
              return (
                <button key={o.value} type="button" disabled={!isEdit}
                  onClick={() => toggle(o.value)}
                  style={{ padding:'5px 12px', borderRadius:99, fontSize:12, cursor: isEdit ? 'pointer' : 'default', border:`1px solid ${on?'var(--blue)':'var(--border)'}`, background: on?'var(--blue)':'var(--surface2)', color: on?'#fff':'var(--ink3)', fontFamily:'var(--font)', transition:'all .1s' }}>
                  {o.label}
                </button>
              );
            })}
          </div>
        </FieldWrapper>
      );
    }

    // ── Radio ──────────────────────────────────────────────────────────────
    case 'radio': {
      const opts = field.options || [];
      return (
        <FieldWrapper field={field} error={error} showPermBadges={showPermBadges}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
            {opts.filter(o => o.is_active !== false).map(o => (
              <label key={o.value} style={{ display:'flex', alignItems:'center', gap:6, cursor: isEdit ? 'pointer' : 'default', fontSize:12 }}>
                <input type="radio" name={field.field_key} value={o.value} checked={strVal === o.value}
                  onChange={e => onChange(e.target.value)} disabled={!isEdit}
                  style={{ accentColor:'var(--blue)', cursor: isEdit ? 'pointer' : 'default' }} />
                {o.label}
              </label>
            ))}
          </div>
        </FieldWrapper>
      );
    }

    // ── Checkbox ───────────────────────────────────────────────────────────
    case 'checkbox': {
      const checked = value === true || value === 'true';
      return (
        <div className="fg">
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor: isEdit ? 'pointer' : 'default', fontSize:13 }}>
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} disabled={!isEdit}
              style={{ width:15, height:15, accentColor:'var(--blue)', cursor: isEdit ? 'pointer' : 'default' }} />
            {field.label}
            {field.is_required && <span style={{ color:'var(--red)' }}>*</span>}
          </label>
          {field.help_text && <span style={{ fontSize:11, color:'var(--ink4)', paddingLeft:23 }}>{field.help_text}</span>}
          {error && <span className="err">{error}</span>}
        </div>
      );
    }

    // ── File / Image ───────────────────────────────────────────────────────
    case 'file':
    case 'image': {
      const fileRef = useRef<HTMLInputElement>(null);
      const [preview, setPreview] = useState<string>('');

      const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        onChange(f);
        if (field.field_type === 'image' && f.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => setPreview(reader.result as string);
          reader.readAsDataURL(f);
        }
      };

      return (
        <FieldWrapper field={field} error={error} showPermBadges={showPermBadges}>
          {!isEdit ? (
            <div style={{ fontSize:12, color:'var(--ink4)', padding:'8px', background:'var(--surface2)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
              {strVal ? `📎 File uploaded` : '—'}
            </div>
          ) : (
            <div
              style={{ border:'2px dashed var(--border2)', borderRadius:'var(--r2)', padding:'16px', textAlign:'center', cursor:'pointer', background:'var(--bg)' }}
              onClick={() => fileRef.current?.click()}>
              {preview
                ? <img src={preview} alt="preview" style={{ maxHeight:80, maxWidth:'100%', borderRadius:'var(--r)', marginBottom:6, display:'block', margin:'0 auto 6px' }} />
                : <div style={{ fontSize:24, marginBottom:6 }}>{field.field_type === 'image' ? '🖼' : '📎'}</div>
              }
              <div style={{ fontSize:12, color:'var(--ink4)' }}>
                {value && typeof value === 'object' ? (value as File).name : 'Click to upload'}
              </div>
              <input ref={fileRef} type="file" accept={field.field_type === 'image' ? 'image/*' : undefined}
                style={{ display:'none' }} onChange={handleFile} />
            </div>
          )}
        </FieldWrapper>
      );
    }

    default:
      return (
        <FieldWrapper field={field} error={error} showPermBadges={showPermBadges}>
          <input type="text" value={strVal} onChange={e => onChange(e.target.value)} {...commonProps} />
        </FieldWrapper>
      );
  }
}

// ─── Main DynamicForm component ───────────────────────────────────────────────

export function DynamicForm({
  fields,
  initialValues = {},
  onSubmit,
  onChange,
  readOnly = false,
  showPermBadges = false,
  submitLabel = 'Submit',
  showSubmit = true,
  className,
}: DynamicFormProps) {
  // Active, visible fields sorted by sort_order
  const visibleFields = useMemo(() =>
    fields
      .filter(f => f.is_active && (readOnly || !f.is_hidden || f.resolved?.can_view))
      .sort((a, b) => a.sort_order - b.sort_order),
    [fields, readOnly],
  );

  // Values state
  const [values, setValues] = useState<Record<string, unknown>>(() => ({
    ...buildDefaultValues(visibleFields),
    ...initialValues,
  }));

  const [errors,      setErrors]      = useState<ValidationErrors>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  // Sync if initialValues change (e.g. loaded from API after mount)
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      setValues(prev => ({ ...buildDefaultValues(visibleFields), ...prev, ...initialValues }));
    }
  }, [JSON.stringify(initialValues)]);

  const handleChange = useCallback((key: string, value: unknown) => {
    setValues(prev => {
      const next = { ...prev, [key]: value };
      onChange?.(key, value, next);
      return next;
    });
    // Clear error for this field on change
    setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  }, [onChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { success, errors: errs } = validateForm(visibleFields, values);
    if (!success) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      await onSubmit?.(values);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
    } finally {
      setSubmitting(false);
    }
  };

  // Group by section
  const sections = groupBySection(visibleFields);

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      {Array.from(sections.entries()).map(([section, sectionFields]) => (
        <div key={section || '__default__'} style={{ marginBottom:20 }}>
          {section && (
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink4)', paddingBottom:8, borderBottom:'1px solid var(--border)', marginBottom:14 }}>
              {section}
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'0 20px' }}>
            {sectionFields.map(field => (
              <RenderField
                key={field.id}
                field={field}
                value={values[field.field_key]}
                onChange={v => handleChange(field.field_key, v)}
                error={errors[field.field_key]}
                readOnly={readOnly || field.is_readonly}
                showPermBadges={showPermBadges}
              />
            ))}
          </div>
        </div>
      ))}

      {showSubmit && !readOnly && (
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:8 }}>
          <button
            type="submit"
            className="btn btn-pri"
            disabled={submitting}
            style={{ display:'flex', alignItems:'center', gap:7 }}
          >
            {submitting && (
              <span style={{ width:13, height:13, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin .65s linear infinite' }} />
            )}
            {submitted ? '✓ Saved!' : submitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </form>
  );
}

// ─── Read-only display component ──────────────────────────────────────────────

export function DynamicFormDisplay({
  fields,
  values,
  showPermBadges = false,
}: {
  fields: DynamicField[];
  values: Record<string, unknown>;
  showPermBadges?: boolean;
}) {
  return (
    <DynamicForm
      fields={fields}
      initialValues={values}
      readOnly
      showSubmit={false}
      showPermBadges={showPermBadges}
    />
  );
}
