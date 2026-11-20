import { AxiosError } from 'axios';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  deleteBookingOrderanMuatanFn,
  getAllBookingOrderanMuatanFn,
  storeBookingMuatanPartyFn,
  storeBookingOrderanMuatanFn,
  updateBookingOrderanMuatanFn
} from '../apis/bookingOrderanHeader.api';
import { IErrorResponse } from '../types/bookingOrderanHeader.type';
import { useDispatch } from 'react-redux';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';

export const useGetAllBookingOrderanHeader = (
  filters: {
    page?: number;
    limit?: number;
    customOffset?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      tglbukti?: string;
      modifiedby?: string;
      created_at?: string;
      updated_at?: string;
      tglDari?: string | null;
      tglSampai?: string | null;
    };
  } = {},
  signal?: AbortSignal
) => {
  const dispatch = useDispatch();
  const { alert } = useAlert();
  const queryClient = useQueryClient();

  // TANPA dispatch(setProcessing()). Overlay loading global itu dipakai untuk
  // MUTASI (simpan/edit/hapus), bukan untuk memuat grid — sama seperti
  // useGetAllBiayaExtraHeader. Grid berjendela menembak bulk fetch + prefetch
  // sekali buka, dan menembak lagi tiap pergeseran window; menyalakan overlay
  // global di query-nya membuat layar berkedip "loading" terus-menerus padahal
  // grid sudah menampilkan data.
  //
  // staleTime/cacheTime 0: window pagination dikelola sendiri oleh grid
  // (pageDataCache + streamBuffer). Guard page >= 1 dipakai grid lewat trik
  // setCurrentPage(0) untuk memaksa refetch window.
  return useQuery(
    ['bookingorderan', filters],
    async () => await getAllBookingOrderanMuatanFn(filters, signal),
    {
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useCreateBookingOrderanHeader = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { alert } = useAlert();

  return useMutation(storeBookingOrderanMuatanFn, {
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries('bookingorderan');
      dispatch(setProcessed());
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

export const useCreateBookingMuatanParty = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(storeBookingMuatanPartyFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('bookingorderan');
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

export const useUpdateBookingOrderanHeader = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(updateBookingOrderanMuatanFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('bookingorderan');
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

export const useDeleteBookingOrderanHeader = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteBookingOrderanMuatanFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('bookingorderan');
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
