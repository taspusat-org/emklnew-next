import { REQUIRED_FIELD } from '@/constants/validation';
import { z } from 'zod';
import { dynamicRequiredMessage } from '../utils';

// Skema menu, menambahkan pengecekan mode
export const menuSchema = (mode: 'add' | 'edit' | 'delete') => {
  const schema = z.object({
    // id, aco_id, dan parentId menyimpan id varchar (uuid v7), BUKAN angka —
    // kolomnya varchar(200) di tabel menus. z.number() menolak id dari LookUp
    // yang berupa string sehingga form tidak pernah lolos validasi (gejala:
    // tombol Save "tidak terjadi apa-apa").
    id: z.string().nullable().optional(),
    title: z.string().nonempty({ message: dynamicRequiredMessage('JUDUL') }),
    aco_id: z.string().nonempty({ message: dynamicRequiredMessage('ACOS') }),
    icon: z.string().nullable().optional(),
    isActive: z.number().default(1),
    parentId: z
      .string()
      .nonempty({ message: dynamicRequiredMessage('MENU PARENT') }),
    order: z.number().nullable().optional(),
    statusaktif: z.string().min(1, `${REQUIRED_FIELD}`),
    statusaktif_nama: z.string().nullable().optional(),
    parent_nama: z.string().nullable().optional(),
    acos_nama: z.string().nullable().optional()
  });
  // Jika mode adalah delete, lewati validasi sama sekali
  if (mode === 'delete') {
    return schema.partial(); // Menggunakan deepPartial untuk membebaskan semua field
  }

  return schema;
};
export type MenuInput = z.infer<ReturnType<typeof menuSchema>>;
