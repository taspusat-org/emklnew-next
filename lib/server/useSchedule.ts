import { useDispatch } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  deleteScheduleFn,
  getScheduleDetailFn,
  getScheduleHeaderFn,
  storeScheduleFn,
  updateScheduleFn
} from '../apis/schedule.api';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';
import { AxiosError } from 'axios';
import { IErrorResponse } from '../types/user.type';
import { useFormError } from '../hooks/formErrorContext';
import { useAlert } from '../store/client/useAlert';

export const useGetScheduleHeader = (
  filters: {
    filters?: {
      nobukti?: string;
      tglbukti?: string;
      keterangan?: string | null;
      modifiedby?: string;
      created_at?: string;
      updated_at?: string;
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
    ['schedule', filters],
    async () => await getScheduleHeaderFn(filters, signal),
    {
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useGetScheduleDetail = (
  id?: string,
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      pelayaran?: string;
      kapal?: string;
      tujuankapal?: string;
      tglberangkat?: string;
      tgltiba?: string;
      etb?: string;
      eta?: string;
      etd?: string;
      voyberangkat?: string;
      voytiba?: string;
      closing?: string;
      etatujuan?: string;
      etdtujuan?: string;
      keterangan?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['scheduledetail', id, filters],
    async () => await getScheduleDetailFn(id!, filters, signal),
    {
      // page < 1 = fase antara dari trik setCurrentPage(0) di grid detail;
      // query-nya sengaja tidak dijalankan supaya `data` tetap milik halaman
      // lama sampai halaman tujuan di-set.
      enabled: !!id && !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useCreateSchedule = () => {
  const dispatch = useDispatch();
  const { alert } = useAlert();
  const { setError } = useFormError();

  // Sengaja TIDAK invalidateQueries('schedule') di sini. Alur onSuccess di
  // GridScheduleHeader sudah otoritatif: ia mengambil window baru dari redis
  // lalu setCurrentPage(pageNumber) yang memicu refetch halaman yang BENAR.
  // invalidateQueries malah me-refetch `currentPage` yang mungkin masih basi;
  // karena useGetScheduleHeader memakai staleTime/cacheTime 0, refetch itu
  // selalu jalan, tiba paling akhir, dan menimpa baris + fokus hasil onSuccess.
  return useMutation(storeScheduleFn, {
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
      dispatch(setProcessed());
    }
  });
};

export const useUpdateSchedule = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { alert } = useAlert();
  const { setError } = useFormError();

  // Sama seperti useCreateSchedule: JANGAN invalidateQueries('schedule').
  // onSuccess di GridScheduleHeader yang mengatur data + posisi baris; refetch
  // dari invalidate mendarat belakangan dan menimpa fokus tersebut (gejala
  // "setelah update grid balik ke baris 1").
  return useMutation(updateScheduleFn, {
    onMutate: () => {
      dispatch(setProcessing());
    },
    // Detail lain ceritanya: key-nya ['scheduledetail', id, ...] dan id header
    // tidak berubah saat edit, jadi tanpa invalidate grid detail terus
    // menampilkan baris lama sampai halaman di-reload.
    onSuccess: () => {
      void queryClient.invalidateQueries('scheduledetail');
      dispatch(setProcessed());
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;
      if (errorResponse !== undefined) {
        const errorFields = Array.isArray(errorResponse.message)
          ? errorResponse.message
          : [];

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
      dispatch(setProcessed());
    }
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteScheduleFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('schedule');
      void queryClient.invalidateQueries('scheduledetail');
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
