'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  downloadReportFileFn,
  EXCEL_MIME,
  PDF_MIME
} from '@/lib/apis/report.api';

const WS_BASE = process.env.NEXT_PUBLIC_BASE_URL2 ?? 'http://localhost:5004';

export type ReportToastStatus =
  | 'connecting'
  | 'processing'
  | 'fetching'
  | 'done'
  | 'error';

export type ReportToastKind = 'pdf' | 'excel';

export type ReportExportHandler = () => void | Promise<void>;

export interface ReportToast {
  jobId: string;
  label: string;
  kind: ReportToastKind;
  step: string;
  percent: number;
  status: ReportToastStatus;
  blobUrl?: string;
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
  label: string;
  payload: any | (() => Promise<any>);
  apiFn: (payload: any) => Promise<{ jobId: string }>;
  onExport?: ReportExportHandler;
}

export type GenerateExportOptions = Omit<GenerateReportOptions, 'onExport'>;

const KIND_MIME: Record<ReportToastKind, string> = {
  pdf: PDF_MIME,
  excel: EXCEL_MIME
};

const KIND_LABEL: Record<ReportToastKind, string> = {
  pdf: 'PDF',
  excel: 'Excel'
};

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
