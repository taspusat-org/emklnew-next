import { IMeta } from './error.type';

export interface BlHeader {
  id: string;
  nobukti: string;
  tglbukti: string;
  shippinginstruction_nobukti: string;
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

export interface BLDetail {
  id: number | string;
  nobukti: string;
  // bl_id bertipe UUID teks di database (mis. '02-019fef22-fa04-...'), BUKAN
  // angka auto-increment lagi. Sempat ditulis `number` sehingga pemanggilnya
  // membungkusnya dengan Number() -> NaN.
  bl_id: string;
  bl_nobukti: string;
  shippinginstructiondetail_nobukti: string;
  keterangan: string;
  noblconecting?: string;

  asalpelabuhan: string;
  consignee: string;
  shipper: string;
  comodity: string;
  notifyparty: string;
  emkllain_nama: string;
  pelayaran_nama: string;
  statuspisahbl_nama: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface BlDetailRincian {
  id: number | string;
  nobukti: string;
  // Sama seperti BLDetail.bl_id: UUID teks, bukan angka. Konvensinya disamakan
  // dengan ShippingInstructionDetailRincian.shippinginstructiondetail_id.
  bldetail_id: string;
  bldetail_nobukti: string;
  orderanmuatan_nobukti: string;
  keterangan: string;
  nocontainer: string;
  noseal: string;
  biayatruckingmuat: string;
  biayadokumenbl: string;
  biayaoperationalpelabuhan: string;
  biayaseal: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface BlRincianBiaya {
  id: number | string;
  nobukti: string;
  bldetail_id: number;
  bldetail_nobukti: number;
  orderanmuatan_nobukti: string;
  nominal: string;
  biayaemkl_id: number;
  biayaemkl_nama: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface IAllBlHeader {
  data: BlHeader[];
  type: string;
  pagination: IMeta;
}

export interface IAllBlDetail {
  data: BLDetail[];
  type: string;
  pagination: IMeta;
}

export interface IAllBlDetailRincian {
  data: BlDetailRincian[];
  type: string;
  pagination: IMeta;
}

export interface IAllBlRincianBiaya {
  data: BlRincianBiaya[];
  type: string;
  pagination: IMeta;
}

export interface IErrorResponse {
  message: string;
  errors: Record<string, string[]>;
  statusCode: number;
}

export const filterBlHeader = {
  nobukti: '',
  tglbukti: '',
  shippinginstruction_nobukti: '',
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

export const filterBlDetail = {
  nobukti: '',
  bl_nobukti: '',
  shippinginstructiondetail_nobukti: '',
  keterangan: '',
  noblconecting: '',

  asalpelabuhan: '',
  consignee: '',
  shipper: '',
  comodity: '',
  notifyparty: '',
  emkllain_text: '',
  pelayaran_text: '',
  statuspisahbl_text: ''
};

export const filterBlDetailRincian = {
  nobukti: '',
  bldetail_nobukti: '',
  orderanmuatan_nobukti: '',
  keterangan: '',
  nocontainer: '',
  noseal: '',
  biayatruckingmuat: '',
  biayadokumenbl: '',
  biayaoperationalpelabuhan: '',
  biayaseal: ''
};

export const filterBlRincianBiaya = {
  nobukti: '',
  bldetail_nobukti: '',
  orderanmuatan_nobukti: '',
  nominal: '',
  biayaemkl_text: ''
};
