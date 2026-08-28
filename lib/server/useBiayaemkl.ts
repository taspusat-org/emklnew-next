import { useMutation, useQuery, useQueryClient } from 'react-query';
import { IErrorResponse } from '../types/user.type';
import { AxiosError } from 'axios';
import {
  deleteBiayaemklFn,
  getBiayaemklFn,
  storeBiayaemklFn,
  updateBiayaemklFn
} from '../apis/biayaemkl.api';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';

export const useGetBiayaemkl = (
  filters: {
    filters?: {
      nama?: string;
      keterangan?: string;
      biaya_text?: string;
      coahut_text?: string;
      jenisorderan_text?: string;
      text?: string;
      created_at?: string;
      updated_at?: string;
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
    ['biayaemkl', filters],
    async () => await getBiayaemklFn(filters, signal),
    {
      enabled: !signal?.aborted
    }
  );
};

export const useCreateBiayaemkl = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(storeBiayaemklFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('biayaemkl');
      // toast({
      //   title: 'Proses Berhasil',
      //   description: 'Data Berhasil Ditambahkan'
      // });
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
          // toast({
          //   variant: 'destructive',
          //   title: errorResponse.message ?? 'Gagal',
          //   description: 'Terjadi masalah dengan permintaan Anda.'
          // });
        }
      }
    }
  });
};

export const useDeleteBiayaemkl = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();

  return useMutation(deleteBiayaemklFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('biayaemkl');
      // toast({
      //   title: 'Proses Berhasil.',
      //   description: 'Data Berhasil Dihapus.'
      // });
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
          // toast({
          //   variant: 'destructive',
          //   title: errorResponse.message ?? 'Gagal',
          //   description: 'Terjadi masalah dengan permintaan Anda.'
          // });
        }
      }
    }
  });
};
export const useUpdateBiayaemkl = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();

  return useMutation(updateBiayaemklFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('biayaemkl');
      // toast({
      //   title: 'Proses Berhasil.',
      //   description: 'Data Berhasil Diubah.'
      // });
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
          // toast({
          //   variant: 'destructive',
          //   title: errorResponse.message ?? 'Gagal',
          //   description: 'Terjadi masalah dengan permintaan Anda.'
          // });
        }
      }
    }
  });
};
