import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  deleteHutangFn,
  getHutangDetailFn,
  getHutangHeaderFn,
  getHutangHeaderByIdFn,
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
  const dispatch = useDispatch();
  const { alert } = useAlert();
  const queryClient = useQueryClient();

  return useQuery(
    ['hutang', filters],
    async () => {
      // Only trigger processing if the page is 1
      if (filters.page === 1) {
        dispatch(setProcessing());
      }

      try {
        const data = await getHutangHeaderFn(filters, signal);
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
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { alert } = useAlert();

  return useMutation(storeHutangFn, {
    // before the mutation fn runs
    onMutate: () => {
      dispatch(setProcessing());
    },
    // on success, invalidate + toast + clear loading
    onSuccess: () => {
      void queryClient.invalidateQueries(['hutang']);
      //   toast({
      //     title: 'Proses Berhasil',
      //     description: 'Data Berhasil Ditambahkan'
      //   });
      dispatch(setProcessed());
    },
    // on error, toast + clear loading
    onError: (error: AxiosError) => {
      const err = (error.response?.data as IErrorResponse) ?? {};
      // toast({
      //   variant: 'destructive',
      //   title: err.message ?? 'Gagal',
      //   description: 'Terjadi masalah dengan permintaan Anda.'
      // });
      dispatch(setProcessed());
    }
    // alternatively: always clear loading, whether success or fail
    // onSettled: () => {
    //   dispatch(clearProcessing());
    // }
  });
};
export const useGetHutangHeaderList = (
  params: { dari: string; sampai: string } = { dari: '', sampai: '' },
  popOver: boolean
) => {
  const { alert } = useAlert();
  const queryClient = useQueryClient();

  return useQuery(
    ['Hutangheaderlist', params],
    async () => {
      try {
        const data = await getHutangListFn(params.dari, params.sampai);
        return data;
      } catch (error) {
        // Show error toast
        // toast({
        //   variant: 'destructive',
        //   title: 'Gagal',
        //   description: 'Terjadi masalah dengan permintaan Anda.'
        // });
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

  return useMutation(updateHutangFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('hutang');
      void queryClient.invalidateQueries('jurnalumum');
      //   toast({
      //     title: 'Proses Berhasil.',
      //     description: 'Data Berhasil Diubah.'
      //   });
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
export const useDeleteHutang = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteHutangFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('hutang');
      //   toast({
      //     title: 'Proses Berhasil.',
      //     description: 'Data Berhasil Dihapus.'
      //   });
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;
      if (errorResponse !== undefined) {
        // toast({
        //   variant: 'destructive',
        //   title: errorResponse.message ?? 'Gagal',
        //   description: 'Terjadi masalah dengan permintaan Anda.'
        // });
      }
    }
  });
};
