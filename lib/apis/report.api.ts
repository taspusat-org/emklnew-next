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

export const generateHariliburReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/harilibur/report', payload);
  return response.data;
};

export const generateTujuankapalReportFn = async (
  payload: BuktiJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/tujuankapal/report', payload);
  return response.data;
};

/**
 * Payload export Excel per transaksi — satu bukti beserta rinciannya, jadi
 * yang dikirim hanya id barisnya (sama seperti cetak bukti).
 */
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

export const generateBookingOrderanReportFn = async (
  payload: ReportByIdJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/bookingorderanheader/report', payload);
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

/** Export Excel Booking Orderan Muatan di background — lihat generateAlatbayarExportFn. */
export const generateBookingOrderanExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/bookingorderanheader/export', payload);
  return response.data;
};

/** Export Excel Daftar BL di background — lihat generateAlatbayarExportFn. */
export const generateDaftarblExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/daftarbl/export', payload);
  return response.data;
};

/** Export Excel Divisi di background — lihat generateAlatbayarExportFn. */
export const generateDivisiExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/divisi/export', payload);
  return response.data;
};

/** Export Excel Estimasi Biaya di background — lihat generateAlatbayarExportFn. */
export const generateEstimasiBiayaExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/estimasibiayaheader/export', payload);
  return response.data;
};

/** Export Excel Jenis Orderan di background — lihat generateAlatbayarExportFn. */
export const generateJenisOrderanExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/jenisorderan/export', payload);
  return response.data;
};

/** Cetak laporan Alat Bayar di background — lihat generateGroupbiayaextraReportFn. */
export const generateAlatbayarReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/alatbayar/report', payload);
  return response.data;
};

/** Cetak laporan Bank di background — lihat generateGroupbiayaextraReportFn. */
export const generateBankReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/bank/report', payload);
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

export const generateBankExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/bank/export', payload);
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

/** Cetak laporan Jabatan di background — lihat generateGroupbiayaextraReportFn. */
export const generateJabatanReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/jabatan/report', payload);
  return response.data;
};

/** Export Excel Jabatan di background — lihat generateAlatbayarExportFn. */
export const generateJabatanExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/jabatan/export', payload);
  return response.data;
};

export const generateHariliburExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/harilibur/export', payload);
  return response.data;
};

export const generateTujuankapalExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/tujuankapal/export', payload);
  return response.data;
};

/** Cetak laporan gandengan di background — lihat generateGroupbiayaextraReportFn. */
export const generateGandenganReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/gandengan/report', payload);
  return response.data;
};

/** Export Excel gandengan di background — lihat generateAlatbayarExportFn. */
export const generateGandenganExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/gandengan/export', payload);
  return response.data;
};

/** Cetak laporan Emkl di background — lihat generateGroupbiayaextraReportFn. */
export const generateEmklReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/emkl/report', payload);
  return response.data;
};

/** Export Excel Emkl di background — lihat generateAlatbayarExportFn. */
export const generateEmklExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/emkl/export', payload);
  return response.data;
};

/** Cetak laporan Pelayaran di background — lihat generateGroupbiayaextraReportFn. */
export const generatePelayaranReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/pelayaran/report', payload);
  return response.data;
};

/** Export Excel Pelayaran di background — lihat generateAlatbayarExportFn. */
export const generatePelayaranExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/pelayaran/export', payload);
  return response.data;
};

/** Cetak laporan Shipper  di background — lihat generateGroupbiayaextraReportFn. */
export const generateShipperReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/shipper/report', payload);
  return response.data;
};

/** Export Excel Shipper  di background — lihat generateAlatbayarExportFn. */
export const generateShipperExportFn = async (
  payload: ExportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/shipper/export', payload);
  return response.data;
};

/** Cetak Laporan Daftar BL di background — lihat generateAlatbayarReportFn. */
export const generateDaftarblReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/daftarbl/report', payload);
  return response.data;
};

/** Cetak Laporan Divisi di background — lihat generateAlatbayarReportFn. */
export const generateDivisiReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/divisi/report', payload);
  return response.data;
};

/** Cetak Laporan Jenis Orderan di background — lihat generateAlatbayarReportFn. */
export const generateJenisOrderanReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/jenisorderan/report', payload);
  return response.data;
};

/** Cetak Estimasi Biaya di background — lihat generateAlatbayarReportFn. */
export const generateEstimasiBiayaReportFn = async (
  payload: ReportJobPayload
): Promise<ReportJobResponse> => {
  const response = await api2.post('/estimasibiayaheader/report', payload);
  return response.data;
};
