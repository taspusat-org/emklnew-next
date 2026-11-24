import { IMeta } from './error.type';

export interface ITujuankapal {
  id: string;
  nama: string;
  kode: string;
  cabang_id: string;
  cabang_nama: string;
  keterangan: string;
  text: string;
  statusaktif: string;
  created_at: string;
  updated_at: string;
}
export interface IAllTujuanKapal {
  data: ITujuankapal[];
  type: string;
  pagination: IMeta;
}
export const filterTujuankapal = {
  nama: '',
  kode: '',
  cabang_id: '',
  cabang_nama: '',
  keterangan: '',
  statusaktif: '',
  created_at: '',
  updated_at: '',
  modifiedby: ''
};
