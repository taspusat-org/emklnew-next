import axios, { AxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useDispatch } from 'react-redux';
import {
  getPenerimaanHeaderFn,
  getPenerimaanDetailFn,
  storePenerimaanFn,
  updatePenerimaanFn,
  deletePenerimaanFn
} from '../apis/penerimaan.api';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';
import { IErrorResponse } from '../types/user.type';
import { useAlert } from '../store/client/useAlert';
import { filterPenerimaan } from '../types/penerimaan.type';
import { useFormError } from '../hooks/formErrorContext';

/**
 * Penanganan error mutasi penerimaan.
 *
 * Dulu seluruh badan handler dibungkus `if (errorResponse !== undefined)`, jadi
 * kalau backend balas tanpa body yang bisa dibaca — 500 ber-body HTML, gateway
 * error, backend mati saat online — user menekan SIMPAN dan TIDAK terjadi apa
 * pun: dialog diam, tanpa pesan. Sekarang selalu ada pesan yang keluar.
 *
 * Yang SENGAJA dilewati: pembatalan request dan kondisi offline. Keduanya sudah
 * ditangani interceptor AxiosInstance (overlay offline / alert "Koneksi
 * Timeout"), jadi alert kedua di sini hanya jadi popup dobel.
 */
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

export const useGetPenerimaanHeader = (
  // Bentuk filternya diturunkan dari `filterPenerimaan` supaya tidak perlu
  // didaftar ulang setiap kolom grid bertambah — daftar manual selalu
  // ketinggalan dan bikin pemanggilnya gagal tipe.
  filters: {
    filters?: Partial<typeof filterPenerimaan>;
    page?: number;
    sortBy?: string;
    sortDirection?: string;
    limit?: number;
    isreload?: boolean;
    search?: string; // Kata kunci pencarian
  } = {},
  signal?: AbortSignal
) => {
  const { alert } = useAlert();

  return useQuery(
    ['penerimaan', filters],
    async () => await getPenerimaanHeaderFn(filters, signal),
    {
      // Guard page >= 1 disamakan dengan useGetPengeluaranHeader.
      // GridPenerimaanHeader memakai trik setCurrentPage(0) di handleScroll
      // untuk memaksa effect jalan ulang saat halaman tujuan kebetulan ==
      // currentPage yang basi. Tanpa guard ini, fase antara itu benar-benar
      // mengirim request page=0; FindAllSchema meng-clamp-nya ke 1, jadi yang
      // balik adalah data halaman 1 yang lalu tersimpan ke pageDataCache dengan
      // key 0 — satu request sia-sia plus entri cache yang tidak pernah dirender.
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
              : 'GAGAL MEMUAT DAFTAR PENERIMAAN',
          variant: 'danger',
          submitText: 'OK'
        });
      }
    }
  );
};

export const useGetPenerimaanDetail = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      pengembaliankasgantung_nobukti?: string;
      coa?: string;
      coa_text?: string;
      keterangan?: string;
      nominal?: string;
      transaksibiaya_nobukti?: string;
      transaksilain_nobukti?: string;
      modifiedby?: string;
      created_at?: string;
      updated_at?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  // Key 'penerimaandetail', BUKAN 'penerimaan'. Dulu detail memakai key yang
  // sama persis dengan useGetPenerimaanHeader, sehingga
  // invalidateQueries('penerimaan') ikut membatalkan cache detail — dan
  // sebaliknya, cache detail ikut di-refetch tiap kali header berubah walau
  // isinya tidak terkait.
  return useQuery(
    ['penerimaandetail', filters],
    async () => await getPenerimaanDetailFn(filters, signal),
    {
      // Jangan fetch saat page < 1 (trik setCurrentPage(0) di grid untuk memaksa
      // refetch). Backend meng-clamp page<1 ke 1, jadi tanpa guard ini halaman 0
      // akan memulangkan halaman 1 dan mengotori window cache.
      enabled:
        (!!filters.filters?.nobukti ||
          !!filters.filters?.pengembaliankasgantung_nobukti) &&
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

export const useCreatePenerimaan = () => {
  const dispatch = useDispatch();
  const { alert } = useAlert();
  const { setError } = useFormError();

  // Sengaja TIDAK invalidateQueries('penerimaan') di sini. Alur onSuccess di
  // GridPenerimaanHeader sudah otoritatif: ia mengambil window baru dari hasil
  // simpan lalu setCurrentPage(pageNumber) yang memicu refetch halaman yang
  // BENAR. invalidateQueries malah me-refetch `currentPage` yang mungkin masih
  // basi; karena useGetPenerimaanHeader memakai staleTime/cacheTime 0, refetch
  // itu selalu jalan, tiba paling akhir, dan menimpa baris + fokus hasil
  // onSuccess -> form seolah tidak memposisikan ke baris yang baru disimpan.
  return useMutation(storePenerimaanFn, {
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
        fallbackTitle: 'GAGAL MENYIMPAN DATA PENERIMAAN'
      });
      dispatch(setProcessed());
    }
  });
};

export const useUpdatePenerimaan = () => {
  const { alert } = useAlert();
  const { setError } = useFormError();

  // Sama seperti useCreatePenerimaan: JANGAN invalidateQueries di sini.
  // onSuccess di GridPenerimaanHeader yang mengatur data + posisi baris.
  return useMutation(updatePenerimaanFn, {
    onError: (error: AxiosError) => {
      handleMutationError(error, {
        alert,
        setError,
        fallbackTitle: 'GAGAL MENGUBAH DATA PENERIMAAN'
      });
    }
  });
};

export const useDeletePenerimaan = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();
  const { setError } = useFormError();

  return useMutation(deletePenerimaanFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('penerimaan');
    },
    onError: (error: AxiosError) => {
      handleMutationError(error, {
        alert,
        setError,
        fallbackTitle: 'GAGAL MENGHAPUS DATA PENERIMAAN'
      });
    }
  });
};
