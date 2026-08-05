import { AxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  deleteTypeAkuntansiFn,
  getAllTypeAkuntansiFn,
  storeTypeAkuntansiFn,
  updateTypeAkuntansiFn
} from '../apis/typeakuntansi.api';
import { useAlert } from '../store/client/useAlert';
import { IErrorResponse } from '../types/typeakuntansi.type';
import { useFormError } from '../hooks/formErrorContext';

export const useGetAllTypeAkuntansi = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nama?: string;
      order?: number | null | undefined | '';
      keterangan?: string;
      statusaktif_text?: string;
      akuntansi?: string;
      modifiedby?: string;
      created_at?: string;
      updated_at?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['typeakuntansi', filters],
    async () => await getAllTypeAkuntansiFn(filters, signal),
    {
      // Jangan fetch saat page < 1 (mis. trik setCurrentPage(0) untuk memaksa
      // refetch halaman yang sama pada windowed pagination). Backend menolak
      // page=0 (min 1) → 400. cacheTime:0 tetap menjamin refetch saat page
      // kembali ke nilai valid.
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useCreateTypeAkuntansi = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const { alert } = useAlert();

  // Sengaja TIDAK invalidateQueries('typeakuntansi') di sini. Alur onSuccess di
  // GridTypeAkuntansi sudah otoritatif: ia mengambil window baru dari redis lalu
  // setCurrentPage(pageNumber) yang memicu refetch halaman yang BENAR.
  // invalidateQueries malah me-refetch `currentPage` yang mungkin masih basi —
  // hasilnya tiba paling akhir dan menimpa fokus by-id -> baris fokus loncat ke
  // baris 1.
  return useMutation(storeTypeAkuntansiFn, {
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;
      console.log('errorResponse', errorResponse);
      if (errorResponse !== undefined) {
        // Menangani error berdasarkan path

        const errorFields = Array.isArray(errorResponse.message)
          ? errorResponse.message
          : [];
        if (errorResponse.statusCode === 400) {
          // Iterasi error message dan set error di form
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0]; // Ambil path error pertama (misalnya 'nama', 'akuntansi_id')
            console.log('path', path);
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

export const useUpdateTypeAkuntansi = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const { alert } = useAlert();

  // Sama seperti create: JANGAN invalidateQueries di sini. onSuccess grid yang
  // mengatur data + fokus; invalidateQueries me-refetch currentPage basi yang
  // menimpa fokus -> baris 1.
  return useMutation(updateTypeAkuntansiFn, {
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        // Menangani error berdasarkan path
        const errorFields = Array.isArray(errorResponse.message)
          ? errorResponse.message
          : [];

        if (errorResponse.statusCode === 400) {
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

export const useDeleteTypeAkuntansi = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteTypeAkuntansiFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('typeakuntansi');
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
