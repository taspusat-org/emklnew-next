import { AxiosError } from 'axios';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';
import { IErrorResponse } from '../types/pindahbuku.type';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  deletePindahBukuFn,
  getAllPindahBukuFn,
  storePindahBukuFn,
  updatePindahBukuFn
} from '../apis/pindahbuku.api';
import { useDispatch } from 'react-redux';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';

export const useGetAllPindahBuku = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      tglbukti?: string;
      bankdari_text?: string;
      bankke_text?: string;
      coadebet_text?: string;
      coakredit_text?: string;
      alatbayar_text?: string;
      nowarkat?: string;
      tgljatuhtempo?: string;
      keterangan?: string;
      nominal?: string;
      statusformat_text?: string;
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
    ['pindahbuku', filters],
    async () => {
      // Only trigger processing if the page is 1
      if (filters.page === 1) {
        dispatch(setProcessing());
      }

      try {
        const data = await getAllPindahBukuFn(filters, signal);
        return data;
      } catch (error) {
        // Show error toast and dispatch processed
        dispatch(setProcessed());
        throw error;
      } finally {
        // Regardless of success or failure, we dispatch setProcessed after the query finishes
        dispatch(setProcessed());
      }
    },
    {
      enabled: !signal?.aborted
    }
  );
};

export const useCreatePindahBuku = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const { alert } = useAlert();
  const dispatch = useDispatch();

  return useMutation(storePindahBukuFn, {
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries('pindahbuku');
      dispatch(setProcessed());
    },
    onError: (error: AxiosError) => {
      const errorResponse = (error.response?.data as IErrorResponse) ?? {};

      if (errorResponse !== undefined) {
        // Menangani error berdasarkan path

        const errorFields = Array.isArray(errorResponse.message)
          ? errorResponse.message
          : [];

        if (errorResponse.statusCode === 400 && Array.isArray(errorFields)) {
          // Iterasi error message dan set error di form
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
      dispatch(setProcessed());
    }
  });
};

export const useUpdatePindahBuku = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(updatePindahBukuFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('pindahbuku');
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
    }
  });
};

export const useDeletePindahBuku = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deletePindahBukuFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('pindahbuku');
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
