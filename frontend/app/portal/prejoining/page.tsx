'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portalService } from '../../../services/api/candidate.service';

// ─── Types ───────────────────────────────────────────────────────────────────
type AR = Record<string, string>;

interface EduRow {
  institution: string;
  degree: string;
  subject: string;
  from_yr: string;
  to_yr: string;
  percent: string;
  division: string;
  achievements: string;
}

interface EmpRow {
  employer: string;
  address: string;
  designation: string;
  department: string;
  from_date: string;
  to_date: string;
  experience: string;
  gross_salary: string;
  reason: string;
  basic: string;
  hra: string;
  da: string;
  bonus: string;
  medical: string;
  travel: string;
  other: string;
}

interface LangRow {
  language: string;
  speak: boolean;
  read: boolean;
  write: boolean;
}

interface FamRow {
  name: string;
  age: string;
  relation: string;
  occupation: string;
  mobile: string;
  dependent: boolean;
  emp_details: string;
}

interface ProRef {
  name: string;
  designation: string;
  company: string;
  mobile: string;
  email: string;
  address: string;
}

interface LocRef {
  name: string;
  occupation: string;
  contact: string;
  address: string;
}

const blankEdu  = (): EduRow  => ({ institution:'', degree:'', subject:'', from_yr:'', to_yr:'', percent:'', division:'', achievements:'' });
const blankEmp  = (): EmpRow  => ({ employer:'', address:'', designation:'', department:'', from_date:'', to_date:'', experience:'', gross_salary:'', reason:'', basic:'', hra:'', da:'', bonus:'', medical:'', travel:'', other:'' });
const blankLang = (): LangRow => ({ language:'', speak:false, read:false, write:false });
const blankFam  = (): FamRow  => ({ name:'', age:'', relation:'', occupation:'', mobile:'', dependent:false, emp_details:'' });
const blankProRef = (): ProRef => ({ name:'', designation:'', company:'', mobile:'', email:'', address:'' });
const blankLocRef = (): LocRef => ({ name:'', occupation:'', contact:'', address:'' });

// ─── Steps ───────────────────────────────────────────────────────────────────
const STEPS = [
  { id:'personal',     label:'Personal',       icon:'01' },
  { id:'address',      label:'Address',        icon:'02' },
  { id:'education',    label:'Education',      icon:'03' },
  { id:'employment',   label:'Employment',     icon:'04' },
  { id:'skills',       label:'Skills',         icon:'05' },
  { id:'health',       label:'Health',         icon:'06' },
  { id:'assets',       label:'Assets & Legal', icon:'07' },
  { id:'family',       label:'Family',         icon:'08' },
  { id:'references',   label:'References',     icon:'09' },
  { id:'preferences',  label:'Preferences',    icon:'10' },
  { id:'declaration',  label:'Declaration',    icon:'11' },
] as const;
type StepId = typeof STEPS[number]['id'];

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Chandigarh','Puducherry'];
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const RELIGIONS    = ['Hindu','Muslim','Christian','Sikh','Buddhist','Jain','Parsi','Other'];

function usePortalAuth() {
  const router = useRouter();
  const [token, setToken]   = useState<string|null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const t = localStorage.getItem('portal_token');
    if (!t) router.replace('/portal/login'); else setToken(t);
    setChecked(true);
  }, [router]);
  return { token, checked };
}

function genRefId() {
  const d = new Date();
  return `PJ-${d.getFullYear().toString().slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#f7f6f3;--sur:#fff;--bdr:#e2dfd6;--bdr2:#c9c5bc;
  --ink:#1a1714;--ink2:#3d3930;--ink3:#6b6459;--ink4:#9c9487;
  --bl:#1e4bd8;--bl-lt:#eef1fc;--bl-md:#c5cdf7;
  --gr:#15803d;--gr-lt:#dcfce7;--gr-bd:#86efac;
  --rd:#991b1b;--rd-lt:#fee2e2;--rd-bd:#fca5a5;
  --am:#92400e;--am-lt:#fef3c7;--am-bd:#fcd34d;
  --tl:#0f766e;--tl-lt:#ccfbf1;--tl-bd:#5eead4;
  --pu:#7c3aed;--pu-lt:#ede9fe;--pu-bd:#c4b5fd;
  --r:6px;--r2:10px;--r3:16px;
  --sh:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
  --fn:'DM Sans',system-ui,sans-serif;
  --fs:'Instrument Serif',Georgia,serif;
}
body{background:var(--bg);font-family:var(--fn);font-size:13px;color:var(--ink2);-webkit-font-smoothing:antialiased;}
.topbar{background:var(--sur);border-bottom:1px solid var(--bdr);height:56px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 1px 0 rgba(0,0,0,.04);}
.wrap{max-width:900px;margin:0 auto;padding:24px 16px 100px;}
/* Progress */
.prog-outer{background:var(--bdr);border-radius:99px;height:3px;overflow:hidden;}
.prog-inner{height:100%;background:linear-gradient(90deg,var(--bl),var(--pu));border-radius:99px;transition:width .35s ease;}
.stepper{display:flex;gap:3px;flex-wrap:wrap;margin:12px 0 24px;}
.sp{display:flex;align-items:center;gap:6px;padding:5px 11px 5px 7px;border-radius:99px;font-size:11px;font-weight:500;cursor:pointer;transition:all .13s;border:1px solid var(--bdr);background:var(--bg);color:var(--ink4);}
.sp.active{background:var(--ink);border-color:var(--ink);color:#fff;}
.sp.done{background:var(--gr-lt);border-color:var(--gr-bd);color:var(--gr);}
.sp-dot{width:17px;height:17px;border-radius:50%;background:currentColor;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;flex-shrink:0;}
.sp.active .sp-dot{background:rgba(255,255,255,.2);color:#fff;}
.sp.done .sp-dot{background:var(--gr);color:#fff;}
/* Header */
.co-header{background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r3);padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:16px;box-shadow:var(--sh);}
.co-logo{width:56px;height:56px;border-radius:var(--r2);border:2px dashed var(--bdr2);display:flex;align-items:center;justify-content:center;font-size:22px;background:var(--bg);flex-shrink:0;overflow:hidden;}
.co-logo img{width:100%;height:100%;object-fit:cover;}
.co-info{flex:1;}
.co-name{font-family:var(--fs);font-size:20px;font-style:italic;color:var(--ink);letter-spacing:-.3px;}
.co-addr{font-size:11px;color:var(--ink4);margin-top:3px;line-height:1.5;}
.ref-block{margin-left:auto;text-align:right;flex-shrink:0;display:flex;flex-direction:column;gap:4px;}
.ref-item{display:flex;flex-direction:column;align-items:flex-end;}
.ref-lbl{font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink4);font-weight:700;}
.ref-val{font-family:monospace;font-size:12px;font-weight:700;color:var(--bl);}
/* Card */
.card{background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r3);padding:24px 26px;margin-bottom:14px;box-shadow:var(--sh);}
.card-title{font-family:var(--fs);font-size:17px;font-style:italic;color:var(--ink);margin-bottom:2px;}
.card-sub{font-size:11px;color:var(--ink4);margin-bottom:18px;line-height:1.5;}
.sec-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--ink4);padding-bottom:7px;border-bottom:1px solid var(--bdr);margin-bottom:12px;}
.divider{height:1px;background:var(--bdr);margin:16px 0;}
/* Fields */
.fg{display:flex;flex-direction:column;gap:4px;margin-bottom:14px;}
.fg label{font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.07em;}
.req{color:var(--rd);font-size:9px;}
.err-msg{font-size:10px;color:var(--rd);margin-top:2px;}
input,select,textarea{width:100%;border:1px solid var(--bdr2);border-radius:var(--r);padding:8px 11px;font-size:13px;font-family:var(--fn);color:var(--ink);background:var(--sur);outline:none;transition:border-color .15s,box-shadow .15s;}
input:focus,select:focus,textarea:focus{border-color:var(--bl);box-shadow:0 0 0 3px rgba(30,75,216,.07);}
input.er,select.er,textarea.er{border-color:var(--rd);background:#fffafa;}
input:disabled{background:var(--bg);color:var(--ink4);}
textarea{resize:vertical;min-height:72px;line-height:1.5;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:0 16px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 14px;}
.g4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0 12px;}
.s2{grid-column:1/-1;}
/* Chips */
.chips{display:flex;flex-wrap:wrap;gap:6px;padding-top:2px;}
.chip{padding:6px 13px;border-radius:99px;font-size:12px;cursor:pointer;border:1px solid var(--bdr2);background:var(--bg);color:var(--ink3);font-family:var(--fn);transition:all .12s;}
.chip.on{background:var(--ink);border-color:var(--ink);color:#fff;}
.chip.gr.on{background:var(--gr);border-color:var(--gr);color:#fff;}
/* YN */
.yn{display:flex;gap:8px;}
.yn-y,.yn-n{padding:7px 18px;border-radius:99px;font-size:12px;cursor:pointer;border:1px solid var(--bdr2);background:var(--bg);color:var(--ink3);font-family:var(--fn);transition:all .12s;}
.yn-y.on{background:var(--gr);border-color:var(--gr);color:#fff;font-weight:600;}
.yn-n.on{background:var(--rd);border-color:var(--rd);color:#fff;font-weight:600;}
/* Toggle */
.sw-row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid var(--bdr);border-radius:var(--r2);margin-bottom:8px;}
.sw-info span{font-size:12px;font-weight:500;color:var(--ink);}
.sw-info small{display:block;font-size:11px;color:var(--ink4);}
.sw{position:relative;width:40px;height:22px;flex-shrink:0;}
.sw input{opacity:0;width:0;height:0;position:absolute;}
.sw-tr{position:absolute;inset:0;border-radius:99px;background:var(--bdr2);cursor:pointer;transition:background .2s;}
.sw input:checked~.sw-tr{background:var(--gr);}
.sw-th{position:absolute;top:3px;left:3px;width:16px;height:16px;background:#fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .2s;pointer-events:none;}
.sw input:checked~.sw-tr .sw-th{transform:translateX(18px);}
/* Table */
.dt-wrap{border:1px solid var(--bdr);border-radius:var(--r2);overflow:hidden;margin-bottom:6px;}
.dt{width:100%;border-collapse:collapse;}
.dt th{background:var(--bg);padding:7px 10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--ink4);border-bottom:1px solid var(--bdr);text-align:left;white-space:nowrap;}
.dt td{padding:4px 6px;border-bottom:1px solid var(--bdr);}
.dt tr:last-child td{border-bottom:none;}
.dt td input,.dt td select{border:none;background:transparent;padding:4px;font-size:12px;width:100%;outline:none;}
.dt td input:focus,.dt td select:focus{background:var(--bl-lt);border-radius:4px;}
.add-row{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--bl);background:none;border:none;cursor:pointer;padding:9px 12px;font-family:var(--fn);font-weight:500;}
.add-row:hover{text-decoration:underline;}
.del-btn{background:none;border:none;cursor:pointer;color:var(--ink4);padding:2px 5px;font-size:15px;}
.del-btn:hover{color:var(--rd);}
/* Salary breakup */
.sal-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;}
.sal-item{background:var(--bg);border:1px solid var(--bdr);border-radius:var(--r2);padding:10px 12px;}
.sal-item label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--ink4);margin-bottom:5px;display:block;}
.sal-item input{border:none;background:transparent;padding:0;font-size:13px;font-weight:600;color:var(--ink);}
.sal-gross{background:var(--bl-lt);border-color:var(--bl-md);}
.sal-gross label{color:var(--bl);}
.sal-gross input{color:var(--bl);}
/* Photo zone */
.photo-zone{border:2px dashed var(--bdr2);border-radius:var(--r2);text-align:center;cursor:pointer;background:var(--bg);transition:border-color .15s;padding:16px;width:120px;}
.photo-zone:hover{border-color:var(--bl);}
.photo-circle{width:72px;height:72px;border-radius:50%;background:var(--bdr);display:flex;align-items:center;justify-content:center;font-size:20px;margin:0 auto 7px;overflow:hidden;}
.photo-circle img{width:100%;height:100%;object-fit:cover;}
/* Upload zone */
.up-zone{border:1px dashed var(--bdr2);border-radius:var(--r);padding:12px;text-align:center;cursor:pointer;font-size:11px;color:var(--ink4);background:var(--bg);}
.up-zone:hover{border-color:var(--bl);color:var(--bl);}
/* Declaration */
.decl-box{background:#fffdf5;border:1px solid #e9e0bf;border-radius:var(--r2);padding:14px 16px;font-size:12px;line-height:1.9;color:var(--ink2);max-height:220px;overflow-y:auto;margin-bottom:14px;}
.cb-row{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border:1px solid var(--bdr);border-radius:var(--r2);cursor:pointer;margin-bottom:8px;transition:background .1s;}
.cb-row:hover{background:var(--bg);}
.cb-row input[type=checkbox]{width:15px;height:15px;accent-color:var(--ink);cursor:pointer;margin-top:2px;flex-shrink:0;}
.cb-label{font-size:12px;color:var(--ink2);line-height:1.5;}
/* Sig pad */
.sig-wrap{border:1px solid var(--bdr2);border-radius:var(--r);overflow:hidden;}
.sig-canvas{display:block;cursor:crosshair;touch-action:none;width:100%;height:120px;}
.sig-bar{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--bg);border-top:1px solid var(--bdr);font-size:11px;color:var(--ink4);}
/* Nav */
.nav-row{display:flex;justify-content:space-between;gap:10px;margin-top:10px;}
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 20px;border-radius:var(--r2);font-size:13px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:all .12s;font-family:var(--fn);}
.btn-pri{background:var(--ink);color:#fff;}
.btn-sec{background:var(--sur);color:var(--ink2);border-color:var(--bdr2);}
.btn-gr{background:var(--gr);color:#fff;border-color:var(--gr);}
.btn:disabled{opacity:.45;cursor:not-allowed;}
.spin{width:13px;height:13px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:sp .65s linear infinite;display:inline-block;}
@keyframes sp{to{transform:rotate(360deg)}}
.info-bl{background:var(--bl-lt);border:1px solid var(--bl-md);color:var(--bl);border-radius:var(--r);padding:10px 13px;font-size:12px;line-height:1.5;}
.info-am{background:var(--am-lt);border:1px solid var(--am-bd);color:var(--am);border-radius:var(--r);padding:10px 13px;font-size:12px;}
.up-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;}
/* Done card */
.done-wrap{text-align:center;padding:60px 24px;}
.done-icon{font-size:56px;margin-bottom:16px;}
.done-title{font-family:var(--fs);font-size:28px;font-style:italic;color:var(--ink);margin-bottom:8px;}
.done-sub{font-size:13px;color:var(--ink4);line-height:1.7;max-width:460px;margin:0 auto 28px;}
/* Ref card */
.ref-card{border:1px solid var(--bdr);border-radius:var(--r2);padding:14px 16px;margin-bottom:10px;}
.ref-card-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.ref-card-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--ink3);}
@media(max-width:640px){.g2,.g3,.g4,.sal-grid{grid-template-columns:1fr;}.up-grid{grid-template-columns:1fr;}}
`;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PreJoiningForm() {
  const router  = useRouter();
  const qc      = useQueryClient();
  const { token, checked } = usePortalAuth();
  const photoRef  = useRef<HTMLInputElement>(null);
  const aadhaarRef = useRef<HTMLInputElement>(null);
  const panRef    = useRef<HTMLInputElement>(null);
  const passportRef = useRef<HTMLInputElement>(null);
  const sigCanvas = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [sigHasData, setSigHasData] = useState(false);
  const [refId] = useState(genRefId);
  const [step, setStep]   = useState<StepId>('personal');
  const [visited, setVisited] = useState<Set<StepId>>(new Set(['personal']));
  const [errors, setErrors]   = useState<AR>({});
  const [submitted, setSubmitted] = useState(false);

  // Photo / doc uploads
  const [photo, setPhoto]     = useState('');
  const [docAadhaar, setDocAadhaar] = useState('');
  const [docPan, setDocPan]   = useState('');
  const [docPassport, setDocPassport] = useState('');

  // ── Form sections ──────────────────────────────────────────────────────────
  const [s1, setS1] = useState({
    full_name:'', gender:'', dob:'', age:'', mobile:'', alt_mobile:'', email:'',
    nationality:'Indian', religion:'', place_of_birth:'', height:'', weight:'',
    marital_status:'', spouse_name:'', spouse_mobile:'', spouse_email:'',
    aadhaar:'', pan:'', blood_group:'',
    passport_no:'', passport_issue_date:'', passport_expiry_date:'', passport_issue_place:'',
  });

  const [s2, setS2] = useState({
    pr_house_type:'', pr_house_no:'', pr_street:'', pr_area:'', pr_city:'',
    pr_district:'', pr_state:'', pr_pin:'', pr_duration:'', pr_rent:'', pr_value:'',
    pe_house_type:'', pe_house_no:'', pe_street:'', pe_area:'', pe_city:'',
    pe_district:'', pe_state:'', pe_pin:'', same:false,
  });

  const [edu,     setEdu]     = useState<EduRow[]>([blankEdu()]);
  const [awards,  setAwards]  = useState('');
  const [profQual, setProfQual] = useState('');
  const [techQual, setTechQual] = useState('');
  const [certs,   setCerts]   = useState('');
  const [memb,    setMemb]    = useState('');

  const [emp,     setEmp]     = useState<EmpRow[]>([blankEmp()]);
  const [s4extra, setS4extra] = useState({
    current_ctc:'', expected_ctc:'', notice_period:'', joining_availability:'',
  });

  const [skills, setSkills] = useState({
    professional:'', technical:'', software:'',
    special_ability:'', strengths:'', pro_weakness:'', personal_weakness:'',
    career_ambitions:'', personal_ambitions:'',
  });
  const [langs,  setLangs]  = useState<LangRow[]>([blankLang()]);

  const [s6, setS6] = useState({
    disability:'No', disability_details:'', eye_lens:'No', left_eye:'', right_eye:'',
    medical_conditions:'', infectious:'', vaccination:'',
    smoking:'No', drinking:'No', blood_group:'', emergency_notes:'',
  });

  const [s7, setS7] = useState({
    own_vehicle:'No', vehicle_details:'', vehicle_reg:'', dl_no:'', vehicle_class:'', license_validity:'',
    weapon:'No', weapon_details:'',
    court_proceedings:'No', court_details:'',
    charge_sheeted:'No', charge_details:'',
    trade_union:'No', union_details:'',
    strike:'No', strike_details:'',
    pf_no:'', esi_no:'',
  });

  const [family, setFamily] = useState<FamRow[]>([blankFam()]);

  const [proRefs, setProRefs] = useState<ProRef[]>([blankProRef(), blankProRef()]);
  const [locRefs, setLocRefs] = useState<LocRef[]>([blankLocRef(), blankLocRef()]);
  const [emergency, setEmergency] = useState({ name:'', relation:'', mobile:'', email:'', address:'' });

  const [s10, setS10] = useState({
    pref_interview_loc:'', pref_posting_loc:'', relocate:'No', travel:'No',
    long_hours:'No', known_employee:'No', known_emp_details:'',
    prev_employed:'No', prev_emp_details:'',
    prev_interview:'No', prev_interview_details:'',
    heard_from:'',
  });

  const [s11, setS11] = useState({
    commit1:false, commit2:false, commit3:false, commit4:false, commit5:false, commit6:false,
    sig_name:'', place:'', date: new Date().toISOString().slice(0,10),
  });

  // Company info
  const { data: company } = useQuery({
    queryKey: ['portal-company-info'],
    queryFn:  () => portalService.getCompanyInfo(),
    enabled:  !!token,
    select:   r => (r as any).data,
  });

  // Profile / draft
  const { data: profile } = useQuery({
    queryKey: ['portal-profile'],
    queryFn:  () => portalService.getProfile(),
    enabled:  !!token,
    select:   r => r.data,
  });

  useEffect(() => {
    if (!profile?.prejoining_form_data) return;
    const fd = profile.prejoining_form_data as AR;
    if (fd.s1) setS1(fd.s1 as any);
    if (fd.s2) setS2(fd.s2 as any);
    if (fd.edu) setEdu(fd.edu as any);
    if (fd.awards) setAwards(fd.awards as string);
    if (fd.profQual) setProfQual(fd.profQual as string);
    if (fd.techQual) setTechQual(fd.techQual as string);
    if (fd.certs) setCerts(fd.certs as string);
    if (fd.memb) setMemb(fd.memb as string);
    if (fd.emp) setEmp(fd.emp as any);
    if (fd.s4extra) setS4extra(fd.s4extra as any);
    if (fd.skills) setSkills(fd.skills as any);
    if (fd.langs) setLangs(fd.langs as any);
    if (fd.s6) setS6(fd.s6 as any);
    if (fd.s7) setS7(fd.s7 as any);
    if (fd.family) setFamily(fd.family as any);
    if (fd.proRefs) setProRefs(fd.proRefs as any);
    if (fd.locRefs) setLocRefs(fd.locRefs as any);
    if (fd.emergency) setEmergency(fd.emergency as any);
    if (fd.s10) setS10(fd.s10 as any);
    if (fd.s11) setS11(fd.s11 as any);
    if (fd.photo) setPhoto(fd.photo as string);
    if ((profile as any).prejoining_form_status === 'Submitted') setSubmitted(true);
  }, [profile]);

  // Sync DOB → age
  useEffect(() => {
    if (!s1.dob) return;
    const age = Math.floor((Date.now() - new Date(s1.dob).getTime()) / (365.25 * 24 * 3600 * 1000));
    setS1(p => ({ ...p, age: isNaN(age) ? '' : String(age) }));
  }, [s1.dob]);

  // Sync permanent from present
  useEffect(() => {
    if (!s2.same) return;
    setS2(p => ({ ...p,
      pe_house_type:p.pr_house_type, pe_house_no:p.pr_house_no, pe_street:p.pr_street,
      pe_area:p.pr_area, pe_city:p.pr_city, pe_district:p.pr_district,
      pe_state:p.pr_state, pe_pin:p.pr_pin,
    }));
  }, [s2.same, s2.pr_house_type, s2.pr_house_no, s2.pr_street, s2.pr_area, s2.pr_city, s2.pr_district, s2.pr_state, s2.pr_pin]);

  // Auto-calc gross salary per employment row
  const calcGross = (row: EmpRow) => {
    const total = ['basic','hra','da','bonus','medical','travel','other']
      .reduce((sum, k) => sum + (Number((row as any)[k]) || 0), 0);
    return total > 0 ? String(total) : row.gross_salary;
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (isDraft: boolean) => portalService.savePreJoining(
      { s1, s2, edu, awards, profQual, techQual, certs, memb, emp, s4extra,
        skills, langs, s6, s7, family, proRefs, locRefs, emergency, s10, s11, photo },
      isDraft,
    ),
    onSuccess: (_, isDraft) => {
      qc.invalidateQueries({ queryKey: ['portal-profile'] });
      if (!isDraft) setSubmitted(true);
    },
  });

  // ── Signature pad ──────────────────────────────────────────────────────────
  useEffect(() => {
    const cv = sigCanvas.current; if (!cv) return;
    cv.width  = cv.offsetWidth || 500;
    cv.height = 120;
  }, [step]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, cv: HTMLCanvasElement) => {
    const rect = cv.getBoundingClientRect();
    const src = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };
  const sigStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const cv = sigCanvas.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    isDrawing.current = true;
    ctx.strokeStyle = '#1a1714'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const p = getPos(e, cv); ctx.beginPath(); ctx.moveTo(p.x, p.y);
  };
  const sigMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const cv = sigCanvas.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const p = getPos(e, cv); ctx.lineTo(p.x, p.y); ctx.stroke();
    setSigHasData(true);
  };
  const sigEnd = () => { isDrawing.current = false; };
  const clearSig = () => {
    const cv = sigCanvas.current; if (!cv) return;
    cv.getContext('2d')?.clearRect(0, 0, cv.width, cv.height);
    setSigHasData(false);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const toB64 = (f: File, cb: (s: string) => void) => {
    const r = new FileReader(); r.onload = () => cb(r.result as string); r.readAsDataURL(f);
  };

  const stepIdx  = STEPS.findIndex(s => s.id === step);
  const progress = ((stepIdx + 1) / STEPS.length) * 100;
  const goTo = (id: StepId) => { setStep(id); setVisited(v => new Set([...v, id])); };
  const prev = () => { if (stepIdx > 0) goTo(STEPS[stepIdx - 1].id); };

  const validate = (id: StepId) => {
    const e: AR = {};
    if (id === 'personal') {
      if (!s1.full_name.trim())  e.full_name = 'Full name is required';
      if (!s1.mobile.trim())     e.mobile    = 'Mobile is required';
      else if (!/^[+\d\s\-()]{7,15}$/.test(s1.mobile)) e.mobile = 'Invalid mobile number';
      if (s1.email && !/^[^@]+@[^@]+\.[^@]+$/.test(s1.email)) e.email = 'Invalid email';
      if (s1.aadhaar && !/^\d{4}\s?\d{4}\s?\d{4}$/.test(s1.aadhaar)) e.aadhaar = 'Aadhaar must be 12 digits';
      if (s1.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(s1.pan)) e.pan = 'Invalid PAN (e.g. ABCDE1234F)';
    }
    if (id === 'references') {
      const valid = proRefs.filter(r => r.name.trim() && r.mobile.trim());
      if (valid.length < 2) e.pro_refs = 'Minimum 2 professional references with name & mobile';
      const validL = locRefs.filter(r => r.name.trim() && r.contact.trim());
      if (validL.length < 2) e.loc_refs = 'Minimum 2 local references with name & contact';
    }
    if (id === 'declaration') {
      if (!s11.commit1 || !s11.commit2 || !s11.commit3 || !s11.commit4 || !s11.commit5 || !s11.commit6)
        e.decl = 'Please confirm all declarations';
      if (!s11.sig_name.trim()) e.sig_name = 'Please enter your name';
      if (!s11.place.trim())    e.place    = 'Please enter place';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate(step)) return;
    if (stepIdx < STEPS.length - 1) goTo(STEPS[stepIdx + 1].id);
  };

  const F1 = (k: keyof typeof s1) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setS1(p => ({ ...p, [k]: e.target.value }));
  const F10 = (k: keyof typeof s10, v: string) => setS10(p => ({ ...p, [k]: v }));
  const F11 = (k: keyof typeof s11, v: string | boolean) => setS11(p => ({ ...p, [k]: v }));

  const Chips = ({ opts, val, onChange, variant }: { opts: string[]; val: string; onChange: (v: string) => void; variant?: 'gr' }) => (
    <div className="chips">
      {opts.map(o => <button key={o} type="button" className={`chip${val===o?' on'+(variant?' '+variant:''): ''}`} onClick={() => onChange(o)}>{o}</button>)}
    </div>
  );
  const YN = ({ val, onChange }: { val: string; onChange: (v: string) => void }) => (
    <div className="yn">
      <button type="button" className={`yn-y${val==='Yes'?' on':''}`} onClick={() => onChange('Yes')}>Yes</button>
      <button type="button" className={`yn-n${val==='No'?' on':''}`}  onClick={() => onChange('No')}>No</button>
    </div>
  );
  const Sw = ({ label, sub, val, onChange }: { label: string; sub?: string; val: string; onChange: (v: string) => void }) => (
    <div className="sw-row">
      <div className="sw-info"><span>{label}</span>{sub && <small>{sub}</small>}</div>
      <label className="sw">
        <input type="checkbox" checked={val==='Yes'} onChange={e => onChange(e.target.checked ? 'Yes' : 'No')} />
        <div className="sw-tr"><div className="sw-th" /></div>
      </label>
    </div>
  );
  const Lbl = ({ t, r }: { t: string; r?: boolean }) => <label>{t}{r && <span className="req"> *</span>}</label>;
  const Err = ({ k }: { k: string }) => errors[k] ? <span className="err-msg">{errors[k] as string}</span> : null;

  const UploadZone = ({ label, preview, onFile }: { label: string; preview: string; onFile: (f: File) => void }) => {
    const ref = useRef<HTMLInputElement>(null);
    return (
      <div className="fg">
        <Lbl t={label} />
        <div className="up-zone" onClick={() => ref.current?.click()}>
          {preview
            ? <span style={{ fontSize:11, color:'var(--gr)', fontWeight:600 }}>✓ Uploaded · click to replace</span>
            : <span>📎 Click to upload</span>}
          <input ref={ref} type="file" accept="image/*,.pdf" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </div>
      </div>
    );
  };

  // ── Done screen ────────────────────────────────────────────────────────────
  if (!checked) return <><style>{css}</style><div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', color:'var(--ink4)' }}>Loading…</div></>;

  if (submitted) return (
    <>
      <style>{css}</style>
      <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
        <div className="topbar">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32,height:32,borderRadius:8,background:'var(--bl)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff' }}>NX</div>
            <span style={{ fontFamily:'var(--fs)', fontSize:16, color:'var(--ink)' }}>NexHR · Candidate Portal</span>
          </div>
        </div>
        <div className="wrap">
          <div className="card done-wrap">
            <div className="done-icon">✅</div>
            <h2 className="done-title">Pre-Joining Form Submitted</h2>
            <p className="done-sub">Thank you for completing the Employee Pre-Joining & Personal Data Form. HR will review your information and contact you before your joining date.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <button className="btn btn-sec" onClick={() => setSubmitted(false)}>View Submitted Form</button>
              <button className="btn btn-pri" onClick={() => router.push('/portal/dashboard')}>← Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="topbar">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32,height:32,borderRadius:8,background:'var(--bl)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff' }}>NX</div>
            <span style={{ fontFamily:'var(--fs)', fontSize:16, color:'var(--ink)' }}>NexHR · Candidate Portal</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-sec" style={{ fontSize:12, padding:'6px 12px' }} onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? '…' : '↑ Save Draft'}
            </button>
            <button className="btn btn-sec" style={{ fontSize:12, padding:'6px 12px' }} onClick={() => router.push('/portal/dashboard')}>← Dashboard</button>
          </div>
        </div>

        <div className="wrap">
          {/* ── Company header ──────────────────────────────── */}
          <div className="co-header">
            <div className="co-logo">
              {company?.logo_url ? <img src={company.logo_url} alt="logo" /> : <span>🏢</span>}
            </div>
            <div className="co-info">
              <div className="co-name">{company?.name || 'Company Name'}</div>
              {company?.address && <div className="co-addr">{company.address}</div>}
            </div>
            <div className="ref-block">
              <div className="ref-item">
                <span className="ref-lbl">Reference No.</span>
                <span className="ref-val">{refId}</span>
              </div>
              {profile?.candidate_name && (
                <div className="ref-item">
                  <span className="ref-lbl">Candidate</span>
                  <span className="ref-val" style={{ fontFamily:'inherit', fontSize:11 }}>{profile.candidate_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Form title ──────────────────────────────────── */}
          <h1 style={{ fontFamily:'var(--fs)', fontStyle:'italic', fontSize:26, color:'var(--ink)', letterSpacing:'-.5px', marginBottom:4 }}>
            Employee Pre-Joining & Personal Data Form
          </h1>
          <p style={{ fontSize:12, color:'var(--ink4)', marginBottom:20, lineHeight:1.5 }}>
            Please fill all sections carefully and accurately. Marked fields <span style={{ color:'var(--rd)' }}>*</span> are required.
            This form is strictly confidential and used only for HR records.
          </p>

          {/* ── Progress ─────────────────────────────────────── */}
          <div className="prog-outer"><div className="prog-inner" style={{ width:`${progress}%` }} /></div>
          <div className="stepper">
            {STEPS.map(s => {
              const isDone = visited.has(s.id) && s.id !== step;
              const isAct  = s.id === step;
              return (
                <button key={s.id} type="button"
                  className={`sp${isAct?' active':isDone?' done':''}`}
                  onClick={() => goTo(s.id)}>
                  <span className="sp-dot">{isDone ? '✓' : s.icon}</span>
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* ══════════════════════════════════════════════════════
              STEP 1: PERSONAL INFORMATION
              ══════════════════════════════════════════════════════ */}
          {step === 'personal' && (<>
            <div className="card">
              <div className="card-title">Personal Information</div>
              <div className="card-sub">All details as per official government documents.</div>

              {/* Photo + basic row */}
              <div style={{ display:'flex', gap:20, alignItems:'flex-start', marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--ink4)', marginBottom:6 }}>Passport Photo</div>
                  <div className="photo-zone" onClick={() => photoRef.current?.click()}>
                    <div className="photo-circle">{photo ? <img src={photo} alt="photo" /> : '📷'}</div>
                    <div style={{ fontSize:10, color:'var(--ink4)' }}>{photo ? 'Click to replace' : 'Upload'}</div>
                    <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f=e.target.files?.[0]; if(f) toB64(f, setPhoto); }} />
                  </div>
                </div>
                <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                  <div className="fg s2"><Lbl t="Full Name" r /><input value={s1.full_name} onChange={F1('full_name')} placeholder="As on official ID" className={errors.full_name?'er':''} /><Err k="full_name" /></div>
                  <div className="fg"><Lbl t="Gender" /><Chips opts={['Male','Female','Other']} val={s1.gender} onChange={v => setS1(p=>({...p,gender:v}))} /></div>
                  <div className="fg"><Lbl t="Date of Birth" /><input type="date" value={s1.dob} onChange={F1('dob')} /></div>
                  <div className="fg"><Lbl t="Age (auto-calculated)" /><input value={s1.age} disabled placeholder="Calculated from DOB" /></div>
                </div>
              </div>

              <div className="g3">
                <div className="fg"><Lbl t="Mobile Number" r /><input type="tel" value={s1.mobile} onChange={F1('mobile')} className={errors.mobile?'er':''} /><Err k="mobile" /></div>
                <div className="fg"><Lbl t="Alternate Mobile" /><input type="tel" value={s1.alt_mobile} onChange={F1('alt_mobile')} /></div>
                <div className="fg"><Lbl t="Email Address" /><input type="email" value={s1.email} onChange={F1('email')} className={errors.email?'er':''} /><Err k="email" /></div>
                <div className="fg"><Lbl t="Nationality" /><input value={s1.nationality} onChange={F1('nationality')} /></div>
                <div className="fg"><Lbl t="Religion" /><select value={s1.religion} onChange={F1('religion')}><option value="">— Select —</option>{RELIGIONS.map(r => <option key={r}>{r}</option>)}</select></div>
                <div className="fg"><Lbl t="Place of Birth" /><input value={s1.place_of_birth} onChange={F1('place_of_birth')} /></div>
                <div className="fg"><Lbl t="Height (cm)" /><input type="number" value={s1.height} onChange={F1('height')} /></div>
                <div className="fg"><Lbl t="Weight (kg)" /><input type="number" value={s1.weight} onChange={F1('weight')} /></div>
                <div className="fg"><Lbl t="Blood Group" /><Chips opts={BLOOD_GROUPS} val={s1.blood_group} onChange={v => setS1(p=>({...p,blood_group:v}))} /></div>
              </div>

              <div className="fg s2">
                <Lbl t="Marital Status" />
                <Chips opts={['Single','Married','Divorced','Separated','Widow/Widower']} val={s1.marital_status} onChange={v => setS1(p=>({...p,marital_status:v}))} />
              </div>
              {s1.marital_status === 'Married' && (
                <div className="g3">
                  <div className="fg"><Lbl t="Spouse Name" /><input value={s1.spouse_name} onChange={F1('spouse_name')} /></div>
                  <div className="fg"><Lbl t="Spouse Mobile" /><input type="tel" value={s1.spouse_mobile} onChange={F1('spouse_mobile')} /></div>
                  <div className="fg"><Lbl t="Spouse Email" /><input type="email" value={s1.spouse_email} onChange={F1('spouse_email')} /></div>
                </div>
              )}

              <div className="divider" />
              <div className="sec-label">Government Identity Documents</div>
              <div className="g2">
                <div className="fg"><Lbl t="Aadhaar Number" /><input placeholder="XXXX XXXX XXXX" maxLength={14} value={s1.aadhaar} onChange={F1('aadhaar')} className={errors.aadhaar?'er':''} /><Err k="aadhaar" /></div>
                <div className="fg"><Lbl t="PAN Number" /><input placeholder="ABCDE1234F" maxLength={10} style={{ textTransform:'uppercase' }} value={s1.pan} onChange={e => setS1(p=>({...p,pan:e.target.value.toUpperCase()}))} className={errors.pan?'er':''} /><Err k="pan" /></div>
                <div className="fg"><Lbl t="Passport Number" /><input value={s1.passport_no} onChange={F1('passport_no')} /></div>
                <div className="fg"><Lbl t="Passport Issue Place" /><input value={s1.passport_issue_place} onChange={F1('passport_issue_place')} /></div>
                <div className="fg"><Lbl t="Passport Issue Date" /><input type="date" value={s1.passport_issue_date} onChange={F1('passport_issue_date')} /></div>
                <div className="fg"><Lbl t="Passport Expiry Date" /><input type="date" value={s1.passport_expiry_date} onChange={F1('passport_expiry_date')} /></div>
              </div>

              <div className="divider" />
              <div className="sec-label">Document Uploads</div>
              <div className="up-grid">
                <UploadZone label="Aadhaar Card" preview={docAadhaar} onFile={f => toB64(f, setDocAadhaar)} />
                <UploadZone label="PAN Card" preview={docPan} onFile={f => toB64(f, setDocPan)} />
                <UploadZone label="Passport Copy" preview={docPassport} onFile={f => toB64(f, setDocPassport)} />
              </div>
            </div>
            <div className="nav-row"><div /><button className="btn btn-pri" onClick={next}>Next: Address →</button></div>
          </>)}

          {/* ══════════════════════════════════════════════════════
              STEP 2: ADDRESS DETAILS
              ══════════════════════════════════════════════════════ */}
          {step === 'address' && (<>
            <div className="card">
              <div className="card-title">Present Address</div>
              <div className="fg"><Lbl t="House Type" /><Chips opts={['Owned','Rented','Parental']} val={s2.pr_house_type} onChange={v => setS2(p=>({...p,pr_house_type:v}))} /></div>
              <div className="g3">
                <div className="fg"><Lbl t="House / Flat Number" /><input value={s2.pr_house_no} onChange={e => setS2(p=>({...p,pr_house_no:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Street / Sector" /><input value={s2.pr_street} onChange={e => setS2(p=>({...p,pr_street:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Area / Locality" /><input value={s2.pr_area} onChange={e => setS2(p=>({...p,pr_area:e.target.value}))} /></div>
                <div className="fg"><Lbl t="City" r /><input value={s2.pr_city} onChange={e => setS2(p=>({...p,pr_city:e.target.value}))} /></div>
                <div className="fg"><Lbl t="District" /><input value={s2.pr_district} onChange={e => setS2(p=>({...p,pr_district:e.target.value}))} /></div>
                <div className="fg"><Lbl t="State" /><select value={s2.pr_state} onChange={e => setS2(p=>({...p,pr_state:e.target.value}))}><option value="">— Select —</option>{STATES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div className="fg"><Lbl t="PIN Code" /><input maxLength={6} value={s2.pr_pin} onChange={e => setS2(p=>({...p,pr_pin:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Residential Duration" /><input placeholder="e.g. 3 years" value={s2.pr_duration} onChange={e => setS2(p=>({...p,pr_duration:e.target.value}))} /></div>
                {s2.pr_house_type==='Rented' && <div className="fg"><Lbl t="Monthly Rent (₹)" /><input type="number" value={s2.pr_rent} onChange={e => setS2(p=>({...p,pr_rent:e.target.value}))} /></div>}
                {s2.pr_house_type==='Owned' && <div className="fg"><Lbl t="Property Market Value (₹)" /><input type="number" value={s2.pr_value} onChange={e => setS2(p=>({...p,pr_value:e.target.value}))} /></div>}
              </div>
            </div>

            <div className="card">
              <div className="card-title">Permanent Address</div>
              <div style={{ marginBottom:14 }}>
                <label className="cb-row" style={{ display:'inline-flex', width:'auto', cursor:'pointer', marginBottom:0 }}>
                  <input type="checkbox" checked={s2.same} onChange={e => setS2(p=>({...p,same:e.target.checked}))} />
                  <span className="cb-label">Same as present address</span>
                </label>
              </div>
              {!s2.same && (
                <>
                  <div className="fg"><Lbl t="House Type" /><Chips opts={['Owned','Rented','Parental']} val={s2.pe_house_type} onChange={v => setS2(p=>({...p,pe_house_type:v}))} /></div>
                  <div className="g3">
                    <div className="fg"><Lbl t="House / Flat Number" /><input value={s2.pe_house_no} onChange={e => setS2(p=>({...p,pe_house_no:e.target.value}))} /></div>
                    <div className="fg"><Lbl t="Street / Sector" /><input value={s2.pe_street} onChange={e => setS2(p=>({...p,pe_street:e.target.value}))} /></div>
                    <div className="fg"><Lbl t="Area / Locality" /><input value={s2.pe_area} onChange={e => setS2(p=>({...p,pe_area:e.target.value}))} /></div>
                    <div className="fg"><Lbl t="City" /><input value={s2.pe_city} onChange={e => setS2(p=>({...p,pe_city:e.target.value}))} /></div>
                    <div className="fg"><Lbl t="District" /><input value={s2.pe_district} onChange={e => setS2(p=>({...p,pe_district:e.target.value}))} /></div>
                    <div className="fg"><Lbl t="State" /><select value={s2.pe_state} onChange={e => setS2(p=>({...p,pe_state:e.target.value}))}><option value="">— Select —</option>{STATES.map(s => <option key={s}>{s}</option>)}</select></div>
                    <div className="fg"><Lbl t="PIN Code" /><input maxLength={6} value={s2.pe_pin} onChange={e => setS2(p=>({...p,pe_pin:e.target.value}))} /></div>
                  </div>
                </>
              )}
            </div>
            <div className="nav-row"><button className="btn btn-sec" onClick={prev}>← Back</button><button className="btn btn-pri" onClick={next}>Next: Education →</button></div>
          </>)}

          {/* ══════════════════════════════════════════════════════
              STEP 3: EDUCATIONAL DETAILS
              ══════════════════════════════════════════════════════ */}
          {step === 'education' && (<>
            <div className="card">
              <div className="card-title">Educational Qualifications</div>
              <div className="card-sub">List all qualifications from highest to lowest.</div>
              {edu.map((row, i) => (
                <div key={i} style={{ border:'1px solid var(--bdr)', borderRadius:'var(--r2)', padding:'14px 16px', marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.07em' }}>Qualification {i+1}</span>
                    {edu.length > 1 && <button type="button" className="del-btn" onClick={() => setEdu(e => e.filter((_,j) => j!==i))}>×</button>}
                  </div>
                  <div className="g2">
                    <div className="fg"><Lbl t="Institution Name" /><input value={row.institution} onChange={e => setEdu(d => d.map((r,j) => j===i?{...r,institution:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="Degree / Diploma" /><input value={row.degree} onChange={e => setEdu(d => d.map((r,j) => j===i?{...r,degree:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="Main Subject" /><input value={row.subject} onChange={e => setEdu(d => d.map((r,j) => j===i?{...r,subject:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="Division / Class" /><input placeholder="First / Second / Distinction" value={row.division} onChange={e => setEdu(d => d.map((r,j) => j===i?{...r,division:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="From Year" /><input type="number" min="1990" max="2030" value={row.from_yr} onChange={e => setEdu(d => d.map((r,j) => j===i?{...r,from_yr:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="To Year" /><input type="number" min="1990" max="2030" value={row.to_yr} onChange={e => setEdu(d => d.map((r,j) => j===i?{...r,to_yr:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="Percentage / CGPA" /><input value={row.percent} onChange={e => setEdu(d => d.map((r,j) => j===i?{...r,percent:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="Achievements / Distinctions" /><input value={row.achievements} onChange={e => setEdu(d => d.map((r,j) => j===i?{...r,achievements:e.target.value}:r))} /></div>
                  </div>
                </div>
              ))}
              <button type="button" className="add-row" onClick={() => setEdu(e => [...e, blankEdu()])}>+ Add qualification</button>
            </div>

            <div className="card">
              <div className="card-title">Additional Academic Details</div>
              {[
                ['Academic Awards / Honours', awards, setAwards],
                ['Professional Qualifications', profQual, setProfQual],
                ['Technical Qualifications', techQual, setTechQual],
                ['Certifications', certs, setCerts],
                ['Membership of Professional Institutions', memb, setMemb],
              ].map(([label, val, setter]) => (
                <div key={label as string} className="fg">
                  <Lbl t={label as string} />
                  <textarea rows={2} value={val as string} onChange={e => (setter as any)(e.target.value)} placeholder={`Enter ${label as string}…`} />
                </div>
              ))}
            </div>
            <div className="nav-row"><button className="btn btn-sec" onClick={prev}>← Back</button><button className="btn btn-pri" onClick={next}>Next: Employment →</button></div>
          </>)}

          {/* ══════════════════════════════════════════════════════
              STEP 4: EMPLOYMENT HISTORY
              ══════════════════════════════════════════════════════ */}
          {step === 'employment' && (<>
            <div className="card">
              <div className="card-title">Employment History</div>
              <div className="card-sub">List all previous employers starting from most recent.</div>
              {emp.map((row, i) => (
                <div key={i} style={{ border:'1px solid var(--bdr)', borderRadius:'var(--r2)', padding:'14px 16px', marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.07em' }}>
                      {i === 0 ? 'Most Recent Employer' : `Employer ${i+1}`}
                    </span>
                    {emp.length > 1 && <button type="button" className="del-btn" onClick={() => setEmp(e => e.filter((_,j) => j!==i))}>×</button>}
                  </div>
                  <div className="g3">
                    <div className="fg"><Lbl t="Employer Name" /><input value={row.employer} onChange={e => setEmp(d => d.map((r,j) => j===i?{...r,employer:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="Designation" /><input value={row.designation} onChange={e => setEmp(d => d.map((r,j) => j===i?{...r,designation:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="Department" /><input value={row.department} onChange={e => setEmp(d => d.map((r,j) => j===i?{...r,department:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="From Date" /><input type="date" value={row.from_date} onChange={e => setEmp(d => d.map((r,j) => j===i?{...r,from_date:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="To Date" /><input type="date" value={row.to_date} onChange={e => setEmp(d => d.map((r,j) => j===i?{...r,to_date:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="Total Experience" /><input placeholder="e.g. 2 years 3 months" value={row.experience} onChange={e => setEmp(d => d.map((r,j) => j===i?{...r,experience:e.target.value}:r))} /></div>
                    <div className="fg s2"><Lbl t="Full Address" /><input value={row.address} onChange={e => setEmp(d => d.map((r,j) => j===i?{...r,address:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="Reason for Leaving" /><input value={row.reason} onChange={e => setEmp(d => d.map((r,j) => j===i?{...r,reason:e.target.value}:r))} /></div>
                  </div>

                  {/* Salary breakup */}
                  <div className="sec-label" style={{ marginTop:8 }}>Salary Breakup (₹/month)</div>
                  <div className="sal-grid">
                    {(['basic','hra','da','bonus','medical','travel','other'] as const).map(k => (
                      <div key={k} className="sal-item">
                        <label>{k.toUpperCase()}</label>
                        <input type="number" min="0" value={(row as any)[k]}
                          onChange={e => {
                            const updated = { ...row, [k]: e.target.value };
                            updated.gross_salary = calcGross(updated);
                            setEmp(d => d.map((r,j) => j===i ? updated : r));
                          }} />
                      </div>
                    ))}
                    <div className="sal-item sal-gross">
                      <label>Gross Total</label>
                      <input value={row.gross_salary} disabled />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className="add-row" onClick={() => setEmp(e => [...e, blankEmp()])}>+ Add employer</button>
            </div>

            <div className="card">
              <div className="card-title">Current Position & Expectations</div>
              <div className="g2">
                <div className="fg"><Lbl t="Current CTC (₹/yr)" /><input type="number" value={s4extra.current_ctc} onChange={e => setS4extra(p=>({...p,current_ctc:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Expected CTC (₹/yr)" /><input type="number" value={s4extra.expected_ctc} onChange={e => setS4extra(p=>({...p,expected_ctc:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Notice Period (days)" /><input type="number" value={s4extra.notice_period} onChange={e => setS4extra(p=>({...p,notice_period:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Available to Join In" /><input placeholder="e.g. Immediately / 30 days" value={s4extra.joining_availability} onChange={e => setS4extra(p=>({...p,joining_availability:e.target.value}))} /></div>
              </div>
            </div>
            <div className="nav-row"><button className="btn btn-sec" onClick={prev}>← Back</button><button className="btn btn-pri" onClick={next}>Next: Skills →</button></div>
          </>)}

          {/* ══════════════════════════════════════════════════════
              STEP 5: SKILLS & PROFESSIONAL PROFILE
              ══════════════════════════════════════════════════════ */}
          {step === 'skills' && (<>
            <div className="card">
              <div className="card-title">Skills & Professional Profile</div>
              <div className="g2">
                <div className="fg"><Lbl t="Professional Skills" /><textarea rows={2} placeholder="e.g. Project Management, Client Handling…" value={skills.professional} onChange={e => setSkills(p=>({...p,professional:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Technical Skills" /><textarea rows={2} placeholder="e.g. Python, SQL, AWS…" value={skills.technical} onChange={e => setSkills(p=>({...p,technical:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Software Known" /><textarea rows={2} placeholder="e.g. MS Office, Tally, SAP…" value={skills.software} onChange={e => setSkills(p=>({...p,software:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Special Professional Ability" /><textarea rows={2} value={skills.special_ability} onChange={e => setSkills(p=>({...p,special_ability:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Personal Strengths" /><textarea rows={2} value={skills.strengths} onChange={e => setSkills(p=>({...p,strengths:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Professional Weaknesses" /><textarea rows={2} value={skills.pro_weakness} onChange={e => setSkills(p=>({...p,pro_weakness:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Personal Weaknesses" /><textarea rows={2} value={skills.personal_weakness} onChange={e => setSkills(p=>({...p,personal_weakness:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Career Ambitions" /><textarea rows={2} value={skills.career_ambitions} onChange={e => setSkills(p=>({...p,career_ambitions:e.target.value}))} /></div>
                <div className="fg s2"><Lbl t="Personal Ambitions" /><textarea rows={2} value={skills.personal_ambitions} onChange={e => setSkills(p=>({...p,personal_ambitions:e.target.value}))} /></div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Languages Known</div>
              <div className="dt-wrap" style={{ marginBottom:6 }}>
                <table className="dt">
                  <thead><tr><th>Language</th><th style={{ textAlign:'center' }}>Speak</th><th style={{ textAlign:'center' }}>Read</th><th style={{ textAlign:'center' }}>Write</th><th style={{ width:36 }} /></tr></thead>
                  <tbody>
                    {langs.map((row, i) => (
                      <tr key={i}>
                        <td><input placeholder="e.g. Hindi, English" value={row.language} onChange={e => setLangs(l => l.map((r,j) => j===i?{...r,language:e.target.value}:r))} /></td>
                        {(['speak','read','write'] as const).map(k => (
                          <td key={k} style={{ textAlign:'center' }}>
                            <input type="checkbox" checked={row[k]}
                              onChange={e => setLangs(l => l.map((r,j) => j===i?{...r,[k]:e.target.checked}:r))}
                              style={{ width:15, height:15, accentColor:'var(--bl)', cursor:'pointer' }} />
                          </td>
                        ))}
                        <td><button type="button" className="del-btn" onClick={() => setLangs(l => l.filter((_,j) => j!==i))}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="add-row" onClick={() => setLangs(l => [...l, blankLang()])}>+ Add language</button>
            </div>
            <div className="nav-row"><button className="btn btn-sec" onClick={prev}>← Back</button><button className="btn btn-pri" onClick={next}>Next: Health →</button></div>
          </>)}

          {/* ══════════════════════════════════════════════════════
              STEP 6: HEALTH & COMPLIANCE
              ══════════════════════════════════════════════════════ */}
          {step === 'health' && (<>
            <div className="card">
              <div className="card-title">Health Information</div>
              <div className="g2">
                <div className="fg"><Lbl t="Physical Disability?" /><YN val={s6.disability} onChange={v => setS6(p=>({...p,disability:v}))} />
                  {s6.disability==='Yes' && <textarea style={{ marginTop:8 }} rows={2} placeholder="Describe the disability" value={s6.disability_details} onChange={e => setS6(p=>({...p,disability_details:e.target.value}))} />}
                </div>
                <div className="fg"><Lbl t="Eye Lens Usage?" /><YN val={s6.eye_lens} onChange={v => setS6(p=>({...p,eye_lens:v}))} />
                  {s6.eye_lens==='Yes' && (
                    <div className="g2" style={{ marginTop:8 }}>
                      <input placeholder="Left eye power" value={s6.left_eye} onChange={e => setS6(p=>({...p,left_eye:e.target.value}))} />
                      <input placeholder="Right eye power" value={s6.right_eye} onChange={e => setS6(p=>({...p,right_eye:e.target.value}))} />
                    </div>
                  )}
                </div>
                <div className="fg"><Lbl t="Any Medical Conditions" /><textarea rows={2} value={s6.medical_conditions} onChange={e => setS6(p=>({...p,medical_conditions:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Infectious / Communicable Diseases" /><textarea rows={2} value={s6.infectious} onChange={e => setS6(p=>({...p,infectious:e.target.value}))} /></div>
                <div className="fg"><Lbl t="COVID-19 Vaccination" /><Chips opts={['Not Vaccinated','Single Dose','Double Dose','Booster Dose']} val={s6.vaccination} onChange={v => setS6(p=>({...p,vaccination:v}))} variant="gr" /></div>
                <div className="fg"><Lbl t="Emergency Medical Notes" /><textarea rows={2} value={s6.emergency_notes} onChange={e => setS6(p=>({...p,emergency_notes:e.target.value}))} /></div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Lifestyle</div>
              {[
                ['Smoking Habit', 'smoking'],
                ['Drinking Habit', 'drinking'],
              ].map(([label, key]) => (
                <div key={key} className="fg">
                  <Lbl t={label} />
                  <Chips opts={['No','Casual','Regular']} val={(s6 as any)[key]}
                    onChange={v => setS6(p => ({ ...p, [key]: v }))} />
                </div>
              ))}
            </div>
            <div className="nav-row"><button className="btn btn-sec" onClick={prev}>← Back</button><button className="btn btn-pri" onClick={next}>Next: Assets & Legal →</button></div>
          </>)}

          {/* ══════════════════════════════════════════════════════
              STEP 7: ASSETS & LEGAL
              ══════════════════════════════════════════════════════ */}
          {step === 'assets' && (<>
            <div className="card">
              <div className="card-title">Vehicle & Assets</div>
              <div className="g2">
                <div className="fg"><Lbl t="Own Vehicle?" /><YN val={s7.own_vehicle} onChange={v => setS7(p=>({...p,own_vehicle:v}))} />
                  {s7.own_vehicle==='Yes' && (
                    <div className="g2" style={{ marginTop:8 }}>
                      <input placeholder="Vehicle details (type/model)" value={s7.vehicle_details} onChange={e => setS7(p=>({...p,vehicle_details:e.target.value}))} />
                      <input placeholder="Registration number" value={s7.vehicle_reg} onChange={e => setS7(p=>({...p,vehicle_reg:e.target.value}))} />
                      <input placeholder="Driving licence number" value={s7.dl_no} onChange={e => setS7(p=>({...p,dl_no:e.target.value}))} />
                      <input placeholder="Vehicle class" value={s7.vehicle_class} onChange={e => setS7(p=>({...p,vehicle_class:e.target.value}))} />
                      <input type="date" placeholder="Licence validity" value={s7.license_validity} onChange={e => setS7(p=>({...p,license_validity:e.target.value}))} />
                    </div>
                  )}
                </div>
                <div className="fg"><Lbl t="Own Licensed Weapon?" /><YN val={s7.weapon} onChange={v => setS7(p=>({...p,weapon:v}))} />
                  {s7.weapon==='Yes' && <input style={{ marginTop:8 }} placeholder="Weapon details" value={s7.weapon_details} onChange={e => setS7(p=>({...p,weapon_details:e.target.value}))} />}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Legal & Compliance</div>
              {[
                ['Any court proceedings against you?', 'court_proceedings', 'court_details'],
                ['Ever charge-sheeted or reprimanded?',  'charge_sheeted', 'charge_details'],
                ['Member of any trade union?',           'trade_union',    'union_details'],
                ['Participated in any strike or gherao?','strike',         'strike_details'],
              ].map(([label, key, detailKey]) => (
                <div key={key} className="fg">
                  <Lbl t={label} />
                  <YN val={(s7 as any)[key]} onChange={v => setS7(p=>({...p,[key]:v}))} />
                  {(s7 as any)[key]==='Yes' && (
                    <textarea style={{ marginTop:8 }} rows={2} placeholder="Please provide details…"
                      value={(s7 as any)[detailKey]} onChange={e => setS7(p=>({...p,[detailKey]:e.target.value}))} />
                  )}
                </div>
              ))}
              <div className="divider" />
              <div className="sec-label">Statutory Details</div>
              <div className="g2">
                <div className="fg"><Lbl t="PF (Provident Fund) Number" /><input value={s7.pf_no} onChange={e => setS7(p=>({...p,pf_no:e.target.value}))} /></div>
                <div className="fg"><Lbl t="ESI Number" /><input value={s7.esi_no} onChange={e => setS7(p=>({...p,esi_no:e.target.value}))} /></div>
              </div>
            </div>
            <div className="nav-row"><button className="btn btn-sec" onClick={prev}>← Back</button><button className="btn btn-pri" onClick={next}>Next: Family →</button></div>
          </>)}

          {/* ══════════════════════════════════════════════════════
              STEP 8: FAMILY DETAILS
              ══════════════════════════════════════════════════════ */}
          {step === 'family' && (<>
            <div className="card">
              <div className="card-title">Family Details</div>
              <div className="card-sub">Include spouse, children, parents, siblings and other dependants.</div>
              {family.map((row, i) => (
                <div key={i} style={{ border:'1px solid var(--bdr)', borderRadius:'var(--r2)', padding:'12px 14px', marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.07em' }}>Member {i+1}</span>
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                      <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer', color:'var(--ink3)' }}>
                        <input type="checkbox" checked={row.dependent}
                          onChange={e => setFamily(f => f.map((r,j) => j===i?{...r,dependent:e.target.checked}:r))}
                          style={{ width:14, height:14, accentColor:'var(--bl)', cursor:'pointer' }} />
                        Dependent
                      </label>
                      <button type="button" className="del-btn" onClick={() => setFamily(f => f.filter((_,j) => j!==i))}>×</button>
                    </div>
                  </div>
                  <div className="g3">
                    <div className="fg"><Lbl t="Name" /><input value={row.name} onChange={e => setFamily(f => f.map((r,j) => j===i?{...r,name:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="Relationship" /><input placeholder="e.g. Father, Son, Sister" value={row.relation} onChange={e => setFamily(f => f.map((r,j) => j===i?{...r,relation:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="Age" /><input type="number" min="0" max="120" value={row.age} onChange={e => setFamily(f => f.map((r,j) => j===i?{...r,age:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="Occupation" /><input value={row.occupation} onChange={e => setFamily(f => f.map((r,j) => j===i?{...r,occupation:e.target.value}:r))} /></div>
                    <div className="fg"><Lbl t="Mobile Number" /><input type="tel" value={row.mobile} onChange={e => setFamily(f => f.map((r,j) => j===i?{...r,mobile:e.target.value}:r))} /></div>
                    {row.dependent && (
                      <div className="fg"><Lbl t="Employment Details" /><input value={row.emp_details} onChange={e => setFamily(f => f.map((r,j) => j===i?{...r,emp_details:e.target.value}:r))} /></div>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" className="add-row" onClick={() => setFamily(f => [...f, blankFam()])}>+ Add family member</button>
            </div>
            <div className="nav-row"><button className="btn btn-sec" onClick={prev}>← Back</button><button className="btn btn-pri" onClick={next}>Next: References →</button></div>
          </>)}

          {/* ══════════════════════════════════════════════════════
              STEP 9: REFERENCES & EMERGENCY CONTACTS
              ══════════════════════════════════════════════════════ */}
          {step === 'references' && (<>
            <div className="card">
              <div className="card-title">Professional References</div>
              <div className="card-sub">Minimum 2 professional references from previous employers or colleagues.</div>
              {errors.pro_refs && <div className="info-am" style={{ marginBottom:12 }}>⚠ {errors.pro_refs}</div>}
              {proRefs.map((row, i) => (
                <div key={i} className="ref-card">
                  <div className="ref-card-hd">
                    <span className="ref-card-lbl">Reference {i+1}</span>
                    {proRefs.length > 2 && <button type="button" className="del-btn" onClick={() => setProRefs(r => r.filter((_,j) => j!==i))}>×</button>}
                  </div>
                  <div className="g3">
                    <div className="fg"><Lbl t="Full Name" r /><input value={row.name} onChange={e => setProRefs(r => r.map((ref,j) => j===i?{...ref,name:e.target.value}:ref))} /></div>
                    <div className="fg"><Lbl t="Designation" /><input value={row.designation} onChange={e => setProRefs(r => r.map((ref,j) => j===i?{...ref,designation:e.target.value}:ref))} /></div>
                    <div className="fg"><Lbl t="Company / Organisation" /><input value={row.company} onChange={e => setProRefs(r => r.map((ref,j) => j===i?{...ref,company:e.target.value}:ref))} /></div>
                    <div className="fg"><Lbl t="Mobile Number" r /><input type="tel" value={row.mobile} onChange={e => setProRefs(r => r.map((ref,j) => j===i?{...ref,mobile:e.target.value}:ref))} /></div>
                    <div className="fg"><Lbl t="Email Address" /><input type="email" value={row.email} onChange={e => setProRefs(r => r.map((ref,j) => j===i?{...ref,email:e.target.value}:ref))} /></div>
                    <div className="fg"><Lbl t="Address" /><input value={row.address} onChange={e => setProRefs(r => r.map((ref,j) => j===i?{...ref,address:e.target.value}:ref))} /></div>
                  </div>
                </div>
              ))}
              <button type="button" className="add-row" onClick={() => setProRefs(r => [...r, blankProRef()])}>+ Add professional reference</button>
            </div>

            <div className="card">
              <div className="card-title">Local References</div>
              <div className="card-sub">Minimum 2 persons known to you from your locality (not relatives).</div>
              {errors.loc_refs && <div className="info-am" style={{ marginBottom:12 }}>⚠ {errors.loc_refs}</div>}
              {locRefs.map((row, i) => (
                <div key={i} className="ref-card">
                  <div className="ref-card-hd">
                    <span className="ref-card-lbl">Local Reference {i+1}</span>
                    {locRefs.length > 2 && <button type="button" className="del-btn" onClick={() => setLocRefs(r => r.filter((_,j) => j!==i))}>×</button>}
                  </div>
                  <div className="g2">
                    <div className="fg"><Lbl t="Full Name" r /><input value={row.name} onChange={e => setLocRefs(r => r.map((ref,j) => j===i?{...ref,name:e.target.value}:ref))} /></div>
                    <div className="fg"><Lbl t="Occupation" /><input value={row.occupation} onChange={e => setLocRefs(r => r.map((ref,j) => j===i?{...ref,occupation:e.target.value}:ref))} /></div>
                    <div className="fg"><Lbl t="Contact Number" r /><input type="tel" value={row.contact} onChange={e => setLocRefs(r => r.map((ref,j) => j===i?{...ref,contact:e.target.value}:ref))} /></div>
                    <div className="fg"><Lbl t="Address" /><input value={row.address} onChange={e => setLocRefs(r => r.map((ref,j) => j===i?{...ref,address:e.target.value}:ref))} /></div>
                  </div>
                </div>
              ))}
              <button type="button" className="add-row" onClick={() => setLocRefs(r => [...r, blankLocRef()])}>+ Add local reference</button>
            </div>

            <div className="card">
              <div className="card-title">Emergency Contact</div>
              <div className="g2">
                <div className="fg"><Lbl t="Full Name" /><input value={emergency.name} onChange={e => setEmergency(p=>({...p,name:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Relationship" /><input value={emergency.relation} onChange={e => setEmergency(p=>({...p,relation:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Mobile Number" /><input type="tel" value={emergency.mobile} onChange={e => setEmergency(p=>({...p,mobile:e.target.value}))} /></div>
                <div className="fg"><Lbl t="Email Address" /><input type="email" value={emergency.email} onChange={e => setEmergency(p=>({...p,email:e.target.value}))} /></div>
                <div className="fg s2"><Lbl t="Full Address" /><input value={emergency.address} onChange={e => setEmergency(p=>({...p,address:e.target.value}))} /></div>
              </div>
            </div>
            <div className="nav-row"><button className="btn btn-sec" onClick={prev}>← Back</button><button className="btn btn-pri" onClick={next}>Next: Preferences →</button></div>
          </>)}

          {/* ══════════════════════════════════════════════════════
              STEP 10: PREFERENCES & COMPANY INFORMATION
              ══════════════════════════════════════════════════════ */}
          {step === 'preferences' && (<>
            <div className="card">
              <div className="card-title">Work Preferences</div>
              <div className="g2" style={{ marginBottom:4 }}>
                <div className="fg"><Lbl t="Preferred Interview Location" /><input value={s10.pref_interview_loc} onChange={e => F10('pref_interview_loc',e.target.value)} /></div>
                <div className="fg"><Lbl t="Preferred Posting Location" /><input value={s10.pref_posting_loc} onChange={e => F10('pref_posting_loc',e.target.value)} /></div>
              </div>
              <Sw label="Ready to Relocate?" sub="Willing to move to a different city or state" val={s10.relocate} onChange={v => F10('relocate',v)} />
              <Sw label="Willing to Travel for Work?" sub="Outstation trips as required" val={s10.travel} onChange={v => F10('travel',v)} />
              <Sw label="Comfortable with Long Working Hours?" sub="When business requires extended shifts" val={s10.long_hours} onChange={v => F10('long_hours',v)} />
            </div>

            <div className="card">
              <div className="card-title">Company History</div>
              <div className="fg">
                <Lbl t="Do you know anyone employed in this company?" />
                <YN val={s10.known_employee} onChange={v => F10('known_employee',v)} />
                {s10.known_employee==='Yes' && <input style={{ marginTop:8 }} placeholder="Name, department, relationship" value={s10.known_emp_details} onChange={e => F10('known_emp_details',e.target.value)} />}
              </div>
              <div className="fg">
                <Lbl t="Have you previously been employed with this company?" />
                <YN val={s10.prev_employed} onChange={v => F10('prev_employed',v)} />
                {s10.prev_employed==='Yes' && <input style={{ marginTop:8 }} placeholder="Department, duration, reason for leaving" value={s10.prev_emp_details} onChange={e => F10('prev_emp_details',e.target.value)} />}
              </div>
              <div className="fg">
                <Lbl t="Have you previously appeared for an interview here?" />
                <YN val={s10.prev_interview} onChange={v => F10('prev_interview',v)} />
                {s10.prev_interview==='Yes' && <input style={{ marginTop:8 }} placeholder="Position applied, year, outcome" value={s10.prev_interview_details} onChange={e => F10('prev_interview_details',e.target.value)} />}
              </div>
            </div>

            <div className="card">
              <div className="card-title">How did you hear about us?</div>
              <Chips
                opts={['Advertisement','Referral','Friends','Social Media','Job Portal (Naukri/LinkedIn)','Company Website','Walk-in','Other']}
                val={s10.heard_from}
                onChange={v => F10('heard_from',v)}
              />
            </div>
            <div className="nav-row"><button className="btn btn-sec" onClick={prev}>← Back</button><button className="btn btn-pri" onClick={next}>Next: Declaration →</button></div>
          </>)}

          {/* ══════════════════════════════════════════════════════
              STEP 11: DECLARATIONS & AGREEMENTS
              ══════════════════════════════════════════════════════ */}
          {step === 'declaration' && (<>
            <div className="card">
              <div className="card-title">Declarations & Agreements</div>
              <div className="card-sub">Please read each statement carefully and confirm your acceptance.</div>

              <div className="decl-box">
                <strong>1. Employment Commitment</strong><br />
                I understand and accept that this employment is subject to satisfactory performance during the probation period. The company reserves the right to terminate my employment during probation without notice or compensation.<br /><br />
                <strong>2. Transferability</strong><br />
                I acknowledge that the company may, at its discretion, transfer me to any department, location, or subsidiary as deemed necessary, and I agree to such transfer without objection.<br /><br />
                <strong>3. Confidentiality</strong><br />
                I agree to maintain strict confidentiality of all proprietary information, trade secrets, client data, business strategies, and internal communications both during and after my employment with the company.<br /><br />
                <strong>4. Policy Acceptance</strong><br />
                I have read and understood the company's HR policies, code of conduct, leave policy, and other applicable guidelines, and I agree to abide by them at all times during my employment.<br /><br />
                <strong>5. Notice Period</strong><br />
                I understand that I am required to serve the notice period as stipulated in my appointment letter and agree not to leave without proper handover and completion of all exit formalities.<br /><br />
                <strong>6. Information Accuracy</strong><br />
                I declare that all information furnished by me in this form and attached documents is true, complete, and accurate to the best of my knowledge. I understand that providing false information may result in immediate termination and legal action.
              </div>

              {errors.decl && <div className="info-am" style={{ marginBottom:12 }}>⚠ {errors.decl as string}</div>}

              {[
                { k:'commit1', label:'I confirm my understanding and acceptance of the employment commitment and probation terms.' },
                { k:'commit2', label:'I agree to be transferred to any location, department, or subsidiary as required by the company.' },
                { k:'commit3', label:'I agree to maintain confidentiality of all company information during and after employment.' },
                { k:'commit4', label:'I have read and agree to abide by all company policies, code of conduct, and HR guidelines.' },
                { k:'commit5', label:'I acknowledge the notice period requirement and agree to complete all exit formalities.' },
                { k:'commit6', label:'I declare that all information provided in this form is true, accurate, and complete.' },
              ].map(({ k, label }) => (
                <label key={k} className="cb-row">
                  <input type="checkbox" checked={!!(s11 as any)[k]} onChange={e => F11(k as any, e.target.checked)} />
                  <span className="cb-label">{label}</span>
                </label>
              ))}
            </div>

            <div className="card">
              <div className="card-title">Digital Signature</div>
              <div className="card-sub">Sign in the box below using your mouse or touch.</div>
              <div className="sig-wrap">
                <canvas ref={sigCanvas} className="sig-canvas"
                  onMouseDown={sigStart} onMouseMove={sigMove} onMouseUp={sigEnd} onMouseLeave={sigEnd}
                  onTouchStart={sigStart} onTouchMove={sigMove} onTouchEnd={sigEnd}
                />
                <div className="sig-bar">
                  <span>{sigHasData ? '✓ Signature captured' : 'Draw your signature above'}</span>
                  <button type="button" onClick={clearSig} style={{ background:'none', border:'1px solid var(--bdr2)', borderRadius:'var(--r)', padding:'3px 10px', fontSize:11, cursor:'pointer', fontFamily:'var(--fn)', color:'var(--ink3)' }}>
                    Clear
                  </button>
                </div>
              </div>

              <div className="g3" style={{ marginTop:14 }}>
                <div className="fg s2">
                  <Lbl t="Name (as signature)" r />
                  <input placeholder="Type your full name" value={s11.sig_name}
                    onChange={e => F11('sig_name', e.target.value)}
                    className={errors.sig_name ? 'er' : ''} />
                  <Err k="sig_name" />
                </div>
                <div className="fg">
                  <Lbl t="Place" r />
                  <input placeholder="City / Town" value={s11.place}
                    onChange={e => F11('place', e.target.value)}
                    className={errors.place ? 'er' : ''} />
                  <Err k="place" />
                </div>
                <div className="fg s2">
                  <Lbl t="Date" />
                  <input type="date" value={s11.date} disabled />
                </div>
              </div>
            </div>

            <div className="nav-row">
              <button className="btn btn-sec" onClick={prev}>← Back</button>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-sec" onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? '…' : '↑ Save Draft'}
                </button>
                <button
                  className="btn btn-gr"
                  disabled={
                    !s11.commit1 || !s11.commit2 || !s11.commit3 ||
                    !s11.commit4 || !s11.commit5 || !s11.commit6 ||
                    !s11.sig_name || !s11.place || saveMutation.isPending
                  }
                  onClick={async () => { if (validate('declaration')) await saveMutation.mutateAsync(false); }}
                >
                  {saveMutation.isPending ? <><span className="spin" /> Submitting…</> : '✓ Submit Pre-Joining Form'}
                </button>
              </div>
            </div>
          </>)}

        </div>
      </div>
    </>
  );
}
