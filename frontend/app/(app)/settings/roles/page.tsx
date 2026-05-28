'use client';
import { useEffect, useState } from 'react';
import { useAppDispatch }      from '../../../../store';
import { setPageTitle }        from '../../../../store/slices/uiSlice';
import { AppShell }            from '../../../../layouts/AppLayout';
import { Modal }               from '../../../../components/ui/Modal';
import { Chip }                from '../../../../components/ui/Chip';
import {
  useRoles, useCreateRole, useUpdateRole, useDeleteRole,
  useRolePermissions, useSetRolePermissions,
  useSystemPermissions, useRoleMembers,
} from '../../../../hooks/useRbac';
import type { Role, SystemPermission } from '../../../../features/rbac/types/rbac.types';

const ROLE_COLORS: Record<string, string> = {
  super_admin:'var(--red)', company_admin:'var(--purple)', hr:'var(--blue)',
  employee:'var(--green)', candidate:'var(--teal)',
};

function colorFor(slug: string) {
  return ROLE_COLORS[slug] || 'var(--ink3)';
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RolesPage() {
  const dispatch = useAppDispatch();
  useEffect(() => { dispatch(setPageTitle({ title: 'Roles & Permissions', breadcrumb: 'Settings' })); }, [dispatch]);

  const { data: roles = [], isLoading } = useRoles();
  const [selectedRole,  setSelectedRole]  = useState<Role | null>(null);
  const [activeTab,     setActiveTab]     = useState<'perms'|'members'>('perms');
  const [createOpen,    setCreateOpen]    = useState(false);
  const [editRole,      setEditRole]      = useState<Role | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Role | null>(null);

  return (
    <AppShell>
      <div className="pg-enter">
        <div className="ph">
          <div>
            <h1>Roles & Permissions</h1>
            <p>Manage custom roles, module permissions, and team assignments.</p>
          </div>
          <div className="ph-r">
            <button className="btn btn-pri btn-sm" onClick={() => setCreateOpen(true)}>+ New Role</button>
          </div>
        </div>

        <div className="g2" style={{ gap: 20, alignItems: 'flex-start' }}>
          {/* ── Role list ──────────────────────────────────────────────────── */}
          <div>
            {isLoading
              ? Array.from({length:4}).map((_,i) => <div key={i} className="card cp" style={{ marginBottom:8 }}><div className="skeleton" style={{ height:18, width:'60%' }} /></div>)
              : roles.map(role => (
                <div
                  key={role.id}
                  onClick={() => { setSelectedRole(role); setActiveTab('perms'); }}
                  style={{
                    background: 'var(--surface)', border: `1px solid ${selectedRole?.id === role.id ? 'var(--blue)' : 'var(--border)'}`,
                    borderRadius: 'var(--r2)', padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
                    transition: 'all .12s', boxShadow: selectedRole?.id === role.id ? 'var(--sh2)' : 'none',
                  }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background: colorFor(role.slug), flexShrink:0 }} />
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{role.name}</div>
                        <div style={{ fontSize:11, color:'var(--ink4)' }}>
                          {role.is_system ? '🔒 System' : '✏ Custom'} · {role.member_count || 0} members
                        </div>
                      </div>
                    </div>
                    {!role.is_system && (
                      <div style={{ display:'flex', gap:4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sec btn-sm" onClick={() => setEditRole(role)} style={{ fontSize:11, padding:'3px 8px' }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(role)} style={{ fontSize:11, padding:'3px 8px' }}>Del</button>
                      </div>
                    )}
                  </div>
                  {role.description && (
                    <div style={{ fontSize:11, color:'var(--ink4)', marginTop:6, paddingLeft:20 }}>{role.description}</div>
                  )}
                </div>
              ))
            }
          </div>

          {/* ── Role detail panel ─────────────────────────────────────────── */}
          {selectedRole ? (
            <div className="card cp">
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                <div style={{ width:12, height:12, borderRadius:'50%', background: colorFor(selectedRole.slug), flexShrink:0, marginTop:3 }} />
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{selectedRole.name}</div>
                  <div style={{ fontSize:11, color:'var(--ink4)' }}>/{selectedRole.slug}</div>
                </div>
              </div>

              {/* Tab bar */}
              <div style={{ display:'flex', gap:2, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:3, marginBottom:16, width:'fit-content' }}>
                {(['perms','members'] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    style={{ padding:'5px 14px', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)', background: activeTab===t ? 'var(--surface)' : 'transparent', color: activeTab===t ? 'var(--ink)' : 'var(--ink4)', boxShadow: activeTab===t ? 'var(--sh)' : 'none' }}>
                    {t === 'perms' ? '🔑 Module Permissions' : '👥 Members'}
                  </button>
                ))}
              </div>

              {activeTab === 'perms' ? (
                <PermissionTab roleId={selectedRole.id} />
              ) : (
                <MembersTab roleId={selectedRole.id} />
              )}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'60px 0', color:'var(--ink4)' }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🔑</div>
              <div style={{ fontSize:14, fontWeight:600 }}>Select a role to manage</div>
              <div style={{ fontSize:12, marginTop:4 }}>Click any role to edit permissions and members</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create/Edit modal ──────────────────────────────────────────────── */}
      <RoleFormModal
        open={createOpen || !!editRole}
        role={editRole}
        onClose={() => { setCreateOpen(false); setEditRole(null); }}
      />

      {/* ── Delete confirm ──────────────────────────────────────────────────── */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Role"
        footer={
          <>
            <button className="btn btn-sec" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <DeleteRoleButton role={deleteConfirm} onDone={() => { setDeleteConfirm(null); setSelectedRole(null); }} />
          </>
        }>
        <div style={{ background:'var(--red-lt)', border:'1px solid var(--red-bd)', borderRadius:'var(--r)', padding:'10px 14px', fontSize:12, color:'var(--red)' }}>
          ⚠ Deleting <strong>{deleteConfirm?.name}</strong> will unassign all members. This cannot be undone.
        </div>
      </Modal>
    </AppShell>
  );
}

// ─── Permission tab ───────────────────────────────────────────────────────────
function PermissionTab({ roleId }: { roleId: number }) {
  const { data: currentSlugs = [], isLoading: l1 } = useRolePermissions(roleId);
  const { data: allPerms = [],     isLoading: l2 } = useSystemPermissions();
  const setPermsMutation = useSetRolePermissions(roleId);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dirty, setDirty]       = useState(false);

  useEffect(() => { setSelected(new Set(currentSlugs)); setDirty(false); }, [currentSlugs]);

  const toggle = (slug: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    await setPermsMutation.mutateAsync(Array.from(selected));
    setDirty(false);
  };

  if (l1 || l2) return <div style={{ fontSize:12, color:'var(--ink4)' }}>Loading…</div>;

  // Group by module
  const grouped: Record<string, SystemPermission[]> = {};
  for (const p of allPerms) {
    (grouped[p.module] = grouped[p.module] || []).push(p);
  }

  return (
    <div>
      {Object.entries(grouped).map(([mod, perms]) => (
        <div key={mod} style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink4)', marginBottom:8 }}>
            {mod}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {perms.map(p => (
              <button
                key={p.slug}
                type="button"
                onClick={() => toggle(p.slug)}
                style={{
                  padding:'5px 12px', borderRadius:99, fontSize:11, fontFamily:'var(--font)',
                  cursor:'pointer', transition:'all .12s',
                  border: `1px solid ${selected.has(p.slug) ? 'var(--blue)' : 'var(--border)'}`,
                  background: selected.has(p.slug) ? 'var(--blue)' : 'var(--surface2)',
                  color: selected.has(p.slug) ? '#fff' : 'var(--ink3)',
                  fontWeight: selected.has(p.slug) ? 600 : 400,
                }}
              >
                {p.action}
              </button>
            ))}
          </div>
        </div>
      ))}
      {dirty && (
        <div style={{ paddingTop:12, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
          <button className="btn btn-pri btn-sm" onClick={save} disabled={setPermsMutation.isPending}>
            {setPermsMutation.isPending ? '…' : '✓ Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Members tab ──────────────────────────────────────────────────────────────
function MembersTab({ roleId }: { roleId: number }) {
  const { data: members = [] } = useRoleMembers(roleId);

  return (
    <div>
      {members.length === 0 ? (
        <div style={{ textAlign:'center', padding:'24px', color:'var(--ink4)', fontSize:12 }}>No members assigned to this role</div>
      ) : members.map((m: any) => (
        <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,var(--blue),var(--purple))', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>
            {`${m.first_name?.[0]||''}${m.last_name?.[0]||''}`}
          </div>
          <div>
            <div style={{ fontWeight:600, color:'var(--ink)' }}>{m.first_name} {m.last_name}</div>
            <div style={{ color:'var(--ink4)' }}>{m.employee_code}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Role form modal ──────────────────────────────────────────────────────────
function RoleFormModal({ open, role, onClose }: { open: boolean; role: Role | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole(role?.id || 0);

  useEffect(() => { if (open) { setName(role?.name || ''); setDesc(role?.description || ''); } }, [open, role]);

  const save = async () => {
    if (role) { await updateMutation.mutateAsync({ name, description: desc }); }
    else       { await createMutation.mutateAsync({ name, description: desc }); }
    onClose();
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal open={open} onClose={onClose} title={role ? `Edit — ${role.name}` : 'New Custom Role'} width={420}
      footer={<><button className="btn btn-sec" onClick={onClose}>Cancel</button><button className="btn btn-pri" onClick={save} disabled={!name.trim()||isBusy}>{isBusy?'…':'✓ Save'}</button></>}>
      <div className="fg"><label>Role Name *</label><input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
      <div className="fg"><label>Description</label><textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} /></div>
    </Modal>
  );
}

function DeleteRoleButton({ role, onDone }: { role: Role | null; onDone: () => void }) {
  const deleteMutation = useDeleteRole();
  return (
    <button className="btn btn-danger" onClick={async () => { if(role) { await deleteMutation.mutateAsync(role.id); onDone(); } }} disabled={deleteMutation.isPending}>
      {deleteMutation.isPending ? '…' : 'Delete'}
    </button>
  );
}
