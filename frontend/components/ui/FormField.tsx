'use client';
import { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { UseFormRegisterReturn, FieldError } from 'react-hook-form';

interface BaseFieldProps {
  label: string;
  error?: FieldError;
  required?: boolean;
  hint?: string;
}

interface InputFieldProps extends BaseFieldProps, InputHTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'tel';
  register?: UseFormRegisterReturn;
}

interface SelectFieldProps extends BaseFieldProps, SelectHTMLAttributes<HTMLSelectElement> {
  register?: UseFormRegisterReturn;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

interface TextareaFieldProps extends BaseFieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  register?: UseFormRegisterReturn;
}

export function InputField({ label, error, required, hint, register, ...rest }: InputFieldProps) {
  return (
    <div className="fg">
      <label>{label}{required && ' *'}</label>
      <input {...register} {...rest} />
      {hint && !error && <span style={{ fontSize: 10, color: 'var(--ink4)' }}>{hint}</span>}
      {error && <span className="err">{error.message}</span>}
    </div>
  );
}

export function SelectField({ label, error, required, hint, register, options, placeholder, ...rest }: SelectFieldProps) {
  return (
    <div className="fg">
      <label>{label}{required && ' *'}</label>
      <select {...register} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {hint && !error && <span style={{ fontSize: 10, color: 'var(--ink4)' }}>{hint}</span>}
      {error && <span className="err">{error.message}</span>}
    </div>
  );
}

export function TextareaField({ label, error, required, hint, register, ...rest }: TextareaFieldProps) {
  return (
    <div className="fg">
      <label>{label}{required && ' *'}</label>
      <textarea {...register} {...rest} />
      {hint && !error && <span style={{ fontSize: 10, color: 'var(--ink4)' }}>{hint}</span>}
      {error && <span className="err">{error.message}</span>}
    </div>
  );
}
