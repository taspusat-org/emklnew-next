'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  downloadReportFileFn,
  EXCEL_MIME,
  PDF_MIME
} from '@/lib/apis/report.api';

/**
 * Socket report menempel di backend EMKL (NEXT_PUBLIC_BASE_URL2), namespace
 * `/report` — sama dengan endpoint REST-nya, jadi tidak perlu env baru.
 * Export Excel memakai kanal yang sama; yang membedakan hanya jenis berkas
 * hasilnya (lihat ReportToastKind).
 */
const WS_BASE = process.env.NEXT_PUBLIC_BASE_URL2 ?? 'http://localhost:5004';

export type ReportToastStatus =
  | 'connecting'
  | 'processing'
  | 'fetching'
  | 'done'
  | 'error';

/** pdf = cetak laporan (dibuka di viewer), excel = export (diunduh). */
export type ReportToastKind = 'pdf' | 'excel';

/** Aksi tombol Export di toolbar viewer — dipasok modul pemanggil. */
export type ReportExportHandler = () => void | Promise<void>;

export interface ReportToast {
  jobId: string;
  label: string;
  kind: ReportToastKind;
  step: string;
  percent: number;
  status: ReportToastStatus;
  blobUrl?: string;
  /** Nama file saat diunduh (job excel) — diambil dari header backend. */
  filename?: string;
  onExport?: ReportExportHandler;
  error?: string;
}

export interface ReportViewer {
  url: string;
  title: string;
  onExport?: ReportExportHandler;
}

export interface GenerateReportOptions {
  /** Judul yang tampil di toast & judul modal viewer, mis. "Group Biaya Extra". */
  label: string;
  /** Payload untuk endpoint report; boleh berupa fungsi async bila perlu fetch dulu. */
  payload: any | (() => Promise<any>);
  apiFn: (payload: any) => Promise<{ jobId: string }>;
  /**
   * Dipanggil saat tombol Export di toolbar viewer ditekan. Modul pemanggil
   * yang tahu endpoint & filter mana yang harus diekspor.
   */
  onExport?: ReportExportHandler;
}

/** Opsi export Excel — sama seperti report, hanya tanpa viewer/onExport. */
export type GenerateExportOptions = Omit<GenerateReportOptions, 'onExport'>;

const KIND_MIME: Record<ReportToastKind, string> = {
  pdf: PDF_MIME,
  excel: EXCEL_MIME
};

const KIND_LABEL: Record<ReportToastKind, string> = {
  pdf: 'PDF',
  excel: 'Excel'
};

/**
 * Mengelola antrean job cetak PDF dan export Excel: kirim request, dengarkan
 * progres lewat socket, unduh hasilnya, dan sediakan state untuk toast.
 */
export function useReportPdf() {
  const [toasts, setToasts] = useState<ReportToast[]>([]);
  const [viewer, setViewer] = useState<ReportViewer | null>(null);
  const socketsRef = useRef<Map<string, Socket>>(new Map());

  const updateToast = useCallback(
    (jobId: string, patch: Partial<ReportToast>) => {
      setToasts((prev) =>
        prev.map((t) => (t.jobId === jobId ? { ...t, ...patch } : t))
      );
    },
    []
  );

  const disconnectJob = useCallback((jobId: string) => {
    const sock = socketsRef.current.get(jobId);
    if (sock) {
      sock.disconnect();
      socketsRef.current.delete(jobId);
    }
  }, []);

  // Putuskan semua socket yang masih hidup saat provider di-unmount supaya
  // tidak ada koneksi menggantung setelah pindah halaman.
  useEffect(() => {
    const sockets = socketsRef.current;
    return () => {
      sockets.forEach((sock) => sock.disconnect());
      sockets.clear();
    };
  }, []);

  const fetchAndStoreFile = useCallback(
    async (jobId: string, downloadPath: string, kind: ReportToastKind) => {
      const berkas = KIND_LABEL[kind];
      updateToast(jobId, {
        status: 'fetching',
        step: `Mengunduh ${berkas}…`
      });
      try {
        const { blob, filename } = await downloadReportFileFn(
          downloadPath,
          KIND_MIME[kind]
        );
        const blobUrl = URL.createObjectURL(blob);
        updateToast(jobId, {
          status: 'done',
          step: `${berkas} siap!`,
          percent: 100,
          blobUrl,
          filename
        });
      } catch (err: any) {
        updateToast(jobId, {
          status: 'error',
          step: `Gagal mengunduh ${berkas}`,
          error: err?.message ?? 'Unknown error'
        });
      }
    },
    [updateToast]
  );

  /**
   * Membuang toast dari daftar. Untuk job excel blobUrl langsung di-revoke
   * (tidak ada pemilik lain), sedangkan untuk pdf TIDAK — dismiss juga
   * dipanggil tepat setelah "Lihat Laporan" dan url-nya sudah dipegang state
   * viewer. Revoke pdf terjadi di closeViewer.
   */
  const dismissToast = useCallback(
    (jobId: string) => {
      disconnectJob(jobId);
      setToasts((prev) =>
        prev.filter((t) => {
          if (t.jobId !== jobId) return true;
          if (t.kind === 'excel' && t.blobUrl) URL.revokeObjectURL(t.blobUrl);
          return false;
        })
      );
    },
    [disconnectJob]
  );

  /** Tampilkan PDF di modal viewer (bukan tab/halaman baru). */
  const openViewer = useCallback(
    (url: string, title: string, onExport?: ReportExportHandler) => {
      setViewer({ url, title, onExport });
    },
    []
  );

  const closeViewer = useCallback(() => {
    setViewer((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  }, []);

  const runJob = useCallback(
    async (opts: GenerateReportOptions, kind: ReportToastKind) => {
      // Toast muncul sebelum jobId ada supaya user langsung dapat feedback;
      // id sementara ini ditukar dengan jobId asli begitu request balas.
      const tempId = crypto.randomUUID();

      setToasts((prev) => [
        ...prev,
        {
          jobId: tempId,
          label: opts.label,
          kind,
          step: 'Mempersiapkan…',
          percent: 0,
          status: 'connecting',
          onExport: opts.onExport
        }
      ]);

      try {
        const resolvedPayload =
          typeof opts.payload === 'function'
            ? await opts.payload()
            : opts.payload;

        const { jobId } = await opts.apiFn(resolvedPayload);

        setToasts((prev) =>
          prev.map((t) =>
            t.jobId === tempId
              ? { ...t, jobId, step: 'Memulai proses…', percent: 5 }
              : t
          )
        );

        const socket = io(`${WS_BASE}/report`, {
          transports: ['websocket']
        });

        socketsRef.current.set(jobId, socket);

        // `join` dikirim di setiap connect (termasuk reconnect): render
        // Stimulsoft memblokir event loop backend sehingga koneksi bisa
        // sempat putus di tengah jalan. Gateway membalas state akhir kalau
        // job ternyata sudah selesai saat kita join ulang.
        socket.on('connect', () => {
          socket.emit('join', jobId);
        });

        socket.on('connect_error', (err) => {
          updateToast(jobId, {
            status: 'error',
            step: 'Gagal terhubung ke server',
            error: err.message
          });
          disconnectJob(jobId);
        });

        socket.on(
          'report:progress',
          (data: {
            step: string;
            percent: number;
            status: 'processing' | 'done' | 'error';
            downloadUrl?: string;
            error?: string;
          }) => {
            if (data.status === 'done') {
              updateToast(jobId, { percent: 100, step: data.step });
              disconnectJob(jobId);
              void fetchAndStoreFile(jobId, data.downloadUrl!, kind);
              return;
            }

            if (data.status === 'error') {
              updateToast(jobId, {
                step: data.step,
                percent: data.percent,
                status: 'error',
                error: data.error
              });
              disconnectJob(jobId);
              return;
            }

            updateToast(jobId, {
              step: data.step,
              percent: data.percent,
              status: 'processing'
            });
          }
        );
      } catch (err: any) {
        const message =
          err?.response?.data?.message ?? err?.message ?? 'Terjadi kesalahan';
        setToasts((prev) =>
          prev.map((t) =>
            t.jobId === tempId
              ? { ...t, status: 'error', step: message, error: message }
              : t
          )
        );
      }
    },
    [updateToast, disconnectJob, fetchAndStoreFile]
  );

  const generateReport = useCallback(
    (opts: GenerateReportOptions) => runJob(opts, 'pdf'),
    [runJob]
  );

  /** Export Excel background — toast-nya berakhir dengan tombol Download. */
  const generateExport = useCallback(
    (opts: GenerateExportOptions) => runJob(opts, 'excel'),
    [runJob]
  );

  return {
    toasts,
    viewer,
    generateReport,
    generateExport,
    dismissToast,
    openViewer,
    closeViewer
  };
}
