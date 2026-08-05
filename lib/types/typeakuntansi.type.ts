import { IMeta } from './error.type';

export interface ITypeAkuntansi {
  id: string;
  nama: string;
  order: number | null;
  keterangan: string;
  statusaktif: string;
  statusaktif_text: string | null;
  akuntansi_id: string;
  akuntansi_nama: string | null;
  modifiedby: string;
  created_at: string;
  updated_at: string;
}

export interface IAllTypeAkuntansi {
  data: ITypeAkuntansi[];
  pagination: IMeta;
}

export interface IErrorResponse {
  message: string;
  errors: Record<string, string[]>;
  statusCode: number;
}
