import { REQUIRED_FIELD } from '@/constants/validation';
import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

export const LabaRugiKalkulasiSchema = z.object({
  id: z.string().nullable().optional(),
  periode: z.string().nonempty({ message: dynamicRequiredMessage('PERIODE') }),

  estkomisimarketing: z.string().nullable().optional(),
  estkomisimarketing2: z.string().nullable().optional(),

  komisimarketing: z.string().nullable().optional(),
  biayakantorpusat: z.string().nullable().optional(),
  biayatour: z.string().nullable().optional(),

  gajidireksi: z.string().nullable().optional(),
  estkomisikacab: z.string().nullable().optional(),
  biayabonustriwulan: z.string().nullable().optional(),

  estkomisikacabcabang1: z.string().nullable().optional(),
  estkomisikacabcabang2: z.string().nullable().optional(),

  statusfinalkomisimarketing: z.string().min(1, {
    message: dynamicRequiredMessage('STATUS FINAL KOMISI MARKETING')
  }),
  statusfinalkomisimarketing_text: z.string().nullable().optional(),

  statusfinalbonustriwulan: z.string().min(1, {
    message: dynamicRequiredMessage('STATUS FINAL BONUS TRIWULAN')
  }),
  statusfinalbonustriwulan_text: z.string().nullable().optional()
});

export type LabaRugiKalkulasiInput = z.infer<typeof LabaRugiKalkulasiSchema>;
