export interface GetParams {
  limit?: number;
  page?: number;
  isLookUp?: string;
  filters?: Record<string, any>; // Tipe dinamis untuk filters
  sortBy?: string;
  isreload?: boolean;
  sortDirection?: string;
  search?: string;
  // Offset absolut, dipakai grid berjendela saat window harus dimulai dari
  // halaman yang bukan kelipatan ukuran window (mis. setelah simpan, saat
  // baris baru berada di halaman terakhir). Backend memakainya menggantikan
  // (page - 1) * limit.
  customOffset?: number;
}
