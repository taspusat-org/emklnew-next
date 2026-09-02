import { useQuery } from 'react-query';
import { getScheduleKapalFn } from '../apis/schedulekapal.api';
import { filterSchedulekapal } from '../types/schedulekapal.type';

export const useGetScheduleKapal = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: Partial<typeof filterSchedulekapal>;
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['schedulekapal', filters],
    async () => await getScheduleKapalFn(filters, signal),
    {
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};
