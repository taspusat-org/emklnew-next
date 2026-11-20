import { type ClassValue, clsx } from 'clsx';
import { format, parse } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { GetParams } from './types/all.type';
import { REQUIRED_FIELD } from '@/constants/validation';
import { RefObject } from 'react';

interface GridConfig {
  columnsOrder: number[];
  columnsWidth: { [key: string]: number };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatBytes(
  bytes: number,
  opts: {
    decimals?: number;
    sizeType?: 'accurate' | 'normal';
  } = {}
) {
  const { decimals = 0, sizeType = 'normal' } = opts;

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const accurateSizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${
    sizeType === 'accurate' ? accurateSizes[i] ?? 'Bytes' : sizes[i] ?? 'Bytes'
  }`;
}
export function formatDateTime(timestamp: string): string | null {
  if (!timestamp) {
    return null; // Jika tidak ada timestamp, kembalikan null
  }

  try {
    // Buat objek Date dari timestamp
    const date = new Date(timestamp);

    // Pastikan timestamp valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid timestamp');
    }

    // Ambil hari, bulan, tahun, jam, menit, dan detik
    const day = String(date.getUTCDate()).padStart(2, '0'); // Gunakan UTC untuk mencegah perubahan zona waktu
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Bulan dimulai dari 0
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    // Gabungkan ke format yang diinginkan
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return null; // Jika error, kembalikan null
  }
}

export function formatDate(timestamp: string): string {
  // Mengonversi string timestamp ke objek Date
  const date = new Date(timestamp);

  // Mendapatkan hari, bulan, tahun, jam, menit, dan detik
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Bulan dimulai dari 0
  const year = date.getFullYear();

  // Mengembalikan format yang diinginkan
  return `${day}-${month}-${year}`;
}
export function formatDateToDDMMYYYY(dateString: any) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Bulan dimulai dari 0
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export const formatDateCalendar = (date: Date) => {
  return format(date, 'dd-MM-yyyy'); // Mengubah format menjadi yyyy-mm-dd
};
// Teks "dd-MM-yyyy" → Date untuk <Calendar>. Isian mask yang belum lengkap
// (mis. "12-MM-YYYY" / "12-__-____") atau tanggal mustahil → undefined.
// Jangan oper Invalid Date ke `defaultMonth`: kalendernya tampil kosong.
export function parseCalendarDate(value?: string | null): Date | undefined {
  if (!value || !/^\d{2}-\d{2}-\d{4}$/.test(value)) return undefined;
  const parsed = parse(value, 'dd-MM-yyyy', new Date());
  return isNaN(parsed.getTime()) ? undefined : parsed;
}
// Tahun 2 digit hasil ketikan diperluas ke 4 digit: 20 → 2020, 90 → 1990.
// Pivot tetap di 50 (tidak bergantung tahun sekarang): 00–49 → 20xx (abad 21),
// 50–99 → 19xx (abad 20).
const TWO_DIGIT_YEAR_PIVOT = 50;

// Teks "dd-MM-yy" (sisa mask "YY"/"yy"/"__" boleh menempel) → "dd-MM-yyyy".
// undefined bila tahunnya belum tepat 2 digit, atau tanggal hasilnya mustahil
// (mis. 29-02-90 → 1990 bukan kabisat) — biarkan isian apa adanya agar
// validasi form yang menolaknya, jangan ditebak.
export function expandTwoDigitYear(value?: string | null): string | undefined {
  const match = value?.match(/^(\d{2}-\d{2}-)(\d{2})(?:yy|__)?$/i);
  if (!match) return undefined;
  const yy = Number(match[2]);
  const year = (yy < TWO_DIGIT_YEAR_PIVOT ? 2000 : 1900) + yy;
  const expanded = `${match[1]}${year}`;
  return parseCalendarDate(expanded) ? expanded : undefined;
}
export function parseDateFromDDMMYYYY(str: string) {
  // str = "dd-mm-yyyy"
  const [day, month, year] = str.split('-');
  return new Date(`${year}-${month}-${day}`); // Mengubah ke format yyyy-mm-dd
}

// Make the function more reusable by accepting any custom filters or parameters
export const buildQueryParams = ({
  limit,
  page,
  filters = {},
  sortBy = '',
  isreload,
  isLookUp = '',
  sortDirection = 'asc',
  search = '',
  customOffset
}: GetParams) => {
  const params: any = {
    page,
    limit,
    search,
    isLookUp,
    sortBy,
    sortDirection,
    ...filters
  };

  // Hanya dikirim kalau memang dipakai, supaya URL modul lain tidak berubah.
  if (customOffset !== undefined) {
    params.customOffset = customOffset;
  }

  // Hanya tambahkan isreload jika ada (tidak undefined)
  if (isreload !== undefined) {
    params.isreload = isreload;
  }

  return params;
};
export function isLeapYear(year: any) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
export function dynamicRequiredMessage(fieldName: string) {
  return `${fieldName.toUpperCase()} ${REQUIRED_FIELD}`;
}

export const blankToNull = <T extends Record<string, unknown>>(
  values: T,
  keys: readonly (keyof T)[]
): T => {
  const normalized = { ...values };
  keys.forEach((key) => {
    const value = normalized[key];
    if (typeof value === 'string' && value.trim() === '') {
      normalized[key] = null as T[keyof T];
    }
  });
  return normalized;
};
export const parseCurrency = (value: string): number => {
  // Convert value to string and trim any whitespace before processing
  const stringValue = String(value).trim();

  if (!stringValue || stringValue === '') return 0; // Return 0 if the value is empty or invalid

  return parseFloat(stringValue.replace(/,/g, '')) || 0;
};

// Satu formatter dipakai ulang. number.toLocaleString(locale, opts) membangun
// Intl.NumberFormat BARU tiap panggilan; di grid berjendela itu dipanggil
// ratusan kali per render dan jadi penyebab utama scroll terasa berat
// (terukur ~473ms vs ~8ms untuk 40 render x 250 baris).
const currencyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const formatCurrency = (value: number | string): string => {
  if (typeof value === 'string' && value.trim() === '') return ''; // Handle empty input

  const number = typeof value === 'string' ? parseCurrency(value) : value;

  if (isNaN(number)) return ''; // Return empty if it's not a valid number

  // Format angka sebagai currency dengan ribuan dan dua desimal
  return currencyFormatter.format(number);
};

export const cancelPreviousRequest = (abortControllerRef: any) => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  abortControllerRef.current = new AbortController(); // Buat AbortController baru untuk request berikutnya
};

export const handleContextMenu = (event: React.MouseEvent) => {
  event.preventDefault();
  return { x: event.clientX, y: event.clientY };
};

export const saveGridConfig = async (
  userId: string, // userId sebagai identifier
  gridName: string,
  columnsOrder: number[],
  columnsWidth: { [key: string]: number }
) => {
  // Pemanggilnya menulis String(user?.id): saat auth belum terisi nilainya jadi
  // '' atau 'undefined', dan /api/savegrid membalas 400 "Invalid input" —
  // konfigurasi kolom hilang tanpa jejak selain error di console. Sama seperti
  // resetGridConfig, request-nya tidak usah dikirim sama sekali.
  if (!userId || userId === 'undefined' || userId === 'null') return;

  try {
    const response = await fetch('/api/savegrid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        gridName,
        config: { columnsOrder, columnsWidth }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save grid configuration');
    }
  } catch (error) {
    console.error('Failed to save grid configuration:', error);
  }
};

export const loadGridConfig = async (
  userId: string,
  gridName: string,
  columns: any[],
  setColumnsOrder: React.Dispatch<React.SetStateAction<readonly number[]>>,
  setColumnsWidth: React.Dispatch<
    React.SetStateAction<{ [key: string]: number }>
  >
) => {
  // Fallback ke default column widths
  if (!columns || !Array.isArray(columns) || columns.length === 0) return;
  const defaultWidths = columns.reduce(
    (acc: { [key: string]: number }, column: any) => {
      if (!column?.key) return acc;
      acc[column.key] = typeof column.width === 'number' ? column.width : 0;
      return acc;
    },
    {}
  );

  const defaultOrder = columns.map((_: any, index: number) => index);

  try {
    const response = await fetch(
      `/api/loadgrid?userId=${userId}&gridName=${gridName}`
    );

    const { columnsOrder, columnsWidth }: GridConfig = await response.json();

    const savedKeys = new Set(Object.keys(columnsWidth ?? {}));

    // columnsOrder berisi INDEX kolom dan boleh lebih pendek dari defaultOrder:
    // kolom yang di-uncheck di DraggableColumn memang tidak ikut disimpan.
    const isOrderShapeValid =
      Array.isArray(columnsOrder) &&
      columnsOrder.length > 0 &&
      columnsOrder.length <= defaultOrder.length &&
      new Set(columnsOrder).size === columnsOrder.length &&
      columnsOrder.every(
        (index) =>
          Number.isInteger(index) && index >= 0 && index < columns.length
      );

    // Index lama hanya valid selama susunan kolom di kode tidak berubah, jadi
    // tiap index dicocokkan ke key yang ikut tersimpan di columnsWidth. Kalau
    // ada kolom yang disisipkan/dihapus, index lama menunjuk kolom lain
    // (urutan teracak) — jatuhkan ke urutan default.
    const isOrderStillValid =
      isOrderShapeValid &&
      (savedKeys.size === 0
        ? // config lama tanpa columnsWidth cuma bisa dicek lewat panjangnya
          columnsOrder.length === defaultOrder.length
        : columnsOrder.every((index) => savedKeys.has(columns[index]?.key)));

    // Kolom yang belum dikenal config (baru ditambahkan di kode) tetap tampil
    const newColumns = isOrderStillValid
      ? defaultOrder.filter(
          (index) =>
            !savedKeys.has(columns[index]?.key) && !columnsOrder.includes(index)
        )
      : [];

    setColumnsOrder(
      isOrderStillValid ? [...columnsOrder, ...newColumns] : defaultOrder
    );

    const hasServerWidths =
      columnsWidth != null && Object.keys(columnsWidth).length > 0;

    setColumnsWidth(
      hasServerWidths
        ? columns.reduce((acc: { [key: string]: number }, column: any) => {
            if (!column?.key) return acc;
            // server value takes priority, fallback ke default column width
            acc[column.key] =
              typeof columnsWidth[column.key] === 'number'
                ? columnsWidth[column.key]
                : defaultWidths[column.key] ?? 0;
            return acc;
          }, {})
        : defaultWidths
    );
  } catch (error) {
    console.error('Failed to load grid configuration:', error);
    setColumnsOrder(defaultOrder);
    setColumnsWidth(defaultWidths);
  }
};

export const resetGridConfig = (
  userId: string,
  gridName: string,
  columns: any,
  setColumnsOrder: React.Dispatch<React.SetStateAction<readonly number[]>>,
  setColumnsWidth: React.Dispatch<
    React.SetStateAction<{ [key: string]: number }>
  >
) => {
  // Nilai default untuk columnsOrder dan columnsWidth
  const defaultColumnsOrder = columns.map((_: any, index: number) => index);
  const defaultColumnsWidth = columns.reduce(
    (acc: any, column: any) => {
      acc[column.key] = typeof column.width === 'number' ? column.width : 0;
      return acc;
    },
    {} as { [key: string]: number }
  );

  // Set state kembali ke nilai default
  setColumnsOrder(defaultColumnsOrder);
  setColumnsWidth(defaultColumnsWidth);
  // setContextMenu(null);
  // setDataGridKey((prevKey) => prevKey + 1);

  // gridRef?.current?.selectCell({ rowIdx: 0, idx: 0 });

  // Simpan konfigurasi reset ke server (atau backend)
  if (userId) {
    saveGridConfig(userId, gridName, defaultColumnsOrder, defaultColumnsWidth);
  }
};

export const todayDate = () => {
  const todayDate = new Date();

  return `${String(todayDate.getDate()).padStart(2, '0')}-${String(
    todayDate.getMonth() + 1
  ).padStart(2, '0')}-${todayDate.getFullYear()}`;
};
