'use client';

import React, { createContext, useContext } from 'react';
import { useReportPdf } from '@/hooks/useReportPdf';
import ReportToastContainer from '@/components/custom-ui/ReportToastContainer';
import ReportPdfViewer from '@/components/custom-ui/ReportPdfViewer';

type ReportPdfContextValue = Pick<
  ReturnType<typeof useReportPdf>,
  | 'generateReport'
  | 'generateExport'
  | 'dismissToast'
  | 'openViewer'
  | 'closeViewer'
>;

const ReportPdfContext = createContext<ReportPdfContextValue | null>(null);

/**
 * Dipasang sekali di layout dashboard. Toast dan modal viewer dirender di
 * level ini supaya proses cetak tetap berjalan (dan tetap terlihat) walau
 * user pindah menu setelah menekan Print.
 */
export function ReportPdfProvider({ children }: { children: React.ReactNode }) {
  const {
    toasts,
    viewer,
    generateReport,
    generateExport,
    dismissToast,
    openViewer,
    closeViewer
  } = useReportPdf();

  return (
    <ReportPdfContext.Provider
      value={{
        generateReport,
        generateExport,
        dismissToast,
        openViewer,
        closeViewer
      }}
    >
      {children}

      {/* Toast stack */}
      <ReportToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        onView={openViewer}
        viewerOpen={viewer !== null}
      />

      {/* Modal PDF viewer */}
      <ReportPdfViewer
        isOpen={viewer !== null}
        onClose={closeViewer}
        url={viewer?.url ?? ''}
        title={viewer?.title}
        onExport={viewer?.onExport}
      />
    </ReportPdfContext.Provider>
  );
}

/** Pakai hook ini di grid manapun untuk memicu cetak laporan background. */
export function useReportPdfContext() {
  const ctx = useContext(ReportPdfContext);
  if (!ctx) {
    throw new Error(
      'useReportPdfContext harus dipakai di dalam ReportPdfProvider'
    );
  }
  return ctx;
}
