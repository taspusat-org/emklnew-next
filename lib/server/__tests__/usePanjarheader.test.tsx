import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';

jest.mock('@/lib/apis/panjarheader.api', () => ({
  getAllPanjarHeaderFn: jest.fn().mockResolvedValue({ data: [] }),
  getPanjarMuatanDetailFn: jest.fn().mockResolvedValue({ data: [] }),
  getPanjarBongkaranDetailFn: jest.fn().mockResolvedValue({ data: [] }),
  storePanjarHeaderFn: jest.fn(),
  updatePanjarHeaderFn: jest.fn(),
  deletePanjarHeaderFn: jest.fn()
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn()
}));

jest.mock('@/lib/hooks/formErrorContext', () => ({
  useFormError: () => ({ setError: jest.fn() })
}));

jest.mock('@/lib/store/client/useAlert', () => ({
  useAlert: () => ({ alert: jest.fn() })
}));

setLogger({
  log: () => undefined,
  warn: () => undefined,
  error: () => undefined
});

import {
  getAllPanjarHeaderFn,
  getPanjarMuatanDetailFn
} from '@/lib/apis/panjarheader.api';
import {
  useGetAllPanjarHeader,
  useGetPanjarMuatanDetail
} from '@/lib/server/usePanjarheader';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
});

/**
 * Grid panjar (header & detail) memakai trik `setCurrentPage(0)` di handleScroll
 * untuk memaksa effect jalan ulang saat halaman tujuan == currentPage yang basi.
 * Fase antara itu TIDAK boleh mengirim request: controller meng-clamp page=0 ke
 * 1, jadi yang balik adalah data halaman 1 yang tersimpan di cache dengan key
 * page=0. Pola ini disamakan dengan useGetAlatbayar/useGetPengeluaranDetail.
 */
describe('useGetPanjarMuatanDetail', () => {
  const panjarId = '02-abc';

  test('tidak fetch saat page = 0 (fase antara setCurrentPage(0))', async () => {
    renderHook(
      () => useGetPanjarMuatanDetail(panjarId, { page: 0, limit: 50 }),
      { wrapper }
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(getPanjarMuatanDetailFn).not.toHaveBeenCalled();
  });

  test('fetch saat page valid', async () => {
    renderHook(
      () => useGetPanjarMuatanDetail(panjarId, { page: 2, limit: 50 }),
      { wrapper }
    );

    await waitFor(() => expect(getPanjarMuatanDetailFn).toHaveBeenCalled());
  });

  // FormPanjarHeader memanggil hook ini TANPA filters karena butuh seluruh
  // detail (payload simpan dibangun dari daftar itu; baris yang tidak terkirim
  // dihapus backend). Guard page tidak boleh ikut mematikannya.
  test('tetap fetch saat dipanggil tanpa filters (jalur FormPanjarHeader)', async () => {
    renderHook(() => useGetPanjarMuatanDetail(panjarId), { wrapper });

    await waitFor(() => expect(getPanjarMuatanDetailFn).toHaveBeenCalled());
  });

  test('tidak fetch saat id kosong', async () => {
    renderHook(() => useGetPanjarMuatanDetail(undefined), { wrapper });

    await new Promise((r) => setTimeout(r, 50));
    expect(getPanjarMuatanDetailFn).not.toHaveBeenCalled();
  });
});

describe('useGetAllPanjarHeader', () => {
  test('tidak fetch saat page = 0', async () => {
    renderHook(() => useGetAllPanjarHeader({ page: 0, limit: 50 }), {
      wrapper
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(getAllPanjarHeaderFn).not.toHaveBeenCalled();
  });

  test('fetch saat page valid', async () => {
    renderHook(() => useGetAllPanjarHeader({ page: 1, limit: 50 }), {
      wrapper
    });

    await waitFor(() => expect(getAllPanjarHeaderFn).toHaveBeenCalled());
  });
});
