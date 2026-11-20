import { IMeta } from './error.type';

export interface IShipper {
  id: string; // Primary key (varchar(200))

  statusrelasi?: string; // Statusrelasi (id parameter varchar)
  statusrelasi_text?: string;

  relasi_id?: string; // Relasi (id relasi varchar)
  relasi_id_text?: string;
  nama: string; // Nama (varchar(8000))
  keterangan: string; // Keterangan (varchar(8000))
  contactperson: string; // Contactperson (varchar(100))
  alamat: string; // Alamat (varchar(250))
  coa: string; // Coa (varchar(100))
  coapiutang: string; // Coapiutang (varchar(100))
  coahutang: string; // Coahutang (varchar(100))
  kota: string; // Kota (varchar(50))
  kodepos: string; // Kodepos (varchar(10))
  telp: string; // Telp (varchar(30))
  email: string; // Email (varchar(1000))
  fax: string; // Fax (varchar(30))
  web: string; // Web (varchar(30))
  creditlimit: string; // Creditlimit (numeric(19,2))
  creditterm: string; // Creditterm (integer)
  credittermplus: string; // Credittermplus (integer)
  npwp: string; // Npwp (varchar(30))
  coagiro: string; // Coagiro (varchar(100))
  ppn: string; // Ppn (numeric(19,2))
  titipke: string; // Titipke (varchar(30))
  ppnbatalmuat: string; // Ppnbatalmuat (numeric(19,2))
  grup: string; // Grup (varchar(100))
  formatdeliveryreport: string; // Formatdeliveryreport (integer)
  comodity: string; // Comodity (varchar(100))
  namashippercetak: string; // Namashippercetak (varchar(100))
  formatcetak: string; // Formatcetak (integer)

  marketing_id?: string; // Marketing (id marketing varchar)
  marketing_id_text?: string;
  blok: string; // Blok (varchar(100))
  nomor: string; // Nomor (varchar(100))
  rt: string; // Rt (varchar(100))
  rw: string; // Rw (varchar(100))
  kelurahan: string; // Kelurahan (varchar(100))
  kabupaten: string; // Kabupaten (varchar(100))
  kecamatan: string; // Kecamatan (varchar(100))
  propinsi: string; // Propinsi (varchar(100))
  isdpp10psn: string; // Isdpp10psn (numeric(19,2))
  usertracing: string; // Usertracing (varchar(50))
  passwordtracing: string; // Passwordtracing (varchar(50))
  kodeprospek: string; // Kodeprospek (varchar(50))
  namashipperprospek: string; // Namashipperprospek (varchar(200))
  emaildelay: string; // Emaildelay (varchar(1000))
  keterangan1barisinvoice: string; // Keterangan1barisinvoice (varchar(100))
  nik: string; // Nik (varchar(30))
  namaparaf: string; // Namaparaf (varchar(100))
  saldopiutang: string; // Saldopiutang (numeric(19,2))
  keteranganshipperjobminus: string; // Keteranganshipperjobminus (varchar(500))
  tglemailshipperjobminus: string; // Tglemailshipperjobminus (dd-mm-yyyy)
  tgllahir: string; // Tgllahir (dd-mm-yyyy)

  idshipperasal?: string; // Idshipperasal (id shipper varchar)
  idshipperasal_text?: string;
  initial: string; // Initial (varchar(100))
  tipe: string; // Tipe (varchar(100))
  idtipe: string; // Idtipe (integer)
  idinitial: string; // Idinitial (integer)
  nshipperprospek: string; // Nshipperprospek (varchar(500))

  parentshipper_id?: string; // Parentshipper (id shipper varchar)
  parentshipper_id_text?: string;
  npwpnik: string; // Npwpnik (varchar(16))
  nitku: string; // Nitku (varchar(22))
  kodepajak: string; // Kodepajak (varchar(10))

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
export interface IAllShipper {
  data: IShipper[];
  type: string;
  pagination: IMeta;
}
