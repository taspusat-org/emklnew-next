import { z } from 'zod';
import { REQUIRED_FIELD } from '@/constants/validation';
import { dynamicRequiredMessage } from '../utils';

export const jenisorderanSchema = z.object({
  // id & statusaktif menyimpan id parameter (varchar UUID), bukan angka.
  id: z.string().nullable().optional(),
  uuid: z.string().nullable().optional(),

  nama: z.string().nonempty({ message: dynamicRequiredMessage('NAMA') }),
  keterangan: z
    .string()
    .trim()
    .nonempty({ message: dynamicRequiredMessage('KETERANGAN') }),

  statusformat: z.string().min(1, { message: REQUIRED_FIELD }),
  statusformat_text: z.string().nullable().optional(),

  statusaktif: z.string().min(1, { message: REQUIRED_FIELD }),
  statusaktif_uuid: z.string().nullable().optional(),
  text: z.string().nullable().optional()
});

export type JenisOrderanInput = z.infer<typeof jenisorderanSchema>;
