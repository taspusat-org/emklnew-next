import { useMutation, useQuery, useQueryClient } from 'react-query';
import { IErrorResponse } from '../types/user.type';
import { AxiosError } from 'axios';
import {
  deleteAsuransiFn,
  getAsuransiFn,
  storeAsuransiFn,
  updateAsuransiFn
} from '../apis/asuransi.api';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';
import { filterAsuransi } from '../types/asuransi.type';

export const useGetAsuransi = (
  filters: {
    filters?: Partial<typeof filterAsuransi>;
    page?: number;
    sortBy?: string;
    sortDirection?: string;
    limit?: number;
    search?: string;
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['asuransi', filters],
    async () => await getAsuransiFn(filters, signal),
    {
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useCreateAsuransi = () => {
  const { setError } = useFormError();
  const { alert } = useAlert();

  return useMutation(storeAsuransiFn, {
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        const errorFields = errorResponse.message || [];

        if (errorResponse.statusCode === 400) {
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0];
            setError(path, err.message);
          });
        } else {
          alert({
            title: errorResponse.message ?? 'Gagal',
            variant: 'danger',
            submitText: 'OK'
          });
        }
      }
    }
  });
};

export const useUpdateAsuransi = () => {
  const { setError } = useFormError();
  const { alert } = useAlert();

  return useMutation(updateAsuransiFn, {
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        const errorFields = errorResponse.message || [];

        if (errorResponse.statusCode === 400) {
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0];
            setError(path, err.message);
          });
        } else {
          alert({
            title: errorResponse.message ?? 'Gagal',
            variant: 'danger',
            submitText: 'OK'
          });
        }
      }
    }
  });
};

export const useDeleteAsuransi = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteAsuransiFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('asuransi');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        const errorFields = errorResponse.message || [];

        if (errorResponse.statusCode === 400) {
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0];
            setError(path, err.message);
          });
        } else {
          alert({
            title: errorResponse.message ?? 'Gagal',
            variant: 'danger',
            submitText: 'OK'
          });
        }
      }
    }
  });
};
