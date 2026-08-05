import { useQuery } from 'react-query';
import { getAcosFn, getAllAcosFn } from '../apis/acos.api';

export const useGetAcos = () => {
  return useQuery('acos', getAcosFn);
};
export const useGetAllAcos = (
  filters: {
    limit?: number; // Batas jumlah data yang diambil
    page?: number; // Halaman untuk pagination
    sortColumn?: string;
    sortOrder?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    filters?: {
      class?: string; // Filter berdasarkan class
      method?: string; // Filter berdasarkan method
      nama?: string; // Filter berdasarkan nama
    };
    search?: string; // Kata kunci pencarian
  } = {},
  popOver: boolean // Nilai popover
) => {
  return useQuery(['acos', filters], () => getAllAcosFn(filters), {
    enabled: popOver
  });
};
