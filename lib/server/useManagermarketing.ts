import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  deleteManagerMarketingFn,
  getManagerMarketingDetailFn,
  getManagerMarketingHeaderFn,
  storeManagerMarketingFn,
  updateManagerMarketingFn
} from '../apis/managermarketingheader.api';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';
import { useDispatch } from 'react-redux';
import { AxiosError } from 'axios';
import { IErrorResponse } from '../types/user.type';
import { useFormError } from '../hooks/formErrorContext';

export const useGetManagerMarketingHeader = (
  filters: {
    filters?: {
      nama?: string;
      keterangan?: string;
      minimalprofit?: string | null;
      statusmentor_text?: string | null;
      statusleader_text?: string | null;
      text?: string | null;
    };
    page?: number;
    sortBy?: string;
    sortDirection?: string;
    limit?: number;
    search?: string; // Kata kunci pencarian
  } = {},
  signal?: AbortSignal
) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useQuery(
    ['managermarketing', filters],
    async () => {
      // Only trigger processing if the page is 1
      if (filters.page === 1) {
        dispatch(setProcessing());
      }

      try {
        const data = await getManagerMarketingHeaderFn(filters, signal);
        return data;
      } catch (error) {
        // Show error toast and dispatch processed
        dispatch(setProcessed());

        throw error;
      } finally {
        // Regardless of success or failure, we dispatch setProcessed after the query finishes
        dispatch(setProcessed());
      }
    },
    {
      enabled: !signal?.aborted,
      onSettled: () => {
        if (filters.page === 1) {
          dispatch(setProcessed());
        }
      }
    }
  );
};
export const useGetManagerMarketingDetail = (id?: string) => {
  return useQuery(
    ['managermarketing', id],
    async () => await getManagerMarketingDetailFn(id!),
    {
      enabled: !!id
    }
  );
};
export const useCreateManagerMarketing = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  return useMutation(storeManagerMarketingFn, {
    // before the mutation fn runs
    onMutate: () => {
      dispatch(setProcessing());
    },
    // on success, invalidate + toast + clear loading
    onSuccess: () => {
      void queryClient.invalidateQueries(['managermarketing']);
      // toast({
      //   title: 'Proses Berhasil',
      //   description: 'Data Berhasil Ditambahkan'
      // });
      dispatch(setProcessed());
    },
    // on error, toast + clear loading
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        const messages = Array.isArray(errorResponse.message)
          ? errorResponse.message
          : [{ path: ['form'], message: errorResponse.message }];

        messages.forEach((err) => {
          const path = Array.isArray(err.path)
            ? err.path.join('.')
            : err.path ?? 'form';

          setError(path, err.message ?? 'Terjadi kesalahan');
        });
      }
    }
    // alternatively: always clear loading, whether success or fail
    // onSettled: () => {
    //   dispatch(clearProcessing());
    // }
  });
};
export const useUpdateManagerMarketing = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();

  return useMutation(updateManagerMarketingFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('managermarketing');
      // toast({
      //   title: 'Proses Berhasil.',
      //   description: 'Data Berhasil Diubah.'
      // });
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        const messages = Array.isArray(errorResponse.message)
          ? errorResponse.message
          : [{ path: ['form'], message: errorResponse.message }];

        messages.forEach((err) => {
          const path = Array.isArray(err.path)
            ? err.path.join('.')
            : err.path ?? 'form';

          setError(path, err.message ?? 'Terjadi kesalahan');
        });
      }
    }
  });
};
export const useDeleteManagerMarketing = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();

  return useMutation(deleteManagerMarketingFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('managermarketing');
      // toast({
      //   title: 'Proses Berhasil.',
      //   description: 'Data Berhasil Dihapus.'
      // });
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
        } else {
        }
      }
    }
  });
};
