import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

export const pengembalianKasGantungDetailSchema = z.object({
  // Baris dikirim grid dengan id 0 (baris lookup kas gantung BUKAN baris
  // detail), jadi schema harus menerima string maupun number.
  id: z.union([z.string(), z.number()]).nullable().optional(),
  penerimaandetail_id: z.string().nullable().optional(),
  nobukti: z.string().nullable().optional(),
  kasgantung_nobukti: z.string().nullable().optional(),
  keterangan: z.string().nullable().optional(),
  nominal: z.union([z.string(), z.number()]).nullable().optional()
});
export type PengembalianKasGantungDetailInput = z.infer<
  typeof pengembalianKasGantungDetailSchema
>;

/**
 * Yang wajib hanya yang benar-benar dibutuhkan backend untuk menyimpan:
 * `bank_id` (sumber format nomor bukti + COA penerimaan gantung), `tglbukti`
 * (running number & tanggal jurnal), dan `details` (kas gantung yang
 * dikembalikan).
 */
export const pengembalianKasGantungHeaderSchema = z.object({
  nobukti: z.string().nullable().optional(),

  tglbukti: z
    .string()
    .trim()
    .nonempty({ message: dynamicRequiredMessage('TANGGAL BUKTI') }),

  keterangan: z.string().nullable().optional(),

  // bank_id, relasi_id & alatbayar_id = varchar(200) UUID, BUKAN number.
  // z.number() menolak string UUID (atau menerima NaN dari Number(uuid)) →
  // bank/relasi hilang jadi null. Lihat penerimaan.validation.ts.
  bank_id: z
    .string({ message: 'BANK WAJIB DIISI' })
    .min(1, { message: 'BANK WAJIB DIISI' }),
  bank_text: z.string().nullable().optional(),
  bank_nama: z.string().nullable().optional(),

  penerimaan_nobukti: z.string().nullable().optional(),

  coakasmasuk: z.string().nullable().optional(),
  coakasmasuk_text: z.string().nullable().optional(),
  coakasmasuk_nama: z.string().nullable().optional(),

  relasi_id: z.string().nullable().optional(),
  relasi_text: z.string().nullable().optional(),
  relasi_nama: z.string().nullable().optional(),

  alatbayar_id: z.string().nullable().optional(),
  alatbayar_text: z.string().nullable().optional(),
  alatbayar_nama: z.string().nullable().optional(),

  details: z
    .array(pengembalianKasGantungDetailSchema, {
      message: 'DETAIL WAJIB DIISI'
    })
    .min(1, { message: 'DETAIL WAJIB DIISI' })
});
export type PengembalianKasGantungHeaderInput = z.infer<
  typeof pengembalianKasGantungHeaderSchema
>;
