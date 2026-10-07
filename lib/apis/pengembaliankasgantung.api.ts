import { GetParams } from '../types/all.type';
import {
  IAllPengembalianKasGantung,
  IAllPengembalianKasGantungDetail
} from '../types/pengembaliankasgantung.type';
import { buildQueryParams } from '../utils';
import { api2 } from '../utils/AxiosInstance';
import { PengembalianKasGantungHeaderInput } from '../validations/pengembaliankasgantung.validation';
import {
  BuktiJobPayload,
  ExportBuktiJobPayload,
  ReportJobResponse
} from './report.api';

interface UpdateParams {
  id: string;
  fields: PengembalianKasGantungHeaderInput;
}
interface validationFields {
  aksi: string;
  value: number | string;
}

export const getPengembalianKasGantungHeaderFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllPengembalianKasGantung> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/pengembaliankasgantungheader', {
      params: queryParams,
      signal
    });

    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error:', error);
    throw new Error('Failed');
  }
};

export const getPengembalianKasGantungHeaderByIdFn = async (
  id: string
): Promise<IAllPengembalianKasGantung> => {
  try {
    const response = await api2.get(`/pengembaliankasgantungheader/${id}`);

    return response.data;
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Failed');
  }
};

export const getPengembalianKasGantungDetailFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllPengembalianKasGantungDetail> => {
  const queryParams = buildQueryParams(filters);

  const response = await api2.get('/pengembaliankasgantungdetail', {
    params: queryParams,
    signal
  });

  return response.data;
};

export const storePengembalianKasGantungFn = async (
  fields: PengembalianKasGantungHeaderInput
) => {
  const response = await api2.post(`/pengembaliankasgantungheader`, fields);

  return response.data;
};

export const updatePengembalianKasGantungFn = async ({
  id,
  fields
}: UpdateParams) => {
  const response = await api2.put(
    `/pengembaliankasgantungheader/${id}`,
    fields
  );
  return response.data;
};

export const deletePengembalianKasGantung = async (id: string) => {
  try {
    const response = await api2.delete(`/pengembaliankasgantungheader/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
};

export const checkValidationPengembalianKasGantungFn = async (
  fields: validationFields
) => {
  const response = await api2.post(
    `/pengembaliankasgantungheader/check-validation`,
    fields
  );
  return response.data;
};

/** Cetak bukti Pengembalian Kas Gantung di background — lihat report.api.ts. */
export const generatePengembalianKasGantungReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post(
    '/pengembaliankasgantungheader/report',
    payload
  );
  return response.data;
};

/** Export Excel satu bukti pengembalian kas gantung + rinciannya (background job). */
export const generatePengembalianKasGantungExportFn = async (
  payload: ExportBuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post(
    '/pengembaliankasgantungheader/export',
    payload
  );
  return response.data;
};
