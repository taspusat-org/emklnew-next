import { IMeta } from './error.type';

export interface IMenu {
  id: string;
  title: string;
  url: string;
  // aco_id & parentId = id varchar (uuid v7), bukan angka.
  aco_id: string;
  icon: string;
  items: string;
  text: string;
  memo: string | null;
  acos_nama: string | null;
  parent_nama: string | null;
  parentId: string;
  isActive: boolean | number | null;
  statusaktif: string;
  modifiedby: string;
  order: number;
  created_at: string;
  updated_at: string;
}
export interface IAllMenus {
  data: IMenu[];
  pagination: IMeta;
}
