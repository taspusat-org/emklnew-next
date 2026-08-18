import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';

jest.mock('@/lib/apis/shippinginstruction.api', () => ({
  getAllShippingInstructionHeaderFn: jest.fn().mockResolvedValue({ data: [] }),
  getShippingInstructionDetailFn: jest.fn().mockResolvedValue({ data: [] }),
  getShippingInstructionDetailRincianFn: jest
    .fn()
    .mockResolvedValue({ data: [] }),
  storeShippingInstructionFn: jest.fn(),
  updateShippingInstructionFn: jest.fn(),
  deleteShippingInstructionFn: jest.fn()
}));

jest.mock('@/lib/apis/blheader.api', () => ({
  getAllBlHeaderHeaderFn: jest.fn().mockResolvedValue({ data: [] }),
  getBlDetailFn: jest.fn().mockResolvedValue({ data: [] }),
  getBlDetailRincianFn: jest.fn().mockResolvedValue({ data: [] }),
  getBlRincianBiayaFn: jest.fn().mockResolvedValue({ data: [] }),
  prosesBlFn: jest.fn(),
  prosesBlRincianBiayaFn: jest.fn(),
  storeBlHeaderFn: jest.fn(),
  updateBlHeaderFn: jest.fn(),
  deleteBlHeaderFn: jest.fn()
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

import { getAllShippingInstructionHeaderFn } from '@/lib/apis/shippinginstruction.api';
import { getAllBlHeaderHeaderFn, getBlDetailFn } from '@/lib/apis/blheader.api';
import { useGetAllShippingInstructionHeader } from '@/lib/server/useShippingIntruction';
import { useGetAllBlHeader, useGetBlDetail } from '@/lib/server/useBlHeader';

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

describe('useGetAllShippingInstructionHeader', () => {
  test('tidak fetch saat page = 0 (fase antara setCurrentPage(0))', async () => {
    renderHook(
      () => useGetAllShippingInstructionHeader({ page: 0, limit: 50 }),
      {
        wrapper
      }
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(getAllShippingInstructionHeaderFn).not.toHaveBeenCalled();
  });

  test('fetch saat page valid', async () => {
    renderHook(
      () => useGetAllShippingInstructionHeader({ page: 2, limit: 50 }),
      {
        wrapper
      }
    );

    await waitFor(() =>
      expect(getAllShippingInstructionHeaderFn).toHaveBeenCalled()
    );
  });

  test('tetap fetch saat dipanggil tanpa filters', async () => {
    renderHook(() => useGetAllShippingInstructionHeader(), { wrapper });

    await waitFor(() =>
      expect(getAllShippingInstructionHeaderFn).toHaveBeenCalled()
    );
  });
});

describe('useGetAllBlHeader', () => {
  test('tidak fetch saat page = 0', async () => {
    renderHook(() => useGetAllBlHeader({ page: 0, limit: 30 }), { wrapper });

    await new Promise((r) => setTimeout(r, 50));
    expect(getAllBlHeaderHeaderFn).not.toHaveBeenCalled();
  });

  test('fetch saat page valid', async () => {
    renderHook(() => useGetAllBlHeader({ page: 1, limit: 30 }), { wrapper });

    await waitFor(() => expect(getAllBlHeaderHeaderFn).toHaveBeenCalled());
  });
});

describe('useGetBlDetail', () => {
  test('tidak fetch saat id kosong (hindari request /bldetail/0)', async () => {
    renderHook(() => useGetBlDetail(undefined, { page: 1, limit: 50 }), {
      wrapper
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(getBlDetailFn).not.toHaveBeenCalled();
  });

  test('tidak fetch saat page = 0 (fase antara setCurrentPage(0))', async () => {
    renderHook(() => useGetBlDetail('11', { page: 0, limit: 50 }), { wrapper });

    await new Promise((r) => setTimeout(r, 50));
    expect(getBlDetailFn).not.toHaveBeenCalled();
  });

  test('fetch saat id & page valid', async () => {
    renderHook(() => useGetBlDetail('11', { page: 2, limit: 50 }), { wrapper });

    await waitFor(() => expect(getBlDetailFn).toHaveBeenCalled());
  });
});
