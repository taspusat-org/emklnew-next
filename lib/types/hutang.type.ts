import { IMeta } from './error.type';

export interface HutangHeader {
  id: string;
  nobukti: string;
  tglbukti: string;
  tgljatuhtempo: string;
  keterangan: string;
  // relasi_id bertipe text (UUID v7) di DB, bukan angka — hutangHeaderSchema
  // pun sudah mendeklarasikannya z.string(). Sebelumnya tertulis `number`
  // sehingga mengisi form dari baris grid tidak type-safe.
  relasi_id: string;
  relasi_text: string;
  // coa & coa_text dikembalikan view vhutangheader dan dipakai grid (kolom COA)
  // serta saat mengisi form untuk edit. Sebelumnya absen dari tipe sehingga
  // pembacaannya hanya lolos karena kode lama mengaksesnya lewat `any`.
  coa: string | null;
  coa_text: string | null;
  statusformat: string | null;
  link?: string | null;
  info: string | null;
  modifiedby: string | null;
  created_at: string;
  updated_at: string;
}
export interface HutangDetail {
  id: number | string;
  hutang_id: number;
  nobukti: string;
  coa: string;
  coa_text: string;
  keterangan: string;
  nominal: string;
  dpp: string;
  noinvoiceemkl: string;
  tglinvoiceemkl: string;
  nofakturpajakemkl: string;
  info: string | null;
  modifiedby: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: string | number | boolean | null | undefined;
}
export interface IAllHutangHeader {
  data: HutangHeader[];
  type: string;
  pagination: IMeta;
}
export interface IAllHutangDetail {
  data: HutangDetail[];
  type: string;
  pagination: IMeta;
}
export const filterHutang = {
  nobukti: '',
  tglbukti: '',
  tgljatuhtempo: '',
  keterangan: '',
  relasi_id: null,
  relasi_text: '',
  coa: '',
  coa_text: '',
  tglDari: '',
  tglSampai: '',
  modifiedby: '',
  created_at: '',
  updated_at: ''
};

export const filterHutangDetail = {
  nobukti: '',
  coa: '',
  coa_text: '',
  keterangan: '',
  nominal: '',
  dpp: '',
  noinvoiceemkl: '',
  tglinvoiceemkl: '',
  nofakturpajakemkl: '',
  modifiedby: '',
  created_at: '',
  updated_at: ''
};
