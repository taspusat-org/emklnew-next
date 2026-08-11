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
  deletePanjarHeaderFn,
  getAllPanjarHeaderFn,
  getPanjarBongkaranDetailFn,
  getPanjarMuatanDetailFn,
  storePanjarHeaderFn,
  updatePanjarHeaderFn
} from '../apis/panjarheader.api';

/**
 * Header & detail punya prefix key masing-masing supaya cache-nya tidak saling
 * menimpa. Konsekuensinya simpan/hapus harus membatalkan keduanya secara
 * eksplisit — satu `invalidateQueries('panjarheader')` tidak lagi menjangkau
 * detail.
 */
const invalidatePanjar = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries('panjarheader');
  void queryClient.invalidateQueries('panjarmuatandetail');
};

export const useGetAllPanjarHeader = (
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
    ['panjarheader', filters],
    async () => {
      // Only trigger processing if the page is 1
      if (filters.page === 1) {
        dispatch(setProcessing());
      }

      try {
        const data = await getAllPanjarHeaderFn(filters, signal);
        return data;
      } catch (error) {
        // Show error toast and dispatch processed
        dispatch(setProcessed());
        // toast({
        //   variant: 'destructive',
        //   title: 'Gagal',
        //   description: 'Terjadi masalah dengan permintaan Anda.'
        // });
        throw error;
      } finally {
        // Regardless of success or failure, we dispatch setProcessed after the query finishes
        dispatch(setProcessed());
      }
    },
    {
      // Optionally, you can use the `onSettled` callback if you want to reset the processing state after query success or failure
      onSettled: () => {
        if (filters.page === 1) {
          dispatch(setProcessed());
        }
      },
      // Guard page >= 1 disamakan dengan useGetAlatbayar/useGetPengeluaranHeader.
      // GridPanjarHeader memakai trik setCurrentPage(0) di handleScroll untuk
      // memaksa effect jalan ulang saat halaman tujuan kebetulan == currentPage
      // yang basi. Tanpa guard ini fase antara itu benar-benar mengirim request
      // page=0; controller meng-clamp-nya ke 1 (`Number(page) || 1`), jadi yang
      // balik adalah data HALAMAN 1 yang tersimpan di cache react-query dengan
      // key page=0 — satu request sia-sia plus entri cache yang salah halaman.
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      // staleTime/cacheTime 0: window pagination dikelola sendiri oleh grid
      // (pageDataCache + streamBuffer). Cache react-query di atasnya membuat
      // halaman yang sudah DIBUANG grid dari window tetap dipulangkan dari
      // memori saat window bergeser balik — grid mengira itu data currentPage
      // padahal isinya halaman lama.
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useGetPanjarMuatanDetail = (
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
      keterangan?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  // Key 'panjarmuatandetail', BUKAN 'panjarheader'. Dulu detail memakai prefix
  // yang sama dengan useGetAllPanjarHeader sehingga cache keduanya saling
  // menimpa/membatalkan walau isinya tidak terkait.
  return useQuery(
    ['panjarmuatandetail', id, filters],
    async () => await getPanjarMuatanDetailFn(id!, filters, signal),
    {
      // HARUS `&&`. Dengan `||`, `!signal?.aborted` bernilai true saat signal
      // undefined sehingga query tetap jalan walau id kosong — request jadi
      // `/panjarmuatandetail/0` dan backend menyaring panjar_id = '0'.
      //
      // Guard page >= 1 sama seperti useGetPengeluaranDetail: GridPanjarMuatanDetail
      // memakai trik setCurrentPage(0) di handleScroll. Tanpa guard ini fase
      // antara itu mengirim request page=0 yang di-clamp controller ke 1, jadi
      // data HALAMAN 1 tersimpan di cache dengan key page=0.
      //
      // FormPanjarHeader memanggil hook ini tanpa filters (page undefined ->
      // `?? 1`), jadi tetap enabled dan tetap menarik SELURUH detail.
      enabled: !!id && !signal?.aborted && (filters.page ?? 1) >= 1,
      // staleTime/cacheTime 0: window pagination dikelola sendiri oleh grid
      // (pageDataCache + streamBuffer). Cache react-query di atasnya membuat
      // halaman yang sudah dibuang grid dari window tetap dipulangkan dari
      // memori saat window bergeser balik, dan membuat form sempat memakai
      // daftar detail basi — padahal payload simpan dibangun dari daftar itu
      // dan baris yang tidak terkirim DIHAPUS backend.
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useGetPanjarBongkaranDetail = (
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
      keterangan?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['panjarheader', id, filters],
    async () => await getPanjarBongkaranDetailFn(id!, filters),
    {
      enabled: !!id || !signal?.aborted // Hanya aktifkan query jika tab aktif adalah "pengalamankerja"
    }
  );
};

export const useCreatePanjarHeader = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { alert } = useAlert();

  return useMutation(storePanjarHeaderFn, {
    // before the mutation fn runs
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      // on success, invalidate + clear loading
      invalidatePanjar(queryClient);
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

export const useUpdatePanjarHeader = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { alert } = useAlert();

  return useMutation(updatePanjarHeaderFn, {
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      invalidatePanjar(queryClient);
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

export const useDeletePanjarHeader = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deletePanjarHeaderFn, {
    onSuccess: () => {
      invalidatePanjar(queryClient);
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
