import { GetParams } from '../types/all.type';
import { IAllGandengan, IGandengan } from '../types/gandengan.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
import { GandenganInput } from '../validations/gandengan.validation';

interface UpdateMenuParams {
  id: string;
  fields: GandenganInput;
}

export const getGandenganFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllGandengan> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/gandengan', {
      params: queryParams,
      signal
    });
    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching gandengan:', error);
    throw new Error('Failed to fetch gandengan');
  }
};
export const deleteGandenganFn = async (id: string): Promise<unknown> => {
  const response = await api2.delete(`/gandengan/${id}`);
  return response.data;
};

export const updateGandenganFn = async ({ id, fields }: UpdateMenuParams) => {
  const response = await api2.put(`/gandengan/update/${id}`, fields);
  return response.data;
};

export const storeGandenganFn = async (fields: GandenganInput) => {
  const response = await api2.post('/gandengan', fields);
  return response.data;
};
export const exportGandenganFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/gandengan/export', {
      params: queryParams,
      responseType: 'blob' // Pastikan respon dalam bentuk Blob
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};
