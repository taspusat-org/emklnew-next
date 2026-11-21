import { number, z } from 'zod';
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

export const bookingOrderanMuatanSchema = z.object({
  // id: z.number().nullable().optional(),

  // NO BUKTI di-generate backend (running number) dan input-nya disabled, jadi
  // tidak boleh jadi syarat simpan. Tanpa `.optional()`, nilai `undefined`
  // (mis. sesudah forms.reset() pada SAVE & ADD) ditolak zod dengan pesan
  // default "Required" — pesan generik yang tidak menunjuk field manapun.
  nobukti: z.string().nullable().optional(),
  tglbukti: z
    .string({ message: dynamicRequiredMessage('TGL BUKTI') })
    .nonempty({ message: dynamicRequiredMessage('TGL BUKTI') }),

  jenisorder_id: requiredId('JENIS ORDER'),
  jenisorder_nama: z.string().nullable().optional(),

  container_id: requiredId('CONTAINER'),
  container_nama: z.string().nullable().optional(),

  shipper_id: requiredId('SHIPPER'),
  shipper_nama: z.string().nullable().optional(),

  tujuankapal_id: requiredId('TUJUAN KAPAL'),
  tujuankapal_nama: z.string().nullable().optional(),

  marketing_id: requiredId('MARKETING'),
  marketing_nama: z.string().nullable().optional(),

  keterangan: z
    .string({ message: dynamicRequiredMessage('KETERANGAN') })
    .min(1, { message: dynamicRequiredMessage('KETERANGAN') }),

  schedule_id: optionalId,
  schedule_nama: z.string().nullable().optional(),

  pelayarancontainer_id: optionalId,
  pelayarancontainer_nama: z.string().nullable().optional(),

  jenismuatan_id: requiredId('JENIS MUATAN'),
  jenismuatan_nama: z.string().nullable().optional(),

  sandarkapal_id: requiredId('SANDAR KAPAL'),
  sandarkapal_nama: z.string().nullable().optional(),

  tradoluar: optionalId,
  tradoluar_nama: z.string().nullable().optional(),

  nopolisi: z.string().nullable().optional(),
  nosp: z.string().nullable().optional(),
  nocontainer: z.string().nullable().optional(),
  noseal: z.string().nullable().optional(),

  lokasistuffing: optionalId,
  lokasistuffing_nama: z.string().nullable().optional(),

  nominalstuffing: z.string().nullable().optional(),

  emkl_id: optionalId,
  emkllain_nama: z.string().nullable().optional(),

  // WAJIB, sama seperti jobPartyHeaderSchema di bawah. Nilainya mengalir
  // booking -> orderanmuatan.asalmuatan (disalin saat approval) -> PELABUHAN
  // ASAL di detail Shipping Instruction, yang schema-nya nonempty. Waktu kolom
  // ini masih optional di sini, booking bisa tersimpan kosong dan error-nya
  // baru muncul jauh kemudian saat PROSES di form SI ("PELABUHAN ASAL WAJIB
  // DIISI") — di modul lain, dengan data yang sudah terlanjur di-approve.
  asalmuatan: z
    .string({ message: dynamicRequiredMessage('ASAL MUATAN') })
    .nonempty({ message: dynamicRequiredMessage('ASAL MUATAN') }),

  daftarbl_id: optionalId,
  daftarbl_nama: z.string().nullable().optional(),

  comodity: z.string().nullable().optional(),
  gandengan: z.string().nullable().optional(),

  pisahbl: optionalId,
  pisahbl_nama: z.string().nullable().optional(),

  jobptd: optionalId,
  jobptd_nama: z.string().nullable().optional(),

  transit: optionalId,
  transit_nama: z.string().nullable().optional(),

  stuffingdepo: optionalId,
  stuffingdepo_nama: z.string().nullable().optional(),

  opendoor: optionalId,
  opendoor_nama: z.string().nullable().optional(),

  batalmuat: optionalId,
  batalmuat_nama: z.string().nullable().optional(),

  soc: optionalId,
  soc_nama: z.string().nullable().optional(),

  pengurusandoorekspedisilain: optionalId,
  pengurusandoorekspedisilain_nama: z.string().nullable().optional()
});
export type bookingOrderanMuatanInput = z.infer<
  typeof bookingOrderanMuatanSchema
>;

export const jobPartyDetailSchema = z.object({
  id: z.number().optional(),

  nocontainer: z
    .string({ message: dynamicRequiredMessage('NO CONTAINER') })
    .nonempty({ message: dynamicRequiredMessage('NO CONTAINER') }),

  noseal: z
    .string({ message: dynamicRequiredMessage('NO SEAL') })
    .nonempty({ message: dynamicRequiredMessage('NO SEAL') }),

  schedule_id: z
    .number({
      required_error: dynamicRequiredMessage('SCHEDULE')
    })
    .min(1, { message: dynamicRequiredMessage('SCHEDULE') }),
  schedule_nama: z.string().nullable().optional(),

  kapal: z.number().nullable(),
  // kapal_id: z.number().nullable(),
  kapal_nama: z.string().nullable().optional(),

  pelayarancontainer_id: z.number().nullable(),
  pelayarancontainer_nama: z.string().nullable().optional(),

  voyberangkat: z.string().nullable().optional(),
  tglberangkat: z.string().nullable().optional(),

  daftarbl_id: z
    .number({
      required_error: dynamicRequiredMessage('DAFTAR BL')
    })
    .min(1, { message: dynamicRequiredMessage('DAFTAR BL') }),
  daftarbl_nama: z.string().nullable().optional(),

  // hargatrucking_id: z
  //   .number({
  //     required_error: dynamicRequiredMessage('DAFTAR BL')
  //   })
  //   .min(1, { message: dynamicRequiredMessage('DAFTAR BL') }),
  // hargatrucking_nama: z.string().nullable().optional(),

  hargatrucking: z.number().nullable().optional(),
  hargatrucking_nama: z.string().nullable().optional(),
  nominalstuffing: z.string().nullable().optional(),
  lokasistuffing: z.number().nullable().optional(),
  lokasistuffing_nama: z.string().nullable().optional()
});
export type jobPartyDetailInput = z.infer<typeof jobPartyDetailSchema>;

export const jobPartyHeaderSchema = z.object({
  // Sama seperti bookingOrderanMuatanSchema: NO BUKTI diisi backend.
  nobukti: z.string().nullable().optional(),
  jenisorder_id: requiredId('JENIS ORDER'),
  jenisorder_nama: z.string().nullable().optional(),

  marketing_id: z
    .number({
      required_error: dynamicRequiredMessage('MARKETING')
    })
    .min(1, { message: dynamicRequiredMessage('MARKETING') }),
  marketing_nama: z.string().nullable().optional(),

  container_id: z
    .number({
      required_error: dynamicRequiredMessage('CONTAINER')
    })
    .min(1, { message: dynamicRequiredMessage('CONTAINER') }),
  container_nama: z.string().nullable().optional(),

  tujuankapal_id: z
    .number({
      required_error: dynamicRequiredMessage('TUJUAN/PORT')
    })
    .min(1, { message: dynamicRequiredMessage('TUJUAN/PORT') }),
  tujuankapal_nama: z.string().nullable().optional(),

  shipper_id: z
    // .number({
    //   required_error: dynamicRequiredMessage('SHIPPER')
    // })
    // .min(1, { message: dynamicRequiredMessage('SHIPPER') }),
    .number()
    .nullable()
    .optional(),
  shipper_nama: z.string().nullable().optional(),

  party: z
    .number({
      required_error: dynamicRequiredMessage('PARTY')
    })
    .min(1, { message: dynamicRequiredMessage('PARTY') }),

  tglbukti: z
    .string({ message: dynamicRequiredMessage('tanggal') })
    .nonempty({ message: dynamicRequiredMessage('tanggal') }),

  estmuat: z
    .string({ message: dynamicRequiredMessage('EST MUAT') })
    .nonempty({ message: dynamicRequiredMessage('EST MUAT') }),

  asalmuatan: z
    .string({ message: dynamicRequiredMessage('ASAL MUATAN') })
    .nonempty({ message: dynamicRequiredMessage('ASAL MUATAN') }),

  details: z.array(jobPartyDetailSchema).min(1)
});
export type jobPartyHeaderInput = z.infer<typeof jobPartyHeaderSchema>;
