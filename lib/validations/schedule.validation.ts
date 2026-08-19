import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

// id detail dan seluruh FK (pelayaran/kapal/tujuankapal) adalah varchar UUID
// dari backend; baris baru dikirim sebagai 0.
const idField = z.union([z.string(), z.number()]);

const requiredLookup = (label: string) =>
  idField
    .nullable()
    .refine(
      (value) => value !== null && value !== '' && String(value) !== '0',
      {
        message: dynamicRequiredMessage(label)
      }
    );

export const scheduleDetailSchema = z.object({
  id: idField.optional(),
  nobukti: z.string().nullable().optional(),
  pelayaran_id: z.string().nullable(),
  pelayaran_nama: z.string().nullable().optional(),
  kapal_id: z.string().nullable(),
  kapal_nama: z.string().nullable().optional(),
  tujuankapal_id: z.string().nullable(),
  tujuankapal_nama: z.string().nullable().optional(),
  tglberangkat: z.string().nullable(),
  tgltiba: z.string().nullable(),
  etb: z.string().nullable(),
  eta: z.string().nullable(),
  etd: z.string().nullable(),
  voyberangkat: z.string().nullable(),
  voytiba: z.string().nullable(),
  closing: z.string().nullable(),
  etatujuan: z.string().nullable(),
  etdtujuan: z.string().nullable(),
  keterangan: z
    .string()
    .nonempty({ message: dynamicRequiredMessage('KETERANGAN') })
});
export type ScheduleDetailInput = z.infer<typeof scheduleDetailSchema>;

export const scheduleHeaderSchema = z.object({
  nobukti: z.string().nullable().optional(),
  tglbukti: z
    .string()
    .trim()
    .nonempty({ message: dynamicRequiredMessage('TGL BUKTI') }),
  keterangan: z
    .string()
    .nonempty({ message: dynamicRequiredMessage('KETERANGAN') }),
  details: z.array(scheduleDetailSchema).min(1)
});
export type ScheduleHeaderInput = z.infer<typeof scheduleHeaderSchema>;
