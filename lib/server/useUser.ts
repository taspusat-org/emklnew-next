import { useMutation, useQuery, useQueryClient } from 'react-query';
import { AxiosError } from 'axios';
import { IErrorResponse } from '../types/user.type';
import { useToast } from '@/hooks/use-toast';
import {
  deleteUserFn,
  getAllUserFn,
  getUserAclFn,
  getUserRoleFn,
  storeUserFn,
  updateUserAclFn,
  updateUserFn,
  updateUserRoleFn
} from '../apis/user.api';
import { useAlert } from '../store/client/useAlert';
import { useFormError } from '../hooks/formErrorContext';

/**
 * Error validasi zod dari backend datang sebagai array { path, message } di
 * field `message`, sementara error biasa mengirim string. Dinormalkan di sini
 * supaya pemanggil bisa langsung meng-iterasi.
 */
const toFieldErrors = (
  response?: IErrorResponse
): { path: string[]; message: string }[] => {
  const message = response?.message as unknown;
  return Array.isArray(message)
    ? (message as { path: string[]; message: string }[])
    : [];
};

export const useGetAllUser = (
  filters: {
    filters?: {
      username?: string;
      name?: string;
      email?: string;
      namakaryawan?: string;
      modifiedby?: string;
      statusaktif?: string;
      created_at?: string;
      updated_at?: string;
    };
    page?: number;
    sortBy?: string;
    sortDirection?: string;
    limit?: number;
    search?: string; // Kata kunci pencarian
  } = {},
  signal?: AbortSignal
) => {
  return useQuery(
    ['users', filters],
    async () => await getAllUserFn(filters, signal),
    {
      // Jangan fetch saat page < 1 (mis. trik setCurrentPage(0) untuk memaksa
      // refetch halaman yang sama pada windowed pagination). Backend menolak
      // page=0 (min 1) → 400. cacheTime:0 tetap menjamin refetch saat page
      // kembali ke nilai valid.
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useCreateUser = () => {
  const { setError } = useFormError();

  // Sengaja TIDAK invalidateQueries('users') di sini. Alur onSuccess di
  // GridUser sudah otoritatif: ia mengambil window baru dari redis lalu
  // setCurrentPage(pageNumber) yang memicu refetch halaman yang BENAR.
  // invalidateQueries malah me-refetch `currentPage` yang mungkin masih basi —
  // hasilnya tiba paling akhir dan menimpa fokus by-id -> baris fokus loncat
  // ke baris 1.
  return useMutation(storeUserFn, {
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;
      if (errorResponse?.statusCode === 400) {
        // Iterasi error message dan set error di form
        toFieldErrors(errorResponse).forEach((err) => {
          const path = err.path[0]; // Ambil path error pertama (mis. 'username')

          setError(path, err.message); // Update error di context
        });
      }
    }
  });
};

export const useUpdateUser = () => {
  const { setError } = useFormError();

  // Sama seperti create: JANGAN invalidateQueries di sini. onSuccess grid yang
  // mengatur data + fokus; invalidateQueries me-refetch currentPage basi yang
  // menimpa fokus -> baris 1.
  return useMutation(updateUserFn, {
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;
      if (errorResponse?.statusCode === 400) {
        toFieldErrors(errorResponse).forEach((err) => {
          const path = err.path[0];

          setError(path, err.message);
        });
      }
    }
  });
};

export const useDeleteUser = () => {
  const { setError } = useFormError();
  const queryClient = useQueryClient();

  return useMutation(deleteUserFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('users');
    },
    onError: (error: AxiosError) => {
      const errorResponse = error.response?.data as IErrorResponse;
      if (errorResponse?.statusCode === 400) {
        toFieldErrors(errorResponse).forEach((err) => {
          const path = err.path[0];

          setError(path, err.message);
        });
      }
    }
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { alert } = useAlert();

  return useMutation(updateUserRoleFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('users');
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

export const useUpdateUserAcl = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { alert } = useAlert();

  return useMutation(updateUserAclFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('users');
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

export const useGetUserRole = (id?: string) => {
  return useQuery(['user-role', id], async () => await getUserRoleFn(id!), {
    enabled: !!id
  });
};

export const useGetUserAcl = (id?: string) => {
  return useQuery(['user-acl', id], async () => await getUserAclFn(id!), {
    enabled: !!id
  });
};
