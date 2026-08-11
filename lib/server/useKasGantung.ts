import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  deleteKasGantungFn,
  getKasGantungDetailFn,
  getKasGantungHeaderFn,
  getKasgantungListFn,
  getKasgantungPengembalianFn,
  storeKasGantungFn,
  updateKasGantungFn
} from '../apis/kasgantungheader.api';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';
import { useToast } from '@/hooks/use-toast';
import { useDispatch } from 'react-redux';
import { AxiosError } from 'axios';
import { IErrorResponse } from '../types/user.type';
import { useAlert } from '../store/client/useAlert';

export const useGetKasGantungHeader = (
  filters: {
    filters?: {
      nobukti?: string;
      tglbukti?: string;
      keterangan?: string | null;
      bank_id?: number | null;
      relasi_nama?: string | null;
      alatbayar_nama?: string | null;
      pengeluaran_nobukti?: string | null;
      coakaskeluar?: string | null;
      dibayarke?: string | null;
      nowarkat?: string | null;
      tgljatuhtempo?: string | null;
      gantungorderan_nobukti?: string | null;
      modifiedby?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
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
    ['kasgantung', filters],
    async () => await getKasGantungHeaderFn(filters, signal),
    {
      // Guard page >= 1 disamakan dengan useGetJurnalUmumHeader.
      // GridKasGantungHeader memakai trik setCurrentPage(0) di handleScroll
      // untuk memaksa effect jalan ulang saat halaman tujuan kebetulan ==
      // currentPage yang basi. Tanpa guard ini, fase antara itu benar-benar
      // mengirim request page=0; FindAllSchema meng-clamp-nya ke 1, jadi yang
      // balik adalah data halaman 1 yang lalu tersimpan ke pageDataCache dengan
      // key 0 — satu request sia-sia plus entri cache yang tidak pernah
      // dirender.
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      // staleTime/cacheTime 0: window pagination dikelola sendiri oleh grid.
      // Tanpa ini refetch pasca-update sempat memakai cache lama sehingga baris
      // yang baru disimpan tampil dengan nilai basi.
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useGetKasGantungDetail = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      keterangan?: string;
      nominal?: string;
      modifiedby?: string;
      created_at?: string;
      updated_at?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  // Key 'kasgantungdetail', BUKAN 'kasgantung'. Dulu detail memakai key yang
  // sama persis dengan useGetKasGantungHeader, sehingga
  // invalidateQueries('kasgantung') ikut membatalkan cache detail — dan
  // sebaliknya, cache detail ikut di-refetch tiap kali header berubah walau
  // isinya tidak terkait. Sama seperti usePengeluaran / useJurnalUmum.
  return useQuery(
    ['kasgantungdetail', filters],
    async () => await getKasGantungDetailFn(filters, signal),
    {
      // Jangan fetch saat page < 1 (trik setCurrentPage(0) di grid untuk memaksa
      // refetch). Backend meng-clamp page<1 ke 1, jadi tanpa guard ini halaman 0
      // memulangkan halaman 1 dan mengotori window cache.
      enabled:
        !!filters.filters?.nobukti &&
        !signal?.aborted &&
        (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};
export const useCreateKasGantung = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const { alert } = useAlert();

  // Sengaja TIDAK invalidateQueries('kasgantung') di sini. Alur onSuccess di
  // GridKasGantungHeader sudah otoritatif: ia mengambil window baru dari redis
  // lalu setCurrentPage(pageNumber) yang memicu refetch halaman yang BENAR.
  // invalidateQueries malah me-refetch `currentPage` yang mungkin masih basi;
  // karena useGetKasGantungHeader memakai staleTime/cacheTime 0, refetch itu
  // selalu jalan, tiba paling akhir, dan menimpa baris + fokus hasil onSuccess.
  // Sama seperti useCreateJurnalUmum.
  return useMutation(storeKasGantungFn, {
    // before the mutation fn runs
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      // Kas gantung membuat bukti pengeluaran & jurnal umum sebagai efek
      // samping, jadi grid detail di tab lain harus ikut disegarkan.
      void queryClient.invalidateQueries('kasgantungdetail');
      void queryClient.invalidateQueries('pengeluarandetail');
      void queryClient.invalidateQueries('jurnalumumdetail');
      toast({
        title: 'Proses Berhasil',
        description: 'Data Berhasil Ditambahkan'
      });
      dispatch(setProcessed());
    },
    // on error, toast + clear loading
    onError: (error: AxiosError) => {
      const err = (error.response?.data as IErrorResponse) ?? {};
      alert({
        title: err.message ?? 'Gagal',
        variant: 'danger',
        submitText: 'OK'
      });
      dispatch(setProcessed());
    }
  });
};
export const useGetKasGantungHeaderList = (
  params: { dari: string; sampai: string } = { dari: '', sampai: '' },
  popOver: boolean
) => {
  const { toast } = useToast();
  const { alert } = useAlert();
  const queryClient = useQueryClient();

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
  const { toast } = useToast();
  const { alert } = useAlert();
  const queryClient = useQueryClient();

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
export const useUpdatePengembalianKasGantung = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { alert } = useAlert();

  // Seperti useUpdateJurnalUmum: JANGAN invalidate key header 'kasgantung'.
  // onSuccess di GridKasGantungHeader yang mengatur data + posisi baris;
  // refetch dari invalidate mendarat belakangan dan menimpa fokus tersebut
  // (gejala "setelah update grid balik ke baris 1").
  return useMutation(updateKasGantungFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('kasgantungdetail');
      void queryClient.invalidateQueries('pengeluaran');
      void queryClient.invalidateQueries('pengeluarandetail');
      // Tab yang dirender di halaman ini adalah jurnal umum DETAIL, jadi key-nya
      // 'jurnalumumdetail' sejak key detail dipisah dari header di useJurnalUmum.
      void queryClient.invalidateQueries('jurnalumumdetail');
      toast({
        title: 'Proses Berhasil.',
        description: 'Data Berhasil Diubah.'
      });
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
export const useDeleteKasGantung = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { alert } = useAlert();

  return useMutation(deleteKasGantungFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('kasgantung');
      void queryClient.invalidateQueries('kasgantungdetail');
      void queryClient.invalidateQueries('pengeluaran');
      void queryClient.invalidateQueries('pengeluarandetail');
      void queryClient.invalidateQueries('jurnalumumdetail');
      toast({
        title: 'Proses Berhasil.',
        description: 'Data Berhasil Dihapus.'
      });
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
