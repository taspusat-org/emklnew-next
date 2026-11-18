import { GetParams } from '../types/all.type';
import { IAllJabatan, IJabatan } from '../types/jabatan.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
import { JabatanInput } from '../validations/jabatan.validation';

interface UpdateMenuParams {
  id: string;
  fields: JabatanInput;
}

export const getJabatanFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllJabatan> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/jabatan', {
      params: queryParams,
      signal
    });
    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching Jabatan:', error);
    throw new Error('Failed to fetch Jabatan');
  }
};
export const deleteJabatanFn = async (id: string): Promise<unknown> => {
  const response = await api2.delete(`/jabatan/${id}`);
  return response.data;
};

export const updateJabatanFn = async ({ id, fields }: UpdateMenuParams) => {
  const response = await api2.put(`/jabatan/update/${id}`, fields);
  return response.data;
};

export const storeJabatanFn = async (fields: JabatanInput) => {
  const response = await api2.post('/jabatan', fields);
  return response.data;
};
export const exportJabatanFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/jabatan/export', {
      params: queryParams,
      responseType: 'blob' // Pastikan respon dalam bentuk Blob
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};
