import { REQUIRED_FIELD } from '@/constants/validation';
import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

export const TujuankapalSchema = z.object({
  id: z.string().nullable().optional(),
  nama: z.string().nonempty({ message: dynamicRequiredMessage('NAMA') }),
  kode: z
    .string({
      required_error: dynamicRequiredMessage('KODE TUJUAN KAPAL'),
      invalid_type_error: dynamicRequiredMessage('KODE TUJUAN KAPAL')
    })
    .nonempty({ message: dynamicRequiredMessage('KODE TUJUAN KAPAL') }),
  keterangan: z
    .string()
    .trim()
    .nonempty({ message: dynamicRequiredMessage('KETERANGAN') }), // Keterangan wajib diisi

  cabang_id: z.string().nullable().optional(),
  cabang_nama: z.string().nullable().optional(),

  statusaktif: z.string().min(1, `${REQUIRED_FIELD}`),
  text: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),

  info: z.string().nullable().optional()
});

export type TujuankapalInput = z.infer<typeof TujuankapalSchema>;
