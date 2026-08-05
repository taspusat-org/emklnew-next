import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportToastContainer from '../ReportToastContainer';
import type { ReportToast } from '@/hooks/useReportPdf';

const baseToast: ReportToast = {
  jobId: 'job-1',
  label: 'Alat Bayar',
  kind: 'pdf',
  step: 'PDF siap!',
  percent: 100,
  status: 'done',
  blobUrl: 'blob:http://localhost/pdf'
};

function renderToast(toast: ReportToast) {
  const onDismiss = jest.fn();
  const onView = jest.fn();
  render(
    <ReportToastContainer
      toasts={[toast]}
      onDismiss={onDismiss}
      onView={onView}
    />
  );
  return { onDismiss, onView };
}

describe('ReportToastContainer', () => {
  test('job pdf yang selesai menawarkan Lihat Laporan dan membuka viewer', async () => {
    const { onView, onDismiss } = renderToast(baseToast);

    await userEvent.click(
      screen.getByRole('button', { name: /lihat laporan/i })
    );

    expect(onView).toHaveBeenCalledWith(
      baseToast.blobUrl,
      baseToast.label,
      undefined
    );
    expect(onDismiss).toHaveBeenCalledWith('job-1');
  });

  test('job excel yang selesai menawarkan Download, bukan Lihat Laporan', async () => {
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const { onView, onDismiss } = renderToast({
      ...baseToast,
      jobId: 'job-2',
      kind: 'excel',
      step: 'Excel siap!',
      blobUrl: 'blob:http://localhost/xlsx',
      filename: 'laporan_alatbayar_20260804.xlsx'
    });

    expect(
      screen.queryByRole('button', { name: /lihat laporan/i })
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /download/i }));

    expect(clickSpy).toHaveBeenCalled();
    // Download tidak membuka viewer PDF, dan toast tetap terbuka supaya file
    // bisa disimpan ulang.
    expect(onView).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  test('viewer terbuka menyembunyikan toast pdf tapi tetap menampilkan progres export', () => {
    render(
      <ReportToastContainer
        toasts={[
          baseToast,
          {
            ...baseToast,
            jobId: 'job-3',
            kind: 'excel',
            step: 'Menulis data ke Excel...',
            percent: 40,
            status: 'processing',
            blobUrl: undefined
          }
        ]}
        onDismiss={jest.fn()}
        onView={jest.fn()}
        viewerOpen
      />
    );

    // Export dipicu dari toolbar viewer, jadi progresnya harus tetap terlihat.
    expect(screen.getByText('Menulis data ke Excel...')).toBeInTheDocument();
    expect(screen.queryByText('PDF siap!')).not.toBeInTheDocument();
  });
});
