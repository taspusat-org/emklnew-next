import { z } from 'zod';

export const PelayaranSchema = z.object({
  // id & relasi (lookup/status) menyimpan id (varchar UUID), bukan angka.
  id: z.string().nullable().optional(),

  relasi_id: z.string().nullable().optional(),
  relasi_id_text: z.string().nullable().optional(),
  nama: z.string().trim().nullable().optional(),
  keterangan: z.string().trim().nullable().optional(),

  statusaktif: z.string().nullable().optional(),
  statusaktif_text: z.string().nullable().optional()
});

export type PelayaranInput = z.infer<typeof PelayaranSchema>;
