import { REQUIRED_FIELD } from '@/constants/validation';
import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

export const roleSchema = z.object({
  rolename: z
    .string()
    .nonempty({ message: dynamicRequiredMessage('NAMA ROLE') }),
  // statusaktif = id parameter (varchar, mis. "02-DBCF9E01-..."), bukan angka.
  statusaktif: z.string().min(1, `${REQUIRED_FIELD}`),
  statusaktif_text: z.string().nullable().optional()
});
export type RoleInput = z.infer<typeof roleSchema>;

export const roleAclSchema = z.object({
  roleId: z.string().min(1, 'Role ID harus diisi'), // roleId adalah varchar UUID, bukan angka
  // aco id juga varchar (uuid v7), sama seperti acl.aco_id & menus.aco_id —
  // BUKAN angka. Dulu field ini z.array(z.number()): setiap id dikonversi
  // Number() menjadi NaN, sehingga simpan ACL diam-diam gagal (NaN ditolak
  // z.number()) atau — bila NaN disaring — terkirim sebagai array kosong yang
  // oleh backend diartikan "hapus semua ACL role ini".
  data: z.array(z.string().min(1, 'ACO ID tidak boleh kosong'))
});

// Type derived from the schema for type-checking
export type RoleAclInput = z.infer<typeof roleAclSchema>;
