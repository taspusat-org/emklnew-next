import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useToast } from '@/hooks/use-toast';
import { IErrorResponse } from '../types/user.type';
import { AxiosError } from 'axios';
import {
  deleteMenuFn,
  getMenuFn,
  getMenuSidebarFn,
  getMenuSidebarWithSearchFn,
  storeMenuFn,
  updateMenuFn,
  updateMenuResequenceFn
} from '../apis/menu.api';
import { useAlert } from '../store/client/useAlert';

export const useGetMenuSidebar = () => {
  return useQuery('menu-sidebar', getMenuSidebarFn);
};

export const useGetMenu = (
  filters: {
    filters?: {
      title?: string;
      parent_nama?: string;
      icon?: string;
      statusaktif?: string;
      modifiedby?: string;
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
    ['menus', filters],
    async () => await getMenuFn(filters, signal),
    {
      // Jangan fetch saat page < 1 (mis. trik setCurrentPage(0) untuk memaksa
      // refetch). Backend menolak page=0 (min 1) → 400. cacheTime:0 tetap
      // menjamin refetch saat page kembali ke nilai valid.
      enabled: !signal?.aborted && (filters.page ?? 1) >= 1,
      staleTime: 0,
      cacheTime: 0
    }
  );
};

export const useGetSearchMenu = (
  filters: {
    userId?: string;
    search?: string;
  } = {}
) => {
  return useQuery(
    ['menu-search', filters],
    async () => await getMenuSidebarWithSearchFn(filters),
    {
      enabled: !!filters.userId // ← tambah guard userId
    }
  );
};
// lib/server/useMenu.ts
export async function getMenus() {
  // Implement the logic to fetch menus (e.g., from the database)
  const data = await getMenuSidebarFn();
  return data.data;
}

export const useCreateMenu = () => {
  const { toast } = useToast();
  const { alert } = useAlert();

  // Sengaja TIDAK invalidateQueries('menus') di sini. Alur onSuccess di GridMenu
  // sudah otoritatif: ia mengambil window baru dari redis lalu
  // setCurrentPage(pageNumber) yang memicu refetch halaman yang BENAR.
  // invalidateQueries malah me-refetch `currentPage` yang mungkin masih basi —
  // hasilnya tiba paling akhir dan menimpa fokus by-id -> baris fokus loncat ke
  // baris 1.
  return useMutation(storeMenuFn, {
    onSuccess: () => {
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

export const useDeleteMenu = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation(deleteMenuFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('menus');
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
export const useUpdateMenu = () => {
  const { toast } = useToast();

  // Sama seperti create: JANGAN invalidateQueries di sini. onSuccess grid yang
  // mengatur data + fokus; invalidateQueries me-refetch currentPage basi yang
  // menimpa fokus -> baris 1.
  return useMutation(updateMenuFn, {
    onSuccess: () => {
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

export const useUpdateMenuResequence = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation(updateMenuResequenceFn, {
    onSuccess: () => {
      void queryClient.invalidateQueries('menu-resequence');
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
