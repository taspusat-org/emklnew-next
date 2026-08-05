/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useCallback
} from 'react';
import 'react-data-grid/lib/styles.scss';
import DataGrid, {
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import IcClose from '@/public/image/x.svg';
import { Input } from '@/components/ui/input';
import { debounce } from 'lodash';
import { FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import FilterInput from '@/components/custom-ui/FilterInput';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { useTheme } from 'next-themes';
import {
  formatCurrency,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import {
  BiayaExtraMuatanDetail,
  filterBiayaExtraMuatanDetail
} from '@/lib/types/biayaextraheader.type';
import { useGetBiayaExtraMuatanDetail } from '@/lib/server/useBiayaExtraHeader';
import { getBiayaExtraMuatanDetailFn } from '@/lib/apis/biayaextraheader.api';

interface Filter {
  page: number;
  limit: number;
  search: string;
  filters: typeof filterBiayaExtraMuatanDetail;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridBiayaExtraMuatanDetail = () => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const { user } = useSelector((state: RootState) => state.auth);
  const headerData = useSelector((state: RootState) => state.header.headerData);

  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: 30,
    filters: filterBiayaExtraMuatanDetail,
    search: '',
    sortBy: 'id',
    sortDirection: 'asc'
  });

  // ── Lazy loading + caching (pola GridAlatbayar / GridPengeluaranDetail) ────
  // Grid hanya menyimpan WINDOW_SIZE halaman di memori (`visiblePages`), isinya
  // di `pageDataCache`. Halaman di luar window dibuang; halaman berikutnya
  // di-prefetch diam-diam ke `streamBufferRef` supaya saat user scroll sampai
  // ambang batas, data sudah ada dan window bergeser tanpa spinner.
  const WINDOW_SIZE = 5;
  const STREAM_BUFFER_SIZE = 5;
  const ROW_HEIGHT = 30; // harus sama dengan prop rowHeight DataGrid di bawah

  const [shouldBulkFetch, setShouldBulkFetch] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5]);
  const minVisiblePage = useMemo(
    () => (visiblePages.length > 0 ? Math.min(...visiblePages) : 1),
    [visiblePages]
  );
  // Nomor baris pertama yang sedang ada di window (bukan di layar).
  const startRow = (minVisiblePage - 1) * filters.limit + 1;
  const [pageDataCache, setPageDataCache] = useState<
    Map<number, BiayaExtraMuatanDetail[]>
  >(new Map());
  const streamBufferRef = useRef<Map<number, BiayaExtraMuatanDetail[]>>(
    new Map()
  );
  const prefetchingPagesRef = useRef<Set<number>>(new Set());

  const [isFetching, setIsFetching] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const scrollPositionRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollAdjustment = useRef<number>(0);
  const hasAdjustedScrollRef = useRef<boolean>(false);
  const isPageTransitionRef = useRef(false);
  const selectedRowRef = useRef<number>(0);
  // Modalitas input terakhir: 'keyboard' (Arrow/Page) atau 'pointer' (wheel/drag
  // scrollbar). Dipakai utk menentukan apakah selectCell harus di-re-anchor
  // ke baris data yg sama setelah window-shift.
  const interactionModeRef = useRef<'keyboard' | 'pointer'>('pointer');
  // Diset saat window benar-benar bergeser (shiftSelectionForWindow). Menandai
  // apakah pergeseran itu dari keyboard, sehingga useLayoutEffect tahu apakah
  // perlu re-anchor selectCell. Mouse scroll TIDAK boleh memindahkan sel aktif.
  const reanchorFromKeyboardRef = useRef(false);
  // Snapshot: apakah sel aktif grid memegang DOM focus tepat sebelum window
  // bergeser. Dipakai untuk memulihkan focus setelah baris lama ter-unmount.
  const gridCellHadFocusRef = useRef(false);

  // Sel aktif react-data-grid selalu punya tabindex="0" (roving tabindex).
  // Header memakai role="columnheader", jadi selector ini hanya kena sel data --
  // input filter di header TIDAK ikut tertangkap.
  const getSelectedGridCell = (): HTMLElement | null =>
    gridRef.current?.element?.querySelector<HTMLElement>(
      ':scope > [role="row"] > [role="gridcell"][tabindex="0"]'
    ) ?? null;

  const isSelectedGridCellFocused = () => {
    const cell = getSelectedGridCell();
    return cell !== null && cell === document.activeElement;
  };

  // Saat window bergeser, baris yang memegang DOM focus ikut ter-unmount
  // sehingga focus lompat ke <body>. Akibatnya Arrow/PageUp/PageDown tidak lagi
  // sampai ke grid dan sel aktif tidak bisa "ditarik" kembali ke viewport.
  // Kembalikan focus ke sel aktif yang baru TANPA menggeser scroll, supaya
  // posisi hasil scroll mouse user tidak berubah tetapi tombol navigasi
  // langsung bekerja lagi (dan RDG yang akan scroll ke sel tsb saat ditekan).
  const restoreGridCellFocus = () => {
    if (!gridCellHadFocusRef.current) return;
    gridCellHadFocusRef.current = false;
    getSelectedGridCell()?.focus({ preventScroll: true });
  };

  // Menggeser index baris terpilih saat window bergeser, supaya baris DATA yang
  // sama tetap ter-highlight. Posisi visual dijaga oleh kompensasi scrollTop
  // (pendingScrollAdjustment), jadi jangan panggil selectCell di sini.
  //
  // ATURAN: highlight `selected-row` HARUS selalu menunjuk baris yang sama
  // dengan selected cell bawaan react-data-grid. RDG menyimpan selection-nya
  // sebagai index (`selectedPosition.rowIdx`) dan TIDAK menggesernya saat array
  // rows berubah -- sel aktif tetap di baris ke-N grid walau halaman sebelumnya
  // dibuang. Jadi:
  //
  // - pointer (wheel / drag scrollbar): kita TIDAK menggeser index sama sekali.
  //   Sel aktif RDG tetap di baris ke-N, highlight juga tetap di baris ke-N ->
  //   keduanya sinkron (walaupun data di baris tsb otomatis jadi data lain).
  // - keyboard (Arrow/Page): index digeser mengikuti data, DAN sel aktif RDG
  //   ikut di-re-anchor ke index baru lewat useLayoutEffect -> tetap sinkron,
  //   sekaligus menjaga navigasi baris-per-baris tidak meloncat sejauh satu
  //   halaman.
  const shiftSelectionForWindow = (deltaRows: number) => {
    // Stempel asal pergeseran window ini (keyboard vs pointer) secara
    // deterministik dari modalitas input terakhir, dipakai useLayoutEffect.
    const fromKeyboard = interactionModeRef.current === 'keyboard';
    reanchorFromKeyboardRef.current = fromKeyboard;

    // Rekam SEKARANG (sebelum React meng-unmount baris halaman yang dibuang)
    // apakah DOM focus sedang dipegang oleh sel grid. Setelah commit, elemen sel
    // tsb hilang dan focus jatuh ke <body>, jadi tidak bisa dideteksi lagi.
    gridCellHadFocusRef.current = isSelectedGridCellFocused();

    // Pointer: biarkan index apa adanya supaya mengikuti sel aktif RDG.
    if (!fromKeyboard) return;

    selectedRowRef.current = Math.max(0, selectedRowRef.current + deltaRows);
  };

  const resetBufferingCache = useCallback(() => {
    setShouldBulkFetch(true);
    setCurrentPage(1);
    setPageDataCache(new Map());
    setVisiblePages([1, 2, 3, 4, 5]);
    setIsFetching(false);
    setIsTransitioning(false);
    streamBufferRef.current = new Map();
    prefetchingPagesRef.current = new Set();
    selectedRowRef.current = 0;
  }, []);

  // Bulk fetch pertama menarik WINDOW_SIZE halaman sekaligus (1 request) lalu
  // dipecah di memori; setelah itu tiap pergeseran window cuma 1 halaman.
  const effectiveLimit = shouldBulkFetch
    ? filters.limit * WINDOW_SIZE
    : filters.limit;

  const queryParams = useMemo(
    () => ({
      ...filters,
      page: shouldBulkFetch ? 1 : currentPage,
      limit: effectiveLimit
    }),
    [filters, shouldBulkFetch, currentPage, effectiveLimit]
  );

  const { data: allDataDetail, isLoading } = useGetBiayaExtraMuatanDetail(
    headerData?.id,
    queryParams
  );

  const [rows, setRows] = useState<BiayaExtraMuatanDetail[]>([]);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  // Kolom sel aktif. Dipakai saat re-anchor selectCell setelah window bergeser
  // supaya sel aktif kembali ke KOLOM yang sama, bukan lompat ke kolom pertama.
  const [selectedCellKey, setSelectedCellKey] = useState<string>('nomor');
  const [inputValue, setInputValue] = useState<string>('');
  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
  const [columnsWidth, setColumnsWidth] = useState<{ [key: string]: number }>(
    {}
  );
  const gridRef = useRef<DataGridHandle>(null);
  const [dataGridKey, setDataGridKey] = useState(0);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setInputValue(searchValue);
    setFilters((prev) => ({
      ...prev,
      filters: filterBiayaExtraMuatanDetail,
      search: searchValue,
      page: 1
    }));
    setTimeout(() => {
      gridRef?.current?.selectCell({ rowIdx: 0, idx: 1 });
    }, 100);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 200);

    setSelectedRow(0);
    setRows([]);
    // Hasil pencarian = himpunan baris yang berbeda, jadi window & buffer lama
    // tidak lagi valid. Tanpa reset, halaman 2..5 hasil query LAMA masih
    // menempel di cache dan ikut tergabung ke `rows`.
    resetBufferingCache();
  };

  const debouncedFilterUpdate = useRef(
    debounce((colKey: string, value: string) => {
      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, [colKey]: value },
        page: 1
      }));
      setRows([]);
      resetBufferingCache();
    }, 300) // Bisa dikurangi jadi 250-300ms
  ).current;

  const handleFilterInputChange = useCallback(
    (colKey: string, value: string) => {
      debouncedFilterUpdate(colKey, value);
      setTimeout(() => {
        setSelectedRow(0);
        gridRef?.current?.selectCell({ rowIdx: 0, idx: 1 });
      }, 400);
    },
    []
  );

  const handleClearFilter = useCallback((colKey: string) => {
    debouncedFilterUpdate.cancel(); // Cancel pending updates

    setFilters((prev) => ({
      ...prev,
      filters: { ...prev.filters, [colKey]: '' },
      page: 1
    }));
    setRows([]);
    resetBufferingCache();
  }, []);

  const handleClearInput = () => {
    setFilters((prev) => ({
      ...prev,
      filters: {
        ...prev.filters
      },
      search: '',
      page: 1
    }));
    setInputValue('');
    resetBufferingCache();
  };

  const handleSort = (column: string) => {
    const originalIndex = columns.findIndex((col) => col.key === column);

    // 2. hitung index tampilan berdasar columnsOrder
    //    jika belum ada reorder (columnsOrder kosong), fallback ke originalIndex
    const displayIndex =
      columnsOrder.length > 0
        ? columnsOrder.findIndex((idx) => idx === originalIndex)
        : originalIndex;
    const newSortOrder =
      filters.sortBy === column && filters.sortDirection === 'asc'
        ? 'desc'
        : 'asc';

    setFilters((prevFilters) => ({
      ...prevFilters,
      sortBy: column,
      sortDirection: newSortOrder,
      page: 1
    }));
    setTimeout(() => {
      gridRef?.current?.selectCell({ rowIdx: 0, idx: displayIndex });
    }, 200);
    setSelectedRow(0);
    setRows([]);
    // Sort berubah -> urutan seluruh hasil berubah, halaman lama tidak valid.
    resetBufferingCache();
  };

  const columns = useMemo((): Column<BiayaExtraMuatanDetail>[] => {
    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 50,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full flex-col items-center gap-1">
            <div className="headers-cell h-[50%] items-center justify-center text-center">
              <p className="text-sm font-normal">No.</p>
            </div>

            <div
              className="flex h-[50%] w-full cursor-pointer items-center justify-center"
              onClick={() => {
                setFilters((prev) => ({
                  ...prev,
                  search: '',
                  page: 1,
                  filters: filterBiayaExtraMuatanDetail
                }));
                setInputValue('');
                resetBufferingCache();
                setTimeout(() => {
                  gridRef?.current?.selectCell({ rowIdx: 0, idx: 1 });
                }, 0);
              }}
            >
              <FaTimes className="bg-red-500 text-white" />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          // Nomor ABSOLUT, bukan index dalam window. `rows` hanya memuat
          // WINDOW_SIZE halaman yang sedang terlihat, jadi index lokal akan
          // mengulang dari 1 tiap kali window bergeser.
          const localIndex = rows.findIndex((row) => row.id === props.row.id);
          const absoluteNumber =
            localIndex === -1
              ? '—'
              : (minVisiblePage - 1) * filters.limit + localIndex + 1;
          return (
            <div className="flex h-full w-full cursor-pointer items-center justify-center text-sm">
              {absoluteNumber}
            </div>
          );
        }
      },
      {
        key: 'nobukti',
        name: 'no bukti',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nobukti')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nobukti' ? 'font-bold' : 'font-normal'
                }`}
              >
                NO BUKTI
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nobukti' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nobukti' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nobukti"
                value={filters.filters.nobukti || ''}
                onChange={(value) => handleFilterInputChange('nobukti', value)}
                onClear={() => handleClearFilter('nobukti')}
                inputRef={(el) => {
                  inputColRefs.current['nobukti'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nobukti || '';
          const cellValue = props.row.nobukti || '';
          return (
            <div
              title={cellValue}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'orderanmuatan_nobukti',
        name: 'orderan muatan nobukti',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('orderanmuatan_nobukti')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'orderanmuatan_nobukti'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                NO BUKTI ORDERAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'orderanmuatan_nobukti' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'orderanmuatan_nobukti' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="orderanmuatan_nobukti"
                value={filters.filters.orderanmuatan_nobukti || ''}
                onChange={(value) =>
                  handleFilterInputChange('orderanmuatan_nobukti', value)
                }
                onClear={() => handleClearFilter('orderanmuatan_nobukti')}
                inputRef={(el) => {
                  inputColRefs.current['orderanmuatan_nobukti'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.orderanmuatan_nobukti || '';
          const cellValue = props.row.orderanmuatan_nobukti || '';
          return (
            <div
              title={cellValue}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'estimasi',
        name: 'estimasi',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('estimasi')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'estimasi' ? 'font-bold' : 'font-normal'
                }`}
              >
                ESTIMASI
              </p>
              <div className="ml-2">
                {filters.sortBy === 'estimasi' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'estimasi' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="estimasi"
                value={filters.filters.estimasi || ''}
                onChange={(value) => handleFilterInputChange('estimasi', value)}
                onClear={() => handleClearFilter('estimasi')}
                inputRef={(el) => {
                  inputColRefs.current['estimasi'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.estimasi || '';
          const cellValue =
            props.row.estimasi != null && props.row.estimasi !== ''
              ? formatCurrency(props.row.estimasi)
              : '';
          return (
            <div
              title={cellValue}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'nominal',
        name: 'nominal',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nominal')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nominal' ? 'font-bold' : 'font-normal'
                }`}
              >
                nominal
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nominal' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nominal' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nominal"
                value={filters.filters.nominal || ''}
                onChange={(value) => handleFilterInputChange('nominal', value)}
                onClear={() => handleClearFilter('nominal')}
                inputRef={(el) => {
                  inputColRefs.current['nominal'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nominal || '';
          const cellValue =
            props.row.nominal != null && props.row.nominal !== ''
              ? formatCurrency(props.row.nominal)
              : '';
          return (
            <div
              title={cellValue}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'statustagih',
        name: 'status tagih',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statustagih_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statustagih_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Status Tagih
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statustagih_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statustagih_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterOptions
                columnKey={column.column.key}
                endpoint="parameter"
                value="id"
                label="text"
                filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
                onChange={(value) =>
                  handleFilterInputChange('statustagih_text', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.statustagih_memo
            ? JSON.parse(props.row.statustagih_memo)
            : null;
          if (memoData) {
            return (
              <div className="flex h-full w-full items-center justify-center py-1">
                <div
                  className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
                  style={{
                    backgroundColor: memoData.WARNA,
                    color: memoData.WARNATULISAN,
                    padding: '2px 6px',
                    borderRadius: '2px',
                    textAlign: 'left',
                    fontWeight: '600'
                  }}
                >
                  <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
                </div>
              </div>
            );
          }
          return <div className="text-xs text-gray-500"></div>; // Tampilkan 'N/A' jika memo tidak tersedia
        }
      },
      {
        key: 'nominaltagih',
        name: 'nominal tagih',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nominaltagih')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nominaltagih'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                nominal tagih
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nominaltagih' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nominaltagih' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nominaltagih"
                value={filters.filters.nominaltagih || ''}
                onChange={(value) =>
                  handleFilterInputChange('nominaltagih', value)
                }
                onClear={() => handleClearFilter('nominaltagih')}
                inputRef={(el) => {
                  inputColRefs.current['nominaltagih'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nominaltagih || '';
          const cellValue =
            props.row.nominaltagih != null && props.row.nominaltagih !== ''
              ? formatCurrency(props.row.nominaltagih)
              : '';
          return (
            <div
              title={cellValue}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'keterangan',
        name: 'keterangan',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('keterangan')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'keterangan' ? 'font-bold' : 'font-normal'
                }`}
              >
                KETERANGAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'keterangan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'keterangan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="keterangan"
                value={filters.filters.keterangan || ''}
                onChange={(value) =>
                  handleFilterInputChange('keterangan', value)
                }
                onClear={() => handleClearFilter('keterangan')}
                inputRef={(el) => {
                  inputColRefs.current['keterangan'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.keterangan || '';
          const cellValue = props.row.keterangan || '';
          return (
            <div
              title={cellValue}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'groupbiayaextra_nama',
        name: 'group biaya extra',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('groupbiayaextra_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'groupbiayaextra_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                GROUP BIAYA EXTRA
              </p>
              <div className="ml-2">
                {filters.sortBy === 'groupbiayaextra_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'groupbiayaextra_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="groupbiayaextra_nama"
                value={filters.filters.groupbiayaextra_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('groupbiayaextra_text', value)
                }
                onClear={() => handleClearFilter('groupbiayaextra_text')}
                inputRef={(el) => {
                  inputColRefs.current['groupbiayaextra_nama'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.groupbiayaextra_text || '';
          const cellValue = props.row.groupbiayaextra_nama || '';
          return (
            <div
              title={cellValue}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      }
    ];
  }, [rows, filters, minVisiblePage]);

  function getRowClass(row: BiayaExtraMuatanDetail) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: BiayaExtraMuatanDetail) {
    return row.id;
  }

  function handleCellClick(args: { row: BiayaExtraMuatanDetail }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
      // Ref ikut disinkronkan: dia yang jadi acuan saat window bergeser.
      selectedRowRef.current = rowIndex;
    }
  }

  const onColumnResize = (index: number, width: number) => {
    // 1) Dapatkan key kolom yang di-resize
    const columnKey = columns[columnsOrder[index]].key;

    // 2) Update state width seketika (biar kolom langsung responsif)
    const newWidthMap = { ...columnsWidth, [columnKey]: width };
    setColumnsWidth(newWidthMap);

    // 3) Bersihkan timeout sebelumnya agar tidak menumpuk
    if (resizeDebounceTimeout.current) {
      clearTimeout(resizeDebounceTimeout.current);
    }

    // 4) Set ulang timer: hanya ketika 300ms sejak resize terakhir berlalu,
    //    saveGridConfig akan dipanggil
    resizeDebounceTimeout.current = setTimeout(() => {
      saveGridConfig(
        user.id,
        'GridBiayaExtraMuatanDetail',
        [...columnsOrder],
        newWidthMap
      );
    }, 300);
  };

  const onColumnsReorder = (sourceKey: string, targetKey: string) => {
    setColumnsOrder((prevOrder) => {
      const sourceIndex = prevOrder.findIndex(
        (index) => columns[index].key === sourceKey
      );
      const targetIndex = prevOrder.findIndex(
        (index) => columns[index].key === targetKey
      );

      const newOrder = [...prevOrder];
      newOrder.splice(targetIndex, 0, newOrder.splice(sourceIndex, 1)[0]);

      saveGridConfig(
        user.id,
        'GridBiayaExtraMuatanDetail',
        [...newOrder],
        columnsWidth
      );
      return newOrder;
    });
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(event.target as Node)
    ) {
      setContextMenu(null);
    }
  };

  const mapDetailRows = useCallback(
    (data: any[] | undefined | null): BiayaExtraMuatanDetail[] =>
      (data ?? []).map((item: any) => ({
        id: item.id,
        nobukti: item.nobukti,
        biayaextra_id: item.biayaextra_id,
        orderanmuatan_id: item.orderanmuatan_id,
        orderanmuatan_nobukti: item.orderanmuatan_nobukti,
        estimasi: item.estimasi,
        nominal: item.nominal,
        statustagih: item.statustagih,
        statustagih_nama: item.statustagih_nama,
        statustagih_memo: item.statustagih_memo,
        nominaltagih: item.nominaltagih,
        keterangan: item.keterangan,
        groupbiayaextra_id: item.groupbiayaextra_id,
        groupbiayaextra_nama: item.groupbiayaextra_nama
      })),
    []
  );

  // Tarik halaman-halaman berikutnya diam-diam ke streamBuffer. Saat window
  // nanti bergeser ke salah satunya, datanya sudah ada -> tidak ada spinner &
  // tidak ada network latency di jalur scroll.
  const prefetchPages = useCallback(
    async (
      pagesToFetch: number[],
      existingCache?: Map<number, BiayaExtraMuatanDetail[]>,
      knownTotalPages?: number
    ) => {
      if (!headerData?.id) return;
      const cacheToCheck = existingCache ?? pageDataCache;
      const effectiveTotalPages = knownTotalPages ?? totalPages;

      const validPages = pagesToFetch.filter(
        (p) =>
          p >= 1 &&
          p <= effectiveTotalPages &&
          !streamBufferRef.current.has(p) &&
          !cacheToCheck.has(p) &&
          !prefetchingPagesRef.current.has(p)
      );

      if (validPages.length === 0) return;

      validPages.forEach((p) => prefetchingPagesRef.current.add(p));

      await Promise.allSettled(
        validPages.map(async (pageNum) => {
          try {
            const data = await getBiayaExtraMuatanDetailFn(headerData.id, {
              ...queryParams,
              page: pageNum,
              limit: filters.limit
            });

            if (data?.data && data.data.length > 0) {
              streamBufferRef.current = new Map(streamBufferRef.current);
              streamBufferRef.current.set(pageNum, mapDetailRows(data.data));
            }
          } catch (err) {
            // Silent fail — prefetch gagal bukan error yang perlu dilihat user;
            // window tetap bisa bergeser lewat jalur fetch normal.
            console.warn(
              `[StreamBuffer] Prefetch detail page ${pageNum} gagal:`,
              err
            );
          } finally {
            prefetchingPagesRef.current.delete(pageNum);
          }
        })
      );
    },
    [
      headerData?.id,
      queryParams,
      filters.limit,
      totalPages,
      pageDataCache,
      mapDetailRows
    ]
  );

  async function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (isLoading || rows.length === 0 || isTransitioning || isFetching) return;

    const { currentTarget } = event;
    const scrollTop = currentTarget.scrollTop;
    const clientHeight = currentTarget.clientHeight;

    const hasScrolled = Math.abs(scrollTop - lastScrollTopRef.current) > 5;
    if (!hasScrolled) return;

    lastScrollTopRef.current = scrollTop;
    isScrollingRef.current = true;

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 150);

    scrollPositionRef.current = scrollTop;
    scrollContainerRef.current = currentTarget;

    const firstVisibleRow = Math.floor(scrollTop / ROW_HEIGHT);
    const lastVisibleRow = Math.floor((scrollTop + clientHeight) / ROW_HEIGHT);

    const THRESHOLD_ROWS = 50;

    // SCROLL KE BAWAH
    if (rows.length - lastVisibleRow <= THRESHOLD_ROWS) {
      const nextPage = Math.max(...visiblePages) + 1;

      if (nextPage <= totalPages && !isFetching && isScrollingRef.current) {
        if (streamBufferRef.current.has(nextPage)) {
          // Buffer hit — geser window langsung tanpa request.
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;

          const bufferedData = streamBufferRef.current.get(nextPage)!;

          setPageDataCache((prev) => {
            const updated = new Map(prev);
            updated.set(nextPage, bufferedData);
            return updated;
          });

          streamBufferRef.current = new Map(streamBufferRef.current);
          streamBufferRef.current.delete(nextPage);

          isPageTransitionRef.current = true;
          pendingScrollAdjustment.current = -(filters.limit * ROW_HEIGHT);
          shiftSelectionForWindow(-filters.limit);
          setVisiblePages((prevVisible) => {
            const removedPage = prevVisible[0];
            const newPages = [...prevVisible.slice(1), nextPage];

            setPageDataCache((prev) => {
              const updated = new Map(prev);
              updated.delete(removedPage);
              return updated;
            });

            return newPages;
          });

          setTimeout(() => {
            setIsTransitioning(false);
            setIsFetching(false);
          }, 50);

          prefetchPages(
            Array.from(
              { length: STREAM_BUFFER_SIZE },
              (_, i) => nextPage + 1 + i
            )
          );
        } else if (!pageDataCache.has(nextPage)) {
          // Buffer miss — fallback ke fetch normal (effect #2 yang merakit).
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;
          setCurrentPage(nextPage);
        }
      }
    }

    // SCROLL KE ATAS
    if (firstVisibleRow <= THRESHOLD_ROWS) {
      const prevPage = Math.min(...visiblePages) - 1;

      if (prevPage >= 1 && !isFetching && isScrollingRef.current) {
        if (streamBufferRef.current.has(prevPage)) {
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;

          const bufferedData = streamBufferRef.current.get(prevPage)!;

          setPageDataCache((prev) => {
            const updated = new Map(prev);
            updated.set(prevPage, bufferedData);
            return updated;
          });

          streamBufferRef.current = new Map(streamBufferRef.current);
          streamBufferRef.current.delete(prevPage);

          isPageTransitionRef.current = true;
          pendingScrollAdjustment.current = filters.limit * ROW_HEIGHT;
          shiftSelectionForWindow(filters.limit);
          setVisiblePages((prevVisible) => {
            const removedPage = prevVisible[prevVisible.length - 1];
            const newPages = [
              prevPage,
              ...prevVisible.slice(0, WINDOW_SIZE - 1)
            ];

            setPageDataCache((prev) => {
              const updated = new Map(prev);
              updated.delete(removedPage);
              return updated;
            });

            return newPages;
          });

          setTimeout(() => {
            setIsTransitioning(false);
            setIsFetching(false);
          }, 50);

          prefetchPages(
            Array.from(
              { length: STREAM_BUFFER_SIZE },
              (_, i) => prevPage - 1 - i
            ).filter((p) => p >= 1)
          );
        } else if (!pageDataCache.has(prevPage)) {
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;
          // Reset ke 0 dulu supaya setCurrentPage(prevPage) tetap memicu effect
          // walau prevPage kebetulan sama dengan currentPage yang basi.
          setCurrentPage(0);
          setTimeout(() => setCurrentPage(prevPage), 0);
        }
      }
    }
  }

  const orderedColumns = useMemo(() => {
    if (Array.isArray(columnsOrder) && columnsOrder.length > 0) {
      // filter key columns dengan key yg ada di columnsWidth
      const filteredColumns = columns.filter((col) =>
        Object.prototype.hasOwnProperty.call(columnsWidth, col.key)
      );
      // Mapping dan filter untuk menghindari undefined
      return columnsOrder
        .map((orderIndex) => filteredColumns[orderIndex])
        .filter((col) => col !== undefined);
    }
    return columns;
  }, [columns, columnsOrder]);

  // Update properti width pada setiap kolom berdasarkan state columnsWidth
  const finalColumns = useMemo(() => {
    return orderedColumns.map((col) => ({
      ...col,
      width: columnsWidth[col.key] ?? col.width
    }));
  }, [orderedColumns, columnsWidth]);

  useEffect(() => {
    // useEffect untuk trigger grid yg kesimpan di config kalo ada
    loadGridConfig(
      user.id,
      'GridBiayaExtraMuatanDetail',
      columns,
      setColumnsOrder,
      setColumnsWidth
    );
  }, []);

  useEffect(() => {
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ── 1. Bulk fetch awal ────────────────────────────────────────────────────
  // Request pertama menarik WINDOW_SIZE halaman sekaligus lalu dipecah di
  // memori jadi cache per-halaman. Satu round-trip untuk mengisi seluruh window.
  useEffect(() => {
    if (!shouldBulkFetch || !allDataDetail) return;

    const bulkData = mapDetailRows(allDataDetail.data);

    const newCache = new Map<number, BiayaExtraMuatanDetail[]>();
    for (let i = 0; i < WINDOW_SIZE; i++) {
      const pageNum = i + 1;
      const pageData = bulkData.slice(
        i * filters.limit,
        i * filters.limit + filters.limit
      );
      if (pageData.length > 0) newCache.set(pageNum, pageData);
    }

    setPageDataCache(newCache);
    setVisiblePages(Array.from({ length: WINDOW_SIZE }, (_, i) => i + 1));

    const totalItems = allDataDetail.pagination?.totalItems ?? bulkData.length;
    // pagination.totalPages dari backend dihitung memakai limit bulk
    // (limit * WINDOW_SIZE), jadi TIDAK bisa dipakai langsung — hitung ulang
    // dengan limit per-halaman yang sebenarnya.
    const totalPgs = Math.max(1, Math.ceil(totalItems / filters.limit));

    setTotalPages(totalPgs);
    setShouldBulkFetch(false);
    setIsFetching(false);

    if (bulkData.length === 0) {
      setRows([]);
      return;
    }

    const initialPrefetch = Array.from(
      { length: STREAM_BUFFER_SIZE },
      (_, i) => WINDOW_SIZE + 1 + i
    ).filter((p) => p <= totalPgs);

    if (initialPrefetch.length > 0) {
      prefetchPages(initialPrefetch, newCache, totalPgs);
    }
  }, [allDataDetail, shouldBulkFetch, filters.limit]);

  // ── 2. Fetch per-halaman saat window bergeser (buffer miss) ───────────────
  useEffect(() => {
    if (shouldBulkFetch || !allDataDetail) return;
    // currentPage 0 = fase antara dari trik setCurrentPage(0) di handleScroll
    // (memaksa effect jalan ulang walau halaman tujuan == halaman sekarang).
    // Query untuk page 0 tidak pernah dijalankan (guard di useGetBiayaExtraMuatanDetail),
    // jadi `allDataDetail` di sini masih milik halaman lama — kalau tidak
    // dihentikan, datanya tersimpan ke pageDataCache dengan key 0 yang tak
    // pernah dirender.
    if (currentPage < 1) return;

    const newRows = mapDetailRows(allDataDetail.data);

    setPageDataCache((prevCache) => {
      const newCache = new Map(prevCache);
      newCache.set(currentPage, newRows);
      return newCache;
    });

    isPageTransitionRef.current = true;
    const maxVisible = Math.max(...visiblePages);
    const minVisible = Math.min(...visiblePages);

    if (currentPage > maxVisible && currentPage <= maxVisible + 1) {
      // SCROLL KE BAWAH: buang halaman teratas, sisipkan halaman baru di bawah.
      const removedPage = visiblePages[0];
      pendingScrollAdjustment.current = -(filters.limit * ROW_HEIGHT);
      shiftSelectionForWindow(-filters.limit);

      setPageDataCache((prev) => {
        const updated = new Map(prev);
        updated.delete(removedPage);
        return updated;
      });
      setVisiblePages((prevVisible) => [...prevVisible.slice(1), currentPage]);
    } else if (currentPage < minVisible && currentPage >= minVisible - 1) {
      // SCROLL KE ATAS: kebalikannya.
      const removedPage = visiblePages[visiblePages.length - 1];
      pendingScrollAdjustment.current = filters.limit * ROW_HEIGHT;
      shiftSelectionForWindow(filters.limit);

      setPageDataCache((prev) => {
        const updated = new Map(prev);
        updated.delete(removedPage);
        return updated;
      });
      setVisiblePages((prevVisible) => [
        currentPage,
        ...prevVisible.slice(0, WINDOW_SIZE - 1)
      ]);
    }

    if (allDataDetail.pagination?.totalPages) {
      setTotalPages(allDataDetail.pagination.totalPages);
    }

    setTimeout(() => {
      setIsTransitioning(false);
      setIsFetching(false);

      const isScrollDown = currentPage >= Math.max(...visiblePages);
      const pagesToPrefetch = isScrollDown
        ? Array.from(
            { length: STREAM_BUFFER_SIZE },
            (_, i) => currentPage + 1 + i
          ).filter((p) => p <= totalPages)
        : Array.from(
            { length: STREAM_BUFFER_SIZE },
            (_, i) => currentPage - 1 - i
          ).filter((p) => p >= 1);

      if (pagesToPrefetch.length > 0) {
        setTimeout(() => prefetchPages(pagesToPrefetch), 200);
      }
    }, 100);
  }, [allDataDetail, currentPage, shouldBulkFetch]);

  // ── 3. Row combiner: gabungkan halaman-halaman window jadi `rows` ─────────
  useEffect(() => {
    const combinedRows: BiayaExtraMuatanDetail[] = [];
    visiblePages?.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (pageData) combinedRows.push(...pageData);
    });

    if (combinedRows.length === 0) return;

    setRows(combinedRows);

    if (isPageTransitionRef.current) {
      isPageTransitionRef.current = false;
      // Commit selectedRow yang sudah digeser BERSAMAAN dengan setRows, supaya
      // highlight (getRowClass) tidak berkedip di frame antara.
      const targetRow = Math.min(
        Math.max(selectedRowRef.current, 0),
        combinedRows.length - 1
      );
      selectedRowRef.current = targetRow;
      setSelectedRow(targetRow);
    }
  }, [visiblePages, pageDataCache]);

  // ── 4. Kompensasi scroll setelah window bergeser ──────────────────────────
  // Window geser 1 halaman = `rows` bertambah/berkurang filters.limit baris di
  // salah satu ujung. Tanpa menggeser scrollTop sebesar tinggi halaman itu,
  // konten akan melompat di bawah kursor user.
  useLayoutEffect(() => {
    if (pendingScrollAdjustment.current !== 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;

      container.scrollTop += pendingScrollAdjustment.current;

      // Sinkronkan referensi supaya handleScroll tidak mengira ini scroll manual.
      scrollPositionRef.current = container.scrollTop;
      lastScrollTopRef.current = container.scrollTop;
      hasAdjustedScrollRef.current = true;

      pendingScrollAdjustment.current = 0;

      // Re-anchor selected cell react-data-grid ke index baris yang sudah
      // digeser -- HANYA jika window-shift dipicu navigasi keyboard. Saat mouse
      // scroll, user tidak sedang menavigasi sel, jadi sel aktif tidak boleh
      // ikut pindah. Karena scrollTop sudah dikompensasi di atas, baris target
      // berada di posisi visual yang sama -> selectCell TIDAK memicu scroll
      // tambahan (cell sudah di viewport), jadi tampilan tidak loncat.
      if (reanchorFromKeyboardRef.current) {
        const targetRow = selectedRowRef.current;
        const idxFromKey = finalColumns.findIndex(
          (c) => c.key === selectedCellKey
        );
        const idx = idxFromKey >= 0 ? idxFromKey : 1;
        gridRef.current?.selectCell?.({ rowIdx: targetRow, idx });
        // selectCell sudah memindahkan DOM focus ke sel target.
        gridCellHadFocusRef.current = false;
      } else {
        // Jalur pointer: sel aktif RDG tidak dipindah, tapi elemen DOM-nya ikut
        // ter-unmount bersama halaman yang dibuang. Pasang lagi focus-nya ke sel
        // aktif yang baru supaya Arrow/PageUp/PageDown langsung menarik pandangan
        // kembali ke baris yang ter-select.
        restoreGridCellFocus();
      }
      reanchorFromKeyboardRef.current = false;
    }
  }, [rows]);

  // headerData berganti (user pindah baris header) = dataset benar-benar lain.
  // Buang seluruh window + buffer, jangan sampai detail bukti sebelumnya ikut
  // tergabung ke grid.
  useEffect(() => {
    setRows([]);
    setSelectedRow(0);
    resetBufferingCache();
  }, [headerData?.id, resetBufferingCache]);

  async function handleKeyDown(
    args: CellKeyDownArgs<BiayaExtraMuatanDetail>,
    event: React.KeyboardEvent
  ) {
    if (event.key === 'ArrowUp' && args.rowIdx === 0) {
      event.preventDefault();
    }
  }

  useEffect(() => {
    const headerCells = document.querySelectorAll('.rdg-header-row .rdg-cell');
    headerCells.forEach((cell) => {
      cell.setAttribute('tabindex', '-1');
    });
  }, []);

  // Effect refetch manual saat `filters` berubah SENGAJA dihapus. queryParams
  // ikut masuk ke query key react-query, jadi perubahan filter/sort/halaman
  // sudah otomatis memicu fetch. Dengan cacheTime 0, refetch() manual di atasnya
  // hanya menghasilkan request kedua untuk data yang sama. Sama seperti
  // GridAlatbayar & GridPengeluaranDetail.

  useEffect(() => {
    return () => {
      debouncedFilterUpdate.cancel();
    };
  }, []);

  return (
    <div className={`flex h-[100%] w-full justify-center`}>
      <div
        className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background"
        onKeyDownCapture={(event) => {
          // Tandai modalitas keyboard untuk SEMUA tombol navigasi. Ini yang
          // membuat re-anchor selectCell aktif untuk keyboard, terpisah dari
          // scroll pakai mouse.
          if (
            event.key === 'ArrowDown' ||
            event.key === 'ArrowUp' ||
            event.key === 'PageDown' ||
            event.key === 'PageUp'
          ) {
            interactionModeRef.current = 'keyboard';
          }
        }}
        onWheelCapture={() => {
          interactionModeRef.current = 'pointer';
        }}
        onPointerDownCapture={() => {
          interactionModeRef.current = 'pointer';
        }}
      >
        <div className="flex h-[38px] w-full flex-row items-center justify-between rounded-t-sm border-b border-border bg-background-grid-header px-2">
          <div className="flex flex-row items-center">
            <label htmlFor="" className="text-xs">
              SEARCH :
            </label>
            <div className="relative flex w-[200px] flex-row items-center">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  handleInputChange(e);
                }}
                className="m-2 h-[28px] w-[200px] rounded-sm"
                placeholder="Type to search..."
              />
              {(filters.search !== '' || inputValue !== '') && (
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute right-2 text-gray-500 hover:bg-transparent"
                  onClick={handleClearInput}
                >
                  <Image src={IcClose} width={15} height={15} alt="close" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-row items-center">
            <DraggableColumn
              defaultColumns={columns}
              saveColumns={finalColumns}
              userId={user.id}
              gridName="GridBiayaExtraMuatanDetail"
              setColumnsOrder={setColumnsOrder}
              setColumnsWidth={setColumnsWidth}
              onReset={() => {
                setDataGridKey((prevKey) => prevKey + 1);
                gridRef?.current?.selectCell({ rowIdx: 0, idx: 0 });
              }}
            />
          </div>
        </div>
        <DataGrid
          key={dataGridKey}
          ref={gridRef}
          columns={finalColumns}
          onColumnResize={onColumnResize}
          onColumnsReorder={onColumnsReorder}
          rows={rows ?? []}
          rowClass={getRowClass}
          onSelectedCellChange={(args) => {
            setSelectedCellKey(args.column.key);
            handleCellClick({ row: args.row });
          }}
          rowKeyGetter={rowKeyGetter}
          headerRowHeight={70}
          onCellKeyDown={handleKeyDown}
          rowHeight={ROW_HEIGHT}
          onScroll={handleScroll}
          renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
          className={`${isDark ? 'rdg-dark' : 'rdg-light'} fill-grid`}
          enableVirtualization={false}
        />
        {contextMenu && (
          <div
            ref={contextMenuRef}
            className="bg-background-input"
            style={{
              position: 'fixed', // Fixed agar koordinat sesuai dengan viewport
              top: contextMenu.y, // Pastikan contextMenu.y berasal dari event.clientY
              left: contextMenu.x, // Pastikan contextMenu.x berasal dari event.clientX
              boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
              padding: '8px',
              borderRadius: '4px',
              zIndex: 1000
            }}
          >
            <Button
              variant="default"
              onClick={() => {
                resetGridConfig(
                  user.id,
                  'GridBiayaExtraMuatanDetail',
                  columns,
                  setColumnsOrder,
                  setColumnsWidth
                );
                setContextMenu(null);
                setDataGridKey((prevKey) => prevKey + 1);
                gridRef?.current?.selectCell({ rowIdx: 0, idx: 0 });
              }}
            >
              Reset
            </Button>
          </div>
        )}
        <div className="flex flex-row items-center justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2">
          <span className="text-xs">
            {rows.length > 0
              ? `Menampilkan ${startRow} - ${startRow + rows.length - 1} dari ${
                  allDataDetail?.pagination?.totalItems ?? rows.length
                } data`
              : ''}
          </span>
          {isLoading ? <LoadRowsRenderer /> : null}
        </div>
      </div>
    </div>
  );
};

export default GridBiayaExtraMuatanDetail;
