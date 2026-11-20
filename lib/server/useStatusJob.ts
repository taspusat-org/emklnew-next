import { AxiosError } from 'axios';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { IErrorResponse } from '../types/statusJob.type';
import {
  deleteStatusJobFn,
  getAllStatusJobFn,
  getStatusJobMasukGudangByTglStatusFn,
  storeStatusJobFn,
  updateStatusJobFn
} from '../apis/statusjob.api';
import { useDispatch } from 'react-redux';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';

export const useGetAllStatusJob = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      tglstatus?: string;
      tglDari?: string | null;
      tglSampai?: string | null;
    };
  } = {},
  signal?: AbortSignal
) => {
  const dispatch = useDispatch();
  const { alert } = useAlert();
  const queryClient = useQueryClient();

  return useQuery(
    ['statusjob', filters],
    async () => {
      // Only trigger processing if the page is 1
      if (filters.page === 1) {
        dispatch(setProcessing());
      }

      try {
        const data = await getAllStatusJobFn(filters, signal);
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

export const useGetAllStatusJobMasukGudangByTglStatus = (
  tglstatus: string,
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      job_text?: string;
      tglorder?: string;
      nocontainer?: string;
      noseal?: string;
      shipper_text?: string;
      nosp?: string;
      lokasistuffing_text?: string;
      keterangan?: string;
      jenisOrderan?: string;
      jenisStatusJob?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['statusjob', tglstatus, filters],
    async () =>
      await getStatusJobMasukGudangByTglStatusFn(tglstatus, filters, signal),
    {
      enabled: !signal?.aborted || !tglstatus
    }
  );
};

export const useCreateStatusJob = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const { alert } = useAlert();
  const dispatch = useDispatch();

  return useMutation(storeStatusJobFn, {
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries('statusjob');
      dispatch(setProcessed());
    },
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

export const useUpdateStatusJob = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(updateStatusJobFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('statusjob');
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

export const useDeleteStatusJob = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteStatusJobFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('statusjob');
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
