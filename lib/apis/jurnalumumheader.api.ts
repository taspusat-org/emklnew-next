import { GetParams } from '../types/all.type';
import {
  IAllJurnalUmumDetail,
  IAllJurnalUmumHeader
} from '../types/jurnalumumheader.type';
import { buildQueryParams } from '../utils';
import { api2 } from '../utils/AxiosInstance';
import { JurnalUmumHeaderInput } from '../validations/jurnalumum.validation';
import {
  BuktiJobPayload,
  ExportJobPayload,
  ReportJobResponse
} from './report.api';
interface UpdateParams {
  id: string;
  fields: JurnalUmumHeaderInput;
}
interface validationFields {
  aksi: string;
  value: number | string;
}
export const getJurnalUmumHeaderFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllJurnalUmumHeader> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/jurnalumumheader', {
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

export const getJurnalUmumDetailFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllJurnalUmumDetail> => {
  const queryParams = buildQueryParams(filters);
  const response = await api2.get(`/jurnalumumdetail`, {
    params: queryParams,
    signal
  });
  return response.data;
};
export const getJurnalUmumHeaderByIdFn = async (
  id: string
): Promise<IAllJurnalUmumHeader> => {
  try {
    const response = await api2.get(`/jurnalumumheader/${id}`);

    return response.data;
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Failed');
  }
};
export const storeJurnalUmumFn = async (fields: JurnalUmumHeaderInput) => {
  const response = await api2.post(`/jurnalumumheader`, fields);

  return response.data;
};
export const updateJurnalUmumFn = async ({ id, fields }: UpdateParams) => {
  const response = await api2.put(`/jurnalumumheader/${id}`, fields);
  return response.data;
};
export const deleteJurnalUmumFn = async (id: string) => {
  try {
    const response = await api2.delete(`/jurnalumumheader/${id}`);
    return response.data; // Optionally return response data if needed
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error; // Re-throw the error if you want to handle it in the calling function
  }
};
export const checkValidationJurnalUmumFn = async (fields: validationFields) => {
  const response = await api2.post(
    `/jurnalumumheader/check-validation`,
    fields
  );
  return response.data;
};
export const exportJurnalUmumFn = async (
  id: string,
  filters: any
): Promise<Blob> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get(`/jurnalumumheader/export/${id}`, {
      params: queryParams,
      responseType: 'blob' // backend return file (Excel)
    });

    return response.data; // ini sudah Blob
  } catch (error) {
    console.error('Error exporting data jurnal umum:', error);
    throw new Error('Failed to export data jurnal umum');
  }
};
export const generateJurnalUmumHeaderReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/jurnalumumheader/report', payload);
  return response.data;
};
export const generateJurnalUmumHeaderExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/jurnalumumheader/export', payload);
  return response.data;
};
