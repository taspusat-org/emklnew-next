import { useMutation, useQuery, useQueryClient } from 'react-query';
import { IErrorResponse } from '../types/user.type';
import { AxiosError } from 'axios';
import {
  deleteAsalKapalFn,
  getAsalKapalFn,
  storeAsalKapalFn,
  updateAsalKapalFn
} from '../apis/asalkapal.api';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';

export const useGetAsalKapal = (
  filters: {
    filters?: {
      nominal?: string | number | null | undefined | '';
      keterangan?: string;
      cabang?: string;
      container?: string;
      text?: string;
    };
    page?: number;
    sortBy?: string;
    sortDirection?: string;
    limit?: number;
    search?: string; // Kata kunci pencarian
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['asalkapal', filters],
    async () => await getAsalKapalFn(filters, signal),
    {
      enabled: !signal?.aborted
    }
  );
};

export const useCreateAsalKapal = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(storeAsalKapalFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('asalkapal');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        // Menangani error berdasarkan path
        const errorFields = errorResponse.message || [];

        // Iterasi error message dan set error di form
        if (Array.isArray(errorFields)) {
          errorFields.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0]; // Ambil path error pertama (misalnya 'nama', 'asalkapal_id')

            setError(path, err.message); // Update error di context
          });
        }
      }
    }
  });
};

export const useDeleteAsalKapal = () => {
  const queryClient = useQueryClient();

  return useMutation(deleteAsalKapalFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('asalkapal');
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
export const useUpdateAsalKapal = () => {
  const queryClient = useQueryClient();

  return useMutation(updateAsalKapalFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('asalkapal');
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
