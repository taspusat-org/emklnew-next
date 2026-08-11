import { buildQueryParams } from '../utils';
import { GetParams } from '../types/all.type';
import { api2 } from '../utils/AxiosInstance';
import { panjarHeaderInput } from '../validations/panjarheader.validation';
import {
  IAllPanjarBongkaranDetail,
  IAllPanjarHeader,
  IAllPanjarMuatanDetail
} from '../types/panjarheader.type';

interface UpdatePanjarHeaderParams {
  id: string;
  fields: panjarHeaderInput;
}

interface validationFields {
  aksi: string;
  value: number | string;
}

export const getAllPanjarHeaderFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllPanjarHeader> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('panjarheader', {
      params: queryParams,
      signal
    });

    return response.data;
  } catch (error) {
    // Jika error karena abort, jangan log sebagai error
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching Panjar Header data:', error);
    throw new Error('Failed to fetch Panjar Header data');
  }
};

export const getPanjarHeaderByIdFn = async (id: any) => {
  try {
    const response = await api2.get(`/panjarheader/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error to get data Panjar header by id in api fe', error);
    throw new Error('Error to get data Panjar header by id in api fe');
  }
};

export const getPanjarMuatanDetailFn = async (
  id: string,
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllPanjarMuatanDetail> => {
  const queryParams = buildQueryParams(filters);
  const response = await api2.get(`/panjarmuatandetail/${id}`, {
    params: queryParams,
    signal
  });

  return response.data;
};

export const getPanjarBongkaranDetailFn = async (
  id: string,
  filters: GetParams = {}
): Promise<IAllPanjarBongkaranDetail> => {
  const queryParams = buildQueryParams(filters);
  const response = await api2.get(`/panjarbongkarandetail/${id}`, {
    params: queryParams
  });

  return response.data;
};

export const storePanjarHeaderFn = async (fields: panjarHeaderInput) => {
  const response = await api2.post(`/panjarheader`, fields);
  return response.data;
};

export const updatePanjarHeaderFn = async ({
  id,
  fields
}: UpdatePanjarHeaderParams) => {
  const response = await api2.put(`/panjarheader/${id}`, fields);
  return response.data;
};

export const deletePanjarHeaderFn = async (id: string) => {
  try {
    const response = await api2.delete(`panjarheader/${id}`);

    return response;
  } catch (error) {
    console.error('Error deleting panjar header in api fe:', error);
    throw error;
  }
};

export const checkValidationPanjarHeaderFn = async (
  fields: validationFields
) => {
  const response = await api2.post(`/panjarheader/check-validation`, fields);

  return response;
};

export const exportPanjarHeaderFn = async (id: string): Promise<any> => {
  try {
    const response = await api2.get(`/panjarheader/export/${id}`, {
      responseType: 'blob' // Pastikan respon dalam bentuk Blob
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data panjar header:', error);
    throw new Error('Failed to export data panjar header');
  }
};
