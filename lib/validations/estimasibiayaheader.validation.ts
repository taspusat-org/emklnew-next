import { nullable, z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

export const estimasiBiayaDetailInvoiceSchema = z.object({
  id: z.string().optional(),
  nobukti: z.string().nullable().optional(),
  estimasibiaya_id: z.string().nullable().optional(),

  link_id: z.string().nullable().optional(),
  linkdetailinvoice_nama: z.string().nullable().optional(),

  biayaemkl_id: z.string().nullable().optional(),
  biayaemkldetailinvoice_nama: z.string().nullable().optional(),

  nominal: z.string().nullable().optional()
});
export type estimasiBiayaDetailInvoiceInput = z.infer<
  typeof estimasiBiayaDetailInvoiceSchema
>;

export const estimasiBiayaDetailBiayaSchema = z.object({
  id: z.string().optional(),
  nobukti: z.string().nullable().optional(),
  estimasibiaya_id: z.string().nullable().optional(),

  link_id: z.string().nullable().optional(),
  link_nama: z.string().nullable().optional(),

  biayaemkl_id: z.string().nullable().optional(),
  biayaemkl_nama: z.string().nullable().optional(),

  nominal: z.string().nullable().optional(),
  nilaiasuransi: z.string().nullable().optional(),
  nominaldisc: z.string().nullable().optional(),
  nominalsebelumdisc: z.string().nullable().optional(),
  nominaltradoluar: z.string().nullable().optional()
});
export type estimasiBiayaDetailBiayaInput = z.infer<
  typeof estimasiBiayaDetailBiayaSchema
>;

export const estimasiBiayaHeaderSchema = z.object({
  id: z.string().optional(),
  nobukti: z.string().nullable().optional(),

  tglbukti: z
    .string({ message: dynamicRequiredMessage('TGL BUKTI') })
    .nonempty({ message: dynamicRequiredMessage('TGL BUKTI') }),

  jenisorder_id: z
    .string({
      required_error: dynamicRequiredMessage('JENIS ORDER')
    })
    .min(1, { message: dynamicRequiredMessage('JENIS ORDER') }),
  jenisorder_nama: z.string().nullable().optional(),

  orderan_id: z.string().nullable().optional(),
  orderan_nobukti: z
    .string({ message: dynamicRequiredMessage('NO BUKTI ORDERAN') })
    .nonempty({ message: dynamicRequiredMessage('NO BUKTI ORDERAN') }),

  nominal: z
    .string({ message: dynamicRequiredMessage('NOMINAL') })
    .nonempty({ message: dynamicRequiredMessage('NOMINAL') }),

  shipper_id: z
    .string({
      required_error: dynamicRequiredMessage('SHIPPER')
    })
    .min(1, { message: dynamicRequiredMessage('SHIPPER') }),
  shipper_nama: z.string().nullable().optional(),

  statusppn: z
    .string()
    .min(1, { message: dynamicRequiredMessage('STATUS PPN') }),
  statusppn_nama: z.string().nullable().optional(),

  asuransi_id: z
    .string({
      required_error: dynamicRequiredMessage('ASURANSI')
    })
    .min(1, { message: dynamicRequiredMessage('ASURANSI') }),
  asuransi_nama: z.string().nullable().optional(),

  comodity_id: z.string().nullable().optional(),
  comodity_nama: z.string().nullable().optional(),

  consignee_id: z.string().nullable().optional(),
  consignee_nama: z.string().nullable().optional(),

  detailsbiaya: z.array(estimasiBiayaDetailBiayaSchema).min(1),
  detailsinvoice: z.array(estimasiBiayaDetailInvoiceSchema).min(1)
});

export type estimasiBiayaHeaderInput = z.infer<
  typeof estimasiBiayaHeaderSchema
>;
