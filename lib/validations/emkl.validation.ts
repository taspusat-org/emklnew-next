import { z } from 'zod';
import { zodNumberField } from '../utils/field-helpers';

export const EmklSchema = z.object({
  // id & relasi (lookup/status) menyimpan id (varchar UUID), bukan angka.
  id: z.string().nullable().optional(),

  statusrelasi: z.string().nullable().optional(),
  statusrelasi_text: z.string().nullable().optional(),

  relasi_id: z.string().nullable().optional(),
  relasi_text: z.string().nullable().optional(),
  nama: z.string().trim().nullable().optional(),
  contactperson: z
    .string()
    .trim()
    .max(200, { message: 'CONTACTPERSON MAKSIMAL 200 KARAKTER' })
    .nullable()
    .optional(),
  alamat: z.string().trim().nullable().optional(),
  coagiro: z
    .string()
    .trim()
    .max(100, { message: 'COAGIRO MAKSIMAL 100 KARAKTER' })
    .nullable()
    .optional(),
  coapiutang: z
    .string()
    .trim()
    .max(100, { message: 'COAPIUTANG MAKSIMAL 100 KARAKTER' })
    .nullable()
    .optional(),
  coahutang: z
    .string()
    .trim()
    .max(100, { message: 'COAHUTANG MAKSIMAL 100 KARAKTER' })
    .nullable()
    .optional(),
  coahutang_ket: z.string().trim().nullable().optional(),
  coapiutang_ket: z.string().trim().nullable().optional(),
  coagiro_ket: z.string().trim().nullable().optional(),
  kota: z
    .string()
    .trim()
    .max(200, { message: 'KOTA MAKSIMAL 200 KARAKTER' })
    .nullable()
    .optional(),
  kodepos: z
    .string()
    .trim()
    .max(100, { message: 'KODEPOS MAKSIMAL 100 KARAKTER' })
    .nullable()
    .optional(),
  notelp: z
    .string()
    .trim()
    .max(100, { message: 'NOTELP MAKSIMAL 100 KARAKTER' })
    .nullable()
    .optional(),
  email: z
    .string()
    .trim()
    .max(200, { message: 'EMAIL MAKSIMAL 200 KARAKTER' })
    .nullable()
    .optional(),
  fax: z
    .string()
    .trim()
    .max(100, { message: 'FAX MAKSIMAL 100 KARAKTER' })
    .nullable()
    .optional(),
  alamatweb: z
    .string()
    .trim()
    .max(200, { message: 'ALAMATWEB MAKSIMAL 200 KARAKTER' })
    .nullable()
    .optional(),
  top: zodNumberField('TOP', { required: false }),
  npwp: z
    .string()
    .trim()
    .max(100, { message: 'NPWP MAKSIMAL 100 KARAKTER' })
    .nullable()
    .optional(),
  namapajak: z.string().trim().nullable().optional(),
  alamatpajak: z.string().trim().nullable().optional(),

  statustrado: z.string().nullable().optional(),
  statustrado_text: z.string().nullable().optional(),

  statusaktif: z.string().nullable().optional(),
  statusaktif_text: z.string().nullable().optional()
});

export type EmklInput = z.infer<typeof EmklSchema>;
