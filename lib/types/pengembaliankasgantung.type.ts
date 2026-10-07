import { IMeta } from './error.type';

export interface PengembalianKasGantungHeader {
  id: string;
  nobukti: string;
  tglbukti: string;
  keterangan: string | null;
  bank_id: string | null;
  penerimaan_nobukti: string | null;
  coakasmasuk: string | null;
  relasi_id: string | null;
  alatbayar_id: string | null;
  statusformat: string | null;
  info: string | null;
  modifiedby: string | null;
  created_at: string;
  updated_at: string;
  // Kolom turunan dari vpengembaliankasgantungheader. Akhirannya `_text`
  // (bukan `_nama`) supaya nama kolom, key filter, dan key sort yang dikirim
  // grid sama persis dengan kolom view — lihat sql/views/pengembaliankasgantung.sql.
  relasi_text: string | null;
  bank_text: string | null;
  coakasmasuk_text: string | null;
  alatbayar_text: string | null;
  link: string | null;

  [key: string]: string | number | boolean | null | undefined;
}

export interface IPengembalianKasGantungDetail {
  id: string;
  pengembaliankasgantung_id: string;
  nobukti: string;
  kasgantung_nobukti: string | null;
  kasgantung_keterangan: string | null;
  kasgantung_tglbukti: string | null;
  keterangan: string | null;
  // money/numeric di database; driver mengembalikannya sebagai string.
  nominal: string | null;
  penerimaandetail_id: string | null;
  info: string | null;
  modifiedby: string | null;
  created_at: string;
  updated_at: string;
  link: string;

  [key: string]: string | number | boolean | null | undefined;
}

export interface IAllPengembalianKasGantung {
  data: PengembalianKasGantungHeader[];
  pagination: IMeta;
}
export interface IAllPengembalianKasGantungDetail {
  data: IPengembalianKasGantungDetail[];
  pagination: IMeta;
}

export const filterPengembalianKasGantung = {
  nobukti: '',
  tglbukti: '',
  keterangan: '',
  relasi_text: '',
  bank_text: '',
  coakasmasuk_text: '',
  alatbayar_text: '',
  penerimaan_nobukti: '',
  modifiedby: '',
  created_at: '',
  updated_at: '',
  tglDari: '',
  tglSampai: ''
};

export const filterPengembalianKasGantungDetail = {
  kasgantung_nobukti: '',
  kasgantung_tglbukti: '',
  kasgantung_keterangan: '',
  keterangan: '',
  nominal: '',
  modifiedby: '',
  created_at: '',
  updated_at: ''
};
