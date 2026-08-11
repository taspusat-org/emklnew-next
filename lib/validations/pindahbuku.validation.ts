import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

export const pindahBukuSchema = z.object({
  // id: z.number().nullable().optional(),
  // Dibuat backend lewat running number, dan resetAddForm tidak mengisinya —
  // tanpa .optional() mode ADD selalu gagal validasi "Required" di field yang
  // memang disabled.
  nobukti: z.string().nullable().optional(),
  tglbukti: z
    .string({ message: dynamicRequiredMessage('TGL BUKTI') })
    .nonempty({ message: dynamicRequiredMessage('TGL BUKTI') }),

  // uuid v7, bukan angka: Number(uuid) = NaN dan validasinya tidak akan pernah
  // lolos. Backend juga menerimanya sebagai string.
  bankdari_id: z
    .string({ message: dynamicRequiredMessage('BANK DARI') })
    .min(1, { message: dynamicRequiredMessage('BANK DARI') }),
  bankdari_nama: z.string().nullable().optional(),

  bankke_id: z
    .string({ message: dynamicRequiredMessage('BANK KE') })
    .min(1, { message: dynamicRequiredMessage('BANK KE') }),
  bankke_nama: z.string().nullable().optional(),

  alatbayar_id: z
    .string({ message: dynamicRequiredMessage('ALAT BAYAR') })
    .min(1, { message: dynamicRequiredMessage('ALAT BAYAR') }),
  alatbayar_nama: z.string().nullable().optional(),

  nowarkat: z.string().nullable().optional(),
  // nowarkat: z
  //   .string({ message: dynamicRequiredMessage('nowarkat') })
  //   .nonempty({ message: dynamicRequiredMessage('nowarkat') }),

  tgljatuhtempo: z
    .string({ message: dynamicRequiredMessage('TGL JATUH TEMPO') })
    .nonempty({ message: dynamicRequiredMessage('TGL JATUH TEMPO') }),

  nominal: z
    .string({ message: dynamicRequiredMessage('NOMINAL') })
    .nonempty({ message: dynamicRequiredMessage('NOMINAL') }),

  keterangan: z
    .string({ message: dynamicRequiredMessage('KETERANGAN') })
    .nonempty({ message: dynamicRequiredMessage('KETERANGAN') })
});
// .refine((data) => {
//

//   if (data.alatbayar_nama === "Other" && !data.alatbayar_nama) {
//     return false; // Validation fails if "Other" is selected but otherReason is empty
//   }
//   return true;
// }, {
//   message: "Please specify the reason when 'Other' is selected.",
//   path: ["otherReason"], // Associate the error with the otherReason field
// });

// const result = pindahBukuSchema.safeParse({ alatbayar_nama: "GIRO" });
//

export type pindahBukuInput = z.infer<typeof pindahBukuSchema>;
