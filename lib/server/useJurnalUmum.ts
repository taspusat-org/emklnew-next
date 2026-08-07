import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  getKasgantungListFn,
  getKasgantungPengembalianFn
} from '../apis/kasgantungheader.api';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';
import { useDispatch } from 'react-redux';
import { AxiosError } from 'axios';
import { IErrorResponse } from '../types/user.type';
import {
  deleteJurnalUmumFn,
  getJurnalUmumDetailFn,
  getJurnalUmumHeaderFn,
  storeJurnalUmumFn,
  updateJurnalUmumFn
} from '../apis/jurnalumumheader.api';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';

export const useGetJurnalUmumHeader = (
  filters: {
    filters?: {
      nobukti?: string;
      tglbukti?: string;
      keterangan?: string | null;
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
    ['jurnalumum', filters],
    async () => await getJurnalUmumHeaderFn(filters, signal),
    {
      // Guard page >= 1 disamakan dengan usePengeluaran. GridJurnalUmumHeader
      // memakai trik setCurrentPage(0) di handleScroll untuk memaksa effect
      // jalan ulang saat halaman tujuan kebetulan == currentPage yang basi.
      // Tanpa guard ini, fase antara itu benar-benar mengirim request page=0;
      // FindAllSchema meng-clamp-nya ke 1, jadi yang balik adalah data halaman 1
      // yang lalu tersimpan ke pageDataCache dengan key 0 — satu request sia-sia
      // plus entri cache yang tidak pernah dirender.
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      // staleTime/cacheTime 0: window pagination dikelola sendiri oleh grid.
      // Tanpa ini refetch pasca-update sempat memakai cache lama sehingga baris
      // yang baru disimpan tampil dengan nilai basi.
      staleTime: 0,
      cacheTime: 0
    }
  );
};
export const useGetJurnalUmumDetail = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      tglbukti?: string;
      keterangan?: string | null;
      modifiedby?: string;
      created_at?: string;
      updated_at?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  // Key 'jurnalumumdetail', BUKAN 'jurnalumum'. Dulu detail memakai key yang
  // sama persis dengan useGetJurnalUmumHeader, sehingga
  // invalidateQueries('jurnalumum') (useUpdateJurnalUmum, useDeleteJurnalUmum,
  // useHutang, useKasGantung) ikut membatalkan cache detail — dan sebaliknya,
  // cache detail ikut di-refetch tiap kali header berubah walau isinya tidak
  // terkait. Sama seperti usePengeluaran / useHutang.
  return useQuery(
    ['jurnalumumdetail', filters],
    async () => await getJurnalUmumDetailFn(filters, signal),
    {
      // Jangan fetch saat page < 1 (trik setCurrentPage(0) di grid untuk memaksa
      // refetch). Backend meng-clamp page<1 ke 1, jadi tanpa guard ini halaman 0
      // memulangkan halaman 1 dan mengotori window cache.
      enabled:
        !!filters.filters?.nobukti &&
        !signal?.aborted &&
        (filters.page ?? 1) >= 1,
      // staleTime/cacheTime 0: window pagination dikelola sendiri oleh grid
      // (pageDataCache + streamBuffer). Cache react-query di atasnya hanya
      // membuat data lama sempat terpakai saat filter/sort berubah.
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useCreateJurnalUmum = () => {
  const dispatch = useDispatch();
  const { alert } = useAlert();
  const { setError } = useFormError();

  // Sengaja TIDAK invalidateQueries('jurnalumum') di sini. Alur onSuccess di
  // GridJurnalUmumHeader sudah otoritatif: ia mengambil window baru dari redis
  // lalu setCurrentPage(pageNumber) yang memicu refetch halaman yang BENAR.
  // invalidateQueries malah me-refetch `currentPage` yang mungkin masih basi;
  // karena useGetJurnalUmumHeader memakai staleTime/cacheTime 0, refetch itu
  // selalu jalan, tiba paling akhir, dan menimpa baris + fokus hasil onSuccess.
  // Sama seperti useCreatePengeluaran.
  return useMutation(storeJurnalUmumFn, {
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
export const useGetKasGantungHeaderList = (
  params: { dari: string; sampai: string } = { dari: '', sampai: '' },
  popOver: boolean
) => {
  const { alert } = useAlert();

  return useQuery(
    ['kasgantungheaderlist', params],
    async () => {
      try {
        const data = await getKasgantungListFn(params.dari, params.sampai);
        return data;
      } catch (error) {
        // Show error toast
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
export const useGetKasGantungHeaderPengembalian = (
  params: { dari: string; sampai: string; id: string } = {
    dari: '',
    sampai: '',
    id: ''
  },
  popOver: boolean // Menambahkan argumen popOver untuk kontrol kondisi fetch
) => {
  const { alert } = useAlert();

  return useQuery(
    ['kasgantungheaderpengembalian', params],
    async () => {
      try {
        const data = await getKasgantungPengembalianFn(
          params.id,
          params.dari,
          params.sampai
        );
        return data;
      } catch (error) {
        // Show error toast
        alert({
          title: 'Gagal',
          variant: 'danger',
          submitText: 'OK'
        });
        throw error; // Re-throw to ensure the query is marked as failed
      }
    },
    {
      enabled: popOver && params.id !== '' // Fetch hanya jika popOver true dan id tidak kosong
    }
  );
};
export const useUpdateJurnalUmum = () => {
  const { alert } = useAlert();
  const { setError } = useFormError();

  // Sama seperti useCreateJurnalUmum: JANGAN invalidateQueries di sini.
  // onSuccess di GridJurnalUmumHeader yang mengatur data + posisi baris;
  // refetch dari invalidate mendarat belakangan dan menimpa fokus tersebut
  // (gejala "setelah update grid balik ke baris 1").
  return useMutation(updateJurnalUmumFn, {
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
export const useDeleteJurnalUmum = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteJurnalUmumFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('jurnalumum');
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
