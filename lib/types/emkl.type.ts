import { IMeta } from './error.type';
export interface IEmkl {
  id: string;
  nama: string;
  relasi_id: string;
  relasi_text: string;
  contactperson: string;
  alamat: string;
  coagiro: string;
  coagiro_ket: string;
  coapiutang: string;
  coapiutang_ket: string;
  coahutang: string;
  coahutang_ket: string;
  kota: string;
  kodepos: string;
  notelp: string;
  email: string | null;
  fax: string | null;
  alamatweb: string | null;
  top: number | null;
  npwp: string;
  namapajak: string;
  alamatpajak: string;
  statusaktif: string;
  statusaktif_text: string;
  statustrado: string;
  statustrado_text: string;
  modifiedby: string | null;
  created_at: string;
  updated_at: string;
}

export interface IAllEmkl {
  data: IEmkl[];
  type: string;
  pagination: IMeta;
}
