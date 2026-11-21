import { IMeta } from './error.type';

export interface ShippingInstruction {
  id: string;
  nobukti: string;
  tglbukti: string;
  schedule_id: number;
  voyberangkat: string;
  pelayaran_id: number;
  pelayaran_nama: string;
  kapal_id: number;
  kapal_nama: string;
  tglberangkat: string;
  tujuankapal_id: number;
  tujuankapal_nama: string;
  modifiedby: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ShippingInstructionDetail {
  id: number | string;
  nobukti: string;
  shippinginstructiondetail_nobukti: string;
  shippinginstruction_id: number;
  asalpelabuhan: string;
  keterangan: string;
  consignee: string;
  shipper: string;
  comodity: string;
  notifyparty: string;
  statuspisahbl: string;
  statuspisahbl_nama: string;
  // emkl_id = kolom (sudah di-rename dari emkl_id, bertipe UUID teks).
  // emkllain_nama tetap — itu alias tampilan hasil join ke tabel emkl.
  emkl_id: string;
  emkllain_nama: string;
  containerpelayaran_id: number;
  containerpelayaran_nama: string;
  tujuankapal_id: number;
  tujuankapal_nama: string;
  daftarbl_id: number;
  daftarbl_nama: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface ShippingInstructionDetailRincian {
  id: number | string;
  nobukti: string;
  shippinginstructiondetail_id: string;
  shippinginstructiondetail_nobukti: string;
  orderanmuatan_nobukti: string;
  comodity: string;
  keterangan: string;
  // nocontainer: string;
  // noseal: string;
  // shipper_nama: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface IAllShippingInstruction {
  data: ShippingInstruction[];
  type: string;
  pagination: IMeta;
}

export interface IAllShippingInstructionDetail {
  data: ShippingInstructionDetail[];
  type: string;
  pagination: IMeta;
}

export interface IAllShippingInstructionDetailRincian {
  data: ShippingInstructionDetailRincian[];
  type: string;
  pagination: IMeta;
}

export interface IErrorResponse {
  message: string;
  errors: Record<string, string[]>;
  statusCode: number;
}

export const filterShippingInstruction = {
  nobukti: '',
  tglbukti: '',
  schedule_id: '',
  voyberangkat: '',
  pelayaran_text: '',
  kapal_text: '',
  // closing: '',
  tglberangkat: '',
  tujuankapal_text: '',
  modifiedby: '',
  created_at: '',
  updated_at: '',
  tglDari: '',
  tglSampai: ''
};

export const filterShippingInstructionDetail = {
  nobukti: '',
  tglbukti: '',
  detail_nobukti: '',
  asalpelabuhan: '',
  keterangan: '',
  consignee: '',
  shipper: '',
  comodity: '',
  notifyparty: '',
  statuspisahbl_text: '',
  emkllain_text: '',
  containerpelayaran_text: '',
  tujuankapal_text: '',
  daftarbl_text: ''
};

export const filterShippingInstructionDetailRincian = {
  nobukti: '',
  detail_nobukti: '',
  orderanmuatan_nobukti: '',
  comodity: '',
  keterangan: ''
};
