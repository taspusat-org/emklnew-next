import { IMeta } from './error.type';

export interface IHariLibur {
  id: string;
  tgl: string;
  keterangan: string;
  cabang_id: string;
  cabang_nama: string;
  statusaktif: string;
  text: string;
  modifiedby: number;
  created_at: string;
  updated_at: string;
}
export interface IAllHariLibur {
  data: IHariLibur[];
  pagination: IMeta;
}
export const filterHarilibur = {
  tgl: '',
  keterangan: '',
  statusaktif: '',
  text: '',
  cabang_id: '',
  cabang_nama: '',
  modifiedby: '',
  created_at: '',
  updated_at: ''
};
