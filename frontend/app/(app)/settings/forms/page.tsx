'use client';
import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';import { useRouter }          from 'next/navigation';
import { useAppDispatch }      from '../../../../store';
import { setPageTitle }        from '../../../../store/slices/uiSlice';
import { AppShell }            from '../../../../layouts/AppLayout';
import { Modal }               from '../../../../components/ui/Modal';
import { Chip }                from '../../../../components/ui/Chip';
import {
  useModules, useCreateModule, useUpdateModule, useDeleteModule,
  useForms, useCreateForm, useUpdateForm, useDeleteForm,
  useForm, useCreateField, useUpdateField, useDeleteField,
} from '../../../../hooks/useRbac';
import {FIELD_TYPE_LABELS, FIELD_TYPE_ICONS, FIELD_CATEGORIES,
  type HrModule, type FormDefinition, type DynamicField, type CreateFieldDto, type FieldType,
} from '../../../../features/rbac/types/rbac.types';
import { usePermission }    from '../../../../features/auth/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient            from '../../../../services/api/client';
import { showToast }        from '../../../../utils/toast';

// ─── Types ────────────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { type:'text',         label:'Text Input',     icon:'T',  group:'Text'   },
  { type:'email',        label:'Email',           icon:'@',  group:'Text'   },
  { type:'number',       label:'Number',          icon:'#',  group:'Number' },
  { type:'password',     label:'Password',        icon:'🔒', group:'Other'  },
  { type:'textarea',     label:'Text Area',       icon:'¶',  group:'Text'   },
  { type:'select',       label:'Dropdown',        icon:'▾',  group:'Choice' },
  { type:'multi_select', label:'Multi Select',    icon:'☑',  group:'Choice' },
  { type:'radio',        label:'Radio',           icon:'◉',  group:'Choice' },
  { type:'checkbox',     label:'Checkbox',        icon:'✓',  group:'Choice' },
  { type:'date',         label:'Date',            icon:'📅', group:'Date'   },
  { type:'datetime',     label:'Date & Time',     icon:'🕐', group:'Date'   },
  { type:'file',         label:'File Upload',     icon:'📎', group:'Media'  },
  { type:'image',        label:'Image Upload',    icon:'🖼', group:'Media'  },
  { type:'phone',        label:'Phone',           icon:'☎',  group:'Text'   },
  { type:'url',          label:'URL',             icon:'🔗', group:'Other'  },
  { type:'currency',     label:'Currency',        icon:'₹',  group:'Number' },
  { type:'percentage',   label:'Percentage',      icon:'%',  group:'Number' },
] as const;

const DYNAMIC_SOURCES = [
  { key:'departments',      label:'Departments'      },
  { key:'designations',     label:'Designations'     },
  { key:'employees',        label:'Employees'        },
  { key:'roles',            label:'Roles'            },
  { key:'leave_types',      label:'Leave Types'      },
  { key:'asset_categories', label:'Asset Categories' },
  { key:'custom',           label:'Custom Options'   },
];

const WIDTH_OPTS = [
  { v:25,  l:'25%'  },
  { v:33,  l:'33%'  },
  { v:50,  l:'50%'  },
  { v:66,  l:'66%'  },
  { v:75,  l:'75%'  },
  { v:100, l:'100%' },
];

const PERM_FLAGS = ['can_view','can_edit','can_copy','can_download','is_masked'] as const;
const PERM_ICONS: Record<string,string> = { can_view:'👁', can_edit:'✏️', can_copy:'⎘', can_download:'⬇', is_masked:'⬛' };

interface Module  { id:number; name:string; slug:string; icon:string; description:string; is_system:boolean; forms?:Form[]; }
interface Form    { id:number; name:string; slug:string; description:string; is_active:boolean; }
interface Field   {
  id:number; form_id:number; field_type:string; label:string; field_key:string;
  section:string|null; placeholder:string|null; help_text:string|null;
  is_required:boolean; is_readonly:boolean; is_hidden:boolean; is_active:boolean;
  sort_order:number; width:number; column_span:number;
  dynamic_source:string|null; dynamic_source_label:string|null;
  dynamic_source_value:string|null; dynamic_source_filter:string|null;
  min_length:number|null; max_length:number|null;
  options?:{id:number;label:string;value:string;sort_order:number}[];
}
interface Role    { id:number; name:string; slug:string; }

// ─── API ──────────────────────────────────────────────────────────────────────

const api = {
  modules:      () => apiClient.get<any,any>('/rbac/modules'),
  createModule: (d:any) => apiClient.post<any,any>('/rbac/modules', d),
  updateModule: (id:number,d:any) => apiClient.put<any,any>(`/rbac/modules/${id}`, d),
  deleteModule: (id:number) => apiClient.delete<any,any>(`/rbac/modules/${id}`),
  forms:        (mId:number) => apiClient.get<any,any>(`/rbac/modules/${mId}/forms`),
  createForm:   (mId:number,d:any) => apiClient.post<any,any>(`/rbac/modules/${mId}/forms`, d),
  updateForm:   (id:number,d:any) => apiClient.put<any,any>(`/rbac/forms/${id}`, d),
  deleteForm:   (id:number) => apiClient.delete<any,any>(`/rbac/forms/${id}`),
  formDetail:   (id:number) => apiClient.get<any,any>(`/rbac/forms/${id}`),
  createField:  (fId:number,d:any) => apiClient.post<any,any>(`/rbac/forms/${fId}/fields`, d),
  updateField:  (id:number,d:any) => apiClient.put<any,any>(`/rbac/fields/${id}`, d),
  deleteField:  (id:number) => apiClient.delete<any,any>(`/rbac/fields/${id}`),
  reorder:      (fId:number,order:any) => apiClient.put<any,any>(`/rbac/forms/${fId}/reorder`, { order }),
  matrix:       (fId:number) => apiClient.get<any,any>(`/rbac/forms/${fId}/permission-matrix`),
  bulkPerm:     (fId:number,rId:number,perms:any) => apiClient.post<any,any>('/rbac/permissions/bulk', { role_id:rId, permissions:perms }),
  roles:        () => apiClient.get<any,any>('/rbac/roles'),
  dynSource:    (src:string) => apiClient.get<any,any>(`/rbac/dynamic-source/${src}`),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fieldTypeInfo(type:string) {
  return FIELD_TYPES.find(f => f.type === type) || { icon:'?', label: type, group:'Other' };
}

function generateKey(label:string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,50) || 'field';
}

// ─── Field Editor Modal ───────────────────────────────────────────────────────

function FieldEditor({ field, formId, companyId, onClose }: {
  field: Partial<Field> | null;
  formId: number;
  companyId?: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isNew = !field?.id;

  const [f, setF] = useState({
    field_type:            field?.field_type     || 'text',
    label:                 field?.label          || '',
    field_key:             field?.field_key       || '',
    section:               field?.section         || '',
    placeholder:           field?.placeholder     || '',
    help_text:             field?.help_text        || '',
    is_required:           field?.is_required      ?? false,
    is_readonly:           field?.is_readonly      ?? false,
    is_hidden:             field?.is_hidden         ?? false,
    width:                 field?.width             ?? 100,
    dynamic_source:        field?.dynamic_source    || '',
    dynamic_source_label:  field?.dynamic_source_label  || 'name',
    dynamic_source_value:  field?.dynamic_source_value  || 'id',
    dynamic_source_filter: field?.dynamic_source_filter || '',
    min_length:            field?.min_length  ?? '',
    max_length:            field?.max_length  ?? '',
    options: (field?.options || []).map(o => ({ ...o })),
  });

  const [activeTab, setActiveTab] = useState<'basic'|'validation'|'options'>('basic');
  const isChoiceType = ['select','multi_select','radio','checkbox'].includes(f.field_type);
  const hasDynSource = f.dynamic_source && f.dynamic_source !== '' && f.dynamic_source !== 'custom';

  const F = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setF(p => ({...p, [k]: e.target.value}));
  const FB = (k:string) => (e:React.ChangeEvent<HTMLInputElement>) =>
    setF(p => ({...p, [k]: e.target.checked}));

  const autoKey = () => {
    if (isNew && f.label) setF(p => ({...p, field_key: generateKey(f.label)}));
  };

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        ...f,
        dynamic_source: f.dynamic_source || null,
        dynamic_source_label:  f.dynamic_source ? f.dynamic_source_label  : null,
        dynamic_source_value:  f.dynamic_source ? f.dynamic_source_value  : null,
        dynamic_source_filter: f.dynamic_source ? f.dynamic_source_filter : null,
        min_length: f.min_length !== '' ? Number(f.min_length) : null,
        max_length: f.max_length !== '' ? Number(f.max_length) : null,
        section: f.section || null,
        options: isChoiceType && (!hasDynSource) ? f.options : undefined,
      };
      return isNew ? api.createField(formId, body) : api.updateField(field!.id!, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['form-detail', formId] });
      showToast(`✓ Field ${isNew ? 'created' : 'updated'}`);
      onClose();
    },
    onError: (e:any) => showToast(e?.message || 'Failed'),
  });

  const addOption = () => setF(p => ({...p, options: [...p.options, { id: -Date.now(), label:'', value:'', sort_order: p.options.length }]}));
  const removeOption = (i:number) => setF(p => ({...p, options: p.options.filter((_,idx) => idx !== i)}));
  const updateOption = (i:number, k:string, v:string) => setF(p => ({ ...p, options: p.options.map((o,idx) => idx===i ? {...o,[k]:v} : o) }));

  const TAB_BTN = (id:'basic'|'validation'|'options', label:string) => (
    <button onClick={() => setActiveTab(id)}
      style={{ padding:'6px 14px', border:'none', background:'transparent', cursor:'pointer', fontFamily:'var(--font)', fontSize:12, fontWeight: activeTab===id ? 600 : 400, color: activeTab===id ? 'var(--blue)' : 'var(--ink4)', borderBottom: activeTab===id ? '2px solid var(--blue)' : '2px solid transparent' }}>
      {label}
    </button>
  );

  return (
    <Modal open={true} onClose={onClose} title={isNew ? 'Add Field' : `Edit: ${field?.label}`} width={520}
      footer={<>
        <button className="btn btn-sec" onClick={onClose}>Cancel</button>
        <button className="btn btn-pri" onClick={() => mutation.mutate()} disabled={!f.label || !f.field_key || mutation.isPending}>
          {mutation.isPending ? 'Saving…' : `✓ ${isNew ? 'Add Field' : 'Save Changes'}`}
        </button>
      </>}>

      {/* Tab bar */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:16, marginTop:-4 }}>
        {TAB_BTN('basic','Basic')}
        {TAB_BTN('validation','Validation')}
        {isChoiceType && TAB_BTN('options','Options')}
      </div>

      {/* ── Basic tab ────────────────────────────────── */}
      {activeTab === 'basic' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <div className="fg" style={{ gridColumn:'1/-1' }}>
              <label>Field Type</label>
              <select value={f.field_type} onChange={F('field_type')}>
                {['Text','Number','Date','Choice','Media','Other'].map(g => (
                  <optgroup key={g} label={g}>
                    {FIELD_TYPES.filter(t => t.group===g).map(t => (
                      <option key={t.type} value={t.type}>{t.icon} {t.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="fg">
              <label>Label *</label>
              <input value={f.label} onChange={F('label')} onBlur={autoKey} placeholder="e.g. Date of Birth" autoFocus />
            </div>
            <div className="fg">
              <label>Field Key *</label>
              <input value={f.field_key} onChange={F('field_key')} placeholder="auto-generated" style={{ fontFamily:'var(--mono)', fontSize:11 }} />
            </div>
            <div className="fg">
              <label>Section</label>
              <input value={f.section} onChange={F('section')} placeholder="e.g. Personal, Address" />
            </div>
            <div className="fg">
              <label>Width</label>
              <select value={f.width} onChange={F('width')}>
                {WIDTH_OPTS.map(w => <option key={w.v} value={w.v}>{w.l}</option>)}
              </select>
            </div>
            <div className="fg" style={{ gridColumn:'1/-1' }}>
              <label>Placeholder</label>
              <input value={f.placeholder} onChange={F('placeholder')} />
            </div>
            <div className="fg" style={{ gridColumn:'1/-1' }}>
              <label>Help Text</label>
              <input value={f.help_text} onChange={F('help_text')} placeholder="Shown below the field" />
            </div>
          </div>

          {/* Dynamic source for choice fields */}
          {isChoiceType && (
            <div style={{ marginTop:8, padding:'12px', background:'var(--blue-lt)', border:'1px solid var(--blue-md)', borderRadius:'var(--r)', marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--blue)', marginBottom:8 }}>Dynamic Options Source</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
                <div className="fg">
                  <label>Load options from</label>
                  <select value={f.dynamic_source} onChange={F('dynamic_source')}>
                    <option value="">— Static options —</option>
                    {DYNAMIC_SOURCES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                {f.dynamic_source && f.dynamic_source !== 'custom' && (
                  <>
                    <div className="fg">
                      <label>Label field</label>
                      <input value={f.dynamic_source_label} onChange={F('dynamic_source_label')} placeholder="name" />
                    </div>
                    <div className="fg">
                      <label>Value field</label>
                      <input value={f.dynamic_source_value} onChange={F('dynamic_source_value')} placeholder="id" />
                    </div>
                    <div className="fg">
                      <label>Filter (JSON)</label>
                      <input value={f.dynamic_source_filter} onChange={F('dynamic_source_filter')} placeholder='{"is_active":true}' style={{ fontFamily:'var(--mono)', fontSize:11 }} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Flags */}
          <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginTop:8 }}>
            {[
              { k:'is_required', l:'Required' },
              { k:'is_readonly', l:'Read-only' },
              { k:'is_hidden',   l:'Hidden'   },
            ].map(fl => (
              <label key={fl.k} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}>
                <input type="checkbox" checked={(f as any)[fl.k]} onChange={FB(fl.k)} style={{ accentColor:'var(--blue)', width:14, height:14 }} />
                {fl.l}
              </label>
            ))}
          </div>
        </>
      )}

      {/* ── Validation tab ───────────────────────────── */}
      {activeTab === 'validation' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
          <div className="fg"><label>Min Length</label><input type="number" value={f.min_length} onChange={F('min_length')} /></div>
          <div className="fg"><label>Max Length</label><input type="number" value={f.max_length} onChange={F('max_length')} /></div>
        </div>
      )}

      {/* ── Options tab ──────────────────────────────── */}
      {activeTab === 'options' && isChoiceType && !hasDynSource && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:12, color:'var(--ink4)' }}>Static options — or use Dynamic Source for live data</span>
            <button className="btn btn-sec btn-sm" onClick={addOption}>+ Add</button>
          </div>
          {f.options.map((opt,i) => (
            <div key={opt.id} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
              <input value={opt.label} onChange={e => updateOption(i,'label',e.target.value)} placeholder="Label" style={{ flex:1, fontSize:12 }} />
              <input value={opt.value} onChange={e => updateOption(i,'value',e.target.value)} placeholder="Value" style={{ flex:1, fontSize:12, fontFamily:'var(--mono)' }} />
              <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', fontSize:16, lineHeight:1 }} onClick={() => removeOption(i)}>×</button>
            </div>
          ))}
          {f.options.length === 0 && (
            <div style={{ textAlign:'center', padding:'20px', color:'var(--ink4)', fontSize:12 }}>No options yet — click + Add or switch to Dynamic Source</div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Field Permission Matrix ──────────────────────────────────────────────────

function PermissionMatrix({ formId, onClose }: { formId:number; onClose:()=>void }) {
  const qc = useQueryClient();
  const { data: matrixData, isLoading } = useQuery({
    queryKey: ['perm-matrix', formId],
    queryFn:  () => api.matrix(formId),
    select:   (r:any) => r.data as { roles:Role[]; fields:Field[]; matrix:Record<string,Record<string,any>> },
  });

  const [local, setLocal] = useState<Record<string,Record<string,any>>>({});
  const [dirty, setDirty]  = useState(false);
  const [saving, setSaving] = useState(false);
  const [selRole, setSelRole] = useState<number|null>(null);

  useEffect(() => {
    if (matrixData?.matrix) {
      setLocal(JSON.parse(JSON.stringify(matrixData.matrix)));
      if (!selRole && matrixData.roles.length) setSelRole(matrixData.roles[0].id);
    }
  }, [matrixData]);

  const toggle = (roleId:number, fieldId:number, flag:string) => {
    setLocal(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[roleId]) next[roleId] = {};
      if (!next[roleId][fieldId]) next[roleId][fieldId] = { can_view:false, can_edit:false, can_copy:false, can_download:false, is_masked:false };
      next[roleId][fieldId][flag] = !next[roleId][fieldId][flag];
      return next;
    });
    setDirty(true);
  };

  const grantAll = (roleId:number) => {
    setLocal(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[roleId]) next[roleId] = {};
      for (const f of matrixData?.fields || []) {
        next[roleId][f.id] = { can_view:true, can_edit:true, can_copy:true, can_download:true, is_masked:false };
      }
      return next;
    });
    setDirty(true);
  };

  const revokeAll = (roleId:number) => {
    setLocal(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[roleId]) next[roleId] = {};
      for (const f of matrixData?.fields || []) {
        next[roleId][f.id] = { can_view:false, can_edit:false, can_copy:false, can_download:false, is_masked:false };
      }
      return next;
    });
    setDirty(true);
  };

  const autoMask = (roleId:number) => {
    setLocal(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next[roleId]) next[roleId] = {};
      for (const f of matrixData?.fields || []) {
        if (f.field_type === 'currency' || f.field_type === 'number' || f.label?.toLowerCase().includes('salary') || f.label?.toLowerCase().includes('account') || f.label?.toLowerCase().includes('aadhaar') || f.label?.toLowerCase().includes('pan')) {
          if (!next[roleId][f.id]) next[roleId][f.id] = { can_view:true, can_edit:false, can_copy:false, can_download:false, is_masked:false };
          next[roleId][f.id].is_masked = true;
        }
      }
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    if (!selRole || !matrixData) return;
    setSaving(true);
    try {
      const perms = matrixData.fields.map(f => ({ field_id: f.id, ...(local[selRole]?.[f.id] || { can_view:false, can_edit:false, can_copy:false, can_download:false, is_masked:false }) }));
      await api.bulkPerm(formId, selRole, perms);
      qc.invalidateQueries({ queryKey: ['perm-matrix', formId] });
      showToast('✓ Permissions saved');
      setDirty(false);
    } catch(e:any) { showToast(e?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const fields = matrixData?.fields || [];
  const sections = useMemo(() => {
    const s = new Map<string, Field[]>();
    for (const f of fields) {
      const sec = f.section || 'General';
      if (!s.has(sec)) s.set(sec, []);
      s.get(sec)!.push(f);
    }
    return s;
  }, [fields]);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'var(--surface)', borderRadius:'var(--r3)', width:'100%', maxWidth:900, maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1, fontWeight:700, fontSize:14 }}>Field Permission Matrix</div>
          {dirty && <button className="btn btn-pri btn-sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : '✓ Save Changes'}</button>}
          <button style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--ink4)' }} onClick={onClose}>×</button>
        </div>

        {/* Role selector + actions */}
        <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', background:'var(--surface2)' }}>
          <span style={{ fontSize:11, fontWeight:600, color:'var(--ink4)' }}>Role:</span>
          <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
            {matrixData?.roles.map(r => (
              <button key={r.id} onClick={() => setSelRole(r.id)}
                style={{ padding:'4px 12px', border:`1px solid ${selRole===r.id ? 'var(--blue)' : 'var(--border)'}`, borderRadius:99, fontSize:11, fontWeight: selRole===r.id ? 600 : 400, background: selRole===r.id ? 'var(--blue-lt)' : 'var(--surface)', color: selRole===r.id ? 'var(--blue)' : 'var(--ink3)', cursor:'pointer' }}>
                {r.name}
              </button>
            ))}
          </div>
          {selRole && (
            <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={() => grantAll(selRole)}>✓ Grant All</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={() => revokeAll(selRole)}>✕ Revoke All</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11, color:'var(--amber)' }} onClick={() => autoMask(selRole)}>▮ Auto-Mask Sensitive</button>
            </div>
          )}
        </div>

        {/* Matrix */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
          {isLoading ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--ink4)' }}>Loading matrix…</div>
          ) : fields.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--ink4)' }}>No fields in this form yet</div>
          ) : [...sections.entries()].map(([section, sFields]) => (
            <div key={section} style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink4)', marginBottom:8, padding:'4px 0', borderBottom:'1px solid var(--border)' }}>{section}</div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:'left', padding:'6px 8px', fontSize:10, fontWeight:700, color:'var(--ink4)', textTransform:'uppercase' }}>Field</th>
                    {PERM_FLAGS.map(flag => (
                      <th key={flag} style={{ textAlign:'center', padding:'6px 8px', fontSize:10, fontWeight:700, color:'var(--ink4)', textTransform:'uppercase', whiteSpace:'nowrap' }}>
                        {PERM_ICONS[flag]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sFields.map(field => {
                    const fp = (selRole && local[selRole]?.[field.id]) || { can_view:false, can_edit:false, can_copy:false, can_download:false, is_masked:false };
                    return (
                      <tr key={field.id} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'8px 8px', fontSize:12 }}>
                          <span style={{ fontWeight:500, color:'var(--ink)' }}>{field.label}</span>
                          <span style={{ fontSize:10, color:'var(--ink4)', marginLeft:6, fontFamily:'var(--mono)' }}>{fieldTypeInfo(field.field_type).icon}</span>
                          {field.is_required && <span style={{ fontSize:9, color:'var(--red)', marginLeft:4 }}>REQ</span>}
                        </td>
                        {PERM_FLAGS.map(flag => {
                          const on = !!(fp as any)[flag];
                          const isMask = flag === 'is_masked';
                          return (
                            <td key={flag} style={{ textAlign:'center', padding:'6px 4px' }}>
                              <div onClick={() => selRole && toggle(selRole, field.id, flag)}
                                style={{ width:26, height:26, borderRadius:6, border:`1px solid ${on ? (isMask?'var(--amber)':'var(--blue)') : 'var(--border2)'}`, background: on ? (isMask?'var(--amber-lt)':'var(--blue-lt)') : 'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', cursor: selRole ? 'pointer' : 'default', margin:'0 auto', fontSize:11, color: on ? (isMask?'var(--amber)':'var(--blue)') : 'var(--ink4)', fontWeight:700, transition:'all .1s' }}>
                                {on ? '✓' : ''}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Drag-drop field list ─────────────────────────────────────────────────────

function FieldList({ fields, formId, onEdit, onDelete }: {
  fields: Field[];
  formId: number;
  onEdit: (f:Field) => void;
  onDelete: (id:number) => void;
}) {
  const qc = useQueryClient();
  const dragIdx = useRef<number|null>(null);
  const [items, setItems] = useState<Field[]>(fields);

  useEffect(() => { setItems(fields); }, [fields]);

  const onDragStart = (i:number) => { dragIdx.current = i; };
  const onDragOver  = (e:React.DragEvent, i:number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    setItems(next);
  };
  const onDrop = async () => {
    const order = items.map((f,i) => ({ id: f.id, sort_order: i }));
    await api.reorder(formId, order);
    qc.invalidateQueries({ queryKey: ['form-detail', formId] });
    dragIdx.current = null;
  };

  // Group by section
  const sections = new Map<string, Field[]>();
  for (const f of items) {
    const sec = f.section || 'General';
    if (!sections.has(sec)) sections.set(sec, []);
    sections.get(sec)!.push(f);
  }

  return (
    <div>
      {[...sections.entries()].map(([section, sFields]) => (
        <div key={section} style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink4)', marginBottom:8, padding:'6px 8px', background:'var(--surface2)', borderRadius:'var(--r)' }}>
            {section}
          </div>
          {sFields.map((f, idx) => {
            const info = fieldTypeInfo(f.field_type);
            const globalIdx = items.indexOf(f);
            return (
              <div key={f.id} draggable onDragStart={() => onDragStart(globalIdx)} onDragOver={e => onDragOver(e, globalIdx)} onDrop={onDrop}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r2)', marginBottom:6, cursor:'grab', transition:'box-shadow .1s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--sh)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                <span style={{ color:'var(--ink4)', fontSize:14, flexShrink:0, cursor:'grab' }}>⠿</span>
                <div style={{ width:28, height:28, borderRadius:'var(--r)', background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>{info.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{f.label}</span>
                    {f.is_required && <span style={{ fontSize:9, color:'var(--red)', background:'var(--red-lt)', border:'1px solid var(--red-bd)', borderRadius:3, padding:'1px 4px', fontWeight:700 }}>REQ</span>}
                    {f.dynamic_source && <span style={{ fontSize:9, color:'var(--blue)', background:'var(--blue-lt)', border:'1px solid var(--blue-md)', borderRadius:3, padding:'1px 4px', fontWeight:700 }}>⚡ {f.dynamic_source}</span>}
                    {!f.is_active && <span style={{ fontSize:9, color:'var(--ink4)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:3, padding:'1px 4px' }}>HIDDEN</span>}
                  </div>
                  <div style={{ fontSize:10, color:'var(--ink4)', marginTop:1 }}>
                    {info.label} · <span style={{ fontFamily:'var(--mono)' }}>{f.field_key}</span> · {f.width}%
                  </div>
                </div>
                <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                  <button className="btn btn-sec btn-sm" style={{ fontSize:11 }} onClick={() => onEdit(f)}>✎</button>
                  <button className="btn btn-sec btn-sm" style={{ fontSize:11, color:'var(--red)' }} onClick={() => onDelete(f.id)}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {items.length === 0 && (
        <div style={{ textAlign:'center', padding:'30px', color:'var(--ink4)', border:'2px dashed var(--border)', borderRadius:'var(--r2)', fontSize:12 }}>
          Drag field types from the left panel to add them here
        </div>
      )}
    </div>
  );
}


// ─── Main Form Builder Page ───────────────────────────────────────────────────

export default function FormBuilderPage() {
  const dispatch = useAppDispatch();
  useEffect(() => { dispatch(setPageTitle({ title:'Form Builder', breadcrumb:'Settings' })); }, [dispatch]);

  const qc = useQueryClient();
  const { canView, canCreate, canEdit, canDelete } = usePermission();

  const [selModule,  setSelModule]  = useState<Module|null>(null);
  const [selForm,    setSelForm]    = useState<Form|null>(null);
  const [editField,  setEditField]  = useState<Partial<Field>|null|false>(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [modModal,   setModModal]   = useState(false);
  const [formModal,  setFormModal]  = useState(false);

  // Module CRUD state
  const [modName,  setModName]  = useState('');
  const [modIcon,  setModIcon]  = useState('📋');
  const [modDesc,  setModDesc]  = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');

  // Load modules
  const { data: modules = [], isLoading: modsLoading } = useQuery({
    queryKey: ['fb-modules'],
    queryFn:  () => api.modules(),
    select:   (r:any) => r.data as Module[],
  });

  // Load forms for selected module
  const { data: forms = [] } = useQuery({
    queryKey: ['fb-forms', selModule?.id],
    queryFn:  () => api.forms(selModule!.id),
    enabled:  !!selModule,
    select:   (r:any) => r.data as Form[],
  });

  // Load form detail (fields)
  const { data: formDetail } = useQuery({
    queryKey: ['form-detail', selForm?.id],
    queryFn:  () => api.formDetail(selForm!.id),
    enabled:  !!selForm,
    select:   (r:any) => r.data as { fields: Field[] },
  });

  const fields = formDetail?.fields || [];

  // Mutations
  const createModMut = useMutation({
    mutationFn: () => api.createModule({ name: modName, icon: modIcon, description: modDesc }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['fb-modules'] }); showToast('✓ Module created'); setModModal(false); setModName(''); },
    onError: (e:any) => showToast(e?.message || 'Failed'),
  });
  const createFormMut = useMutation({
    mutationFn: () => api.createForm(selModule!.id, { name: formName, description: formDesc }),
    onSuccess: (r:any) => { qc.invalidateQueries({ queryKey:['fb-forms', selModule?.id] }); showToast('✓ Form created'); setFormModal(false); setFormName(''); setSelForm(r.data); },
    onError: (e:any) => showToast(e?.message || 'Failed'),
  });
  const deleteFieldMut = useMutation({
    mutationFn: (id:number) => api.deleteField(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['form-detail', selForm?.id] }); showToast('Field deleted'); },
    onError: (e:any) => showToast(e?.message || 'Failed'),
  });

  const addFieldOfType = (type:string) => {
    if (!selForm) return;
    setEditField({ field_type: type, form_id: selForm.id });
  };

  return (
    <AppShell>
      <div style={{ display:'flex', height:'calc(100vh - 52px)', overflow:'hidden' }}>

        {/* ── Col 1: Modules ────────────────────────────────────────── */}
        <div style={{ width:220, flexShrink:0, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--surface2)' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--ink4)' }}>Modules</span>
            <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={() => setModModal(true)}>+ Add</button>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {modules.map(m => (
              <div key={m.id} onClick={() => { setSelModule(m); setSelForm(null); }}
                style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)', background: selModule?.id===m.id ? 'var(--blue-lt)' : 'transparent', borderLeft:`3px solid ${selModule?.id===m.id ? 'var(--blue)' : 'transparent'}` }}>
                <div style={{ fontSize:12, fontWeight: selModule?.id===m.id ? 600 : 400, color: selModule?.id===m.id ? 'var(--blue)' : 'var(--ink)' }}>
                  {m.icon} {m.name}
                </div>
                <div style={{ fontSize:10, color:'var(--ink4)', marginTop:1 }}>{m.forms?.length || 0} forms · {m.is_system ? 'System' : 'Custom'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Col 2: Forms ──────────────────────────────────────────── */}
        <div style={{ width:220, flexShrink:0, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--ink4)' }}>{selModule?.name || 'Forms'}</span>
            {selModule && <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={() => setFormModal(true)}>+ Add</button>}
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {!selModule ? (
              <div style={{ padding:20, textAlign:'center', color:'var(--ink4)', fontSize:12 }}>← Select a module</div>
            ) : forms.map(form => (
              <div key={form.id} onClick={() => setSelForm(form)}
                style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)', background: selForm?.id===form.id ? 'var(--blue-lt)' : 'transparent', borderLeft:`3px solid ${selForm?.id===form.id ? 'var(--blue)' : 'transparent'}` }}>
                <div style={{ fontSize:12, fontWeight: selForm?.id===form.id ? 600 : 400, color: selForm?.id===form.id ? 'var(--blue)' : 'var(--ink)' }}>{form.name}</div>
                <div style={{ fontSize:10, color:'var(--ink4)', marginTop:1 }}>{form.is_active ? 'Active' : 'Draft'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Col 3: Field palette ──────────────────────────────────── */}
        {selForm && (
          <div style={{ width:180, flexShrink:0, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--surface2)' }}>
            <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--ink4)' }}>
              Field Types
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'8px' }}>
              {['Text','Number','Date','Choice','Media','Other'].map(group => (
                <div key={group} style={{ marginBottom:12 }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink4)', padding:'4px 4px', marginBottom:4 }}>{group}</div>
                  {FIELD_TYPES.filter(t => t.group===group).map(t => (
                    <div key={t.type} onClick={() => addFieldOfType(t.type)}
                      style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 8px', borderRadius:'var(--r)', cursor:'pointer', fontSize:11, color:'var(--ink3)', marginBottom:2 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ width:20, textAlign:'center' }}>{t.icon}</span>
                      <span>{t.label}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Col 4: Fields canvas ──────────────────────────────────── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {!selForm ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink4)', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:32 }}>🧩</div>
              <div style={{ fontSize:14, fontWeight:600 }}>Select a module and form to start building</div>
              <div style={{ fontSize:12 }}>Then drag fields from the palette to add them</div>
            </div>
          ) : (
            <>
              {/* Form header */}
              <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{selForm.name}</div>
                  <div style={{ fontSize:11, color:'var(--ink4)' }}>{fields.length} fields · {selModule?.name}</div>
                </div>
                <button className="btn btn-sec btn-sm" style={{ fontSize:11 }} onClick={() => setShowMatrix(true)}>☷ Field Permissions</button>
                <button className="btn btn-pri btn-sm" style={{ fontSize:11 }} onClick={() => setEditField({ form_id: selForm.id })}>+ Add Field</button>
              </div>

              {/* Fields */}
              <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
                <FieldList
                  fields={fields}
                  formId={selForm.id}
                  onEdit={(f) => setEditField(f)}
                  onDelete={(id) => {
                    if (window.confirm('Delete this field? This also removes all its permissions.')) {
                      deleteFieldMut.mutate(id);
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────── */}

      {/* Create Module */}
      <Modal open={modModal} onClose={() => setModModal(false)} title="Create Module" width={380}
        footer={<>
          <button className="btn btn-sec" onClick={() => setModModal(false)}>Cancel</button>
          <button className="btn btn-pri" onClick={() => createModMut.mutate()} disabled={!modName || createModMut.isPending}>✓ Create</button>
        </>}>
        <div className="fg"><label>Icon (emoji)</label><input value={modIcon} onChange={e => setModIcon(e.target.value)} style={{ fontSize:20, textAlign:'center', width:60 }} /></div>
        <div className="fg"><label>Module Name *</label><input value={modName} onChange={e => setModName(e.target.value)} autoFocus /></div>
        <div className="fg"><label>Description</label><textarea value={modDesc} onChange={e => setModDesc(e.target.value)} rows={2} /></div>
      </Modal>

      {/* Create Form */}
      <Modal open={formModal} onClose={() => setFormModal(false)} title={`New Form in ${selModule?.name}`} width={380}
        footer={<>
          <button className="btn btn-sec" onClick={() => setFormModal(false)}>Cancel</button>
          <button className="btn btn-pri" onClick={() => createFormMut.mutate()} disabled={!formName || createFormMut.isPending}>✓ Create</button>
        </>}>
        <div className="fg"><label>Form Name *</label><input value={formName} onChange={e => setFormName(e.target.value)} autoFocus placeholder="e.g. Personal Information" /></div>
        <div className="fg"><label>Description</label><textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2} /></div>
        <div style={{ background:'var(--blue-lt)', border:'1px solid var(--blue-md)', borderRadius:'var(--r)', padding:'8px 12px', fontSize:11, color:'var(--blue)' }}>
          ℹ Multiple sections within one form = multi-step form. Set the "Section" on each field when adding them.
        </div>
      </Modal>

      {/* Field Editor */}
      {editField !== false && (
        <FieldEditor
          field={editField || null}
          formId={selForm!.id}
          onClose={() => setEditField(false)}
        />
      )}

      {/* Permission Matrix */}
      {showMatrix && selForm && (
        <PermissionMatrix formId={selForm.id} onClose={() => setShowMatrix(false)} />
      )}
    </AppShell>
  );
}

// ─── Field card ───────────────────────────────────────────────────────────────
function FieldCard({ field, formId, onEdit }: { field: DynamicField; formId: number; onEdit: () => void }) {
  const deleteMutation = useDeleteField(formId);
  return (
    <div className="card" style={{ padding:'12px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
      <div style={{ width:32, height:32, borderRadius:'var(--r)', background:'var(--blue-lt)', border:'1px solid var(--blue-md)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'var(--blue)', flexShrink:0 }}>
        {FIELD_TYPE_ICONS[field.field_type]}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{field.label}</span>
          {field.is_required && <span style={{ fontSize:9, background:'var(--red-lt)', color:'var(--red)', border:'1px solid var(--red-bd)', borderRadius:3, padding:'1px 5px', fontWeight:700 }}>REQ</span>}
          {field.is_hidden   && <span style={{ fontSize:9, background:'var(--surface2)', color:'var(--ink4)', border:'1px solid var(--border)', borderRadius:3, padding:'1px 5px' }}>HIDDEN</span>}
          {field.is_readonly && <span style={{ fontSize:9, background:'var(--amber-lt)', color:'var(--amber)', border:'1px solid var(--amber-bd)', borderRadius:3, padding:'1px 5px' }}>READONLY</span>}
        </div>
        <div style={{ fontSize:11, color:'var(--ink4)' }}>
          {FIELD_TYPE_LABELS[field.field_type]} · key: <code style={{ fontSize:10 }}>{field.field_key}</code>
          {field.options && field.options.length > 0 && ` · ${field.options.length} options`}
        </div>
      </div>
      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
        <button className="btn btn-sec btn-sm" style={{ fontSize:11, padding:'3px 8px' }} onClick={onEdit}>Edit</button>
        <button className="btn btn-danger btn-sm" style={{ fontSize:11, padding:'3px 8px' }}
          onClick={() => { if(window.confirm('Delete this field?')) deleteMutation.mutate(field.id); }}>Del</button>
      </div>
    </div>
  );
}

// ─── Module form modal ────────────────────────────────────────────────────────
function ModuleFormModal({ open, module: mod, onClose }: { open: boolean; module: HrModule | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const [desc, setDesc] = useState('');
  const createMutation = useCreateModule();
  const updateMutation = useUpdateModule(mod?.id || 0);
  useEffect(() => { if (open) { setName(mod?.name||''); setIcon(mod?.icon||'📦'); setDesc(mod?.description||''); } }, [open, mod]);
  const save = async () => {
    if (mod) await updateMutation.mutateAsync({ name, icon, description: desc });
    else     await createMutation.mutateAsync({ name, icon, description: desc });
    onClose();
  };
  const isBusy = createMutation.isPending || updateMutation.isPending;
  return (
    <Modal open={open} onClose={onClose} title={mod ? 'Edit Module' : 'New Module'} width={400}
      footer={<><button className="btn btn-sec" onClick={onClose}>Cancel</button><button className="btn btn-pri" onClick={save} disabled={!name.trim()||isBusy}>{isBusy?'…':'✓ Save'}</button></>}>
      <div style={{ display:'grid', gridTemplateColumns:'60px 1fr', gap:'0 12px' }}>
        <div className="fg"><label>Icon</label><input value={icon} onChange={e => setIcon(e.target.value)} style={{ textAlign:'center', fontSize:20 }} maxLength={4} /></div>
        <div className="fg"><label>Module Name *</label><input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
      </div>
      <div className="fg"><label>Description</label><textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} /></div>
    </Modal>
  );
}

// ─── Form form modal ──────────────────────────────────────────────────────────
function FormFormModal({ open, form, moduleId, onClose }: { open: boolean; form: FormDefinition | null; moduleId: number; onClose: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const createMutation = useCreateForm(moduleId);
  const updateMutation = useUpdateForm(form?.id || 0, moduleId);
  useEffect(() => { if (open) { setName(form?.name||''); setDesc(form?.description||''); } }, [open, form]);
  const save = async () => {
    if (form) await updateMutation.mutateAsync({ name, description: desc });
    else     await createMutation.mutateAsync({ name, description: desc });
    onClose();
  };
  const isBusy = createMutation.isPending || updateMutation.isPending;
  return (
    <Modal open={open} onClose={onClose} title={form ? 'Edit Form' : 'New Form'} width={400}
      footer={<><button className="btn btn-sec" onClick={onClose}>Cancel</button><button className="btn btn-pri" onClick={save} disabled={!name.trim()||isBusy}>{isBusy?'…':'✓ Save'}</button></>}>
      <div className="fg"><label>Form Name *</label><input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
      <div className="fg"><label>Description</label><textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} /></div>
    </Modal>
  );
}

// ─── Field form modal ─────────────────────────────────────────────────────────
function FieldFormModal({ open, field, formId, onClose }: { open: boolean; field: DynamicField | null; formId: number; onClose: () => void }) {
  const createMutation = useCreateField(formId);
  const updateMutation = useUpdateField(formId);
  const [ft,     setFt]     = useState<FieldType>('text');
  const [label,  setLabel]  = useState('');
  const [key,    setKey]    = useState('');
  const [ph,     setPh]     = useState('');
  const [help,   setHelp]   = useState('');
  const [req,    setReq]    = useState(false);
  const [ro,     setRo]     = useState(false);
  const [hidden, setHidden] = useState(false);
  const [minL,   setMinL]   = useState('');
  const [maxL,   setMaxL]   = useState('');
  const [regex,  setRegex]  = useState('');
  const [opts,   setOpts]   = useState<{label:string;value:string;is_default:boolean}[]>([]);

  useEffect(() => {
    if (open) {
      setFt(field?.field_type || 'text');
      setLabel(field?.label || '');
      setKey(field?.field_key || '');
      setPh(field?.placeholder || '');
      setHelp(field?.help_text || '');
      setReq(field?.is_required || false);
      setRo(field?.is_readonly || false);
      setHidden(field?.is_hidden || false);
      setMinL(field?.min_length?.toString() || '');
      setMaxL(field?.max_length?.toString() || '');
      setRegex(field?.regex_pattern || '');
      setOpts(field?.options?.map(o => ({ label: o.label, value: o.value, is_default: o.is_default || false })) || []);
    }
  }, [open, field]);

  const autoKey = (lbl: string) => lbl.toLowerCase().replace(/[^a-z0-9]+/g,'_');

  const save = async () => {
    const dto: CreateFieldDto = {
      field_type: ft, label, field_key: key || autoKey(label),
      placeholder: ph || undefined, help_text: help || undefined,
      is_required: req, is_readonly: ro, is_hidden: hidden,
      min_length: minL ? Number(minL) : undefined,
      max_length: maxL ? Number(maxL) : undefined,
      regex_pattern: regex || undefined,
      options: ['select','multi_select','radio'].includes(ft) ? opts : undefined,
    };
    if (field) await updateMutation.mutateAsync({ fieldId: field.id, data: dto });
    else       await createMutation.mutateAsync(dto);
    onClose();
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;
  const needsOptions = ['select','multi_select','radio'].includes(ft);

  return (
    <Modal open={open} onClose={onClose} title={field ? `Edit Field` : 'Add Field'} width={580}
      footer={<><button className="btn btn-sec" onClick={onClose}>Cancel</button><button className="btn btn-pri" onClick={save} disabled={!label.trim()||isBusy}>{isBusy?'…':'✓ Save Field'}</button></>}>

      {/* Field type picker */}
      <div className="fg">
        <label>Field Type *</label>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
          {FIELD_TYPES?.map(t => (
            <button key={t.type} type="button"
              onClick={() => setFt(t.type)}
              style={{ padding:'8px 4px', border:`1px solid ${ft===t.type?'var(--blue)':'var(--border)'}`, borderRadius:'var(--r)', cursor:'pointer', background: ft===t.type?'var(--blue-lt)':'var(--surface2)', transition:'all .1s' }}>
              <div style={{ fontSize:14, marginBottom:2 }}>{t.icon}</div>
              <div style={{ fontSize:9, color: ft===t.type?'var(--blue)':'var(--ink4)', fontWeight: ft===t.type?700:400, lineHeight:1.2 }}>{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
        <div className="fg">
          <label>Label *</label>
          <input value={label} onChange={e => { setLabel(e.target.value); if (!field) setKey(autoKey(e.target.value)); }} />
        </div>
        <div className="fg">
          <label>Field Key (auto)</label>
          <input value={key || autoKey(label)} onChange={e => setKey(e.target.value)} placeholder={autoKey(label) || 'field_key'} style={{ fontFamily:'monospace', fontSize:12 }} />
        </div>
        <div className="fg"><label>Placeholder</label><input value={ph} onChange={e => setPh(e.target.value)} /></div>
        <div className="fg"><label>Help Text</label><input value={help} onChange={e => setHelp(e.target.value)} /></div>
        <div className="fg"><label>Min Length</label><input type="number" min="0" value={minL} onChange={e => setMinL(e.target.value)} /></div>
        <div className="fg"><label>Max Length</label><input type="number" min="0" value={maxL} onChange={e => setMaxL(e.target.value)} /></div>
      </div>

      <div className="fg"><label>Regex Pattern</label><input value={regex} onChange={e => setRegex(e.target.value)} placeholder="e.g. ^[A-Z]{5}[0-9]{4}[A-Z]$" style={{ fontFamily:'monospace', fontSize:12 }} /></div>

      <div style={{ display:'flex', gap:16, marginBottom:14 }}>
        {[['Required', req, setReq], ['Read Only', ro, setRo], ['Hidden', hidden, setHidden]].map(([lbl, val, setter]) => (
          <label key={lbl as string} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}>
            <input type="checkbox" checked={val as boolean} onChange={e => (setter as any)(e.target.checked)} style={{ width:14, height:14, accentColor:'var(--blue)', cursor:'pointer' }} />
            {lbl as string}
          </label>
        ))}
      </div>

      {needsOptions && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--ink4)', marginBottom:8 }}>Options</div>
          {opts.map((opt, i) => (
            <div key={i} style={{ display:'flex', gap:8, marginBottom:6 }}>
              <input placeholder="Label" value={opt.label} onChange={e => setOpts(o => o.map((x,j) => j===i?{...x,label:e.target.value}:x))} />
              <input placeholder="Value" value={opt.value} onChange={e => setOpts(o => o.map((x,j) => j===i?{...x,value:e.target.value}:x))} />
              <button type="button" onClick={() => setOpts(o => o.filter((_,j) => j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink4)', fontSize:16 }}>×</button>
            </div>
          ))}
          <button type="button" onClick={() => setOpts(o => [...o, {label:'',value:'',is_default:false}])}
            style={{ fontSize:12, color:'var(--blue)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', fontWeight:500 }}>+ Add option</button>
        </div>
      )}
    </Modal>
  );
}
