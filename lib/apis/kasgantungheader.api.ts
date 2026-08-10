import { GetParams } from '../types/all.type';
import {
  IAllKasGantungDetail,
  IAllKasGantungHeader
} from '../types/kasgantungheader.type';
import { buildQueryParams } from '../utils';
import { api2 } from '../utils/AxiosInstance';
import { KasGantungHeaderInput } from '../validations/kasgantung.validation';
import {
  BuktiJobPayload,
  ExportJobPayload,
  ReportJobResponse
} from './report.api';
interface UpdateParams {
  id: string;
  fields: KasGantungHeaderInput;
}
interface validationFields {
  aksi: string;
  value: number | string;
}
export const getKasGantungHeaderFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllKasGantungHeader> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/kasgantungheader', {
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

export const getKasGantungHeaderByIdFn = async (
  id: string
): Promise<IAllKasGantungHeader> => {
  try {
    const response = await api2.get(`/kasgantungheader/${id}`);

    return response.data;
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Failed');
  }
};

export const getKasGantungDetailFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllKasGantungDetail> => {
  const queryParams = buildQueryParams(filters);
  const response = await api2.get(`/kasgantungdetail`, {
    params: queryParams,
    signal
  });
  return response.data;
};
export const storeKasGantungFn = async (fields: KasGantungHeaderInput) => {
  const response = await api2.post(`/kasgantungheader`, fields);

  return response.data;
};
export const updateKasGantungFn = async ({ id, fields }: UpdateParams) => {
  const response = await api2.put(`/kasgantungheader/${id}`, fields);
  return response.data;
};
export const getKasgantungListFn = async (dari: string, sampai: string) => {
  try {
    // Construct the URL with query params
    const url = `/kasgantungheader/list?dari=${dari}&sampai=${sampai}`;

    // Using GET request with the full URL
    const response = await api2.get(url);

    return response.data;
  } catch (error) {
    console.error('Error fetching rekap kehadiran:', error);
    throw new Error('Failed to fetch rekap kehadiran');
  }
};
export const getKasgantungPengembalianFn = async (
  id: string,
  dari: string,
  sampai: string
) => {
  try {
    // Construct the URL with query params
    const url = `/kasgantungheader/pengembalian?dari=${dari}&sampai=${sampai}&id=${id}`;

    // Using GET request with the full URL
    const response = await api2.get(url);

    return response.data;
  } catch (error) {
    console.error('Error fetching rekap kehadiran:', error);
    throw new Error('Failed to fetch rekap kehadiran');
  }
};
export const deleteKasGantungFn = async (id: string) => {
  try {
    const response = await api2.delete(`/kasgantungheader/${id}`);
    return response.data; // Optionally return response data if needed
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error; // Re-throw the error if you want to handle it in the calling function
  }
};
export const checkValidationKasGantungFn = async (fields: validationFields) => {
  const response = await api2.post(
    `/kasgantungheader/check-validation`,
    fields
  );
  return response.data;
};
export const exportKasGantungFn = async (
  id: string,
  filters: any
): Promise<Blob> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get(`/kasgantungheader/export/${id}`, {
      params: queryParams,
      responseType: 'blob' // backend return file (Excel)
    });

    return response.data; // ini sudah Blob
  } catch (error) {
    console.error('Error exporting data kas gantung:', error);
    throw new Error('Failed to export data kas gantung');
  }
};
export const generateKasGantungHeaderReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/kasgantungheader/report', payload);
  return response.data;
};
export const generateKasGantungHeaderExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/kasgantungheader/export', payload);
  return response.data;
};
