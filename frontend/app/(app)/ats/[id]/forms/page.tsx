'use client';
import { useState }            from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery }             from '@tanstack/react-query';
import { AppShell }             from '../../../../../layouts/AppLayout';
import { candidateService }     from '../../../../../services/api/candidate.service';
import { Chip }                 from '../../../../../components/ui/Chip';
import { formatDate }           from '../../../../../utils/formatters';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '7px 0', borderBottom: '1px solid var(--border)', gap: 16, fontSize: 12,
    }}>
      <span style={{ color: 'var(--ink4)', fontWeight: 500, minWidth: 180, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ color: empty ? 'var(--ink4)' : 'var(--ink)', fontWeight: empty ? 400 : 500, textAlign: 'right' }}>
        {empty ? <span style={{ fontStyle: 'italic', opacity: .5 }}>—</span> : value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em',
        color: 'var(--ink4)', paddingBottom: 6, borderBottom: '1px solid var(--border)',
        marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Card({ title, children, badge }: { title: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="card cp" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="ct">{title}</div>
        {badge}
      </div>
      {children}
    </div>
  );
}

function yn(v: string | null | undefined) {
  if (!v) return null;
  return <span style={{ color: v === 'Yes' ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{v}</span>;
}

function tags(arr: string[] | null | undefined) {
  if (!arr || !arr.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {arr.map((t, i) => (
        <span key={i} style={{ background: 'var(--blue-lt)', color: 'var(--blue)', border: '1px solid var(--blue-md)', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
          {t}
        </span>
      ))}
    </div>
  );
}

function NotFilled({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--ink4)' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Not submitted yet</div>
      <div style={{ fontSize: 12 }}>{msg}</div>
    </div>
  );
}

// ─── Pre-Interview Form Renderer ──────────────────────────────────────────────

function PreInterviewFormView({ data }: { data: any }) {
  let fd: any = null;

  try {
    fd =
      typeof data.form_data === 'string'
        ? JSON.parse(data.form_data)
        : data.form_data;
  } catch (err) {
    console.error('Invalid form_data JSON', err);
    return <NotFilled msg="Invalid form data." />;
  }  

  const p1 = fd.p1 || {};
  const p2 = fd.p2 || {};
  const p3 = fd.p3 || {};
  const p4 = fd.p4 || {};
  const family: any[] = fd.family || [];
  const refs: any[]   = fd.refs   || [];
  const p7 = fd.p7 || {};
  const p8 = fd.p8 || {};

  return (
    <div>
      {/* STEP 1: Personal */}
      <Card title="Personal Information">
        {p1.photo && (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <img src={p1.photo} alt="Passport photo"
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
          </div>
        )}
        <Section title="Basic Details">
          <Row label="Full Name"              value={p1.full_name} />
          <Row label="Name as per Bank"       value={p1.bank_name} />
          <Row label="Date of Birth"          value={formatDate(p1.dob)} />
          <Row label="Gender"                 value={p1.gender} />
          <Row label="Mobile"                 value={p1.mobile} />
          <Row label="Emergency Contact"      value={p1.emergency_contact} />
          <Row label="Email"                  value={p1.email} />
          <Row label="Father's Name"          value={p1.father_name} />
          <Row label="Marital Status"         value={p1.marital_status} />
          {p1.marital_status === 'Married' && <>
            <Row label="Spouse Name"          value={p1.spouse_name} />
            <Row label="Date of Marriage"     value={formatDate(p1.date_of_marriage)} />
          </>}
          <Row label="Nationality"            value={p1.nationality} />
          <Row label="Religion"               value={p1.religion} />
          <Row label="Place of Birth"         value={p1.place_of_birth} />
          <Row label="Blood Group"            value={p1.blood_group} />
          <Row label="Height / Weight"        value={[p1.height && `${p1.height} cm`, p1.weight && `${p1.weight} kg`].filter(Boolean).join(' / ')} />
          <Row label="Disability"             value={yn(p1.disability)} />
          {p1.disability === 'Yes' && <Row label="Disability Details" value={p1.disability_desc} />}
        </Section>
        <Section title="Government ID">
          <Row label="Aadhaar Number"         value={p1.aadhaar} />
          <Row label="PAN Number"             value={p1.pan} />
        </Section>
      </Card>

      {/* STEP 2: Job */}
      <Card title="Job Application Details">
        <Row label="Position Applied"         value={p2.position} />
        <Row label="Department"               value={p2.department} />
        <Row label="Reference Source"         value={p2.reference_source} />
        <Row label="Interview Date"           value={[formatDate(p2.interview_date), p2.interview_time].filter(Boolean).join(' ')} />
        <Row label="Total Experience"         value={p2.total_experience ? `${p2.total_experience} years` : null} />
        <Row label="Notice Period"            value={p2.notice_period ? `${p2.notice_period} days` : null} />
        <Row label="Employment Status"        value={p2.employment_status} />
        <Row label="Current Employer"         value={p2.employer_name} />
        <Row label="Reason for Change"        value={p2.reason_for_change} />
        <Section title="Salary">
          <Row label="Current (₹/month)"      value={p2.current_salary ? `₹${Number(p2.current_salary).toLocaleString('en-IN')}` : null} />
          <Row label="Expected (₹/month)"     value={p2.expected_salary ? `₹${Number(p2.expected_salary).toLocaleString('en-IN')}` : null} />
          {p2.current_salary && p2.expected_salary && (() => {
            const hike = (((Number(p2.expected_salary) - Number(p2.current_salary)) / Number(p2.current_salary)) * 100).toFixed(1);
            return <Row label="Hike Expected" value={<span style={{ color: Number(hike) >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'monospace', fontWeight: 700 }}>{Number(hike) >= 0 ? '+' : ''}{hike}%</span>} />;
          })()}
        </Section>
      </Card>

      {/* STEP 3: Address */}
      <Card title="Address Details">
        <Section title="Present Address">
          <Row label="House Type"             value={p3.pr_house_type} />
          <Row label="Address"                value={[p3.pr_house_no, p3.pr_street, p3.pr_area].filter(Boolean).join(', ')} />
          <Row label="City / District"        value={[p3.pr_city, p3.pr_district].filter(Boolean).join(', ')} />
          <Row label="State / PIN"            value={[p3.pr_state, p3.pr_pin].filter(Boolean).join(' – ')} />
        </Section>
        <Section title="Permanent Address">
          {p3.same_address
            ? <div style={{ fontSize: 12, color: 'var(--ink4)', fontStyle: 'italic' }}>Same as present address</div>
            : <>
              <Row label="House Type"         value={p3.pe_house_type} />
              <Row label="Address"            value={[p3.pe_house_no, p3.pe_street, p3.pe_area].filter(Boolean).join(', ')} />
              <Row label="City / District"    value={[p3.pe_city, p3.pe_district].filter(Boolean).join(', ')} />
              <Row label="State / PIN"        value={[p3.pe_state, p3.pe_pin].filter(Boolean).join(' – ')} />
            </>
          }
        </Section>
        <Section title="Commute">
          <Row label="Distance from Office"  value={p3.distance_office ? `${p3.distance_office} km` : null} />
          <Row label="Travel Time"           value={p3.travel_time ? `${p3.travel_time} min` : null} />
          <Row label="Travel Mode"           value={p3.travel_mode} />
        </Section>
      </Card>

      {/* STEP 4: Transport */}
      <Card title="Transport & Documents">
        <Row label="Own Vehicle"             value={yn(p4.own_vehicle)} />
        {p4.own_vehicle === 'Yes' && <>
          <Row label="Vehicle Type"          value={p4.vehicle_type} />
          <Row label="Registration No."      value={p4.vehicle_reg} />
        </>}
        <Row label="Driving Licence"         value={yn(p4.driving_license)} />
        {p4.driving_license === 'Yes' && <Row label="Licence Number" value={p4.driving_license_no} />}
        <Row label="Passport"                value={yn(p4.passport)} />
        {p4.passport === 'Yes' && <Row label="Passport Number" value={p4.passport_no} />}
        <Row label="Travel India"            value={yn(p4.travel_india)} />
        <Row label="Travel Overseas"         value={yn(p4.travel_overseas)} />
      </Card>

      {/* STEP 5: Family */}
      {family.length > 0 && (
        <Card title="Family Details">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Name', 'Relation', 'Age', 'Occupation'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--ink4)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {family.map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 10px' }}>{row.name || '—'}</td>
                    <td style={{ padding: '7px 10px' }}>{row.relation || '—'}</td>
                    <td style={{ padding: '7px 10px' }}>{row.age || '—'}</td>
                    <td style={{ padding: '7px 10px' }}>{row.occupation || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* STEP 6: References */}
      {refs.length > 0 && (
        <Card title="Local References">
          {refs.map((ref: any, i: number) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Reference {i + 1}</div>
              <Row label="Name"        value={ref.name} />
              <Row label="Occupation"  value={ref.occupation} />
              <Row label="Contact"     value={ref.contact} />
              <Row label="Address"     value={ref.address} />
            </div>
          ))}
        </Card>
      )}

      {/* STEP 7: Health */}
      <Card title="Health & Work Flexibility">
        <Row label="COVID Vaccination"        value={p7.vaccination} />
        <Row label="Willing: Late Shifts"     value={yn(p7.willing_late)} />
        <Row label="Willing: Holidays"        value={yn(p7.willing_holiday)} />
        <Row label="Rotational Shifts"        value={yn(p7.rotational_shift)} />
        <Row label="Open to Relocation"       value={yn(p7.relocation)} />
      </Card>

      {/* STEP 8: Declaration */}
      <Card title="Declaration">
        <Row label="Ever Convicted?"          value={yn(p8.convicted)} />
        {p8.convicted === 'Yes' && <Row label="Details" value={p8.convicted_desc} />}
        <Row label="Confirmed Declaration"    value={yn(p8.confirm_true ? 'Yes' : 'No')} />
        <Row label="Agreed to Terms"          value={yn(p8.agree_terms ? 'Yes' : 'No')} />
        <Row label="Signatory Name"           value={p8.candidate_sig_name} />
        <Row label="Place"                    value={p8.place} />
        <Row label="Date of Signing"          value={formatDate(p8.date)} />
      </Card>
    </div>
  );
}

// ─── Pre-Joining Form Renderer ────────────────────────────────────────────────

function PreJoiningFormView({ data }: { data: any }) {
  let fd: any = null;

  try {
    fd =
      typeof data.form_data === 'string'
        ? JSON.parse(data.form_data)
        : data.form_data;
  } catch (err) {
    console.error('Invalid form_data JSON', err);
    return <NotFilled msg="Invalid form data." />;
  }  

  const s1 = fd.s1 || {};
  const s2 = fd.s2 || {};
  const edu: any[]     = fd.edu     || [];
  const emp: any[]     = fd.emp     || [];
  const s4extra        = fd.s4extra || {};
  const skills         = fd.skills  || {};
  const langs: any[]   = fd.langs   || [];
  const s6 = fd.s6 || {};
  const s7 = fd.s7 || {};
  const family: any[]  = fd.family  || [];
  const proRefs: any[] = fd.proRefs || [];
  const locRefs: any[] = fd.locRefs || [];
  const emergency      = fd.emergency || {};
  const s10 = fd.s10 || {};
  const s11 = fd.s11 || {};

  return (
    <div>
      {/* STEP 1: Personal */}
      <Card title="Personal Information">
        {fd.photo && (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <img src={fd.photo} alt="Passport photo" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
          </div>
        )}
        <Section title="Basic Details">
          <Row label="Full Name"              value={s1.full_name} />
          <Row label="Gender"                 value={s1.gender} />
          <Row label="Date of Birth"          value={formatDate(s1.dob)} />
          <Row label="Age"                    value={s1.age} />
          <Row label="Mobile"                 value={s1.mobile} />
          <Row label="Alternate Mobile"       value={s1.alt_mobile} />
          <Row label="Email"                  value={s1.email} />
          <Row label="Nationality"            value={s1.nationality} />
          <Row label="Religion"               value={s1.religion} />
          <Row label="Place of Birth"         value={s1.place_of_birth} />
          <Row label="Height / Weight"        value={[s1.height && `${s1.height} cm`, s1.weight && `${s1.weight} kg`].filter(Boolean).join(' / ')} />
          <Row label="Blood Group"            value={s1.blood_group} />
          <Row label="Marital Status"         value={s1.marital_status} />
          {s1.marital_status === 'Married' && <>
            <Row label="Spouse Name"          value={s1.spouse_name} />
            <Row label="Spouse Mobile"        value={s1.spouse_mobile} />
            <Row label="Spouse Email"         value={s1.spouse_email} />
          </>}
        </Section>
        <Section title="Identity Documents">
          <Row label="Aadhaar Number"         value={s1.aadhaar} />
          <Row label="PAN Number"             value={s1.pan} />
          <Row label="Passport Number"        value={s1.passport_no} />
          <Row label="Passport Issue Date"    value={formatDate(s1.passport_issue_date)} />
          <Row label="Passport Expiry Date"   value={formatDate(s1.passport_expiry_date)} />
          <Row label="Passport Issue Place"   value={s1.passport_issue_place} />
        </Section>
      </Card>

      {/* STEP 2: Address */}
      <Card title="Address Details">
        <Section title="Present Address">
          <Row label="House Type"             value={s2.pr_house_type} />
          <Row label="Address"                value={[s2.pr_house_no, s2.pr_street, s2.pr_area].filter(Boolean).join(', ')} />
          <Row label="City / District"        value={[s2.pr_city, s2.pr_district].filter(Boolean).join(', ')} />
          <Row label="State / PIN"            value={[s2.pr_state, s2.pr_pin].filter(Boolean).join(' – ')} />
          <Row label="Duration of Stay"       value={s2.pr_duration} />
          {s2.pr_house_type === 'Rented' && <Row label="Monthly Rent"   value={s2.pr_rent ? `₹${s2.pr_rent}` : null} />}
          {s2.pr_house_type === 'Owned'  && <Row label="Property Value" value={s2.pr_value ? `₹${s2.pr_value}` : null} />}
        </Section>
        <Section title="Permanent Address">
          {s2.same
            ? <div style={{ fontSize: 12, color: 'var(--ink4)', fontStyle: 'italic' }}>Same as present address</div>
            : <>
              <Row label="House Type"         value={s2.pe_house_type} />
              <Row label="Address"            value={[s2.pe_house_no, s2.pe_street, s2.pe_area].filter(Boolean).join(', ')} />
              <Row label="City / District"    value={[s2.pe_city, s2.pe_district].filter(Boolean).join(', ')} />
              <Row label="State / PIN"        value={[s2.pe_state, s2.pe_pin].filter(Boolean).join(' – ')} />
            </>
          }
        </Section>
      </Card>

      {/* STEP 3: Education */}
      {edu.length > 0 && (
        <Card title="Educational Qualifications">
          {edu.map((row: any, i: number) => row.institution ? (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Qualification {i + 1}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                <Row label="Institution"      value={row.institution} />
                <Row label="Degree"           value={row.degree} />
                <Row label="Main Subject"     value={row.subject} />
                <Row label="Division"         value={row.division} />
                <Row label="Years"            value={[row.from_yr, row.to_yr].filter(Boolean).join(' – ')} />
                <Row label="Percentage/CGPA"  value={row.percent} />
              </div>
              {row.achievements && <Row label="Achievements"  value={row.achievements} />}
            </div>
          ) : null)}
          {[['Academic Awards', fd.awards], ['Professional Qualifications', fd.profQual],
            ['Technical Qualifications', fd.techQual], ['Certifications', fd.certs],
            ['Memberships', fd.memb]].map(([label, val]) => val ? (
            <Row key={label as string} label={label as string} value={val as string} />
          ) : null)}
        </Card>
      )}

      {/* STEP 4: Employment */}
      {emp.length > 0 && (
        <Card title="Employment History">
          {emp.map((row: any, i: number) => row.employer ? (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--ink)' }}>
                {row.employer} — {row.designation}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                <Row label="Department"       value={row.department} />
                <Row label="Period"           value={[formatDate(row.from_date), formatDate(row.to_date)].filter(Boolean).join(' → ')} />
                <Row label="Experience"       value={row.experience} />
                <Row label="Reason for Leaving" value={row.reason} />
              </div>
              <Section title="Salary Breakup">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[['Basic', row.basic], ['HRA', row.hra], ['DA', row.da], ['Bonus', row.bonus],
                    ['Medical', row.medical], ['Travel', row.travel], ['Other', row.other], ['Gross', row.gross_salary]].map(([k, v]) => v ? (
                    <div key={k as string} style={{
                      background: k === 'Gross' ? 'var(--blue-lt)' : 'var(--surface2)',
                      border: `1px solid ${k === 'Gross' ? 'var(--blue-md)' : 'var(--border)'}`,
                      borderRadius: 8, padding: '8px 10px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.06em', color: k === 'Gross' ? 'var(--blue)' : 'var(--ink4)', fontWeight: 700, marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: k === 'Gross' ? 'var(--blue)' : 'var(--ink)' }}>₹{Number(v).toLocaleString('en-IN')}</div>
                    </div>
                  ) : null)}
                </div>
              </Section>
            </div>
          ) : null)}
          <Section title="Current Position">
            <Row label="Current CTC"          value={s4extra.current_ctc ? `₹${Number(s4extra.current_ctc).toLocaleString('en-IN')}/yr` : null} />
            <Row label="Expected CTC"         value={s4extra.expected_ctc ? `₹${Number(s4extra.expected_ctc).toLocaleString('en-IN')}/yr` : null} />
            <Row label="Notice Period"         value={s4extra.notice_period ? `${s4extra.notice_period} days` : null} />
            <Row label="Available to Join"     value={s4extra.joining_availability} />
          </Section>
        </Card>
      )}

      {/* STEP 5: Skills */}
      <Card title="Skills & Professional Profile">
        <Row label="Professional Skills"      value={skills.professional} />
        <Row label="Technical Skills"         value={skills.technical} />
        <Row label="Software Known"           value={skills.software} />
        <Row label="Special Ability"          value={skills.special_ability} />
        <Row label="Strengths"                value={skills.strengths} />
        <Row label="Professional Weaknesses"  value={skills.pro_weakness} />
        <Row label="Personal Weaknesses"      value={skills.personal_weakness} />
        <Row label="Career Ambitions"         value={skills.career_ambitions} />
        <Row label="Personal Ambitions"       value={skills.personal_ambitions} />
        {langs.length > 0 && (
          <Section title="Languages Known">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    {['Language', 'Speak', 'Read', 'Write'].map(h => (
                      <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--ink4)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {langs.filter((l: any) => l.language).map((lang: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '7px 10px', fontWeight: 500 }}>{lang.language}</td>
                      {(['speak', 'read', 'write'] as const).map(k => (
                        <td key={k} style={{ padding: '7px 10px', textAlign: 'center' }}>
                          <span style={{ color: lang[k] ? 'var(--green)' : 'var(--ink4)', fontWeight: 700, fontSize: 14 }}>
                            {lang[k] ? '✓' : '—'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </Card>

      {/* STEP 6: Health */}
      <Card title="Health & Compliance">
        <Row label="Physical Disability"      value={yn(s6.disability)} />
        {s6.disability === 'Yes' && <Row label="Details"  value={s6.disability_details} />}
        <Row label="Eye Lens Usage"            value={yn(s6.eye_lens)} />
        {s6.eye_lens === 'Yes' && <Row label="L / R Eye Power" value={[s6.left_eye, s6.right_eye].filter(Boolean).join(' / ')} />}
        <Row label="Medical Conditions"        value={s6.medical_conditions} />
        <Row label="Infectious Diseases"       value={s6.infectious} />
        <Row label="COVID Vaccination"         value={s6.vaccination} />
        <Row label="Smoking"                   value={s6.smoking} />
        <Row label="Drinking"                  value={s6.drinking} />
        <Row label="Emergency Medical Notes"   value={s6.emergency_notes} />
      </Card>

      {/* STEP 7: Assets & Legal */}
      <Card title="Assets & Legal Information">
        <Row label="Own Vehicle"              value={yn(s7.own_vehicle)} />
        {s7.own_vehicle === 'Yes' && <>
          <Row label="Vehicle Details"        value={s7.vehicle_details} />
          <Row label="Registration"           value={s7.vehicle_reg} />
          <Row label="Driving Licence"        value={s7.dl_no} />
          <Row label="Vehicle Class"          value={s7.vehicle_class} />
          <Row label="Licence Validity"       value={formatDate(s7.license_validity)} />
        </>}
        <Row label="Licensed Weapon"          value={yn(s7.weapon)} />
        {s7.weapon === 'Yes' && <Row label="Weapon Details" value={s7.weapon_details} />}
        <Row label="Court Proceedings"        value={yn(s7.court_proceedings)} />
        {s7.court_proceedings === 'Yes' && <Row label="Details" value={s7.court_details} />}
        <Row label="Charge-sheeted"           value={yn(s7.charge_sheeted)} />
        <Row label="Trade Union Member"       value={yn(s7.trade_union)} />
        <Row label="Strike/Gherao"            value={yn(s7.strike)} />
        <Row label="PF Number"               value={s7.pf_no} />
        <Row label="ESI Number"              value={s7.esi_no} />
      </Card>

      {/* STEP 8: Family */}
      {family.length > 0 && (
        <Card title="Family Details">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Name', 'Relation', 'Age', 'Occupation', 'Mobile', 'Dependent'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--ink4)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {family.filter((r: any) => r.name).map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 500 }}>{row.name}</td>
                    <td style={{ padding: '7px 10px' }}>{row.relation || '—'}</td>
                    <td style={{ padding: '7px 10px' }}>{row.age || '—'}</td>
                    <td style={{ padding: '7px 10px' }}>{row.occupation || '—'}</td>
                    <td style={{ padding: '7px 10px' }}>{row.mobile || '—'}</td>
                    <td style={{ padding: '7px 10px' }}>
                      <span style={{ color: row.dependent ? 'var(--green)' : 'var(--ink4)', fontWeight: row.dependent ? 700 : 400 }}>
                        {row.dependent ? '✓ Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* STEP 9: References */}
      {proRefs.length > 0 && (
        <Card title="Professional References">
          {proRefs.filter((r: any) => r.name).map((ref: any, i: number) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Reference {i + 1}</div>
              <Row label="Name"         value={ref.name} />
              <Row label="Designation"  value={ref.designation} />
              <Row label="Company"      value={ref.company} />
              <Row label="Mobile"       value={ref.mobile} />
              <Row label="Email"        value={ref.email} />
              <Row label="Address"      value={ref.address} />
            </div>
          ))}
        </Card>
      )}
      {locRefs.length > 0 && (
        <Card title="Local References">
          {locRefs.filter((r: any) => r.name).map((ref: any, i: number) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Reference {i + 1}</div>
              <Row label="Name"         value={ref.name} />
              <Row label="Occupation"   value={ref.occupation} />
              <Row label="Contact"      value={ref.contact} />
              <Row label="Address"      value={ref.address} />
            </div>
          ))}
        </Card>
      )}
      {emergency.name && (
        <Card title="Emergency Contact">
          <Row label="Name"             value={emergency.name} />
          <Row label="Relationship"     value={emergency.relation} />
          <Row label="Mobile"           value={emergency.mobile} />
          <Row label="Email"            value={emergency.email} />
          <Row label="Address"          value={emergency.address} />
        </Card>
      )}

      {/* STEP 10: Preferences */}
      <Card title="Preferences & Company History">
        <Row label="Preferred Interview Location" value={s10.pref_interview_loc} />
        <Row label="Preferred Posting Location"   value={s10.pref_posting_loc} />
        <Row label="Ready to Relocate"            value={yn(s10.relocate)} />
        <Row label="Willing to Travel"            value={yn(s10.travel)} />
        <Row label="Long Working Hours"           value={yn(s10.long_hours)} />
        <Row label="Known Employee in Company"    value={yn(s10.known_employee)} />
        {s10.known_employee === 'Yes' && <Row label="Details"             value={s10.known_emp_details} />}
        <Row label="Previously Employed Here"     value={yn(s10.prev_employed)} />
        <Row label="Previous Interview Here"      value={yn(s10.prev_interview)} />
        <Row label="How Heard About Us"           value={s10.heard_from} />
      </Card>

      {/* STEP 11: Declaration */}
      <Card title="Declarations & Agreements">
        {[
          ['Employment commitment confirmed', s11.commit1],
          ['Transferability agreed',          s11.commit2],
          ['Confidentiality agreed',          s11.commit3],
          ['Company policies accepted',       s11.commit4],
          ['Notice period acknowledged',      s11.commit5],
          ['Information accuracy declared',   s11.commit6],
        ].map(([label, val]) => (
          <Row key={label as string} label={label as string} value={
            <span style={{ color: val ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
              {val ? '✓ Confirmed' : '✗ Not confirmed'}
            </span>
          } />
        ))}
        <Row label="Signatory Name"     value={s11.sig_name} />
        <Row label="Place"              value={s11.place} />
        <Row label="Date of Signing"    value={formatDate(s11.date)} />
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CandidateFormsPage() {
  const params = useParams();
  const router = useRouter();
  const id     = parseInt(params.id as string, 10);
  const [tab,  setTab] = useState<'pre-interview' | 'pre-joining'>('pre-interview');

  const { data: preInterview, isLoading: li1 } = useQuery({
    queryKey: ['candidate-form-pre-interview', id],
    queryFn:  () => candidateService.getPreInterviewForm(id),
    enabled:  !!id,
    select:   r => r.data,
  });

  const { data: preJoining, isLoading: li2 } = useQuery({
    queryKey: ['candidate-form-pre-joining', id],
    queryFn:  () => candidateService.getPreJoiningForm(id),
    enabled:  !!id,
    select:   r => r.data,
  });

  const isLoading = li1 || li2;

  const statusBadge = (status: string | null) => {
    if (!status || status === 'Not_Started') return <Chip variant="gray">Not Started</Chip>;
    if (status === 'Draft')                  return <Chip variant="amber">Draft</Chip>;
    if (status === 'Submitted')              return <Chip variant="green">✓ Submitted</Chip>;
    return <Chip variant="gray">{status}</Chip>;
  };

  return (
    <AppShell>
      <div className="pg-enter">

        {/* Header */}
        <div className="ph">
          <div>
            <h1>
              {preInterview?.candidate_name || preJoining?.candidate_name || 'Candidate'} — Forms
            </h1>
            <p style={{ fontSize: 13, color: 'var(--ink4)' }}>
              View pre-interview declaration and pre-joining data submitted via the candidate portal
            </p>
          </div>
          <div className="ph-r">
            <button className="btn btn-sec btn-sm" onClick={() => router.push(`/ats/${id}`)}>
              ← Back to Candidate
            </button>
            <button className="btn btn-sec btn-sm" onClick={() => window.print()}>
              🖨 Print
            </button>
          </div>
        </div>

        {/* Summary status bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Pre-Interview Form', status: preInterview?.form_status, submitted_at: preInterview?.submitted_at },
            { label: 'Pre-Joining Form',   status: preJoining?.form_status,   submitted_at: preJoining?.submitted_at },
          ].map(({ label, status, submitted_at }) => (
            <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{label}</div>
                {submitted_at && (
                  <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
                    Submitted {formatDate(submitted_at)}
                  </div>
                )}
              </div>
              {statusBadge(status || null)}
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 3, marginBottom: 20, width: 'fit-content' }}>
          {[
            { id: 'pre-interview', label: '📋 Pre-Interview Declaration' },
            { id: 'pre-joining',   label: '📝 Pre-Joining Form' },
          ].map(({ id: tid, label }) => (
            <button key={tid} onClick={() => setTab(tid as any)}
              style={{
                padding: '7px 18px', border: 'none', borderRadius: 8,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: tab === tid ? 'var(--surface)' : 'transparent',
                color: tab === tid ? 'var(--ink)' : 'var(--ink4)',
                boxShadow: tab === tid ? 'var(--sh)' : 'none',
                fontFamily: 'var(--font)', transition: 'all .1s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink4)', fontSize: 13 }}>
            Loading form data…
          </div>
        ) : tab === 'pre-interview' ? (
          preInterview ? (
            <PreInterviewFormView data={preInterview} />
          ) : (
            <NotFilled msg="Could not load pre-interview form data." />
          )
        ) : (
          preJoining ? (
            <PreJoiningFormView data={preJoining} />
          ) : (
            <NotFilled msg="Could not load pre-joining form data." />
          )
        )}

      </div>
    </AppShell>
  );
}
