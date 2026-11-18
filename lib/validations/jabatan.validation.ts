import { z } from 'zod';
import { REQUIRED_FIELD } from '@/constants/validation';
import { dynamicRequiredMessage } from '../utils';

export const JabatanSchema = z.object({
  // id & relasi (lookup/status) menyimpan id (varchar UUID), bukan angka.
  id: z.string().nullable().optional(),
  nama: z
    .string()
    .trim()
    .nonempty({ message: dynamicRequiredMessage('NAMA') })
    .max(100, { message: 'NAMA MAKSIMAL 100 KARAKTER' }),
  keterangan: z.string().trim().nullable().optional(),

  statusaktif: z.string().min(1, { message: REQUIRED_FIELD }),
  statusaktif_text: z.string().nullable().optional(),

  divisi_id: z.string().min(1, { message: REQUIRED_FIELD }),
  divisi_id_text: z.string().nullable().optional()
});

export type JabatanInput = z.infer<typeof JabatanSchema>;
