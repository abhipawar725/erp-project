'use client';
import { useEffect, useState } from 'react';
import { useAppDispatch }      from '../../../../store';
import { setPageTitle }        from '../../../../store/slices/uiSlice';
import { AppShell }            from '../../../../layouts/AppLayout';
import { Modal }               from '../../../../components/ui/Modal';
import { usePermission }       from '../../../../features/auth/hooks/usePermission';
import { useAppSelector }      from '../../../../store';
import { selectUser }          from '../../../../store/slices/authSlice';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient               from '../../../../services/api/client';
import { showToast }           from '../../../../utils/toast';
import { formatDate }          from '../../../../utils/formatters';
import { useRouter }           from 'next/navigation';

interface SuperAdmin { id: number; email: string; is_active: boolean; last_login_at: string | null; created_at: string; }

function CreateSuperAdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => apiClient.post<any,any>('/admin/super-admins', { email, password }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['super-admins'] }); showToast('✓ Super admin created'); onClose(); setEmail(''); setPassword(''); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Create Super Admin" subtitle="This user will have full access to all platform features" width={420}
      footer={<>
        <button className="btn btn-sec" onClick={onClose}>Cancel</button>
        <button className="btn btn-pri" onClick={() => mutation.mutate()} disabled={!email || password.length < 8 || mutation.isPending}>
          {mutation.isPending ? 'Creating…' : '✓ Create Super Admin'}
        </button>
      </>}>
      <div style={{ background:'var(--amber-lt)', border:'1px solid var(--amber-bd)', borderRadius:'var(--r)', padding:'10px 14px', fontSize:12, color:'var(--amber)', marginBottom:14 }}>
        ⚠ Super admins have unrestricted access to all companies, data, and settings. Create carefully.
      </div>
      <div className="fg"><label>Email *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus placeholder="admin@nexhr.com" /></div>
      <div className="fg"><label>Password * (min 8 characters)</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
    </Modal>
  );
}

export default function SuperAdminsPage() {
  const dispatch  = useAppDispatch();
  const router    = useRouter();
  const { isSuperAdmin } = usePermission();
  const currentUser = useAppSelector(selectUser);

  useEffect(() => { dispatch(setPageTitle({ title: 'Super Admins', breadcrumb: 'Settings' })); }, [dispatch]);

  // Redirect if not super admin
  useEffect(() => {
    if (currentUser && !isSuperAdmin) router.replace('/dashboard');
  }, [currentUser, isSuperAdmin, router]);

  const [createOpen, setCreateOpen] = useState(false);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['super-admins'],
    queryFn:  () => apiClient.get<any,any>('/admin/super-admins'),
    select:   (r: any) => r.data as SuperAdmin[],
    enabled:  isSuperAdmin,
  });

  const qc = useQueryClient();
  const deactivateMutation = useMutation({
    mutationFn: (id: number) => apiClient.post<any,any>(`/admin/super-admins/${id}/deactivate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['super-admins'] }); showToast('Super admin deactivated'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });
  const activateMutation = useMutation({
    mutationFn: (id: number) => apiClient.post<any,any>(`/admin/super-admins/${id}/activate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['super-admins'] }); showToast('✓ Super admin activated'); },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  if (!isSuperAdmin) return null;

  return (
    <AppShell>
      <div className="pg-enter">
        <div className="ph">
          <div>
            <h1>Super Admins</h1>
            <p>Manage platform super admin accounts. The system must always have at least one active super admin.</p>
          </div>
          <div className="ph-r">
            <button className="btn btn-pri" onClick={() => setCreateOpen(true)}>+ New Super Admin</button>
          </div>
        </div>

        {/* Warning banner */}
        <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--red-lt)', border:'1px solid var(--red-bd)', borderRadius:'var(--r)', padding:'10px 14px', marginBottom:20, fontSize:12, color:'var(--red)' }}>
          ⚡ Super admins have full unrestricted access. All super admins are equal — there is no hierarchy. Any super admin can manage any other super admin.
        </div>

        {/* Admins list */}
        <div className="card cp">
          {isLoading ? (
            Array.from({length:2}).map((_,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
                <div className="skeleton" style={{ height:14, width:'40%', borderRadius:4 }} />
                <div className="skeleton" style={{ height:22, width:80, borderRadius:99 }} />
              </div>
            ))
          ) : admins.map(admin => {
            const isMe = admin.id === currentUser?.id;
            return (
              <div key={admin.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#6c31d9,#cc2a2a)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>
                  {admin.email[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{admin.email}</span>
                    {isMe && <span style={{ fontSize:9, background:'var(--blue-lt)', color:'var(--blue)', border:'1px solid var(--blue-md)', borderRadius:3, padding:'1px 6px', fontWeight:700 }}>YOU</span>}
                    {!admin.is_active && <span style={{ fontSize:9, background:'var(--red-lt)', color:'var(--red)', border:'1px solid var(--red-bd)', borderRadius:3, padding:'1px 6px', fontWeight:700 }}>INACTIVE</span>}
                  </div>
                  <div style={{ fontSize:11, color:'var(--ink4)', marginTop:2 }}>
                    {admin.last_login_at ? `Last login: ${formatDate(admin.last_login_at)}` : 'Never logged in'} · Added {formatDate(admin.created_at)}
                  </div>
                </div>
                {!isMe && (
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    {admin.is_active ? (
                      <button className="btn btn-sec btn-sm"
                        style={{ color:'var(--red)', borderColor:'var(--red-bd)', fontSize:11 }}
                        onClick={() => { if(window.confirm(`Deactivate ${admin.email}?`)) deactivateMutation.mutate(admin.id); }}
                        disabled={deactivateMutation.isPending}>
                        ⏸ Deactivate
                      </button>
                    ) : (
                      <button className="btn btn-sec btn-sm"
                        style={{ color:'var(--green)', borderColor:'var(--green-bd)', fontSize:11 }}
                        onClick={() => activateMutation.mutate(admin.id)}
                        disabled={activateMutation.isPending}>
                        ▶ Activate
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!isLoading && admins.length === 0 && (
            <div style={{ textAlign:'center', padding:'30px', color:'var(--ink4)', fontSize:12 }}>No super admins found. Run the seeder.</div>
          )}
        </div>
      </div>

      <CreateSuperAdminModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppShell>
  );
}
