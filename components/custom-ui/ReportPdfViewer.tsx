'use client';

import React, { useEffect, useState } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
// @ts-expect-error CSS side-effect import
import '@react-pdf-viewer/core/lib/styles/index.css';
// @ts-expect-error CSS side-effect import
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { printPlugin } from '@react-pdf-viewer/print';
// @ts-expect-error CSS side-effect import
import '@react-pdf-viewer/print/lib/styles/index.css';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
// @ts-expect-error CSS side-effect import
import '@react-pdf-viewer/zoom/lib/styles/index.css';

import { IoMdClose } from 'react-icons/io';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import CustomPrintModal from '@/components/custom-ui/CustomPrint';
import { HeaderPdfViewer } from '@/components/custom-ui/HeaderPdfViewer';
import * as pdfjs from 'pdfjs-dist/package.json';

interface ReportPdfViewerProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  /** Callback tombol Export di toolbar; dipasok pemanggil (grid) beserta filternya. */
  onExport?: () => void | Promise<void>;
}

/**
 * Isi viewer. Sengaja dipisah dari komponen luar dan HANYA di-mount saat modal
 * terbuka, karena HeaderPdfViewer memasang listener global (menonaktifkan
 * klik kanan, F12, dan membajak Ctrl+P). Kalau ikut ter-mount permanen di
 * layout dashboard, listener itu akan aktif di seluruh aplikasi.
 */
function ReportPdfViewerContent({
  url,
  onExport,
  onClose,
  title
}: {
  url: string;
  onExport?: () => void | Promise<void>;
  onClose: () => void;
  title: string;
}) {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const printPluginInstance = printPlugin();
  const zoomPluginInstance = zoomPlugin();

  // Toolbar yang sama persis dengan halaman /reports/* — navigasi halaman,
  // zoom popover, Download / Print / Export / Share, fullscreen, dan burger
  // menu versi mobile.
  const layoutPluginInstance = HeaderPdfViewer(
    () => {
      void onExport?.();
    },
    () => setIsPrintModalOpen(true),
    printPluginInstance,
    zoomPluginInstance,
    url
  );

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          body::before {
            content: '' !important;
            visibility: visible !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: white !important;
            z-index: 9998 !important;
          }
          @page {
            margin: 0;
            size: auto;
          }
        }

        @media print {
          .print-warning-box {
            visibility: visible !important;
            display: block !important;
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: auto !important;
            max-width: 500px !important;
            padding: 0 !important;
            background: white !important;
            text-align: center !important;
            z-index: 10000 !important;
          }

          .print-warning-title {
            color: #dc2626 !important;
            font-size: 16px !important;
            font-weight: bold !important;
            margin-bottom: 12px !important;
            visibility: visible !important;
            display: block !important;
            line-height: 1.3 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .print-warning-text {
            color: #000000 !important;
            font-size: 16px !important;
            font-weight: normal !important;
            margin-bottom: 15px !important;
            visibility: visible !important;
            display: block !important;
            line-height: 1.3 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .print-warning-instruction-box {
            border: 2px solid #000000 !important;
            padding: 12px 16px !important;
            margin-top: 15px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            visibility: visible !important;
            display: inline-block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .print-warning-instruction {
            color: #2563eb !important;
            font-size: 16px !important;
            font-weight: normal !important;
            visibility: visible !important;
            display: block !important;
            margin: 0 !important;
            line-height: 1.3 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="print-warning-box" style={{ display: 'none' }}>
        <div className="print-warning-title">WARNING ( PERHATIAN )</div>
        <div className="print-warning-text">
          DILARANG MENCETAK LAPORAN MELALUI INI
        </div>
        <div className="print-warning-instruction-box">
          <div className="print-warning-instruction">
            GUNAKAN TOMBOL PRINT ATAU CTRL + P
          </div>
        </div>
      </div>

      <div className="flex h-full min-h-0 w-full flex-col">
        {/* Header modal — satu-satunya beda dengan halaman /reports/*:
            di sini butuh judul + tombol tutup. */}
        <div className="flex flex-row items-center justify-between bg-[#e0ecff] px-3 py-2">
          <p className="text-base font-bold text-gray-800">{title}</p>
          <div
            className="cursor-pointer rounded-md border border-zinc-200 bg-red-500 p-0 hover:bg-red-400"
            onClick={onClose}
          >
            <IoMdClose className="h-5 w-5 font-bold text-white" />
          </div>
        </div>

        <main className="min-h-0 flex-1 overflow-hidden">
          <CustomPrintModal
            isOpen={isPrintModalOpen}
            onClose={() => setIsPrintModalOpen(false)}
            docUrl={url}
            showPages={true}
          />

          {url ? (
            <Worker
              workerUrl={`https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`}
            >
              <Viewer
                fileUrl={url}
                defaultScale={1}
                plugins={[
                  printPluginInstance,
                  layoutPluginInstance,
                  zoomPluginInstance
                ]}
                theme="light"
              />
            </Worker>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              Loading PDF…
            </div>
          )}
        </main>
      </div>
    </>
  );
}

const ReportPdfViewer: React.FC<ReportPdfViewerProps> = ({
  isOpen,
  onClose,
  url,
  title = 'Laporan PDF',
  onExport
}) => {
  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogTitle hidden={true}>{title}</DialogTitle>
      <DialogContent
        className="min-w-full bg-white p-0"
        // Toast export dirender di luar dialog (level provider). Tanpa ini,
        // klik tombol Download-nya dianggap klik di luar modal dan ikut
        // menutup viewer.
        onInteractOutside={(event) => {
          const target = (event.detail?.originalEvent?.target ??
            event.target) as HTMLElement | null;
          if (target?.closest?.('[data-report-toast]')) event.preventDefault();
        }}
        style={{
          height: '100dvh',
          maxHeight: '100dvh',
          gridTemplateRows: 'minmax(0, 1fr)',
          overflow: 'hidden'
        }}
      >
        <ReportPdfViewerContent
          url={url}
          title={title}
          onExport={onExport}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ReportPdfViewer;
