import { IMeta } from './error.type';

export interface ILogtrail {
  id: string;
  namatabel: string;
  postingdari: string;
  idtrans: string;
  nobuktitrans: string;
  aksi: string;
  modifiedby: string;
  created_at: string; // Tanggal dalam format ISO string
  updated_at: string; // Tanggal dalam format ISO string
}
export interface IAllLogtrail {
  data: ILogtrail[];
  type: string;
  pagination: IMeta;
}
export const filterLogtrail = {
  id: '', // Filter berdasarkan class
  namatabel: '', // Filter berdasarkan method
  postingdari: '', // Filter berdasarkan nama
  idtrans: '', // Filter berdasarkan nama
  nobuktitrans: '', // Filter berdasarkan nama
  aksi: '', // Filter berdasarkan nama
  modifiedby: '', // Filter berdasarkan nama
  created_at: '', // Filter berdasarkan nama
  updated_at: '' // Filter berdasarkan nama
};
