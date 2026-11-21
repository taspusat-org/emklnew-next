import { IMeta } from './error.type';

export interface IDivisi {
  id: string; // Primary key (varchar(200))
  uuid: string; // Unique identifier
  nama: string; // Nama (nvarchar(max))
  keterangan: string; // Keterangan (nvarchar(max))

  statusaktif?: string; // Status Aktif (id parameter varchar)
  text?: string; // Status Aktif text
  memo?: string; // Memo status aktif (JSON) — dipakai render badge di grid
  statusaktif_uuid?: string;

  info?: string; // Info (nvarchar(max))
  modifiedby?: string; // Modified by (varchar(200))
  created_at: string; // Created at (datetime)
  updated_at: string; // Updated at (datetime)
}
export interface IAllDivisi {
  data: IDivisi[];
  type: string;
  pagination: IMeta;
}
