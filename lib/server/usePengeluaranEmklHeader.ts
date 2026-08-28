import { useToast } from '@/hooks/use-toast';
import { AxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useDispatch } from 'react-redux';
import {
  storePenerimaanFn,
  updatePenerimaanFn,
  deletePenerimaanFn
} from '../apis/penerimaan.api';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';
import { IErrorResponse } from '../types/user.type';
import {
  getPengeluaranEmklDetailFn,
  getPengeluaranEmklHeaderFn,
  getPengeluaranEmklPengembalianFn,
  storePengeluaranEmklHeaderFn,
  updatePengeluaranEmklHeaderFn
} from '../apis/pengeluaranemklheader.api';
import { getPengeluaranEmklListFn } from '../apis/pengeluaranemkl.api';
import { useFormError } from '../hooks/formErrorContext';
import { useAlert } from '../store/client/useAlert';

export const useGetPengeluaranEmklHeader = (
  filters: {
    filters?: {
      nobukti?: string;
      tglbukti?: string;
      tgljatuhtempo?: string;
      keterangan?: string | null;
      tglDari?: string | null;
      tglSampai?: string | null;
    };
    page?: number;
    sortBy?: string;
    sortDirection?: string;
    limit?: number;
    search?: string; // Kata kunci pencarian
  } = {}
) => {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useQuery(
    ['pengeluaranemklheader', filters],
    async () => {
      // Only trigger processing if the page is 1
      if (filters.page === 1) {
        dispatch(setProcessing());
      }

      try {
        const data = await getPengeluaranEmklHeaderFn(filters);
        return data;
      } catch (error) {
        // Show error toast and dispatch processed
        dispatch(setProcessed());
        alert({
          title: 'Gagal',
          variant: 'danger',
          submitText: 'OK'
        });
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
      }
    }
  );
};
export const useCreatePengeluaranEmklHeader = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { alert } = useAlert();

  const { setError } = useFormError();

  return useMutation(storePengeluaranEmklHeaderFn, {
    // before the mutation fn runs
    onMutate: () => {
      dispatch(setProcessing());
    },
    // on success, invalidate + toast + clear loading
    onSuccess: () => {
      void queryClient.invalidateQueries(['pengeluaranemklheader']);
      alert({
        variant: 'success',
        submitText: 'OK',
        title: 'Data Berhasil Ditambahkan'
      });
      dispatch(setProcessed());
    },
    // on error, toast + clear loading
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;
      if (errorResponse !== undefined) {
        // Menangani error berdasarkan path
        const errorFields = Array.isArray(errorResponse.message)
          ? errorResponse.message
          : [];

        if (errorResponse.statusCode === 400 && Array.isArray(errorFields)) {
          // Iterasi error message dan set error di form
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0]; // Ambil path error pertama (misalnya 'nama', 'akuntansi_id')
            setError(path, err.message); // Update error di context
          });
        } else {
          alert({
            variant: 'danger',
            submitText: 'OK',
            title:
              'TERJADI MASALAH DENGAN PERMINTAAN ANDA, SILAHKAN COBA BEBERAPA SAAT LAGI'
          });
        }
      }
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
export const useGetPengeluaranEmklDetail = (
  filters: {
    filters?: {
      nobukti?: string;
      tglbukti?: string;
      keterangan?: string | null;
    };
    sortBy?: string;
    sortDirection?: string;
    search?: string; // Kata kunci pencarian
  } = {}
) => {
  return useQuery(
    ['pengeluaranemkl', filters],
    async () => await getPengeluaranEmklDetailFn(filters),
    {
      enabled: !!filters.filters?.nobukti
    }
  );
};

export const useUpdatePengeluaranEmklHeader = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation(updatePengeluaranEmklHeaderFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('pengeluaranemkl');
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
export const useDeletePenerimaan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation(deletePenerimaanFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('penerimaan');
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
export const useGetPengeluaranEmklHeaderList = (
  params: { dari: string; sampai: string } = { dari: '', sampai: '' },
  popOver: boolean
) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useQuery(
    ['pengeluaranemklheaderlist', params],
    async () => {
      try {
        const data = await getPengeluaranEmklListFn(params.dari, params.sampai);
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
export const useGetPengeluaranEmklHeaderPengembalian = (
  params: { dari: string; sampai: string; id: string } = {
    dari: '',
    sampai: '',
    id: ''
  },
  popOver: boolean // Menambahkan argumen popOver untuk kontrol kondisi fetch
) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useQuery(
    ['pengeluaranemklheaderpengembalian', params],
    async () => {
      try {
        const data = await getPengeluaranEmklPengembalianFn(
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
