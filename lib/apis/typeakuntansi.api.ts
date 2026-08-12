import { GetParams } from '../types/all.type';
import { IAllTypeAkuntansi } from '../types/typeakuntansi.type';
import { buildQueryParams } from '../utils';
import { api2 } from '../utils/AxiosInstance';
import { TypeakuntansiInput } from '../validations/typeakuntansi.validation';

interface UpdateTypeAkuntansiParams {
  id: string;
  fields: TypeakuntansiInput;
}

interface validationFields {
  aksi: string;
  value: number | string;
}

export const getAllTypeAkuntansiFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllTypeAkuntansi> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('type-akuntansi', {
      params: queryParams,
      signal
    });

    return response.data;
  } catch (error) {
    // Jika error karena abort, jangan log sebagai error
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching Type Akuntansi data:', error);
    throw new Error('Failed to fetch Type Akuntansi data');
  }
};

export const storeTypeAkuntansiFn = async (fields: TypeakuntansiInput) => {
  const response = await api2.post(`/type-akuntansi`, fields);

  return response.data;
};

export const updateTypeAkuntansiFn = async ({
  id,
  fields
}: UpdateTypeAkuntansiParams) => {
  const response = await api2.put(`/type-akuntansi/${id}`, fields);

  return response.data;
};

export const deleteTypeAkuntansiFn = async (id: string) => {
  try {
    const response = await api2.delete(`type-akuntansi/${id}`);

    return response;
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
};

export const checkValidationTypeAkuntansiFn = async (
  fields: validationFields
) => {
  const response = await api2.post(`/type-akuntansi/check-validation`, fields);

  return response;
};

export const exportTypeAkuntansiFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/type-akuntansi/export', {
      params: queryParams,
      responseType: 'blob' // Pastikan respon dalam bentuk Blob
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data type akuntansi:', error);
    throw new Error('Failed to export data type akuntansi');
  }
};
