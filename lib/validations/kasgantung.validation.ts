import { z } from 'zod';

export const kasgantungDetailSchema = z.object({
  // baris baru di grid detail dibuat dengan id numerik 0 sebelum dinormalisasi
  // jadi '0' saat submit, jadi schema harus menerima keduanya.
  id: z.union([z.string(), z.number()]).optional(),
  nobukti: z.string().nullable(),
  keterangan: z.string().nullable(),
  nominal: z.string().nullable(),
  pengeluarandetail_id: z.string().nullable().optional()
});
export type KasGantungDetailInput = z.infer<typeof kasgantungDetailSchema>;

export const kasgantungHeaderSchema = z.object({
  nobukti: z.string().nullable(),
  tglbukti: z.string().nullable(),
  keterangan: z.string().nullable(),
  bank_id: z.string().nullable(),
  bank_nama: z.string().nullable().optional(),
  pengeluaran_nobukti: z.string().nullable(),
  coakaskeluar: z.string().nullable(),
  relasi_id: z.string().nullable(),
  alatbayar_id: z.string().nullable(),
  relasi_nama: z.string().nullable().optional(),
  alatbayar_nama: z.string().nullable().optional(),
  details: z.array(kasgantungDetailSchema).min(1)
});
export type KasGantungHeaderInput = z.infer<typeof kasgantungHeaderSchema>;
