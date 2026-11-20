import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

export const penerimaanDetailSchema = z.object({
  id: z.union([z.string(), z.number()]).nullable().optional(),
  coa: z.string().min(1, { message: dynamicRequiredMessage('COA') }),
  keterangan: z.string().nullable().optional(),
  nominal: z
    .union([z.string(), z.number()], { message: 'NOMINAL WAJIB DIISI' })
    .refine((v) => String(v ?? '').trim() !== '', {
      message: 'NOMINAL WAJIB DIISI'
    })
});
export type PenerimaanDetailInput = z.infer<typeof penerimaanDetailSchema>;

/**
 * Cerminan `CreatePenerimaanheaderSchema` di backend — pesan dan field
 * wajibnya sengaja dibuat identik supaya validasi gagal di form (langsung di
 * bawah fieldnya) sebelum sempat menjadi error dari server.
 *
 * Yang wajib hanya yang benar-benar dibutuhkan backend untuk menyimpan:
 * `bank_id` (sumber format nomor bukti + COA debet jurnal), `tglbukti`
 * (running number & tanggal jurnal), dan `details` (bahan jurnal umumnya).
 */
export const penerimaanHeaderSchema = z.object({
  nobukti: z.string().nullable().optional(),

  tglbukti: z
    .string({ message: 'TGL BUKTI WAJIB DIISI' })
    .min(1, { message: 'TGL BUKTI WAJIB DIISI' }),

  // bank_id & relasi_id = varchar(200) UUID, BUKAN number. z.number() menolak
  // string UUID (atau menerima NaN dari Number(uuid)) → bank/relasi hilang/null.
  bank_id: z
    .string({ message: 'BANK WAJIB DIISI' })
    .min(1, { message: 'BANK WAJIB DIISI' }),
  bank_text: z.string().nullable().optional(),
  bank_nama: z.string().nullable().optional(),

  keterangan: z.string().nullable().optional(),
  nowarkat: z.string().nullable().optional(),
  noresi: z.string().nullable().optional(),
  tgllunas: z.string().nullable().optional(),
  postingdari: z.string().nullable().optional(),
  diterimadari: z.string().nullable().optional(),

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
    .array(penerimaanDetailSchema, { message: 'DETAIL WAJIB DIISI' })
    .min(1, { message: 'DETAIL WAJIB DIISI MINIMAL 1 BARIS' })
});
export type PenerimaanHeaderInput = z.infer<typeof penerimaanHeaderSchema>;
