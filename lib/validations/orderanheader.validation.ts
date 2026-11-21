import { number, z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

export const orderanMuatanSchema = z.object({
  // id: z.number().nullable().optional(),
  nobukti: z.string().nullable(),
  tglbukti: z
    .string({ message: dynamicRequiredMessage('TGL BUKTI') })
    .nonempty({ message: dynamicRequiredMessage('TGL BUKTI') }),

  jenisorder_id: z
    // .number({
    //   required_error: dynamicRequiredMessage('JENIS ORDER')
    //   // invalid_type_error: dynamicRequiredMessage('JENIS ORDER')
    // })
    .number()
    .int({ message: dynamicRequiredMessage('JENIS ORDER') })
    .min(1, { message: dynamicRequiredMessage('JENIS ORDER') }),
  jenisorder_nama: z.string().nullable().optional(),

  container_id: z
    .number({
      required_error: dynamicRequiredMessage('CONTAINER')
    })
    .min(1, { message: dynamicRequiredMessage('CONTAINER') }),
  container_nama: z.string().nullable().optional(),

  shipper_id: z
    .number({
      required_error: dynamicRequiredMessage('SHIPPER')
    })
    .min(1, { message: dynamicRequiredMessage('SHIPPER') }),
  shipper_nama: z.string().nullable().optional(),

  tujuankapal_id: z
    .number({
      required_error: dynamicRequiredMessage('TUJUAN KAPAL')
    })
    .min(1, { message: dynamicRequiredMessage('TUJUAN KAPAL') }),
  tujuankapal_nama: z.string().nullable().optional(),

  marketing_id: z
    .number({
      required_error: dynamicRequiredMessage('MARKETING')
    })
    .min(1, { message: dynamicRequiredMessage('MARKETING') }),
  marketing_nama: z.string().nullable().optional(),

  keterangan: z
    .string({ message: dynamicRequiredMessage('KETERANGAN') })
    .min(1, { message: dynamicRequiredMessage('KETERANGAN') }),

  schedule_id: z.number().nullable().optional(),
  schedule_nama: z.string().nullable().optional(),

  pelayarancontainer_id: z.number().nullable().optional(),
  pelayarancontainer_nama: z.string().nullable().optional(),

  jenismuatan_id: z
    .number({
      required_error: dynamicRequiredMessage('JENIS MUATAN')
    })
    .min(1, { message: dynamicRequiredMessage('JENIS MUATAN') }),
  jenismuatan_nama: z.string().nullable().optional(),

  sandarkapal_id: z
    .number({
      required_error: dynamicRequiredMessage('SANDAR KAPAL')
    })
    .min(1, { message: dynamicRequiredMessage('SANDAR KAPAL') }),
  sandarkapal_nama: z.string().nullable().optional(),

  tradoluar: z.number().nullable().optional(),
  tradoluar_nama: z.string().nullable().optional(),

  nopolisi: z.string().nullable().optional(),
  nosp: z.string().nullable().optional(),
  nocontainer: z.string().nullable().optional(),
  noseal: z.string().nullable().optional(),

  lokasistuffing: z.number().nullable().optional(),
  lokasistuffing_nama: z.string().nullable().optional(),

  nominalstuffing: z.string().nullable().optional(),

  emkl_id: z.number().nullable().optional(),
  emkllain_nama: z.string().nullable().optional(),

  asalmuatan: z.string().nullable().optional(),

  daftarbl_id: z.number().nullable().optional(),
  daftarbl_nama: z.string().nullable().optional(),

  comodity: z.string().nullable().optional(),
  gandengan: z.string().nullable().optional(),

  pisahbl: z.number().nullable().optional(),
  pisahbl_nama: z.string().nullable().optional(),

  jobptd: z.number().nullable().optional(),
  jobptd_nama: z.string().nullable().optional(),

  transit: z.number().nullable().optional(),
  transit_nama: z.string().nullable().optional(),

  stuffingdepo: z.number().nullable().optional(),
  stuffingdepo_nama: z.string().nullable().optional(),

  opendoor: z.number().nullable().optional(),
  opendoor_nama: z.string().nullable().optional(),

  batalmuat: z.number().nullable().optional(),
  batalmuat_nama: z.string().nullable().optional(),

  soc: z.number().nullable().optional(),
  soc_nama: z.string().nullable().optional(),

  pengurusandoorekspedisilain: z.number().nullable().optional(),
  pengurusandoorekspedisilain_nama: z.string().nullable().optional()
});
export type orderanMuatanInput = z.infer<typeof orderanMuatanSchema>;
