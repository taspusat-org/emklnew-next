import { useQuery } from 'react-query';
import {
  Filter,
  getLogtrailDetailFn,
  getLogtrailFn,
  getLogtrailHeaderFn
} from '../apis/logtrail.api';
import { filterLogtrail } from '../types/logtrail.type';

export const useGetLogtrail = (
  filters: {
    filters?: Partial<typeof filterLogtrail>;
    page?: number;
    sortBy?: string;
    sortDirection?: string;
    limit?: number;
    search?: string; // Kata kunci pencarian
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['logtrail', filters],
    async () => await getLogtrailFn(filters, signal),
    {
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};
export const useGetLogtrailHeader = (params: Filter) => {
  return useQuery(['logtrail', params], async () => {
    const { id, page, limit, sortKey, sortOrder } = params;
    return await getLogtrailHeaderFn(id, page, limit, sortKey, sortOrder);
  });
};

export const useGetLogtrailDetail = (params: Filter) => {
  return useQuery(['logtrail', params], async () => {
    const { id, page, limit, sortKey, sortOrder } = params;
    return await getLogtrailDetailFn(id, page, limit, sortKey, sortOrder);
  });
};
