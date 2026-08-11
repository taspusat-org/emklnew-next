import { GetParams } from '../types/all.type';
import { IAllParameters } from '../types/parameter.type';
import { buildQueryParams } from '../utils';
import { api2 } from '../utils/AxiosInstance';
import { ParameterInput } from '../validations/parameter.schema';

interface UpdateParameterParams {
  id: string;
  fields: ParameterInput;
}

interface validationFields {
  aksi: string;
  value: number | string;
}

export const getParameterFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllParameters> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/parameter', {
      params: queryParams,
      signal
    });
    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching data', error);
    throw new Error('Failed to fetch data');
  }
};

export const getParameterApprovalFn = async (
  filters: GetParams = {}
): Promise<IAllParameters> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/parameter/approval', {
      params: queryParams
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching data', error);
    throw new Error('Failed to fetch data');
  }
};

export const storeParameterFn = async (fields: ParameterInput) => {
  const response = await api2.post(`/parameter`, fields);

  return response.data;
};

export const updateParameterFn = async ({
  id,
  fields
}: UpdateParameterParams) => {
  const response = await api2.put(`/parameter/update/${id}`, fields);
  return response.data;
};

export const deleteParameterFn = async (id: string) => {
  try {
    const response = await api2.delete(`/parameter/${id}`);
    return response.data; // Optionally return response data if needed
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error; // Re-throw the error if you want to handle it in the calling function
  }
};

export const checkValidationParameterFn = async (fields: validationFields) => {
  const response = await api2.post(`/parameter/check-validation`, fields);

  return response;
};

export const exportParameterBySelectFn = async (ids: { id: string }[]) => {
  try {
    const response = await api2.post('/parameter/export-byselect', ids, {
      responseType: 'blob'
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};

export const reportParameterBySelectFn = async (ids: { id: string }[]) => {
  try {
    // Sending the data in the correct format to the NestJS API
    const response = await api2.post(`/parameter/report-byselect`, ids);

    return response.data; // Assuming the API returns the data properly
  } catch (error) {
    console.error('Error in sending data:', error);
    throw new Error('Failed to send data to the API');
  }
};

export const exportParameterFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/parameter/export', {
      params: queryParams,
      responseType: 'blob' // Pastikan respon dalam bentuk Blob
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};
