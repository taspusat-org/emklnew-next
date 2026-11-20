'use client';

import React, { useEffect, useState } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { pdfjs } from 'react-pdf';

import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/print/lib/styles/index.css';
import '@react-pdf-viewer/zoom/lib/styles/index.css';

import { printPlugin } from '@react-pdf-viewer/print';
import { zoomPlugin } from '@react-pdf-viewer/zoom';

import CustomPrintModal from '@/components/custom-ui/CustomPrint';
import { HeaderPdfViewer } from '@/components/custom-ui/HeaderPdfViewer';
import { setProcessed } from '@/lib/store/loadingSlice/loadingSlice';
import { useDispatch } from 'react-redux';

type Filters = Record<string, unknown>;

const ReportMenuPage: React.FC = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [savedFilters, setSavedFilters] = useState<Filters>({});
  const [savedId, setSavedId] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const dispatch = useDispatch();

  const printPluginInstance = printPlugin();
  const zoomPluginInstance = zoomPlugin();

  useEffect(() => {
    const storedPdf = sessionStorage.getItem('pdfUrl');
    if (storedPdf) setPdfUrl(storedPdf);

    const storedFilters = sessionStorage.getItem('filtersWithoutLimit');
    if (storedFilters) {
      try {
        setSavedFilters(JSON.parse(storedFilters) as Filters);
      } catch {
        setSavedFilters({});
      }
    }

    const storedId = sessionStorage.getItem('dataId');
    if (storedId) setSavedId(storedId);
  }, []);

  // Halaman ini SISA dari alur cetak lama (Stimulsoft di browser) dan sudah
  // tidak dibuka dari mana pun: cetak & export pengembalian kas gantung kini
  // berjalan sebagai job background di backend, dipicu dari
  // GridPengembalianKasGantung dan diunduh lewat /report/download/:jobId.
  // Tombol export di viewer ini dibiarkan tidak melakukan apa-apa karena
  // endpoint sinkron GET /pengembaliankasgantungheader/export/:id sudah tidak ada.
  const handleExport = async (): Promise<void> => {
    console.warn(
      'Export dari viewer lama sudah tidak didukung. Gunakan tombol Export di grid Pengembalian Kas Gantung.'
    );
  };

  const onPrint = (): void => {
    setIsPrintModalOpen(true);
  };

  const layoutPluginInstance = HeaderPdfViewer(
    handleExport,
    onPrint,
    printPluginInstance,
    zoomPluginInstance,
    pdfUrl
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }
  }, []);

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

      <div className="flex h-screen w-screen flex-col">
        <main className="flex-1 overflow-hidden">
          {pdfUrl && (
            <CustomPrintModal
              isOpen={isPrintModalOpen}
              onClose={() => {
                setIsPrintModalOpen(false);
                dispatch(setProcessed());
              }}
              docUrl={pdfUrl}
              showPages={true}
            />
          )}

          {pdfUrl ? (
            <Worker workerUrl="/pdf.worker.min.js">
              <Viewer
                fileUrl={pdfUrl}
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
};

export default ReportMenuPage;
