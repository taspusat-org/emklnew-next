import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useToast } from '@/hooks/use-toast';
import { IErrorResponse } from '../types/user.type';
import { AxiosError } from 'axios';
import {
  deleteAkunpusatFn,
  getAkunpusatFn,
  storeAkunpusatFn,
  updateAkunpusatFn
} from '../apis/akunpusat.api';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';

export const useGetAkunpusat = (
  filters: {
    filters?: {
      coa?: string;
      keterangancoa?: string;
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
    ['akunpusat', filters],
    async () => await getAkunpusatFn(filters, signal),
    {
      enabled: !signal?.aborted
    }
  );
};

export const useCreateAkunpusat = () => {
  const queryClient = useQueryClient();
  const { setError } = useFormError(); // Mengambil setError dari context
  const { toast } = useToast();
  const { alert } = useAlert();

  return useMutation(storeAkunpusatFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('akunpusat');
      toast({
        title: 'Proses Berhasil',
        description: 'Data Berhasil Ditambahkan'
      });
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        // Menangani error berdasarkan path

        const errorFields = Array.isArray(errorResponse.message)
          ? errorResponse.message
          : [];
        if (errorResponse.statusCode === 400 && Array.isArray(errorFields)) {
          // Iterasi error message dan set error di form
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0]; // Ambil path error pertama (misalnya 'nama', 'akuntansi_id')

            setError(path, err.message); // Update error di context
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

export const useDeleteAkunpusat = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { setError } = useFormError();
  const { alert } = useAlert();
  return useMutation(deleteAkunpusatFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('akunpusat');
      toast({
        title: 'Proses Berhasil.',
        description: 'Data Berhasil Dihapus.'
      });
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;
      if (errorResponse !== undefined) {
        const errorFields = errorResponse.message || [];
        if (errorResponse.statusCode === 400 && Array.isArray(errorFields)) {
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0]; // Ambil path error pertama (misalnya 'nama', 'akuntansi_id')

            setError(path, err.message); // Update error di context
          });
        } else {
          alert({
            title:
              errorResponse.message ||
              'Terjadi masalah dengan permintaan Anda.',
            variant: 'danger',
            submitText: 'OK'
          });
        }
      }
    }
  });
};
export const useUpdateAkunpusat = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { setError } = useFormError();
  const { alert } = useAlert();
  return useMutation(updateAkunpusatFn, {
    onSuccess: () => {},
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;
      if (errorResponse !== undefined) {
        const errorFields = errorResponse.message || [];
        if (errorResponse.statusCode === 400 && Array.isArray(errorFields)) {
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0]; // Ambil path error pertama (misalnya 'nama', 'akuntansi_id')

            setError(path, err.message); // Update error di context
          });
        } else {
          alert({
            title:
              errorResponse.message ||
              'Terjadi masalah dengan permintaan Anda.',
            variant: 'danger',
            submitText: 'OK'
          });
        }
      }
    }
  });
};
