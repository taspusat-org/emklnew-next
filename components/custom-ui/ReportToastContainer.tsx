'use client';

import React from 'react';
import { ReportExportHandler, ReportToast } from '@/hooks/useReportPdf';
import {
  X,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  toasts: ReportToast[];
  onDismiss: (jobId: string) => void;
  onView: (url: string, title: string, onExport?: ReportExportHandler) => void;
  /** Saat modal viewer terbuka, toast PDF disembunyikan agar tidak menutupi PDF. */
  viewerOpen?: boolean;
}

export default function ReportToastContainer({
  toasts,
  onDismiss,
  onView,
  viewerOpen = false
}: Props) {
  // Toast PDF disembunyikan selama viewer terbuka — isinya laporan yang justru
  // sedang dibaca. Toast export Excel TETAP tampil: export dipicu dari tombol
  // Export di toolbar viewer, jadi progres & tombol Download-nya tidak berguna
  // kalau ikut tersembunyi sampai viewer ditutup.
  const visibleToasts = viewerOpen
    ? toasts.filter((toast) => toast.kind === 'excel')
    : toasts;

  if (visibleToasts.length === 0) return null;

  return (
    // `pointer-events-none` di wadah + `pointer-events-auto` di tiap kartu:
    // saat modal viewer terbuka, Radix Dialog memasang `pointer-events: none`
    // di <body>, jadi kartu toast harus mengaktifkan ulang pointer-nya sendiri
    // supaya tombol Download tetap bisa diklik. `data-report-toast` dipakai
    // viewer untuk mengenali klik ini sebagai klik "di dalam" (lihat
    // ReportPdfViewer) agar modal tidak ikut tertutup.
    <div
      data-report-toast=""
      className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2"
      aria-live="polite"
    >
      {visibleToasts.map((toast) => (
        <ReportToastItem
          key={toast.jobId}
          toast={toast}
          onDismiss={onDismiss}
          onView={onView}
        />
      ))}
    </div>
  );
}

function ReportToastItem({
  toast,
  onDismiss,
  onView
}: {
  toast: ReportToast;
  onDismiss: (jobId: string) => void;
  onView: (url: string, title: string, onExport?: ReportExportHandler) => void;
}) {
  const isDone = toast.status === 'done';
  const isError = toast.status === 'error';
  const isLoading =
    toast.status === 'connecting' ||
    toast.status === 'processing' ||
    toast.status === 'fetching';

  const headerBg = isDone
    ? 'bg-green-50 dark:bg-green-950/40'
    : isError
    ? 'bg-red-50 dark:bg-red-950/40'
    : 'bg-blue-50 dark:bg-blue-950/40';
  const borderColor = isDone
    ? 'border-green-200 dark:border-green-800/60'
    : isError
    ? 'border-red-200 dark:border-red-800/60'
    : 'border-blue-200 dark:border-blue-800/60';
  const stepColor = isDone
    ? 'text-green-700 dark:text-green-300'
    : isError
    ? 'text-red-600 dark:text-red-300'
    : 'text-blue-700 dark:text-blue-300';
  const barColor = isDone
    ? 'bg-green-500 dark:bg-green-400'
    : 'bg-blue-500 dark:bg-blue-400';

  const isExcel = toast.kind === 'excel';

  const handleView = () => {
    // Buka viewer dulu (blobUrl pindah ke state viewer), baru hapus toast —
    // aman karena dismissToast tidak me-revoke url-nya (khusus job pdf).
    onView(toast.blobUrl!, toast.label, toast.onExport);
    onDismiss(toast.jobId);
  };

  /**
   * Job excel: file-nya sudah diunduh ke blob saat job selesai, jadi klik
   * Download tinggal menyimpannya. Toast SENGAJA tidak ditutup supaya user
   * bisa menyimpan ulang; blobUrl baru di-revoke saat toast ditutup.
   */
  const handleDownload = () => {
    if (!toast.blobUrl) return;
    const link = document.createElement('a');
    link.href = toast.blobUrl;
    link.download =
      toast.filename ??
      `${toast.label.replace(/\s+/g, '_').toLowerCase()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onDismiss(toast.jobId);
  };

  return (
    <div
      className={cn(
        'pointer-events-auto w-[320px] rounded-lg border bg-white shadow-lg transition-all duration-300 dark:bg-gray-900 dark:shadow-black/40',
        borderColor
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between rounded-t-lg px-3 py-2',
          headerBg
        )}
      >
        <div className="flex items-center gap-2">
          {isDone && (
            <CheckCircle className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
          )}
          {isError && (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
          )}
          {isLoading && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500 dark:text-blue-400" />
          )}
          <div className="flex items-center gap-1">
            {isExcel ? (
              <FileSpreadsheet className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
            )}
            <span className="line-clamp-1 text-xs font-semibold text-gray-700 dark:text-gray-100">
              {toast.label}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.jobId)}
          className="ml-2 shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Tutup notifikasi"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-2 px-3 py-2.5">
        <p className={cn('text-xs', stepColor)}>{toast.step}</p>

        {(isLoading || isDone) && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 ease-out',
                  barColor
                )}
                style={{
                  width:
                    toast.status === 'fetching' ? '100%' : `${toast.percent}%`,
                  ...(toast.status === 'fetching' && {
                    animation: 'pulse 1.5s ease-in-out infinite'
                  })
                }}
              />
            </div>
            {toast.status !== 'fetching' && (
              <div className="text-right font-mono text-[10px] text-gray-400 dark:text-gray-500">
                {toast.percent}%
              </div>
            )}
          </div>
        )}

        {isDone && toast.blobUrl && (
          <button
            type="button"
            onClick={isExcel ? handleDownload : handleView}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-green-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-green-600 active:scale-95 dark:bg-green-600 dark:hover:bg-green-500"
          >
            {isExcel ? (
              <>
                <Download className="h-3.5 w-3.5" />
                Download
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Lihat Laporan
              </>
            )}
          </button>
        )}

        {isError && toast.error && (
          <p className="break-words text-[10px] text-red-400 dark:text-red-300">
            {toast.error}
          </p>
        )}
      </div>
    </div>
  );
}
