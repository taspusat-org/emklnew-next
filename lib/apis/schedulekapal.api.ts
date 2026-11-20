import { GetParams } from '../types/all.type';
import { IAllScheduleKapal } from '../types/schedulekapal.type';
import { buildQueryParams } from '../utils';
import { api2 } from '../utils/AxiosInstance';

export const getScheduleKapalFn = async (
  filters: GetParams = {},
  signal?: AbortSignal
): Promise<IAllScheduleKapal> => {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await api2.get('schedule-kapal', {
      params: queryParams,
      signal
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching Schedule Kapal data:', error);
    throw new Error('Failed to fetch Schedule Kapal data');
  }
};
