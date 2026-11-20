import { useMutation, useQuery, useQueryClient } from 'react-query';
import { IErrorResponse } from '../types/user.type';
import { AxiosError } from 'axios';
import {
  deleteDaftarblFn,
  getDaftarblFn,
  storeDaftarblFn,
  updateDaftarblFn
} from '../apis/daftarbl.api';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';

export const useGetDaftarbl = (
  filters: {
    filters?: {
      nama?: string;
      keterangan?: string;
      statusaktif?: string;
      modifiedby?: string;
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
    ['daftarbl', filters],
    async () => await getDaftarblFn(filters, signal),
    {
      // Jangan fetch saat page < 1 (mis. trik setCurrentPage(0) untuk memaksa
      // refetch). Backend menolak page=0 (min 1) → 400. cacheTime:0 tetap
      // menjamin refetch saat page kembali ke nilai valid.
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useCreateDaftarbl = () => {
  const { setError } = useFormError();
  const { alert } = useAlert();

  // Sengaja TIDAK invalidateQueries('daftarbl') di sini. Alur onSuccess di
  // GridDaftarbl sudah otoritatif: ia mengambil window baru dari redis lalu
  // setCurrentPage(pageNumber) yang memicu refetch halaman yang BENAR.
  // invalidateQueries malah me-refetch `currentPage` yang mungkin masih basi
  // (mis. page 10093 pada tabel ~1jt baris) — query offset besar itu lambat,
  // tiba paling akhir, dan menimpa fokus by-id -> baris fokus loncat ke baris 1.
  return useMutation(storeDaftarblFn, {
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        const errorFields = errorResponse.message || [];

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

export const useDeleteDaftarbl = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteDaftarblFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('daftarbl');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        const errorFields = errorResponse.message || [];

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

export const useUpdateDaftarbl = () => {
  const { setError } = useFormError();
  const { alert } = useAlert();

  // Sama seperti create: JANGAN invalidateQueries di sini. onSuccess grid yang
  // mengatur data + fokus. invalidateQueries me-refetch currentPage basi
  // (page besar akibat ~1jt baris) yang lambat & menimpa fokus -> baris 1.
  return useMutation(updateDaftarblFn, {
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        const errorFields = errorResponse.message || [];

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
