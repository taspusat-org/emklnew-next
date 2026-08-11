import { IMeta } from './error.type';

/**
 * Semua id/FK panjar sudah bertipe TEXT (uuid v7) di database — bukan integer
 * lagi. Menyimpannya sebagai `number` di sini membuat TS diam-diam mengizinkan
 * perbandingan/penulisan yang salah (mis. id lookup di-uppercase atau dikirim
 * sebagai angka), jadi tipenya dikunci ke string.
 */
export interface PanjarHeader {
  id: string;
  nobukti: string;
  tglbukti: string;
  jenisorder_id: string;
  jenisorder_nama: string;
  biayaemkl_id: string;
  biayaemkl_nama: string;
  keterangan: string;
  modifiedby: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PanjarMuatanDetail {
  id: string;
  panjar_id: string;
  nobukti: string;
  orderanmuatan_nobukti: string;
  estimasi: string;
  nominal: string;
  keterangan: string;
  modifiedby?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Dipertahankan untuk GridPanjaranBongkaranDetail yang belum dibuang. CATATAN:
 * database hanya punya satu tabel detail (`panjarmuatandetail`) dan
 * PanjarheaderService menulis SEMUA jenis orderan ke sana, jadi tidak ada
 * endpoint `/panjarbongkarandetail`. page.tsx sudah tidak lagi merender grid
 * itu — lihat catatan di sana.
 */
export interface PanjarBongkaranDetail {
  id: string;
  nobukti: string;
  keterangan: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface IAllPanjarHeader {
  data: PanjarHeader[];
  type: string;
  total: number;
  pagination: IMeta;
}

export interface IAllPanjarMuatanDetail {
  data: PanjarMuatanDetail[];
  type: string;
  total: number;
  pagination: IMeta;
}

/**
 * Default filter grid header. tglDari/tglSampai/jenisOrderan BUKAN kolom grid —
 * ketiganya dipakai backend untuk mempersempit view lewat session context
 * (lihat create-vpanjar-pg.sql), jadi tetap ikut dikirim tapi tidak pernah jadi
 * filter kolom.
 */
export const filterPanjarHeader = {
  nobukti: '',
  tglbukti: '',
  jenisorder_text: '',
  biayaemkl_text: '',
  keterangan: '',
  modifiedby: '',
  created_at: '',
  updated_at: '',
  tglDari: '',
  tglSampai: '',
  jenisOrderan: ''
};

export const filterPanjarMuatanDetail = {
  nobukti: '',
  orderanmuatan_nobukti: '',
  estimasi: '',
  nominal: '',
  keterangan: ''
};

export interface IAllPanjarBongkaranDetail {
  data: PanjarBongkaranDetail[];
  type: string;
  pagination: IMeta;
}

export const filterPanjarBongkaranDetail = {
  nobukti: '',
  keterangan: ''
};
