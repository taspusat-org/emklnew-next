import { AxiosError } from 'axios';
import { useDispatch } from 'react-redux';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';
import {
  deleteEstimasiBiayaHeaderFn,
  getAllEstimasiBiayaHeaderFn,
  getEstimasiBiayaDetailBiayaFn,
  getEstimasiBiayaDetailInvoiceFn,
  storeEstimasiBiayaHeaderFn,
  updateEstimasiBiayaHeaderFn
} from '../apis/estimasibiayaheader.api';
import { IErrorResponse } from '../types/estimasibiayaheader.type';

export const useGetAllEstimasiBiayaHeader = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      tglbukti?: string;
      jenisorder_text?: string;
      orderan_nobukti?: string;
      nominal?: string;
      shipper_text?: string;
      statusppn_text?: string;
      asuransi_text?: string;
      comodity_text?: string;
      consignee_text?: string;
      modifiedby?: string;
      created_at?: string;
      updated_at?: string;
      tglDari?: string | null;
      tglSampai?: string | null;
    };
  } = {},
  signal?: AbortSignal
) => {
  // TANPA dispatch(setProcessing()). Overlay loading global itu dipakai untuk
  // MUTASI (simpan/edit/hapus), bukan untuk memuat grid — sama seperti
  // useGetAllBlHeader. Grid ini berjendela: sekali buka saja sudah menembak
  // bulk fetch + beberapa prefetch, dan tiap pergeseran window menembak lagi.
  // Menyalakan overlay global di query-nya membuat layar berkedip "loading"
  // terus-menerus dan terasa berat padahal grid sudah menampilkan data.
  // Indikator yang relevan tetap ada di footer grid (LoadRowsRenderer).
  return useQuery(
    ['estimasibiaya', filters],
    async () => await getAllEstimasiBiayaHeaderFn(filters, signal),
    {
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useGetEstimasiBiayaDetailBiaya = (
  id?: string,
  activeTab?: string,
  tabFormValues?: string,
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      biayaemkl_text?: string;
      nominal?: string;
      nilaiasuransi?: string;
      nominaldisc?: string;
      nominalsebelumdisc?: string;
      nominaltradoluar?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['estimasibiaya', id, 'detail-biaya', filters],
    async () => await getEstimasiBiayaDetailBiayaFn(id!, filters),
    {
      // HARUS `&&`. Dengan `||`, `!signal?.aborted` bernilai true saat signal
      // undefined sehingga query tetap jalan walau id kosong — request jadi
      // `/estimasibiayadetailbiaya/0`. Guard page >= 1 dipakai saat scroll
      // ke atas menekan currentPage ke 0 sesaat untuk memaksa refetch.
      enabled: !!id && !signal?.aborted && (filters.page ?? 1) >= 1
    }
  );
};

export const useGetEstimasiBiayaDetailInvoice = (
  id?: string,
  activeTab?: string,
  tabFormValues?: string,
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      biayaemkl_text?: string;
      link_text?: string;
      nominal?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['estimasibiaya', id, 'detail-invoice', filters],
    async () => await getEstimasiBiayaDetailInvoiceFn(id!, filters),
    {
      // HARUS `&&`. Dengan `||`, `!signal?.aborted` bernilai true saat signal
      // undefined sehingga query tetap jalan walau id kosong — request jadi
      // `/estimasibiayadetailinvoice/0`. Guard page >= 1 dipakai saat scroll
      // ke atas menekan currentPage ke 0 sesaat untuk memaksa refetch.
      enabled: !!id && !signal?.aborted && (filters.page ?? 1) >= 1
    }
  );
};

export const useCreateEstimasiBiayaHeader = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { alert } = useAlert();

  return useMutation(storeEstimasiBiayaHeaderFn, {
    // before the mutation fn runs
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      // on success, invalidate + clear loading
      void queryClient.invalidateQueries(['estimasibiaya']);
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

export const useUpdateEstimasiBiayaHeader = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { alert } = useAlert();

  return useMutation(updateEstimasiBiayaHeaderFn, {
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries('estimasibiaya');
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

export const useDeleteEstimasiBiayaHeader = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteEstimasiBiayaHeaderFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('estimasibiaya');
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
