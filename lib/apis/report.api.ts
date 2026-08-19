import { api2 } from '../utils/AxiosInstance';

export interface ReportJobPayload {
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

export const generateGroupbiayaextraReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/groupbiayaextra/report', payload);
  return response.data;
};

export const generateParameterReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/parameter/report', payload);
  return response.data;
};

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
  mrtName: string;
  id: string;
  judullaporan?: string;
}
export const generateHutangReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/hutangheader/report', payload);
  return response.data;
};
export const generateHargatruckingReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/hargatrucking/report', payload);
  return response.data;
};
export const generateLabaRugiKalkulasiReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/labarugikalkulasi/report', payload);
  return response.data;
};

export const generatePengeluaranReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/pengeluaranheader/report', payload);
  return response.data;
};

export const generateBiayaExtraHeaderReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/biayaextraheader/report', payload);
  return response.data;
};
export interface ExportBuktiJobPayload {
  id: string;
}

export interface ReportByIdJobPayload {
  mrtName: string;
  id: string | number;
  judullaporan?: string;
}

export const generateShippingInstructionReportFn = async (
  payload: ReportByIdJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/shippinginstruction/report', payload);
  return response.data;
};

export const generatePanjarHeaderReportFn = async (
  payload: ReportByIdJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/panjarheader/report', payload);
  return response.data;
};

export const generateBlHeaderReportFn = async (
  payload: ReportByIdJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/blheader/report', payload);
  return response.data;
};

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

/** Export Excel Type Akuntansi di background — lihat generateAlatbayarExportFn. */
export const generateTypeAkuntansiExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/type-akuntansi/export', payload);
  return response.data;
};

/** Export Excel Type Akuntansi di background — lihat generateAlatbayarExportFn. */
export const generateTypeAkuntansiExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/type-akuntansi/export', payload);
  return response.data;
};

export const generateParameterExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/parameter/export', payload);
  return response.data;
};

export const generateUserExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/user/export', payload);
  return response.data;
};

export const generateMenuExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/menu/export', payload);
  return response.data;
};

export const generateHutangExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/hutangheader/export', payload);
  return response.data;
};

export const generatePengeluaranExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/pengeluaranheader/export', payload);
  return response.data;
};

export const generateBiayaExtraHeaderExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/biayaextraheader/export', payload);
  return response.data;
};

export const generateHargatruckingExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/hargatrucking/export', payload);
  return response.data;
};

export const generateAsuransiExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/asuransi/export', payload);
  return response.data;
};

export const generateLabaRugiKalkulasiExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/labarugikalkulasi/export', payload);
  return response.data;
};

export const generateShippingInstructionExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/shippinginstruction/export', payload);
  return response.data;
};

export const generatePanjarHeaderExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/panjarheader/export', payload);
  return response.data;
};

export const generateBlHeaderExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/blheader/export', payload);
  return response.data;
};

export const PDF_MIME = 'application/pdf';
export const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const parseFilename = (disposition?: string): string | undefined => {
  if (!disposition) return undefined;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
};

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
