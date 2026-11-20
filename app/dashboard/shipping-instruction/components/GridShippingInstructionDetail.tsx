'use client';

import Image from 'next/image';
import { debounce } from 'lodash';
import 'react-data-grid/lib/styles.scss';
import IcClose from '@/public/image/x.svg';
import { RootState } from '@/lib/store/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useSelector, useDispatch } from 'react-redux';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import FilterInput from '@/components/custom-ui/FilterInput';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import { setDetailData } from '@/lib/store/headerSlice/headerSlice';
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
import { useGetShippingInstructionDetail } from '@/lib/server/useShippingIntruction';
import { getShippingInstructionDetailFn } from '@/lib/apis/shippinginstruction.api';
import { HEADER_ROW_HEIGHT, LIMIT, ROW_HEIGHT } from '@/constants/constant';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  filterShippingInstructionDetail,
  ShippingInstructionDetail
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
  filters: typeof filterShippingInstructionDetail;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridShippingInstructionDetail = () => {
  const dispatch = useDispatch();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const { user } = useSelector((state: RootState) => state.auth);
  const headerData = useSelector((state: RootState) => state.header.headerData);

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
  const [rows, setRows] = useState<ShippingInstructionDetail[]>([]);
  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
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
    filters: filterShippingInstructionDetail,
    sortBy: 'shippinginstructiondetail_nobukti',
    sortDirection: 'asc'
  });

  // ── Lazy loading + caching (pola GridBiayaExtraMuatanDetail) ──────────────
  // Grid hanya menyimpan WINDOW_SIZE halaman di memori (`visiblePages`), isinya
  // di `pageDataCache`. Halaman di luar window dibuang; halaman berikutnya
  // di-prefetch diam-diam ke `streamBufferRef` supaya saat user scroll sampai
  // ambang batas, data sudah ada dan window bergeser tanpa spinner.
  //
  // Sebelumnya grid ini menembak `page: 1` tanpa limit efektif dan backend pun
  // mengabaikan page/limit — artinya SELURUH detail satu bukti ditarik sekaligus
  // tiap kali baris header diklik.
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
    Map<number, ShippingInstructionDetail[]>
  >(new Map());
  const streamBufferRef = useRef<Map<number, ShippingInstructionDetail[]>>(
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
  // Index KOLOM sel aktif — dicatat supaya re-anchor selectCell setelah window
  // bergeser tidak melompat ke kolom lain.
  const selectedCellIdxRef = useRef<number>(1);

  // lengkapnya (kenapa pointer & keyboard diperlakukan berbeda) ada di
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
    data: allDataDetail,
    isLoading,
    dataUpdatedAt
  } = useGetShippingInstructionDetail(headerData?.id, queryParams);

  // Pemetaan baris dipakai bulk fetch, fetch per-halaman, DAN prefetch — kalau
  // disalin tiga kali, bentuk baris antar-halaman bisa berbeda diam-diam.
  const mapDetailRows = useCallback(
    (data: any[] | undefined): ShippingInstructionDetail[] =>
      (data ?? []).map((item: any) => ({
        id: item?.id,
        nobukti: item?.nobukti,
        shippinginstructiondetail_nobukti:
          item?.shippinginstructiondetail_nobukti,
        shippinginstruction_id: item?.shippinginstruction_id,
        asalpelabuhan: item?.asalpelabuhan,
        keterangan: item?.keterangan,
        consignee: item?.consignee,
        shipper: item?.shipper,
        comodity: item?.comodity,
        notifyparty: item?.notifyparty,
        statuspisahbl: item?.statuspisahbl,
        statuspisahbl_nama: item?.statuspisahbl_nama,
        emkl_id: item?.emkl_id,
        emkllain_nama: item?.emkllain_nama,
        containerpelayaran_id: item?.containerpelayaran_id,
        containerpelayaran_nama: item?.containerpelayaran_nama,
        tujuankapal_id: item?.tujuankapal_id,
        tujuankapal_nama: item?.tujuankapal_nama,
        daftarbl_id: item?.daftarbl_id,
        daftarbl_nama: item?.daftarbl_nama
      })) as ShippingInstructionDetail[],
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
        filters: filterShippingInstructionDetail,
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
      // Filter/search berubah = dataset lain. Buang window + stream buffer,
      // jangan sampai halaman hasil filter lama ikut tergabung.
      resetBufferingCache();
    }, 300); // Mengatur debounce hanya untuk update filter
  };

  const debouncedFilterUpdate = useRef(
    debounce((colKey: string, value: string) => {
      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, [colKey]: value },
        page: 1
      }));
      setRows([]);
      setSelectedRow(0);
      resetBufferingCache();
    }, 300) // Bisa dikurangi jadi 250-300ms
  ).current;

  const handleFilterInputChange = useCallback(
    (colKey: string, value: string) => {
      cancelPreviousRequest(abortControllerRef);
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
    setRows([]);
    resetBufferingCache();
  };

  const columns = useMemo((): Column<ShippingInstructionDetail>[] => {
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
                  filters: filterShippingInstructionDetail
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
        key: 'asalpelabuhan',
        name: 'asal pelabuhan',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('asalpelabuhan')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'asalpelabuhan'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                ASAL PELABUHAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'asalpelabuhan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'asalpelabuhan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="asalpelabuhan"
                value={filters.filters.asalpelabuhan || ''}
                onChange={(value) =>
                  handleFilterInputChange('asalpelabuhan', value)
                }
                onClear={() => handleClearFilter('asalpelabuhan')}
                inputRef={(el) => {
                  inputColRefs.current['asalpelabuhan'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.asalpelabuhan || '';
          const cellValue = props.row.asalpelabuhan || '';
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
      },
      {
        key: 'consignee',
        name: 'consignee',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('consignee')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'consignee' ? 'font-bold' : 'font-normal'
                }`}
              >
                CONSIGNEE
              </p>
              <div className="ml-2">
                {filters.sortBy === 'consignee' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'consignee' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="consignee"
                value={filters.filters.consignee || ''}
                onChange={(value) =>
                  handleFilterInputChange('consignee', value)
                }
                onClear={() => handleClearFilter('consignee')}
                inputRef={(el) => {
                  inputColRefs.current['consignee'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.consignee || '';
          const cellValue = props.row.consignee || '';
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
        key: 'shipper',
        name: 'shipper',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('shipper')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'shipper' ? 'font-bold' : 'font-normal'
                }`}
              >
                SHIPPER
              </p>
              <div className="ml-2">
                {filters.sortBy === 'shipper' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'shipper' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="shipper"
                value={filters.filters.shipper || ''}
                onChange={(value) => handleFilterInputChange('shipper', value)}
                onClear={() => handleClearFilter('shipper')}
                inputRef={(el) => {
                  inputColRefs.current['shipper'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.shipper || '';
          const cellValue = props.row.shipper || '';
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
        key: 'notifyparty',
        name: 'notify party',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('notifyparty')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'notifyparty' ? 'font-bold' : 'font-normal'
                }`}
              >
                NOTIFY PARTY
              </p>
              <div className="ml-2">
                {filters.sortBy === 'notifyparty' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'notifyparty' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="notifyparty"
                value={filters.filters.notifyparty || ''}
                onChange={(value) =>
                  handleFilterInputChange('notifyparty', value)
                }
                onClear={() => handleClearFilter('notifyparty')}
                inputRef={(el) => {
                  inputColRefs.current['notifyparty'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.notifyparty || '';
          const cellValue = props.row.notifyparty || '';
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
        key: 'statuspisahbl',
        name: 'status pisah bl',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 100,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('statuspisahbl_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statuspisahbl_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                STATUS PISAH BL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statuspisahbl_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statuspisahbl_text' &&
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
                  handleFilterInputChange('statuspisahbl_text', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.statuspisahbl_memo
            ? JSON.parse(props.row.statuspisahbl_memo)
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
        key: 'emkllain_nama',
        name: 'emkl lain',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('emkllain_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'emkllain_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                EMKL LAIN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'emkllain_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'emkllain_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="emkllain_nama"
                value={filters.filters.emkllain_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('emkllain_text', value)
                }
                onClear={() => handleClearFilter('emkllain_text')}
                inputRef={(el) => {
                  inputColRefs.current['emkllain_nama'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.emkllain_text || '';
          const cellValue = props.row.emkllain_nama || '';
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
        key: 'containerpelayaran_nama',
        name: 'container pelayaran',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('containerpelayaran_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'containerpelayaran_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                CONTAINER PELAYARAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'containerpelayaran_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'containerpelayaran_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="containerpelayaran_nama"
                value={filters.filters.containerpelayaran_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('containerpelayaran_text', value)
                }
                onClear={() => handleClearFilter('containerpelayaran_text')}
                inputRef={(el) => {
                  inputColRefs.current['containerpelayaran_nama'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.containerpelayaran_text || '';
          const cellValue = props.row.containerpelayaran_nama || '';
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
        key: 'tujuankapal_nama',
        name: 'tujuan kapal',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('tujuankapal_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tujuankapal_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                TUJUAN KAPAL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tujuankapal_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tujuankapal_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tujuankapal_nama"
                value={filters.filters.tujuankapal_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('tujuankapal_text', value)
                }
                onClear={() => handleClearFilter('tujuankapal_text')}
                inputRef={(el) => {
                  inputColRefs.current['tujuankapal_nama'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tujuankapal_text || '';
          const cellValue = props.row.tujuankapal_nama || '';
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
        key: 'daftarbl_nama',
        name: 'daftar bl',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('daftarbl_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'daftarbl_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                DAFTAR BL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'daftarbl_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'daftarbl_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="daftarbl_nama"
                value={filters.filters.daftarbl_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('daftarbl_text', value)
                }
                onClear={() => handleClearFilter('daftarbl_text')}
                inputRef={(el) => {
                  inputColRefs.current['daftarbl_nama'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.daftarbl_text || '';
          const cellValue = props.row.daftarbl_nama || '';
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

      //   {
      //     key: 'closing',
      //     name: 'closing',
      //     headerCellClass: 'column-headers',
      //     resizable: true,
      //     draggable: true,
      //     width: 150,
      //     renderHeaderCell: (column: any) => (
      //       <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //         <div
      //           className="headers-cell h-[50%] px-8"
      //           onClick={() => handleSort('closing')}
      //           onContextMenu={(event) => setContextMenu(handleContextMenu(event))}
      //         >
      //           <p className="text-sm font-normal">CLOSING</p>
      //           <div className="ml-2">
      //             {filters.sortBy === 'closing' &&
      //             filters.sortDirection === 'asc' ? (
      //               <FaSortUp className="font-bold" />
      //             ) : filters.sortBy === 'closing' &&
      //               filters.sortDirection === 'desc' ? (
      //               <FaSortDown className="font-bold" />
      //             ) : (
      //               <FaSort className="text-zinc-400" />
      //             )}
      //           </div>
      //         </div>

      //         <div className="relative h-[50%] w-full px-1">
      //           <Input
      //             ref={(el) => {
      //               inputColRefs.current['closing'] = el;
      //             }}
      //             className="filter-input z-[999999] h-8 rounded-none"
      //             value={filters.filters.closing.toUpperCase() || ''}
      //             onChange={(e) => {
      //               const value = e.target.value.toUpperCase();
      //               handleColumnFilterChange('closing', value);
      //             }}
      //           />
      //           {filters.filters.closing && (
      //             <button
      //               className="absolute right-2 top-2 text-xs text-gray-500"
      //               onClick={() => handleColumnFilterChange('closing', '')}
      //               type="button"
      //             >
      //               <FaTimes />
      //             </button>
      //           )}
      //         </div>
      //       </div>
      //     ),
      //     renderCell: (props: any) => {
      //       const columnFilter = filters.filters.closing || '';
      //       return (
      //         <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
      //           {highlightText(
      //             props.row.closing || '',
      //             filters.search,
      //             columnFilter
      //           )}
      //         </div>
      //       );
      //     }
      //   },
    ];
  }, [rows, rows, filters.filters]);

  const prefetchPages = useCallback(
    async (
      pagesToFetch: number[],
      existingCache?: Map<number, ShippingInstructionDetail[]>,
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
            const data = await getShippingInstructionDetailFn(headerData.id, {
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
              `[StreamBuffer] Prefetch detail SI page ${pageNum} gagal:`,
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
        'GridShippingInstructionDetail',
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
        'GridShippingInstructionDetail',
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

  function handleCellClick(args: { row: ShippingInstructionDetail }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    const foundRow = rows.find((r) => r.id === clickedRow?.id);
    if (rowIndex !== -1 && foundRow) {
      setSelectedRow(rowIndex);
      // Ref ikut disinkronkan: dia yang jadi acuan saat window bergeser.
      selectedRowRef.current = rowIndex;
      dispatch(setDetailData(foundRow));
    }
  }

  async function handleKeyDown(
    args: CellKeyDownArgs<ShippingInstructionDetail>,
    event: React.KeyboardEvent
  ) {
    if (event.key === 'ArrowUp' && args.rowIdx === 0) {
      event.preventDefault();
    }
  }

  function getRowClass(row: ShippingInstructionDetail) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: ShippingInstructionDetail) {
    return row.id;
  }

  useEffect(() => {
    loadGridConfig(
      user.id,
      'GridShippingInstructionDetail',
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

    const newCache = new Map<number, ShippingInstructionDetail[]>();
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
    // Query untuk page 0 tidak pernah dijalankan (guard di hook), jadi
    // `allDataDetail` di sini masih milik halaman lama — kalau tidak
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

  // ── 2b. Data di-refresh dari luar (invalidateQueries setelah header disimpan) ─
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

    const key = hashQueryKey([
      'shippinginstructiondetail',
      headerData?.id,
      queryParams
    ]);
    const previous = lastFetchRef.current;
    lastFetchRef.current = { key, updatedAt: dataUpdatedAt };

    if (previous.updatedAt === 0 || key !== previous.key) return;
    if (dataUpdatedAt === previous.updatedAt) return;
    if (shouldBulkFetch || isFetching || isTransitioning) return;

    resetBufferingCache();
  }, [dataUpdatedAt, queryParams, headerData?.id]);

  // ── 3. Row combiner: gabungkan halaman-halaman window jadi `rows` ─────────
  useEffect(() => {
    const combinedRows: ShippingInstructionDetail[] = [];
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

  // Pilih baris pertama HANYA saat dataset benar-benar dirakit ulang (ganti
  // header / filter / sort), BUKAN tiap kali `rows` berubah. Window yang
  // bergeser juga mengubah `rows`, dan versi lama yang bergantung pada [rows]
  // akan menyeret pilihan balik ke baris 0 setiap kali user scroll.
  //
  // selectCell MEMINDAHKAN DOM focus, bukan cuma menandai sel aktif. Efek ini
  // ikut jalan tiap kali header di atas berganti baris, jadi tanpa penjaga
  // `fokusSedangDiDetail` fokus akan tersedot dari grid master ke grid detail
  // dan Arrow/PageUp/PageDown di master berhenti bekerja. Highlight baris 0
  // tetap benar karena diurus selectedRow + getRowClass; yang dilewatkan hanya
  // perpindahan fokusnya. Begitu user benar-benar masuk ke grid ini (klik /
  // Tab), RDG memilih selnya sendiri.
  useEffect(() => {
    if (!shouldBulkFetch && rows.length > 0 && selectedRowRef.current === 0) {
      const gridEl = gridRef.current?.element;
      const fokusSedangDiDetail =
        !!gridEl && gridEl.contains(document.activeElement);
      if (fokusSedangDiDetail) {
        gridRef.current?.selectCell({ rowIdx: 0, idx: 1 });
      }
    }
  }, [shouldBulkFetch, rows.length]);

  // Baris detail terpilih adalah input untuk GridShippingInstructionDetailRincian.
  useEffect(() => {
    if (rows.length > 0 && selectedRow !== null && rows[selectedRow]) {
      dispatch(setDetailData(rows[selectedRow]));
    } else {
      dispatch(setDetailData({}));
    }
  }, [rows, selectedRow, dispatch]);

  useEffect(() => {
    const headerCells = document.querySelectorAll('.rdg-header-row .rdg-cell');
    headerCells.forEach((cell) => {
      cell.setAttribute('tabindex', '-1');
    });
  }, []);

  // headerData berganti (user pindah baris header) = dataset benar-benar lain.
  // Buang seluruh window + buffer, jangan sampai detail bukti sebelumnya ikut
  // tergabung ke grid. Menggantikan refetch() manual: queryParams sudah masuk
  // query key react-query, jadi reset ini otomatis memicu fetch baru.
  useEffect(() => {
    setRows([]);
    setSelectedRow(0);
    resetBufferingCache();
  }, [headerData?.id, resetBufferingCache]);

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
              gridName="GridShippingInstructionDetail"
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
          // ROW_HEIGHT (konstanta bersama), bukan angka literal: handleScroll &
          // pendingScrollAdjustment menghitung tinggi halaman dari konstanta yg
          // sama. Kalau keduanya boleh berbeda, kompensasi scroll saat window
          // bergeser meleset dan konten melompat di bawah kursor.
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
                    'GridShippingInstructionDetail',
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

export default GridShippingInstructionDetail;
