import { GetParams } from '../types/all.type';
import { IAllHariLibur, IHariLibur } from '../types/harilibur.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
import { HariliburInput } from '../validations/harilibur.validation';

interface UpdateMenuParams {
  id: string;
  fields: HariliburInput;
}

export const getHariliburFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllHariLibur> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/harilibur', {
      params: queryParams,
      signal
    });
    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching Hari libur:', error);
    throw new Error('Failed to fetch Hari libur');
  }
};
export const deleteHariliburFn = async (id: string): Promise<unknown> => {
  const response = await api2.delete(`/harilibur/${id}`);
  return response.data;
};

export const updateHariliburFn = async ({ id, fields }: UpdateMenuParams) => {
  const response = await api2.put(`/harilibur/update/${id}`, fields);
  return response.data;
};

export const storeHariliburFn = async (fields: HariliburInput) => {
  const response = await api2.post('/harilibur', fields);
  return response.data;
};
export const exportHariliburFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/harilibur/export', {
      params: queryParams,
      responseType: 'blob'
    });

    return response.data;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};
