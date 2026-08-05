/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Smoke test: memastikan GridTypeAkuntansi bisa mount tanpa error inisialisasi.
 * Menangkap kelas bug "Cannot access 'X' before initialization" (TDZ) yang
 * muncul kalau deps array useMemo/useCallback menyebut const yang dideklarasikan
 * lebih bawah — tsc & next build TIDAK menangkap ini karena murni runtime.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import { FormErrorProvider } from '@/lib/hooks/formErrorContext';
import { makeTestStore } from '@/lib/test-utils/formHarness';

jest.mock('@/hooks/ReportPdfProvider', () => ({
  useReportPdfContext: () => ({
    generateReport: jest.fn(),
    dismissToast: jest.fn(),
    openViewer: jest.fn(),
    closeViewer: jest.fn()
  })
}));

jest.mock('@/lib/utils/AxiosInstance', () => ({
  api: { get: jest.fn().mockResolvedValue({ data: [] }) },
  api2: {
    get: jest.fn().mockResolvedValue({ data: [] }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} })
  }
}));

jest.mock('@/lib/apis/typeakuntansi.api', () => ({
  getAllTypeAkuntansiFn: jest.fn().mockResolvedValue({
    data: [
      {
        id: 'row-1',
        nama: 'TYPE AKUNTANSI SATU',
        order: 7,
        keterangan: 'KETERANGAN SATU',
        statusaktif: '1',
        statusaktif_text: 'AKTIF',
        akuntansi_id: 1,
        akuntansi_nama: 'AKUNTANSI SATU',
        modifiedby: 'tester',
        created_at: '03-08-2026 09:00:00',
        updated_at: '03-08-2026 09:00:00',
        memo: JSON.stringify({
          MEMO: 'AKTIF',
          SINGKATAN: 'A',
          WARNA: '#cbf3e5',
          WARNATULISAN: '#0f5132'
        })
      }
    ],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 1,
      itemsPerPage: 50
    }
  }),
  exportTypeAkuntansiFn: jest.fn(),
  checkValidationTypeAkuntansiFn: jest.fn()
}));

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light' })
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signIn: jest.fn(),
  signOut: jest.fn()
}));

import GridTypeAkuntansi from '../GridTypeAkuntansi';

function renderGrid() {
  const store = makeTestStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <FormErrorProvider>
          <GridTypeAkuntansi />
        </FormErrorProvider>
      </QueryClientProvider>
    </Provider>
  );
}

it('mounts without initialization errors', () => {
  renderGrid();
  expect(screen.getByPlaceholderText('Type to search...')).toBeInTheDocument();
});

/**
 * Sel harus memakai atribut `title` bawaan browser (pola GridGroupbiayaextra),
 * bukan Radix Tooltip. Selain beda tampilan, satu TooltipProvider per sel
 * sangat mahal di grid ini karena enableVirtualization={false} menahan seluruh
 * window (5 halaman) tetap ter-mount.
 */
it('renders cells with native title tooltips, not radix tooltips', async () => {
  const { container } = renderGrid();

  const cell = await waitFor(() => {
    const el = container.querySelector('[title="TYPE AKUNTANSI SATU"]');
    if (!el) throw new Error('cell belum ter-render');
    return el as HTMLElement;
  });

  expect(cell).toHaveClass(
    'm-0',
    'flex',
    'h-full',
    'cursor-pointer',
    'items-center',
    'p-0',
    'text-sm'
  );

  // Kolom teks lain memakai pola yang sama.
  ['KETERANGAN SATU', 'AKUNTANSI SATU', 'tester', '7'].forEach((v) => {
    expect(container.querySelector(`[title="${v}"]`)).not.toBeNull();
  });

  // Sel status aktif: title dari memo + warna tulisan ikut memo.
  const status = container.querySelector('[title="AKTIF"]');
  expect(status).not.toBeNull();
  expect(status?.querySelector('p')).toHaveStyle({ color: '#0f5132' });

  // Header juga membawa title.
  expect(
    container.querySelector('[title="NAMA TYPE AKUNTANSI"]')
  ).not.toBeNull();
  expect(container.querySelector('[title="STATUS AKTIF"]')).not.toBeNull();

  // Tidak ada sisa Radix Tooltip di grid.
  expect(
    container.querySelector('[data-radix-popper-content-wrapper]')
  ).toBeNull();
});
