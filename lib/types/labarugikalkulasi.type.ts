import { IMeta } from './error.type';

export interface ILabaRugiKalkulasi {
  id: string;
  periode: string;
  estkomisimarketing: string;
  komisimarketing: string;
  biayakantorpusat: string;
  biayatour: string;
  gajidireksi: string;
  estkomisikacab: string;
  biayabonustriwulan: string;
  estkomisimarketing2: string;
  estkomisikacabcabang1: string;
  estkomisikacabcabang2: string;
  statusfinalkomisimarketing: string;
  statusfinalkomisimarketing_text: string;
  statusfinalbonustriwulan: string;
  statusfinalbonustriwulan_text: string;
  modifiedby: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface IAllLabaRugiKalkulasi {
  data: ILabaRugiKalkulasi[];
  type: string;
  pagination: IMeta;
}

export interface IErrorResponse {
  message: string;
  errors: Record<string, string[]>;
  statusCode: number;
}

export const filterLabaRugiKalkulasi = {
  periode: '',
  estkomisimarketing: '',
  komisimarketing: '',
  biayakantorpusat: '',
  biayatour: '',
  gajidireksi: '',
  estkomisikacab: '',
  biayabonustriwulan: '',
  estkomisimarketing2: '',
  estkomisikacabcabang1: '',
  estkomisikacabcabang2: '',
  statusfinalkomisimarketing_text: '',
  statusfinalbonustriwulan_text: '',
  modifiedby: '',
  created_at: '',
  updated_at: ''
};
