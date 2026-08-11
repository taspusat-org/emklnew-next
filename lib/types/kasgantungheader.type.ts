import { IMeta } from './error.type';

export interface KasGantungHeader {
  id: string;
  nobukti: string;
  tglbukti: string | null; // Nullable date field
  keterangan: string | null;
  bank_id: number | null;
  relasi_id: number | null;
  alatbayar_id: string | null;
  pengeluaran_nobukti: string | null;
  relasi_nama: string | null;
  alatbayar_nama: string | null;
  bank_nama: string | null;
  coakaskeluar: string | null;
  nominal: string | null;
  dibayarke: string | null;
  sisa: string | null;
  nowarkat: string | null;
  tgljatuhtempo: string | null; // Nullable date field
  gantungorderan_nobukti: string | null;
  statusformat: string | null;
  info: string | null;
  modifiedby: string | null;
  editing_by: string | null;
  editing_at: string | null; // Nullable datetime field
  created_at: string;
  updated_at: string;
  // Anchor HTML ke bukti pengeluaran, dirakit di SELECT backend dan dirender
  // lewat JsxParser di kolom pengeluaran_nobukti.
  link: string;
}
export interface KasGantungDetail {
  id: number | string;
  kasgantung_id: string;
  nobukti: string;
  keterangan: string | null;
  nominal: string | null;
  info: string | null;
  modifiedby: string | null;
  editing_by: string | null;
  editing_at: string | null; // Nullable datetime field
  created_at: string;
  updated_at: string;
  pengeluarandetail_id: number;
  link: string;
  [key: string]: string | number | boolean | null | undefined;
}
export interface IAllKasGantungHeader {
  data: KasGantungHeader[];
  pagination: IMeta;
}
export interface IAllKasGantungDetail {
  data: KasGantungDetail[];
  pagination: IMeta;
}
// Semua nilai string kosong (bukan null): `filters` dipakai sebagai state yang
// tiap key-nya diisi teks dari FilterInput, jadi typeof-nya harus string.
export const filterKasGantung = {
  nobukti: '',
  tglbukti: '',
  keterangan: '',
  bank_id: '',
  relasi_nama: '',
  alatbayar_nama: '',
  pengeluaran_nobukti: '',
  coakaskeluar: '',
  dibayarke: '',
  nowarkat: '',
  tgljatuhtempo: '',
  gantungorderan_nobukti: '',
  modifiedby: '',
  created_at: '',
  updated_at: '',
  tglDari: '',
  tglSampai: ''
};

export const filterkasgantungDetail = {
  nobukti: '',
  keterangan: '',
  nominal: '',
  modifiedby: '',
  created_at: '',
  updated_at: ''
};
