/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
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
import {
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import {
  filterScheduleDetail,
  ScheduleDetail
} from '@/lib/types/scheduleheader.type';
import { useGetScheduleDetail } from '@/lib/server/useSchedule';
import { getScheduleDetailFn } from '@/lib/apis/schedule.api';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import IcClose from '@/public/image/x.svg';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import { debounce } from 'lodash';
import FilterInput from '@/components/custom-ui/FilterInput';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { useTheme } from 'next-themes';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { useSession } from 'next-auth/react';
import { hashQueryKey } from 'react-query';
import { HEADER_ROW_HEIGHT, LIMIT, ROW_HEIGHT } from '@/constants/constant';

interface Filter {
  page: number;
  limit: number;
  search: string;
  filters: typeof filterScheduleDetail;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridScheduleDetail = () => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const headerData = useSelector((state: RootState) => state.header.headerData);
  const { data: session } = useSession();

  // Rincian schedule diambil per id header (path param), bukan lewat filter
  // nobukti seperti modul lain — endpointnya /schedule-detail/:id.
  const scheduleId = headerData?.id ? String(headerData.id) : undefined;

  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: LIMIT,
    filters: { ...filterScheduleDetail },
    search: '',
    sortBy: 'id',
    sortDirection: 'asc'
  });

  // ── Lazy loading + caching (pola GridJurnalUmumDetail) ────────────────────
  // Grid hanya menyimpan WINDOW_SIZE halaman di memori (`visiblePages`), isinya
  // di `pageDataCache`. Halaman di luar window dibuang; halaman berikutnya
  // di-prefetch diam-diam ke `streamBufferRef` supaya saat user scroll sampai
  // ambang batas, data sudah ada dan window bergeser tanpa spinner.
  const WINDOW_SIZE = 5;
  const STREAM_BUFFER_SIZE = 5;

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
    Map<number, ScheduleDetail[]>
  >(new Map());
  const streamBufferRef = useRef<Map<number, ScheduleDetail[]>>(new Map());
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

  // Menggeser index baris terpilih saat window bergeser, supaya baris DATA yang
  // sama tetap ter-highlight. Posisi visual dijaga oleh kompensasi scrollTop
  // (pendingScrollAdjustment), jadi jangan panggil selectCell di sini.
  const shiftSelectionForWindow = (deltaRows: number) => {
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

  const {
    data: detail,
    isLoading,
    dataUpdatedAt
  } = useGetScheduleDetail(scheduleId, queryParams);

  const [rows, setRows] = useState<ScheduleDetail[]>([]);
  const [selectedRow, setSelectedRow] = useState<number>(0);
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
      filters: { ...filterScheduleDetail },
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
      setInputValue('');
      setFilters((prev) => ({
        ...prev,
        search: '',
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

  const handleSort = (column: string) => {
    const originalIndex = columns.findIndex((col) => col.key === column);

    // index tampilan berdasar columnsOrder; jika belum ada reorder
    // (columnsOrder kosong), fallback ke originalIndex
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

  const columns = useMemo((): Column<ScheduleDetail>[] => {
    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 50,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full flex-col items-center gap-1">
            <div className="headers-cell h-[50%] items-center justify-center text-center">
              <p className="text-sm font-normal">No.</p>
            </div>

            <div
              className="flex h-[50%] w-full cursor-pointer items-center justify-center"
              onClick={() => {
                setFilters({
                  ...filters,
                  search: '',
                  page: 1,
                  filters: { ...filterScheduleDetail }
                }),
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
        renderHeaderCell: () => (
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
        key: 'pelayaran',
        name: 'pelayaran',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('pelayaran')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'pelayaran' ? 'font-bold' : 'font-normal'
                }`}
              >
                PELAYARAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'pelayaran' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'pelayaran' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="pelayaran"
                value={filters.filters.pelayaran || ''}
                onChange={(value) =>
                  handleFilterInputChange('pelayaran', value)
                }
                onClear={() => handleClearFilter('pelayaran')}
                inputRef={(el) => {
                  inputColRefs.current['pelayaran'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.pelayaran || '';
          const cellValue = props.row.pelayaran_nama || '';
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
        key: 'kapal',
        name: 'kapal',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('kapal')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kapal' ? 'font-bold' : 'font-normal'
                }`}
              >
                KAPAL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kapal' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kapal' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kapal"
                value={filters.filters.kapal || ''}
                onChange={(value) => handleFilterInputChange('kapal', value)}
                onClear={() => handleClearFilter('kapal')}
                inputRef={(el) => {
                  inputColRefs.current['kapal'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kapal || '';
          const cellValue = props.row.kapal_nama || '';
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
        key: 'tujuankapal',
        name: 'tujuan kapal',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('tujuankapal')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tujuankapal' ? 'font-bold' : 'font-normal'
                }`}
              >
                TUJUAN KAPAL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tujuankapal' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tujuankapal' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tujuankapal"
                value={filters.filters.tujuankapal || ''}
                onChange={(value) =>
                  handleFilterInputChange('tujuankapal', value)
                }
                onClear={() => handleClearFilter('tujuankapal')}
                inputRef={(el) => {
                  inputColRefs.current['tujuankapal'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tujuankapal || '';
          const cellValue = props.row.tujuankapal_nama || '';
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
        key: 'tglberangkat',
        name: 'tgl berangkat',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('tglberangkat')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tglberangkat'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                TGL BERANGKAT
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tglberangkat' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tglberangkat' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tglberangkat"
                value={filters.filters.tglberangkat || ''}
                onChange={(value) =>
                  handleFilterInputChange('tglberangkat', value)
                }
                onClear={() => handleClearFilter('tglberangkat')}
                inputRef={(el) => {
                  inputColRefs.current['tglberangkat'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tglberangkat || '';
          const cellValue = props.row.tglberangkat || '';
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
        key: 'tgltiba',
        name: 'tgl tiba',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('tgltiba')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tgltiba' ? 'font-bold' : 'font-normal'
                }`}
              >
                TGL TIBA
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tgltiba' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tgltiba' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tgltiba"
                value={filters.filters.tgltiba || ''}
                onChange={(value) => handleFilterInputChange('tgltiba', value)}
                onClear={() => handleClearFilter('tgltiba')}
                inputRef={(el) => {
                  inputColRefs.current['tgltiba'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tgltiba || '';
          const cellValue = props.row.tgltiba || '';
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
        key: 'etb',
        name: 'etb',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('etb')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'etb' ? 'font-bold' : 'font-normal'
                }`}
              >
                ETB
              </p>
              <div className="ml-2">
                {filters.sortBy === 'etb' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'etb' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="etb"
                value={filters.filters.etb || ''}
                onChange={(value) => handleFilterInputChange('etb', value)}
                onClear={() => handleClearFilter('etb')}
                inputRef={(el) => {
                  inputColRefs.current['etb'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.etb || '';
          const cellValue = props.row.etb || '';
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
        key: 'eta',
        name: 'eta',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('eta')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'eta' ? 'font-bold' : 'font-normal'
                }`}
              >
                ETA
              </p>
              <div className="ml-2">
                {filters.sortBy === 'eta' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'eta' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="eta"
                value={filters.filters.eta || ''}
                onChange={(value) => handleFilterInputChange('eta', value)}
                onClear={() => handleClearFilter('eta')}
                inputRef={(el) => {
                  inputColRefs.current['eta'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.eta || '';
          const cellValue = props.row.eta || '';
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
        key: 'etd',
        name: 'etd',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('etd')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'etd' ? 'font-bold' : 'font-normal'
                }`}
              >
                ETD
              </p>
              <div className="ml-2">
                {filters.sortBy === 'etd' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'etd' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="etd"
                value={filters.filters.etd || ''}
                onChange={(value) => handleFilterInputChange('etd', value)}
                onClear={() => handleClearFilter('etd')}
                inputRef={(el) => {
                  inputColRefs.current['etd'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.etd || '';
          const cellValue = props.row.etd || '';
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
        key: 'voyberangkat',
        name: 'voy berangkat',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('voyberangkat')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'voyberangkat'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                VOY BERANGKAT
              </p>
              <div className="ml-2">
                {filters.sortBy === 'voyberangkat' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'voyberangkat' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="voyberangkat"
                value={filters.filters.voyberangkat || ''}
                onChange={(value) =>
                  handleFilterInputChange('voyberangkat', value)
                }
                onClear={() => handleClearFilter('voyberangkat')}
                inputRef={(el) => {
                  inputColRefs.current['voyberangkat'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.voyberangkat || '';
          const cellValue = props.row.voyberangkat || '';
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
        key: 'voytiba',
        name: 'voy tiba',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('voytiba')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'voytiba' ? 'font-bold' : 'font-normal'
                }`}
              >
                VOY TIBA
              </p>
              <div className="ml-2">
                {filters.sortBy === 'voytiba' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'voytiba' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="voytiba"
                value={filters.filters.voytiba || ''}
                onChange={(value) => handleFilterInputChange('voytiba', value)}
                onClear={() => handleClearFilter('voytiba')}
                inputRef={(el) => {
                  inputColRefs.current['voytiba'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.voytiba || '';
          const cellValue = props.row.voytiba || '';
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
        key: 'closing',
        name: 'closing',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('closing')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'closing' ? 'font-bold' : 'font-normal'
                }`}
              >
                CLOSING
              </p>
              <div className="ml-2">
                {filters.sortBy === 'closing' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'closing' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="closing"
                value={filters.filters.closing || ''}
                onChange={(value) => handleFilterInputChange('closing', value)}
                onClear={() => handleClearFilter('closing')}
                inputRef={(el) => {
                  inputColRefs.current['closing'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.closing || '';
          const cellValue = props.row.closing || '';
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
        key: 'etatujuan',
        name: 'eta tujuan',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('etatujuan')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'etatujuan' ? 'font-bold' : 'font-normal'
                }`}
              >
                ETA TUJUAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'etatujuan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'etatujuan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="etatujuan"
                value={filters.filters.etatujuan || ''}
                onChange={(value) =>
                  handleFilterInputChange('etatujuan', value)
                }
                onClear={() => handleClearFilter('etatujuan')}
                inputRef={(el) => {
                  inputColRefs.current['etatujuan'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.etatujuan || '';
          const cellValue = props.row.etatujuan || '';
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
        key: 'etdtujuan',
        name: 'etd tujuan',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('etdtujuan')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'etdtujuan' ? 'font-bold' : 'font-normal'
                }`}
              >
                ETD TUJUAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'etdtujuan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'etdtujuan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="etdtujuan"
                value={filters.filters.etdtujuan || ''}
                onChange={(value) =>
                  handleFilterInputChange('etdtujuan', value)
                }
                onClear={() => handleClearFilter('etdtujuan')}
                inputRef={(el) => {
                  inputColRefs.current['etdtujuan'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.etdtujuan || '';
          const cellValue = props.row.etdtujuan || '';
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
        key: 'keterangan',
        name: 'keterangan',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: () => (
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
      }
    ];
  }, [rows, filters, minVisiblePage]);

  function getRowClass(row: ScheduleDetail) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: ScheduleDetail) {
    return row.id;
  }

  function handleCellClick(args: { row: ScheduleDetail }) {
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
        String(session?.user?.id),
        'GridScheduleDetail',
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
        String(session?.user?.id),
        'GridScheduleDetail',
        [...newOrder],
        columnsWidth
      );
      return newOrder;
    });
  };

  const handleClearInput = () => {
    setFilters((prev) => ({
      ...prev,
      search: '',
      page: 1
    }));
    setInputValue('');
    resetBufferingCache();
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
    (data: any[] | undefined | null): ScheduleDetail[] =>
      (data ?? []).map((item: any) => ({
        id: item.id,
        schedule_id: item.schedule_id,
        nobukti: item.nobukti,
        pelayaran_id: item.pelayaran_id,
        pelayaran_nama: item.pelayaran_nama,
        kapal_id: item.kapal_id,
        kapal_nama: item.kapal_nama,
        tujuankapal_id: item.tujuankapal_id,
        tujuankapal_nama: item.tujuankapal_nama,
        schedulekapal_id: item.schedulekapal_id ?? null,
        tglberangkat: item.tglberangkat,
        tgltiba: item.tgltiba,
        etb: item.etb,
        eta: item.eta,
        etd: item.etd,
        voyberangkat: item.voyberangkat,
        voytiba: item.voytiba,
        closing: item.closing,
        closingForDateTime: item.closingForDateTime ?? null,
        etatujuan: item.etatujuan,
        etdtujuan: item.etdtujuan,
        keterangan: item.keterangan,
        modifiedby: item.modifiedby ?? '',
        created_at: item.created_at ?? '',
        updated_at: item.updated_at ?? ''
      })),
    []
  );

  // Tarik halaman-halaman berikutnya diam-diam ke streamBuffer. Saat window
  // nanti bergeser ke salah satunya, datanya sudah ada -> tidak ada spinner &
  // tidak ada network latency di jalur scroll.
  const prefetchPages = useCallback(
    async (
      pagesToFetch: number[],
      existingCache?: Map<number, ScheduleDetail[]>,
      knownTotalPages?: number
    ) => {
      if (!scheduleId) return;

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
            const data = await getScheduleDetailFn(scheduleId, {
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
      scheduleId,
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
    if (!session?.user?.id) return;
    loadGridConfig(
      String(session?.user?.id),
      'GridScheduleDetail',
      columns,
      setColumnsOrder,
      setColumnsWidth
    );
  }, [session]);

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
    if (!shouldBulkFetch || !detail) return;

    const bulkData = mapDetailRows(detail.data);

    const newCache = new Map<number, ScheduleDetail[]>();
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

    const totalItems = detail.pagination?.totalItems ?? bulkData.length;
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
  }, [detail, shouldBulkFetch, filters.limit]);

  // ── 2. Fetch per-halaman saat window bergeser (buffer miss) ───────────────
  useEffect(() => {
    if (shouldBulkFetch || !detail) return;
    // currentPage 0 = fase antara dari trik setCurrentPage(0) di handleScroll
    // (memaksa effect jalan ulang walau halaman tujuan == halaman sekarang).
    // Query untuk page 0 tidak pernah dijalankan (guard di useGetScheduleDetail),
    // jadi `detail` di sini masih milik halaman lama.
    if (currentPage < 1) return;

    const newRows = mapDetailRows(detail.data);

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

    if (detail.pagination?.totalPages) {
      setTotalPages(detail.pagination.totalPages);
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
  }, [detail, currentPage, shouldBulkFetch]);

  // ── 2b. Data di-refresh dari luar (invalidateQueries setelah header diedit) ─
  // Refetch semacam ini cuma membawa data currentPage, sedangkan halaman lain di
  // window masih hasil bulk fetch sebelum edit. Reset window supaya seluruhnya
  // dirakit ulang; tanpa ini baris detail yang baru diedit tetap tampil lama.
  // Penandanya adalah query key yang TIDAK berubah: fetch milik grid sendiri
  // (bulk -> per-halaman, geser window, filter/sort) selalu mengubah key,
  // sedangkan invalidateQueries me-refetch key yang sama. Tanpa perbandingan key
  // ini, pergantian limit bulk -> per-halaman ikut terbaca sebagai refresh luar
  // dan reset-nya memicu bulk fetch lagi — loop request tanpa henti.
  const lastFetchRef = useRef({ key: '', updatedAt: 0 });
  useEffect(() => {
    if (!dataUpdatedAt) return;

    const key = hashQueryKey(['scheduledetail', scheduleId, queryParams]);
    const previous = lastFetchRef.current;
    lastFetchRef.current = { key, updatedAt: dataUpdatedAt };

    if (previous.updatedAt === 0 || key !== previous.key) return;
    if (dataUpdatedAt === previous.updatedAt) return;
    if (shouldBulkFetch || isFetching || isTransitioning) return;

    resetBufferingCache();
  }, [dataUpdatedAt, scheduleId, queryParams]);

  // ── 3. Row combiner: gabungkan halaman-halaman window jadi `rows` ─────────
  useEffect(() => {
    const combinedRows: ScheduleDetail[] = [];
    visiblePages?.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (pageData) combinedRows.push(...pageData);
    });

    if (combinedRows.length === 0) {
      // Window kosong (header tidak punya baris / filter tidak match): jangan
      // biarkan hasil bukti sebelumnya tetap terpampang.
      setRows((prev) => (prev.length > 0 ? [] : prev));
      selectedRowRef.current = 0;
      setSelectedRow(0);
      isPageTransitionRef.current = false;
      pendingScrollAdjustment.current = 0;
      return;
    }

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
    }
  }, [rows]);

  // Header berganti (user pindah baris di grid header) = dataset benar-benar
  // lain. Buang seluruh window + buffer beserta filter kolomnya, jangan sampai
  // rincian bukti sebelumnya ikut tergabung ke grid.
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      filters: { ...filterScheduleDetail },
      page: 1
    }));
    setRows([]);
    setSelectedRow(0);
    resetBufferingCache();
  }, [scheduleId, resetBufferingCache]);

  async function handleKeyDown(
    args: CellKeyDownArgs<ScheduleDetail>,
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

  useEffect(() => {
    return () => {
      debouncedFilterUpdate.cancel();
    };
  }, []);

  return (
    <div className={`flex h-[100%] w-full justify-center`}>
      <div className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background">
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
              userId={String(session?.user?.id)}
              gridName="GridScheduleDetail"
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
            handleCellClick({ row: args.row });
          }}
          rowKeyGetter={rowKeyGetter}
          headerRowHeight={HEADER_ROW_HEIGHT}
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
                  String(session?.user?.id),
                  'GridScheduleDetail',
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
                  detail?.pagination?.totalItems ?? rows.length
                } data`
              : ''}
          </span>
          {isLoading ? <LoadRowsRenderer /> : null}
        </div>
      </div>
    </div>
  );
};

export default GridScheduleDetail;
