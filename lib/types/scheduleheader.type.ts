import { IMeta } from './error.type';

export interface ScheduleHeader {
  id: string;
  nobukti: string | null;
  tglbukti: string; // Nullable date field
  keterangan: string | null;
  statusformat: string | null;
  info: string | null;
  modifiedby: string | null;
  created_at: string;
  updated_at: string;
}
// id detail dan seluruh FK-nya adalah varchar(200) berisi UUID di database —
// bukan angka. Angka hanya muncul sebagai penanda baris baru (0) dari form.
export interface ScheduleDetail {
  id: number | string;
  schedule_id: string | null;
  nobukti: string;
  pelayaran_id: string | number | null;
  pelayaran_nama: string | null;
  kapal_id: string | number | null;
  kapal_nama: string | null;
  tujuankapal_id: string | number | null;
  tujuankapal_nama: string | null;
  schedulekapal_id?: string | null;
  tglberangkat: string | null; // Nullable date field
  tgltiba: string | null; // Nullable date field
  etb: string | null; // Nullable date field
  eta: string | null; // Nullable date field
  etd: string | null; // Nullable date field
  voyberangkat: string | null;
  voytiba: string | null;
  closing: string | null;
  /** closing dalam format 12 jam (dd-MM-yyyy hh:mm AM) untuk InputDateTimePicker. */
  closingForDateTime?: string | null;
  etatujuan: string | null;
  etdtujuan: string | null;
  keterangan: string | null;
  modifiedby?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: string | number | boolean | null | undefined;
}
export interface IAllScheduleHeader {
  data: ScheduleHeader[];
  pagination: IMeta;
}
export interface IAllScheduleDetail {
  data: ScheduleDetail[];
  pagination: IMeta;
}
export const filterScheduleHeader = {
  nobukti: '',
  tglbukti: '',
  keterangan: '',
  modifiedby: '',
  created_at: '',
  updated_at: '',
  tglDari: '',
  tglSampai: ''
};

export const filterScheduleDetail = {
  nobukti: '',
  pelayaran: '',
  kapal: '',
  tujuankapal: '',
  tglberangkat: '',
  tgltiba: '',
  etb: '',
  eta: '',
  etd: '',
  voyberangkat: '',
  voytiba: '',
  closing: '',
  etatujuan: '',
  etdtujuan: '',
  keterangan: ''
};
