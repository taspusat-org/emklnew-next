import { AxiosError } from 'axios';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';
import { IErrorResponse } from '../types/pengeluaranemkl.type';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  deletePengeluaranEmklFn,
  getAllPengeluaranEmklFn,
  storePengeluaranEmklFn,
  updatePengeluaranEmklFn
} from '../apis/pengeluaranemkl.api';

export const useGetAllPengeluaranEmkl = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nama?: string;
      keterangan?: string;
      coadebet_text?: string;
      coakredit_text?: string;
      coabankdebet_text?: string;
      coabankkredit_text?: string;
      coahutangdebet_text?: string;
      coahutangkredit_text?: string;
      format_text?: string;
      statusaktif_text?: string;
      modifiedby?: string;
      created_at?: string;
      updated_at?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['pengeluaranemkl', filters],
    async () => await getAllPengeluaranEmklFn(filters, signal),
    {
      enabled: !signal?.aborted
    }
  );
};

export const useCreatePengeluaranEmkl = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(storePengeluaranEmklFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('pengeluaranemkl');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        // Menangani error berdasarkan path

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

export const useUpdatePengeluaranEmkl = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(updatePengeluaranEmklFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('pengeluaranemkl');
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

export const useDeletePengeluaranEmkl = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deletePengeluaranEmklFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('pengeluaranemkl');
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
