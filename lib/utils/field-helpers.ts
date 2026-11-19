import { z } from 'zod';
import { dynamicRequiredMessage } from '@/lib/utils';

/**
 * Helper bersama untuk modul hasil generate emklnew-module-kit.
 * Kontrak ada di emklnew-module-kit/README.md ("Fungsi bersama").
 */

type NumberFieldOptions = {
  required: boolean;
  integer?: boolean;
  min?: number;
  max?: number;
};

const isBlank = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '');

/**
 * Schema angka untuk nilai string/number/null dari InputCurrency/InputNumeric.
 * Koma ribuan dibuang sebelum dicek.
 */
export function zodNumberField(label: string, opts: NumberFieldOptions) {
  const L = label.toUpperCase();
  return z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .superRefine((value, ctx) => {
      if (isBlank(value)) {
        if (opts.required) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: dynamicRequiredMessage(label)
          });
        }
        return;
      }
      const n =
        typeof value === 'number'
          ? value
          : Number(String(value).replace(/,/g, '').trim());
      if (!Number.isFinite(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${L} HARUS ANGKA`
        });
        return;
      }
      if (opts.integer && !Number.isInteger(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${L} HARUS BILANGAN BULAT`
        });
        return;
      }
      if (opts.min !== undefined && n < opts.min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${L} MINIMAL ${opts.min}`
        });
        return;
      }
      if (opts.max !== undefined && n > opts.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${L} MAKSIMAL ${opts.max}`
        });
      }
    });
}
