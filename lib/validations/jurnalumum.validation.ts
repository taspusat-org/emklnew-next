import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

export const jurnalumumDetailSchema = z.object({
  // id detail = varchar UUID dari backend; baris baru dikirim sebagai 0.
  id: z.union([z.string(), z.number()]).optional(),
  keterangan: z.string().nullable(),
  coa: z.string().nullable(),
  keterangancoa: z.string().nullable().optional(),
  nominaldebet: z.string().nullable(),
  nominalkredit: z.string().nullable()
});
export type JurnalUmumDetailInput = z.infer<typeof jurnalumumDetailSchema>;

export const jurnalumumHeaderSchema = z.object({
  nobukti: z.string().nullable().optional(),
  tglbukti: z
    .string()
    .trim()
    .nonempty({ message: dynamicRequiredMessage('TANGGAL BUKTI') }),
  keterangan: z.string().nullable(),
  details: z.array(jurnalumumDetailSchema).min(1)
});
export type JurnalUmumHeaderInput = z.infer<typeof jurnalumumHeaderSchema>;
