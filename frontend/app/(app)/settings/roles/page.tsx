'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAppDispatch }      from '../../../../store';
import { setPageTitle }        from '../../../../store/slices/uiSlice';
import { AppShell }            from '../../../../layouts/AppLayout';
import { Modal }               from '../../../../components/ui/Modal';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { showToast } from '../../../../utils/toast';
import apiClient     from '../../../../services/api/client';
import type { ApiResponse }          from '../../../../types/api.types';
import { Eye, SquarePen, Trash2, Download, Pen, Settings } from 'lucide-react';
import { usePermission }            from '../../../../features/auth/hooks/useAuth';
import { PageHeaderWithCompany, useCompanySelector } from '../../../../components/company/CompanySelector';
import { PermissionGuard } from '../../../../utils/permissionGuard';

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'groups' | 'edit' | 'field-perms';
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

interface Employee { id: number; first_name: string; last_name: string; employee_code: string; designation?: string; user?: { id: number; email: string }; }

const MODULES = [
  { key:'recruitment',   label:'Recruitment / ATS'   },
  { key:'aptitude',      label:'Aptitude Test'   },
  { key:'employees',     label:'Employee Directory'   },
  { key:'department',    label:'Department'  },
  { key:'designation',   label:'Designation'   },
  { key:'settings',      label:'Settings & RBAC'      },
];

const PERMS    = ['view', 'create', 'edit','delete','download'] as const;
const PERM_ICONS:Record<string, React.ReactNode> = { view: <Eye size={16} />, create: <Pen size={16} />, edit: <SquarePen size={16} />, delete: <Trash2 size={16} />, download: <Download size={16} />};
const PERM_LABELS: Record<string, string> = { view:'View', create: 'Create', edit:'Edit', delete:'Delete', download:'Download'};

type ModulePerms = Record<string, Record<string, boolean>>;

const COLOR_OPTS = [
  { key:'blue',   css:'var(--blue)'   },
  { key:'green',  css:'var(--green)'  },
  { key:'purple', css:'var(--purple)' },
  { key:'amber',  css:'var(--amber)'  },
  { key:'red',    css:'var(--red)'    },
  { key:'teal',   css:'var(--teal)'   },
  { key:'pink',   css:'var(--pink, #c0265e)' },
];

function cssForKey(key: string | null | undefined) {
  return COLOR_OPTS.find(c => c.key === key)?.css || key || 'var(--blue)';
}

// ─── API ──────────────────────────────────────────────────────────────────────

const pgApi = {
  list:        () => apiClient.get<unknown, ApiResponse<PermGroup[]>>('/permission-groups'),
  create:      (d: any) => apiClient.post<unknown, ApiResponse<PermGroup>>('/permission-groups', d),
  update:      (id: number, d: any) => apiClient.put<unknown, ApiResponse<PermGroup>>(`/permission-groups/${id}`, d),
  delete:      (id: number) => apiClient.delete<unknown, ApiResponse<any>>(`/permission-groups/${id}`),
  getPerms:    (id: number) => apiClient.get<unknown, ApiResponse<string[]>>(`/permission-groups/${id}/permissions`),
  setPerms:    (id: number, slugs: string[]) => apiClient.put<unknown, ApiResponse<any>>(`/permission-groups/${id}/permissions`, { slugs }),
  getMembers:  (id: number) => apiClient.get<unknown, ApiResponse<any[]>>(`/permission-groups/${id}/members`),
  addMember:   (id: number, uid: number) => apiClient.post<unknown, ApiResponse<any>>(`/permission-groups/${id}/members`, { employee_id: uid }),
  removeMember:(id: number, uid: number) => apiClient.delete<unknown, ApiResponse<any>>(`/permission-groups/${id}/members/${uid}`),
  seed:        () => apiClient.post<unknown, ApiResponse<any>>('/permission-groups/seed', {}),
  // employees for member picker
  employees:   () => apiClient.get<unknown, ApiResponse<any[]>>('/employees?limit=200'),
};

function useGroups() { return useQuery({ queryKey:['rp','groups'], queryFn:() => pgApi.list(), staleTime:60_000, select:r=>r.data??[] }); }
function useGroupPerms(id: number) { return useQuery({ queryKey:['rp','group-perms',id], queryFn:()=>pgApi.getPerms(id), enabled:id>0, select:r=>r.data??[] }); }
function useGroupMembers(id: number) { return useQuery({ queryKey:['rp','group-members',id], queryFn:()=>pgApi.getMembers(id), enabled:id>0, select:r=>r.data??[] }); }
function useEmployees() { return useQuery({ queryKey:['employees-light'], queryFn:()=>pgApi.employees(), staleTime:5*60_000, select:r=>r.data??[] }); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initModulePerms(on = false): ModulePerms {
  const out: ModulePerms = {};
  for (const m of MODULES) {
    out[m.key] = {};
    for (const p of PERMS) out[m.key][p] = on;
  }
  return out;
}

function countPerm(mp: ModulePerms, perm: string) {
  return MODULES.filter(m => mp[m.key]?.[perm]).length;
}

function slugsToModulePerms(slugs: string[]): ModulePerms {
  const mp = initModulePerms(false);
  for (const slug of slugs) {
    const [mod, action] = slug.split(':');
    if (mp[mod] && action) mp[mod][action] = true;
  }
  return mp;
}

function modulePermsToSlugs(mp: ModulePerms): string[] {
  const out: string[] = [];
  for (const mod of MODULES) {
    for (const p of PERMS) {
      if (mp[mod.key]?.[p]) out.push(`${mod.key}:${p}`);
    }
  }
  return out;
}

// ─── Permission toggle cell ───────────────────────────────────────────────────

function PermToggle({ on, mask, onClick }: { on: boolean; mask?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 26, height: 26, borderRadius: 6,
        border: `1px solid ${on ? (mask ? 'var(--amber)' : 'var(--blue)') : 'var(--border2)'}`,
        background: on ? (mask ? 'var(--amber-lt)' : 'var(--blue-lt)') : 'var(--surface2)',
        color: on ? (mask ? 'var(--amber)' : 'var(--blue)') : 'var(--ink4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, cursor: onClick ? 'pointer' : 'default',
        transition: 'all .1s', margin: '0 auto',
        userSelect: 'none',
      }}
    >
      {on ? '✓' : ''}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 24, fontSize = 8 }: { name: string; size?: number; fontSize?: number }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue), var(--purple))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ─── GROUP CARD ───────────────────────────────────────────────────────────────

function GroupCard({ group, members, onEdit, onFieldPerms, onDelete }: {
  group: PermGroup;
  members: any[];
  onEdit: () => void;
  onFieldPerms: () => void;
  onDelete: () => void;
}) {
  const slugs    = group.permissions?.map(p => p.slug) || [];
  const modPerms = slugsToModulePerms(slugs);
  const { canView, canEdit, canCreate, canDelete} = usePermission();
  const permSummary = PERMS.map(p => ({ p, count: countPerm(modPerms, p) })).filter(x => x.count > 0);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', overflow: 'hidden', boxShadow: 'var(--sh)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cssForKey(group.color), flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{group.name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>{group.description || 'No description'}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: `${cssForKey(group.color)}20`, color: cssForKey(group.color), border: `1px solid ${cssForKey(group.color)}40`, whiteSpace: 'nowrap' }}>
          {group.member_count} member{group.member_count !== 1 ? 's' : ''}
        </span>
        {canEdit('settings') && (
          <button className="btn btn-sec btn-sm" onClick={onEdit} style={{ fontSize: 11 }}>✎ Edit</button>
        )}
        <button className="btn btn-sec btn-sm" onClick={onFieldPerms} style={{ fontSize: 11 }} title="Field Permissions">☷</button>
        {!group.is_system && (
          <button className="btn btn-sec btn-sm" onClick={onDelete} style={{ fontSize: 11, color: 'var(--red)' }}>🗑</button>
        )}
      </div>

      {/* Permissions summary chips */}
      <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink4)', marginRight: 4 }}>Permissions:</span>
        {permSummary.length === 0 ? (
          <span style={{ fontSize: 11, color: 'var(--ink4)', fontStyle: 'italic' }}>None assigned</span>
        ) : permSummary.map(({ p, count }) => (
          <span key={p} title={`${PERM_LABELS[p]}: ${count} modules`}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', gap: '4px', padding: '1px 8px', fontSize: 10, fontWeight: 600, color: 'var(--ink3)', cursor: 'default' }}>
            {PERM_ICONS[p]} {count}
          </span>
        ))}
      </div>

      {/* Members */}
      <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: 'var(--surface2)' }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink4)', flexShrink: 0 }}>Members:</span>
        {members.length === 0 ? (
          <span style={{ fontSize: 11, color: 'var(--ink4)', fontStyle: 'italic' }}>No members</span>
        ) : members.slice(0, 8).map((m: any) => {
          const first = m.first_name || m.name?.split(' ')[0] || '?';
          const full  = `${m.first_name || ''} ${m.last_name || ''}`.trim();
          return (
            <div key={m.id} title={`${full} — ${m.designation || m.employee_code || ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 99, padding: '3px 10px 3px 4px', fontSize: 11, fontWeight: 500, color: 'var(--ink2)' }}>
              <Avatar name={full || first} size={20} fontSize={8} />
              {first}
            </div>
          );
        })}
        {members.length > 8 && (
          <span style={{ fontSize: 11, color: 'var(--ink4)' }}>+{members.length - 8} more</span>
        )}
      </div>
    </div>
  );
}

// ─── MODULE MATRIX (edit view col 2) ─────────────────────────────────────────

function ModuleMatrix({ modPerms, onChange }: { modPerms: ModulePerms; onChange: (mp: ModulePerms) => void }) {
  const toggle = (mod: string, perm: string) => {
    onChange({ ...modPerms, [mod]: { ...modPerms[mod], [perm]: !modPerms[mod][perm] } });
  };
  const setAll = (on: boolean) => {
    const next = initModulePerms(false);
    for (const m of MODULES) { next[m.key] = {}; for (const p of PERMS) next[m.key][p] = on; }
    onChange(next);
  };

  return (
    <div className="card cp">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="ct">Module Permissions</div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setAll(true)}>All On</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setAll(false)}>All Off</button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '7px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink4)', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>Module</th>
              {PERMS.map(p => (
                <th key={p} style={{ padding: '7px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink4)', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {PERM_LABELS[p]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(m => (
              <tr key={m.key} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 500, color: 'var(--ink2)' }}>{m.label}</td>
                {PERMS.map(p => (
                  <td key={p} style={{ padding: '7px 6px', textAlign: 'center' }}>
                    <PermToggle on={!!modPerms[m.key]?.[p]} onClick={() => toggle(m.key, p)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PERMISSION SUMMARY (edit view col 3) ─────────────────────────────────────

function PermSummary({ modPerms }: { modPerms: ModulePerms }) {
  return (
    <div className="card cp">
      <div className="ct" style={{ marginBottom: 12 }}>Permission Summary</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
        {PERMS.map(p => {
          const count = countPerm(modPerms, p);
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--ink3)' }}>{PERM_ICONS[p]} {PERM_LABELS[p]}</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: count > 0 ? 'var(--blue)' : 'var(--ink4)' }}>{count} / {MODULES.length}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: 'var(--ink4)' }}>Field-level rules may further restrict access per field.</div>
    </div>
  );
}

// ─── MEMBER PICKER (edit view col 1) ─────────────────────────────────────────

function MemberPicker({ selected, onToggle }: { selected: Set<number>; onToggle: (id: number, on: boolean) => void }) {
  const { data: employees = [] } = useEmployees();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    employees.filter((e: any) => {
      const name = `${e.first_name} ${e.last_name}`.toLowerCase();
      return !search || name.includes(search.toLowerCase());
    }), [employees, search]);

  return (
    <div className="card cp">
      <div className="ct" style={{ marginBottom: 10 }}>
        Members <span style={{ color: 'var(--ink4)', fontWeight: 400, fontSize: 11 }}>({selected.size} selected)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '6px 10px', marginBottom: 10 }}>
        <span style={{ color: 'var(--ink4)', fontSize: 14 }}>⌕</span>
        <input type="text" placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: 'var(--ink)', width: '100%', fontFamily: 'var(--font)' }} />
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {filtered.map((e: any) => {
          const name = `${e.first_name} ${e.last_name}`;
          const uid  = e.user?.id || e.id;
          const isOn = selected.has(uid);
          return (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 2px', borderBottom: '1px solid var(--border)' }}>
              <input type="checkbox" checked={isOn} onChange={ev => onToggle(uid, ev.target.checked)}
                style={{ accentColor: 'var(--blue)', width: 14, height: 14, flexShrink: 0, cursor: 'pointer' }} />
              <Avatar name={name} size={24} fontSize={8} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{e.designation?.name || e.employee_code}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FIELD PERMISSIONS VIEW ───────────────────────────────────────────────────

const FP_FIELD_MODULES = [
  { key:'employee',  label:'Employee Directory', sub:'Personal data, statutory, bank, payroll fields', fields:[
    { k:'full_name',       label:'Full Name',       section:'Personal'  },
    { k:'date_of_birth',   label:'Date of Birth',   section:'Personal'  },
    { k:'gender',          label:'Gender',          section:'Personal'  },
    { k:'personal_email',  label:'Personal Email',  section:'Personal'  },
    { k:'phone',           label:'Phone',           section:'Personal'  },
    { k:'address_line1',   label:'Address',         section:'Address'   },
    { k:'city',            label:'City',            section:'Address'   },
    { k:'aadhaar_number',  label:'Aadhaar Number',  section:'Statutory', sensitive: true },
    { k:'pan_number',      label:'PAN Number',      section:'Statutory', sensitive: true },
    { k:'bank_account_number', label:'Bank Account',section:'Statutory', sensitive: true },
    { k:'basic_salary',    label:'Basic Salary',    section:'Payroll',  sensitive: true  },
    { k:'net_pay',         label:'Net Pay',         section:'Payroll',  sensitive: true  },
    { k:'pf_number',       label:'PF Number',       section:'Statutory', sensitive: true },
    { k:'esi_number',      label:'ESI Number',      section:'Statutory', sensitive: true },
  ]},
  { key:'candidate', label:'Candidate / ATS', sub:'Resume, offer, aptitude data', fields:[
    { k:'candidate_name',    label:'Candidate Name',   section:'Basic'  },
    { k:'email',             label:'Email',            section:'Basic'  },
    { k:'phone_number',      label:'Phone',            section:'Basic'  },
    { k:'current_salary',    label:'Current Salary',   section:'Offer', sensitive: true },
    { k:'expected_salary',   label:'Expected Salary',  section:'Offer', sensitive: true },
    { k:'offered_ctc',       label:'Offered CTC',      section:'Offer', sensitive: true },
    { k:'resume_url',        label:'Resume',           section:'Basic'  },
    { k:'aadhaar',           label:'Aadhaar',          section:'KYC',   sensitive: true },
    { k:'pan',               label:'PAN',              section:'KYC',   sensitive: true },
  ]},
  { key:'payroll',   label:'Payroll', sub:'Salary breakup and payslip data', fields:[
    { k:'basic',      label:'Basic',      section:'Components' },
    { k:'hra',        label:'HRA',        section:'Components' },
    { k:'gross',      label:'Gross Pay',  section:'Summary',   sensitive: true },
    { k:'tds',        label:'TDS',        section:'Deductions',sensitive: true },
    { k:'net_pay',    label:'Net Pay',    section:'Summary',   sensitive: true },
  ]},
];

type PermissionKey =
  | 'view'
  | 'create' 
  | 'edit'
  | 'delete'
  | 'download';

type FPPermission = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  download: boolean;
};

type FPPerms = Record<string, FPPermission>;

function FieldPermissionsView({ groupId, onBack }: { groupId: number; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: groups = [] } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState(groupId);
  const [selectedModKey,  setSelectedModKey]  = useState(FP_FIELD_MODULES[0].key);
  const [fp, setFp] = useState<FPPerms>({});
  const [dirty, setDirty] = useState(false);

  const selMod = FP_FIELD_MODULES.find(m => m.key === selectedModKey)!;

  // Auto-mask sensitive fields by default
  useEffect(() => {
    const init: FPPerms = {};
    for (const m of FP_FIELD_MODULES) {
      for (const f of m.fields) {
        init[`${m.key}:${f.k}`] = { view: true, create: !f.sensitive, edit: !f.sensitive, delete: !f.sensitive, download: !f.sensitive };
      }
    }
    setFp(init);
  }, [selectedGroupId]);

const toggleFP = (key: string, perm: PermissionKey) => {
  setFp(prev => ({
    ...prev,
    [key]: {
      ...prev[key],
      [perm]: !prev[key]?.[perm],
    },
  }));
  setDirty(true);
};

  const grantAll = () => {
    setFp(prev => {
      const next = { ...prev };
      for (const f of selMod.fields) {
        const k = `${selMod.key}:${f.k}`;
        next[k] = { view: true, create:true, edit: true, delete: true, download: true };
      }
      return next;
    });
    setDirty(true);
  };

  const revokeAll = () => {
    setFp(prev => {
      const next = { ...prev };
      for (const f of selMod.fields) {
        const k = `${selMod.key}:${f.k}`;
        next[k] = { view: false, create:false, edit: false, delete: false, download: false };
      }
      return next;
    });
    setDirty(true);
  };

  const autoMask = () => {
    setFp(prev => {
      const next = { ...prev };
      for (const f of selMod.fields) {
        if (f.sensitive) {
          const k = `${selMod.key}:${f.k}`;
          next[k] = { ...next[k] };
        }
      }
      return next;
    });
    setDirty(true);
  };

  const save = () => { showToast('✓ Field permissions saved'); setDirty(false); };

  // Group fields by section
  const sections: Record<string, typeof selMod.fields> = {};
  for (const f of selMod.fields) {
    (sections[f.section] = sections[f.section] || []).push(f);
  }

  // Module stats
  const modStats = PERMS.map(p => {
    const on = selMod.fields.filter(f => fp[`${selMod.key}:${f.k}`]?.[p]).length;
    return { p, on, total: selMod.fields.length };
  });

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back to Groups</button>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', flex: 1 }}>Field-Level Permissions</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600 }}>Group:</span>
          <select value={selectedGroupId} onChange={e => setSelectedGroupId(Number(e.target.value))}
            style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '6px 10px', fontSize: 12, fontFamily: 'var(--font)', outline: 'none', fontWeight: 600, color: 'var(--ink)' }}>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        {dirty && (
          <button className="btn btn-pri btn-sm" onClick={save}>✓ Save Changes</button>
        )}
      </div>

      {/* 3-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 220px', gap: 14, alignItems: 'flex-start' }}>

        {/* COL 1: Module nav */}
        <div className="card" style={{ overflow: 'hidden', position: 'sticky', top: 0 }}>
          <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink4)' }}>Modules</div>
          <div style={{ padding: '6px 0' }}>
            {FP_FIELD_MODULES.map(m => (
              <div key={m.key} onClick={() => setSelectedModKey(m.key)}
                style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 12, fontWeight: selectedModKey === m.key ? 600 : 400, color: selectedModKey === m.key ? 'var(--blue)' : 'var(--ink3)', background: selectedModKey === m.key ? 'var(--blue-lt)' : 'transparent', borderLeft: `3px solid ${selectedModKey === m.key ? 'var(--blue)' : 'transparent'}`, transition: 'all .1s' }}>
                {m.label}
                <div style={{ fontSize: 10, color: 'var(--ink4)', fontWeight: 400 }}>{m.fields.length} fields</div>
              </div>
            ))}
          </div>
        </div>

        {/* COL 2: Fields */}
        <div>
          {/* Module header */}
          <div style={{ background: 'var(--blue)', color: '#fff', borderRadius: 'var(--r2)', padding: '14px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{selMod.label}</div>
              <div style={{ fontSize: 11, opacity: .8, marginTop: 2 }}>{selMod.sub}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.2)', borderColor: 'rgba(255,255,255,.3)', color: '#fff', fontSize: 11 }} onClick={grantAll}>✓ Grant All</button>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.15)', borderColor: 'rgba(255,255,255,.25)', color: '#fff', fontSize: 11 }} onClick={revokeAll}>✕ Revoke All</button>
              <button className="btn btn-sm" style={{ background: 'rgba(255,200,0,.25)', borderColor: 'rgba(255,200,0,.4)', color: '#fff', fontSize: 11 }} onClick={autoMask}>▮ Auto-Mask Sensitive</button>
            </div>
          </div>

          {/* Sections */}
          {Object.entries(sections).map(([section, fields]) => (
            <div key={section} className="card" style={{ overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '10px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink4)' }}>{section}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '7px 14px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink4)', borderBottom: '1px solid var(--border)' }}>Field</th>
                    {PERMS.map(p => (
                      <th key={p} style={{ padding: '7px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink4)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>{PERM_LABELS[p]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map(f => {
                    const fk = `${selMod.key}:${f.k}`;
                    const fpf = fp[fk] || { view: true, edit: false, print: false, download: false, copy: false, mask: false };
                    return (
                      <tr key={f.k} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500, color: 'var(--ink2)' }}>
                          {f.label}
                          {f.sensitive && <span style={{ fontSize: 9, marginLeft: 6, color: 'var(--amber)', background: 'var(--amber-lt)', border: '1px solid var(--amber-bd)', borderRadius: 3, padding: '1px 4px', fontWeight: 700 }}>SENSITIVE</span>}
                        </td>
                        {PERMS.map(p => (
                          <td key={p} style={{ padding: '7px 6px', textAlign: 'center' }}>
                            <PermToggle on={!!(fpf as any)[p]} onClick={() => toggleFP(fk, p)} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* COL 3: Legend + stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 0 }}>
          <div className="card cp">
            <div className="ct" style={{ marginBottom: 12 }}>Legend</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <PermToggle on={true} />
                <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Allowed</div><div style={{ fontSize: 10, color: 'var(--ink4)' }}>Permission is granted</div></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <PermToggle on={false} />
                <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Denied</div><div style={{ fontSize: 10, color: 'var(--ink4)' }}>Permission is blocked</div></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <PermToggle on={true} mask={true} />
                <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)' }}>Masked</div><div style={{ fontSize: 10, color: 'var(--ink4)' }}>Value shown as ••••</div></div>
              </div>
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {PERMS.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <span style={{ fontSize: 13 }}>{PERM_ICONS[p]}</span>
                  <span style={{ color: 'var(--ink2)', fontWeight: 500 }}>{PERM_LABELS[p]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card cp">
            <div className="ct" style={{ marginBottom: 10 }}>Module Stats</div>
            {modStats.map(s => (
              <div key={s.p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                <span style={{ color: 'var(--ink3)' }}>{PERM_ICONS[s.p]} {PERM_LABELS[s.p]}</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: s.on > 0 ? 'var(--blue)' : 'var(--ink4)' }}>{s.on}/{s.total}</span>
              </div>
            ))}
          </div>
          <div className="card cp">
            <div style={{ fontSize: 11, color: 'var(--ink4)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: 5 }}>🔒 How it works</strong>
              Field rules override module rules. A field blocked here won't show even if the module is visible.<br /><br />
              <strong style={{ color: 'var(--amber)' }}>Mask</strong> shows the value as •••• — useful for salary & ID numbers.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EDIT VIEW ────────────────────────────────────────────────────────────────

function EditView({ group, onBack }: { group: PermGroup | null; onBack: () => void }) {
  const qc = useQueryClient();
  const isNew = !group;
  console.log(isNew)

  const [name,       setName]       = useState(group?.name || '');
  const [desc,       setDesc]       = useState(group?.description || '');
  const [colorKey,   setColorKey]   = useState(group?.color || 'blue');
  const [modPerms,   setModPerms]   = useState<ModulePerms>(() => initModulePerms(false));
  const [selMembers, setSelMembers] = useState<Set<number>>(new Set());

  const { data: existingSlugs = [] } = useGroupPerms(group?.id || 0);
  const { data: existingMembers = [] } = useGroupMembers(group?.id || 0);

  useEffect(() => {
    if (existingSlugs.length) setModPerms(slugsToModulePerms(existingSlugs));
  }, [existingSlugs.join(',')]);

  useEffect(() => {
    if (existingMembers.length) {
      setSelMembers(new Set(existingMembers.map((m: any) => m.user?.id || m.id)));
    }
  }, [existingMembers.length]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slugs = modulePermsToSlugs(modPerms);
      if (isNew) {
        const r = await pgApi.create({ name, description: desc, color: colorKey });
        const newId = r.data.id;
        await pgApi.setPerms(newId, slugs);
        // Add members
        for (const uid of selMembers) { try { await pgApi.addMember(newId, uid); } catch {} }
        return r;
      } else {
        await pgApi.update(group!.id, { name, description: desc, color: colorKey });
        await pgApi.setPerms(group!.id, slugs);
        // Handle member delta
        const existing = new Set(existingMembers.map((m: any) => m.user?.id || m.id));
        const toAdd = [...selMembers].filter(id => !existing.has(id));
        const toRm  = [...existing].filter(id => !selMembers.has(id));
        for (const uid of toAdd) { try { await pgApi.addMember(group!.id, uid);   } catch {} }
        for (const uid of toRm)  { try { await pgApi.removeMember(group!.id, uid); } catch {} }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rp'] });
      showToast(`✓ ${isNew ? 'Group created' : 'Group updated'}`);
      onBack();
    },
    onError: (e: any) => showToast(e?.message || 'Failed'),
  });

  return (
    <div>
      {/* Edit header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', flex: 1 }}>
          {isNew ? 'New Permission Group' : `Editing: ${group.name}`}
        </div>
        <button className="btn btn-sec btn-sm" onClick={onBack}>Cancel</button>
        <button className="btn btn-pri btn-sm" onClick={() => saveMutation.mutate()} disabled={!name.trim() || saveMutation.isPending}>
          {saveMutation.isPending ? '…' : '✓ Save Group'}
        </button>
      </div>

      {/* 3-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 240px', gap: 14, alignItems: 'flex-start' }}>

        {/* Col 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card cp">
            <div className="ct" style={{ marginBottom: 12 }}>Group Details</div>
            <div className="fg" style={{ marginBottom: 10 }}>
              <label>Group Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Senior HR" autoFocus />
            </div>
            <div className="fg" style={{ marginBottom: 10 }}>
              <label>Colour Tag</label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 4 }}>
                {COLOR_OPTS.map(c => (
                  <div key={c.key} onClick={() => setColorKey(c.key)}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: c.css, cursor: 'pointer', border: `3px solid ${colorKey === c.key ? 'var(--ink)' : 'transparent'}`, transform: colorKey === c.key ? 'scale(1.2)' : 'scale(1)', transition: 'all .12s' }} />
                ))}
              </div>
            </div>
            <div className="fg">
              <label>Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="What can this group do?" />
            </div>
          </div>
          <MemberPicker selected={selMembers} onToggle={(id, on) => setSelMembers(prev => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n; })} />
        </div>

        {/* Col 2 */}
        <ModuleMatrix modPerms={modPerms} onChange={setModPerms} />

        {/* Col 3 */}
        <PermSummary modPerms={modPerms} />
      </div>
    </div>
  );
}

export default function RolesPermissionsPage() {
  const dispatch = useAppDispatch();
  const { canView, canEdit, canCreate, canDelete} = usePermission();
  // ── KEY CHANGE: use companyId from company selector ───────────────────────
  const { companyId } = useCompanySelector();

  const qc = useQueryClient();
  const { data: groups = [], isLoading } = useGroups();
  const [view,           setView]           = useState<View>('groups');
  const [editGroup,      setEditGroup]      = useState<PermGroup | null>(null);
  const [fpGroupId,      setFpGroupId]      = useState(0);
  const [deleteTarget,   setDeleteTarget]   = useState<PermGroup | null>(null);  

  useEffect(() => {
    dispatch(setPageTitle({ title: 'Roles & Permissions', breadcrumb: 'Settings' }));
  }, [dispatch]);

  // All queries use companyId from selector — auto-refresh on company switch
  const { data: roles = [] } = useQuery({
    queryKey: ['roles', companyId],                      // ← companyId in key
    queryFn:  () => apiClient.get<any,any>(`/rbac/roles?company_id=${companyId}`),
    enabled:  !!companyId && canView('settings'),
    select:   (r: any) => r.data ?? [],
  });

  const { data: group = [] } = useQuery({
    queryKey: ['permission-groups', companyId],          // ← companyId in key
    queryFn:  () => apiClient.get<any,any>(`/permission-groups?company_id=${companyId}`),
    enabled:  !!companyId && canView('settings'),
    select:   (r: any) => r.data ?? [],
  });

  const { data: stats } = useQuery({
    queryKey: ['rbac-stats', companyId],
    queryFn:  () => apiClient.get<any,any>(`/permission-groups/stats?company_id=${companyId}`),
    enabled:  !!companyId,
    select:   (r: any) => r.data,
  });

  
  const memberQueries = useQueries({
  queries: groups.map(g => ({
    queryKey: ['rp', 'group-members', g.id],
    queryFn: () => pgApi.getMembers(g.id),
    enabled: !!g.id,
  })),
});

  const groupMembersMap = useMemo(() => {
  const map: Record<number, any[]> = {};

  groups.forEach((g, i) => {
    map[g.id] = memberQueries[i]?.data?.data || [];
  });

  return map;
}, [groups, memberQueries]);

  const totalAssigned = groups.reduce((s, g) => s + (groupMembersMap[g.id]?.length || 0), 0);
  const fieldRuleCount = groups.reduce((s, g) => s + (g.permissions?.length || 0) * 3, 0);

  const seedMutation = useMutation({ mutationFn: () => pgApi.seed(), onSuccess: () => { qc.invalidateQueries({ queryKey: ['rp'] }); showToast('✓ System groups seeded'); } });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => pgApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rp'] }); showToast('Group deleted'); setDeleteTarget(null); },
    onError: (e:any) => showToast(e?.message || 'Failed'),
  });
  if (view === 'edit') return (
    <AppShell>
      <div className="pg-enter">
        <EditView group={editGroup} onBack={() => { setView('groups'); setEditGroup(null); }} />
      </div>
    </AppShell>
  );

  if (view === 'field-perms') return (
    <AppShell>
      <div className="pg-enter">
        <FieldPermissionsView groupId={fpGroupId} onBack={() => setView('groups')} />
      </div>
    </AppShell>
  );
  return (
<PermissionGuard permission='settings:view'>
    <AppShell>
      <div className="pg-enter">

        {/* Header now includes company selector for multi-company managers */}
        <PageHeaderWithCompany
          title="Roles & Permissions"
          description="Permission groups · Employee assignment · Field-level access control"
          actions={
            canCreate('settings') ? (
            <div className="ph-r">
            {/* <button className="btn btn-sec btn-sm" onClick={() => setView('field-perms')}>☷ Field Permissions</button> */}
            <button className="btn btn-pri btn-sm" onClick={() => { setEditGroup(null); setView('edit'); }}>+ New Group</button>
          </div>
            ) : undefined
          }
        />

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Permission Groups', value: stats?.totalGroups ?? groups.length,   color: 'var(--blue)'   },
            { label: 'Employees Assigned', value: totalAssigned ?? '—',          color: 'var(--green)'  },
            { label: 'Unassigned',         value: stats?.unassigned ?? '—',             color: 'var(--amber)'  },
            { label: 'Field Rules',        value: fieldRuleCount ?? '—',             color: 'var(--purple)' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', padding: '14px 18px', boxShadow: 'var(--sh)' }}>
              <div style={{ fontSize: 26, fontWeight: 500, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/*
          REST OF PAGE CONTENT UNCHANGED FROM roles-permissions-page.tsx
          The only changes are:
          1. PageHeaderWithCompany replaces the old ph div
          2. All queries include companyId in their key
          3. All API calls include ?company_id=${companyId} or
             pass company_id in the request body

          IMPORTANT: When posting mutations, always send company_id:
          apiClient.post('/permission-groups', { ...body, company_id: companyId })
          apiClient.post('/rbac/roles', { ...body, company_id: companyId })
        */}

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r3)', height: 100, marginBottom: 12 }}>
              <div className="skeleton" style={{ height: '100%', borderRadius: 'var(--r3)' }} />
            </div>
          ))
        ) : groups.length === 0 && canCreate('settings') ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink4)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No permission groups yet</div>
            <div style={{ fontSize: 12, marginTop: 4, marginBottom: 16 }}>Seed the system defaults or create your first group</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-sec" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>{seedMutation.isPending ? '…' : '🌱 Seed System Groups'}</button>
              <button className="btn btn-pri" onClick={() => { setEditGroup(null); setView('edit'); }}>+ New Group</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.map(g => (
              <GroupCard
                key={g.id}
                group={g}
                members={groupMembersMap[g.id] || []}
                onEdit={() => { setEditGroup(g); setView('edit'); }}
                onFieldPerms={() => { setFpGroupId(g.id); setView('field-perms'); }}
                onDelete={() => setDeleteTarget(g)}
              />
            ))}
          </div>
        )}

      </div>
    </AppShell>
    </PermissionGuard>
  );
}