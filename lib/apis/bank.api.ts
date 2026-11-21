import { GetParams } from '../types/all.type';
import { IAllBank, IBank } from '../types/bank.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
import { BankInput } from '../validations/bank.validation';

interface UpdateMenuParams {
  id: string;
  fields: BankInput;
}

export const getBankFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllBank> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/bank', {
      params: queryParams,
      signal
    });
    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching Bank:', error);
    throw new Error('Failed to fetch Bank');
  }
};
export const deleteBankFn = async (id: string): Promise<unknown> => {
  try {
    const response = await api2.delete(`/bank/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
};
export const updateBankFn = async ({ id, fields }: UpdateMenuParams) => {
  const response = await api2.put(`/bank/update/${id}`, fields);
  return response.data;
};

export const storeBankFn = async (fields: BankInput) => {
  const response = await api2.post(`/bank`, fields);
  return response.data;
};

export const exportBankFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/bank/export', {
      params: queryParams,
      responseType: 'blob'
    });

    return response.data;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};
