import { GetParams } from '../types/all.type';
import { IAllPelayaran, IPelayaran } from '../types/pelayaran.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
import { PelayaranInput } from '../validations/pelayaran.validation';

interface UpdateMenuParams {
  id: string;
  fields: PelayaranInput;
}

export const getPelayaranFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllPelayaran> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/pelayaran', {
      params: queryParams,
      signal
    });
    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching Pelayaran:', error);
    throw new Error('Failed to fetch Pelayaran');
  }
};
export const deletePelayaranFn = async (id: string): Promise<unknown> => {
  const response = await api2.delete(`/pelayaran/${id}`);
  return response.data;
};

export const updatePelayaranFn = async ({ id, fields }: UpdateMenuParams) => {
  const response = await api2.put(`/pelayaran/update/${id}`, fields);
  return response.data;
};

export const storePelayaranFn = async (fields: PelayaranInput) => {
  const response = await api2.post('/pelayaran', fields);
  return response.data;
};
export const exportPelayaranFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/pelayaran/export', {
      params: queryParams,
      responseType: 'blob' // Pastikan respon dalam bentuk Blob
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};
