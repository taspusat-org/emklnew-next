import { useToast } from '@/hooks/use-toast';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from 'react-query';
import {
  deleteParameterFn,
  storeParameterFn,
  updateParameterFn
} from '../apis/parameter.api';
import { AxiosError } from 'axios';
import { IErrorResponse } from '../types/user.type';
import {
  deleteErrorFn,
  getErrorFn,
  storeErrorFn,
  updateErrorFn
} from '../apis/error.api';
import { useAlert } from '../store/client/useAlert';

export const useGetAllError = (
  filters: {
    filters?: {
      kode?: string; // Filter berdasarkan class
      ket?: string; // Filter berdasarkan method
      modifiedby?: string; // Filter berdasarkan nama
    };
    page?: number;
    sortBy?: string;
    sortDirection?: string;
    limit?: number;
    search?: string; // Kata kunci pencarian
  } = {}
) => {
  return useQuery(['errors', filters], async () => await getErrorFn(filters));
};

export const useCreateError = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { alert } = useAlert();

  return useMutation(storeErrorFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('errors');
      toast({
        title: 'Proses Berhasil',
        description: 'Data Berhasil Ditambahkan'
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
export const useUpdateError = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { alert } = useAlert();

  return useMutation(updateErrorFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('errors');
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
export const useDeleteError = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { alert } = useAlert();

  return useMutation(deleteErrorFn, {
    onSuccess: (deletedId) => {
      // Mengupdate cache secara langsung
      queryClient.setQueryData('errors', (oldData: any) => {
        if (!oldData) return oldData; // Jika tidak ada data, kembalikan

        // Filter data yang dihapus
        const newData = oldData.data.filter(
          (error: any) => error.id !== deletedId
        );

        return {
          ...oldData,
          data: newData
        };
      });

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
