import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  deletePengembalianKasGantung,
  getPengembalianKasGantungDetailFn,
  getPengembalianKasGantungHeaderFn,
  storePengembalianKasGantungFn,
  updatePengembalianKasGantungFn
} from '../apis/pengembaliankasgantung.api';
import { useAlert } from '../store/client/useAlert';
import { AxiosError } from 'axios';
import { IErrorResponse } from '../types/user.type';
import { useDispatch } from 'react-redux';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';
import { useFormError } from '../hooks/formErrorContext';

export const useGetPengembalianKasGantung = (
  filters: {
    filters?: {
      nobukti?: string;
      tglbukti?: string;
      keterangan?: string | null;
      relasi_text?: string | null;
      bank_text?: string | null;
      penerimaan_nobukti?: string | null;
      tglDari?: string | null;
      tglSampai?: string | null;
    };
    page?: number;
    sortBy?: string;
    sortDirection?: string;
    limit?: number;
    isreload?: boolean;
    search?: string; // Kata kunci pencarian
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['pengembaliankasgantung', filters],
    async () => await getPengembalianKasGantungHeaderFn(filters, signal),
    {
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useGetPengembalianKasGantungDetail = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      kasgantung_nobukti?: string;
      keterangan?: string | null;
      nominal?: string;
      modifiedby?: string;
      created_at?: string;
      updated_at?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['pengembaliankasgantungdetail', filters],
    async () => await getPengembalianKasGantungDetailFn(filters, signal),
    {
      enabled:
        !!filters.filters?.nobukti &&
        !signal?.aborted &&
        (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useCreatePengembalianKasGantung = () => {
  const dispatch = useDispatch();
  const { alert } = useAlert();
  const { setError } = useFormError();

  // Sengaja TIDAK invalidateQueries('pengembaliankasgantung') di sini. Alur
  // onSuccess di GridPengembalianKasGantung sudah otoritatif: ia mengambil
  // window baru dari redis lalu setCurrentPage(pageNumber) yang memicu refetch
  // halaman yang BENAR. invalidateQueries malah me-refetch `currentPage` yang
  // mungkin masih basi; karena useGetPengembalianKasGantung memakai
  // staleTime/cacheTime 0, refetch itu selalu jalan, tiba paling akhir, dan
  // menimpa baris + fokus hasil onSuccess. Sama seperti useCreateJurnalUmum.
  return useMutation(storePengembalianKasGantungFn, {
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      dispatch(setProcessed());
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;
      if (errorResponse !== undefined) {
        const errorFields = Array.isArray(errorResponse.message)
          ? errorResponse.message
          : [];

        if (errorResponse.statusCode === 400 && Array.isArray(errorFields)) {
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0];
            setError(path, err.message);
          });
        } else {
          alert({
            variant: 'danger',
            submitText: 'OK',
            title: errorResponse.message ?? 'Gagal'
          });
        }
      }
      dispatch(setProcessed());
    }
  });
};

export const useUpdatePengembalianKasGantung = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();
  const { setError } = useFormError();

  // Sama seperti useCreatePengembalianKasGantung: JANGAN invalidateQueries
  // header. onSuccess di grid yang mengatur data + posisi baris.
  return useMutation(updatePengembalianKasGantungFn, {
    // Detail WAJIB di-invalidate: key-nya tidak berubah saat edit (nobukti tetap
    // sama) sehingga tanpa ini grid detail terus menampilkan baris lama walau
    // simpan sukses. Penerimaan & jurnal umum ikut karena keduanya ditulis
    // ulang oleh service pengembalian kas gantung.
    onSuccess: () => {
      void queryClient.invalidateQueries('pengembaliankasgantungdetail');
      void queryClient.invalidateQueries('penerimaandetail');
      void queryClient.invalidateQueries('jurnalumumdetail');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;
      if (errorResponse !== undefined) {
        const errorFields = Array.isArray(errorResponse.message)
          ? errorResponse.message
          : [];

        if (errorResponse.statusCode === 400 && Array.isArray(errorFields)) {
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

export const useDeletePengembalianKasGantung = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deletePengembalianKasGantung, {
    onSuccess: () => {
      void queryClient.invalidateQueries('pengembaliankasgantung');
      void queryClient.invalidateQueries('pengembaliankasgantungdetail');
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
