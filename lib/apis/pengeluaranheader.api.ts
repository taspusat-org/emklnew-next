import { GetParams } from '../types/all.type';
import {
  IAllPengeluaranDetail,
  IAllPengeluaranHeader
} from '../types/pengeluaran.type';
import { buildQueryParams } from '../utils';
import { api2 } from '../utils/AxiosInstance';
import { PengeluaranHeaderInput } from '../validations/pengeluaran.validation';
interface UpdateParams {
  id: string;
  fields: PengeluaranHeaderInput;
}
export const getPengeluaranHeaderFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllPengeluaranHeader> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/pengeluaranheader', {
      params: queryParams,
      signal
    });

    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    console.error('Error fetching pengeluaran header:', error);
    // Lempar ulang error ASLINYA. Membungkusnya jadi `new Error('...')` membuang
    // error.response — pemanggil kehilangan pesan + statusCode dari backend dan
    // hanya bisa menampilkan teks generik. Berlaku untuk semua fungsi di file ini.
    throw error;
  }
};

export const getPengeluaranHeaderByIdFn = async (
  id: string
): Promise<IAllPengeluaranHeader> => {
  try {
    const response = await api2.get(`/pengeluaranheader/${id}`);

    return response.data;
  } catch (error) {
    console.error('Error fetching pengeluaran header by id:', error);
    throw error;
  }
};

export const getPengeluaranDetailFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllPengeluaranDetail> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get('/pengeluarandetail', {
      params: queryParams,
      signal
    });

    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    console.error('Error fetching pengeluaran detail:', error);
    throw error;
  }
};
export const storePengeluaranFn = async (fields: PengeluaranHeaderInput) => {
  const response = await api2.post(`/pengeluaranheader`, fields);

  return response.data;
};
export const updatePengeluaranFn = async ({ id, fields }: UpdateParams) => {
  const response = await api2.put(`/pengeluaranheader/${id}`, fields);
  return response.data;
};
export const getPengeluaranListFn = async (dari: string, sampai: string) => {
  try {
    // Construct the URL with query params
    const url = `/pengeluaranheader/list?dari=${dari}&sampai=${sampai}`;

    // Using GET request with the full URL
    const response = await api2.get(url);

    return response.data;
  } catch (error) {
    console.error('Error fetching daftar pengeluaran:', error);
    throw error;
  }
};
export const getPengeluaranFn = async (
  id: string,
  dari: string,
  sampai: string
) => {
  try {
    // Construct the URL with query params
    const url = `/pengeluaranheader/pengembalian?dari=${dari}&sampai=${sampai}&id=${id}`;

    // Using GET request with the full URL
    const response = await api2.get(url);

    return response.data;
  } catch (error) {
    console.error('Error fetching pengembalian pengeluaran:', error);
    throw error;
  }
};
export const deletePengeluaranFn = async (id: string) => {
  try {
    const response = await api2.delete(`/pengeluaranheader/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting pengeluaran:', error);
    throw error;
  }
};
export const exportPengeluaranFn = async (
  id: string,
  filters: any
): Promise<Blob> => {
  try {
    const queryParams = buildQueryParams(filters);

    const response = await api2.get(`/pengeluaranheader/export/${id}`, {
      params: queryParams,
      responseType: 'blob' // backend return file (Excel)
    });

    return response.data; // ini sudah Blob
  } catch (error) {
    console.error('Error exporting data pengeluaran:', error);
    throw error;
  }
};
