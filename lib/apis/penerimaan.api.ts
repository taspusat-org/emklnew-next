import { GetParams } from '../types/all.type';
import {
  BuktiJobPayload,
  ExportBuktiJobPayload,
  ReportJobResponse
} from './report.api';
import { api2 } from '../utils/AxiosInstance';
import { buildQueryParams } from '../utils';
import { IAllPenerimaanHeader } from '../types/penerimaan.type';
import { PenerimaanHeaderInput } from '../validations/penerimaan.validation';
import { IAllPenerimaanDetail } from '../types/penerimaan.type';
interface UpdateParams {
  id: string;
  fields: PenerimaanHeaderInput;
}
export const getPenerimaanHeaderFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllPenerimaanHeader> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/penerimaanheader', {
      params: queryParams,
      signal
    });

    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    console.error('Error fetching penerimaan header:', error);
    // Lempar ulang error ASLINYA. Membungkusnya jadi `new Error('...')` membuang
    // error.response — pemanggil kehilangan pesan + statusCode dari backend dan
    // hanya bisa menampilkan teks generik. Berlaku untuk semua fungsi di file ini.
    throw error;
  }
};
export const storePenerimaanFn = async (fields: PenerimaanHeaderInput) => {
  const response = await api2.post(`/penerimaanheader`, fields);

  return response.data;
};
export const getPenerimaanDetailFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllPenerimaanDetail> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/penerimaandetail', {
      params: queryParams,
      signal
    });

    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    console.error('Error fetching penerimaan detail:', error);
    throw error;
  }
};
export const updatePenerimaanFn = async ({ id, fields }: UpdateParams) => {
  const response = await api2.put(`/penerimaanheader/${id}`, fields);
  return response.data;
};
export const deletePenerimaanFn = async (id: string) => {
  try {
    const response = await api2.delete(`/penerimaanheader/${id}`);
    return response.data; // Optionally return response data if needed
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error; // Re-throw the error if you want to handle it in the calling function
  }
};
export const getPenerimaanHeaderByIdFn = async (
  id: string
): Promise<IAllPenerimaanHeader> => {
  try {
    const response = await api2.get(`/penerimaanheader/${id}`);

    return response.data;
  } catch (error) {
    console.error('Error fetching penerimaan header by id:', error);
    throw error;
  }
};
export const exportPenerimaanFn = async (
  id: string,
  filters: any
): Promise<Blob> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get(`/penerimaanheader/export/${id}`, {
      params: queryParams,
      responseType: 'blob' // backend return file (Excel)
    });

    return response.data; // ini sudah Blob
  } catch (error) {
    console.error('Error exporting data penerimaan:', error);
    throw error;
  }
};

/** Cetak bukti Penerimaan di background (balas jobId, progres lewat socket `/report`). */
export const generatePenerimaanHeaderReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/penerimaanheader/report', payload);
  return response.data;
};

/** Export Excel satu bukti penerimaan + rinciannya (background job). */
export const generatePenerimaanHeaderExportFn = async (
  payload: ExportBuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/penerimaanheader/export', payload);
  return response.data;
};
