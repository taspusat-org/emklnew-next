import { GetParams } from '../types/all.type';
import { IAllDivisi, IDivisi } from '../types/divisi.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
import { DivisiInput } from '../validations/divisi.validation';

interface UpdateMenuParams {
  id: string;
  fields: DivisiInput;
}

export const getDivisiFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllDivisi> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/divisi', {
      params: queryParams,
      signal
    });
    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    // Jangan console.error di sini. AxiosInstance sudah menangani & mencatat
    // network error lalu menampilkan offline overlay; console.error malah
    // memunculkan overlay merah Next.js untuk error yang sudah ditangani.
    // Lempar ulang error aslinya supaya react-query tetap punya konteksnya.
    throw error;
  }
};
export const deleteDivisiFn = async (id: string): Promise<unknown> => {
  const response = await api2.delete(`/divisi/${id}`);
  return response.data;
};

export const updateDivisiFn = async ({ id, fields }: UpdateMenuParams) => {
  const response = await api2.put(`/divisi/update/${id}`, fields);
  return response.data;
};

export const storeDivisiFn = async (fields: DivisiInput) => {
  const response = await api2.post('/divisi', fields);
  return response.data;
};
export const exportDivisiFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/divisi/export', {
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
