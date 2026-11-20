import { GetParams } from '../types/all.type';
import { IAllLogtrail } from '../types/logtrail.type';
import { buildQueryParams } from '../utils';
import { api, api2 } from '../utils/AxiosInstance';
export interface ApiResponse {
  status: boolean;
  type: string;
  data: Record<string, any>[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRows: number;
    pageSize: number;
  };
}
export interface Filter {
  id: string;
  page: number;
  limit: number;
  search: string;
  filters: {
    [key: string]: string;
  };
  sortKey: string;
  sortOrder: 'asc' | 'desc';
}

export const getLogtrailFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllLogtrail> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('/logtrail', {
      params: queryParams,
      signal
    });
    return response.data;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }
    console.error('Error fetching logtrail data:', error);
    throw new Error('Failed to fetch logtrail data');
  }
};
export const getLogtrailHeaderFn = async (
  id: string,
  page: number = 1,
  pageSize: number = 10,
  sortKey: string = 'id',
  sortOrder: 'asc' | 'desc' = 'asc'
) => {
  try {
    // Menggunakan GET request dengan query params
    const response = await api2.get(`/logtrail/${id}/header`, {
      params: { page, pageSize, sortKey, sortOrder }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching logtrail header data:', error);
    throw new Error('Failed to fetch logtrail header data');
  }
};

export const getLogtrailDetailFn = async (
  id: string,
  page: number = 1,
  pageSize: number = 10,
  sortKey: string = 'id',
  sortOrder: 'asc' | 'desc' = 'asc'
) => {
  try {
    // Menggunakan GET request dengan query params
    const response = await api2.get(`/logtrail/${id}/detail`, {
      params: { page, pageSize, sortKey, sortOrder }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching logtrail detail data:', error);
    throw new Error('Failed to fetch logtrail detail data');
  }
};
