import { z } from 'zod';

export const jurnalumumDetailSchema = z.object({
  id: z.number().optional(),
  keterangan: z.string().nullable(),
  coa: z.string().nullable(),
  keterangancoa: z.string().nullable().optional(),
  nominaldebet: z.string().nullable(),
  nominalkredit: z.string().nullable()
});
export type JurnalUmumDetailInput = z.infer<typeof jurnalumumDetailSchema>;

export const jurnalumumHeaderSchema = z.object({
  nobukti: z.string().nullable().optional(),
  tglbukti: z.string().nullable(),
  keterangan: z.string().nullable(),
  details: z.array(jurnalumumDetailSchema).min(1)
});
export type JurnalUmumHeaderInput = z.infer<typeof jurnalumumHeaderSchema>;
