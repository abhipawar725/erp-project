'use client';
import { useEffect, useState } from 'react';
import { useRouter }          from 'next/navigation';
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
import {
  FIELD_TYPES, FIELD_TYPE_LABELS, FIELD_TYPE_ICONS, FIELD_CATEGORIES,
  type HrModule, type FormDefinition, type DynamicField, type CreateFieldDto, type FieldType,
} from '../../../../features/rbac/types/rbac.types';

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FormBuilderPage() {
  const dispatch = useAppDispatch();
  const router   = useRouter();
  useEffect(() => { dispatch(setPageTitle({ title: 'Form Builder', breadcrumb: 'Settings' })); }, [dispatch]);

  const { data: modules = [], isLoading: ml } = useModules();
  const [selModule,  setSelModule]  = useState<HrModule | null>(null);
  const [selForm,    setSelForm]    = useState<FormDefinition | null>(null);
  const [modModal,   setModModal]   = useState(false);
  const [editMod,    setEditMod]    = useState<HrModule | null>(null);
  const [formModal,  setFormModal]  = useState(false);
  const [editForm,   setEditForm]   = useState<FormDefinition | null>(null);
  const [fieldModal, setFieldModal] = useState(false);
  const [editField,  setEditField]  = useState<DynamicField | null>(null);

  const { data: forms = [] }       = useForms(selModule?.id || 0);
  const { data: formDetail }       = useForm(selForm?.id || 0);
  const fields: DynamicField[]     = (formDetail?.fields || []).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <AppShell>
      <div className="pg-enter">
        <div className="ph">
          <div>
            <h1>Form Builder</h1>
            <p>Create modules, forms and custom fields. Manage field-level permissions in the Permissions Matrix.</p>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'220px 260px 1fr', gap:16, alignItems:'flex-start' }}>

          {/* ── Column 1: Modules ────────────────────────────────────── */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--ink4)' }}>Modules</span>
              <button className="btn btn-sec btn-sm" style={{ fontSize:11, padding:'3px 8px' }} onClick={() => setModModal(true)}>+ Add</button>
            </div>
            {ml ? <div style={{ fontSize:12, color:'var(--ink4)' }}>Loading…</div> : modules.map(mod => (
              <div key={mod.id}
                onClick={() => { setSelModule(mod); setSelForm(null); }}
                style={{
                  display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:'var(--r2)',
                  cursor:'pointer', marginBottom:4, transition:'all .1s',
                  background: selModule?.id===mod.id ? 'var(--blue-lt)' : 'var(--surface)',
                  border: `1px solid ${selModule?.id===mod.id ? 'var(--blue-md)' : 'var(--border)'}`,
                  color: selModule?.id===mod.id ? 'var(--blue)' : 'var(--ink)',
                }}>
                <span style={{ fontSize:16 }}>{mod.icon || '📦'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{mod.name}</div>
                  <div style={{ fontSize:10, color:'var(--ink4)' }}>{(mod.forms||[]).length} forms</div>
                </div>
                {!mod.is_system && (
                  <button type="button" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink4)', fontSize:12, padding:0, lineHeight:1 }}
                    onClick={e => { e.stopPropagation(); setEditMod(mod); setModModal(true); }}>✏</button>
                )}
              </div>
            ))}
          </div>

          {/* ── Column 2: Forms ─────────────────────────────────────── */}
          <div>
            {selModule ? (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--ink4)' }}>{selModule.name} · Forms</span>
                  <button className="btn btn-sec btn-sm" style={{ fontSize:11, padding:'3px 8px' }} onClick={() => { setEditForm(null); setFormModal(true); }}>+ Add</button>
                </div>
                {forms.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'30px 0', color:'var(--ink4)', fontSize:12 }}>
                    <div style={{ fontSize:24, marginBottom:8 }}>📝</div>No forms yet
                    <button className="btn btn-sec btn-sm" style={{ marginTop:10, display:'block', margin:'10px auto 0' }} onClick={() => setFormModal(true)}>Create first form</button>
                  </div>
                ) : forms.map(form => (
                  <div key={form.id}
                    onClick={() => setSelForm(form)}
                    style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
                      padding:'10px 12px', borderRadius:'var(--r2)', cursor:'pointer', marginBottom:4,
                      background: selForm?.id===form.id ? 'var(--green-lt)' : 'var(--surface)',
                      border:`1px solid ${selForm?.id===form.id ? 'var(--green-bd)' : 'var(--border)'}`,
                    }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color: selForm?.id===form.id ? 'var(--green)' : 'var(--ink)' }}>{form.name}</div>
                      <div style={{ fontSize:10, color:'var(--ink4)' }}>{(form.fields||[]).length} fields</div>
                    </div>
                    <Chip variant={form.is_active ? 'green' : 'gray'}>{form.is_active ? 'Active' : 'Off'}</Chip>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--ink4)', fontSize:12 }}>← Select a module</div>
            )}
          </div>

          {/* ── Column 3: Fields ─────────────────────────────────────── */}
          <div>
            {selForm ? (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{selForm.name}</div>
                    <div style={{ fontSize:11, color:'var(--ink4)' }}>{fields.length} fields</div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-sec btn-sm" onClick={() => { setEditForm(selForm); setFormModal(true); }}>Edit Form</button>
                    <button className="btn btn-sec btn-sm" onClick={() => router.push(`/settings/forms/demo/${selForm.id}`)}>👁 Preview</button>
                    <button className="btn btn-pri btn-sm" onClick={() => { setEditField(null); setFieldModal(true); }}>+ Add Field</button>
                  </div>
                </div>

                {fields.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'50px 0', color:'var(--ink4)' }}>
                    <div style={{ fontSize:36, marginBottom:10 }}>🧩</div>
                    <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>No fields yet</div>
                    <button className="btn btn-pri btn-sm" onClick={() => setFieldModal(true)}>+ Add First Field</button>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {fields.map(f => (
                      <FieldCard key={f.id} field={f} formId={selForm.id}
                        onEdit={() => { setEditField(f); setFieldModal(true); }} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign:'center', padding:'60px 0', color:'var(--ink4)', fontSize:12 }}>← Select a form to manage fields</div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ModuleFormModal open={modModal} module={editMod} onClose={() => { setModModal(false); setEditMod(null); }} />
      {selModule && (
        <FormFormModal open={formModal} form={editForm} moduleId={selModule.id} onClose={() => { setFormModal(false); setEditForm(null); }} />
      )}
      {selForm && (
        <FieldFormModal open={fieldModal} field={editField} formId={selForm.id} onClose={() => { setFieldModal(false); setEditField(null); }} />
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
          {FIELD_TYPES.map(t => (
            <button key={t} type="button"
              onClick={() => setFt(t)}
              style={{ padding:'8px 4px', border:`1px solid ${ft===t?'var(--blue)':'var(--border)'}`, borderRadius:'var(--r)', cursor:'pointer', background: ft===t?'var(--blue-lt)':'var(--surface2)', transition:'all .1s' }}>
              <div style={{ fontSize:14, marginBottom:2 }}>{FIELD_TYPE_ICONS[t]}</div>
              <div style={{ fontSize:9, color: ft===t?'var(--blue)':'var(--ink4)', fontWeight: ft===t?700:400, lineHeight:1.2 }}>{FIELD_TYPE_LABELS[t]}</div>
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
