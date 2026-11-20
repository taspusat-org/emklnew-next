import { useMutation, useQuery, useQueryClient } from 'react-query';
import { IErrorResponse } from '../types/user.type';
import { AxiosError } from 'axios';
import {
  deleteGroupbiayaextraFn,
  getGroupbiayaextraFn,
  storeGroupbiayaextraFn,
  updateGroupbiayaextraFn
} from '../apis/groupbiayaextra.api';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';

export const useGetGroupbiayaextra = (
  filters: {
    filters?: {
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
    ['groupbiayaextra', filters],
    async () => await getGroupbiayaextraFn(filters, signal),
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

export const useCreateGroupbiayaextra = () => {
  const { setError } = useFormError();
  const { alert } = useAlert();

  // Sengaja TIDAK invalidateQueries('groupbiayaextra') di sini. Alur onSuccess
  // di GridGroupbiayaextra sudah otoritatif: ia mengambil window baru dari redis
  // lalu setCurrentPage(pageNumber) yang memicu refetch halaman yang BENAR.
  // invalidateQueries malah me-refetch `currentPage` yang mungkin masih basi —
  // hasilnya tiba paling akhir dan menimpa fokus by-id -> baris fokus loncat ke
  // baris 1.
  return useMutation(storeGroupbiayaextraFn, {
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

export const useDeleteGroupbiayaextra = () => {
  const { setError } = useFormError();
  const { alert } = useAlert();
  const queryClient = useQueryClient();

  return useMutation(deleteGroupbiayaextraFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('groupbiayaextra');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;
      if (errorResponse === undefined) return;

      // 400 dari zod: message berupa array issue -> dipetakan ke field form.
      if (
        errorResponse.statusCode === 400 &&
        Array.isArray(errorResponse.message)
      ) {
        errorResponse.message.forEach(
          (err: { path: string[]; message: string }) => {
            setError(err.path[0], err.message);
          }
        );
        return;
      }

      // 404 (data sudah tidak ada) & 409 (masih dipakai transaksi) memulangkan
      // message berupa string. Tanpa cabang ini penolakan server tidak terlihat
      // sama sekali di UI — baris hanya "tidak terhapus" tanpa penjelasan.
      alert({
        title: String(errorResponse.message ?? 'Gagal menghapus data'),
        variant: 'danger',
        submitText: 'OK'
      });
    }
  });
};
export const useUpdateGroupbiayaextra = () => {
  const { setError } = useFormError();

  // Sama seperti create: JANGAN invalidateQueries di sini. onSuccess grid yang
  // mengatur data + fokus; invalidateQueries me-refetch currentPage basi yang
  // menimpa fokus -> baris 1.
  return useMutation(updateGroupbiayaextraFn, {
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
