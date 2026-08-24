import { AxiosError } from 'axios';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';
import {
  filterLabaRugiKalkulasi,
  IErrorResponse
} from '../types/labarugikalkulasi.type';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  deleteLabaRugiKalkulasiFn,
  getLabaRugiKalkulasiFn,
  storeLabaRugiKalkulasiFn,
  updateLabaRugiKalkulasiFn
} from '../apis/labarugikalkulasi.api';

export const useGetLabaRugiKalkulasi = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: Partial<typeof filterLabaRugiKalkulasi>;
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['labarugikalkulasi', filters],
    async () => await getLabaRugiKalkulasiFn(filters, signal),
    {
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useCreateLabaRugiKalkulasi = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(storeLabaRugiKalkulasiFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('labarugikalkulasi');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        const errorFields = Array.isArray(errorResponse.message)
          ? errorResponse.message
          : [];
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

export const useUpdateLabaRugiKalkulasi = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(updateLabaRugiKalkulasiFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('labarugikalkulasi');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        const errorFields = Array.isArray(errorResponse.message)
          ? errorResponse.message
          : [];

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

export const useDeleteLabaRugiKalkulasi = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteLabaRugiKalkulasiFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('labarugikalkulasi');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;
      if (errorResponse !== undefined) {
        alert({
          title: errorResponse.message ?? 'Gagal',
          variant: 'danger',
          submitText: 'OK'
        });
      }
    }
  });
};
