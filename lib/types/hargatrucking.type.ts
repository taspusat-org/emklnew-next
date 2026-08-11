import { IMeta } from './error.type';

export interface IHargatrucking {
  id: string;

  tarifdetail_id: string; // KALAU ID NYA SUDAH DI INPUT, GABOLEH EDIT DAN HAPUS
  tarifdetail_text: string;

  tujuankapal_id: string;
  tujuankapal_text: string;

  emkl_id: string;
  emkl_text: string;

  keterangan: string;

  container_id: string;
  container_text: string;

  jenisorder_id: string;
  jenisorder_text: string;

  nominal: string;

  statusaktif: string;
  statusaktif_text: string;
  statusaktif_memo: string;

  info?: string;
  created_at: string;
  updated_at: string;
}
export interface IAllHargatrucking {
  data: IHargatrucking[];
  type: string;
  pagination: IMeta;
}
