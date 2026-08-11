import { REQUIRED_FIELD } from '@/constants/validation';
import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

export const HargatruckingSchema = z.object({
  id: z.string().nullable().optional(),

  tarifdetail_id: z.string().nullable().optional(),
  tarifdetail_nama: z.string().nullable().optional(),

  tujuankapal_id: z.string().min(1, { message: REQUIRED_FIELD }),
  tujuankapal_text: z.string().nullable().optional(),

  emkl_id: z.string().min(1, { message: REQUIRED_FIELD }),
  emkl_text: z.string().nullable().optional(),

  keterangan: z.string().nullable().optional(),

  container_id: z.string().min(1, { message: REQUIRED_FIELD }),
  container_text: z.string().nullable().optional(),

  jenisorder_id: z.string().min(1, { message: REQUIRED_FIELD }),
  jenisorder_text: z.string().nullable().optional(),

  nominal: z.coerce
    .string({
      required_error: dynamicRequiredMessage('NOMINAL'),
      invalid_type_error: dynamicRequiredMessage('NOMINAL')
    })
    .refine((val) => val !== 'undefined' && val.trim() !== '', {
      message: dynamicRequiredMessage('NOMINAL')
    }),

  statusaktif: z.string().min(1, { message: REQUIRED_FIELD })
});

export type HargatruckingInput = z.infer<typeof HargatruckingSchema>;
