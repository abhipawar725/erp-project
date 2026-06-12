'use client';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { fullEmployeeSchema, STEP_SCHEMA_MAP, type FullEmployeeForm, type StepSchemaKey } from '../validations/employee.schema';
import { WIZARD_STEPS, AMDB_PERCENTAGE } from '../constants/employee.constants';
import {
  useCreateEmployee, useUpdateStep, useSaveDraft, useNextCode,
} from '../hooks/useEmployees';
import { usePermission } from '../../auth/hooks/usePermission';

// Step components
import { StepBasic }          from './steps/StepBasic';
import { StepEmployment }     from './steps/StepEmployment';
import { StepReporting }      from './steps/StepReporting';
import { StepCommitment }     from './steps/StepCommitment';
import { StepSchemes }        from './steps/StepSchemes';
import { StepPersonal }       from './steps/StepPersonal';
import { StepAddress }        from './steps/StepAddress';
import { StepFamily }         from './steps/StepFamily';
import { StepEmergency }      from './steps/StepEmergency';
import { StepStatutory }      from './steps/StepStatutory';
import { StepBank }           from './steps/StepBank';
import { StepExperience }     from './steps/StepExperience';
import { StepSalary }         from './steps/StepSalary';
import { StepOnboardingDocs } from './steps/StepOnboardingDocs';
import { StepReview }         from './steps/StepReview';

interface Props {
  mode:       'create' | 'edit';
  employee?:  any;
  onSuccess?: (emp: any) => void;
}

const getSessionId = () => {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('ung_emp_sid');
  if (!id) { id = `d_${Date.now()}_${Math.random().toString(36).slice(2)}`; sessionStorage.setItem('ung_emp_sid', id); }
  return id;
};

export function EmployeeWizard({ mode, employee, onSuccess }: Props) {
  const router         = useRouter();
  const { isHR, isAdmin, isSuperAdmin } = usePermission();
  const canSeeSensitive = isHR || isAdmin || isSuperAdmin;

  const sessionId     = useRef(getSessionId());
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const [currentIdx,      setCurrentIdx]      = useState(0);
  const [savedId,         setSavedId]         = useState<number | null>(employee?.id ?? null);
  const [completedSteps,  setCompletedSteps]  = useState<Set<number>>(new Set(mode === 'edit' ? WIZARD_STEPS.map((_,i)=>i) : []));
  const [stepErrors,      setStepErrors]      = useState<Set<number>>(new Set());
  const [isDirty,         setIsDirty]         = useState(false);
  const [savingDraft,     setSavingDraft]     = useState(false);

  const { data: codeData } = useNextCode();
  const createMutation  = useCreateEmployee();
  const updateMutation  = useUpdateStep(savedId ?? 0);
  const draftMutation   = useSaveDraft();

  // Role-filter sensitive steps
  const visibleSteps = useMemo(() =>
    WIZARD_STEPS.filter(s => !s.sensitive || canSeeSensitive),
    [canSeeSensitive]
  );

  const current  = visibleSteps[currentIdx];
  const isFirst  = currentIdx === 0;
  const isLast   = currentIdx === visibleSteps.length - 1;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ─── Form ─────────────────────────────────────────────────────────────────
  const methods = useForm<FullEmployeeForm>({
    resolver: zodResolver(fullEmployeeSchema),
    mode: 'onTouched',
    defaultValues: {
      status:          'Active',
      employment_type: 'Permanent',
      saturday_off:    false,
      perm_address_type: 'Same as Present',
      commitment:      false,
      on_probation:    true,
      pf_status:       false,
      esic_status:     false,
      mediclaim_status:'No',
      rd_scheme:       false,
      asset_deduction_applicable: false,
      is_experienced:  false,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (!employee) return;
    const p = employee.personal ?? {};
    const f = employee.family   ?? {};
    const s = employee.statutory ?? {};
    const personal_bank = employee.bankDetails?.find((b: any) => b.bank_type === 'personal') ?? {};
    const official_bank = employee.bankDetails?.find((b: any) => b.bank_type === 'official') ?? {};
    const cur_salary    = employee.salaries?.find((s: any) => s.salary_type === 'current') ?? {};
    const joi_salary    = employee.salaries?.find((s: any) => s.salary_type === 'joining') ?? {};
    const cp = employee.commitmentProbation ?? {};
    const sch = employee.schemes ?? {};
    const addr = { present: {}, permanent: {} } as any;
    employee.addresses?.forEach((a: any) => { addr[a.address_type] = a; });

    methods.reset({
      first_name: employee.first_name, middle_name: employee.middle_name,
      last_name: employee.last_name, status: employee.status,
      employment_type: employee.employment_type,
      department_id: employee.department_id, designation_id: employee.designation_id,
      working_site: employee.working_site, working_city: employee.working_city,
      working_state_country: employee.working_state_country,
      pay_register_location: employee.pay_register_location,
      saturday_off: employee.saturday_off, shift_id: employee.shift_id, grace_minutes: employee.grace_minutes,
      official_email: employee.official_email, official_mobile: employee.official_mobile,
      // personal
      personal_email: p.personal_email, personal_mobile: p.personal_mobile,
      date_of_birth: p.date_of_birth, gender: p.gender,
      shirt_size: p.shirt_size, tshirt_size: p.tshirt_size,
      nationality: p.nationality, religion: p.religion, blood_group: p.blood_group,
      marital_status: p.marital_status, marriage_date: p.marriage_date,
      spouse_name: p.spouse_name, child1_name: p.child1_name, child2_name: p.child2_name,
      // family
      father_salutation: f.father_salutation, father_name: f.father_name,
      mother_salutation: f.mother_salutation, mother_name: f.mother_name,
      // statutory
      aadhaar_number: s.aadhaar_number, pan_number: s.pan_number,
      passport_number: s.passport_number, passport_expiry: s.passport_expiry,
      driving_license_number: s.driving_license_number,
      // bank
      personal_bank_name: personal_bank.bank_name,
      personal_bank_account: personal_bank.account_number,
      personal_ifsc: personal_bank.ifsc_code,
      personal_bank_branch: personal_bank.branch_name,
      official_bank_name: official_bank.bank_name,
      // salary
      salary_mode: cur_salary.salary_mode,
      current_basic: cur_salary.basic, current_hra: cur_salary.hra,
      current_allowance1: cur_salary.allowance1, current_amdb: cur_salary.amdb_pm,
      joining_basic: joi_salary.basic, joining_hra: joi_salary.hra,
      joining_allowance1: joi_salary.allowance1, joining_amdb: joi_salary.amdb_pm,
      // schemes
      pf_status: sch.pf_status ?? false, uan_number: sch.uan_number,
      esic_status: sch.esic_status ?? false, esic_number: sch.esic_number,
      mediclaim_status: sch.mediclaim_status ?? 'No',
      rd_scheme: sch.rd_scheme ?? false,
      // probation
      commitment: cp.commitment ?? false,
      on_probation: cp.on_probation ?? true,
      confirmation_status: cp.confirmation_status,
      // address
      present_house_type: addr.present?.house_type,
      present_house_no: addr.present?.house_no,
      present_city: addr.present?.city,
      present_state: addr.present?.state,
      present_country: addr.present?.country ?? 'India',
      present_pincode: addr.present?.pincode,
      perm_address_type: addr.permanent?.is_same_as_present ? 'Same as Present' : 'Other',
    });
  }, [employee, methods]);

  // Auto-fill codes on create
  useEffect(() => {
    if (mode === 'create' && codeData && !methods.getValues('employee_code')) {
      methods.setValue('employee_code', codeData.code);
    }
  }, [codeData, mode, methods]);

  // Unsaved changes warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault(); e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Auto-save debounce
  useEffect(() => {
    const sub = methods.watch(() => {
      setIsDirty(true);
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(triggerAutoSave, 3000);
    });
    return () => { sub.unsubscribe(); clearTimeout(autoSaveTimer.current); };
  }, [methods, savedId]);

  const triggerAutoSave = useCallback(() => {
    if (!current) return;
    setSavingDraft(true);
    draftMutation.mutate({
      employee_id: savedId ?? null,
      step: current.key,
      form_data: methods.getValues(),
      session_id: sessionId.current,
    }, { onSettled: () => setSavingDraft(false) });
  }, [current, savedId, methods, draftMutation]);

  // ─── Step validation ──────────────────────────────────────────────────────
  const validateStep = useCallback(async (): Promise<boolean> => {
    if (!current || current.key === 'review') return true;
    const schema = STEP_SCHEMA_MAP[current.key as StepSchemaKey];
    if (!schema) return true;
    const result = (schema as any).safeParse(methods.getValues());
    if (!result.success) {
      const fields = Object.keys(result.error.flatten().fieldErrors);
      await methods.trigger(fields as any);
      setStepErrors(prev => new Set([...prev, currentIdx]));
      return false;
    }
    setStepErrors(prev => { const n = new Set(prev); n.delete(currentIdx); return n; });
    return true;
  }, [current, currentIdx, methods]);

  // ─── Build step payload ───────────────────────────────────────────────────
  const getPayload = useCallback((key: string): object => {
    const v = methods.getValues();
    const clean = (x: any) => x === '' ? null : x;
    switch (key) {
      case 'basic': return { first_name: v.first_name, middle_name: clean(v.middle_name), last_name: v.last_name, status: v.status, employment_type: v.employment_type, employee_code: clean(v.employee_code), department_id: v.department_id, designation_id: v.designation_id, sub_designation: clean(v.sub_designation) };
      case 'employment': return { working_site: v.working_site, working_city: v.working_city, working_state_country: v.working_state_country, pay_register_location: v.pay_register_location, saturday_off: v.saturday_off, shift_id: v.shift_id, grace_minutes: v.grace_minutes };
      case 'reporting': return { l1_manager_id: v.l1_manager_code, l2_manager_id: v.l2_manager_code, official_email: clean(v.official_email), official_mobile: v.official_mobile, actual_doj: v.actual_doj };
      case 'commitment': return { commitment: v.commitment, commitment_term: v.commitment_term, commitment_entered_on: clean(v.commitment_entered_on), on_probation: v.on_probation, probation_period: clean(v.probation_period), confirmation_status: v.confirmation_status };
      case 'schemes': return { pf_status: v.pf_status, uan_number: clean(v.uan_number), esic_status: v.esic_status, esic_number: clean(v.esic_number), mediclaim_status: v.mediclaim_status, mediclaim_number: clean(v.mediclaim_number), mediclaim_amount: v.mediclaim_amount, rd_scheme: v.rd_scheme, rd_term: v.rd_term, rd_opening_date: clean(v.rd_opening_date), rd_amount_employee: v.rd_amount_employee, rd_amount_employer: v.rd_amount_employer };
      case 'personal': return { personal_email: v.personal_email, personal_mobile: v.personal_mobile, date_of_birth: v.date_of_birth, gender: v.gender, shirt_size: v.shirt_size, tshirt_size: v.tshirt_size, nationality: v.nationality, religion: v.religion, blood_group: v.blood_group, marital_status: v.marital_status, marriage_date: clean(v.marriage_date), spouse_name: clean(v.spouse_name), child1_name: clean(v.child1_name), child1_dob: clean(v.child1_dob), child2_name: clean(v.child2_name), child3_name: clean(v.child3_name) };
      case 'address': return { present_house_type: v.present_house_type, present_house_no: v.present_house_no, present_area: clean(v.present_area), present_district: v.present_district, present_city: v.present_city, present_state: v.present_state, present_country: v.present_country, present_pincode: v.present_pincode, perm_address_type: v.perm_address_type, perm_house_type: v.perm_house_type, perm_house_no: clean(v.perm_house_no), perm_city: clean(v.perm_city), perm_state: clean(v.perm_state), perm_country: clean(v.perm_country), perm_pincode: clean(v.perm_pincode) };
      case 'family': return { father_salutation: v.father_salutation, father_name: v.father_name, father_age_dob: clean(v.father_age_dob), father_occupation: clean(v.father_occupation), mother_salutation: v.mother_salutation, mother_name: v.mother_name, mother_age_dob: clean(v.mother_age_dob), mother_occupation: v.mother_occupation };
      case 'emergency': return { contact_name: v.contact_name, contact_number: v.contact_number, relationship: v.relationship };
      case 'statutory': return { passport_number: v.passport_number, passport_expiry: v.passport_expiry, yellow_fever: v.yellow_fever, yellow_fever_date: clean(v.yellow_fever_date), driving_license_number: v.driving_license_number, driving_license_expiry: v.driving_license_expiry, aadhaar_number: v.aadhaar_number, aadhaar_address: v.aadhaar_address, pan_number: v.pan_number, pan_full_name: v.pan_full_name, pan_dob: v.pan_dob, pan_parent_spouse_name: v.pan_parent_spouse_name };
      case 'bank': return { personal_bank_name: v.personal_bank_name, personal_bank_account: v.personal_bank_account, personal_ifsc: v.personal_ifsc, personal_bank_branch: v.personal_bank_branch, official_bank_name: clean(v.official_bank_name), official_bank_account: clean(v.official_bank_account), official_ifsc: clean(v.official_ifsc), official_bank_branch: clean(v.official_bank_branch) };
      case 'experience': return { is_experienced: v.is_experienced, last_company_name: clean(v.last_company_name), last_designation: clean(v.last_designation), last_working_day: clean(v.last_working_day), exp_contact_name: clean(v.exp_contact_name), last_inhand_salary: v.last_inhand_salary, highest_education: v.highest_education, education_stream: clean(v.education_stream), institute_name: clean(v.institute_name), passing_year: v.passing_year, education_marks: clean(v.education_marks) };
      case 'salary': return { salary_mode: v.salary_mode, current_basic: v.current_basic, current_hra: v.current_hra, current_allowance1: v.current_allowance1, current_amdb: v.current_amdb, joining_basic: v.joining_basic, joining_hra: v.joining_hra, joining_allowance1: v.joining_allowance1, joining_amdb: v.joining_amdb, asset_deduction_applicable: v.asset_deduction_applicable, security_amount: v.security_amount, deduction_months: v.deduction_months, deduction_from: v.deduction_from };
      case 'onboarding_docs': return { offer_letter: v.offer_letter, address_verification: v.address_verification, service_agreement: v.service_agreement, indemnity_bond: v.indemnity_bond, asset_deduction_letter: v.asset_deduction_letter, account_opening_letter: v.account_opening_letter, nda: v.nda };
      default: return {};
    }
  }, [methods]);

  // ─── Next / Submit ────────────────────────────────────────────────────────
  const handleNext = async () => {
    const valid = await validateStep();
    if (!valid || !current) return;

    // First step on create = POST
    if (mode === 'create' && currentIdx === 0 && !savedId) {
      const v = methods.getValues();
      const res: any = await createMutation.mutateAsync({
        first_name: v.first_name, middle_name: v.middle_name,
        last_name: v.last_name, status: v.status,
        employment_type: v.employment_type,
        employee_code: v.employee_code,
      });
      setSavedId(res.data.id);
    } else if (savedId && current.key !== 'review') {
      await updateMutation.mutateAsync({ step: current.key as StepSchemaKey, data: getPayload(current.key) });
    }

    setCompletedSteps(prev => new Set([...prev, currentIdx]));
    setCurrentIdx(prev => prev + 1);
    setIsDirty(false);
  };

  const handleSubmit = async () => {
    const valid = await validateStep();
    if (!valid || !savedId) return;
    if (current && current.key !== 'review') {
      await updateMutation.mutateAsync({ step: current.key as StepSchemaKey, data: getPayload(current.key) });
    }
    draftMutation.mutate({ employee_id: savedId, step: 'completed', form_data: {}, session_id: sessionId.current });
    onSuccess ? onSuccess({ id: savedId }) : router.push(`/employees/${savedId}`);
  };

  const overallPct = Math.round((completedSteps.size / visibleSteps.length) * 100);

  const renderStep = () => {
    if (!current) return null;
    const p = { isEdit: mode === 'edit', employeeId: savedId };
    switch (current.key) {
      case 'basic':           return <StepBasic {...p} />;
      case 'employment':      return <StepEmployment {...p} />;
      case 'reporting':       return <StepReporting {...p} />;
      case 'commitment':      return <StepCommitment {...p} />;
      case 'schemes':         return <StepSchemes {...p} />;
      case 'personal':        return <StepPersonal {...p} />;
      case 'address':         return <StepAddress {...p} />;
      case 'family':          return <StepFamily {...p} />;
      case 'emergency':       return <StepEmergency {...p} />;
      case 'statutory':       return <StepStatutory {...p} />;
      case 'bank':            return <StepBank {...p} />;
      case 'experience':      return <StepExperience {...p} />;
      case 'salary':          return <StepSalary {...p} />;
      case 'onboarding_docs': return <StepOnboardingDocs {...p} />;
      case 'review':          return <StepReview employeeId={savedId} methods={methods} />;
      default: return null;
    }
  };

  return (
    <FormProvider {...methods}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left sidebar ── */}
        <div className="card" style={{ padding: 0, position: 'sticky', top: 80, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
              {mode === 'edit' ? 'Edit Employee' : 'Add Employee'}
            </div>
            <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${overallPct}%`, background: 'var(--blue)', borderRadius: 4, transition: 'width .4s' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 4 }}>{overallPct}% complete</div>
          </div>

          <nav>
            {visibleSteps.map((step, idx) => {
              const isActive    = idx === currentIdx;
              const isCompleted = completedSteps.has(idx);
              const hasError    = stepErrors.has(idx);
              const accessible  = idx === 0 || savedId !== null || completedSteps.has(idx - 1);
              return (
                <div
                  key={step.key}
                  onClick={() => accessible && setCurrentIdx(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 18px', cursor: accessible ? 'pointer' : 'default',
                    background: isActive ? 'var(--blue-lt)' : 'transparent',
                    borderLeft: `3px solid ${isActive ? 'var(--blue)' : 'transparent'}`,
                    opacity: accessible ? 1 : 0.5,
                    transition: 'all .15s',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600,
                    background: hasError ? 'var(--red-lt)' : isCompleted ? 'var(--green-lt)' : isActive ? 'var(--blue-lt)' : 'var(--surface2)',
                    color: hasError ? 'var(--red)' : isCompleted ? 'var(--green)' : isActive ? 'var(--blue)' : 'var(--ink4)',
                    border: `1px solid ${hasError ? 'var(--red-bd)' : isCompleted ? 'var(--green-bd)' : isActive ? 'var(--blue-md)' : 'var(--border)'}`,
                  }}>
                    {hasError ? '✕' : isCompleted ? '✓' : idx + 1}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--blue)' : 'var(--ink2)' }}>
                    {step.label}
                  </span>
                  {step.sensitive && <span style={{ fontSize: 10, color: 'var(--ink4)', marginLeft: 'auto' }}>🔒</span>}
                </div>
              );
            })}
          </nav>

          {savingDraft && (
            <div style={{ padding: '8px 18px', fontSize: 11, color: 'var(--ink4)', borderTop: '1px solid var(--border)' }}>
              Saving draft...
            </div>
          )}
        </div>

        {/* ── Right content ── */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{current?.label}</h2>
            {current?.sensitive && (
              <div style={{ fontSize: 12, color: 'var(--amber)', background: 'var(--amber-lt)', padding: '6px 10px', borderRadius: 'var(--r)', border: '1px solid var(--amber-bd)' }}>
                This section contains sensitive information. Access is role-restricted.
              </div>
            )}
          </div>

          {renderStep()}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn btn-sec"
              disabled={isFirst || isSaving}
              onClick={() => setCurrentIdx(p => p - 1)}
            >
              ← Back
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-sec"
                style={{ fontSize: 12 }}
                onClick={triggerAutoSave}
                disabled={!isDirty || savingDraft}
              >
                Save Draft
              </button>

              {!isLast ? (
                <button type="button" className="btn btn-pri" onClick={handleNext} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save & Continue →'}
                </button>
              ) : (
                <button type="button" className="btn btn-pri" onClick={handleSubmit} disabled={isSaving || !savedId} style={{ background: 'var(--green)' }}>
                  {isSaving ? 'Submitting...' : mode === 'edit' ? 'Update Employee' : 'Create Employee'}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </FormProvider>
  );
}