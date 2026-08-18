import { nullable, z } from 'zod';
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

export const blRincianBiayaSchema = z.object({
  // Semua id BERTIPE TEKS sejak migrasi UUID; baris baru dari tombol PROSES
  // dikirim '0' (string), bukan angka 0. Selaras dengan DTO backend
  // create-bl-header.dto.ts yang juga z.string().
  id: z.string().optional(),
  nobukti: z.string().nullable().optional(),
  bldetail_id: optionalId,
  bldetail_nobukti: z.string().nullable().optional(),

  orderanmuatan_nobukti: z
    .string({ message: dynamicRequiredMessage('JOB') })
    .nonempty({ message: dynamicRequiredMessage('JOB') }),

  // NOMINAL tidak lagi wajib: kolomnya read-only dan nilainya diturunkan
  // backend (hitungNominalRincianBiaya). Kalau tetap diwajibkan, user kena
  // tembok yang TIDAK BISA ia lewati sendiri — tidak ada input untuk mengisinya.
  // Sama seperti baris biaya yang dibuat otomatis di estimasi-biaya-header dan
  // biaya-header, yang juga memakai nullable().optional().
  nominal: z.string().nullable().optional(),

  biayaemkl_id: requiredId('BIAYA EMKL'),
  biayaemkl_nama: z.string().optional()
});
export type blRincianBiayaInput = z.infer<typeof blRincianBiayaSchema>;

export const blDetailRincianSchema = z.object({
  id: z.string().optional(),

  nobukti: z.string().nullable().optional(),
  bldetail_id: optionalId,
  bldetail_nobukti: z.string().nullable().optional(),

  orderanmuatan_nobukti: z
    .string({ message: dynamicRequiredMessage('JOB') })
    .nonempty({ message: dynamicRequiredMessage('JOB') }),

  keterangan: z.string().nullable().optional(),

  rincianbiaya: z.array(blRincianBiayaSchema).min(1)
});
export type blHeaderDetailRincianInput = z.infer<typeof blDetailRincianSchema>;

export const blDetailSchema = z.object({
  id: z.string().optional(),
  nobukti: z.string().nullable().optional(),

  bl_id: optionalId,

  bl_nobukti: z
    .string({ message: dynamicRequiredMessage('NO BL CONECTING') })
    .nonempty({ message: dynamicRequiredMessage('NO BL CONECTING') }),

  shippinginstructiondetail_nobukti: z
    .string({
      message: dynamicRequiredMessage('SHIPPING INSTRUCTION DETAIL NO BUKTI')
    })
    .nonempty({
      message: dynamicRequiredMessage('SHIPPING INSTRUCTION DETAIL NO BUKTI')
    }),

  keterangan: z.string().nullable().optional(),

  asalpelabuhan: z.string().nullable().optional(),
  consignee: z.string().nullable().optional(),
  shipper: z.string().nullable().optional(),
  comodity: z.string().nullable().optional(),
  notifyparty: z.string().nullable().optional(),
  pelayaran_nama: z.string().nullable().optional(),
  emkllain_nama: z.string().nullable().optional(),

  detailsrincian: z.array(blDetailRincianSchema).min(1)
});
export type blDetailInput = z.infer<typeof blDetailSchema>;

export const blHeaderSchema = z.object({
  id: z.string().optional(),
  nobukti: z.string().nullable().optional(),

  shippinginstruction_nobukti: z
    .string({ message: dynamicRequiredMessage('shippinginstruction nobukti') })
    .nonempty({
      message: dynamicRequiredMessage('shippinginstruction nobukti')
    }),

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

  details: z.array(blDetailSchema).min(1)
});

export type blHeaderInput = z.infer<typeof blHeaderSchema>;
