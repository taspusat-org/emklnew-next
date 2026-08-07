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

/** Cetak laporan User di background — lihat generateGroupbiayaextraReportFn. */
export const generateUserReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/user/report', payload);
  return response.data;
};

export const generateAsuransiReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/asuransi/report', payload);
  return response.data;
};
export const generateTypeAkuntansiReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/type-akuntansi/report', payload);
  return response.data;
};
export interface BuktiJobPayload {
  /** Nama file template .mrt yang ada di folder `reports` milik backend. */
  mrtName: string;
  /** id baris yang dicetak. */
  id: string;
  judullaporan?: string;
}
export const generateHutangReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/hutangheader/report', payload);
  return response.data;
};
/**
 * Cetak Harga trucking di background — alurnya sama dengan laporan daftar
 * (balas jobId, progres lewat socket `/report`), hanya datanya satu bukti
 * beserta rinciannya sesuai dua datasource di LaporanHutang.mrt.
 */
export const generateHargatruckingReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/hargatrucking/report', payload);
  return response.data;
};

/** Payload export Excel background — sama seperti report, tanpa template .mrt. */
export interface ExportJobPayload {
  search?: string;
  filters?: Record<string, string | number | null>;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export const generateAlatbayarExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/alatbayar/export', payload);
  return response.data;
};

export const generateGroupbiayaextraExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/groupbiayaextra/export', payload);
  return response.data;
};

export const generateUserExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/user/export', payload);
  return response.data;
};

/** Export Excel Menu di background — lihat generateAlatbayarExportFn. */
export const generateMenuExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/menu/export', payload);
  return response.data;
};

/** Export Excel daftar Hutang di background — lihat generateAlatbayarExportFn. */
export const generateHutangExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/hutangheader/export', payload);
  return response.data;
};

/** Export Excel daftar Biaya Extra di background — lihat generateAlatbayarExportFn. */
export const generateBiayaExtraHeaderExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/biayaextraheader/export', payload);
  return response.data;
};

/** Export Excel Harga Trucking di background — lihat generateAlatbayarExportFn. */
export const generateHargatruckingExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/hargatrucking/export', payload);
  return response.data;
};

/** Export Excel Asuransi di background — lihat generateAlatbayarExportFn. */
export const generateAsuransiExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/asuransi/export', payload);
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
