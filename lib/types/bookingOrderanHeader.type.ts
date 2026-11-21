import { IMeta } from './error.type';

export interface BookingOrderanMuatan {
  id: string;
  header_id: number;
  nobukti: string;
  orderan_nobukti: string;
  tglbukti: string;
  jenisorder_id: number;
  jenisorder_nama: string | null;
  container_id: number;
  container_nama: string | null;
  shipper_id: number;
  shipper_nama: string | null;
  tujuankapal_id: number;
  tujuankapal_nama: string | null;
  marketing_id: number;
  marketing_nama: string | null;
  keterangan: string;
  schedule_id: number;
  schedule_nama: string | null;
  pelayarancontainer_id: number;
  pelayarancontainer_nama: string | null;
  jenismuatan_id: number;
  jenismuatan_nama: string | null;
  sandarkapal_id: number;
  sandarkapal_nama: string | null;
  nopolisi: string;
  nosp: string;
  nocontainer: string;
  noseal: string;
  lokasistuffing: number;
  lokasistuffing_nama: string;
  nominalstuffing: string;
  emkl_id: number;
  emkllain_nama: string | null;
  asalmuatan: string;
  daftarbl_id: number;
  daftarbl_nama: string | null;
  comodity: string;
  gandengan: string;
  tradoluar: number;
  tradoluar_nama: string;
  pisahbl: number;
  pisahbl_nama: string;
  jobptd: number;
  jobptd_nama: string;
  transit: number;
  transit_nama: string;
  stuffingdepo: number;
  stuffingdepo_nama: string;
  opendoor: number;
  opendoor_nama: string;
  batalmuat: number;
  batalmuat_nama: string;
  soc: number;
  soc_nama: string;
  pengurusandoor: number;
  pengurusandoor_nama: string;
  approval: number;
  approval_nama: string;
  modifiedby: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface IAllBookingOrderanMuatan {
  data: BookingOrderanMuatan[];
  type: string;
  pagination: IMeta;
}

export interface IErrorResponse {
  message: string;
  errors: Record<string, string[]>;
  statusCode: number;
}

export const filterBookingOrderanMuatan = {
  nobukti: '',
  orderan_nobukti: '',
  tglbukti: '',
  jenisorder_text: '',
  container_text: '',
  shipper_text: '',
  tujuankapal_text: '',
  marketing_text: '',
  keterangan: '',
  schedule_text: '',
  pelayarancontainer_text: '',
  jenismuatan_text: '',
  sandarkapal_text: '',
  nopolisi: '',
  nosp: '',
  nocontainer: '',
  noseal: '',
  lokasistuffing_text: '',
  nominalstuffing: '',
  emkllain_text: '',
  asalmuatan: '',
  daftarbl_text: '',
  comodity: '',
  gandengan: '',
  tradoluar_text: '',
  pisahbl_text: '',
  jobptd_text: '',
  transit_text: '',
  stuffingdepo_text: '',
  opendoor_text: '',
  batalmuat_text: '',
  soc_text: '',
  pengurusandoor_text: '',
  approval_text: '',
  modifiedby: '',
  created_at: '',
  updated_at: '',
  tglDari: '',
  tglSampai: '',
  jenisOrderan: ''
};
