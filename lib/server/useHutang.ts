import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  deleteHutangFn,
  getHutangDetailFn,
  getHutangHeaderFn,
  storeHutangFn,
  updateHutangFn,
  getHutangListFn
} from '../apis/hutang.api';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';
import { useDispatch } from 'react-redux';
import { AxiosError } from 'axios';
import { IErrorResponse } from '../types/user.type';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';

export const useGetHutangHeader = (
  filters: {
    filters?: {
      nobukti?: string;
      tglbukti?: string;
      keterangan?: string | null;
      relasi_id?: string | null;
      coa?: string | null;
      tglDari?: string | null;
      tglSampai?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    page?: number;
    sortBy?: string;
    sortDirection?: string;
    limit?: number;
    search?: string; // Kata kunci pencarian
  } = {},
  signal?: AbortSignal
) => {
  // Overlay global TIDAK dipicu dari sini. Grid punya LoadRowsRenderer sendiri,
  // dan setProcessing/setProcessed di dalam query fn ikut jalan pada tiap
  // refetch window pagination — overlay berkedip tiap kali user scroll. Sama
  // seperti useGetPengeluaranHeader / useGetJurnalUmumHeader.
  return useQuery(
    ['hutang', filters],
    async () => await getHutangHeaderFn(filters, signal),
    {
      // Jangan fetch saat page < 1 (trik setCurrentPage(0) di grid untuk memaksa
      // refetch). Backend meng-clamp page<1 ke 1 (lihat FindAllSchema), jadi
      // tanpa guard ini halaman 0 akan memulangkan halaman 1 dan mengotori
      // window cache. Sama seperti useGetPengeluaranHeader.
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      // staleTime/cacheTime 0: window pagination dikelola sendiri oleh grid
      // (pageDataCache + streamBuffer). Cache react-query di atasnya hanya
      // membuat data lama sempat terpakai saat filter/sort berubah.
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useGetHutangDetail = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      coa?: string;
      coa_text?: string;
      keterangan?: string;
      nominal?: string;
      dpp?: string;
      noinvoiceemkl?: string;
      tglinvoiceemkl?: string;
      nofakturpajakemkl?: string;
      modifiedby?: string;
      created_at?: string;
      updated_at?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  // Key 'hutangdetail', BUKAN 'hutang'. Dulu detail memakai key yang sama
  // persis dengan useGetHutangHeader, sehingga invalidateQueries('hutang')
  // (useDeleteHutang, useCreateHutang) ikut membatalkan cache detail — dan
  // sebaliknya, cache detail ikut di-refetch tiap kali header berubah walau
  // isinya tidak terkait.
  return useQuery(
    ['hutangdetail', filters],
    async () => await getHutangDetailFn(filters, signal),
    {
      // Jangan fetch saat page < 1 (trik setCurrentPage(0) di grid untuk memaksa
      // refetch). Backend meng-clamp page<1 ke 1, jadi tanpa guard ini halaman 0
      // akan memulangkan halaman 1 dan mengotori window cache.
      enabled:
        !!filters.filters?.nobukti &&
        !signal?.aborted &&
        (filters.page ?? 1) >= 1,
      // staleTime/cacheTime 0: window pagination dikelola sendiri oleh grid
      // (pageDataCache + streamBuffer).
      staleTime: 0,
      cacheTime: 0
    }
  );
};
export const useCreateHutang = () => {
  const dispatch = useDispatch();
  const { alert } = useAlert();
  const { setError } = useFormError();

  // Sengaja TIDAK invalidateQueries('hutang') di sini. Alur onSuccess di
  // GridHutangHeader sudah otoritatif: ia mengambil window baru dari redis lalu
  // setCurrentPage(pageNumber) yang memicu refetch halaman yang BENAR.
  // invalidateQueries malah me-refetch `currentPage` yang mungkin masih basi;
  // karena useGetHutangHeader memakai staleTime/cacheTime 0, refetch itu selalu
  // jalan, tiba paling akhir, dan menimpa baris + fokus hasil onSuccess.
  // Sama seperti useCreatePengeluaran.
  return useMutation(storeHutangFn, {
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
export const useGetHutangHeaderList = (
  params: { dari: string; sampai: string } = { dari: '', sampai: '' },
  popOver: boolean
) => {
  const { alert } = useAlert();

  return useQuery(
    ['Hutangheaderlist', params],
    async () => {
      try {
        const data = await getHutangListFn(params.dari, params.sampai);
        return data;
      } catch (error) {
        alert({
          title: 'Gagal',
          variant: 'danger',
          submitText: 'OK'
        });
        throw error; // Re-throw to ensure the query is marked as failed
      }
    },
    {
      enabled: popOver // Fetch hanya jika popOver true dan id tidak kosong
    }
  );
};
export const useUpdateHutang = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();
  const { setError } = useFormError();

  // Sama seperti useCreateHutang: JANGAN invalidateQueries('hutang') di sini.
  // onSuccess di GridHutangHeader yang mengatur data + posisi baris; refetch
  // dari invalidate mendarat belakangan dan menimpa fokus tersebut (gejala
  // "setelah update grid balik ke baris 1").
  return useMutation(updateHutangFn, {
    onSuccess: () => {
      // Key 'jurnalumumdetail' aman di-invalidate: nobukti header tidak berubah
      // saat edit, jadi tab Jurnal Umum Detail tidak akan me-refetch sendiri
      // padahal isinya ikut berubah di backend.
      void queryClient.invalidateQueries('jurnalumumdetail');
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
    }
  });
};
export const useDeleteHutang = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteHutangFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('hutang');
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
