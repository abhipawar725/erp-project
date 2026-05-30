'use client';
import { useEffect, useState } from 'react';
import { useAppDispatch }      from '../../../../store';
import { setPageTitle }        from '../../../../store/slices/uiSlice';
import { AppShell }            from '../../../../layouts/AppLayout';
import { Modal }               from '../../../../components/ui/Modal';
import { Chip }                from '../../../../components/ui/Chip';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSystemPermissions } from '../../../../hooks/useRbac';
import { showToast }           from '../../../../utils/toast';
import apiClient               from '../../../../services/api/client';
import type { ApiResponse }    from '../../../../types/api.types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PermGroup {
  id:           number;
  name:         string;
  slug:         string;
  description?: string | null;
  color?:       string | null;
  is_system:    boolean;
  is_active:    boolean;
  member_count: number;
  permissions?: { id: number; slug: string; module: string; action: string }[];
}

// ─── Service ─────────────────────────────────────────────────────────────────
const pgService = {
  list:       () => apiClient.get<unknown, ApiResponse<PermGroup[]>>('/permission-groups'),
  create:     (data: any) => apiClient.post<unknown, ApiResponse<PermGroup>>('/permission-groups', data),
  update:     (id: number, data: any) => apiClient.put<unknown, ApiResponse<PermGroup>>(`/permission-groups/${id}`, data),
  delete:     (id: number) => apiClient.delete<unknown, ApiResponse<any>>(`/permission-groups/${id}`),
  setPerms:   (id: number, slugs: string[]) => apiClient.put<unknown, ApiResponse<any>>(`/permission-groups/${id}/permissions`, { slugs }),
  getMembers: (id: number) => apiClient.get<unknown, ApiResponse<any[]>>(`/permission-groups/${id}/members`),
  addMember:  (id: number, userId: number) => apiClient.post<unknown, ApiResponse<any>>(`/permission-groups/${id}/members`, { user_id: userId }),
  removeMember:(id: number, userId: number) => apiClient.delete<unknown, ApiResponse<any>>(`/permission-groups/${id}/members/${userId}`),
  seed:       () => apiClient.post<unknown, ApiResponse<any>>('/permission-groups/seed', {}),
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useGroups() {
  return useQuery({ queryKey: ['perm-groups'], queryFn: () => pgService.list(), staleTime: 60_000, select: r => r.data ?? [] });
}
function useGroupMembers(id: number) {
  return useQuery({ queryKey: ['perm-group-members', id], queryFn: () => pgService.getMembers(id), enabled: id > 0, select: r => r.data ?? [] });
}

// ─── Color swatch ─────────────────────────────────────────────────────────────
const COLORS = ['#1e56d9','#0d9669','#6c31d9','#c96f00','#cc2a2a','#0d8a7e','#64748b','#c0265e'];

// ─── Group form modal ─────────────────────────────────────────────────────────
function GroupFormModal({ open, group, onClose }: { open: boolean; group: PermGroup | null; onClose: () => void }) {
  const [name,  setName]  = useState('');
  const [desc,  setDesc]  = useState('');
  const [color, setColor] = useState('#1e56d9');
  const qc = useQueryClient();

  useEffect(() => {
    if (open) { setName(group?.name || ''); setDesc(group?.description || ''); setColor(group?.color || '#1e56d9'); }
  }, [open, group]);

  const save = useMutation({
    mutationFn: () => group
      ? pgService.update(group.id, { name, description: desc, color })
      : pgService.create({ name, description: desc, color }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perm-groups'] }); showToast(`✓ Group ${group ? 'updated' : 'created'}`); onClose(); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  return (
    <Modal open={open} onClose={onClose} title={group ? `Edit — ${group.name}` : 'New Permission Group'} width={440}
      footer={<><button className="btn btn-sec" onClick={onClose}>Cancel</button><button className="btn btn-pri" onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>{save.isPending ? '…' : '✓ Save'}</button></>}>
      <div className="fg"><label>Group Name *</label><input value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
      <div className="fg"><label>Description</label><textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} /></div>
      <div className="fg">
        <label>Color</label>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {COLORS.map(c => (
            <div key={c} onClick={() => setColor(c)}
              style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer', border:`3px solid ${color===c?'var(--ink)':'transparent'}`, transition:'border .1s' }} />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width:28, height:28, padding:0, border:'1px solid var(--border)', borderRadius:'50%', cursor:'pointer' }} />
        </div>
      </div>
    </Modal>
  );
}

// ─── Permission assignment tab ────────────────────────────────────────────────
function PermissionsTab({ group }: { group: PermGroup }) {
  const { data: allPerms = [] } = useSystemPermissions();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setSelected(new Set(group.permissions?.map(p => p.slug) || []));
    setDirty(false);
  }, [group.permissions]);

  const toggle = (slug: string) => {
    setSelected(prev => { const next = new Set(prev); next.has(slug) ? next.delete(slug) : next.add(slug); return next; });
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => pgService.setPerms(group.id, Array.from(selected)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perm-groups'] }); showToast('✓ Permissions saved'); setDirty(false); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  // Group by module
  const grouped: Record<string, typeof allPerms> = {};
  for (const p of allPerms) (grouped[p.module] = grouped[p.module] || []).push(p);

  return (
    <div>
      {group.is_system && (
        <div style={{ background:'var(--amber-lt)', border:'1px solid var(--amber-bd)', borderRadius:'var(--r)', padding:'8px 12px', fontSize:12, color:'var(--amber)', marginBottom:14 }}>
          ⚠ System group — permission changes will take effect on next login/cache refresh.
        </div>
      )}
      {Object.entries(grouped).map(([mod, perms]) => (
        <div key={mod} style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink4)', marginBottom:8 }}>{mod}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {perms.map(p => {
              const on = selected.has(p.slug);
              return (
                <button key={p.slug} type="button" onClick={() => toggle(p.slug)}
                  style={{ padding:'5px 12px', borderRadius:99, fontSize:11, fontFamily:'var(--font)', cursor:'pointer', transition:'all .1s',
                    border: `1px solid ${on ? 'var(--blue)' : 'var(--border)'}`,
                    background: on ? 'var(--blue)' : 'var(--surface2)',
                    color: on ? '#fff' : 'var(--ink3)', fontWeight: on ? 600 : 400 }}>
                  {p.action}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {dirty && (
        <div style={{ paddingTop:12, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
          <button className="btn btn-pri btn-sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? '…' : '✓ Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Members tab ──────────────────────────────────────────────────────────────
function MembersTab({ group }: { group: PermGroup }) {
  const { data: members = [] } = useGroupMembers(group.id);
  const qc = useQueryClient();
  const [addUserId, setAddUserId] = useState('');

  const addMutation = useMutation({
    mutationFn: () => pgService.addMember(group.id, Number(addUserId)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perm-group-members', group.id] }); qc.invalidateQueries({ queryKey: ['perm-groups'] }); showToast('✓ Member added'); setAddUserId(''); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => pgService.removeMember(group.id, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perm-group-members', group.id] }); qc.invalidateQueries({ queryKey: ['perm-groups'] }); showToast('Member removed'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  return (
    <div>
      {/* Add member */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <input type="number" placeholder="User ID" value={addUserId} onChange={e => setAddUserId(e.target.value)}
          style={{ flex:1, fontSize:12 }} onKeyDown={e => e.key === 'Enter' && addUserId && addMutation.mutate()} />
        <button className="btn btn-pri btn-sm" onClick={() => addMutation.mutate()} disabled={!addUserId || addMutation.isPending}>
          {addMutation.isPending ? '…' : '+ Add'}
        </button>
      </div>

      {/* Members list */}
      {members.length === 0 ? (
        <div style={{ textAlign:'center', padding:'24px', color:'var(--ink4)', fontSize:12 }}>No members in this group</div>
      ) : members.map((m: any) => (
        <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:`linear-gradient(135deg,${group.color || 'var(--blue)'},var(--purple))`, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>
            {`${m.first_name?.[0]||''}${m.last_name?.[0]||''}`}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600 }}>{m.first_name} {m.last_name}</div>
            <div style={{ color:'var(--ink4)' }}>{m.employee_code} · {m.user?.email}</div>
          </div>
          <button className="btn btn-sec btn-sm" style={{ color:'var(--red)', borderColor:'var(--red-bd)', fontSize:11 }}
            onClick={() => removeMutation.mutate(m.user?.id)} disabled={removeMutation.isPending}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PermissionGroupsPage() {
  const dispatch = useAppDispatch();
  useEffect(() => { dispatch(setPageTitle({ title: 'Permission Groups', breadcrumb: 'Settings' })); }, [dispatch]);

  const { data: groups = [], isLoading } = useGroups();
  const [selected, setSelected] = useState<PermGroup | null>(null);
  const [activeTab, setActiveTab] = useState<'perms' | 'members'>('perms');
  const [formOpen, setFormOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<PermGroup | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PermGroup | null>(null);

  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (id: number) => pgService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perm-groups'] }); showToast('Group deleted'); setDeleteConfirm(null); setSelected(null); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  const seedMutation = useMutation({
    mutationFn: () => pgService.seed(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['perm-groups'] }); showToast('✓ System groups seeded'); },
    onError: (e: any) => showToast(e?.message || 'Seed failed'),
  });

  return (
    <AppShell>
      <div className="pg-enter">
        <div className="ph">
          <div>
            <h1>Permission Groups</h1>
            <p>Assign bundles of permissions to groups, then assign users to groups. Users can belong to multiple groups.</p>
          </div>
          <div className="ph-r">
            {groups.length === 0 && (
              <button className="btn btn-sec btn-sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                {seedMutation.isPending ? '…' : '🌱 Seed System Groups'}
              </button>
            )}
            <button className="btn btn-pri btn-sm" onClick={() => { setEditGroup(null); setFormOpen(true); }}>+ New Group</button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:20, alignItems:'flex-start' }}>
          {/* ── Group list ─────────────────────────────────────────── */}
          <div>
            {isLoading
              ? Array.from({length:5}).map((_,i) => <div key={i} className="card cp" style={{ marginBottom:8 }}><div className="skeleton" style={{ height:18, width:'60%' }} /></div>)
              : groups.map(group => (
                <div key={group.id}
                  onClick={() => { setSelected(group); setActiveTab('perms'); }}
                  style={{ background:'var(--surface)', border:`1px solid ${selected?.id===group.id?'var(--blue)':'var(--border)'}`, borderRadius:'var(--r2)', padding:'12px 14px', marginBottom:8, cursor:'pointer', transition:'all .1s', boxShadow: selected?.id===group.id?'var(--sh2)':'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      {/* Color dot + lock for system */}
                      <div style={{ width:10, height:10, borderRadius:'50%', background:group.color||'var(--blue)', flexShrink:0 }} />
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', display:'flex', alignItems:'center', gap:6 }}>
                          {group.name}
                          {group.is_system && <span style={{ fontSize:9, color:'var(--ink4)', fontWeight:400 }}>🔒</span>}
                          {!group.is_active && <span style={{ fontSize:9, background:'var(--surface2)', color:'var(--ink4)', padding:'1px 5px', borderRadius:3 }}>Off</span>}
                        </div>
                        <div style={{ fontSize:11, color:'var(--ink4)', marginTop:2 }}>
                          {group.member_count} members · {group.permissions?.length || 0} permissions
                        </div>
                      </div>
                    </div>
                    {!group.is_system && (
                      <div style={{ display:'flex', gap:4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-sec btn-sm" style={{ fontSize:11, padding:'3px 8px' }} onClick={() => { setEditGroup(group); setFormOpen(true); }}>Edit</button>
                        <button className="btn btn-danger btn-sm" style={{ fontSize:11, padding:'3px 8px' }} onClick={() => setDeleteConfirm(group)}>Del</button>
                      </div>
                    )}
                  </div>
                  {group.description && (
                    <div style={{ fontSize:11, color:'var(--ink4)', marginTop:6, paddingLeft:20, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{group.description}</div>
                  )}
                </div>
              ))
            }
          </div>

          {/* ── Detail panel ───────────────────────────────────────── */}
          {selected ? (
            <div className="card cp">
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <div style={{ width:12, height:12, borderRadius:'50%', background:selected.color||'var(--blue)', flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)' }}>{selected.name}</div>
                  <div style={{ fontSize:11, color:'var(--ink4)' }}>/{selected.slug} · {selected.is_system ? '🔒 System' : '✏ Custom'}</div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display:'flex', gap:2, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:3, marginBottom:16, width:'fit-content' }}>
                {(['perms','members'] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    style={{ padding:'5px 14px', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)', background: activeTab===t?'var(--surface)':'transparent', color: activeTab===t?'var(--ink)':'var(--ink4)', boxShadow: activeTab===t?'var(--sh)':'none' }}>
                    {t === 'perms' ? '🔑 Permissions' : '👥 Members'}
                  </button>
                ))}
              </div>

              {activeTab === 'perms' ? <PermissionsTab group={selected} /> : <MembersTab group={selected} />}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'60px 24px', color:'var(--ink4)' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>🔐</div>
              <div style={{ fontSize:14, fontWeight:600 }}>Select a group to configure</div>
              <div style={{ fontSize:12, marginTop:4 }}>Click any group to manage its permissions and members</div>
            </div>
          )}
        </div>
      </div>

      <GroupFormModal open={formOpen} group={editGroup} onClose={() => { setFormOpen(false); setEditGroup(null); }} />

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Group"
        footer={<><button className="btn btn-sec" onClick={() => setDeleteConfirm(null)}>Cancel</button><button className="btn btn-danger" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}>{deleteMutation.isPending?'…':'Delete'}</button></>}>
        <div style={{ background:'var(--red-lt)', border:'1px solid var(--red-bd)', borderRadius:'var(--r)', padding:'10px 14px', fontSize:12, color:'var(--red)' }}>
          ⚠ Delete <strong>{deleteConfirm?.name}</strong>? All member assignments will be lost. This cannot be undone.
        </div>
      </Modal>
    </AppShell>
  );
}
