import { REQUIRED_FIELD } from '@/constants/validation';
import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

export const HariliburSchema = z.object({
  id: z.string().nullable().optional(),
  tgl: z
    .string()
    .nonempty({ message: dynamicRequiredMessage('TANGGAL') })
    .refine(
      (val) => {
        // Jika ada nilai, validasi format dd-mm-yyyy
        return val ? /^\d{2}-\d{2}-\d{4}$/.test(val) : true;
      },
      {
        message: 'FORMAT TANGGAL TIDAK VALID'
      }
    ),
  keterangan: z
    .string()
    .nonempty({ message: dynamicRequiredMessage('KETERANGAN') }),

  statusaktif: z.string().min(1, { message: REQUIRED_FIELD }),
  text: z.string().nullable().optional(),

  cabang_id: z.string().nonempty({ message: dynamicRequiredMessage('CABANG') }),
  cabang_nama: z.string().nullable().optional()
});
export type HariliburInput = z.infer<typeof HariliburSchema>;
