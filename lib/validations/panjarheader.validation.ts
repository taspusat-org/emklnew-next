import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

const idBaris = z.union([z.string(), z.number()]).nullable().optional();

const nominalWajib = (label: string) =>
  z
    .union([z.string(), z.number()])
    .refine((val) => String(val ?? '').trim() !== '', {
      message: dynamicRequiredMessage(label)
    })
    .refine(
      (val) => {
        // Pemisah ribuan dibuang dulu: Number('100,000.00') = NaN sehingga cek
        // "tidak boleh nol" versi lama praktis tidak pernah menolak apa pun
        // begitu InputCurrency memformat nilainya.
        const cleaned = String(val ?? '').replace(/[^0-9.-]/g, '');
        if (cleaned === '') return true; // bukan angka — bukan urusan cek ini
        return Number(cleaned) !== 0;
      },
      { message: `${label} wajib di isi` }
    );

export const PanjarDetailSchema = z.object({
  id: idBaris,
  nobukti: z.string().nullable().optional(),
  panjar_id: idBaris,

  // Kolom bantu form (tidak punya kolom di tabel) — cukup jangan sampai
  // menggagalkan payload.
  orderanmuatan_id: idBaris,
  orderanmuatan_nobukti: z
    .string({ message: dynamicRequiredMessage('ORDERAN MUATAN') })
    .nonempty({ message: dynamicRequiredMessage('ORDERAN MUATAN') }),

  estimasi: nominalWajib('ESTIMASI'),
  nominal: nominalWajib('NOMINAL'),

  keterangan: z.string().nullable().optional(),
  info: z.string().nullable().optional()
});
export type PanjarDetailInput = z.infer<typeof PanjarDetailSchema>;

export const panjarHeaderSchema = z.object({
  id: idBaris,
  nobukti: z.string().nullable().optional(),

  tglbukti: z
    .string({ message: dynamicRequiredMessage('TGL BUKTI') })
    .nonempty({ message: dynamicRequiredMessage('TGL BUKTI') }),

  jenisorder_id: z
    .string({
      required_error: dynamicRequiredMessage('JENIS ORDER')
    })
    .min(1, { message: dynamicRequiredMessage('JENIS ORDER') }),
  jenisorder_nama: z.string().nullable().optional(),

  biayaemkl_id: z
    .string({
      required_error: dynamicRequiredMessage('BIAYA EMKL')
    })
    .min(1, { message: dynamicRequiredMessage('BIAYA EMKL') }),
  biayaemkl_nama: z.string().nullable().optional(),

  keterangan: z
    .string({ message: dynamicRequiredMessage('KETERANGAN') })
    .nonempty({ message: dynamicRequiredMessage('KETERANGAN') }),

  details: z.array(PanjarDetailSchema).min(1)
});

export type panjarHeaderInput = z.infer<typeof panjarHeaderSchema>;
