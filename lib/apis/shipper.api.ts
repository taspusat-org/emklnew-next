import { GetParams } from '../types/all.type';
import { IAllShipper, IShipper } from '../types/shipper.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
import { ShipperInput } from '../validations/shipper.validation';

interface UpdateMenuParams {
  id: string;
  fields: ShipperInput;
}

export const getShipperFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllShipper> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/shipper', {
      params: queryParams,
      signal
    });
    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching Shipper :', error);
    throw new Error('Failed to fetch Shipper ');
  }
};
export const deleteShipperFn = async (id: string): Promise<unknown> => {
  const response = await api2.delete(`/shipper/${id}`);
  return response.data;
};

export const updateShipperFn = async ({ id, fields }: UpdateMenuParams) => {
  const response = await api2.put(`/shipper/update/${id}`, fields);
  return response.data;
};

export const storeShipperFn = async (fields: ShipperInput) => {
  const response = await api2.post('/shipper', fields);
  return response.data;
};
export const exportShipperFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/shipper/export', {
      params: queryParams,
      responseType: 'blob' // Pastikan respon dalam bentuk Blob
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};
