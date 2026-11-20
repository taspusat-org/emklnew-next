import { IMeta } from './error.type';

export interface IJabatan {
  id: string; // Primary key (varchar(200))
  nama: string; // Nama (varchar(100))
  keterangan: string; // Keterangan (text)

  statusaktif?: string; // Status Aktif (id parameter varchar)
  statusaktif_text?: string;
  statusaktif_memo?: string;

  divisi_id?: string; // Divisi (id divisi varchar)
  divisi_id_text?: string;

  info?: string; // Info (text)
  modifiedby?: string; // Modified by (varchar(200))
  editing_by?: string; // Editing by (varchar(200))
  editing_at?: string; // Editing at (datetime)
  created_at: string; // Created at (datetime)
  updated_at: string; // Updated at (datetime)
}
export interface IAllJabatan {
  data: IJabatan[];
  type: string;
  pagination: IMeta;
}
