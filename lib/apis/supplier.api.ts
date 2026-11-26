import { GetParams } from '../types/all.type';
import { IAllSupplier, ISupplier } from '../types/supplier.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
import { SupplierInput } from '../validations/supplier.validation';

interface UpdateMenuParams {
  id: string;
  fields: SupplierInput;
}

export const getSupplierFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllSupplier> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/supplier', {
      params: queryParams,
      signal
    });
    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching Supplier:', error);
    throw new Error('Failed to fetch Supplier');
  }
};
export const deleteSupplierFn = async (id: string): Promise<unknown> => {
  const response = await api2.delete(`/supplier/${id}`);
  return response.data;
};

export const updateSupplierFn = async ({ id, fields }: UpdateMenuParams) => {
  const response = await api2.put(`/supplier/update/${id}`, fields);
  return response.data;
};

export const storeSupplierFn = async (fields: SupplierInput) => {
  const response = await api2.post('/supplier', fields);
  return response.data;
};
export const exportSupplierFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/supplier/export', {
      params: queryParams,
      responseType: 'blob' // Pastikan respon dalam bentuk Blob
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};
