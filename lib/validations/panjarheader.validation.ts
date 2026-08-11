import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

/**
 * Semua id panjar (header, detail, dan FK-nya) sudah bertipe TEXT (uuid v7) di
 * database. Dua jebakan yang bikin simpan gagal dengan 400 tanpa pesan jelas di
 * UI:
 *
 *  1. Baris detail BARU dikirim dengan `id: 0` (angka) oleh grid form, jadi
 *     `z.string()` polos menolaknya — "Expected string, received number".
 *  2. Baris hasil migrasi punya id numerik-sebagai-string ('7', '8', ...),
 *     bukan uuid, jadi tidak boleh divalidasi dengan `z.string().uuid()`.
 *
 * `idBaris` menerima keduanya. Skema ini dijaga sinkron dengan
 * CreatePanjarHeaderSchema di backend (create-panjarheader.dto.ts).
 */
const idBaris = z.union([z.string(), z.number()]).nullable().optional();

/**
 * estimasi & nominal datang dari InputCurrency sebagai string ter-format
 * ("100,000.00"), tapi bisa juga number saat payload dirakit ulang dari data
 * yang sudah tersimpan. Keduanya diterima; kosong / 0 tetap ditolak.
 */
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
