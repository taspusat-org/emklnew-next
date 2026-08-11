import { buildQueryParams } from '../utils';
import { GetParams } from '../types/all.type';
import { api2 } from '../utils/AxiosInstance';
import { IAllPindahBuku } from '../types/pindahbuku.type';
import { pindahBukuInput } from '../validations/pindahbuku.validation';
import {
  BuktiJobPayload,
  ExportBuktiJobPayload,
  ReportJobResponse
} from './report.api';

interface UpdatePindahBukuParams {
  id: string;
  fields: pindahBukuInput;
}

interface validationFields {
  aksi: string;
  value: number | string;
}

export const getAllPindahBukuFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllPindahBuku> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('pindahbuku', {
      params: queryParams,
      signal
    });

    return response.data;
  } catch (error) {
    // Jika error karena abort, jangan log sebagai error
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching Pindah Buku data:', error);
    throw new Error('Failed to fetch Pindah Buku data');
  }
};

export const getPindahBukuByIdFn = async (
  id: string
): Promise<IAllPindahBuku> => {
  try {
    const response = await api2.get(`/pindahbuku/${id}`);

    return response.data;
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Failed');
  }
};

export const storePindahBukuFn = async (fields: pindahBukuInput) => {
  const response = await api2.post(`/pindahbuku`, fields);

  return response.data;
};

export const updatePindahBukuFn = async ({
  id,
  fields
}: UpdatePindahBukuParams) => {
  const response = await api2.put(`/pindahbuku/${id}`, fields);

  return response.data;
};

export const deletePindahBukuFn = async (id: string) => {
  try {
    const response = await api2.delete(`pindahbuku/${id}`);

    return response;
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
};

export const checkValidationPindahBukuFn = async (fields: validationFields) => {
  const response = await api2.post(`/pindahbuku/check-validation`, fields);

  return response;
};

export const exportPindahBukuFn = async (
  id: string,
  filters: any
): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get(`/pindahbuku/export/${id}`, {
      params: queryParams,
      responseType: 'blob' // Pastikan respon dalam bentuk Blob
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data pindah buku:', error);
    throw new Error('Failed to export data pindah buku');
  }
};
export const generatePindahBukuReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/pindahbuku/report', payload);
  return response.data;
};

// Export per transaksi: satu bukti + rinciannya, bukan daftar grid — payloadnya
// hanya id baris yang dicentang.
export const generatePindahBukuExportFn = async (
  payload: ExportBuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/pindahbuku/export', payload);
  return response.data;
};
