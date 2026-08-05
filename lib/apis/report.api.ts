import { api2 } from '../utils/AxiosInstance';

export interface ReportJobPayload {
  /** Nama file template .mrt yang ada di folder `reports` milik backend. */
  mrtName: string;
  search?: string;
  filters?: Record<string, string | number | null>;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  judullaporan?: string;
}

export interface ReportJobResponse {
  jobId: string;
}

/**
 * Meminta backend mencetak laporan Group Biaya Extra di background.
 * Balasannya hanya jobId — progres render datang lewat socket `/report`
 * (event `report:progress`), lalu PDF-nya diambil via downloadReportPdfFn.
 */
export const generateGroupbiayaextraReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/groupbiayaextra/report', payload);
  return response.data;
};

export const generateAsuransiReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/asuransi/report', payload);
  return response.data;
};

/**
 * Meminta backend mencetak laporan Type Akuntansi di background.
 * Balasannya hanya jobId — progres render datang lewat socket `/report`
 * (event `report:progress`), lalu PDF-nya diambil via downloadReportPdfFn.
 */
export const generateTypeAkuntansiReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/type-akuntansi/report', payload);
  return response.data;
};

/** Payload export Excel background — sama seperti report, tanpa template .mrt. */
export interface ExportJobPayload {
  search?: string;
  filters?: Record<string, string | number | null>;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Meminta backend menyusun file Excel Alat Bayar di background. Balasannya
 * hanya jobId — progresnya datang lewat socket `/report` (event
 * `report:progress`, kanal yang sama dengan cetak laporan), lalu file-nya
 * diambil via downloadReportFileFn.
 */
export const generateAlatbayarExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/alatbayar/export', payload);
  return response.data;
};

/** Export Excel Group Biaya Extra di background — lihat generateAlatbayarExportFn. */
export const generateGroupbiayaextraExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/groupbiayaextra/export', payload);
  return response.data;
};

/** Export Excel Menu di background — lihat generateAlatbayarExportFn. */
export const generateMenuExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/menu/export', payload);
  return response.data;
};

/** Export Excel daftar Biaya Extra di background — lihat generateAlatbayarExportFn. */
export const generateBiayaExtraHeaderExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/biayaextraheader/export', payload);
  return response.data;
};

export const PDF_MIME = 'application/pdf';
export const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Ambil nama file dari header Content-Disposition, mis. attachment; filename="a.xlsx". */
const parseFilename = (disposition?: string): string | undefined => {
  if (!disposition) return undefined;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
};

/**
 * Mengunduh hasil job. `downloadPath` diambil apa adanya dari event socket
 * (`/report/download/<jobId>`) supaya frontend tidak menebak-nebak URL-nya.
 * Nama file diambil dari header supaya konsisten dengan yang dibuat backend.
 */
export const downloadReportFileFn = async (
  downloadPath: string,
  mimeType: string
): Promise<{ blob: Blob; filename?: string }> => {
  const response = await api2.get(downloadPath, { responseType: 'blob' });
  return {
    blob: new Blob([response.data], { type: mimeType }),
    filename: parseFilename(response.headers?.['content-disposition'])
  };
};

export const downloadReportPdfFn = async (
  downloadPath: string
): Promise<Blob> => {
  const { blob } = await downloadReportFileFn(downloadPath, PDF_MIME);
  return blob;
};
