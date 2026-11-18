import { IMeta } from './error.type';

export interface IBank {
  id: string;
  nama: string;
  keterangan: string;

  coa: string | null;
  keterangancoa: string | null;

  coagantung: string | null;
  keterangancoagantung: string | null;

  statusbank: string;
  statusbank_text: string;

  statusaktif: string;
  text: string;

  statusdefault: string;
  statusdefault_text: string;

  formatpenerimaan: number;
  formatpenerimaantext: string;

  formatpengeluaran: number;
  formatpengeluarantext: string;

  formatpenerimaangantung: number;
  formatpenerimaangantungtext: string;

  formatpengeluarangantung: number;
  formatpengeluarangantungtext: string;

  formatpencairan: number;
  formatpencairantext: string;

  formatrekappenerimaan: number;
  formatrekappenerimaantext: string;

  formatrekappengeluaran: number;
  formatrekappengeluarantext: string;

  // info: string;
  // modifiedby: string;

  // memo?: string;
}

export interface IAllBank {
  data: IBank[];
  type: string;
  pagination: IMeta;
}

export const filterBank = {
  nama: '',
  keterangan: '',
  coa: '',
  keterangancoa: '',
  coagantung: '',
  keterangancoagantung: '',
  statusbank: '',
  statusbank_text: '',
  statusaktif: '',
  statusdefault: '',
  statusdefault_text: '',
  formatpenerimaan: '',
  formatpenerimaantext: '',
  formatpengeluaran: '',
  formatpengeluarantext: '',
  formatpenerimaangantung: '',
  formatpenerimaangantungtext: '',
  formatpengeluarangantung: '',
  formatpengeluarangantungtext: '',
  formatpencairan: '',
  formatpencairantext: '',
  formatrekappenerimaan: '',
  formatrekappenerimaantext: '',
  formatrekappengeluaran: '',
  formatrekappengeluarantext: '',
  modifiedby: '',
  created_at: '',
  updated_at: ''
};
