import { useMutation, useQuery, useQueryClient } from 'react-query';
import { IErrorResponse } from '../types/user.type';
import { AxiosError } from 'axios';
import {
  deleteConsigneeFn,
  getConsigneeBiayaFn,
  getConsigneeDetailFn,
  getConsigneeFn,
  getConsigneeHargaJualFn,
  storeConsigneeFn,
  updateConsigneeFn
} from '../apis/consignee.api';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';
import {
  filterConsignee,
  filterConsigneeBiaya,
  filterConsigneeDetail,
  filterConsigneeHargaJual
} from '../types/consignee.type';

export const useGetConsignee = (
  filters: {
    filters?: typeof filterConsignee;
    page?: number;
    sortBy?: string;
    sortDirection?: string;
    limit?: number;
    search?: string;
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['consignee', filters],
    async () => await getConsigneeFn(filters, signal),
    {
      enabled: !signal?.aborted
    }
  );
};

export const useCreateConsignee = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();
  const { alert } = useAlert();

  return useMutation(storeConsigneeFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('consignee');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        if (errorResponse.statusCode === 400) {
          const messages = Array.isArray(errorResponse.message)
            ? errorResponse.message
            : [{ path: ['form'], message: errorResponse.message }];

          messages.forEach((err) => {
            const path = err.path?.[0] ?? 'form';
            setError(path, err.message);
          });
        }
      }
    }
  });
};

export const useDeleteConsignee = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();

  return useMutation(deleteConsigneeFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('consignee');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        const errorFields = errorResponse.message || [];
        if (errorResponse.statusCode === 400 && Array.isArray(errorFields)) {
          errorFields?.forEach((err: { path: string[]; message: string }) => {
            const path = err.path[0];
            setError(path, err.message);
          });
        }
      }
    }
  });
};

export const useUpdateConsignee = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();

  return useMutation(updateConsigneeFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('consignee');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;

      if (errorResponse !== undefined) {
        if (errorResponse.statusCode === 400) {
          const messages = Array.isArray(errorResponse.message)
            ? errorResponse.message
            : [{ path: ['form'], message: errorResponse.message }];

          messages.forEach((err) => {
            const path = err.path?.[0] ?? 'form';
            setError(path, err.message);
          });
        }
      }
    }
  });
};
export const useGetConsigneeDetail = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: typeof filterConsigneeDetail;
  } = {}
) => {
  return useQuery(
    ['consignee', filters],
    async () => await getConsigneeDetailFn(filters),
    {
      enabled: !!filters.filters?.consignee_id
    }
  );
};
export const useGetConsigneeBiaya = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: typeof filterConsigneeBiaya;
  } = {}
) => {
  return useQuery(
    ['consignee', filters],
    async () => await getConsigneeBiayaFn(filters),
    {
      enabled: !!filters.filters?.consignee_id
    }
  );
};
export const useGetConsigneeHargaJual = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
    filters?: typeof filterConsigneeHargaJual;
  } = {}
) => {
  return useQuery(
    ['consignee', filters],
    async () => await getConsigneeHargaJualFn(filters),
    {
      enabled: !!filters.filters?.consignee_id
    }
  );
};
