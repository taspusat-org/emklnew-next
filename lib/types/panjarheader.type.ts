import { IMeta } from './error.type';

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
