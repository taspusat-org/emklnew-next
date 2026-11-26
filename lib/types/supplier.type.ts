import { IMeta } from './error.type';

export interface ISupplier {
  id: string; // Primary key (varchar(200))
  nama: string; // Nama (text)
  keterangan: string; // Keterangan (text)
  contactperson: string; // Contactperson (varchar(100))
  ktp: string; // Ktp (varchar(50))
  alamat: string; // Alamat (text)

  coa?: string; // Coa (akunpusat.coa varchar)
  coa_text?: string;

  coagiro?: string; // Coagiro (akunpusat.coa varchar)
  coagiro_text?: string;

  coapiu?: string; // Coapiu (akunpusat.coa varchar)
  coapiu_text?: string;

  coahut?: string; // Coahut (akunpusat.coa varchar)
  coahut_text?: string;
  kota: string; // Kota (varchar(50))
  kodepos: string; // Kodepos (varchar(10))
  telp: string; // Telp (varchar(30))
  email: string; // Email (varchar(50))
  fax: string; // Fax (varchar(30))
  web: string; // Web (varchar(30))
  creditterm: string; // Creditterm (integer)
  credittermplus: string; // Credittermplus (integer)
  npwp: string; // Npwp (varchar(30))
  alamatfakturpajak: string; // Alamatfakturpajak (varchar(500))
  namapajak: string; // Namapajak (varchar(50))
  nominalpph21: string; // Nominalpph21 (numeric(19,2))
  nominalpph23: string; // Nominalpph23 (numeric(19,2))
  noskb: string; // Noskb (varchar(100))
  tglskb: string; // Tglskb (dd-mm-yyyy)
  nosk: string; // Nosk (varchar(100))
  tglsk: string; // Tglsk (dd-mm-yyyy)

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
export interface IAllSupplier {
  data: ISupplier[];
  type: string;
  pagination: IMeta;
}
