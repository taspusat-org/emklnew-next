import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

const optionalId = z.union([z.string(), z.number()]).nullable().optional();

const requiredId = (label: string) =>
  z
    .union([z.string(), z.number()], {
      required_error: dynamicRequiredMessage(label),
      invalid_type_error: dynamicRequiredMessage(label)
    })
    .refine(
      (value) =>
        typeof value === 'number'
          ? Number.isFinite(value) && value > 0
          : String(value).trim() !== '',
      { message: dynamicRequiredMessage(label) }
    );

export const shippingInstructionDetailRincianSchema = z.object({
  id: optionalId,

  idOrderan: optionalId,

  orderanmuatan_nobukti: z
    .string({ message: dynamicRequiredMessage('JOB') })
    .nonempty({ message: dynamicRequiredMessage('JOB') }),

  comodity: z
    .string({ message: dynamicRequiredMessage('COMODITY') })
    .nonempty({ message: dynamicRequiredMessage('COMODITY') }),

  keterangan: z.string().nullable().optional()
});
export type shippingInstructionHeaderDetailRincianInput = z.infer<
  typeof shippingInstructionDetailRincianSchema
>;

export const shippingInstructionDetailSchema = z.object({
  id: optionalId,
  orderan_id: optionalId,

  daftarbl_id: requiredId('DAFTAR BL'),

  containerpelayaran_id: requiredId('CONTAINER PELAYARAN'),

  // emkl_id, BUKAN emkl_id: kolomnya sudah di-rename di DB & backend
  // (create() membaca detail.emkl_id). `emkllain_nama` sengaja tidak ikut
  // di-rename — itu cuma alias tampilan hasil join, bukan kolom.
  emkl_id: requiredId('EMKL LAIN'),

  tujuankapal_id: requiredId('TUJUAN KAPAL'),

  shippinginstructiondetail_nobukti: z.string().nullable().optional(),

  asalpelabuhan: z
    .string({ message: dynamicRequiredMessage('PELABUHAN ASAL') })
    .nonempty({ message: dynamicRequiredMessage('PELABUHAN ASAL') }),

  // keterangan: z
  //   .string({ message: dynamicRequiredMessage('KETERANGAN') })
  //   .nonempty({ message: dynamicRequiredMessage('KETERANGAN') }),

  keterangan: z.string().nullable().optional(),

  consignee: z
    .string({ message: dynamicRequiredMessage('CONSIGNEE') })
    .nonempty({ message: dynamicRequiredMessage('CONSIGNEE') }),

  shipper: z
    .string({ message: dynamicRequiredMessage('SHIPPER') })
    .nonempty({ message: dynamicRequiredMessage('SHIPPER') }),

  comodity: z
    .string({ message: dynamicRequiredMessage('COMODITY') })
    .nonempty({ message: dynamicRequiredMessage('COMODITY') }),

  notifyparty: z
    .string({ message: dynamicRequiredMessage('NOTIFY PARTY') })
    .nonempty({ message: dynamicRequiredMessage('NOTIFY PARTY') }),

  totalgw: z
    .string({ message: dynamicRequiredMessage('TOTAL GW / NW') })
    .nonempty({ message: dynamicRequiredMessage('TOTAL GW / NW') }),

  // namapelayaran: z
  //   .string({ message: dynamicRequiredMessage('NAMA PELAYARAN') })
  //   .nonempty({ message: dynamicRequiredMessage('NAMA PELAYARAN') }),
  detailsrincian: z.array(shippingInstructionDetailRincianSchema).min(1)
});
export type shippingInstructionHeaderDetailInput = z.infer<
  typeof shippingInstructionDetailSchema
>;

export const shippingInstructionHeaderSchema = z.object({
  id: optionalId,
  nobukti: z.string().nullable().optional(),

  tglbukti: z
    .string({ message: dynamicRequiredMessage('TGL BUKTI') })
    .nonempty({ message: dynamicRequiredMessage('TGL BUKTI') }),

  schedule_id: requiredId('SCHEDULE'),

  voyberangkat: z
    .string({ message: dynamicRequiredMessage('VOY BERANGKAT') })
    .nonempty({ message: dynamicRequiredMessage('VOY BERANGKAT') }),

  kapal_id: requiredId('KAPAL'),
  kapal_nama: z.string().nullable().optional(),

  tglberangkat: z
    .string({ message: dynamicRequiredMessage('TGL BERANGKAT') })
    .nonempty({ message: dynamicRequiredMessage('TGL BERANGKAT') }),

  tujuankapal_id: requiredId('TUJUAN'),
  tujuankapal_nama: z.string().nullable().optional(),

  details: z.array(shippingInstructionDetailSchema).min(1)
  // detailsrincian: z.array(shippingInstructionDetailRincianSchema).min(1)
});

export type shippingInstructionHeaderInput = z.infer<
  typeof shippingInstructionHeaderSchema
>;
