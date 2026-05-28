'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch }        from '../../../../../../store';
import { setPageTitle }          from '../../../../../../store/slices/uiSlice';
import { AppShell }              from '../../../../../../layouts/AppLayout';
import { useQuery }              from '@tanstack/react-query';
import { rbacService }           from '../../../../../../services/api/rbac.service';
import { DynamicForm, DynamicFormDisplay } from '../../../../../../features/rbac/components/DynamicForm';
import { useRoles }              from '../../../../../../hooks/useRbac';
import type { DynamicField }     from '../../../../../../features/rbac/types/rbac.types';

export default function FormDemoPage() {
  const params   = useParams();
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const formId   = Number(params.formId);

  const [roleId,    setRoleId]    = useState(0);
  const [mode,      setMode]      = useState<'edit'|'view'>('edit');
  const [showPerms, setShowPerms] = useState(false);
  const [lastSubmit, setLastSubmit] = useState<Record<string,unknown> | null>(null);

  const { data: roles = [] } = useRoles();

  // Load form with permission resolution for the selected role
  const { data: resolvedFields = [], isLoading, refetch } = useQuery({
    queryKey:  ['form-resolved', formId, roleId],
    queryFn:   () => rbacService.resolveForm(formId),
    enabled:   formId > 0,
    select:    r => r.data,
  });

  // Load form metadata
  const { data: formMeta } = useQuery({
    queryKey: ['rbac','form', formId],
    queryFn:  () => rbacService.getForm(formId),
    enabled:  formId > 0,
    select:   r => r.data,
  });

  useEffect(() => {
    if (formMeta) dispatch(setPageTitle({ title: `Preview: ${formMeta.name}`, breadcrumb: 'Form Builder' }));
  }, [formMeta, dispatch]);

  return (
    <AppShell>
      <div className="pg-enter">
        <div className="ph">
          <div>
            <h1>{formMeta?.name || 'Form Preview'}</h1>
            <p>Live dynamic form renderer — see how this form looks with different roles and permissions applied</p>
          </div>
          <div className="ph-r">
            <button className="btn btn-sec btn-sm" onClick={() => router.back()}>← Back</button>
          </div>
        </div>

        {/* Controls */}
        <div className="card cp" style={{ marginBottom:20 }}>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div className="fg" style={{ marginBottom:0, minWidth:180 }}>
              <label>Preview as Role</label>
              <select value={roleId} onChange={e => setRoleId(Number(e.target.value))}>
                <option value="0">— No permission filter —</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {(['edit','view'] as const).map(m => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  style={{ padding:'7px 16px', border:`1px solid ${mode===m?'var(--blue)':'var(--border)'}`, borderRadius:'var(--r)', fontSize:12, fontWeight:600, cursor:'pointer', background: mode===m?'var(--blue-lt)':'var(--surface2)', color: mode===m?'var(--blue)':'var(--ink4)', fontFamily:'var(--font)' }}>
                  {m === 'edit' ? '✏ Edit Mode' : '👁 View Mode'}
                </button>
              ))}
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12 }}>
              <input type="checkbox" checked={showPerms} onChange={e => setShowPerms(e.target.checked)} style={{ width:14, height:14, accentColor:'var(--blue)' }} />
              Show permission badges
            </label>
          </div>

          {/* Permission legend */}
          {showPerms && (
            <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:'var(--ink4)' }}>Badges:</span>
              {[['V','View','var(--blue)'],['E','Edit','var(--green)'],['C','Copy','var(--teal)'],['D','Download','var(--purple)'],['M','Mask','var(--amber)']].map(([abbr, label, color]) => (
                <span key={abbr} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--ink3)' }}>
                  <span style={{ width:16, height:16, borderRadius:3, background: color as string, color:'#fff', fontSize:8, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{abbr}</span>
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:'grid', gridTemplateColumns: lastSubmit ? '1fr 380px' : '1fr', gap:20, alignItems:'flex-start' }}>
          {/* Form */}
          <div className="card cp">
            {isLoading ? (
              <div style={{ textAlign:'center', padding:'40px', color:'var(--ink4)', fontSize:13 }}>Loading form…</div>
            ) : resolvedFields.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'var(--ink4)' }}>
                <div style={{ fontSize:32, marginBottom:10 }}>🧩</div>
                <div style={{ fontSize:14, fontWeight:600 }}>No active fields</div>
                <div style={{ fontSize:12, marginTop:4 }}>Add fields in the Form Builder to preview them here</div>
              </div>
            ) : (
              <DynamicForm
                fields={resolvedFields}
                readOnly={mode === 'view'}
                showPermBadges={showPerms}
                submitLabel="Submit Form"
                onSubmit={async (vals) => {
                  setLastSubmit(vals);
                }}
              />
            )}
          </div>

          {/* Submitted values panel */}
          {lastSubmit && (
            <div className="card cp" style={{ position:'sticky', top:80 }}>
              <div className="ct">Submitted Values</div>
              <div style={{ fontSize:11, color:'var(--ink4)', marginBottom:10 }}>Raw JSON output from form submission:</div>
              <pre style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'12px', fontSize:11, fontFamily:'monospace', overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all', maxHeight:400, overflowY:'auto' }}>
                {JSON.stringify(lastSubmit, null, 2)}
              </pre>
              <button className="btn btn-sec btn-sm" style={{ marginTop:10 }} onClick={() => setLastSubmit(null)}>Clear</button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
