import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  deleteMarketingGroupFn,
  getMarketingGroupFn,
  storeMarketingGroupFn,
  updateMarketingGroupFn
} from '../apis/marketinggroup.api';
import { useFormError } from '../hooks/formErrorContext';
import { AxiosError } from 'axios';
import { IErrorResponse } from '../types/user.type';
import { useAlert } from '../store/client/useAlert';

export const useGetMarketingGroup = (
  filters: {
    filters?: {
      marketing_nama?: string;
      statusaktif_text?: string;
    };
    page?: number;
    sortBy?: string;
    sortDirection?: string;
    limit?: number;
    search?: string;
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['marketinggroups', filters],
    async () => await getMarketingGroupFn(filters, signal),
    {
      enabled: !signal?.aborted
    }
  );
};

export const useCreateMarketingGroup = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(storeMarketingGroupFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('marketinggroups'); //pake s karena sebagai penamaan aja, karena kita pake mutasi, jadi pas crud dan ada data berubah kita ga fetch manual, pake ini aja asal keynya sama
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        // Menangani error berdasarkan path
        const errorFields = errorResponse.message || [];

        if (errorResponse.statusCode === 400 && Array.isArray(errorFields)) {
          // Iterasi error message dan set error di form
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0]; // Ambil path error pertama (misalnya 'nama', 'akuntansi_id')

            setError(path, err.message); // Update error di context
          });
        }
      }
    }
  });
};

export const useDeleteMarketingGroup = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();
  const { setError } = useFormError();

  return useMutation(deleteMarketingGroupFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('marketinggroups');
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
export const useUpdateMarketingGroup = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();

  return useMutation(updateMarketingGroupFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('marketinggroups');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;
      if (errorResponse !== undefined) {
        const errorFields = errorResponse.message || [];
        if (errorResponse.statusCode === 400 && Array.isArray(errorFields)) {
          // Iterasi error message dan set error di form
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0]; // Ambil path error pertama (misalnya 'nama', 'akuntansi_id')

            setError(path, err.message); // Update error di context
          });
        }
      }
    }
  });
};
