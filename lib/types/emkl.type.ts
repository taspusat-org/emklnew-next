import { IMeta } from './error.type';

export interface IEmkl {
  id: string; // Primary key (varchar(200))

  statusrelasi?: string; // Statusrelasi (parameter.id varchar)
  statusrelasi_text?: string;

  relasi_id?: string; // Relasi (relasi.id varchar)
  relasi_id_text?: string;
  nama: string; // Nama (text)
  contactperson: string; // Contactperson (varchar(200))
  alamat: string; // Alamat (text)

  coagiro?: string; // Coagiro (akunpusat.coa varchar)
  coagiro_text?: string;

  coapiutang?: string; // Coapiutang (akunpusat.coa varchar)
  coapiutang_text?: string;

  coahutang?: string; // Coahutang (akunpusat.coa varchar)
  coahutang_text?: string;
  kota: string; // Kota (varchar(200))
  kodepos: string; // Kodepos (varchar(100))
  notelp: string; // Notelp (varchar(100))
  email: string; // Email (varchar(200))
  fax: string; // Fax (varchar(100))
  alamatweb: string; // Alamatweb (varchar(200))
  top: string; // Top (numeric(19,2))
  npwp: string; // Npwp (varchar(100))
  namapajak: string; // Namapajak (text)
  alamatpajak: string; // Alamatpajak (text)

  statustrado?: string; // Statustrado (id parameter varchar)
  statustrado_text?: string;
  statustrado_memo?: string;

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
export interface IAllEmkl {
  data: IEmkl[];
  type: string;
  pagination: IMeta;
}
