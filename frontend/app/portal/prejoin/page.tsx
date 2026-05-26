'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portalService } from '../../../services/api/candidate.service';

// ─── Types ───────────────────────────────────────────────────────────────────
type AnyRecord = Record<string, unknown>;
interface FamilyRow  { name: string; relation: string; age: string; occupation: string; }
interface RefRow     { name: string; occupation: string; contact: string; address: string; }

// ─── Steps ───────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'personal',    label: 'Personal',      icon: '01' },
  { id: 'job',         label: 'Job Details',   icon: '02' },
  { id: 'address',     label: 'Address',       icon: '03' },
  { id: 'transport',   label: 'Transport',     icon: '04' },
  { id: 'family',      label: 'Family',        icon: '05' },
  { id: 'references',  label: 'References',    icon: '06' },
  { id: 'health',      label: 'Health',        icon: '07' },
  { id: 'declaration', label: 'Declaration',   icon: '08' },
] as const;
type StepId = typeof STEPS[number]['id'];

// ─── Constants ───────────────────────────────────────────────────────────────
const BLOOD_GROUPS  = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const RELIGIONS     = ['Hindu','Muslim','Christian','Sikh','Buddhist','Jain','Parsi','Other'];
const STATES        = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Chandigarh','Puducherry'];
const TRANSPORT_MODES = ['Own Vehicle','Public Bus','Metro','Auto/Cab','Company Cab','Walking','Bicycle','Carpool'];
const VEHICLE_TYPES = ['Two-wheeler (Bike/Scooter)','Car','Auto-rickshaw','Other'];
const DEPARTMENTS   = ['Engineering','Human Resources','Finance','Marketing','Sales','Operations','Design','Product','Legal','Admin'];
const REF_SOURCES   = ['Naukri','LinkedIn','CollarCheck','Referral','Walk-in','Indeed','Direct','Other'];

// ─── Auth hook ────────────────────────────────────────────────────────────────
function usePortalAuth() {
  const router  = useRouter();
  const [token, setToken]   = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const t = localStorage.getItem('portal_token');
    if (!t) router.replace('/portal/login');
    else setToken(t);
    setChecked(true);
  }, [router]);
  return { token, checked };
}

// ─── Generate reference ID ────────────────────────────────────────────────────
function genRefId() {
  const yr = new Date().getFullYear().toString().slice(-2);
  const mn = String(new Date().getMonth() + 1).padStart(2, '0');
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NX-${yr}${mn}-${rnd}`;
}

// ─── Inline styles ────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#f7f6f3;--sur:#fff;--bdr:#e2dfd6;--bdr2:#c9c5bc;
  --ink:#1a1714;--ink2:#3d3930;--ink3:#6b6459;--ink4:#9c9487;
  --bl:#1e4bd8;--bl-lt:#eef1fc;--bl-md:#c5cdf7;
  --gr:#15803d;--gr-lt:#dcfce7;--gr-bd:#86efac;
  --rd:#991b1b;--rd-lt:#fee2e2;--rd-bd:#fca5a5;
  --am:#92400e;--am-lt:#fef3c7;--am-bd:#fcd34d;
  --tl:#0f766e;--tl-lt:#ccfbf1;--tl-bd:#5eead4;
  --r:6px;--r2:10px;--r3:16px;--r4:24px;
  --sh:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
  --sh2:0 4px 12px rgba(0,0,0,.1);
  --fn:'DM Sans',system-ui,sans-serif;
  --fs:'Instrument Serif',Georgia,serif;
}
body{background:var(--bg);font-family:var(--fn);font-size:13px;color:var(--ink2);-webkit-font-smoothing:antialiased;}

/* Layout */
.topbar{background:var(--sur);border-bottom:1px solid var(--bdr);height:56px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
.wrap{max-width:860px;margin:0 auto;padding:24px 16px 100px;}

/* Progress */
.prog-outer{background:var(--bdr);border-radius:99px;height:3px;overflow:hidden;}
.prog-inner{height:100%;background:var(--ink);border-radius:99px;transition:width .35s ease;}
.stepper{display:flex;gap:3px;flex-wrap:wrap;margin:12px 0 24px;}
.sp{display:flex;align-items:center;gap:6px;padding:5px 11px 5px 7px;border-radius:99px;font-size:11px;font-weight:500;cursor:pointer;transition:all .13s;border:1px solid var(--bdr);background:var(--bg);color:var(--ink4);}
.sp.active{background:var(--ink);border-color:var(--ink);color:#fff;}
.sp.done{background:var(--gr-lt);border-color:var(--gr-bd);color:var(--gr);}
.sp-dot{width:17px;height:17px;border-radius:50%;background:currentColor;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;flex-shrink:0;}
.sp.active .sp-dot{background:rgba(255,255,255,.25);color:#fff;}
.sp.done .sp-dot{background:var(--gr);color:#fff;}

/* Company header */
.co-header{background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r3);padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:16px;box-shadow:var(--sh);}
.co-logo{width:56px;height:56px;border-radius:var(--r2);border:2px dashed var(--bdr2);display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--bg);flex-shrink:0;overflow:hidden;}
.co-logo img{width:100%;height:100%;object-fit:cover;}
.co-info{flex:1;}
.co-name{font-family:var(--fs);font-size:20px;font-style:italic;color:var(--ink);letter-spacing:-.3px;line-height:1.2;}
.co-addr{font-size:12px;color:var(--ink4);margin-top:3px;line-height:1.5;}
.ref-badge{margin-left:auto;text-align:right;flex-shrink:0;}
.ref-label{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink4);font-weight:600;}
.ref-val{font-family:monospace;font-size:13px;font-weight:700;color:var(--bl);margin-top:2px;}

/* Form title */
.form-title{font-family:var(--fs);font-size:26px;font-style:italic;color:var(--ink);letter-spacing:-.5px;margin-bottom:4px;}
.form-sub{font-size:12px;color:var(--ink4);margin-bottom:20px;line-height:1.5;}

/* Card */
.card{background:var(--sur);border:1px solid var(--bdr);border-radius:var(--r3);padding:24px 26px;margin-bottom:16px;box-shadow:var(--sh);}
.card-title{font-family:var(--fs);font-size:16px;font-style:italic;color:var(--ink);margin-bottom:2px;}
.card-sub{font-size:11px;color:var(--ink4);margin-bottom:18px;}

/* Fields */
.fg{display:flex;flex-direction:column;gap:4px;margin-bottom:14px;}
.fg label{font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.07em;}
.req{color:var(--rd);}
.err-msg{font-size:10px;color:var(--rd);margin-top:2px;font-weight:500;}
input,select,textarea{width:100%;border:1px solid var(--bdr2);border-radius:var(--r);padding:8px 11px;font-size:13px;font-family:var(--fn);color:var(--ink);background:var(--sur);outline:none;transition:border-color .15s,box-shadow .15s;}
input:focus,select:focus,textarea:focus{border-color:var(--bl);box-shadow:0 0 0 3px rgba(30,75,216,.08);}
input.err,select.err,textarea.err{border-color:var(--rd);background:#fffafa;}
input:disabled{background:var(--bg);color:var(--ink4);}
textarea{resize:vertical;min-height:72px;line-height:1.5;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:0 16px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 14px;}
.span2{grid-column:1/-1;}

/* Chips */
.chips{display:flex;flex-wrap:wrap;gap:6px;padding-top:2px;}
.chip{padding:6px 13px;border-radius:99px;font-size:12px;cursor:pointer;transition:all .12s;border:1px solid var(--bdr2);background:var(--bg);color:var(--ink3);font-family:var(--fn);font-weight:400;}
.chip.sel{background:var(--ink);border-color:var(--ink);color:#fff;}
.chip.gr.sel{background:var(--gr);border-color:var(--gr);color:#fff;}
.chip.rd.sel{background:var(--rd);border-color:var(--rd);color:#fff;}

/* Yes/No toggle */
.yn{display:flex;gap:8px;}
.yn-btn{padding:7px 18px;border-radius:99px;font-size:12px;cursor:pointer;border:1px solid var(--bdr2);background:var(--bg);color:var(--ink3);font-family:var(--fn);transition:all .12s;}
.yn-btn.y.sel{background:var(--gr);border-color:var(--gr);color:#fff;font-weight:600;}
.yn-btn.n.sel{background:var(--rd);border-color:var(--rd);color:#fff;font-weight:600;}

/* Toggle switch */
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid var(--bdr);border-radius:var(--r2);margin-bottom:8px;}
.toggle-info{display:flex;flex-direction:column;gap:2px;}
.toggle-info span{font-size:12px;font-weight:500;color:var(--ink);}
.toggle-info small{font-size:11px;color:var(--ink4);}
.sw{position:relative;width:40px;height:22px;flex-shrink:0;}
.sw input{opacity:0;width:0;height:0;position:absolute;}
.sw-track{position:absolute;inset:0;border-radius:99px;background:var(--bdr2);cursor:pointer;transition:background .2s;}
.sw input:checked ~ .sw-track{background:var(--gr);}
.sw-thumb{position:absolute;top:3px;left:3px;width:16px;height:16px;background:#fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .2s;pointer-events:none;}
.sw input:checked ~ .sw-track .sw-thumb{transform:translateX(18px);}

/* Dynamic table */
.dt-wrap{border:1px solid var(--bdr);border-radius:var(--r2);overflow:hidden;}
.dt{width:100%;border-collapse:collapse;}
.dt th{background:var(--bg);padding:8px 10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--ink4);border-bottom:1px solid var(--bdr);text-align:left;}
.dt td{padding:5px 6px;border-bottom:1px solid var(--bdr);}
.dt tr:last-child td{border-bottom:none;}
.dt td input{border:none;background:transparent;padding:4px;font-size:12px;width:100%;outline:none;}
.dt td input:focus{background:var(--bl-lt);border-radius:4px;}
.add-row{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--bl);background:none;border:none;cursor:pointer;padding:9px 12px;font-family:var(--fn);font-weight:500;}
.add-row:hover{text-decoration:underline;}
.del-btn{background:none;border:none;cursor:pointer;color:var(--ink4);padding:2px 6px;font-size:15px;line-height:1;}
.del-btn:hover{color:var(--rd);}

/* Photo upload */
.photo-zone{border:2px dashed var(--bdr2);border-radius:var(--r2);text-align:center;cursor:pointer;background:var(--bg);transition:border-color .15s;padding:18px;width:130px;}
.photo-zone:hover{border-color:var(--bl);}
.photo-circle{width:76px;height:76px;border-radius:50%;background:var(--bdr);display:flex;align-items:center;justify-content:center;font-size:22px;margin:0 auto 8px;overflow:hidden;}
.photo-circle img{width:100%;height:100%;object-fit:cover;}

/* Signature pad */
.sig-wrap{border:1px solid var(--bdr2);border-radius:var(--r);overflow:hidden;background:#fff;}
.sig-canvas{display:block;cursor:crosshair;touch-action:none;}
.sig-toolbar{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--bg);border-top:1px solid var(--bdr);font-size:11px;color:var(--ink4);}

/* Declaration */
.decl-box{background:#fffdf5;border:1px solid #e9e0bf;border-radius:var(--r2);padding:14px 16px;font-size:12px;line-height:1.8;color:var(--ink2);max-height:180px;overflow-y:auto;margin-bottom:14px;}
.cb-row{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border:1px solid var(--bdr);border-radius:var(--r2);cursor:pointer;margin-bottom:8px;transition:background .1s;}
.cb-row:hover{background:var(--bg);}
.cb-row input[type=checkbox]{width:15px;height:15px;accent-color:var(--ink);cursor:pointer;margin-top:2px;flex-shrink:0;}
.cb-label{font-size:12px;color:var(--ink2);line-height:1.5;}

/* Salary cards */
.sal-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
.sal-card{border-radius:var(--r2);padding:12px 14px;}
.sal-card .sal-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;}
.sal-card .sal-val{font-size:16px;font-weight:600;font-family:monospace;}
.sal-card .sal-ann{font-size:10px;margin-top:3px;}

/* Navigation */
.nav-row{display:flex;justify-content:space-between;gap:10px;margin-top:8px;}
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 20px;border-radius:var(--r2);font-size:13px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:all .12s;font-family:var(--fn);}
.btn-pri{background:var(--ink);color:#fff;border-color:var(--ink);}
.btn-pri:hover{background:#333;}
.btn-sec{background:var(--sur);color:var(--ink2);border-color:var(--bdr2);}
.btn-sec:hover{background:var(--bg);}
.btn-gr{background:var(--gr);color:#fff;border-color:var(--gr);}
.btn-gr:hover{background:#166534;}
.btn:disabled{opacity:.45;cursor:not-allowed;}
.spin{width:13px;height:13px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:sp .65s linear infinite;display:inline-block;}
@keyframes sp{to{transform:rotate(360deg)}}

.info-box{border-radius:var(--r);padding:10px 13px;font-size:12px;line-height:1.5;}
.info-bl{background:var(--bl-lt);border:1px solid var(--bl-md);color:var(--bl);}
.info-gr{background:var(--gr-lt);border:1px solid var(--gr-bd);color:var(--gr);}
.info-am{background:var(--am-lt);border:1px solid var(--am-bd);color:var(--am);}
.divider{height:1px;background:var(--bdr);margin:16px 0;}
.section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--ink4);padding-bottom:8px;border-bottom:1px solid var(--bdr);margin-bottom:12px;}
.done-card{text-align:center;padding:52px 24px;}
@media(max-width:600px){.g2,.g3,.sal-cards{grid-template-columns:1fr;}}
`;

// ─── Main component ───────────────────────────────────────────────────────────
export default function PrejoinFormPage() {
  const router   = useRouter();
  const qc       = useQueryClient();
  const { token, checked } = usePortalAuth();
  const photoRef = useRef<HTMLInputElement>(null);
  const sigRef   = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [sigHasData, setSigHasData] = useState(false);
  const [refId]    = useState(genRefId);

  const [step,      setStep]      = useState<StepId>('personal');
  const [visited,   setVisited]   = useState<Set<StepId>>(new Set(['personal']));
  const [photo,     setPhoto]     = useState('');
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Form sections
  const [p1, setP1] = useState({
    full_name:'', bank_name:'', dob:'', mobile:'', emergency_contact:'',
    email:'', father_name:'', spouse_name:'', gender:'', marital_status:'',
    date_of_marriage:'', nationality:'Indian', religion:'', place_of_birth:'',
    blood_group:'', height:'', weight:'', disability:'No', disability_desc:'',
    aadhaar:'', pan:'',
  });
  const [p2, setP2] = useState({
    position:'', department:'', reference_source:'', interview_date:'', interview_time:'',
    expected_salary:'', current_salary:'', notice_period:'', total_experience:'',
    employer_name:'', employment_status:'', reason_for_change:'',
  });
  const [p3, setP3] = useState({
    pr_house_type:'', pr_house_no:'', pr_street:'', pr_area:'', pr_city:'', pr_district:'', pr_state:'', pr_pin:'',
    pe_house_type:'', pe_house_no:'', pe_street:'', pe_area:'', pe_city:'', pe_district:'', pe_state:'', pe_pin:'',
    same_address: false,
    distance_office:'', travel_time:'', travel_mode:'',
  });
  const [p4, setP4] = useState({
    own_vehicle:'No', vehicle_type:'', vehicle_reg:'',
    driving_license:'No', driving_license_no:'',
    passport:'No', passport_no:'',
    travel_india:'No', travel_overseas:'No',
  });
  const [family, setFamily] = useState<FamilyRow[]>([
    { name:'', relation:'', age:'', occupation:'' },
    { name:'', relation:'', age:'', occupation:'' },
  ]);
  const [refs, setRefs] = useState<RefRow[]>([
    { name:'', occupation:'', contact:'', address:'' },
    { name:'', occupation:'', contact:'', address:'' },
  ]);
  const [p7, setP7] = useState({
    vaccination:'', willing_late:'No', willing_holiday:'No', rotational_shift:'No', relocation:'No',
  });
  const [p8, setP8] = useState({
    convicted:'No', convicted_desc:'', confirm_true:false, agree_terms:false,
    candidate_sig_name:'', place:'', date: new Date().toISOString().slice(0, 10),
  });

  // Company info
  const { data: companyInfo } = useQuery({
    queryKey: ['portal-company-info'],
    queryFn:  () => portalService.getCompanyInfo(),
    enabled:  !!token,
    select:   r => (r as any).data,
  });

  // Load profile / draft
  const { data: profile } = useQuery({
    queryKey: ['portal-profile'],
    queryFn:  () => portalService.getProfile(),
    enabled:  !!token,
    select:   r => r.data,
  });

  useEffect(() => {
    if (!profile?.preinterview_form_data) return;
    const fd = profile.preinterview_form_data as AnyRecord;
    if (fd.p1) setP1(fd.p1 as typeof p1);
    if (fd.p2) setP2(fd.p2 as typeof p2);
    if (fd.p3) setP3(fd.p3 as typeof p3);
    if (fd.p4) setP4(fd.p4 as typeof p4);
    if (fd.family) setFamily(fd.family as FamilyRow[]);
    if (fd.refs)   setRefs(fd.refs as RefRow[]);
    if (fd.p7) setP7(fd.p7 as typeof p7);
    if (fd.p8) setP8(fd.p8 as typeof p8);
    if (fd.photo) setPhoto(fd.photo as string);
    if (profile.preinterview_form_status === 'Submitted') setSubmitted(true);
  }, [profile]);

  // Sync permanent address from present
  useEffect(() => {
    if (!p3.same_address) return;
    setP3(prev => ({
      ...prev,
      pe_house_type: prev.pr_house_type, pe_house_no: prev.pr_house_no,
      pe_street: prev.pr_street, pe_area: prev.pr_area,
      pe_city: prev.pr_city, pe_district: prev.pr_district,
      pe_state: prev.pr_state, pe_pin: prev.pr_pin,
    }));
  }, [p3.same_address, p3.pr_house_type, p3.pr_house_no, p3.pr_street, p3.pr_area, p3.pr_city, p3.pr_district, p3.pr_state, p3.pr_pin]);

  const saveMutation = useMutation({
    mutationFn: (isDraft: boolean) => portalService.savePrejoin(
      { p1, p2, p3, p4, family, refs, p7, p8, photo },
      isDraft,
    ),
    onSuccess: (_, isDraft) => {
      qc.invalidateQueries({ queryKey: ['portal-profile'] });
      if (!isDraft) setSubmitted(true);
    },
  });

  // ─── Signature pad ────────────────────────────────────────────────────────
  const initSig = useCallback(() => {
    const canvas = sigRef.current;
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth  || 400;
    canvas.height = canvas.offsetHeight || 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1a1714';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }, []);

  useEffect(() => { initSig(); }, [initSig]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const source = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    return { x: source.clientX - rect.left, y: source.clientY - rect.top };
  };

  const sigStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = sigRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    isDrawing.current = true;
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  };

  const sigMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = sigRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
    setSigHasData(true);
  };

  const sigEnd = () => { isDrawing.current = false; };

  const clearSig = () => {
    const canvas = sigRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigHasData(false);
  };

  // ─── Validation ───────────────────────────────────────────────────────────
  const validate = (id: StepId): boolean => {
    const e: Record<string, string> = {};
    if (id === 'personal') {
      if (!p1.full_name.trim())   e.full_name    = 'Full name is required';
      if (!p1.mobile.trim())      e.mobile       = 'Mobile number is required';
      else if (!/^[+\d\s\-()]{7,15}$/.test(p1.mobile)) e.mobile = 'Invalid mobile number';
      if (p1.email && !/^[^@]+@[^@]+\.[^@]+$/.test(p1.email)) e.email = 'Invalid email address';
      if (p1.aadhaar && !/^\d{4}\s?\d{4}\s?\d{4}$/.test(p1.aadhaar)) e.aadhaar = 'Aadhaar must be 12 digits';
      if (p1.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p1.pan)) e.pan = 'Invalid PAN format (e.g. ABCDE1234F)';
    }
    if (id === 'job') {
      if (!p2.position.trim())    e.position     = 'Position is required';
    }
    if (id === 'address') {
      if (!p3.pr_city.trim())     e.pr_city      = 'City is required';
      if (!p3.pr_state)           e.pr_state     = 'State is required';
      if (p3.pr_pin && !/^\d{6}$/.test(p3.pr_pin)) e.pr_pin = 'Invalid PIN code';
    }
    if (id === 'references') {
      if (refs.filter(r => r.name.trim() && r.contact.trim()).length < 2)
        e.refs = 'At least 2 references with name and contact are required';
    }
    if (id === 'declaration') {
      if (!p8.confirm_true)  e.confirm_true = 'Please confirm the declaration';
      if (!p8.agree_terms)   e.agree_terms  = 'Please agree to terms';
      if (!p8.candidate_sig_name.trim()) e.sig_name = 'Signature name is required';
      if (!p8.place.trim())  e.place        = 'Place is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goTo = (id: StepId) => { setStep(id); setVisited(v => new Set([...v, id])); };
  const stepIdx = STEPS.findIndex(s => s.id === step);
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  const next = () => {
    if (!validate(step)) return;
    if (stepIdx < STEPS.length - 1) goTo(STEPS[stepIdx + 1].id);
  };

  const prev = () => { if (stepIdx > 0) goTo(STEPS[stepIdx - 1].id); };

  const toBase64 = (file: File, cb: (s: string) => void) => {
    const r = new FileReader(); r.onload = () => cb(r.result as string); r.readAsDataURL(file);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const F1 = (k: keyof typeof p1) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setP1(prev => ({ ...prev, [k]: e.target.value }));
  const F2 = (k: keyof typeof p2) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setP2(prev => ({ ...prev, [k]: e.target.value }));
  const F3 = (k: keyof typeof p3, v: string | boolean) => setP3(prev => ({ ...prev, [k]: v }));
  const F4 = (k: keyof typeof p4, v: string) => setP4(prev => ({ ...prev, [k]: v }));
  const F7 = (k: keyof typeof p7, v: string) => setP7(prev => ({ ...prev, [k]: v }));
  const F8 = (k: keyof typeof p8, v: string | boolean) => setP8(prev => ({ ...prev, [k]: v }));

  const Err = ({ k }: { k: string }) => errors[k] ? <span className="err-msg">{errors[k]}</span> : null;
  const Label = ({ t, r }: { t: string; r?: boolean }) => <label>{t}{r && <span className="req"> *</span>}</label>;

  const Chips = ({ options, value, onChange, variant }: { options: string[]; value: string; onChange: (v: string) => void; variant?: 'gr' | 'rd' }) => (
    <div className="chips">
      {options.map(o => (
        <button key={o} type="button"
          className={`chip${value === o ? ` sel${variant ? ' '+variant : ''}` : ''}`}
          onClick={() => onChange(o)}>{o}
        </button>
      ))}
    </div>
  );

  const YN = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div className="yn">
      <button type="button" className={`yn-btn y${value==='Yes'?' sel':''}`} onClick={() => onChange('Yes')}>Yes</button>
      <button type="button" className={`yn-btn n${value==='No'?' sel':''}`}  onClick={() => onChange('No')}>No</button>
    </div>
  );

  const Sw = ({ label, sub, value, onChange }: { label: string; sub?: string; value: string; onChange: (v: string) => void }) => (
    <div className="toggle-row">
      <div className="toggle-info">
        <span>{label}</span>
        {sub && <small>{sub}</small>}
      </div>
      <label className="sw">
        <input type="checkbox" checked={value === 'Yes'} onChange={e => onChange(e.target.checked ? 'Yes' : 'No')} />
        <div className="sw-track"><div className="sw-thumb" /></div>
      </label>
    </div>
  );

  // Salary preview
  const curSal = Number(p2.current_salary || 0);
  const expSal = Number(p2.expected_salary || 0);
  const hike   = curSal > 0 && expSal > 0 ? (((expSal - curSal) / curSal) * 100).toFixed(1) : null;

  // ─── Submitted screen ─────────────────────────────────────────────────────
  if (!checked) return <><style>{css}</style><div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink4)' }}>Loading…</div></>;

  if (submitted) return (
    <>
      <style>{css}</style>
      <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
        <div className="topbar">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'var(--bl)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, color:'#fff' }}>NX</div>
            <span style={{ fontFamily:'var(--fs)', fontSize:16, color:'var(--ink)' }}>NexHR</span>
          </div>
        </div>
        <div className="wrap">
          <div className="card done-card">
            <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
            <h2 style={{ fontFamily:'var(--fs)', fontStyle:'italic', fontSize:26, color:'var(--ink)', marginBottom:8 }}>Declaration Submitted</h2>
            <p style={{ fontSize:13, color:'var(--ink4)', lineHeight:1.7, maxWidth:440, margin:'0 auto 24px' }}>
              Thank you for completing the Pre-Interview Declaration Form. HR will review your information before your interview.
            </p>
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

        {/* ── Top bar ──────────────────────────────────────── */}
        <div className="topbar">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'var(--bl)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, color:'#fff' }}>NX</div>
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
              {companyInfo?.logo_url
                ? <img src={companyInfo.logo_url} alt="logo" />
                : <span>🏢</span>}
            </div>
            <div className="co-info">
              <div className="co-name">{companyInfo?.name || 'Company Name'}</div>
              {companyInfo?.address && <div className="co-addr">{companyInfo.address}</div>}
            </div>
            <div className="ref-badge">
              <div className="ref-label">Reference ID</div>
              <div className="ref-val">{refId}</div>
            </div>
          </div>

          {/* ── Form title ──────────────────────────────────── */}
          <h1 className="form-title">Candidate Pre-Interview Declaration Form</h1>
          <p className="form-sub">Fill all sections accurately. Fields marked <span className="req">*</span> are required. Your information is kept strictly confidential.</p>

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

          {/* ══ STEP 1: PERSONAL ═══════════════════════════════ */}
          {step === 'personal' && (
            <>
              {/* Photo upload + basics */}
              <div className="card">
                <div className="card-title">Personal Information</div>
                <div className="card-sub">Enter your personal details as per official documents.</div>

                <div style={{ display:'flex', gap:20, alignItems:'flex-start', marginBottom:20 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--ink4)', marginBottom:6 }}>Passport Photo</div>
                    <div className="photo-zone" onClick={() => photoRef.current?.click()}>
                      <div className="photo-circle">
                        {photo ? <img src={photo} alt="passport" /> : '📷'}
                      </div>
                      <div style={{ fontSize:10, color:'var(--ink4)' }}>{photo ? 'Click to replace' : 'Upload photo'}</div>
                      <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if(f) toBase64(f, setPhoto); }} />
                    </div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div className="g2">
                      <div className="fg"><Label t="Full Name" r /><input placeholder="As on official ID" value={p1.full_name} onChange={F1('full_name')} className={errors.full_name?'err':''} /><Err k="full_name" /></div>
                      <div className="fg"><Label t="Name as per Bank Account" r /><input placeholder="Exact bank records name" value={p1.bank_name} onChange={F1('bank_name')} /></div>
                      <div className="fg"><Label t="Date of Birth" /><input type="date" value={p1.dob} onChange={F1('dob')} /></div>
                      <div className="fg"><Label t="Gender" /><Chips options={['Male','Female','Other','Prefer not to say']} value={p1.gender} onChange={v => setP1(p => ({...p, gender:v}))} /></div>
                    </div>
                  </div>
                </div>

                <div className="g2">
                  <div className="fg"><Label t="Mobile Number" r /><input type="tel" placeholder="+91 XXXXX XXXXX" value={p1.mobile} onChange={F1('mobile')} className={errors.mobile?'err':''} /><Err k="mobile" /></div>
                  <div className="fg"><Label t="Emergency Contact" /><input type="tel" placeholder="+91 XXXXX XXXXX" value={p1.emergency_contact} onChange={F1('emergency_contact')} /></div>
                  <div className="fg span2"><Label t="Email Address" /><input type="email" placeholder="your@email.com" value={p1.email} onChange={F1('email')} className={errors.email?'err':''} /><Err k="email" /></div>
                  <div className="fg"><Label t="Father's Name" /><input value={p1.father_name} onChange={F1('father_name')} /></div>
                  <div className="fg"><Label t="Marital Status" /><Chips options={['Single','Married','Divorced','Widowed']} value={p1.marital_status} onChange={v => setP1(p => ({...p, marital_status:v}))} /></div>
                  {p1.marital_status === 'Married' && <>
                    <div className="fg"><Label t="Spouse Name" /><input value={p1.spouse_name} onChange={F1('spouse_name')} /></div>
                    <div className="fg"><Label t="Date of Marriage" /><input type="date" value={p1.date_of_marriage} onChange={F1('date_of_marriage')} /></div>
                  </>}
                  <div className="fg"><Label t="Nationality" /><input value={p1.nationality} onChange={F1('nationality')} /></div>
                  <div className="fg"><Label t="Religion" /><select value={p1.religion} onChange={F1('religion')}><option value="">— Select —</option>{RELIGIONS.map(r => <option key={r}>{r}</option>)}</select></div>
                  <div className="fg"><Label t="Place of Birth" /><input placeholder="City / Town" value={p1.place_of_birth} onChange={F1('place_of_birth')} /></div>
                  <div className="fg"><Label t="Blood Group" /><Chips options={BLOOD_GROUPS} value={p1.blood_group} onChange={v => setP1(p => ({...p, blood_group:v}))} /></div>
                  <div className="fg"><Label t="Height (cm)" /><input type="number" placeholder="e.g. 170" value={p1.height} onChange={F1('height')} /></div>
                  <div className="fg"><Label t="Weight (kg)" /><input type="number" placeholder="e.g. 65" value={p1.weight} onChange={F1('weight')} /></div>
                  <div className="fg span2"><Label t="Any disability?" /><YN value={p1.disability} onChange={v => setP1(p => ({...p, disability:v}))} />
                    {p1.disability === 'Yes' && <input style={{ marginTop:8 }} placeholder="Please describe" value={p1.disability_desc} onChange={F1('disability_desc')} />}
                  </div>
                </div>

                <div className="divider" />
                <div className="section-label">Government ID</div>
                <div className="g2">
                  <div className="fg"><Label t="Aadhaar Number" /><input placeholder="XXXX XXXX XXXX" maxLength={14} value={p1.aadhaar} onChange={F1('aadhaar')} className={errors.aadhaar?'err':''} /><Err k="aadhaar" /></div>
                  <div className="fg"><Label t="PAN Number" /><input placeholder="ABCDE1234F" maxLength={10} style={{ textTransform:'uppercase' }} value={p1.pan} onChange={e => setP1(p => ({...p, pan:e.target.value.toUpperCase()}))} className={errors.pan?'err':''} /><Err k="pan" /></div>
                </div>
              </div>
              <div className="nav-row"><div /><button className="btn btn-pri" onClick={next}>Next: Job Details →</button></div>
            </>
          )}

          {/* ══ STEP 2: JOB DETAILS ═══════════════════════════ */}
          {step === 'job' && (
            <>
              <div className="card">
                <div className="card-title">Job Application Details</div>
                <div className="card-sub">Information about this application and your professional background.</div>

                <div className="g2">
                  <div className="fg"><Label t="Position Applied For" r /><input placeholder="Job title / role" value={p2.position} onChange={F2('position')} className={errors.position?'err':''} /><Err k="position" /></div>
                  <div className="fg"><Label t="Department" /><select value={p2.department} onChange={F2('department')}><option value="">— Select —</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></div>
                  <div className="fg"><Label t="Reference Source" /><select value={p2.reference_source} onChange={F2('reference_source')}><option value="">— Select —</option>{REF_SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
                  <div className="fg"><Label t="Interview Date" /><input type="date" value={p2.interview_date} onChange={F2('interview_date')} /></div>
                  <div className="fg"><Label t="Preferred Interview Time" /><input type="time" value={p2.interview_time} onChange={F2('interview_time')} /></div>
                  <div className="fg"><Label t="Total Years of Experience" /><input type="number" step="0.5" min="0" placeholder="e.g. 4.5" value={p2.total_experience} onChange={F2('total_experience')} /></div>
                  <div className="fg"><Label t="Notice Period (days)" /><input type="number" min="0" placeholder="e.g. 30" value={p2.notice_period} onChange={F2('notice_period')} /></div>
                  <div className="fg"><Label t="Current Employment Status" /><Chips options={['Employed','Self-Employed','Fresher','Unemployed']} value={p2.employment_status} onChange={v => setP2(p => ({...p, employment_status:v}))} /></div>
                  <div className="fg"><Label t="Current Employer Name" /><input placeholder="Company name" value={p2.employer_name} onChange={F2('employer_name')} /></div>
                  <div className="fg"><Label t="Reason for Job Change" /><input placeholder="Growth, relocation, etc." value={p2.reason_for_change} onChange={F2('reason_for_change')} /></div>
                </div>

                {/* Salary cards */}
                <div className="divider" />
                <div className="section-label">Salary Details</div>
                <div className="g2">
                  <div className="fg"><Label t="Current Salary (₹/month)" /><input type="number" min="0" placeholder="e.g. 50000" value={p2.current_salary} onChange={F2('current_salary')} /></div>
                  <div className="fg"><Label t="Expected Salary (₹/month)" /><input type="number" min="0" placeholder="e.g. 65000" value={p2.expected_salary} onChange={F2('expected_salary')} /></div>
                </div>

                {(curSal > 0 || expSal > 0) && (
                  <div className="sal-cards">
                    <div className="sal-card" style={{ background:'var(--bg)', border:'1px solid var(--bdr)' }}>
                      <div className="sal-label" style={{ color:'var(--ink4)' }}>Current CTC</div>
                      <div className="sal-val" style={{ color:'var(--ink)' }}>₹{curSal > 0 ? curSal.toLocaleString('en-IN') : '—'}</div>
                      <div className="sal-ann" style={{ color:'var(--ink4)' }}>{curSal > 0 ? `₹${(curSal*12/100000).toFixed(2)}L/yr` : ''}</div>
                    </div>
                    <div className="sal-card" style={{ background:'var(--gr-lt)', border:'1px solid var(--gr-bd)' }}>
                      <div className="sal-label" style={{ color:'var(--gr)' }}>Expected CTC</div>
                      <div className="sal-val" style={{ color:'var(--gr)' }}>₹{expSal > 0 ? expSal.toLocaleString('en-IN') : '—'}</div>
                      <div className="sal-ann" style={{ color:'var(--gr)' }}>
                        {expSal > 0 ? `₹${(expSal*12/100000).toFixed(2)}L/yr` : ''}
                        {hike && ` · ${Number(hike)>=0?'+':''}${hike}% hike`}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="nav-row">
                <button className="btn btn-sec" onClick={prev}>← Back</button>
                <button className="btn btn-pri" onClick={next}>Next: Address →</button>
              </div>
            </>
          )}

          {/* ══ STEP 3: ADDRESS ════════════════════════════════ */}
          {step === 'address' && (
            <>
              <div className="card">
                <div className="card-title">Present Address</div>
                <div className="card-sub">Your current place of residence.</div>
                <div className="fg"><Label t="House Type" /><Chips options={['Own','Rented','Parental']} value={p3.pr_house_type} onChange={v => F3('pr_house_type',v)} /></div>
                <div className="g2">
                  <div className="fg"><Label t="House / Flat Number" /><input placeholder="H.No / Flat" value={p3.pr_house_no} onChange={e => F3('pr_house_no',e.target.value)} /></div>
                  <div className="fg"><Label t="Street / Sector" /><input value={p3.pr_street} onChange={e => F3('pr_street',e.target.value)} /></div>
                  <div className="fg"><Label t="Area / Locality" /><input value={p3.pr_area} onChange={e => F3('pr_area',e.target.value)} /></div>
                  <div className="fg"><Label t="City" r /><input value={p3.pr_city} onChange={e => F3('pr_city',e.target.value)} className={errors.pr_city?'err':''} /><Err k="pr_city" /></div>
                  <div className="fg"><Label t="District" /><input value={p3.pr_district} onChange={e => F3('pr_district',e.target.value)} /></div>
                  <div className="fg"><Label t="State" r /><select value={p3.pr_state} onChange={e => F3('pr_state',e.target.value)} className={errors.pr_state?'err':''}><option value="">— Select —</option>{STATES.map(s => <option key={s}>{s}</option>)}</select><Err k="pr_state" /></div>
                  <div className="fg"><Label t="PIN Code" /><input maxLength={6} placeholder="6-digit PIN" value={p3.pr_pin} onChange={e => F3('pr_pin',e.target.value)} className={errors.pr_pin?'err':''} /><Err k="pr_pin" /></div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Permanent Address</div>
                <div style={{ marginBottom:14 }}>
                  <label className="cb-row" style={{ display:'inline-flex', width:'auto', cursor:'pointer', marginBottom:0 }}>
                    <input type="checkbox" checked={p3.same_address} onChange={e => F3('same_address', e.target.checked)} />
                    <span className="cb-label">Same as present address</span>
                  </label>
                </div>
                {!p3.same_address && (
                  <>
                    <div className="fg"><Label t="House Type" /><Chips options={['Own','Rented','Parental']} value={p3.pe_house_type} onChange={v => F3('pe_house_type',v)} /></div>
                    <div className="g2">
                      <div className="fg"><Label t="House / Flat Number" /><input value={p3.pe_house_no} onChange={e => F3('pe_house_no',e.target.value)} /></div>
                      <div className="fg"><Label t="Street / Sector" /><input value={p3.pe_street} onChange={e => F3('pe_street',e.target.value)} /></div>
                      <div className="fg"><Label t="Area / Locality" /><input value={p3.pe_area} onChange={e => F3('pe_area',e.target.value)} /></div>
                      <div className="fg"><Label t="City" /><input value={p3.pe_city} onChange={e => F3('pe_city',e.target.value)} /></div>
                      <div className="fg"><Label t="District" /><input value={p3.pe_district} onChange={e => F3('pe_district',e.target.value)} /></div>
                      <div className="fg"><Label t="State" /><select value={p3.pe_state} onChange={e => F3('pe_state',e.target.value)}><option value="">— Select —</option>{STATES.map(s => <option key={s}>{s}</option>)}</select></div>
                      <div className="fg"><Label t="PIN Code" /><input maxLength={6} value={p3.pe_pin} onChange={e => F3('pe_pin',e.target.value)} /></div>
                    </div>
                  </>
                )}
              </div>

              <div className="card">
                <div className="card-title">Commute Information</div>
                <div className="g3">
                  <div className="fg"><Label t="Distance from Office (km)" /><input type="number" step="0.5" placeholder="e.g. 12" value={p3.distance_office} onChange={e => F3('distance_office',e.target.value)} /></div>
                  <div className="fg"><Label t="Approx. Travel Time (min)" /><input type="number" placeholder="e.g. 45" value={p3.travel_time} onChange={e => F3('travel_time',e.target.value)} /></div>
                  <div className="fg"><Label t="Preferred Travel Mode" /><select value={p3.travel_mode} onChange={e => F3('travel_mode',e.target.value)}><option value="">— Select —</option>{TRANSPORT_MODES.map(t => <option key={t}>{t}</option>)}</select></div>
                </div>
              </div>

              <div className="nav-row">
                <button className="btn btn-sec" onClick={prev}>← Back</button>
                <button className="btn btn-pri" onClick={next}>Next: Transport →</button>
              </div>
            </>
          )}

          {/* ══ STEP 4: TRANSPORT & DOCUMENTS ═════════════════ */}
          {step === 'transport' && (
            <>
              <div className="card">
                <div className="card-title">Vehicle & Travel</div>
                <div className="g2" style={{ marginBottom:14 }}>
                  <div className="fg"><Label t="Own Conveyance?" /><YN value={p4.own_vehicle} onChange={v => F4('own_vehicle',v)} /></div>
                  {p4.own_vehicle==='Yes' && <>
                    <div className="fg"><Label t="Vehicle Type" /><select value={p4.vehicle_type} onChange={e => F4('vehicle_type',e.target.value)}><option value="">— Select —</option>{VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}</select></div>
                    <div className="fg span2"><Label t="Registration Number" /><input placeholder="e.g. MH01AB1234" style={{ textTransform:'uppercase' }} value={p4.vehicle_reg} onChange={e => F4('vehicle_reg',e.target.value.toUpperCase())} /></div>
                  </>}
                </div>
                <Sw label="Willing to Travel in India?" value={p4.travel_india} onChange={v => F4('travel_india',v)} />
                <Sw label="Willing to Travel Overseas?" value={p4.travel_overseas} onChange={v => F4('travel_overseas',v)} />
              </div>

              <div className="card">
                <div className="card-title">Identity Documents</div>
                <div className="g2">
                  <div className="fg"><Label t="Driving Licence Available?" /><YN value={p4.driving_license} onChange={v => F4('driving_license',v)} />
                    {p4.driving_license==='Yes' && <input style={{ marginTop:8 }} placeholder="Driving licence number" value={p4.driving_license_no} onChange={e => F4('driving_license_no',e.target.value)} />}
                  </div>
                  <div className="fg"><Label t="Passport Available?" /><YN value={p4.passport} onChange={v => F4('passport',v)} />
                    {p4.passport==='Yes' && <input style={{ marginTop:8 }} placeholder="Passport number" value={p4.passport_no} onChange={e => F4('passport_no',e.target.value)} />}
                  </div>
                </div>
              </div>

              <div className="nav-row">
                <button className="btn btn-sec" onClick={prev}>← Back</button>
                <button className="btn btn-pri" onClick={next}>Next: Family →</button>
              </div>
            </>
          )}

          {/* ══ STEP 5: FAMILY ════════════════════════════════ */}
          {step === 'family' && (
            <>
              <div className="card">
                <div className="card-title">Family Details</div>
                <div className="card-sub">List all family members / dependants living with you.</div>
                <div className="dt-wrap" style={{ marginBottom:6 }}>
                  <table className="dt">
                    <thead>
                      <tr><th style={{width:32}}>#</th><th>Name</th><th>Relationship</th><th style={{width:70}}>Age</th><th>Occupation</th><th style={{width:36}} /></tr>
                    </thead>
                    <tbody>
                      {family.map((row, i) => (
                        <tr key={i}>
                          <td style={{ textAlign:'center', fontSize:11, color:'var(--ink4)' }}>{i+1}</td>
                          <td><input placeholder="Full name" value={row.name} onChange={e => setFamily(f => f.map((r,j) => j===i?{...r,name:e.target.value}:r))} /></td>
                          <td><input placeholder="e.g. Mother, Son" value={row.relation} onChange={e => setFamily(f => f.map((r,j) => j===i?{...r,relation:e.target.value}:r))} /></td>
                          <td><input type="number" min="0" max="120" value={row.age} onChange={e => setFamily(f => f.map((r,j) => j===i?{...r,age:e.target.value}:r))} /></td>
                          <td><input placeholder="e.g. Student, Housewife" value={row.occupation} onChange={e => setFamily(f => f.map((r,j) => j===i?{...r,occupation:e.target.value}:r))} /></td>
                          <td><button type="button" className="del-btn" onClick={() => setFamily(f => f.filter((_,j) => j!==i))}>×</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="add-row" onClick={() => setFamily(f => [...f, {name:'',relation:'',age:'',occupation:''}])}>
                  + Add family member
                </button>
              </div>
              <div className="nav-row">
                <button className="btn btn-sec" onClick={prev}>← Back</button>
                <button className="btn btn-pri" onClick={next}>Next: References →</button>
              </div>
            </>
          )}

          {/* ══ STEP 6: REFERENCES ════════════════════════════ */}
          {step === 'references' && (
            <>
              <div className="card">
                <div className="card-title">Local References</div>
                <div className="card-sub">Provide at least 2 responsible persons from your locality (not relatives).</div>
                {errors.refs && <div className="info-box info-am" style={{ marginBottom:12 }}>⚠ {errors.refs}</div>}
                {refs.map((row, i) => (
                  <div key={i} style={{ border:'1px solid var(--bdr)', borderRadius:'var(--r2)', padding:'14px 16px', marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'var(--ink3)', textTransform:'uppercase', letterSpacing:'.07em' }}>Reference {i+1}</span>
                      {refs.length > 2 && <button type="button" className="del-btn" onClick={() => setRefs(r => r.filter((_,j) => j!==i))}>×</button>}
                    </div>
                    <div className="g2">
                      <div className="fg"><Label t="Full Name" r /><input placeholder="Name" value={row.name} onChange={e => setRefs(r => r.map((ref,j) => j===i?{...ref,name:e.target.value}:ref))} /></div>
                      <div className="fg"><Label t="Occupation" /><input value={row.occupation} onChange={e => setRefs(r => r.map((ref,j) => j===i?{...ref,occupation:e.target.value}:ref))} /></div>
                      <div className="fg"><Label t="Contact Number" r /><input type="tel" value={row.contact} onChange={e => setRefs(r => r.map((ref,j) => j===i?{...ref,contact:e.target.value}:ref))} /></div>
                      <div className="fg"><Label t="Address" /><input value={row.address} onChange={e => setRefs(r => r.map((ref,j) => j===i?{...ref,address:e.target.value}:ref))} /></div>
                    </div>
                  </div>
                ))}
                <button type="button" className="add-row" onClick={() => setRefs(r => [...r, {name:'',occupation:'',contact:'',address:''}])}>
                  + Add reference
                </button>
              </div>
              <div className="nav-row">
                <button className="btn btn-sec" onClick={prev}>← Back</button>
                <button className="btn btn-pri" onClick={next}>Next: Health →</button>
              </div>
            </>
          )}

          {/* ══ STEP 7: HEALTH & FLEXIBILITY ══════════════════ */}
          {step === 'health' && (
            <>
              <div className="card">
                <div className="card-title">Health Information</div>
                <div className="fg">
                  <Label t="COVID-19 Vaccination Status" />
                  <Chips
                    options={['Not Vaccinated','Single Dose','Double Dose','Booster Dose']}
                    value={p7.vaccination}
                    onChange={v => F7('vaccination',v)}
                    variant="gr"
                  />
                </div>
              </div>

              <div className="card">
                <div className="card-title">Work Flexibility</div>
                <div className="card-sub">Let us know your availability and flexibility.</div>
                <Sw label="Willing to work late shifts?" sub="Staying beyond regular office hours when required" value={p7.willing_late} onChange={v => F7('willing_late',v)} />
                <Sw label="Willing to work on holidays?" sub="Working on public holidays or weekends if required" value={p7.willing_holiday} onChange={v => F7('willing_holiday',v)} />
                <Sw label="Comfortable with rotational shifts?" sub="Morning, afternoon or night shifts" value={p7.rotational_shift} onChange={v => F7('rotational_shift',v)} />
                <Sw label="Open to relocation?" sub="Willing to relocate to other cities or states" value={p7.relocation} onChange={v => F7('relocation',v)} />
              </div>

              <div className="nav-row">
                <button className="btn btn-sec" onClick={prev}>← Back</button>
                <button className="btn btn-pri" onClick={next}>Next: Declaration →</button>
              </div>
            </>
          )}

          {/* ══ STEP 8: DECLARATION ═══════════════════════════ */}
          {step === 'declaration' && (
            <>
              <div className="card">
                <div className="card-title">Legal Statement</div>
                <div className="fg">
                  <Label t="Have you ever been convicted for any unlawful activity?" />
                  <YN value={p8.convicted} onChange={v => F8('convicted',v)} />
                  {p8.convicted === 'Yes' && (
                    <div className="fg" style={{ marginTop:10 }}>
                      <Label t="Please explain" />
                      <textarea rows={3} placeholder="Provide details…" value={p8.convicted_desc} onChange={e => F8('convicted_desc', e.target.value)} />
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-title">Declaration</div>
                <div className="decl-box">
                  <strong>Full &amp; Final Settlement Clause:</strong><br />
                  I hereby confirm that I will complete all formalities of my employment within a maximum of 90 days of leaving the company and will sign the full and final settlement. If I do not comply, the company will not be held liable and I will lose any claim of any kind from the company.<br /><br />
                  <strong>Commitment Period:</strong><br />
                  I fully understand that the company strongly believes in long-term association. I hereby commit to serve the company for a minimum period agreed upon during the selection process. I am aware that I may be relieved without compensation during my probation period if I do not meet performance expectations.<br /><br />
                  <strong>Background Verification:</strong><br />
                  I consent to the company conducting background verification including my employment history, educational qualifications, and any criminal record, as part of the onboarding process.<br /><br />
                  <strong>Confidentiality:</strong><br />
                  I agree to maintain the confidentiality of the company's proprietary information, trade secrets, and business data, both during and after my employment.
                </div>

                <label className="cb-row">
                  <input type="checkbox" checked={p8.confirm_true} onChange={e => F8('confirm_true', e.target.checked)} />
                  <span className="cb-label">I hereby declare that all information provided by me is true and correct to the best of my knowledge and belief. I understand that any false or misleading information may result in rejection of my candidature or termination of employment.</span>
                </label>
                {errors.confirm_true && <div className="err-msg" style={{ marginBottom:8 }}>{errors.confirm_true}</div>}

                <label className="cb-row">
                  <input type="checkbox" checked={p8.agree_terms} onChange={e => F8('agree_terms', e.target.checked)} />
                  <span className="cb-label">I agree to abide by the company's rules, regulations, code of conduct, and all applicable policies from the date of joining.</span>
                </label>
                {errors.agree_terms && <div className="err-msg" style={{ marginBottom:8 }}>{errors.agree_terms}</div>}
              </div>

              {/* Digital signature pad */}
              <div className="card">
                <div className="card-title">Digital Signature</div>
                <div className="card-sub">Sign in the box below using your mouse or touch.</div>

                <div className="sig-wrap">
                  <canvas
                    ref={sigRef}
                    className="sig-canvas"
                    style={{ width:'100%', height:120 }}
                    onMouseDown={sigStart} onMouseMove={sigMove} onMouseUp={sigEnd} onMouseLeave={sigEnd}
                    onTouchStart={sigStart} onTouchMove={sigMove} onTouchEnd={sigEnd}
                  />
                  <div className="sig-toolbar">
                    <span>{sigHasData ? '✓ Signature captured' : 'Draw your signature above'}</span>
                    <button type="button" onClick={clearSig} style={{ background:'none', border:'1px solid var(--bdr2)', borderRadius:'var(--r)', padding:'3px 10px', fontSize:11, cursor:'pointer', fontFamily:'var(--fn)', color:'var(--ink3)' }}>
                      Clear
                    </button>
                  </div>
                </div>

                <div className="g3" style={{ marginTop:16 }}>
                  <div className="fg span2"><Label t="Full Name (as signature)" r /><input placeholder="Type your full name" value={p8.candidate_sig_name} onChange={e => F8('candidate_sig_name', e.target.value)} className={errors.sig_name?'err':''} /><Err k="sig_name" /></div>
                  <div className="fg">
                    <Label t="Place" r />
                    <input placeholder="City" value={p8.place} onChange={e => F8('place', e.target.value)} className={errors.place?'err':''} />
                    <Err k="place" />
                  </div>
                  <div className="fg span2"><Label t="Date" /><input type="date" value={p8.date} onChange={e => F8('date', e.target.value)} disabled /></div>
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
                    disabled={!p8.confirm_true || !p8.agree_terms || !p8.candidate_sig_name || !p8.place || saveMutation.isPending}
                    onClick={async () => { if (validate('declaration')) await saveMutation.mutateAsync(false); }}
                  >
                    {saveMutation.isPending ? <><span className="spin" /> Submitting…</> : '✓ Submit Declaration'}
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
