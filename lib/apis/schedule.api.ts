import { GetParams } from '../types/all.type';
import {
  IAllScheduleDetail,
  IAllScheduleHeader
} from '../types/scheduleheader.type';
import { buildQueryParams } from '../utils';
import { api2 } from '../utils/AxiosInstance';
import { ScheduleHeaderInput } from '../validations/schedule.validation';
import {
  BuktiJobPayload,
  ExportBuktiJobPayload,
  ReportJobResponse
} from './report.api';

interface UpdateParams {
  id: string;
  fields: ScheduleHeaderInput;
}

interface validationFields {
  aksi: string;
  value: number | string;
}

export const getScheduleHeaderFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllScheduleHeader> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/schedule-header', {
      params: queryParams,
      signal
    });
    //

    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error to get data all schedule header in api:', error);
    throw new Error('Failed to get data all schedule header in api');
  }
};

export const getScheduleById = async (id: any) => {
  try {
    const response = await api2.get(`/schedule-header/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error to get data schedule by id in api fe', error);
    throw new Error('Error to get data schedule by id in api fe');
  }
};

export const getScheduleDetailFn = async (
  id: string,
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllScheduleDetail> => {
  const queryParams = buildQueryParams(filters);
  const response = await api2.get(`/schedule-detail/${id}`, {
    params: queryParams,
    signal
  });

  return response.data;
};

export const storeScheduleFn = async (fields: ScheduleHeaderInput) => {
  const response = await api2.post(`/schedule-header`, fields);
  return response.data;
};

export const updateScheduleFn = async ({ id, fields }: UpdateParams) => {
  const response = await api2.put(`/schedule-header/${id}`, fields);
  return response.data;
};

export const deleteScheduleFn = async (id: string) => {
  try {
    const response = await api2.delete(`/schedule-header/${id}`);
    return response.data; // Optionally return response data if needed
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error; // Re-throw the error if you want to handle it in the calling function
  }
};

export const checkValidationScheduleFn = async (fields: validationFields) => {
  const response = await api2.post(`/schedule-header/check-validation`, fields);

  return response.data;
};

export const exportScheduleFn = async (
  id: string,
  filters: any
): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get(`/schedule-header/export/${id}`, {
      params: queryParams,
      responseType: 'blob' // Pastikan respon dalam bentuk Blob
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data schedule:', error);
    throw new Error('Failed to export data schedule');
  }
};
// Cetak bukti per transaksi: payloadnya hanya id baris yang dicentang plus
// nama template .mrt-nya.
export const generateScheduleReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/schedule-header/report', payload);
  return response.data;
};

// Export per transaksi: satu bukti + rinciannya, bukan daftar grid — payloadnya
// hanya id baris yang dicentang.
export const generateScheduleExportFn = async (
  payload: ExportBuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/schedule-header/export', payload);
  return response.data;
};
