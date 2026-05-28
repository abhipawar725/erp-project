import { z } from 'zod';
import type { DynamicField, FieldType } from '../features/rbac/types/rbac.types';

// ─── Masking helpers ──────────────────────────────────────────────────────────

export function maskValue(value: string, fieldKey: string): string {
  if (!value) return value;

  const key = fieldKey.toLowerCase();

  // Aadhaar: 1234-5678-9999 → XXXX-XXXX-9999
  if (key.includes('aadhaar') || key.includes('aadhar')) {
    return value.replace(/\d(?=\d{4})/g, 'X');
  }

  // PAN: ABCDE1234F → ABC****34F
  if (key.includes('pan')) {
    if (value.length >= 10) {
      return value.slice(0, 3) + '****' + value.slice(-3);
    }
    return '••••';
  }

  // Salary / currency / amount: ₹75,000 → ₹ ******
  if (key.includes('salary') || key.includes('ctc') || key.includes('wage') ||
    key.includes('amount') || key.includes('pay')) {
    const prefix = value.match(/^[₹$€£¥]/)?.[0] || '';
    return `${prefix} ******`;
  }

  // Phone / mobile: +91 98765 43210 → +91 *****43210
  if (key.includes('mobile') || key.includes('phone') || key.includes('contact')) {
    if (value.length > 4) {
      return value.slice(0, Math.min(3, value.length - 4)) + '*'.repeat(value.length - Math.min(3, value.length - 4) - 4) + value.slice(-4);
    }
    return '****';
  }

  // Email: john.doe@gmail.com → j*****@gmail.com
  if (key.includes('email') || value.includes('@')) {
    const [local, domain] = value.split('@');
    if (local && domain) {
      return local[0] + '*'.repeat(Math.max(1, local.length - 1)) + '@' + domain;
    }
  }

  // Bank account: 1234567890 → ••••••7890
  if (key.includes('account') || key.includes('bank')) {
    return '•'.repeat(Math.max(0, value.length - 4)) + value.slice(-4);
  }

  // Default: last-4 visible
  if (value.length > 4) {
    return '•'.repeat(value.length - 4) + value.slice(-4);
  }
  return '••••';
}

// ─── Dynamic Zod schema builder ───────────────────────────────────────────────

type ZodShape = Record<string, z.ZodTypeAny>;

/**
 * Builds a Zod validation schema dynamically from an array of DynamicField definitions.
 * Respects: required, min/max length, min/max value, regex pattern, field type.
 */
export function buildZodSchema(fields: DynamicField[]): z.ZodObject<ZodShape> {
  const shape: ZodShape = {};

  for (const field of fields) {
    if (!field.is_active || field.is_hidden) continue;

    // Check if user can edit — if resolved and can_edit is false, skip validation (read-only display)
    if (field.resolved && !field.resolved.can_edit && !field.is_required) continue;

    shape[field.field_key] = buildFieldSchema(field);
  }

  return z.object(shape);
}

function buildFieldSchema(field: DynamicField): z.ZodTypeAny {
  const { field_type, is_required, min_length, max_length, min_value, max_value, regex_pattern, label } = field;

  let schema: z.ZodTypeAny;

  switch (field_type as FieldType) {
    // ── String-based ──────────────────────────────────────────────────────
    case 'text':
    case 'password':
    case 'textarea':
    case 'phone':
    case 'url': {
      let s = z.string();
      if (min_length) s = s.min(min_length, `${label} must be at least ${min_length} characters`);
      if (max_length) s = s.max(max_length, `${label} must not exceed ${max_length} characters`);
      if (field_type === 'url') s = s.url(`${label} must be a valid URL`), z.literal('');
      if (regex_pattern) {
        try {
          const rx = new RegExp(regex_pattern);
          s = s.regex(rx, `${label} format is invalid`);
        } catch { /* bad regex - skip */ }
      }
      schema = s;
      break;
    }

    case 'email': {
      let s = z.string().email(`${label} must be a valid email`);
      if (max_length) s = s.max(max_length);
      schema = s;
      break;
    }

    // ── Numeric ───────────────────────────────────────────────────────────
    case 'number':
    case 'currency':
    case 'percentage': {
      let s = z.coerce.number({ invalid_type_error: `${label} must be a number` });
      if (min_value !== null && min_value !== undefined) s = s.min(min_value, `${label} must be at least ${min_value}`);
      if (max_value !== null && max_value !== undefined) s = s.max(max_value, `${label} must not exceed ${max_value}`);
      if (field_type === 'percentage') s = s.min(0).max(100, `${label} must be between 0 and 100`);
      schema = s;
      break;
    }

    // ── Date / Time ───────────────────────────────────────────────────────
    case 'date':
    case 'datetime': {
      let s: z.ZodTypeAny = z
        .string()
        .min(1, `${label} is required`);
      // Date range validation via min/max_value used as ISO date strings
      if (min_value) {
        const minDate = new Date(min_value);
        s = s.refine(d => !d || new Date(d) >= minDate, `${label} must be on or after ${minDate.toLocaleDateString('en-IN')}`);
      }
      if (max_value) {
        const maxDate = new Date(max_value);
        s = s.refine(d => !d || new Date(d) <= maxDate, `${label} must be on or before ${maxDate.toLocaleDateString('en-IN')}`);
      }
      schema = s;
      break;
    }

    // ── Select / Radio ────────────────────────────────────────────────────
    case 'select':
    case 'radio': {
      const values = (field.options || []).map(o => o.value);
      schema = values.length > 0
        ? z.enum(values as [string, ...string[]], { errorMap: () => ({ message: `${label} must be a valid selection` }) })
        : z.string();
      break;
    }

    // ── Multi-select ──────────────────────────────────────────────────────
    case 'multi_select': {
      schema = z.array(z.string(), { errorMap: () => ({ message: `${label} must be an array of values` }) });
      if (is_required) {
        schema = (schema as z.ZodArray<z.ZodString>).min(1, `At least one ${label} must be selected`);
      }
      break;
    }

    // ── Checkbox ──────────────────────────────────────────────────────────
    case 'checkbox': {
      schema = z.boolean();
      if (is_required) {
        schema = z.literal(true, { errorMap: () => ({ message: `${label} must be checked` }) });
      }
      break;
    }

    // ── File / Image ──────────────────────────────────────────────────────
    case 'file':
    case 'image': {
      // Files are handled separately — just validate presence if required
      schema = z.any();
      break;
    }

    default:
      schema = z.string();
  }

  // Apply optional wrapper (non-required fields accept empty string or undefined)
  if (!is_required) {
    if (field_type === 'number' || field_type === 'currency' || field_type === 'percentage') {
      schema = schema.optional().or(z.literal(''));
    } else if (field_type === 'checkbox') {
      schema = schema.optional();
    } else if (field_type === 'multi_select') {
      schema = schema.optional();
    } else {
      schema = (schema as z.ZodString).optional().or(z.literal(''));
    }
  }

  return schema;
}

// ─── Runtime validation helper ────────────────────────────────────────────────

export type ValidationErrors = Record<string, string>;

export function validateForm(
  fields: DynamicField[],
  values: Record<string, unknown>,
): { success: boolean; errors: ValidationErrors } {
  const schema = buildZodSchema(fields);
  const result = schema.safeParse(values);

  if (result.success) return { success: true, errors: {} };

  const errors: ValidationErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (path) errors[path] = issue.message;
  }

  return { success: false, errors };
}

// ─── Default values builder ───────────────────────────────────────────────────

export function buildDefaultValues(fields: DynamicField[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const f of fields) {
    if (!f.is_active) continue;
    if (f.default_value !== null && f.default_value !== undefined) {
      if (f.field_type === 'number' || f.field_type === 'currency' || f.field_type === 'percentage') {
        defaults[f.field_key] = Number(f.default_value);
      } else if (f.field_type === 'checkbox') {
        defaults[f.field_key] = f.default_value === 'true';
      } else if (f.field_type === 'multi_select') {
        try { defaults[f.field_key] = JSON.parse(f.default_value); } catch { defaults[f.field_key] = []; }
      } else {
        defaults[f.field_key] = f.default_value;
      }
    } else {
      // Sensible empty defaults by type
      if (f.field_type === 'multi_select') defaults[f.field_key] = [];
      else if (f.field_type === 'checkbox') defaults[f.field_key] = false;
      else if (f.field_type === 'number' || f.field_type === 'currency' || f.field_type === 'percentage') defaults[f.field_key] = '';
      else defaults[f.field_key] = '';
    }
  }
  return defaults;
}
