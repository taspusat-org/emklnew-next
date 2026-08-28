import { useMutation, useQuery, useQueryClient } from 'react-query';
import { IErrorResponse } from '../types/user.type';
import { AxiosError } from 'axios';
import {
  deleteMasterBiayaFn,
  getMasterBiayaFn,
  storeMasterBiayaFn,
  updateMasterBiayaFn
} from '../apis/masterbiaya.api';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';

export const useGetMasterBiaya = (
  filters: {
    filters?: {
      tujuankapal_id?: string;
      tujuankapal_text?: string;

      sandarkapal_id?: string;
      sandarkapal_text?: string;

      pelayaran_id?: string;
      pelayaran_text?: string;

      container_id?: string;
      container_text?: string;

      biayaemkl_id?: string;
      biayaemkl_text?: string;

      jenisorder_id?: string;
      jenisorderan_text?: string;
      tglberlaku?: string;
      nominal?: string;
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
    ['masterbiaya', filters],
    async () => await getMasterBiayaFn(filters, signal),
    {
      enabled: !signal?.aborted
    }
  );
};

export const useCreateMasterBiaya = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(storeMasterBiayaFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('masterbiaya');
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

export const useDeleteMasterBiaya = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();

  return useMutation(deleteMasterBiayaFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('masterbiaya');
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
export const useUpdateMasterBiaya = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();

  return useMutation(updateMasterBiayaFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('masterbiaya');
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
