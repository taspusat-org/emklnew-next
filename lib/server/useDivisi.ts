import { useMutation, useQuery, useQueryClient } from 'react-query';
import { IErrorResponse } from '../types/user.type';
import { AxiosError } from 'axios';
import {
  deleteDivisiFn,
  getDivisiFn,
  storeDivisiFn,
  updateDivisiFn
} from '../apis/divisi.api';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';

export const useGetDivisi = (
  filters: {
    filters?: {
      nama?: string;
      keterangan?: string;
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
    ['divisi', filters],
    async () => await getDivisiFn(filters, signal),
    {
      enabled: !signal?.aborted
    }
  );
};

export const useCreateDivisi = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(storeDivisiFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('divisi');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        // Menangani error berdasarkan path
        const errorFields = errorResponse.message || [];

        // Iterasi error message dan set error di form
        if (Array.isArray(errorFields)) {
          errorFields.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0]; // Ambil path error pertama (misalnya 'nama', 'divisi_id')

            setError(path, err.message); // Update error di context
          });
        }

        // toast({
        //   variant: 'destructive',
        //   title: errorResponse.message ?? 'Gagal',
        //   description: 'Terjadi masalah dengan permintaan Anda'
        // });
      }
    }
  });
};

export const useDeleteDivisi = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();

  return useMutation(deleteDivisiFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('divisi');
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
export const useUpdateDivisi = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();

  return useMutation(updateDivisiFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('divisi');
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
