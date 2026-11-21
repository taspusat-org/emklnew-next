import { GetParams } from '../types/all.type';
import { IAllDaftarbl, IDaftarbl } from '../types/daftarbl.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
import { DaftarblInput } from '../validations/daftarbl.validation';

interface UpdateMenuParams {
  id: string;
  fields: DaftarblInput;
}

export const getDaftarblFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllDaftarbl> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/daftarbl', {
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
export const deleteDaftarblFn = async (id: string): Promise<unknown> => {
  const response = await api2.delete(`/daftarbl/${id}`);
  return response.data;
};

export const updateDaftarblFn = async ({ id, fields }: UpdateMenuParams) => {
  const response = await api2.put(`/daftarbl/update/${id}`, fields);
  return response.data;
};

export const storeDaftarblFn = async (fields: DaftarblInput) => {
  const response = await api2.post('/daftarbl', fields);
  return response.data;
};
export const exportDaftarblFn = async (filters: any): Promise<any> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/daftarbl/export', {
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
