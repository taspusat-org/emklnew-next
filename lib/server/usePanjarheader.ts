import { AxiosError } from 'axios';
import { useDispatch } from 'react-redux';
import { useAlert } from '../store/client/useAlert';
import { IErrorResponse } from '../types/blheader.type';
import { useFormError } from '../hooks/formErrorContext';
import { useMutation, useQuery, useQueryClient } from 'react-query';
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
      enabled: !signal?.aborted
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
  return useQuery(
    ['panjarheader', id, filters],
    async () => await getPanjarMuatanDetailFn(id!, filters),
    {
      enabled: !!id || !signal?.aborted // Hanya aktifkan query jika tab aktif adalah "pengalamankerja"
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
      void queryClient.invalidateQueries(['panjarheader']);
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
      void queryClient.invalidateQueries('panjarheader');
      dispatch(setProcessed());
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        const errorFields = Array.isArray(errorResponse.message)
          ? errorResponse.message
          : [];

        if (errorResponse.statusCode === 400 && Array.isArray(errorFields)) {
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
      void queryClient.invalidateQueries('panjarheader');
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
