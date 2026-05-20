'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';

import {
  basicInfoSchema,
  employmentSchema,
  addressSchema,
  statutorySchema,
  bankSchema,
  fullEmployeeSchema,
  type FullEmployeeFormData,
} from '../validations/employee.schema';

import { WIZARD_STEPS, type Employee } from '../types/employee.types';

import {
  useCreateEmployee,
  usePatchEmployeeStep,
  useNextEmployeeCode,
} from '../hooks/useEmployees';

import { StepBasicInfo } from './steps/StepBasicInfo';
import { StepEmployment } from './steps/StepEmployment';
import { StepAddress } from './steps/StepAddress';
import { StepStatutory } from './steps/StepStatutory';
import { StepBank } from './steps/StepBank';

import { usePermission } from '../../auth/hooks/usePermission';

/* ------------------------------------------------ */
/* STEP SCHEMAS */
/* ------------------------------------------------ */

const STEP_SCHEMAS = {
  basic: basicInfoSchema,
  employment: employmentSchema,
  address: addressSchema,
  statutory: statutorySchema,
  bank: bankSchema,
} as const;

type StepKey = keyof typeof STEP_SCHEMAS;

/* ------------------------------------------------ */
/* PROPS */
/* ------------------------------------------------ */

interface Props {
  mode: 'create' | 'edit';
  employee?: Employee;

  departments?: { value: number; label: string }[];
  designations?: { value: number; label: string }[];
  managers?: { value: number; label: string }[];

  onSuccess?: (employee: Employee) => void;
}

/* ------------------------------------------------ */
/* COMPONENT */
/* ------------------------------------------------ */

export function EmployeeWizard({
  mode,
  employee,
  departments = [],
  designations = [],
  managers = [],
  onSuccess,
}: Props) {
  const router = useRouter();

  const isEdit = mode === 'edit';

  const { isHR, isAdmin } = usePermission();

  const canSeeSensitive = isHR || isAdmin;

  const visibleSteps = useMemo(
    () =>
      WIZARD_STEPS.filter((s) =>
        canSeeSensitive
          ? true
          : !['statutory', 'bank'].includes(s.key),
      ),
    [canSeeSensitive],
  );

  const [currentStep, setCurrentStep] = useState(0);

  const [savedEmployeeId, setSavedEmployeeId] = useState<number | null>(
    employee?.id ?? null,
  );

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(
    new Set(
      isEdit
        ? visibleSteps.map((_, i) => i)
        : [],
    ),
  );

  const { data: autoCode } = useNextEmployeeCode();

  const createMutation = useCreateEmployee();

  const patchMutation = usePatchEmployeeStep(savedEmployeeId ?? 0);

  /* ------------------------------------------------ */
  /* FORM */
  /* ------------------------------------------------ */

  const methods = useForm<FullEmployeeFormData>({
    resolver: zodResolver(fullEmployeeSchema),
    mode: 'onTouched',

    defaultValues: {
      nationality: 'Indian',
      employment_type: 'Full-time',
      work_location: 'Office',
      status: 'On_Probation',
    },
  });

  /* ------------------------------------------------ */
  /* RESET FORM WHEN EMPLOYEE LOADS */
  /* ------------------------------------------------ */

  useEffect(() => {
    if (!employee) return;

    methods.reset({
      employee_code: employee.employee_code || '',

      first_name: employee.first_name || '',
      last_name: employee.last_name || '',

      email: employee.email || '',
      personal_email: employee.personal_email || '',

      phone: employee.phone || '',

      date_of_birth: employee.date_of_birth || '',

      gender: employee.gender || '',
      blood_group: employee.blood_group || '',
      marital_status: employee.marital_status || '',

      nationality: employee.nationality || 'Indian',

      department_id: employee.department_id || '',
      designation_id: employee.designation_id || '',
      reporting_manager_id:
        employee.reporting_manager_id || '',

      employment_type:
        employee.employment_type || 'Full-time',

      work_location:
        employee.work_location || 'Office',

      date_of_joining:
        employee.date_of_joining || '',

      date_of_confirmation:
        employee.date_of_confirmation || '',

      status: employee.status || 'On_Probation',

      address_line1: employee.address_line1 || '',
      address_line2: employee.address_line2 || '',

      city: employee.city || '',
      state: employee.state || '',
      pincode: employee.pincode || '',

      aadhaar_number:
        employee.aadhaar_number || '',

      pan_number: employee.pan_number || '',

      passport_number:
        employee.passport_number || '',

      uan_number: employee.uan_number || '',
      pf_number: employee.pf_number || '',
      esi_number: employee.esi_number || '',

      bank_name: employee.bank_name || '',

      bank_account_number:
        employee.bank_account_number || '',

      ifsc_code: employee.ifsc_code || '',
    });
  }, [employee, methods]);

  /* ------------------------------------------------ */
  /* STEP STATE */
  /* ------------------------------------------------ */

  const stepKey =
    visibleSteps[currentStep]?.key as StepKey | undefined;

  const isLastStep =
    currentStep === visibleSteps.length - 1;

  const isFirstStep = currentStep === 0;

  /* ------------------------------------------------ */
  /* VALIDATE STEP */
  /* ------------------------------------------------ */

  const validateCurrentStep =
    useCallback(async (): Promise<boolean> => {
      if (!stepKey) return false;

      const schema = STEP_SCHEMAS[stepKey];

      const values = methods.getValues();

      const result = schema.safeParse(values);

      if (!result.success) {
        await methods.trigger();
        return false;
      }

      return true;
    }, [stepKey, methods]);

  /* ------------------------------------------------ */
  /* NEXT */
  /* ------------------------------------------------ */

  const handleNext = async () => {
    const valid = await validateCurrentStep();

    if (!valid || !stepKey) return;

    const values = methods.getValues();

    /* -------------------------------------------- */
    /* CREATE FIRST STEP */
    /* -------------------------------------------- */

    if (
      mode === 'create' &&
      currentStep === 0 &&
      !savedEmployeeId
    ) {
      const res = await createMutation.mutateAsync({
        employee_code: values.employee_code,

        first_name: values.first_name,
        last_name: values.last_name,

        email: values.email,

        personal_email:
          values.personal_email || null,

        phone: values.phone || null,

        date_of_birth:
          values.date_of_birth || null,

        gender: values.gender || null,

        blood_group:
          values.blood_group || null,

        marital_status:
          values.marital_status || null,

        nationality:
          values.nationality || 'Indian',

        employment_type:
          values.employment_type || 'Full-time',

        work_location:
          values.work_location || 'Office',

        status:
          values.status || 'On_Probation',
      });

      setSavedEmployeeId(res.data.id);

      setCompletedSteps(
        (prev) => new Set([...prev, currentStep]),
      );

      setCurrentStep((prev) => prev + 1);

      return;
    }

    /* -------------------------------------------- */
    /* PATCH STEP */
    /* -------------------------------------------- */

    if (!savedEmployeeId) return;

    await patchMutation.mutateAsync({
      step: stepKey,
      data: getStepData(stepKey, values),
    });

    setCompletedSteps(
      (prev) => new Set([...prev, currentStep]),
    );

    setCurrentStep((prev) => prev + 1);
  };

  /* ------------------------------------------------ */
  /* SUBMIT */
  /* ------------------------------------------------ */

  const handleSubmit = async () => {
    const valid = await validateCurrentStep();

    if (!valid || !stepKey || !savedEmployeeId) {
      return;
    }

    const values = methods.getValues();

    await patchMutation.mutateAsync({
      step: stepKey,
      data: getStepData(stepKey, values),
    });

    if (isEdit && employee?.id) {
      onSuccess?.(employee);

      router.push(`/employees/${employee.id}`);
    } else {
      router.push(`/employees/${savedEmployeeId}`);
    }
  };

  /* ------------------------------------------------ */
  /* LOADING */
  /* ------------------------------------------------ */

  const isSaving =
    createMutation.isPending ||
    patchMutation.isPending;

  /* ------------------------------------------------ */
  /* UI */
  /* ------------------------------------------------ */

  return (
    <FormProvider {...methods}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: 20,
        }}
      >
        {/* SIDEBAR */}

        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden',
            height: 'fit-content',
          }}
        >
          <div
            style={{
              padding: 18,
              borderBottom: '1px solid var(--border)',
              fontWeight: 700,
            }}
          >
            {isEdit
              ? 'Edit Employee'
              : 'Create Employee'}
          </div>

          {visibleSteps.map((step, idx) => {
            const active = idx === currentStep;

            const completed =
              completedSteps.has(idx);

            return (
              <div
                key={step.key}
                onClick={() => setCurrentStep(idx)}
                style={{
                  padding: '14px 18px',
                  cursor: 'pointer',
                  transition: '.2s',

                  background: active
                    ? 'rgba(59,130,246,.08)'
                    : 'transparent',

                  borderLeft: active
                    ? '3px solid #3b82f6'
                    : '3px solid transparent',

                  fontWeight: active ? 600 : 500,

                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{step.label}</span>

                {completed && (
                  <span
                    style={{
                      fontSize: 12,
                      color: '#16a34a',
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* STEP CONTENT */}

        <div className="card" style={{ padding: 24 }}>
          {stepKey === 'basic' && (
            <StepBasicInfo
              isEdit={isEdit}
              autoCode={autoCode}
            />
          )}

          {stepKey === 'employment' && (
            <StepEmployment
              departments={departments}
              designations={designations}
              managers={managers}
              isEdit={isEdit}
            />
          )}

          {stepKey === 'address' && (
            <StepAddress isEdit={isEdit} />
          )}

          {stepKey === 'statutory' && (
            <StepStatutory isEdit={isEdit} />
          )}

          {stepKey === 'bank' && (
            <StepBank isEdit={isEdit} />
          )}
        </div>

        {/* FOOTER */}

        <div
          style={{
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4,
          }}
        >
          <button
            type="button"
            className="btn btn-sec"
            disabled={isFirstStep || isSaving}
            onClick={() =>
              setCurrentStep((prev) => prev - 1)
            }
          >
            Back
          </button>

          {!isLastStep ? (
            <button
              type="button"
              className="btn btn-pri"
              onClick={handleNext}
              disabled={isSaving}
            >
              {isSaving
                ? 'Saving...'
                : 'Save & Continue'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-pri"
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving
                ? 'Saving...'
                : isEdit
                ? 'Update Employee'
                : 'Create Employee'}
            </button>
          )}
        </div>
      </div>
    </FormProvider>
  );
}

/* ------------------------------------------------ */
/* STEP DATA */
/* ------------------------------------------------ */

function getStepData(
  stepKey: StepKey,
  values: FullEmployeeFormData,
) {
  const clean = (v: any) =>
    v === '' ? null : v;

  switch (stepKey) {
    case 'basic':
      return {
        employee_code: clean(values.employee_code),

        first_name: clean(values.first_name),
        last_name: clean(values.last_name),

        email: clean(values.email),

        personal_email: clean(
          values.personal_email,
        ),

        phone: clean(values.phone),

        date_of_birth: clean(
          values.date_of_birth,
        ),

        gender: clean(values.gender),

        blood_group: clean(
          values.blood_group,
        ),

        marital_status: clean(
          values.marital_status,
        ),

        nationality: clean(
          values.nationality,
        ),
      };

    case 'employment':
      return {
        department_id: clean(
          values.department_id,
        ),

        designation_id: clean(
          values.designation_id,
        ),

        reporting_manager_id: clean(
          values.reporting_manager_id,
        ),

        employment_type: clean(
          values.employment_type,
        ),

        work_location: clean(
          values.work_location,
        ),

        date_of_joining: clean(
          values.date_of_joining,
        ),

        date_of_confirmation: clean(
          values.date_of_confirmation,
        ),

        status: clean(values.status),
      };

    case 'address':
      return {
        address_line1: clean(
          values.address_line1,
        ),

        address_line2: clean(
          values.address_line2,
        ),

        city: clean(values.city),

        state: clean(values.state),

        pincode: clean(values.pincode),
      };

    case 'statutory':
      return {
        aadhaar_number: clean(
          values.aadhaar_number,
        ),

        pan_number: clean(
          values.pan_number,
        ),

        passport_number: clean(
          values.passport_number,
        ),

        uan_number: clean(
          values.uan_number,
        ),

        pf_number: clean(
          values.pf_number,
        ),

        esi_number: clean(
          values.esi_number,
        ),
      };

    case 'bank':
      return {
        bank_name: clean(
          values.bank_name,
        ),

        bank_account_number: clean(
          values.bank_account_number,
        ),

        ifsc_code: clean(
          values.ifsc_code,
        ),
      };

    default:
      return {};
  }
}