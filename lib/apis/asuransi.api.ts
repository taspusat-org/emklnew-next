import { GetParams } from '../types/all.type';
import { IAllAsuransi, IAsuransi } from '../types/asuransi.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
import { AsuransiInput } from '../validations/asuransi.validation';

interface UpdateMenuParams {
  id: string;
  fields: AsuransiInput;
}

export const getAsuransiFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllAsuransi> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/asuransi', {
      params: queryParams,
      signal
    });
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('Data:', response.data); // Ini yang harusnya JSON tapi malah HTML
    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching Asuransi:', error);
    throw new Error('Failed to fetch Asuransi');
  }
};
export const deleteAsuransiFn = async (id: string): Promise<unknown> => {
  const response = await api2.delete(`/asuransi/${id}`);
  return response.data;
};

export const updateAsuransiFn = async ({ id, fields }: UpdateMenuParams) => {
  const response = await api2.put(`/asuransi/update/${id}`, fields);
  return response.data;
};

export const storeAsuransiFn = async (fields: AsuransiInput) => {
  const response = await api2.post('/asuransi', fields);
  return response.data;
};
export const exportAsuransiFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/asuransi/export', {
      params: queryParams,
      responseType: 'blob' // Pastikan respon dalam bentuk Blob
    });

    return response.data; // Return the Blob file from response
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new Error('Failed to export data');
  }
};
// Correctly typed 'ids' and sending proper data format to the NestJS API
// export const reportMenuBySelectFn = async (ids: { id: number }[]) => {
//   try {
//     // Sending the data in the correct format to the NestJS API
//     const response = await api2.post(`/menu/report-byselect`, ids);

//     return response.data; // Assuming the API returns the data properly
//   } catch (error) {
//     console.error('Error in sending data:', error);
//     throw new Error('Failed to send data to the API');
//   }
// };

// export const exportMenuBySelectFn = async (ids: { id: number }[]) => {
//   try {
//     const response = await api2.post('/menu/export-byselect', ids, {
//       responseType: 'blob'
//     });

//     return response.data; // Return the Blob file from response
//   } catch (error) {
//     console.error('Error exporting data:', error);
//     throw new Error('Failed to export data');
//   }
// };

// export const updateMenuResequenceFn = async (data: any) => {
//   await api2.put(`/menu/update-resequence`, data);
// };
