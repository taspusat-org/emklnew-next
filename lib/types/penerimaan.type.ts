import { IMeta } from './error.type';

export interface PenerimaanHeader {
  id: string;
  nobukti: string;
  tglbukti: string;
  relasi_id: string | null;
  relasi_text: string | null;
  keterangan: string | null;
  bank_id: string | null;
  bank_text: string | null;
  postingdari: string | null;
  coakasmasuk: string | null;
  coakasmasuk_text: string | null;
  diterimadari: string | null;
  alatbayar_id: string | null;
  alatbayar_text: string | null;
  nowarkat: string | null;
  tgllunas: string | null;
  noresi: string | null;
  statusformat: string | null;
  info: string | null;
  modifiedby: string | null;
  created_at: string;
  updated_at: string;
  link: string | null;
}

export interface PenerimaanDetail {
  id: number | string;
  penerimaan_id: string;
  nobukti: string;
  coa: string;
  coa_text: string | null;
  keterangan: string | null;
  nominal: string | null;
  transaksibiaya_nobukti: string | null;
  transaksilain_nobukti: string | null;
  pengeluaranemklheader_nobukti: string | null;
  penerimaanemklheader_nobukti: string | null;
  pengembaliankasgantung_nobukti: string | null;
  info: string | null;
  modifiedby: string | null;
  created_at: string;
  updated_at: string;
  link: string | null;
  [key: string]: string | number | boolean | null | undefined;
}

export interface IAllPenerimaanHeader {
  data: PenerimaanHeader[];
  type: string;
  pagination: IMeta;
}

export interface IAllPenerimaanDetail {
  data: PenerimaanDetail[];
  type: string;
  pagination: IMeta;
}

export const filterPenerimaan = {
  nobukti: '',
  tglbukti: '',
  relasi_id: null as string | null,
  relasi_text: '',
  keterangan: '',
  bank_id: null as number | string | null,
  bank_text: '',
  postingdari: '',
  coakasmasuk: '',
  coakasmasuk_text: '',
  diterimadari: '',
  alatbayar_id: null as string | null,
  alatbayar_text: '',
  nowarkat: '',
  tgllunas: '',
  noresi: '',
  statusformat: '',
  tglDari: '',
  tglSampai: '',
  modifiedby: '',
  created_at: '',
  updated_at: ''
};

export const filterPenerimaanDetail = {
  nobukti: '',
  coa: '',
  coa_text: '',
  keterangan: '',
  nominal: '',
  transaksibiaya_nobukti: '',
  transaksilain_nobukti: '',
  pengeluaranemklheader_nobukti: '',
  penerimaanemklheader_nobukti: '',
  pengembaliankasgantung_nobukti: '',
  modifiedby: '',
  created_at: '',
  updated_at: ''
};
