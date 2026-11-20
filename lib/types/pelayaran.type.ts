import { IMeta } from './error.type';

export interface IPelayaran {
  id: string; // Primary key (varchar(200))

  relasi_id?: string; // Relasi (id relasi varchar)
  relasi_id_text?: string;
  nama: string; // Nama (text)
  keterangan: string; // Keterangan (text)

  statusaktif?: string; // Statusaktif (id parameter varchar)
  statusaktif_text?: string;
  statusaktif_memo?: string;

  info?: string; // Info (text)
  modifiedby?: string; // Modified by (varchar(200))
  editing_by?: string; // Editing by (varchar(200))
  editing_at?: string; // Editing at (datetime)
  created_at: string; // Created at (datetime)
  updated_at: string; // Updated at (datetime)
}
export interface IAllPelayaran {
  data: IPelayaran[];
  type: string;
  pagination: IMeta;
}
