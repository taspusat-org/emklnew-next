import { GetParams } from '../types/all.type';
import { IAllHargatrucking, IHargatrucking } from '../types/hargatrucking.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
import { HargatruckingInput } from '../validations/hargatrucking.validation';

interface UpdateMenuParams {
  id: string;
  fields: HargatruckingInput;
}

export const getHargatruckingFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllHargatrucking> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/hargatrucking', {
      params: queryParams,
      signal
    });

    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching Harga Trucking:', error);
    throw new Error('Failed to fetch Harga Trucking');
  }
};
export const deleteHargatruckingFn = async (id: string) => {
  const response = await api2.delete(`/hargatrucking/${id}`);
  return response.data;
};
export const updateHargatruckingFn = async ({
  id,
  fields
}: UpdateMenuParams) => {
  const response = await api2.put(`/hargatrucking/update/${id}`, fields);
  return response.data;
};
export const storeHargatruckingFn = async (fields: HargatruckingInput) => {
  const response = await api2.post(`/hargatrucking`, fields);
  return response.data;
};
export const exportHargatruckingFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/hargatrucking/export', {
      params: queryParams,
      responseType: 'blob'
    });

    return response.data;
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};
