import { IMeta } from './error.type';

export interface IScheduleKapal {
  id: string;
  jenisorder_id: string | null;
  jenisorder_text: string | null | undefined | '';
  keterangan: string | null;
  kapal_id: number | null;
  kapal_text: string | null;
  pelayaran_id: number | null;
  pelayaran_text: string | null;
  tujuankapal_id: number | null;
  tujuankapal_text: string | null;
  asalkapal_id: number | null;
  asalkapal_text: string | null;
  tglberangkat: string | null;
  tgltiba: string | null;
  tglclosing: string | null;
  statusberangkatkapal: string | null;
  statustibakapal: string | null;
  batasmuatankapal: string | null;
  statusaktif: string | null;
  statusaktif_text: string | null;
  modifiedby: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface IAllScheduleKapal {
  data: IScheduleKapal[];
  type: string;
  pagination: IMeta;
}

export const filterSchedulekapal = {
  jenisorder_text: '',
  keterangan: '',
  voyberangkat: '',
  kapal_text: '',
  pelayaran_text: '',
  tujuankapal_text: '',
  asalkapal_text: '',
  tglberangkat: '',
  tgltiba: '',
  tglclosing: '',
  statusberangkatkapal: '',
  statustibakapal: '',
  batasmuatankapal: '',
  text: '',
  modifiedby: '',
  created_at: '',
  updated_at: ''
};
