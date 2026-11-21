import { GetParams } from '../types/all.type';
import { IAllTujuanKapal, ITujuankapal } from '../types/tujuankapal.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
import { TujuankapalInput } from '../validations/tujuankapal.validation';

interface UpdateMenuParams {
  id: string;
  fields: TujuankapalInput;
}

export const getTujuankapalFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllTujuanKapal> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/tujuankapal', {
      params: queryParams,
      signal
    });

    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching Akun Pusat:', error);
    throw new Error('Failed to fetch Akun Pusat');
  }
};
export const deleteTujuankapalFn = async (id: string) => {
  const response = await api2.delete(`/tujuankapal/${id}`);
  return response.data;
};

export const updateTujuankapalFn = async ({ id, fields }: UpdateMenuParams) => {
  const response = await api2.put(`/tujuankapal/update/${id}`, fields);
  return response.data;
};

export const storeTujuankapalFn = async (fields: TujuankapalInput) => {
  const response = await api2.post(`/tujuankapal`, fields);
  return response.data;
};

export const exportTujuankapalFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/tujuankapal/export', {
      params: queryParams,
      responseType: 'blob'
    });

    return response.data;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};
