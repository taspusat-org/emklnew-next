import { IMeta } from './error.type';

export interface IParameter {
  id: string; // ID unik (primary key)
  grp: string | null; // Grup, bisa null
  subgrp: string | null; // Sub Grup, bisa null
  kelompok: string | null; // Kelompok, bisa null
  text: string | null; // Nama Parameter, bisa null
  memo: Record<string, string> | null; // Memo sebagai JSON object
  type: string | null; // id parameter lain
  type_nama: string | null; // label gabungan parameter yang ditunjuk `type`
  lookuplabel: string | null; // "GRP - SUBGRP - TEXT" baris ini
  default: string | null; // Nilai default, bisa null
  modifiedby: string | null; // Nama pengubah, bisa null
  info: string | null; // Informasi tambahan, bisa null
  created_at: Date; // Tanggal dibuat
  updated_at: Date; // Tanggal diperbarui
}

export interface IAllParameters {
  data: IParameter[]; // Array dari IParameter
  type: string;
  pagination: IMeta;
}
