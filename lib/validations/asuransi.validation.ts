import { z } from 'zod';
import { REQUIRED_FIELD } from '@/constants/validation';
import { dynamicRequiredMessage } from '../utils';

export const AsuransiSchema = z.object({
  // ID & UUID (Optional/Nullable untuk form payload)
  id: z.string().nullable().optional(),

  // String Fields (Required)
  nama: z
    .string()
    .trim()
    .min(1, { message: dynamicRequiredMessage('NAMA') }),
  keterangan: z
    .string()
    .trim()
    .min(1, { message: dynamicRequiredMessage('KETERANGAN') }),
  contactperson: z
    .string()
    .trim()
    .min(1, { message: dynamicRequiredMessage('CONTACT PERSON') }),
  alamat: z.string().nullable().optional(),
  kota: z.string().nullable().optional(),
  kodepos: z.string().nullable().optional(),
  telp: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  fax: z.string().nullable().optional(),
  web: z.string().nullable().optional(),
  npwp: z.string().nullable().optional(),

  // Number Fields (Coerce bawaan Zod v3.22.4 untuk auto-convert string ke number)
  ratemodal: z.string().nullable().optional(),
  ratejual: z.string().nullable().optional(),
  nominalasuransi: z.string().nullable().optional(),
  rateopendoor: z.string().nullable().optional(),
  adminbiaya: z.string().nullable().optional(),
  admintagih: z.string().nullable().optional(),
  batas1: z.string().nullable().optional(),
  batas2: z.string().nullable().optional(),
  batas3: z.string().nullable().optional(),
  materai1: z.string().nullable().optional(),
  materai2: z.string().nullable().optional(),
  materai3: z.string().nullable().optional(),

  // Optional Fields Sesuai Interface (statusaktif, info, dll)
  statusaktif: z.string().min(1, { message: REQUIRED_FIELD }).optional(),
  info: z.string().nullable().optional()
});

export type AsuransiInput = z.infer<typeof AsuransiSchema>;

// import { z } from 'zod';
// import { REQUIRED_FIELD } from '@/constants/validation';
// import { dynamicRequiredMessage } from '../utils';

// export const AsuransiSchema = z.object({
//   // ID & UUID (Optional/Nullable untuk form payload)
//   id: z.string().nullable().optional(),
//   uuid: z.string().nullable().optional(),

//   // String Fields (Required)
//   nama: z.string().trim().min(1, { message: dynamicRequiredMessage('NAMA') }),
//   keterangan: z
//     .string()
//     .trim()
//     .min(1, { message: dynamicRequiredMessage('KETERANGAN') }),
//   contactperson: z
//     .string()
//     .trim()
//     .min(1, { message: dynamicRequiredMessage('CONTACT PERSON') }),
//   alamat: z
//     .string()
//     .trim()
//     .min(1, { message: dynamicRequiredMessage('ALAMAT') }),
//   kota: z.string().trim().min(1, { message: dynamicRequiredMessage('KOTA') }),
//   kodepos: z
//     .string()
//     .trim()
//     .min(1, { message: dynamicRequiredMessage('KODE POS') }),
//   telp: z
//     .string()
//     .trim()
//     .min(1, { message: dynamicRequiredMessage('NO TELP') }),
//   email: z
//     .string()
//     .trim()
//     .min(1, { message: dynamicRequiredMessage('EMAIL') }),
//   fax: z.string().trim().min(1, { message: dynamicRequiredMessage('FAX') }),
//   web: z.string().trim().min(1, { message: dynamicRequiredMessage('WEB') }),
//   npwp: z.string().trim().min(1, { message: dynamicRequiredMessage('NPWP') }),

//   // Number Fields (Coerce bawaan Zod v3.22.4 untuk auto-convert string ke number)
// ratemodal: z.coerce.number({
//   required_error: dynamicRequiredMessage('RATE MODAL'),
//   invalid_type_error: dynamicRequiredMessage('RATE MODAL'),
// }),
//   ratejual: z.coerce.number({
//     required_error: dynamicRequiredMessage('RATE JUAL'),
//     invalid_type_error: dynamicRequiredMessage('RATE JUAL'),
//   }),
//   nominalasuransi: z.coerce.number({
//     required_error: dynamicRequiredMessage('NOMINAL ASURANSI'),
//     invalid_type_error: dynamicRequiredMessage('NOMINAL ASURANSI'),
//   }),
//   rateopendoor: z.coerce.number({
//     required_error: dynamicRequiredMessage('RATE OPEN DOOR'),
//     invalid_type_error: dynamicRequiredMessage('RATE OPEN DOOR'),
//   }),
//   adminbiaya: z.coerce.number({
//     required_error: dynamicRequiredMessage('ADMIN BIAYA'),
//     invalid_type_error: dynamicRequiredMessage('ADMIN BIAYA'),
//   }),
//   admintagih: z.coerce.number({
//     required_error: dynamicRequiredMessage('ADMIN TAGIH'),
//     invalid_type_error: dynamicRequiredMessage('ADMIN TAGIH'),
//   }),
//   batas1: z.coerce.number({
//     required_error: dynamicRequiredMessage('BATAS 1'),
//     invalid_type_error: dynamicRequiredMessage('BATAS 1'),
//   }),
//   batas2: z.coerce.number({
//     required_error: dynamicRequiredMessage('BATAS 2'),
//     invalid_type_error: dynamicRequiredMessage('BATAS 2'),
//   }),
//   batas3: z.coerce.number({
//     required_error: dynamicRequiredMessage('BATAS 3'),
//     invalid_type_error: dynamicRequiredMessage('BATAS 3'),
//   }),
//   materai1: z.coerce.number({
//     required_error: dynamicRequiredMessage('MATERAI 1'),
//     invalid_type_error: dynamicRequiredMessage('MATERAI 1'),
//   }),
//   materai2: z.coerce.number({
//     required_error: dynamicRequiredMessage('MATERAI 2'),
//     invalid_type_error: dynamicRequiredMessage('MATERAI 2'),
//   }),
//   materai3: z.coerce.number({
//     required_error: dynamicRequiredMessage('MATERAI 3'),
//     invalid_type_error: dynamicRequiredMessage('MATERAI 3'),
//   }),

//   // Optional Fields Sesuai Interface (statusaktif, info, dll)
//   statusaktif: z.string().min(1, { message: REQUIRED_FIELD }).optional(),
//   statusaktif_uuid: z.string().nullable().optional(),
//   text: z.string().nullable().optional(),
//   info: z.string().nullable().optional(),
//   modifiedby: z.string().nullable().optional(),
//   editing_by: z.string().nullable().optional(),
//   editing_at: z.string().nullable().optional(),

//   // Audit timestamps (Required di Interface)
//   created_at: z.string().optional(),
//   updated_at: z.string().optional(),
// });

// export type AsuransiInput = z.infer<typeof AsuransiSchema>;
