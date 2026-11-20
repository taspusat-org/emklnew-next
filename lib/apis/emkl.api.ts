import { GetParams } from '../types/all.type';
import { IAllEmkl, IEmkl } from '../types/emkl.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
import { EmklInput } from '../validations/emkl.validation';

interface UpdateMenuParams {
  id: string;
  fields: EmklInput;
}
interface validationFields {
  aksi: string;
  value: number | string;
}
export const getEmklFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllEmkl> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/emkl', {
      params: queryParams,
      signal
    });
    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching Emkl:', error);
    throw new Error('Failed to fetch Emkl');
  }
};
export const deleteEmklFn = async (id: string): Promise<unknown> => {
  const response = await api2.delete(`/emkl/${id}`);
  return response.data;
};

export const updateEmklFn = async ({ id, fields }: UpdateMenuParams) => {
  const response = await api2.put(`/emkl/update/${id}`, fields);
  return response.data;
};

export const storeEmklFn = async (fields: EmklInput) => {
  const response = await api2.post('/emkl', fields);
  return response.data;
};
export const exportEmklFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/emkl/export', {
      params: queryParams,
      responseType: 'blob' // Pastikan respon dalam bentuk Blob
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};
export const checkValidationEmklFn = async (fields: validationFields) => {
  const response = await api2.post(`/emkl/check-validation`, fields);

  return response;
};
