import { AxiosError } from 'axios';
import { useDispatch } from 'react-redux';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  setProcessed,
  setProcessing
} from '../store/loadingSlice/loadingSlice';
import {
  deleteShippingInstructionFn,
  getAllShippingInstructionHeaderFn,
  getShippingInstructionDetailFn,
  getShippingInstructionDetailRincianFn,
  storeShippingInstructionFn,
  updateShippingInstructionFn
} from '../apis/shippinginstruction.api';
import { IErrorResponse } from '../types/shippingIntruction.type';

export const useGetAllShippingInstructionHeader = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      voyberangkat?: string;
      pelayaran_text?: string;
      kapal_text?: string;
      closing?: string;
      tglberangkat?: string;
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
  const { alert } = useAlert();
  const queryClient = useQueryClient();

  return useQuery(
    ['shippinginstruction', filters],
    async () => {
      // Only trigger processing if the page is 1
      if (filters.page === 1) {
        dispatch(setProcessing());
      }

      try {
        const data = await getAllShippingInstructionHeaderFn(filters, signal);
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

export const useGetShippingInstructionDetail = (
  id?: string,
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      tglbukti?: string;
      detail_nobukti?: string;
      asalpelabuhan?: string;
      keterangan?: string;
      consignee?: string;
      shipper?: string;
      comodity?: string;
      notifyparty?: string;
      statuspisahbl_text?: string;
      emkllain_text?: string;
      containerpelayaran_text?: string;
      tujuankapal_text?: string;
      daftarbl_text?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['shippinginstruction', id, filters],
    async () => await getShippingInstructionDetailFn(id!, filters),
    {
      enabled: !!id || !signal?.aborted
    }
  );
};

export const useGetShippingInstructionDetailRincian = (
  id?: string,
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: {
      nobukti?: string;
      detail_nobukti?: string;
      orderanmuatan_nobukti?: string;
      comodity?: string;
      keterangan?: string;
    };
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['shippinginstruction', id, filters],
    async () => await getShippingInstructionDetailRincianFn(id!, filters),
    {
      enabled: !!id || !signal?.aborted
    }
  );
};

export const useCreateShippingInstruction = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { alert } = useAlert();

  return useMutation(storeShippingInstructionFn, {
    // before the mutation fn runs
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      // on success, invalidate + clear loading
      void queryClient.invalidateQueries(['shippinginstruction']);
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

export const useUpdateShippingInstruction = () => {
  const { setError } = useFormError(); // Mengambil setError dari context
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { alert } = useAlert();

  return useMutation(updateShippingInstructionFn, {
    onMutate: () => {
      dispatch(setProcessing());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries('shippinginstruction');
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

export const useDeleteShippingInstruction = () => {
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(deleteShippingInstructionFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('shippinginstruction');
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
