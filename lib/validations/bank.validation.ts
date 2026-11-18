import { z } from 'zod';
import { REQUIRED_FIELD } from '@/constants/validation';
import { dynamicRequiredMessage } from '../utils';

export const BankSchema = z
  .object({
    id: z.string().nullable().optional(),
    nama: z.string().nonempty({ message: dynamicRequiredMessage('NAMA') }),
    keterangan: z
      .string()
      .trim()
      .nonempty({ message: dynamicRequiredMessage('KETERANGAN') }),

    coa: z.string().nullable().optional(),
    keterangancoa: z.string().nullable().optional(),

    coagantung: z.string().nullable().optional(),
    keterangancoagantung: z.string().nullable().optional(),

    statusbank: z.string().min(1, { message: REQUIRED_FIELD }),
    statusbank_text: z.string().nullable().optional(),

    statusaktif: z.string().min(1, { message: REQUIRED_FIELD }),
    text: z.string().nullable().optional(),

    statusdefault: z.string().min(1, { message: REQUIRED_FIELD }),
    statusdefault_text: z.string().nullable().optional(),

    formatpenerimaan: z.string().min(1, { message: REQUIRED_FIELD }),
    formatpenerimaantext: z.string().nullable().optional(),

    formatpengeluaran: z.string().min(1, { message: REQUIRED_FIELD }),
    formatpengeluarantext: z.string().nullable().optional(),

    formatpenerimaangantung: z.string().min(1, { message: REQUIRED_FIELD }),
    formatpenerimaangantungtext: z.string().nullable().optional(),

    formatpengeluarangantung: z.string().min(1, { message: REQUIRED_FIELD }),
    formatpengeluarangantungtext: z.string().nullable().optional(),

    formatpencairan: z.string().min(1, { message: REQUIRED_FIELD }),
    formatpencairantext: z.string().nullable().optional(),

    formatrekappenerimaan: z.string().min(1, { message: REQUIRED_FIELD }),
    formatrekappenerimaantext: z.string().nullable().optional(),

    formatrekappengeluaran: z.string().min(1, { message: REQUIRED_FIELD }),
    formatrekappengeluarantext: z.string().nullable().optional()
  })
  .superRefine((data, ctx) => {
    // COA dan COA GANTUNG tidak boleh sama (abaikan jika salah satu kosong)
    if (data.coa && data.coagantung && data.coa === data.coagantung) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['coagantung'],
        message: 'COA dan COA GANTUNG tidak boleh sama'
      });
    }
  });

export type BankInput = z.infer<typeof BankSchema>;
