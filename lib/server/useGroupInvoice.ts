import { AxiosError } from 'axios';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  deleteGroupInvoiceFn,
  getAllGroupInvoiceFn,
  storeGroupInvoiceFn,
  updateGroupInvoiceFn
} from '../apis/groupinvoice.api';
import { IErrorResponse } from '../types/groupinvoice.type';
import { useDispatch } from 'react-redux';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';

export const useGetAllGroupInvoice = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nama?: string;
      keterangan?: string;
      statusaktif_nama?: string;
      modifiedby?: string;
      created_at?: string;
      updated_at?: string;
    };
  } = {}
) => {
  return useQuery(
    ['groupinvoice', filters],
    async () => await getAllGroupInvoiceFn(filters)
  );
};

export const useCreateGroupInvoice = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { alert } = useAlert();

  return useMutation(storeGroupInvoiceFn, {
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries('groupinvoice');
      dispatch(setProcessed());
    },
    onError: (error: AxiosError) => {
      const errorResponse = (error.response?.data as IErrorResponse) ?? {};
      dispatch(setProcessed());

      if (errorResponse !== undefined) {
        // Menangani error berdasarkan path
        const errorFields = errorResponse.message || [];
        if (errorResponse.statusCode === 400 && Array.isArray(errorFields)) {
          // Iterasi error message dan set error di form
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0]; // Ambil path error pertama (misalnya 'nama', 'akuntansi_id')

            setError(path, err.message); // Update error di context
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

export const useUpdateGroupInvoice = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(updateGroupInvoiceFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('groupinvoice');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        // Menangani error berdasarkan path
        const errorFields = errorResponse.message || [];

        if (errorResponse.statusCode === 400 && Array.isArray(errorFields)) {
          // Iterasi error message dan set error di form
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0]; // Ambil path error pertama (misalnya 'nama', 'akuntansi_id')
            setError(path, err.message); // Update error di context
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

export const useDeleteGroupInvoice = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteGroupInvoiceFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('groupinvoice');
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
