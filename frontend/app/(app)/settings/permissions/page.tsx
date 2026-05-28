'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch }    from '../../../../store';
import { setPageTitle }      from '../../../../store/slices/uiSlice';
import { AppShell }          from '../../../../layouts/AppLayout';
import {
  useModules, useForms, usePermissionMatrix, useBulkSetPermissions,
} from '../../../../hooks/useRbac';
import {
  PERM_FLAGS, DEFAULT_PERM,
  type FieldPermissionEntry, type PermissionMatrix,
  type DynamicField, type Role,
} from '../../../../features/rbac/types/rbac.types';

// ─── Permission cell ──────────────────────────────────────────────────────────
function PermCell({
  perm, onChange, roleIsSystem,
}: {
  perm:         FieldPermissionEntry;
  onChange:     (updated: FieldPermissionEntry) => void;
  roleIsSystem: boolean;
}) {
  const toggle = (key: keyof FieldPermissionEntry) => {
    if (roleIsSystem) return; // super_admin is always full — no editing
    onChange({ ...perm, [key]: !perm[key] });
  };

  return (
    <td style={{ padding:'6px 8px', textAlign:'center', verticalAlign:'middle' }}>
      <div style={{ display:'flex', gap:3, justifyContent:'center', flexWrap:'wrap' }}>
        {PERM_FLAGS.map(flag => (
          <button
            key={flag.key}
            type="button"
            title={flag.label}
            onClick={() => toggle(flag.key)}
            style={{
              width: 22, height: 22,
              borderRadius: 4,
              border: `1px solid ${perm[flag.key] ? flag.color : 'var(--border)'}`,
              background: perm[flag.key] ? flag.color : 'var(--surface2)',
              color: perm[flag.key] ? '#fff' : 'var(--ink4)',
              cursor: roleIsSystem ? 'not-allowed' : 'pointer',
              fontSize: 9, fontWeight: 700,
              opacity: roleIsSystem ? .7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .1s',
            }}
          >
            {flag.label.slice(0,1)}
          </button>
        ))}
      </div>
    </td>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PermissionsPage() {
  const dispatch = useAppDispatch();
  useEffect(() => { dispatch(setPageTitle({ title: 'Permission Matrix', breadcrumb: 'Settings' })); }, [dispatch]);

  const { data: modules = [] } = useModules();
  const [selModuleId, setSelModuleId] = useState(0);
  const [selFormId,   setSelFormId]   = useState(0);

  const { data: forms = [] }   = useForms(selModuleId);
  const { data: matrixData, isLoading } = usePermissionMatrix(selFormId);
  const bulkMutation = useBulkSetPermissions();

  // Local editable matrix state
  const [localMatrix, setLocalMatrix] = useState<PermissionMatrix>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (matrixData?.matrix) { setLocalMatrix(JSON.parse(JSON.stringify(matrixData.matrix))); setDirty(false); }
  }, [matrixData]);

  const handleChange = useCallback((roleId: number, fieldId: number, updated: FieldPermissionEntry) => {
    setLocalMatrix(prev => ({
      ...prev,
      [roleId]: { ...prev[roleId], [fieldId]: updated },
    }));
    setDirty(true);
  }, []);

  const saveAll = async (roleId: number) => {
    if (!matrixData || !selFormId) return;
    const permissions = matrixData.fields.map((f: DynamicField) => ({
      field_id: f.id,
      ...(localMatrix[roleId]?.[f.id] || DEFAULT_PERM),
    }));
    await bulkMutation.mutateAsync({ role_id: roleId, permissions, formId: selFormId });
    setDirty(false);
  };

  const applyPreset = (roleId: number, preset: 'full'|'view_only'|'none') => {
    if (!matrixData) return;
    const map: Record<'full'|'view_only'|'none', FieldPermissionEntry> = {
      full:      { can_view:true,  can_edit:true,  can_copy:true,  can_download:true,  is_masked:false },
      view_only: { can_view:true,  can_edit:false, can_copy:false, can_download:false, is_masked:false },
      none:      { can_view:false, can_edit:false, can_copy:false, can_download:false, is_masked:false },
    };
    const perms = map[preset];
    setLocalMatrix(prev => {
      const next = { ...prev, [roleId]: { ...prev[roleId] } };
      for (const f of matrixData.fields) next[roleId][f.id] = { ...perms };
      return next;
    });
    setDirty(true);
  };

  const roles:  Role[]         = matrixData?.roles  || [];
  const fields: DynamicField[] = matrixData?.fields || [];

  return (
    <AppShell>
      <div className="pg-enter">
        <div className="ph">
          <div>
            <h1>Permission Matrix</h1>
            <p>Configure field-level access per role. V=View · E=Edit · C=Copy · D=Download · M=Mask</p>
          </div>
        </div>

        {/* Selectors */}
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          <div className="fg" style={{ marginBottom:0, minWidth:200 }}>
            <label>Module</label>
            <select value={selModuleId} onChange={e => { setSelModuleId(Number(e.target.value)); setSelFormId(0); }}>
              <option value="0">— Select module —</option>
              {modules.map(m => <option key={m.id} value={m.id}>{m.icon} {m.name}</option>)}
            </select>
          </div>
          <div className="fg" style={{ marginBottom:0, minWidth:200 }}>
            <label>Form</label>
            <select value={selFormId} onChange={e => setSelFormId(Number(e.target.value))} disabled={!selModuleId || forms.length===0}>
              <option value="0">— Select form —</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          {dirty && (
            <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:14 }}>
              <div style={{ background:'var(--amber-lt)', border:'1px solid var(--amber-bd)', borderRadius:'var(--r)', padding:'6px 12px', fontSize:12, color:'var(--amber)' }}>
                ⚠ Unsaved changes — click Save on a role row to commit
              </div>
            </div>
          )}
        </div>

        {!selFormId ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--ink4)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🔐</div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Select a module and form</div>
            <div style={{ fontSize:12 }}>The permission matrix will appear here</div>
          </div>
        ) : isLoading ? (
          <div style={{ textAlign:'center', padding:'40px', color:'var(--ink4)', fontSize:13 }}>Loading matrix…</div>
        ) : fields.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'var(--ink4)', fontSize:13 }}>
            This form has no active fields. Add fields in the Form Builder first.
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:800 }}>
              <thead>
                <tr style={{ background:'var(--surface2)' }}>
                  <th style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--ink4)', borderBottom:'1px solid var(--border)', position:'sticky', left:0, background:'var(--surface2)', zIndex:1, minWidth:160 }}>
                    Role
                  </th>
                  {fields.map(f => (
                    <th key={f.id} style={{ padding:'10px 8px', textAlign:'center', fontWeight:600, fontSize:11, color:'var(--ink)', borderBottom:'1px solid var(--border)', minWidth:120, whiteSpace:'nowrap' }}>
                      <div>{f.label}</div>
                      <div style={{ fontSize:9, color:'var(--ink4)', fontWeight:400, fontFamily:'monospace' }}>{f.field_key}</div>
                    </th>
                  ))}
                  <th style={{ padding:'10px 8px', fontWeight:700, fontSize:10, color:'var(--ink4)', borderBottom:'1px solid var(--border)', minWidth:140 }}>Quick Set</th>
                  <th style={{ padding:'10px 8px', fontWeight:700, fontSize:10, color:'var(--ink4)', borderBottom:'1px solid var(--border)', minWidth:80 }}>Save</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(role => (
                  <tr key={role.id} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 14px', position:'sticky', left:0, background:'var(--surface)', zIndex:1 }}>
                      <div style={{ fontWeight:600 }}>{role.name}</div>
                      <div style={{ fontSize:10, color:'var(--ink4)' }}>{role.is_system ? '🔒 System' : '✏ Custom'}</div>
                    </td>
                    {fields.map(f => (
                      <PermCell
                        key={f.id}
                        perm={localMatrix[role.id]?.[f.id] || DEFAULT_PERM}
                        onChange={updated => handleChange(role.id, f.id, updated)}
                        roleIsSystem={role.slug === 'super_admin'}
                      />
                    ))}
                    <td style={{ padding:'8px', textAlign:'center' }}>
                      <div style={{ display:'flex', gap:3, justifyContent:'center' }}>
                        {(['full','view_only','none'] as const).map(p => (
                          <button key={p} type="button"
                            onClick={() => applyPreset(role.id, p)}
                            style={{ padding:'3px 7px', border:'1px solid var(--border)', borderRadius:4, fontSize:10, cursor:'pointer', background:'var(--surface2)', color:'var(--ink3)', fontFamily:'var(--font)' }}
                          >
                            {p === 'full' ? 'Full' : p === 'view_only' ? 'View' : 'None'}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding:'8px', textAlign:'center' }}>
                      <button className="btn btn-pri btn-sm" style={{ fontSize:11 }}
                        onClick={() => saveAll(role.id)}
                        disabled={bulkMutation.isPending}>
                        {bulkMutation.isPending ? '…' : '✓ Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        {selFormId > 0 && fields.length > 0 && (
          <div style={{ marginTop:16, display:'flex', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:'var(--ink4)' }}>Legend:</span>
            {PERM_FLAGS.map(f => (
              <span key={f.key} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--ink3)' }}>
                <span style={{ width:16, height:16, borderRadius:3, background: f.color, display:'inline-block' }} />
                {f.key === 'is_masked' ? 'M = Mask (show *****)' : `${f.label.slice(0,1)} = ${f.label}`}
              </span>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
