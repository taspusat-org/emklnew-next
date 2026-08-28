import { useMutation, useQuery, useQueryClient } from 'react-query';
import { IErrorResponse } from '../types/user.type';
import { AxiosError } from 'axios';
import {
  deleteBankFn,
  getBankFn,
  storeBankFn,
  updateBankFn
} from '../apis/bank.api';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';

export const useGetBank = (
  filters: {
    filters?: {
      nama?: string;
      keterangan?: string;
      keterangancoa?: string;
      keterangancoagantung?: string;
      textbank?: string;
      text?: string;
      formatpenerimaantext?: string;
      formatpenerimaangantungtext?: string;
      formatpengeluarangantungtext?: string;
      formatpencairantext?: string;
      formatrekappenerimaantext?: string;
      formatrekappengeluarantext?: string;
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
    ['bank', filters],
    async () => await getBankFn(filters, signal),
    {
      // Jangan fetch saat page < 1 (trik setCurrentPage(0) untuk paksa refetch
      // saat scroll ke atas). Backend menolak page 0. cacheTime:0 menjamin
      // refetch saat page kembali valid (windowed pagination).
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useCreateBank = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(storeBankFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('bank');
      // toast({
      //   title: 'Proses Berhasil',
      //   description: 'Data Berhasil Ditambahkan'
      // });
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        if (errorResponse.statusCode === 400) {
          // Normalisasi pesan error agar konsisten array

          const messages = Array.isArray(errorResponse.message)
            ? errorResponse.message
            : [{ path: ['form'], message: errorResponse.message }];

          messages.forEach((err) => {
            const path = err.path?.[0] ?? 'form';
            setError(path, err.message);
          });
        } else {
          // toast({
          //   variant: 'destructive',
          //   title: errorResponse.message ?? 'Gagal',
          //   description: 'Terjadi masalah dengan permintaan Anda'
          // });
        }
      }
    }
  });
};

export const useDeleteBank = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();

  return useMutation(deleteBankFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('bank');
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
export const useUpdateBank = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();

  return useMutation(updateBankFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('bank');
      // toast({
      //   title: 'Proses Berhasil.',
      //   description: 'Data Berhasil Diubah.'
      // });
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        if (errorResponse.statusCode === 400) {
          // Normalisasi pesan error agar konsisten array
          const messages = Array.isArray(errorResponse.message)
            ? errorResponse.message
            : [{ path: ['form'], message: errorResponse.message }];

          messages.forEach((err) => {
            const path = err.path?.[0] ?? 'form';
            setError(path, err.message);
          });
        } else {
          // toast({
          //   variant: 'destructive',
          //   title: errorResponse.message ?? 'Gagal',
          //   description: 'Terjadi masalah dengan permintaan Anda'
          // });
        }
      }
    }
  });
};
