import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  deletePengeluaranFn,
  getPengeluaranDetailFn,
  getPengeluaranHeaderFn,
  getPengeluaranListFn,
  storePengeluaranFn,
  updatePengeluaranFn
} from '../apis/pengeluaranheader.api';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';
import { useDispatch } from 'react-redux';
import axios, { AxiosError } from 'axios';
import { IErrorResponse } from '../types/user.type';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';

const handleMutationError = (
  error: AxiosError,
  {
    alert,
    setError,
    fallbackTitle
  }: {
    alert: ReturnType<typeof useAlert>['alert'];
    setError: ReturnType<typeof useFormError>['setError'];
    fallbackTitle: string;
  }
) => {
  if (axios.isCancel(error) || error.code === 'ERR_CANCELED') return;
  if (error.code === 'ECONNABORTED') return;
  if (!error.response) return;

  const errorResponse = error.response.data as IErrorResponse | undefined;

  // Zod 400: pesannya array of issue per-field, dilempar ke form supaya muncul
  // tepat di bawah fieldnya, bukan sebagai popup tanpa konteks.
  if (
    errorResponse?.statusCode === 400 &&
    Array.isArray(errorResponse.message)
  ) {
    errorResponse.message.forEach(
      (err: { path: string[]; message: string }) => {
        setError(err.path[0], err.message);
      }
    );
    return;
  }

  const message = errorResponse?.message;
  alert({
    title:
      typeof message === 'string' && message.trim() ? message : fallbackTitle,
    variant: 'danger',
    submitText: 'OK'
  });
};

export const useGetPengeluaranHeader = (
  filters: {
    filters?: {
      nobukti?: string;
      tglbukti?: string;
      relasi_id?: string | null;
      keterangan?: string | null;
      bank_id?: number | string | null;
      postingdari?: string | null;
      coakredit?: string | null;
      dibayarke?: string | null;
      alatbayar_id?: string | null;
      nowarkat?: string | null;
      tgljatuhtempo?: string | null;
      daftarbank_id?: string | null;
      statusformat?: string | null;
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
  const { alert } = useAlert();

  return useQuery(
    ['pengeluaran', filters],
    async () => await getPengeluaranHeaderFn(filters, signal),
    {
      // Guard page >= 1 disamakan dengan useGetAlatbayar. GridPengeluaranHeader
      // memakai trik setCurrentPage(0) di handleScroll untuk memaksa effect
      // jalan ulang saat halaman tujuan kebetulan == currentPage yang basi.
      // Tanpa guard ini, fase antara itu benar-benar mengirim request page=0;
      // FindAllSchema meng-clamp-nya ke 1, jadi yang balik adalah data halaman 1
      // yang lalu tersimpan ke pageDataCache dengan key 0 — satu request sia-sia
      // plus entri cache yang tidak pernah dirender.
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0,
      // Tanpa ini, gagal muat daftar = grid kosong tanpa satu pun keterangan;
      // user tidak bisa membedakan "memang tidak ada data" dari "backend error".
      // Pembatalan request TIDAK dialert: cancelPreviousRequest membatalkan
      // request tiap kali filter/halaman berganti, jadi itu kondisi normal.
      onError: (error: unknown) => {
        const err = error as AxiosError;
        if (axios.isCancel(err) || err?.code === 'ERR_CANCELED') return;
        if (!err?.response) return;

        const message = (err.response.data as IErrorResponse | undefined)
          ?.message;
        alert({
          title:
            typeof message === 'string' && message.trim()
              ? message
              : 'GAGAL MEMUAT DAFTAR PENGELUARAN',
          variant: 'danger',
          submitText: 'OK'
        });
      }
    }
  );
};
export const useGetPengeluaranDetail = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      coadebet?: string;
      coadebet_text?: string;
      keterangan?: string;
      nominal?: string;
      dpp?: string;
      noinvoiceemkl?: string;
      tglinvoiceemkl?: string;
      nofakturpajakemkl?: string;
      perioderefund?: string;
      modifiedby?: string;
      created_at?: string;
      updated_at?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  // Key 'pengeluarandetail', BUKAN 'pengeluaran'. Dulu detail memakai key yang
  // sama persis dengan useGetPengeluaranHeader, sehingga
  // invalidateQueries('pengeluaran') (useDeletePengeluaran, useKasGantung)
  // ikut membatalkan cache detail — dan sebaliknya, cache detail ikut
  // di-refetch tiap kali header berubah walau isinya tidak terkait.
  return useQuery(
    ['pengeluarandetail', filters],
    async () => await getPengeluaranDetailFn(filters, signal),
    {
      // Jangan fetch saat page < 1 (trik setCurrentPage(0) di grid untuk memaksa
      // refetch). Backend meng-clamp page<1 ke 1, jadi tanpa guard ini halaman 0
      // akan memulangkan halaman 1 dan mengotori window cache. Sama seperti
      // useGetAlatbayar.
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

export const useCreatePengeluaran = () => {
  const dispatch = useDispatch();
  const { alert } = useAlert();
  const { setError } = useFormError();

  // Sengaja TIDAK invalidateQueries('pengeluaran') di sini. Alur onSuccess di
  // GridPengeluaranHeader sudah otoritatif: ia mengambil window baru dari redis
  // lalu setCurrentPage(pageNumber) yang memicu refetch halaman yang BENAR.
  // invalidateQueries malah me-refetch `currentPage` yang mungkin masih basi;
  // karena useGetPengeluaranHeader memakai staleTime/cacheTime 0, refetch itu
  // selalu jalan, tiba paling akhir, dan menimpa baris + fokus hasil onSuccess
  // -> form seolah tidak memposisikan ke baris yang baru disimpan. Sama seperti
  // useCreateAlatbayar.
  return useMutation(storePengeluaranFn, {
    // before the mutation fn runs
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      dispatch(setProcessed());
    },
    onError: (error: AxiosError) => {
      handleMutationError(error, {
        alert,
        setError,
        fallbackTitle: 'GAGAL MENYIMPAN DATA PENGELUARAN'
      });
      dispatch(setProcessed());
    }
  });
};
export const useGetPengeluaranHeaderList = (
  params: { dari: string; sampai: string } = { dari: '', sampai: '' },
  popOver: boolean
) => {
  const { alert } = useAlert();

  return useQuery(
    ['pengeluaranheaderlist', params],
    async () => {
      try {
        const data = await getPengeluaranListFn(params.dari, params.sampai);
        return data;
      } catch (error) {
        alert({
          title: 'GAGAL MEMUAT DAFTAR NOMOR BUKTI PENGELUARAN',
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
export const useUpdatePengeluaran = () => {
  // `alert` HARUS diambil dari useAlert(). Tanpa ini, `alert(...)` di bawah
  // terhubung ke window.alert global → muncul popup native "[object Object]"
  // saat update gagal, dan error validasi 400 per-field tak pernah ditampilkan
  // di form. Samakan penanganannya dengan useCreatePengeluaran.
  const { alert } = useAlert();
  const { setError } = useFormError();

  // Sama seperti useCreatePengeluaran: JANGAN invalidateQueries di sini.
  // onSuccess di GridPengeluaranHeader yang mengatur data + posisi baris.
  return useMutation(updatePengeluaranFn, {
    onError: (error: AxiosError) => {
      handleMutationError(error, {
        alert,
        setError,
        fallbackTitle: 'GAGAL MENGUBAH DATA PENGELUARAN'
      });
    }
  });
};
export const useDeletePengeluaran = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();
  const { setError } = useFormError();

  return useMutation(deletePengeluaranFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('pengeluaran');
    },
    onError: (error: AxiosError) => {
      handleMutationError(error, {
        alert,
        setError,
        fallbackTitle: 'GAGAL MENGHAPUS DATA PENGELUARAN'
      });
    }
  });
};
