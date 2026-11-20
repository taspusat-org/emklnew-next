'use client';

import Image from 'next/image';
import { debounce } from 'lodash';
import 'react-data-grid/lib/styles.scss';
import { useSelector } from 'react-redux';
import IcClose from '@/public/image/x.svg';
import { RootState } from '@/lib/store/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import FilterInput from '@/components/custom-ui/FilterInput';
import { FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { hashQueryKey } from 'react-query';
import { useGetShippingInstructionDetailRincian } from '@/lib/server/useShippingIntruction';
import { getShippingInstructionDetailRincianFn } from '@/lib/apis/shippinginstruction.api';
import { HEADER_ROW_HEIGHT, LIMIT, ROW_HEIGHT } from '@/constants/constant';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  filterShippingInstructionDetailRincian,
  ShippingInstructionDetailRincian
} from '@/lib/types/shippingIntruction.type';
import {
  cancelPreviousRequest,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import DataGrid, {
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { useTheme } from 'next-themes';

interface Filter {
  page: number;
  limit: number;
  search: string;
  filters: typeof filterShippingInstructionDetailRincian;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridShippingInstructionDetailRincian = () => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const { user } = useSelector((state: RootState) => state.auth);
  const detailData = useSelector((state: RootState) => state.header.detailData);

  const gridRef = useRef<DataGridHandle>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // AbortController untuk cancel request
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const [dataGridKey, setDataGridKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [rows, setRows] = useState<ShippingInstructionDetailRincian[]>([]);
  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
  const [fetchedPages, setFetchedPages] = useState<Set<number>>(new Set([1]));
  const [columnsWidth, setColumnsWidth] = useState<{ [key: string]: number }>(
    {}
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: LIMIT,
    search: '',
    filters: filterShippingInstructionDetailRincian,
    sortBy: 'shippinginstructiondetail_nobukti',
    sortDirection: 'asc'
  });

  // ── Lazy loading + caching (pola GridBiayaExtraMuatanDetail) ──────────────
  // Penjelasan lengkap tiap ref/state ada di GridShippingInstructionDetail;
  // di sini bentuknya sama persis, hanya sumber datanya rincian per baris
  // detail.
  const WINDOW_SIZE = 5;
  const STREAM_BUFFER_SIZE = 5;

  const [shouldBulkFetch, setShouldBulkFetch] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5]);
  const minVisiblePage = useMemo(
    () => (visiblePages.length > 0 ? Math.min(...visiblePages) : 1),
    [visiblePages]
  );
  const [pageDataCache, setPageDataCache] = useState<
    Map<number, ShippingInstructionDetailRincian[]>
  >(new Map());
  const streamBufferRef = useRef<
    Map<number, ShippingInstructionDetailRincian[]>
  >(new Map());
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
  // Index KOLOM sel aktif — dicatat supaya re-anchor selectCell setelah window
  // bergeser tidak melompat ke kolom lain.
  const selectedCellIdxRef = useRef<number>(1);

  // Modalitas input terakhir: 'keyboard' (Arrow/Page) atau 'pointer' (wheel /
  // drag scrollbar). Menentukan apakah sel aktif ikut digeser & di-re-anchor
  // saat window bergeser — scroll pakai mouse TIDAK boleh memindahkan sel aktif.
  const interactionModeRef = useRef<'keyboard' | 'pointer'>('pointer');
  // Diset saat window benar-benar bergeser: menandai apakah pergeseran itu dari
  // keyboard, supaya kompensasi scroll tahu perlu re-anchor selectCell atau tidak.
  const reanchorFromKeyboardRef = useRef(false);
  // Snapshot: apakah sel aktif memegang DOM focus TEPAT SEBELUM window bergeser.
  // Harus direkam sebelum commit, karena setelahnya elemen selnya sudah hilang.
  const gridCellHadFocusRef = useRef(false);

  // Sel aktif react-data-grid selalu punya tabindex="0" (roving tabindex).
  // Header memakai role="columnheader", jadi selector ini hanya kena sel data —
  // input filter di header TIDAK ikut tertangkap.
  const getSelectedGridCell = (): HTMLElement | null =>
    gridRef.current?.element?.querySelector<HTMLElement>(
      ':scope > [role="row"] > [role="gridcell"][tabindex="0"]'
    ) ?? null;

  const isSelectedGridCellFocused = () => {
    const cell = getSelectedGridCell();
    return cell !== null && cell === document.activeElement;
  };

  // Saat window bergeser, baris pemegang DOM focus ikut ter-unmount sehingga
  // focus jatuh ke <body> dan Arrow/PageUp/PageDown berhenti sampai ke grid.
  // Kembalikan focus TANPA menggeser scroll.
  const restoreGridCellFocus = () => {
    if (!gridCellHadFocusRef.current) return;
    gridCellHadFocusRef.current = false;
    getSelectedGridCell()?.focus({ preventScroll: true });
  };

  const shiftSelectionForWindow = (deltaRows: number) => {
    const fromKeyboard = interactionModeRef.current === 'keyboard';
    reanchorFromKeyboardRef.current = fromKeyboard;
    // Rekam SEKARANG, sebelum React meng-unmount baris halaman yang dibuang.
    gridCellHadFocusRef.current = isSelectedGridCellFocused();

    // Pointer: biarkan index apa adanya supaya tetap sinkron dgn sel aktif RDG.
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
    data: allDataRincian,
    isLoading,
    dataUpdatedAt
  } = useGetShippingInstructionDetailRincian(detailData?.id, queryParams);

  // Dipakai bulk fetch, fetch per-halaman, DAN prefetch — kalau disalin tiga
  // kali, bentuk baris antar-halaman bisa berbeda diam-diam.
  const mapRincianRows = useCallback(
    (data: any[] | undefined): ShippingInstructionDetailRincian[] =>
      (data ?? []).map((item: any) => ({
        id: item.id,
        nobukti: item.nobukti,
        shippinginstructiondetail_nobukti:
          item.shippinginstructiondetail_nobukti,
        shippinginstructiondetail_id: item.shippinginstructiondetail_id,
        orderanmuatan_nobukti: item.orderanmuatan_nobukti,
        comodity: item.comodity,
        keterangan: item.keterangan
      })) as ShippingInstructionDetailRincian[],
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelPreviousRequest(abortControllerRef);
    const searchValue = e.target.value;
    setInputValue(searchValue);

    // Menunggu beberapa waktu sebelum update filter
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      // Mengupdate filter setelah debounce
      setCurrentPage(1);
      setFilters((prev) => ({
        ...prev,
        filters: filterShippingInstructionDetailRincian,
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
      // Filter/search berubah = dataset lain. Buang window + stream buffer.
      resetBufferingCache();
    }, 300); // Mengatur debounce hanya untuk update filter
  };

  const debouncedFilterUpdate = useRef(
    debounce((colKey: string, value: string) => {
      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, [colKey]: value },
        page: 1,
        search: ''
      }));
      setRows([]);
      setSelectedRow(0);
      resetBufferingCache();
    }, 300) // Bisa dikurangi jadi 250-300ms
  ).current;

  const handleFilterInputChange = useCallback(
    (colKey: string, value: string) => {
      cancelPreviousRequest(abortControllerRef);
      setInputValue(''); // Reset global search input saat filter kolom diubah
      debouncedFilterUpdate(colKey, value);
    },
    []
  );

  const handleClearFilter = useCallback(
    (colKey: string) => {
      cancelPreviousRequest(abortControllerRef);
      debouncedFilterUpdate.cancel(); // Cancel pending updates

      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, [colKey]: '' },
        page: 1
      }));
      setRows([]);
      resetBufferingCache();
    },
    [resetBufferingCache]
  );

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
  };

  const handleSort = (column: string) => {
    cancelPreviousRequest(abortControllerRef);
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
    }, 250);
    setSelectedRow(0);
    setFetchedPages(new Set([1]));
    setRows([]);
    resetBufferingCache();
  };

  const columns = useMemo((): Column<ShippingInstructionDetailRincian>[] => {
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
                setFilters({
                  ...filters,
                  search: '',
                  filters: filterShippingInstructionDetailRincian
                }),
                  setInputValue('');
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
          // Nomor ABSOLUT, bukan index dalam window: `rows` hanya memuat
          // WINDOW_SIZE halaman yang sedang terlihat.
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
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
                    {highlightText(cellValue, filters.search, columnFilter)}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
                >
                  <p>{cellValue}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
      },
      {
        key: 'shippinginstructiondetail_nobukti',
        name: 'shipping instruction detail nobukti',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 300,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('detail_nobukti')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'detail_nobukti'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                NO BUKTI SHIPPING INSTRUCTION DETAIL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'detail_nobukti' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'detail_nobukti' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="shippinginstructiondetail_nobukti"
                value={filters.filters.detail_nobukti || ''}
                onChange={(value) =>
                  handleFilterInputChange('detail_nobukti', value)
                }
                onClear={() => handleClearFilter('detail_nobukti')}
                inputRef={(el) => {
                  inputColRefs.current['shippinginstructiondetail_nobukti'] =
                    el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.detail_nobukti || '';
          const cellValue = props.row.shippinginstructiondetail_nobukti || '';
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
                    {highlightText(cellValue, filters.search, columnFilter)}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
                >
                  <p>{cellValue}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
      },
      {
        key: 'orderanmuatan_nobukti',
        name: 'job',
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
                JOB
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
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
                    {highlightText(cellValue, filters.search, columnFilter)}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
                >
                  <p>{cellValue}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
      },
      {
        key: 'comodity',
        name: 'comodity',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('comodity')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'comodity' ? 'font-bold' : 'font-normal'
                }`}
              >
                COMODITY
              </p>
              <div className="ml-2">
                {filters.sortBy === 'comodity' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'comodity' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="comodity"
                value={filters.filters.comodity || ''}
                onChange={(value) => handleFilterInputChange('comodity', value)}
                onClear={() => handleClearFilter('comodity')}
                inputRef={(el) => {
                  inputColRefs.current['comodity'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.comodity || '';
          const cellValue = props.row.comodity || '';
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
                    {highlightText(cellValue, filters.search, columnFilter)}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
                >
                  <p>{cellValue}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
                    {highlightText(cellValue, filters.search, columnFilter)}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
                >
                  <p>{cellValue}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
      }
    ];
  }, [rows, rows, filters.filters]);

  const prefetchPages = useCallback(
    async (
      pagesToFetch: number[],
      existingCache?: Map<number, ShippingInstructionDetailRincian[]>,
      knownTotalPages?: number
    ) => {
      if (!detailData?.id) return;
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
            const data = await getShippingInstructionDetailRincianFn(
              detailData.id,
              {
                ...queryParams,
                page: pageNum,
                limit: filters.limit
              }
            );

            if (data?.data && data.data.length > 0) {
              streamBufferRef.current = new Map(streamBufferRef.current);
              streamBufferRef.current.set(pageNum, mapRincianRows(data.data));
            }
          } catch (err) {
            // Silent fail — window tetap bisa bergeser lewat jalur fetch normal.
            console.warn(
              `[StreamBuffer] Prefetch rincian SI page ${pageNum} gagal:`,
              err
            );
          } finally {
            prefetchingPagesRef.current.delete(pageNum);
          }
        })
      );
    },
    [
      detailData?.id,
      queryParams,
      filters.limit,
      totalPages,
      pageDataCache,
      mapRincianRows
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

  const finalColumns = useMemo(() => {
    return orderedColumns.map((col) => ({
      ...col,
      width: columnsWidth[col.key] ?? col.width
    }));
  }, [orderedColumns, columnsWidth]);

  const onColumnResize = (index: number, width: number) => {
    const columnKey = columns[columnsOrder[index]].key; // 1) Dapatkan key kolom yang di-resize
    const newWidthMap = { ...columnsWidth, [columnKey]: width }; // 2) Update state width seketika (biar kolom langsung responsif)
    setColumnsWidth(newWidthMap);

    if (resizeDebounceTimeout.current) {
      // 3) Bersihkan timeout sebelumnya agar tidak menumpuk
      clearTimeout(resizeDebounceTimeout.current);
    }
    // 4) Set ulang timer: hanya ketika 300ms sejak resize terakhir berlalu, saveGridConfig akan dipanggil
    resizeDebounceTimeout.current = setTimeout(() => {
      saveGridConfig(
        user.id,
        'GridShippingInstructionDetailRincian',
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
        'GridShippingInstructionDetailRincian',
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

  function handleCellClick(args: { row: ShippingInstructionDetailRincian }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
      // Ref ikut disinkronkan: dia yang jadi acuan saat window bergeser.
      selectedRowRef.current = rowIndex;
    }
  }

  async function handleKeyDown(
    args: CellKeyDownArgs<ShippingInstructionDetailRincian>,
    event: React.KeyboardEvent
  ) {
    if (event.key === 'ArrowUp' && args.rowIdx === 0) {
      event.preventDefault();
    }
  }

  function getRowClass(row: ShippingInstructionDetailRincian) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: ShippingInstructionDetailRincian) {
    return row.id;
  }

  useEffect(() => {
    loadGridConfig(
      user.id,
      'GridShippingInstructionDetailRincian',
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
  useEffect(() => {
    if (!shouldBulkFetch || !allDataRincian) return;

    const bulkData = mapRincianRows(allDataRincian.data);

    const newCache = new Map<number, ShippingInstructionDetailRincian[]>();
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

    const totalItems = allDataRincian.pagination?.totalItems ?? bulkData.length;
    // pagination.totalPages dari backend dihitung memakai limit bulk
    // (limit * WINDOW_SIZE), jadi hitung ulang dengan limit per-halaman.
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
  }, [allDataRincian, shouldBulkFetch, filters.limit]);

  // ── 2. Fetch per-halaman saat window bergeser (buffer miss) ───────────────
  useEffect(() => {
    if (shouldBulkFetch || !allDataRincian) return;
    // currentPage 0 = fase antara dari trik setCurrentPage(0) di handleScroll.
    if (currentPage < 1) return;

    const newRows = mapRincianRows(allDataRincian.data);

    setPageDataCache((prevCache) => {
      const newCache = new Map(prevCache);
      newCache.set(currentPage, newRows);
      return newCache;
    });

    isPageTransitionRef.current = true;
    const maxVisible = Math.max(...visiblePages);
    const minVisible = Math.min(...visiblePages);

    if (currentPage > maxVisible && currentPage <= maxVisible + 1) {
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

    if (allDataRincian.pagination?.totalPages) {
      setTotalPages(allDataRincian.pagination.totalPages);
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
  }, [allDataRincian, currentPage, shouldBulkFetch]);

  // ── 2b. Data di-refresh dari luar (invalidateQueries setelah header disimpan) ─
  // Penanda: query key TIDAK berubah. Fetch milik grid sendiri selalu mengubah
  // key, sedangkan invalidateQueries me-refetch key yang sama.
  const lastFetchRef = useRef({ key: '', updatedAt: 0 });
  useEffect(() => {
    if (!dataUpdatedAt) return;

    const key = hashQueryKey([
      'shippinginstructiondetailrincian',
      detailData?.id,
      queryParams
    ]);
    const previous = lastFetchRef.current;
    lastFetchRef.current = { key, updatedAt: dataUpdatedAt };

    if (previous.updatedAt === 0 || key !== previous.key) return;
    if (dataUpdatedAt === previous.updatedAt) return;
    if (shouldBulkFetch || isFetching || isTransitioning) return;

    resetBufferingCache();
  }, [dataUpdatedAt, queryParams, detailData?.id]);

  // ── 3. Row combiner: gabungkan halaman-halaman window jadi `rows` ─────────
  useEffect(() => {
    const combinedRows: ShippingInstructionDetailRincian[] = [];
    visiblePages?.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (pageData) combinedRows.push(...pageData);
    });

    if (combinedRows.length === 0) return;

    setRows(combinedRows);

    if (isPageTransitionRef.current) {
      isPageTransitionRef.current = false;
      const targetRow = Math.min(
        Math.max(selectedRowRef.current, 0),
        combinedRows.length - 1
      );
      selectedRowRef.current = targetRow;
      setSelectedRow(targetRow);
    }
  }, [visiblePages, pageDataCache]);

  // ── 4. Kompensasi scroll setelah window bergeser ──────────────────────────
  useLayoutEffect(() => {
    if (pendingScrollAdjustment.current !== 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;

      container.scrollTop += pendingScrollAdjustment.current;

      scrollPositionRef.current = container.scrollTop;
      lastScrollTopRef.current = container.scrollTop;
      hasAdjustedScrollRef.current = true;

      pendingScrollAdjustment.current = 0;

      // Scroll sudah dikompensasi, jadi baris target ada di posisi visual yang
      // sama -> selectCell di sini tidak memicu scroll tambahan. Re-anchor HANYA
      // untuk keyboard; saat mouse scroll, sel aktif tidak boleh ikut pindah.
      if (reanchorFromKeyboardRef.current) {
        const idx =
          selectedCellIdxRef.current >= 0 ? selectedCellIdxRef.current : 1;
        gridRef.current?.selectCell?.({
          rowIdx: selectedRowRef.current,
          idx
        });
        gridCellHadFocusRef.current = false;
      } else {
        restoreGridCellFocus();
      }
      reanchorFromKeyboardRef.current = false;
    }
  }, [rows]);

  useEffect(() => {
    const headerCells = document.querySelectorAll('.rdg-header-row .rdg-cell');
    headerCells.forEach((cell) => {
      cell.setAttribute('tabindex', '-1');
    });
  }, []);

  // detailData berganti (user pindah baris detail) = dataset benar-benar lain.
  // Menggantikan refetch() manual: queryParams sudah masuk query key react-query,
  // jadi reset ini otomatis memicu fetch baru.
  useEffect(() => {
    setRows([]);
    setSelectedRow(0);
    resetBufferingCache();
  }, [detailData?.id, resetBufferingCache]);

  return (
    <div className={`flex h-[100%] w-full justify-center`}>
      <div
        className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background"
        onKeyDownCapture={(event) => {
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
        <div className="flex h-[38px] w-full flex-row items-center justify-between border-b border-border bg-background-grid-header px-2">
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
              gridName="GridShippingInstructionDetailRincian"
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
          rows={rows}
          // ROW_HEIGHT konstanta bersama, bukan angka literal: handleScroll &
          // pendingScrollAdjustment menghitung tinggi halaman dari konstanta yg
          // sama. Kalau berbeda, kompensasi scroll saat window bergeser meleset.
          headerRowHeight={HEADER_ROW_HEIGHT}
          onCellKeyDown={handleKeyDown}
          rowHeight={ROW_HEIGHT}
          onScroll={handleScroll}
          renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
          className={`${isDark ? 'rdg-dark' : 'rdg-light'} fill-grid text-xs`}
          enableVirtualization={false}
          rowKeyGetter={rowKeyGetter}
          rowClass={getRowClass}
          onCellClick={handleCellClick}
          onSelectedCellChange={(args) => {
            selectedCellIdxRef.current = finalColumns.findIndex(
              (c) => c.key === args.column.key
            );
            handleCellClick({ row: args.row });
          }}
        />
        <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2">
          {isLoading ? <LoadRowsRenderer /> : null}

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
                    'GridShippingInstructionDetailRincian',
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
        </div>
      </div>
    </div>
  );
};

export default GridShippingInstructionDetailRincian;
