import { AxiosError } from 'axios';
import { useDispatch } from 'react-redux';
import { useAlert } from '../store/client/useAlert';
import { IErrorResponse } from '../types/blheader.type';
import { useFormError } from '../hooks/formErrorContext';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';
import {
  deleteBiayaExtraHeaderFn,
  getAllBiayaExtraHeaderFn,
  getBiayaExtraBongkaranDetailFn,
  getBiayaExtraMuatanDetailFn,
  storeBiayaExtraHeaderFn,
  updateBiayaExtraHeaderFn
} from '../apis/biayaextraheader.api';

export const useGetAllBiayaExtraHeader = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      tglbukti?: string;
      nobukti?: string;
      jenisorder_text?: string;
      biayaemkl_text?: string;
      keterangan?: string;
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

  return useQuery(
    ['biayaextraheader', filters],
    async () => await getAllBiayaExtraHeaderFn(filters, signal),
    {
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useGetBiayaExtraMuatanDetail = (
  id?: string,
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      orderanmuatan_nobukti?: string;
      estimasi?: string;
      nominal?: string;
      statustagih_text?: string;
      nominaltagih?: string;
      keterangan?: string;
      groupbiayaextra_text?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['biayaextramuatandetail', id, filters],
    async () => await getBiayaExtraMuatanDetailFn(id!, filters, signal),
    {
      // Jangan fetch saat page < 1 (trik setCurrentPage(0) di grid untuk memaksa
      // refetch window pagination) atau saat belum ada header terpilih.
      enabled: !!id && !signal?.aborted && (filters.page ?? 1) >= 1,
      // staleTime/cacheTime 0: window pagination dikelola sendiri oleh grid
      // (pageDataCache + streamBuffer), sama seperti useGetPengeluaranDetail.
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useGetBiayaExtraBongkaranDetail = (
  id?: string,
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      orderanmuatan_nobukti?: string;
      estimasi?: string;
      nominal?: string;
      statustagih_text?: string;
      nominaltagih?: string;
      keterangan?: string;
      groupbiayaextra_text?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['biayaextrabongkarandetail', id, filters],
    async () => await getBiayaExtraBongkaranDetailFn(id!, filters, signal),
    {
      enabled: !!id && !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useCreateBiayaExtraHeader = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { alert } = useAlert();

  return useMutation(storeBiayaExtraHeaderFn, {
    // before the mutation fn runs
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      // on success, invalidate + clear loading
      void queryClient.invalidateQueries(['biayaextraheader']);
      dispatch(setProcessed());
    },
    onError: (error: AxiosError) => {
      // on error, clear loading
      const err = (error.response?.data as IErrorResponse) ?? {};

      if (err !== undefined) {
        const errorFields = Array.isArray(err.message) ? err.message : [];
        if (err.statusCode === 400) {
          // Iterasi error message dan set error di form
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0]; // Ambil path error pertama (misalnya 'nama', 'akuntansi_id')
            setError(path, err.message); // Update error di context
          });
        } else {
          alert({
            title: err.message ?? 'Gagal',
            variant: 'danger',
            submitText: 'OK'
          });
        }
      }
      dispatch(setProcessed());
    },
    onSettled: () => {
      dispatch(setProcessed());
    }
  });
};

export const useUpdateBiayaExtraHeader = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { alert } = useAlert();

  return useMutation(updateBiayaExtraHeaderFn, {
    onMutate: () => {
      dispatch(setProcessing());
    },
    // Detail ikut tersimpan dalam payload header yang sama, tapi key-nya
    // ('biayaextramuatandetail' / 'biayaextrabongkarandetail') tidak match
    // 'biayaextraheader' — tanpa invalidate ini grid detail tidak pernah
    // refetch dan tetap menampilkan baris sebelum edit. Header terpilih tidak
    // berganti saat edit, jadi tidak ada perubahan id yang bisa memicunya.
    onSuccess: () => {
      void queryClient.invalidateQueries('biayaextraheader');
      void queryClient.invalidateQueries('biayaextramuatandetail');
      void queryClient.invalidateQueries('biayaextrabongkarandetail');
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
    },
    onSettled: () => {
      dispatch(setProcessed());
    }
  });
};

export const useDeleteBiayaExtraHeader = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteBiayaExtraHeaderFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('biayaextraheader');
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
