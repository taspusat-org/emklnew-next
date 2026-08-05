'use client';

import React, { useState } from 'react';
import ReportPdfViewer from '@/components/custom-ui/ReportPdfViewer';

export default function ScrollTestPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8">
      <button
        id="open-viewer"
        className="rounded bg-blue-600 px-4 py-2 text-white"
        onClick={() => setOpen(true)}
      >
        Buka Viewer
      </button>
      <ReportPdfViewer
        isOpen={open}
        onClose={() => setOpen(false)}
        url="/__scrolltest.pdf"
        title="Laporan Uji Scroll"
      />
    </div>
  );
}
