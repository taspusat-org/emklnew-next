import { AxiosError } from 'axios';
import { useDispatch } from 'react-redux';
import { useAlert } from '../store/client/useAlert';
import { IErrorResponse } from '../types/blheader.type';
import { useFormError } from '../hooks/formErrorContext';
import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient
} from 'react-query';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';
import {
  deleteBlHeaderFn,
  getAllBlHeaderHeaderFn,
  getBlDetailFn,
  getBlDetailRincianFn,
  storeBlHeaderFn,
  updateBlHeaderFn
} from '../apis/blheader.api';

const invalidateBlHeader = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries('blheader');
  void queryClient.invalidateQueries('bldetail');
  void queryClient.invalidateQueries('bldetailrincian');
};

export const useGetAllBlHeader = (
  filters: {
    page?: number;
    limit?: number;
    customOffset?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      voyberangkat?: string;
      pelayaran_text?: string;
      kapal_text?: string;
      closing?: string;
      tglberangkat?: string;
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

  return useQuery(
    ['blheader', filters],
    async () => {
      // Only trigger processing if the page is 1
      if (filters.page === 1) {
        dispatch(setProcessing());
      }

      try {
        const data = await getAllBlHeaderHeaderFn(filters, signal);
        return data;
      } catch (error) {
        // Show error toast and dispatch processed
        dispatch(setProcessed());
        throw error;
      } finally {
        // Regardless of success or failure, we dispatch setProcessed after the query finishes
        dispatch(setProcessed());
      }
    },
    {
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useGetBlDetail = (
  id?: string,
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      bl_nobukti?: string;
      shippinginstructiondetail_nobukti?: string;
      keterangan?: string;
      noblconecting?: string;
      asalpelabuhan?: string;
      consignee?: string;
      shipper?: string;
      comodity?: string;
      notifyparty?: string;
      emkllain_text?: string;
      pelayaran_text?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  // Key 'bldetail', BUKAN 'blheader'. Dulu detail memakai prefix yang sama
  // dengan useGetAllBlHeader dan useGetBlDetailRincian, sehingga cache
  // ketiganya saling menimpa/membatalkan walau isinya tidak terkait.
  return useQuery(
    ['bldetail', id, filters],
    async () => await getBlDetailFn(id!, filters),
    {
      // HARUS `&&`. Dengan `||`, `!signal?.aborted` bernilai true saat signal
      // undefined sehingga query tetap jalan walau id kosong — request jadi
      // `/bldetail/0`. Guard page >= 1 dipakai saat scroll ke atas menekan
      // currentPage ke 0 sesaat untuk memaksa refetch.
      enabled: !!id && !signal?.aborted && (filters.page ?? 1) >= 1
    }
  );
};

export const useGetBlDetailRincian = (
  id?: string,
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      bldetail_nobukti?: string;
      orderanmuatan_nobukti?: string;
      keterangan?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  // Key & guard sama alasannya dengan useGetBlDetail: prefix sendiri supaya
  // tidak bertabrakan, dan `&&` supaya tidak pernah request `/bldetailrincian/0`
  // saat belum ada detail terpilih.
  return useQuery(
    ['bldetailrincian', id, filters],
    async () => await getBlDetailRincianFn(id!, filters),
    {
      enabled: !!id && !signal?.aborted
    }
  );
};

export const useCreateBlHeader = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { alert } = useAlert();

  return useMutation(storeBlHeaderFn, {
    // before the mutation fn runs
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      // on success, invalidate + clear loading
      invalidateBlHeader(queryClient);
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

export const useUpdateBlHeader = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { alert } = useAlert();

  return useMutation(updateBlHeaderFn, {
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      invalidateBlHeader(queryClient);
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

export const useDeleteBlHeader = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteBlHeaderFn, {
    onSuccess: () => {
      invalidateBlHeader(queryClient);
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
