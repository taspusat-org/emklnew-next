'use client';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useLayoutEffect
} from 'react';
import 'react-data-grid/lib/styles.scss';
import DataGrid, {
  CellClickArgs,
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';

import { ImSpinner2 } from 'react-icons/im';
import ActionButton from '@/components/custom-ui/ActionButton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MenuInput, menuSchema } from '@/lib/validations/menu.validation';
import { useDeleteMenu, useUpdateMenu } from '@/lib/server/useMenu';
import { syncAcosFn } from '@/lib/apis/acos.api';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import {
  FaFileExport,
  FaPlus,
  FaPrint,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaTimes
} from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { api, api2 } from '@/lib/utils/AxiosInstance';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { HiDocument } from 'react-icons/hi2';
import {
  setDetailDataReport,
  setReportData
} from '@/lib/store/reportSlice/reportSlice';
import { useDispatch } from 'react-redux';
import { Checkbox } from '@/components/ui/checkbox';
import { useAlert } from '@/lib/store/client/useAlert';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import IcClose from '@/public/image/x.svg';
import ReportDesignerMenu from '@/app/reports/menu/page';
import { debounce } from 'lodash';
import FilterInput from '@/components/custom-ui/FilterInput';

import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import { setHeaderData } from '@/lib/store/headerSlice/headerSlice';
import FormPengeluaran from './FormPengeluaran';
import {
  IAllPengeluaranHeader,
  PengeluaranDetail,
  PengeluaranHeader,
  filterPengeluaran
} from '@/lib/types/pengeluaran.type';
import {
  PengeluaranHeaderInput,
  pengeluaranHeaderSchema
} from '@/lib/validations/pengeluaran.validation';
import {
  useCreatePengeluaran,
  useDeletePengeluaran,
  useGetPengeluaranHeader,
  useUpdatePengeluaran
} from '@/lib/server/usePengeluaran';

import {
  clearOpenName,
  setClearLookup
} from '@/lib/store/lookupSlice/lookupSlice';
import { checkBeforeDeleteFn } from '@/lib/apis/global.api';
import { checkValidationKasGantungFn } from '@/lib/apis/kasgantungheader.api';
import { formatCurrency, formatDateToDDMMYYYY } from '@/lib/utils';
import { useFormError } from '@/lib/hooks/formErrorContext';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import {
  getPengeluaranDetailFn,
  getPengeluaranHeaderByIdFn,
  getPengeluaranHeaderFn
} from '@/lib/apis/pengeluaranheader.api';
import { numberToTerbilang } from '@/lib/utils/terbilang';
import JsxParser from 'react-jsx-parser';
import {
  cancelPreviousRequest,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { useTheme } from 'next-themes';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { useReportProgress } from '@/components/custom-ui/ReportProgressProvider';
import { loadStimulsoftScript } from '@/lib/loadStimulsoft';
import { useSession } from 'next-auth/react';
import { clearOnReload } from '@/lib/store/filterSlice/filterSlice';

interface Filter {
  page: number;
  limit: number;
  search: string;
  filters: typeof filterPengeluaran;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridPengeluaranHeader = () => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const [isFilteringRows, setIsFilteringRows] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const { start } = useReportProgress();
  const { data: session, status } = useSession();

  const [totalPages, setTotalPages] = useState(1);
  const [popOver, setPopOver] = useState<boolean>(false);
  const { mutateAsync: createPengeluaran, isLoading: isLoadingCreate } =
    useCreatePengeluaran();
  const { mutateAsync: updatePengeluaran, isLoading: isLoadingUpdate } =
    useUpdatePengeluaran();
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { mutateAsync: deletePengeluaran, isLoading: isLoadingDelete } =
    useDeletePengeluaran();
  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
  const [columnsWidth, setColumnsWidth] = useState<{ [key: string]: number }>(
    {}
  );

  const [mode, setMode] = useState<string>('');

  const [dataGridKey, setDataGridKey] = useState(0);

  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [fetchedPages, setFetchedPages] = useState<Set<number>>(new Set([1]));
  const [isFetchingManually, setIsFetchingManually] = useState(false);
  const [submitSuccessful, setSubmitSuccessful] = useState(false);
  const [rows, setRows] = useState<PengeluaranHeader[]>([]);
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const { alert } = useAlert();

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAfterMutation, setIsAfterMutation] = useState(false);
  const [shouldBulkFetch, setShouldBulkFetch] = useState(true);
  const scrollPositionRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prevRowsLengthRef = useRef<number>(0);
  const prevMinPageRef = useRef<number>(1);
  const hasAdjustedScrollRef = useRef<boolean>(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const lastScrollTopRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingScrollAdjustment = useRef<number>(0);
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5]);
  const minVisiblePage = useMemo(
    () => Math.min(...visiblePages),
    [visiblePages]
  );
  const [pageDataCache, setPageDataCache] = useState<
    Map<number, PengeluaranHeader[]>
  >(new Map());
  const streamBufferRef = useRef<Map<number, PengeluaranHeader[]>>(new Map());
  // Melacak page yang sedang dalam proses prefetch agar tidak double-fetch
  const prefetchingPagesRef = useRef<Set<string>>(new Set());
  // Jumlah page yang di-buffer ke depan & ke belakang
  const suppressScrollRef = useRef(false);

  const STREAM_BUFFER_SIZE = 5;
  const WINDOW_SIZE = 5;
  const ROW_HEIGHT = 27;
  const jumpToFirstRef = useRef(false);
  const jumpToLastRef = useRef(false);
  const pendingFocusIdRef = useRef<string | null>(null);
  const suppressRefetchRef = useRef(false);
  const focusSelectedCell = () => {
    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable)
    ) {
      return;
    }
    const cell = document.querySelector<HTMLElement>(
      '.rdg [role="gridcell"][tabindex="0"]'
    );
    cell?.focus({ preventScroll: true });
  };
  const dbg = (...a: any[]) => console.log('[FOKUS]', ...a);
  const dbgActive = (tag: string) =>
    setTimeout(() => {
      const el = document.activeElement as HTMLElement | null;
      dbg(`activeElement@${tag}:`, el?.tagName, el?.className?.slice?.(0, 60));
    }, 0);
  const pendingSelectIdxRef = useRef<number>(1);
  const activeFilterInputRef = useRef<HTMLElement | null>(null);
  const isScrollingRef = useRef(false);
  const interactionModeRef = useRef<'keyboard' | 'pointer'>('pointer');
  const reanchorFromKeyboardRef = useRef(false);
  const isPageTransitionRef = useRef(false);
  const shiftSelectionForWindow = (deltaRows: number) => {
    const next = Math.max(0, selectedRowRef.current + deltaRows);
    selectedRowRef.current = next;
    reanchorFromKeyboardRef.current = interactionModeRef.current === 'keyboard';
  };
  const forms = useForm<PengeluaranHeaderInput>({
    resolver:
      mode === 'delete' ? undefined : zodResolver(pengeluaranHeaderSchema),
    mode: 'onSubmit',
    defaultValues: {
      nobukti: '',
      tglbukti: '',
      relasi_id: null,
      relasi_text: '',
      keterangan: null,
      bank_id: null,
      bank_text: '',
      postingdari: '',
      coakredit: null,
      coakredit_text: '',
      dibayarke: '',
      alatbayar_id: null,
      alatbayar_text: null,
      nowarkat: '',
      tgljatuhtempo: '',
      daftarbank_id: null,
      daftarbank_text: '',
      statusformat: '',

      details: []
    }
  });
  const {
    setFocus,
    reset,

    formState: { isSubmitSuccessful }
  } = forms;
  const gridRef = useRef<DataGridHandle>(null);
  const { committed, onReload } = useSelector(
    (state: RootState) => state.filter
  );

  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: 50,
    filters: {
      ...filterPengeluaran,
      tglDari: committed.tglDari,
      tglSampai: committed.tglSampai,
      bank_id: committed.bank_id
    },
    search: '',
    sortBy: 'nobukti',
    sortDirection: 'asc'
  });

  const [prevFilters, setPrevFilters] = useState<Filter>(filters);
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const effectiveLimit = shouldBulkFetch ? filters.limit * 5 : filters.limit;
  const [selectedCellKey, setSelectedCellKey] = useState<string>('nomor');
  const selectedRowRef = useRef<number>(0);
  useEffect(() => {
    selectedRowRef.current = selectedRow;
  }, [selectedRow]);
  const selectedHeaderIdRef = useRef<string | null>(null);

  const {
    data: allData,
    isLoading: isLoadingData,
    refetch
  } = useGetPengeluaranHeader(
    {
      ...filters,
      page: currentPage,
      limit: effectiveLimit
    },
    abortControllerRef.current?.signal
  );
  const currentMinPage =
    visiblePages.length > 0 ? Math.min(...visiblePages) : 1;
  const startRow = (currentMinPage - 1) * filters.limit + 1;
  const resetBufferingCache = () => {
    setShouldBulkFetch(true);
    setPageDataCache(new Map());
    setVisiblePages([1, 2, 3, 4, 5]);
    setIsFetching(false);
    streamBufferRef.current = new Map();
    prefetchingPagesRef.current = new Set();
  };

  const debouncedFilterUpdate = useRef(
    debounce((updates: Record<string, string>) => {
      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, ...updates },
        page: 1
      }));
      setCheckedRows(new Set());
      setIsAllSelected(false);
      setRows([]);
      setCurrentPage(1);
      setSelectedRow(0);
      resetBufferingCache(); // ADDED
      gridRef?.current?.scrollToCell?.({ rowIdx: 0, idx: 0 });
    }, 300) // Bisa dikurangi jadi 250-300ms
  ).current;

  const pendingUpdates = useRef<Record<string, string>>({});

  // Cari display-index kolom utk filter/sort key. Beberapa filter pakai suffix
  // _text (mis. 'bank_text') sementara kolomnya pakai _id ('bank_id') -- coba
  // fallback ke variant id kalau key langsung tidak ketemu.
  const columns = useMemo((): Column<PengeluaranHeader>[] => {
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
                  ...prev, // ← ubah dari spread langsung ke functional update
                  search: '',
                  filters: {
                    ...filterPengeluaran,
                    tglDari: prev.filters.tglDari,
                    tglSampai: prev.filters.tglSampai,
                    bank_id: prev.filters.bank_id // ✅ tambahkan ini
                  }
                }));
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
          const absoluteNumber =
            (minVisiblePage - 1) * filters.limit + props.rowIdx + 1;
          return (
            <div className="flex h-full w-full cursor-pointer items-center justify-center text-sm">
              {absoluteNumber}
            </div>
          );
        }
      },
      {
        key: 'select',
        name: '',
        width: 50,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            ></div>
            <div className="flex h-[50%] w-full items-center justify-center">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={() => handleSelectAll()}
                id="header-checkbox"
                className="mb-2"
              />
            </div>
          </div>
        ),
        renderCell: ({ row }: { row: PengeluaranHeader }) => (
          <div className="flex h-full items-center justify-center">
            <Checkbox
              checked={checkedRows.has(row.id)}
              onCheckedChange={() => handleRowSelect(row.id)}
              id={`row-checkbox-${row.id}`}
            />
          </div>
        )
      },

      {
        key: 'nobukti',
        name: 'no bukti',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
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
                no bukti
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
          const value = props.row.nobukti; // atau dari props.row
          // Buat component wrapper untuk highlightText
          const HighlightWrapper = () => {
            return highlightText(value, filters.search, columnFilter);
          };

          return (
            <div
              title={value}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              <JsxParser
                components={{ HighlightWrapper }}
                jsx={props.row.link}
                renderInWrapper={false}
              />
            </div>
          );
        }
      },
      {
        key: 'tglbukti',
        name: 'Tanggal Bukti',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('tglbukti')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tglbukti' ? 'font-bold' : 'font-normal'
                }`}
              >
                tgl Bukti
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tglbukti' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tglbukti' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tglbukti"
                value={filters.filters.tglbukti || ''}
                onChange={(value) => handleFilterInputChange('tglbukti', value)}
                onClear={() => handleClearFilter('tglbukti')}
                inputRef={(el) => {
                  inputColRefs.current['tglbukti'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tglbukti || '';
          const cellValue = props.row.tglbukti || '';
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
        key: 'relasi_id',
        name: 'relasi',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('relasi_id')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'relasi_id' ? 'font-bold' : 'font-normal'
                }`}
              >
                Relasi
              </p>
              <div className="ml-2">
                {filters.sortBy === 'relasi_id' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'relasi_id' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="relasi_text"
                value={filters.filters.relasi_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('relasi_text', value)
                }
                onClear={() => handleClearFilter('relasi_text')}
                inputRef={(el) => {
                  inputColRefs.current['relasi_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.relasi_text || '';
          const cellValue = props.row.relasi_text || '';
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
        name: 'Keterangan',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
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
                Keterangan
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
        key: 'bank_id',
        name: 'bank',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('bank_id')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'bank_id' ? 'font-bold' : 'font-normal'
                }`}
              >
                BANK
              </p>
              <div className="ml-2">
                {filters.sortBy === 'bank_id' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'bank_id' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="bank_text"
                value={filters.filters.bank_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('bank_text', value)
                }
                onClear={() => handleClearFilter('bank_text')}
                inputRef={(el) => {
                  inputColRefs.current['bank_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.bank_text || '';
          const cellValue = props.row.bank_text || '';
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
        key: 'postingdari',
        name: 'posting dari',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('postingdari')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'postingdari' ? 'font-bold' : 'font-normal'
                }`}
              >
                posting dari
              </p>
              <div className="ml-2">
                {filters.sortBy === 'postingdari' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'postingdari' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="postingdari"
                value={filters.filters.postingdari || ''}
                onChange={(value) =>
                  handleFilterInputChange('postingdari', value)
                }
                onClear={() => handleClearFilter('postingdari')}
                inputRef={(el) => {
                  inputColRefs.current['postingdari'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.postingdari || '';
          const cellValue = props.row.postingdari || '';
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
        key: 'coakredit',
        name: 'coa kredit',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('coakredit')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'coakredit' ? 'font-bold' : 'font-normal'
                }`}
              >
                coa kredit
              </p>
              <div className="ml-2">
                {filters.sortBy === 'coakredit' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'coakredit' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="coakredit_text"
                value={filters.filters.coakredit_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('coakredit_text', value)
                }
                onClear={() => handleClearFilter('coakredit_text')}
                inputRef={(el) => {
                  inputColRefs.current['coakredit_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.coakredit_text || '';
          const cellValue = props.row.coakredit_text || '';
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
        key: 'dibayarke',
        name: 'dibayar ke',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('dibayarke')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'dibayarke' ? 'font-bold' : 'font-normal'
                }`}
              >
                dibayar ke
              </p>
              <div className="ml-2">
                {filters.sortBy === 'dibayarke' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'dibayarke' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="dibayarke"
                value={filters.filters.dibayarke || ''}
                onChange={(value) =>
                  handleFilterInputChange('dibayarke', value)
                }
                onClear={() => handleClearFilter('dibayarke')}
                inputRef={(el) => {
                  inputColRefs.current['dibayarke'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.dibayarke || '';
          const cellValue = props.row.dibayarke || '';
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
        key: 'alatbayar_id',
        name: 'alat bayar',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('alatbayar_id')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'alatbayar_id'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                alat bayar
              </p>
              <div className="ml-2">
                {filters.sortBy === 'alatbayar_id' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'alatbayar_id' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="alatbayar_text"
                value={filters.filters.alatbayar_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('alatbayar_text', value)
                }
                onClear={() => handleClearFilter('alatbayar_text')}
                inputRef={(el) => {
                  inputColRefs.current['alatbayar_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.alatbayar_text || '';
          const cellValue = props.row.alatbayar_text || '';
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
        key: 'nowarkat',
        name: 'no warkat',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('nowarkat')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nowarkat' ? 'font-bold' : 'font-normal'
                }`}
              >
                nomor warkat
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nowarkat' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nowarkat' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nowarkat"
                value={filters.filters.nowarkat || ''}
                onChange={(value) => handleFilterInputChange('nowarkat', value)}
                onClear={() => handleClearFilter('nowarkat')}
                inputRef={(el) => {
                  inputColRefs.current['nowarkat'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nowarkat || '';
          const cellValue = props.row.nowarkat || '';
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
        key: 'tgljatuhtempo',
        name: 'tgl jatuh tempo',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('tgljatuhtempo')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tgljatuhtempo'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Tgl Jatuh Tempo
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tgljatuhtempo' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tgljatuhtempo' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tgljatuhtempo"
                value={filters.filters.tgljatuhtempo || ''}
                onChange={(value) =>
                  handleFilterInputChange('tgljatuhtempo', value)
                }
                onClear={() => handleClearFilter('tgljatuhtempo')}
                inputRef={(el) => {
                  inputColRefs.current['tgljatuhtempo'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tgljatuhtempo || '';
          const cellValue = props.row.tgljatuhtempo || '';
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
        key: 'daftarbank_id',
        name: 'daftar bank',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('daftarbank_id')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'daftarbank_id'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                daftar bank
              </p>
              <div className="ml-2">
                {filters.sortBy === 'daftarbank_id' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'daftarbank_id' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="daftarbank_text"
                value={filters.filters.daftarbank_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('daftarbank_text', value)
                }
                onClear={() => handleClearFilter('daftarbank_text')}
                inputRef={(el) => {
                  inputColRefs.current['daftarbank_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.daftarbank_text || '';
          const cellValue = props.row.daftarbank_text || '';
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
        key: 'modifiedby',
        name: 'Modified By',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('modifiedby')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'modifiedby' ? 'font-bold' : 'font-normal'
                }`}
              >
                Modified By
              </p>
              <div className="ml-2">
                {filters.sortBy === 'modifiedby' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'modifiedby' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="modifiedby"
                value={filters.filters.modifiedby || ''}
                onChange={(value) =>
                  handleFilterInputChange('modifiedby', value)
                }
                onClear={() => handleClearFilter('modifiedby')}
                inputRef={(el) => {
                  inputColRefs.current['modifiedby'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.modifiedby || '';
          const cellValue = props.row.modifiedby || '';
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
        key: 'created_at',
        name: 'Created At',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('created_at')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'created_at' ? 'font-bold' : 'font-normal'
                }`}
              >
                Created At
              </p>
              <div className="ml-2">
                {filters.sortBy === 'created_at' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'created_at' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="created_at"
                value={filters.filters.created_at || ''}
                onChange={(value) =>
                  handleFilterInputChange('created_at', value)
                }
                onClear={() => handleClearFilter('created_at')}
                inputRef={(el) => {
                  inputColRefs.current['created_at'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.created_at || '';
          const cellValue = props.row.created_at || '';
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
        key: 'updated_at',
        name: 'Updated At',
        resizable: true,
        draggable: true,

        headerCellClass: 'column-headers',

        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('updated_at')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'updated_at' ? 'font-bold' : 'font-normal'
                }`}
              >
                Updated At
              </p>
              <div className="ml-2">
                {filters.sortBy === 'updated_at' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'updated_at' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="updated_at"
                value={filters.filters.updated_at || ''}
                onChange={(value) =>
                  handleFilterInputChange('updated_at', value)
                }
                onClear={() => handleClearFilter('updated_at')}
                inputRef={(el) => {
                  inputColRefs.current['updated_at'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.updated_at || '';
          const cellValue = props.row.updated_at || '';
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
  }, [filters, checkedRows, isAllSelected, minVisiblePage]);
  const getColumnDisplayIndex = useCallback(
    (key: string) => {
      const tryKeys = [key];
      if (key.endsWith('_text')) {
        tryKeys.push(key.replace(/_text$/, '_id'));
        tryKeys.push(key.replace(/_text$/, ''));
      }
      let originalIndex = -1;
      for (const k of tryKeys) {
        originalIndex = columns.findIndex((col) => col.key === k);
        if (originalIndex >= 0) break;
      }
      if (originalIndex < 0) return 1;
      return columnsOrder.length > 0
        ? columnsOrder.findIndex((idx) => idx === originalIndex)
        : originalIndex;
    },
    [columns, columnsOrder]
  );

  const handleFilterInputChange = useCallback(
    (colKey: string, value: string) => {
      cancelPreviousRequest(abortControllerRef);
      pendingUpdates.current[colKey] = value;

      // Track input yang sedang fokus agar focus bisa di-restore setelah re-fetch
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.classList.contains('filter-input') ||
          active.tagName === 'INPUT') &&
        active !== inputRef.current // bukan global search
      ) {
        activeFilterInputRef.current = active;
      }

      const displayIndex = getColumnDisplayIndex(colKey);
      pendingSelectIdxRef.current = displayIndex >= 0 ? displayIndex : 1;

      debouncedFilterUpdate(pendingUpdates.current);
    },
    [getColumnDisplayIndex]
  );

  const handleClearFilter = useCallback(
    (colKey: string) => {
      cancelPreviousRequest(abortControllerRef);
      debouncedFilterUpdate.cancel();
      pendingUpdates.current[colKey] = '';

      // Arahkan focus ke kolom yang di-clear
      const displayIndex = getColumnDisplayIndex(colKey);
      pendingSelectIdxRef.current = displayIndex >= 0 ? displayIndex : 1;

      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, [colKey]: '' },
        page: 1
      }));
      setCheckedRows(new Set());
      setIsAllSelected(false);
      setRows([]);
      setCurrentPage(1);
      resetBufferingCache();
    },
    [getColumnDisplayIndex]
  );

  const { clearError } = useFormError();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelPreviousRequest(abortControllerRef);
    const searchValue = e.target.value;

    // Track global search input agar focus bisa di-restore
    activeFilterInputRef.current = inputRef.current;
    pendingSelectIdxRef.current = 1;

    setInputValue(searchValue);
    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      filters: {
        ...filterPengeluaran,
        tglDari: prev.filters.tglDari,
        tglSampai: prev.filters.tglSampai,
        bank_id: prev.filters.bank_id
      },
      search: searchValue,
      page: 1
    }));
    setCheckedRows(new Set());
    setIsAllSelected(false);
    resetBufferingCache(); // ADDED

    setSelectedRow(0);
    setCurrentPage(1);
    setRows([]);
  };

  const handleSort = (column: string) => {
    const displayIndex = getColumnDisplayIndex(column);

    // Sort bukan dari input, tidak perlu restore focus input
    activeFilterInputRef.current = null;
    pendingSelectIdxRef.current = displayIndex >= 0 ? displayIndex : 1;

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
    resetBufferingCache(); // ADDED

    setSelectedRow(0);
    setCurrentPage(1);
    setFetchedPages(new Set([1]));
    setRows([]);
  };
  useEffect(() => {
    if (isSubmitSuccessful) {
      requestAnimationFrame(() => setFocus('tglbukti'));
    }
  }, [isSubmitSuccessful, setFocus]);
  const handleRowSelect = (rowId: number) => {
    setCheckedRows((prev) => {
      const updated = new Set(prev);
      if (updated.has(rowId)) {
        updated.delete(rowId);
      } else {
        updated.add(rowId);
      }

      setIsAllSelected(updated.size === rows.length);
      return updated;
    });
  };
  const handleSelectAll = () => {
    if (isAllSelected) {
      setCheckedRows(new Set());
    } else {
      const allIds = rows.map((row) => row.id);
      setCheckedRows(new Set(allIds));
    }
    setIsAllSelected(!isAllSelected);
  };

  const handleFilterRows = (val: string) => {
    setIsFilteringRows(true);
    // setLocalSelectedValue(val);
    // onChange?.(val);
    setTimeout(() => {
      setIsFilteringRows(false);
    }, 1000);
  };

  const handleClearInput = () => {
    cancelPreviousRequest(abortControllerRef);
    activeFilterInputRef.current = null;
    pendingSelectIdxRef.current = 1;
    setFilters((prev) => ({
      ...prev,
      filters: {
        ...filterPengeluaran,
        tglDari: prev.filters.tglDari,
        tglSampai: prev.filters.tglSampai,
        bank_id: prev.filters.bank_id
      },
      search: '',
      page: 1
    }));
    setInputValue('');
    setCurrentPage(1);
    setRows([]);
    resetBufferingCache(); // ADDED
  };

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
        String(session?.user.id),
        'GridPengeluaranHeader',
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
        String(session?.user.id),
        'GridPengeluaranHeader',
        [...newOrder],
        columnsWidth
      );
      return newOrder;
    });
  };
  async function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (
      isLoadingData ||
      rows.length === 0 ||
      isTransitioning ||
      isFetching ||
      isAfterMutation
    )
      return;

    const { currentTarget } = event;
    const scrollTop = currentTarget.scrollTop;
    const scrollHeight = currentTarget.scrollHeight;
    const clientHeight = currentTarget.clientHeight;

    const hasScrolled = Math.abs(scrollTop - lastScrollTopRef.current) > 5;
    if (!hasScrolled) {
      return;
    }

    lastScrollTopRef.current = scrollTop;
    isScrollingRef.current = true;
    setIsScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      setIsScrolling(false);
    }, 150);

    scrollPositionRef.current = scrollTop;
    scrollContainerRef.current = currentTarget;

    const rowHeight = 27; // Mengikuti rowHeight grid prospek
    const firstVisibleRow = Math.floor(scrollTop / rowHeight);
    const lastVisibleRow = Math.floor((scrollTop + clientHeight) / rowHeight);

    const THRESHOLD_ROWS = 50;

    // SCROLL KE BAWAH
    const rowsRemainingBelow = rows.length - lastVisibleRow;

    if (rowsRemainingBelow <= THRESHOLD_ROWS) {
      const maxPage = Math.max(...visiblePages);
      const nextPage = maxPage + 1;

      if (nextPage <= totalPages && !isFetching && isScrollingRef.current) {
        if (streamBufferRef.current.has(nextPage)) {
          // ✅ DATA ADA DI BUFFER — langsung masuk tanpa loading!
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;

          const bufferedData = streamBufferRef.current.get(nextPage)!;

          // Pindahkan dari buffer ke pageDataCache
          setPageDataCache((prev) => {
            const updated = new Map(prev);
            updated.set(nextPage, bufferedData);
            return updated;
          });

          // Hapus dari buffer (sudah masuk ke visible cache)
          streamBufferRef.current = new Map(streamBufferRef.current);
          streamBufferRef.current.delete(nextPage);

          // Side-effect dihitung di luar updater setVisiblePages agar tidak
          // tereksekusi dua kali oleh React StrictMode (updater harus pure).
          isPageTransitionRef.current = true;
          pendingScrollAdjustment.current = -(filters.limit * ROW_HEIGHT);
          shiftSelectionForWindow(-filters.limit);

          setVisiblePages((prevVisible) => {
            const removedPage = prevVisible[0];
            const newPages = [...prevVisible.slice(1), nextPage];

            setPageDataCache((prev) => {
              const updated = new Map(prev);
              // Sebelum dihapus, simpan ke streamBuffer agar bisa dipakai saat scroll balik ke atas
              const removedData = updated.get(removedPage);
              if (removedData) {
                streamBufferRef.current = new Map(streamBufferRef.current);
                streamBufferRef.current.set(removedPage, removedData);
              }
              updated.delete(removedPage);
              return updated;
            });

            return newPages;
          });

          // Update totalPages jika perlu (dari cache tidak ada pagination data,
          // jadi kita biarkan dari fetch terakhir)

          setTimeout(() => {
            setIsTransitioning(false);
            setIsFetching(false);
          }, 50); // Lebih cepat karena tidak ada network latency

          // Prefetch page berikutnya di background
          const pagesToPrefetch = Array.from(
            { length: STREAM_BUFFER_SIZE },
            (_, i) => nextPage + 1 + i
          );
          prefetchPages(pagesToPrefetch);
        } else if (!pageDataCache.has(nextPage)) {
          // ⚠️ Buffer miss — fallback ke fetch normal
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;
          setCurrentPage(nextPage);
        }
      }
    }

    // SCROLL KE ATAS
    if (firstVisibleRow <= THRESHOLD_ROWS) {
      const minPage = Math.min(...visiblePages);
      const prevPage = minPage - 1;

      if (prevPage >= 1 && !isFetching && isScrollingRef.current) {
        if (streamBufferRef.current.has(prevPage)) {
          // ✅ DATA ADA DI BUFFER — langsung masuk tanpa loading!
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

          // Side-effect dihitung di luar updater setVisiblePages agar tidak
          // tereksekusi dua kali oleh React StrictMode (updater harus pure).
          isPageTransitionRef.current = true;
          pendingScrollAdjustment.current = filters.limit * ROW_HEIGHT;
          shiftSelectionForWindow(filters.limit);

          setVisiblePages((prevVisible) => {
            const removedPage = prevVisible[4];
            const newPages = [prevPage, ...prevVisible.slice(0, 4)];

            setPageDataCache((prev) => {
              const updated = new Map(prev);
              // Sebelum dihapus, simpan ke streamBuffer agar bisa dipakai saat scroll balik ke bawah
              const removedData = updated.get(removedPage);
              if (removedData) {
                streamBufferRef.current = new Map(streamBufferRef.current);
                streamBufferRef.current.set(removedPage, removedData);
              }
              updated.delete(removedPage);
              return updated;
            });

            return newPages;
          });

          setTimeout(() => {
            setIsTransitioning(false);
            setIsFetching(false);
          }, 50);

          // Prefetch page sebelumnya di background
          const pagesToPrefetch = Array.from(
            { length: STREAM_BUFFER_SIZE },
            (_, i) => prevPage - 1 - i
          ).filter((p) => p >= 1);
          prefetchPages(pagesToPrefetch);
        } else if (!pageDataCache.has(prevPage)) {
          // ⚠️ Buffer miss — fallback ke fetch normal
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;
          // Reset ke 0 dulu agar setCurrentPage(prevPage) pasti trigger re-fetch
          // even jika prevPage == currentPage (stale value)
          setCurrentPage(0);
          setTimeout(() => setCurrentPage(prevPage), 0);
        }
      }
    }
  }

  function handleCellClick(args: { row: PengeluaranHeader }) {
    const clickedRow = args.row;
    // args.row bisa undefined saat grid sedang re-render di tengah pergeseran
    // window (selectCell programatik menembak index yang barisnya sudah hilang).
    if (!clickedRow) return;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
      // MASTER-DETAIL: ini SATU-SATUNYA tempat id header yang dipilih dicatat.
      // onSelectedCellChange memanggil handler ini untuk semua pemilihan yang
      // benar-benar disengaja (klik, panah keyboard, selectCell setelah
      // sort/filter). Pergeseran window saat scroll TIDAK lewat sini — dia cuma
      // menggeser `selectedRow` — sehingga id pilihan user tidak ikut bergeser.
      if (!isTransitioning && !isFetching) {
        selectedHeaderIdRef.current = String(clickedRow.id);
      }
    }
  }
  const orderedColumns = useMemo(() => {
    if (Array.isArray(columnsOrder) && columnsOrder.length > 0) {
      return columnsOrder
        .map((orderIndex) => columns[orderIndex])
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
  const moveSelectionBy = useCallback(
    (delta: number, focusBackTo?: HTMLElement | null) => {
      if (rows.length === 0) return;

      // Navigasi via input filter/search = modalitas keyboard.
      interactionModeRef.current = 'keyboard';

      const nextRow = Math.min(
        Math.max(selectedRowRef.current + delta, 0),
        rows.length - 1
      );
      selectedRowRef.current = nextRow;

      const idxFromKey = finalColumns.findIndex(
        (c) => c.key === selectedCellKey
      );
      const idx = idxFromKey >= 0 ? idxFromKey : 0;

      // Pindahkan selected cell bawaan grid (untuk ArrowLeft/ArrowRight) + tetap jaga input tetap fokus
      gridRef.current?.scrollToCell?.({ rowIdx: nextRow, idx });
      gridRef.current?.selectCell?.({ rowIdx: nextRow, idx });

      if (focusBackTo && typeof window !== 'undefined') {
        const start =
          focusBackTo instanceof HTMLInputElement
            ? focusBackTo.selectionStart
            : null;
        const end =
          focusBackTo instanceof HTMLInputElement
            ? focusBackTo.selectionEnd
            : null;

        window.requestAnimationFrame(() => {
          if (!document.contains(focusBackTo)) return;
          focusBackTo.focus({ preventScroll: true });
          if (
            focusBackTo instanceof HTMLInputElement &&
            start !== null &&
            end !== null
          ) {
            focusBackTo.setSelectionRange(start, end);
          }
        });
      }
    },
    [rows.length, finalColumns, selectedCellKey]
  );
  const moveSelectionColumnBy = useCallback(
    (delta: number, focusBackTo?: HTMLElement | null) => {
      if (rows.length === 0) return;
      if (finalColumns.length === 0) return;

      const currentIdxFromKey = finalColumns.findIndex(
        (c) => c.key === selectedCellKey
      );
      const currentIdx = currentIdxFromKey >= 0 ? currentIdxFromKey : 0;

      const nextIdx = Math.min(
        Math.max(currentIdx + delta, 0),
        finalColumns.length - 1
      );

      const nextKey = finalColumns[nextIdx]?.key;
      if (nextKey) setSelectedCellKey(String(nextKey));

      const rowIdx = Math.min(
        Math.max(selectedRowRef.current, 0),
        rows.length - 1
      );

      gridRef.current?.scrollToCell?.({ rowIdx, idx: nextIdx });
      gridRef.current?.selectCell?.({ rowIdx, idx: nextIdx });

      if (focusBackTo && typeof window !== 'undefined') {
        const start =
          focusBackTo instanceof HTMLInputElement
            ? focusBackTo.selectionStart
            : null;
        const end =
          focusBackTo instanceof HTMLInputElement
            ? focusBackTo.selectionEnd
            : null;

        window.requestAnimationFrame(() => {
          if (!document.contains(focusBackTo)) return;
          focusBackTo.focus({ preventScroll: true });
          if (
            focusBackTo instanceof HTMLInputElement &&
            start !== null &&
            end !== null
          ) {
            focusBackTo.setSelectionRange(start, end);
          }
        });
      }
    },
    [rows.length, finalColumns, selectedCellKey]
  );
  const selectColumnEdge = useCallback(
    (edge: 'first' | 'last', focusBackTo?: HTMLElement | null) => {
      if (rows.length === 0) return;
      if (finalColumns.length === 0) return;

      const nextIdx = edge === 'first' ? 0 : finalColumns.length - 1;
      const nextKey = finalColumns[nextIdx]?.key;
      if (nextKey) setSelectedCellKey(String(nextKey));

      const rowIdx = Math.min(
        Math.max(selectedRowRef.current, 0),
        rows.length - 1
      );

      gridRef.current?.scrollToCell?.({ rowIdx, idx: nextIdx });
      gridRef.current?.selectCell?.({ rowIdx, idx: nextIdx });

      if (focusBackTo && typeof window !== 'undefined') {
        const start =
          focusBackTo instanceof HTMLInputElement
            ? focusBackTo.selectionStart
            : null;
        const end =
          focusBackTo instanceof HTMLInputElement
            ? focusBackTo.selectionEnd
            : null;

        window.requestAnimationFrame(() => {
          if (!document.contains(focusBackTo)) return;
          focusBackTo.focus({ preventScroll: true });
          if (
            focusBackTo instanceof HTMLInputElement &&
            start !== null &&
            end !== null
          ) {
            focusBackTo.setSelectionRange(start, end);
          }
        });
      }
    },
    [rows.length, finalColumns]
  );
  const handleGoToFirstPage = useCallback(() => {
    jumpToFirstRef.current = true;
    setRows([]);
    setCurrentPage(1);
    resetBufferingCache();
  }, []);

  const handleGoToLastPage = useCallback(async () => {
    if (totalPages < 1) return;

    jumpToLastRef.current = true;
    setRows([]);

    // Jika total halaman <= WINDOW_SIZE, semua halaman muat di satu bulk window
    // pertama — pakai bulk-fetch normal.
    if (totalPages <= WINDOW_SIZE) {
      resetBufferingCache();
      return;
    }

    // Kasus umum: WINDOW_SIZE halaman terakhir TIDAK selalu sejajar dengan
    // batas bulk block. Fetch tiap halaman terakhir secara langsung lalu
    // rakit cache & window.
    setIsFetching(true);
    setShouldBulkFetch(false);
    setPageDataCache(new Map());
    streamBufferRef.current = new Map();
    prefetchingPagesRef.current = new Set();

    const startPage = totalPages - WINDOW_SIZE + 1;
    const pagesToFetch = Array.from(
      { length: WINDOW_SIZE },
      (_, i) => startPage + i
    );

    try {
      const results = await Promise.all(
        pagesToFetch.map((p) =>
          getPengeluaranHeaderFn({
            ...filters,
            page: p,
            limit: filters.limit
          })
        )
      );

      const newCache = new Map<number, PengeluaranHeader[]>();
      results.forEach((res, i) => {
        if (res?.data && res.data.length > 0) {
          newCache.set(pagesToFetch[i], res.data);
        }
      });

      setPageDataCache(newCache);
      setVisiblePages(pagesToFetch);
      setCurrentPage(totalPages);
    } catch (err) {
      console.error('Failed to load last pages:', err);
    } finally {
      setIsFetching(false);
    }
  }, [totalPages, filters]);

  const handleGridInputNavigationKeyDownCapture = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      const target = event.target as HTMLElement | null;

      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'PageDown' ||
        event.key === 'PageUp'
      ) {
        interactionModeRef.current = 'keyboard';
      }

      if (event.ctrlKey && event.key === 'Home') {
        event.preventDefault();
        event.stopPropagation();
        handleGoToFirstPage();
        return;
      }

      if (event.ctrlKey && event.key === 'End') {
        event.preventDefault();
        event.stopPropagation();
        handleGoToLastPage();
        return;
      }

      const isFilterInput =
        target instanceof HTMLElement &&
        target.classList.contains('filter-input');
      const isGlobalSearchInput =
        !!inputRef.current && target === inputRef.current;

      // Hanya handle key navigation dari input filter column & input search global
      if (!isFilterInput && !isGlobalSearchInput) return;

      const visibleRowCount = 8;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionBy(1, target);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionBy(-1, target);
      } else if (event.key === 'PageDown') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionBy(visibleRowCount, target);
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionBy(-visibleRowCount, target);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionColumnBy(1, target);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionColumnBy(-1, target);
      } else if (event.key === 'Home') {
        event.preventDefault();
        event.stopPropagation();
        selectColumnEdge('first', target);
      } else if (event.key === 'End') {
        event.preventDefault();
        event.stopPropagation();
        selectColumnEdge('last', target);
      }
    },
    [
      moveSelectionBy,
      moveSelectionColumnBy,
      selectColumnEdge,
      handleGoToFirstPage,
      handleGoToLastPage
    ]
  );
  const onSuccess = async (
    indexOnPage: number,
    fetchedPages: number[],
    pagedData: Record<string, PengeluaranHeader[]>,
    pageNumber: number,
    keepOpenModal = false,
    focusId: string | null = null
  ) => {
    dispatch(setClearLookup(true));
    clearError();
    setIsFetchingManually(true);
    dbg('1) onSuccess masuk', {
      mode,
      keepOpenModal,
      dialogTetapTerbuka: keepOpenModal,
      focusId,
      indexOnPage,
      pageNumber,
      fetchedPages,
      pagedDataKeys: Object.keys(pagedData ?? {}),
      pagedDataCounts: Object.entries(pagedData ?? {}).map(
        ([k, v]) => `${k}:${(v as any[])?.length}`
      )
    });
    // Tandai baris yang baru disimpan agar Row Combiner memfokuskannya by-id
    // setelah data window settle (lihat pendingFocusIdRef).
    pendingFocusIdRef.current = focusId ?? null;
    try {
      if (keepOpenModal) {
        forms.reset();
        setPopOver(true);
      } else {
        forms.reset();
        setPopOver(false);
      }
      if (mode !== 'delete') {
        // Blokir kedua data-effect memproses ulang hasil refetch pasca-simpan
        // selama window settle, agar fokus by-id tidak tertimpa. Dibuka lagi
        // via setTimeout di bawah.
        suppressRefetchRef.current = true;
        const response = await api2.get(
          `/redis/get/pengeluaranheader-page-${pageNumber}`
        );
        setRows([]);
        setRows(response.data);
        setIsDataUpdated(true);
        setVisiblePages(fetchedPages);

        // Fokus BERDASARKAN ID baris, bukan indexOnPage hitungan backend.
        // Setelah edit, urutan baris di window yang dimuat bisa berbeda dari
        // hitungan index backend (mis. tie-break sort) sehingga fokus meleset.
        // Cari index-nya langsung di data yang dimuat -> selalu tepat; fallback
        // ke indexOnPage bila id tak ketemu. Sama seperti GridAlatbayar.
        const loadedRows: PengeluaranHeader[] = Array.isArray(response.data)
          ? response.data
          : [];
        const focusIdx =
          focusId != null
            ? loadedRows.findIndex((r) => String(r.id) === String(focusId))
            : -1;
        const targetIndex = focusIdx >= 0 ? focusIdx : indexOnPage;
        dbg('2) hasil GET redis', {
          isArray: Array.isArray(response.data),
          len: Array.isArray(response.data) ? response.data.length : null,
          rawJikaBukanArray: Array.isArray(response.data)
            ? undefined
            : response.data,
          focusIdx,
          targetIndex,
          idBarisTermuat: loadedRows.slice(0, 5).map((r) => r.id)
        });

        setSelectedRow(targetIndex);
        setPageDataCache(
          new Map(
            Object.entries(pagedData).map(([key, value]) => [
              Number(key),
              value as PengeluaranHeader[]
            ])
          )
        );
        setCurrentPage(pageNumber);

        const updatedBuffer = new Map(streamBufferRef.current);
        Object.entries(pagedData).forEach(([key, value]) => {
          updatedBuffer.set(Number(key), value as PengeluaranHeader[]);
        });
        streamBufferRef.current = updatedBuffer;

        setTimeout(() => {
          gridRef?.current?.selectCell({
            rowIdx: targetIndex,
            idx: 1
          });
          focusSelectedCell();
        }, 200);

        // Penahan fokus pasca-simpan. setCurrentPage(pageNumber) memicu refetch
        // yang menjalankan Row Combiner lagi; karena pendingFocusIdRef sudah
        // dikonsumsi pada run pertama, cabang else-nya men-scroll ke baris 0
        // (gejala "save selalu balik ke baris 1"). Re-assert id fokus beberapa
        // kali selama window settle agar SETIAP run Combiner memfokuskan ulang
        // baris yang benar, lalu bersihkan supaya tidak mengganggu navigasi.
        if (focusId != null) {
          [120, 320, 620].forEach((d) =>
            setTimeout(() => {
              pendingFocusIdRef.current = String(focusId);
            }, d)
          );
          // Klaim ulang fokus DOM di ekor jendela settle: Radix baru melepas
          // dialog (dan sempat menggeser fokus) setelah animasi tutup selesai,
          // yang bisa mendarat belakangan daripada selectCell di 50/200ms.
          [350, 700].forEach((d) => setTimeout(focusSelectedCell, d));
          setTimeout(() => dbgActive('AKHIR-harusnya-gridcell'), 1100);
          setTimeout(() => {
            // Bersihkan HANYA kalau masih id kita: jangan wipe fokus yang
            // sudah di-set alur lain (mis. hapus baris) di sela-sela ini.
            if (String(pendingFocusIdRef.current) === String(focusId)) {
              pendingFocusIdRef.current = null;
            }
          }, 950);
        }
        // Dilepas PALING AKHIR (setelah pendingFocusIdRef bersih di 950ms) agar
        // tidak ada jeda di mana kedua guard sudah mati tapi refetch pasca-simpan
        // baru mendarat -- jeda itu yang dipakai ekor bulk-fetch untuk lompat ke
        // baris 0. Samakan dengan GridAlatbayar.
        setTimeout(() => {
          suppressRefetchRef.current = false;
        }, 1000);
      }

      setIsDataUpdated(false);
    } catch (error) {
      dbg('!!) onSuccess MELEMPAR -> fokus dibatalkan', error);
      console.error('Error during onSuccess:', error);
      // WAJIB dilepas di sini juga. Kalau GET redis di atas gagal, setTimeout
      // pelepas tak pernah terpasang sehingga ref tersangkut true selamanya dan
      // memblokir SEMUA refresh grid berikutnya.
      suppressRefetchRef.current = false;
      pendingFocusIdRef.current = null;
      setIsFetchingManually(false);
      setIsDataUpdated(false);
    }
  };
  const onSubmit = async (
    values: PengeluaranHeaderInput,
    keepOpenModalArg: unknown = false
  ) => {
    // react-hook-form memanggil callback-nya dengan (values, event). Form di
    // FormPengeluaran dipasang `onSubmit={forms.handleSubmit(onSubmit)}`, jadi
    // pada submit NATIVE (mis. tekan ENTER di sebuah field) argumen kedua yang
    // masuk ke sini adalah objek EVENT -- truthy, bukan boolean. Tanpa
    // penyempitan ke `=== true`, Enter diperlakukan seperti "SAVE & ADD":
    // form di-reset tapi dialog TETAP TERBUKA, Radix FocusScope menjebak fokus
    // di dalam dialog, dan grid di belakangnya tampak "tidak ter-focus" padahal
    // barisnya sudah dipilih dengan benar. Hanya tombol SAVE & ADD yang boleh
    // mengirim true (lihat FormPengeluaran onSaveAndAdd).
    const keepOpenModal = keepOpenModalArg === true;
    clearError();
    const selectedRowId = rows[selectedRow]?.id;

    try {
      dispatch(setProcessing());
      if (mode === 'delete') {
        if (selectedRowId) {
          await deletePengeluaran(selectedRowId as unknown as string, {
            onSuccess: () => {
              setPopOver(false);

              // 1. Remove from visible rows
              setRows((prevRows) =>
                prevRows.filter((row) => row.id !== selectedRowId)
              );

              // 2. Remove from pageDataCache (all pages)
              setPageDataCache((prevCache) => {
                const updated = new Map(prevCache);
                updated.forEach((pageRows, pageNum) => {
                  const filtered = pageRows.filter(
                    (row) => row.id !== selectedRowId
                  );
                  if (filtered.length !== pageRows.length) {
                    updated.set(pageNum, filtered);
                  }
                });
                return updated;
              });

              // 3. Remove from streamBuffer
              const newBuffer = new Map(streamBufferRef.current);
              newBuffer.forEach((pageRows, pageNum) => {
                const filtered = pageRows.filter(
                  (row) => row.id !== selectedRowId
                );
                if (filtered.length !== pageRows.length) {
                  newBuffer.set(pageNum, filtered);
                }
              });
              streamBufferRef.current = newBuffer;

              // 4. Move cursor
              if (selectedRow === 0) {
                setSelectedRow(0);
                gridRef?.current?.selectCell({ rowIdx: 0, idx: 1 });
              } else if (selectedRow === rows.length - 1) {
                setSelectedRow(selectedRow - 1);
                gridRef?.current?.selectCell({
                  rowIdx: selectedRow - 1,
                  idx: 1
                });
              } else {
                setSelectedRow(selectedRow);
                gridRef?.current?.selectCell({ rowIdx: selectedRow, idx: 1 });
              }
            }
          });
        }
        return;
      }
      if (mode === 'add') {
        const newOrder = await createPengeluaran(
          {
            ...values,
            details: values.details.map((detail: any) => ({
              ...detail,
              id: 0 // Ubah id setiap detail menjadi 0
            })),
            ...filters // Kirim filter ke body/payload
          },
          {
            onSuccess: (data) =>
              onSuccess(
                data.itemIndex,
                data.fetchedPages,
                data.pagedData,
                data.pageNumber,
                keepOpenModal,
                data.newItem?.id ?? null
              )
          }
        );

        if (newOrder !== undefined && newOrder !== null) {
        }
        return;
      }

      if (selectedRowId && mode === 'edit') {
        // JANGAN invalidateQueries('pengeluaran') setelah ini: refetch-nya
        // menimpa baris + fokus yang baru di-set onSuccess sehingga grid
        // balik ke baris 1. onSuccess sudah otoritatif (lihat useAlatbayar).
        await updatePengeluaran(
          {
            id: selectedRowId as unknown as string,
            fields: { ...values, ...filters }
          },
          {
            onSuccess: (data: any) =>
              onSuccess(
                data.itemIndex,
                data.fetchedPages,
                data.pagedData,
                data.pageNumber,
                false,
                data.updatedItem?.id ?? null
              )
          }
        );
      }
    } catch (error: any) {
      if (error?.response?.status !== 400) {
        console.error(error);
      }
    } finally {
      dispatch(setProcessed());
      setSubmitSuccessful(false);
    }
  };

  const handleEdit = async () => {
    if (selectedRow !== null) {
      const rowData = rows[selectedRow];

      setPopOver(true);
      setMode('edit');
    }
  };
  const handleDelete = async () => {
    if (selectedRow !== null) {
      const rowData = rows[selectedRow];

      try {
        setMode('delete');
        setPopOver(true);
      } catch (error) {
        console.error('Error during delete validation:', error);
      }
    }
  };

  const handleView = () => {
    if (selectedRow !== null) {
      setMode('view');
      setPopOver(true);
    }
  };

  const handleReport = async () => {
    const job = start('Pengeluaran header', 'pdf');

    if (checkedRows.size === 0) {
      alert({
        title: 'PILIH DATA YANG INGIN DI CETAK!',
        variant: 'danger',
        submitText: 'OK'
      });
      return; // Stop execution if no rows are selected
    }
    if (checkedRows.size > 1) {
      alert({
        title: 'HANYA BISA MEMILIH SATU DATA!',
        variant: 'danger',
        submitText: 'OK'
      });
      return; // Stop execution if no rows are selected
    }
    const rowId = Array.from(checkedRows)[0];

    try {
      job.fetching();

      dispatch(setProcessing());

      //TANGGAL
      const now = new Date();
      const pad = (n: any) => n.toString().padStart(2, '0');
      const tglcetak = `${pad(now.getDate())}-${pad(
        now.getMonth() + 1
      )}-${now.getFullYear()} ${pad(now.getHours())}:${pad(
        now.getMinutes()
      )}:${pad(now.getSeconds())}`;

      const { page, limit, ...filtersWithoutLimit } = filters;
      const response = await getPengeluaranHeaderByIdFn(rowId);
      if (!response.data?.length) {
        alert({
          title: 'TERJADI KESALAHAN SAAT MEMBUAT LAPORAN!',
          variant: 'danger',
          submitText: 'OK'
        });
        return;
      }
      const selectedRowNobukti = rows.find((r) => r.id === rowId)?.nobukti;
      const responseDetail = await getPengeluaranDetailFn({
        filters: { nobukti: selectedRowNobukti }
      });
      const totalNominal =
        responseDetail.data.reduce(
          (sum: number, item: any) =>
            sum + Math.round((Number(item.nominal) || 0) * 100),
          0
        ) / 100;

      const reportRows = response.data.map((row: any) => ({
        ...row,
        judullaporan: 'Laporan Pengeluaran',
        usercetak: String(session?.user.username || ''),
        tglcetak,
        terbilang: numberToTerbilang(totalNominal),
        judul: `Bukti Pengeluaran KAS EMKL`
      }));

      sessionStorage.setItem(
        'filtersWithoutLimit',
        JSON.stringify(filtersWithoutLimit)
      );
      sessionStorage.setItem('dataId', rowId as unknown as string);
      job.rendering();

      // Dynamically import Stimulsoft and generate the PDF report
      await loadStimulsoftScript();
      const Stimulsoft = (window as any).Stimulsoft;
      Stimulsoft.Base.StiFontCollection.addOpentypeFontFile(
        '/fonts/tahoma.ttf',
        'Tahoma'
      );

      Stimulsoft.Base.StiFontCollection.addOpentypeFontFile(
        '/fonts/tahomabd.ttf',
        'Tahoma'
      );
      Stimulsoft.Base.StiLicense.Key =
        '6vJhGtLLLz2GNviWmUTrhSqnOItdDwjBylQzQcAOiHksEid1Z5nN/hHQewjPL/4/AvyNDbkXgG4Am2U6dyA8Ksinqp' +
        '6agGqoHp+1KM7oJE6CKQoPaV4cFbxKeYmKyyqjF1F1hZPDg4RXFcnEaYAPj/QLdRHR5ScQUcgxpDkBVw8XpueaSFBs' +
        'JVQs/daqfpFiipF1qfM9mtX96dlxid+K/2bKp+e5f5hJ8s2CZvvZYXJAGoeRd6iZfota7blbsgoLTeY/sMtPR2yutv' +
        'gE9TafuTEhj0aszGipI9PgH+A/i5GfSPAQel9kPQaIQiLw4fNblFZTXvcrTUjxsx0oyGYhXslAAogi3PILS/DpymQQ' +
        '0XskLbikFsk1hxoN5w9X+tq8WR6+T9giI03Wiqey+h8LNz6K35P2NJQ3WLn71mqOEb9YEUoKDReTzMLCA1yJoKia6Y' +
        'JuDgUf1qamN7rRICPVd0wQpinqLYjPpgNPiVqrkGW0CQPZ2SE2tN4uFRIWw45/IITQl0v9ClCkO/gwUtwtuugegrqs' +
        'e0EZ5j2V4a1XDmVuJaS33pAVLoUgK0M8RG72';
      const report = new Stimulsoft.Report.StiReport();
      const dataSet = new Stimulsoft.System.Data.DataSet('Data');
      report.loadFile('/reports/LaporanPengeluaran.mrt');
      report.dictionary.dataSources.clear();
      dataSet.readJson({ data: reportRows });
      report.regData(dataSet.dataSetName, '', dataSet);
      report.dictionary.synchronize();
      await new Promise<void>((resolve, reject) => {
        report.renderAsync(() => {
          job.exporting();
          report.exportDocumentAsync((pdfData: any) => {
            try {
              const blob = new Blob([new Uint8Array(pdfData)], {
                type: 'application/pdf'
              });
              sessionStorage.setItem('pdfUrl', URL.createObjectURL(blob));
              job.finish(() => window.open('/reports/pengeluaran', '_blank'));
              resolve();
            } catch (err) {
              reject(err);
            }
          }, Stimulsoft.Report.StiExportFormat.Pdf);
        });
      });
    } catch (error) {
      dispatch(setProcessed());
    } finally {
      dispatch(setProcessed());
    }
  };
  document.querySelectorAll('.column-headers').forEach((element) => {
    element.classList.remove('c1kqdw7y7-0-0-beta-47');
  });
  function getRowClass(row: PengeluaranHeader) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: PengeluaranHeader) {
    return row.id;
  }

  const handleClose = () => {
    setPopOver(false);
    setMode('');
    clearError();
    forms.reset();
  };
  const handleAdd = async () => {
    try {
      // Jalankan API sinkronisasi
      setMode('add');

      setPopOver(true);

      forms.reset();
    } catch (error) {
      console.error('Error syncing ACOS:', error);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(event.target as Node)
    ) {
      setContextMenu(null);
    }
  };

  const prefetchPages = useCallback(
    async (
      pagesToFetch: number[],
      existingCache?: Map<number, PengeluaranHeader[]>,
      knownTotalPages?: number
    ) => {
      const cacheToCheck = existingCache ?? pageDataCache;
      const effectiveTotalPages = knownTotalPages ?? totalPages; // ← pakai nilai fresh jika dikirim

      const validPages = pagesToFetch.filter(
        (p) =>
          p >= 1 &&
          p <= effectiveTotalPages &&
          !streamBufferRef.current.has(p) &&
          !cacheToCheck.has(p) &&
          !prefetchingPagesRef.current.has(p)
      );

      if (validPages.length === 0) return;

      // Tandai semua sebagai sedang di-fetch agar tidak dobel
      validPages.forEach((p) => prefetchingPagesRef.current.add(p));

      // Fetch semua secara paralel
      await Promise.allSettled(
        validPages.map(async (pageNum) => {
          try {
            const data = await getPengeluaranHeaderFn({
              ...filters,
              page: pageNum,
              limit: filters.limit
            });

            if (data?.data && data.data.length > 0) {
              streamBufferRef.current = new Map(streamBufferRef.current);
              streamBufferRef.current.set(pageNum, data.data);
            }
          } catch (err) {
            // Silent fail — user tidak perlu tahu jika prefetch gagal
            console.warn(
              `[StreamBuffer] Prefetch page ${pageNum} failed:`,
              err
            );
          } finally {
            prefetchingPagesRef.current.delete(pageNum);
          }
        })
      );
    },
    [filters, totalPages, pageDataCache]
  );
  useEffect(() => {
    setIsFirstLoad(true);
  }, []);
  useEffect(() => {
    if (!session?.user?.id) return;
    loadGridConfig(
      String(session?.user?.id),
      'GridPengeluaranHeader',
      columns,
      setColumnsOrder,
      setColumnsWidth
    );
  }, [session]);
  useEffect(() => {
    // Ambil parameter nobukti dari URL
    const rawNobukti = searchParams.get('nobukti');

    // Set filters
    setFilters((prevFilters: Filter) => ({
      ...prevFilters,
      filters: {
        ...prevFilters.filters,
        nobukti: rawNobukti ?? ''
      }
    }));

    // Menambahkan timeout 1 detik sebelum menghapus parameter dari URL
    setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete('nobukti');
      window.history.replaceState({}, '', url.toString());
    }, 1000); // Delay 1 detik (1000 ms)
  }, []);
  useEffect(() => {
    if (isFirstLoad && gridRef.current && rows.length > 0) {
      dbg('6!) effect isFirstLoad MEMAKSA baris 0 <-- perebut fokus');
      setSelectedRow(0);
      gridRef.current.selectCell({ rowIdx: 0, idx: 1 });
      dispatch(setHeaderData(rows[0]));
      setIsFirstLoad(false);
    }
  }, [rows, isFirstLoad]);
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      filters: {
        ...prev.filters,
        tglDari: committed.tglDari,
        tglSampai: committed.tglSampai,
        bank_id: committed.bank_id
      }
    }));
  }, []);
  useEffect(() => {
    if (!onReload) return;

    suppressScrollRef.current = true;

    setFilters((prev) => ({
      ...prev,
      page: 1,
      filters: {
        ...filterPengeluaran,
        tglDari: committed.tglDari,
        tglSampai: committed.tglSampai,
        bank_id: committed.bank_id
      }
    }));

    setSelectedRow(0);
    setCurrentPage(1);
    setCheckedRows(new Set());
    setIsAllSelected(false);
    setRows([]);
    resetBufferingCache();

    setTimeout(() => {
      gridRef?.current?.selectCell({ rowIdx: 0, idx: 1 });
    }, 100);

    setTimeout(() => {
      suppressScrollRef.current = false;
    }, 500);

    // ✅ Reset onReload setelah selesai diproses
    dispatch(clearOnReload());
  }, [onReload]);

  useEffect(() => {
    const handleBulkFetch = async () => {
      if (
        !shouldBulkFetch ||
        !allData ||
        isDataUpdated ||
        isAfterMutation ||
        // Selama settle pasca-simpan, jangan biarkan hasil refetch membangun
        // ulang cache — kalau tidak, Row Combiner jalan lagi setelah
        // pendingFocusIdRef dikonsumsi dan fokus loncat ke baris 1.
        suppressRefetchRef.current
      ) {
        return;
      }

      const bulkData = allData.data || [];
      if (bulkData.length === 0) return;

      const pageSize = filters.limit; // default 20
      const newCache = new Map<number, PengeluaranHeader[]>();

      for (let i = 0; i < 5; i++) {
        const pageNum = i + 1;
        const startIdx = i * pageSize;
        const endIdx = startIdx + pageSize;
        const pageData = bulkData.slice(startIdx, endIdx);

        if (pageData.length > 0) {
          newCache.set(pageNum, pageData);
        }
      }

      setPageDataCache(newCache);
      setVisiblePages([1, 2, 3, 4, 5]);
      const totalItems = allData.pagination?.totalItems || 0;
      const totalPgs = Math.ceil(totalItems / filters.limit) || 1;
      setTotalPages(totalPgs); // Set state totalPages yang benar
      setHasMore(bulkData.length === filters.limit * 5); // misal 100
      setShouldBulkFetch(false);

      setIsFirstLoad(false);
      setIsFetching(false);
      const initialPrefetch = Array.from(
        { length: STREAM_BUFFER_SIZE },
        (_, i) => 6 + i
      ).filter((p) => p <= totalPgs);

      if (initialPrefetch.length > 0) {
        // Pass newCache DAN totalPgs langsung — keduanya belum committed ke state saat ini
        prefetchPages(initialPrefetch, newCache, totalPgs);
      }
      setTimeout(() => {
        // JANGAN rebut fokus pasca-simpan. Guard `suppressRefetchRef` di atas
        // hanya dievaluasi saat effect MASUK, sedangkan setTimeout ini menyala
        // 100ms kemudian tanpa syarat -- itulah yang membuat grid balik ke baris
        // 1 setelah SAVE meski resep fokus by-id sudah lengkap. Selama masih ada
        // baris target pasca-simpan (pendingFocusIdRef) atau window belum settle
        // (suppressRefetchRef), posisi baris sudah ditentukan onSuccess + Row
        // Combiner, jadi lompatan ke baris 0 di sini harus dilewati.
        // GridAlatbayar (referensi resep ini) memang tidak punya blok ini.
        if (pendingFocusIdRef.current != null || suppressRefetchRef.current) {
          dbg('5) ekor bulk-fetch DILEWATI (guard aktif)');
          return;
        }
        if (gridRef.current) {
          dbg('5!) ekor bulk-fetch MEMAKSA baris 0 <-- perebut fokus');
          setSelectedRow(0);
          gridRef.current.scrollToCell({ rowIdx: 0, idx: 1 });
        }
      }, 100);
    };
    handleBulkFetch();
  }, [allData, shouldBulkFetch, isDataUpdated, isAfterMutation, filters.limit]);
  useEffect(() => {
    if (
      shouldBulkFetch ||
      isDataUpdated ||
      isAfterMutation ||
      suppressRefetchRef.current
    ) {
      return;
    }

    if (!allData) return;

    const newRows = allData.data || [];

    const scrollContainer = scrollContainerRef.current;
    const scrollBeforeUpdate = scrollContainer
      ? {
          scrollTop: scrollContainer.scrollTop,
          scrollHeight: scrollContainer.scrollHeight,
          clientHeight: scrollContainer.clientHeight
        }
      : null;

    setPageDataCache((prevCache) => {
      const newCache = new Map(prevCache);
      newCache.set(currentPage, newRows);
      return newCache;
    });

    isPageTransitionRef.current = true;
    const maxVisible = Math.max(...visiblePages);
    const minVisible = Math.min(...visiblePages);

    // --- SCROLL KE BAWAH ---
    if (currentPage > maxVisible) {
      const removedPage = visiblePages[0];
      pendingScrollAdjustment.current = -(filters.limit * ROW_HEIGHT);
      // --- TAMBAHAN: Geser index selected ke atas agar data tetap menunjuk ke item yg sama ---
      shiftSelectionForWindow(-filters.limit);

      setPageDataCache((prev) => {
        const updated = new Map(prev);
        updated.delete(removedPage);
        return updated;
      });
      setVisiblePages((prevVisible) => [...prevVisible.slice(1), currentPage]);
    } else if (currentPage < minVisible) {
      // --- SCROLL KE ATAS ---
      const removedPage = visiblePages[visiblePages.length - 1];
      pendingScrollAdjustment.current = filters.limit * ROW_HEIGHT;
      // --- TAMBAHAN: Geser index selected ke bawah ---
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

    if (allData.pagination?.totalPages) {
      setTotalPages(allData.pagination.totalPages);
    }

    setHasMore(newRows.length === filters.limit);
    setPrevFilters(filters);

    setTimeout(() => {
      setIsTransitioning(false);
      setIsFetching(false);
      const maxVis = Math.max(...visiblePages);
      const minVis = Math.min(...visiblePages);

      // Tentukan arah: jika currentPage > maxVisible sebelumnya = scroll down, sebaliknya up
      const isScrollDown = currentPage >= maxVis;
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
  }, [
    allData,
    currentPage,
    filters,
    isDataUpdated,
    shouldBulkFetch,
    isAfterMutation
  ]);
  useEffect(() => {
    const combinedRows: PengeluaranHeader[] = [];

    visiblePages?.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (pageData) {
        combinedRows.push(...pageData);
      }
    });

    if (combinedRows.length === 0) {
      dbg('3!) Combiner jalan tapi combinedRows KOSONG -> tidak ada fokus', {
        visiblePages,
        cacheKeys: Array.from(pageDataCache.keys()),
        pendingFocusId: pendingFocusIdRef.current
      });
    }

    if (combinedRows.length > 0) {
      const newMinPage = Math.min(...visiblePages);
      setRows(combinedRows);
      prevMinPageRef.current = newMinPage;
      prevRowsLengthRef.current = combinedRows.length;

      // --- Fokus baris yang baru disimpan (add/edit) BERDASARKAN ID ---
      // Backend mengembalikan window yang memuat baris tsb; cari index-nya di
      // sini lalu scroll+select. Pakai idx 1 (kolom data pertama) agar tidak
      // memicu pergeseran window oleh handleScroll. `return` mencegah cabang
      // else di bawah men-scroll ke row 0.
      if (pendingFocusIdRef.current != null) {
        const fid = pendingFocusIdRef.current;
        pendingFocusIdRef.current = null;
        const fidx = combinedRows.findIndex(
          (r) => String(r.id) === String(fid)
        );
        dbg('3) Combiner cabang FOKUS', {
          fid,
          fidx,
          totalCombined: combinedRows.length,
          visiblePages
        });
        if (fidx >= 0) {
          selectedRowRef.current = fidx;
          setSelectedRow(fidx);
          setTimeout(() => {
            gridRef.current?.scrollToCell?.({ rowIdx: fidx, idx: 1 });
            gridRef.current?.selectCell?.({ rowIdx: fidx, idx: 1 });
            focusSelectedCell();
            dbg('4) selectCell dipanggil utk rowIdx', fidx);
            dbgActive('setelah-selectCell');
          }, 50);
        } else {
          dbg('!! id tidak ketemu di combinedRows', {
            cari: fid,
            contohId: combinedRows.slice(0, 5).map((r) => r.id)
          });
        }
        return;
      }
      dbg('3x) Combiner JALAN TANPA pendingFocusId', {
        totalCombined: combinedRows.length,
        jumpFirst: jumpToFirstRef.current,
        jumpLast: jumpToLastRef.current,
        pageTransition: isPageTransitionRef.current,
        suppress: suppressRefetchRef.current
      });

      if (jumpToFirstRef.current) {
        jumpToFirstRef.current = false;
        setSelectedRow(0);
        setTimeout(() => {
          gridRef.current?.scrollToCell?.({ rowIdx: 0, idx: 0 });
          gridRef.current?.selectCell?.({ rowIdx: 0, idx: 0 });
        }, 50);
      } else if (jumpToLastRef.current) {
        jumpToLastRef.current = false;
        const lastIdx = combinedRows.length - 1;
        setSelectedRow(lastIdx);
        setTimeout(() => {
          gridRef.current?.scrollToCell?.({ rowIdx: lastIdx, idx: 0 });
          gridRef.current?.selectCell?.({ rowIdx: lastIdx, idx: 0 });
        }, 50);
      } else if (isPageTransitionRef.current) {
        isPageTransitionRef.current = false;
        // Commit selectedRow yang sudah digeser BERSAMAAN dengan setRows di atas,
        // sehingga highlight (getRowClass) selalu menunjuk baris data yang sama
        // di satu render -> tidak ada frame inkonsisten -> highlight tidak berkedip.
        const targetRow = Math.min(
          Math.max(selectedRowRef.current, 0),
          combinedRows.length - 1
        );
        selectedRowRef.current = targetRow;
        setSelectedRow(targetRow);
      } else {
        // Re-fetch akibat sort/filter -- arahkan focus ke kolom yg di-sort/filter
        // dan kembalikan focus ke filter input jika sebelumnya user sedang mengetik.
        const targetIdx = pendingSelectIdxRef.current;
        const inputToRestore = activeFilterInputRef.current;

        setTimeout(() => {
          if (
            inputToRestore &&
            document.contains(inputToRestore) &&
            (inputToRestore.classList.contains('filter-input') ||
              inputToRestore.tagName === 'INPUT')
          ) {
            inputToRestore.focus({ preventScroll: true });
            requestAnimationFrame(() => {
              gridRef.current?.scrollToCell?.({ rowIdx: 0, idx: targetIdx });
              gridRef.current?.selectCell?.({ rowIdx: 0, idx: targetIdx });
              requestAnimationFrame(() => {
                if (inputToRestore && document.contains(inputToRestore)) {
                  inputToRestore.focus({ preventScroll: true });
                }
              });
            });
          } else {
            gridRef.current?.scrollToCell?.({ rowIdx: 0, idx: targetIdx });
            gridRef.current?.selectCell?.({ rowIdx: 0, idx: targetIdx });
          }
        }, 50);
      }
    }
  }, [visiblePages, pageDataCache]);

  useLayoutEffect(() => {
    if (pendingScrollAdjustment.current !== 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;

      // Geser scroll seketika (Sync)
      container.scrollTop += pendingScrollAdjustment.current;

      // Update referensi agar sistem tidak mengira user scroll manual
      scrollPositionRef.current = container.scrollTop;
      lastScrollTopRef.current = container.scrollTop;
      hasAdjustedScrollRef.current = true;

      // Reset
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
      }
      reanchorFromKeyboardRef.current = false;
    }
  }, [rows]);

  useEffect(() => {
    // Selama lazy loading masih bergerak, `rows` boleh kosong sesaat dan
    // `selectedRow` boleh menunjuk ke index yang barisnya belum/sudah tidak ada.
    // Semua itu keadaan SEMENTARA, bukan "user membatalkan pilihan".
    const sedangMuat =
      isLoadingData || isFetching || isTransitioning || shouldBulkFetch;

    if (rows.length === 0) {
      // Kosong sementara (Ctrl+End, ganti window, refetch) -> pertahankan
      // pilihan lama. Dulu di sini id-nya ikut dibuang, jadi begitu data balik
      // tidak ada lagi acuan untuk memulihkan pilihan dan detail ikut kosong.
      if (sedangMuat) return;

      // Benar-benar tidak ada data (filter tidak ketemu / periode kosong).
      selectedHeaderIdRef.current = null;
      dispatch(setHeaderData({}));
      return;
    }

    // ID yang menang, BUKAN index. `selectedRow` digeser sebanyak filters.limit
    // tiap kali window bergeser, jadi nilainya tidak bisa dipercaya sebagai
    // penunjuk "baris yang dipilih user". Id dicatat hanya di handleCellClick
    // (pemilihan yang disengaja), sehingga dia tetap menunjuk bukti yang sama
    // sepanjang user scroll.
    const idById = selectedHeaderIdRef.current;
    const idxById = idById
      ? rows.findIndex((r) => String(r.id) === String(idById))
      : -1;

    if (idxById >= 0) {
      if (idxById !== selectedRow) {
        // Barisnya masih di window tapi pindah index -> samakan lagi supaya
        // highlight (getRowClass) muncul di baris yang benar.
        selectedRowRef.current = idxById;
        setSelectedRow(idxById);
      }
      dispatch(setHeaderData(rows[idxById]));
      return;
    }

    if (!idById) {
      // Belum pernah ada pilihan (load pertama) -> pakai index apa adanya.
      const selectedRowData = rows[selectedRow] ?? rows[0];
      if (selectedRowData) {
        selectedHeaderIdRef.current = String(selectedRowData.id);
        dispatch(setHeaderData(selectedRowData));
      }
      return;
    }

    // Ada pilihan, tapi halamannya sudah keluar dari window (user scroll jauh).
    // Sengaja TIDAK dispatch apa pun: headerData dibiarkan menunjuk bukti yang
    // dipilih user, jadi grid detail tetap terisi. Kalau di sini di-dispatch
    // undefined/{}, detail akan mengosongkan diri DAN mematikan query-nya
    // (enabled: !!nobukti) sehingga tampak kosong padahal headernya ada isinya.
    // Ref-nya juga dipertahankan supaya pilihan otomatis pulih saat user
    // scroll balik ke halaman itu.
  }, [
    rows,
    selectedRow,
    dispatch,
    isLoadingData,
    isFetching,
    isTransitioning,
    shouldBulkFetch
  ]);
  useEffect(() => {
    if (gridRef.current && dataGridKey) {
      setTimeout(() => {
        gridRef.current?.selectCell({ rowIdx: 0, idx: 1 });
        setIsFirstLoad(false);
      }, 0);
    }
  }, [dataGridKey]);
  useEffect(() => {
    const headerCells = document.querySelectorAll('.rdg-header-row .rdg-cell');
    headerCells.forEach((cell) => {
      cell.setAttribute('tabindex', '-1');
    });
  }, []);
  useEffect(() => {
    const preventScrollOnSpace = (event: KeyboardEvent) => {
      // Cek apakah target yang sedang fokus adalah input atau textarea
      if (
        event.key === ' ' &&
        !(
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement
        )
      ) {
        event.preventDefault(); // Mencegah scroll pada tombol space jika bukan di input
      }
    };

    // Menambahkan event listener saat komponen di-mount
    document.addEventListener('keydown', preventScrollOnSpace);

    // Menghapus event listener saat komponen di-unmount
    return () => {
      document.removeEventListener('keydown', preventScrollOnSpace);
    };
  }, []);

  useEffect(() => {
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isTransitioning && !isFetching) {
      setTimeout(() => {
        hasAdjustedScrollRef.current = false;
      }, 200);
    }
  }, [isTransitioning, isFetching]);
  useEffect(() => {
    if (selectedRow !== null && rows.length > 0 && mode !== 'add') {
      const row = rows[selectedRow];
      forms.setValue('nobukti', row?.nobukti);
      forms.setValue('tglbukti', row?.tglbukti);
      forms.setValue('relasi_id', row?.relasi_id ?? null);
      forms.setValue('relasi_text', row?.relasi_text);
      forms.setValue('keterangan', row?.keterangan);
      forms.setValue('bank_id', row?.bank_id ?? null);
      forms.setValue('bank_text', row?.bank_text);
      forms.setValue('postingdari', row?.postingdari);
      forms.setValue('coakredit', row?.coakredit);
      forms.setValue('coakredit_text', row?.coakredit_text);
      forms.setValue('dibayarke', row?.dibayarke);
      forms.setValue('alatbayar_id', row?.alatbayar_id ?? null);
      forms.setValue('alatbayar_text', row?.alatbayar_text);
      forms.setValue('nowarkat', row?.nowarkat);
      forms.setValue('tgljatuhtempo', row?.tgljatuhtempo);
      forms.setValue('daftarbank_id', row?.daftarbank_id ?? null);
      forms.setValue('daftarbank_text', row?.daftarbank_text);
      forms.setValue('statusformat', row?.statusformat);
      forms.setValue('details', []);
    } else {
      const currentDate = new Date();
      // Clear or set defaults when adding a new record
      forms.setValue('relasi_text', '');
      forms.setValue('bank_text', '');
      forms.setValue('coakredit_text', '');
      forms.setValue('alatbayar_text', '');
      forms.setValue('daftarbank_text', '');
      forms.setValue('tglbukti', formatDateToDDMMYYYY(currentDate));
    }
  }, [forms, selectedRow, rows, mode, popOver]);
  useEffect(() => {
    // Initialize the refs based on columns dynamically
    columns.forEach((col) => {
      if (!inputColRefs.current[col.key]) {
        inputColRefs.current[col.key] = null;
      }
    });
  }, []);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearError();
        forms.reset(); // Reset the form when the Escape key is pressed
        setMode(''); // Reset the mode to empty
        setPopOver(false);
        dispatch(clearOpenName());
      }
    };

    // Add event listener for keydown when the component is mounted
    document.addEventListener('keydown', handleEscape);

    // Cleanup event listener when the component is unmounted or the effect is re-run
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [forms]);
  useEffect(() => {
    return () => {
      debouncedFilterUpdate.cancel();
    };
  }, []);
  console.log('committed', committed);

  return (
    <div className={`flex h-[100%] w-full justify-center`}>
      <div
        onKeyDownCapture={handleGridInputNavigationKeyDownCapture}
        onWheelCapture={() => {
          interactionModeRef.current = 'pointer';
        }}
        onPointerDownCapture={() => {
          interactionModeRef.current = 'pointer';
        }}
        className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background"
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
            <div>
              <Select
                defaultValue="ALL ROWS"
                onValueChange={handleFilterRows}
                disabled={isFilteringRows}
              >
                <SelectTrigger className="filter-select z-[999999] h-8 w-full cursor-pointer overflow-hidden rounded-sm border border-input-border bg-background-input p-2 text-xs font-thin">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectGroup>
                    <SelectItem
                      className="text=xs cursor-pointer"
                      value="ALL ROWS"
                    >
                      <p className="text-sm font-normal">ALL ROWS</p>
                    </SelectItem>
                    <SelectItem
                      className="text=xs cursor-pointer"
                      value="CHECKED ROWS"
                    >
                      <p className="text-sm font-normal">CHECKED ROWS</p>
                    </SelectItem>
                    <SelectItem
                      className="text=xs cursor-pointer"
                      value="UNCHECKED ROWS"
                    >
                      <p className="text-sm font-normal">UNCHECKED ROWS</p>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <DraggableColumn
              defaultColumns={columns}
              saveColumns={finalColumns}
              userId={String(session?.user.id)}
              gridName="GridPengeluaranHeader"
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
          rows={rows}
          rowClass={getRowClass}
          rowKeyGetter={rowKeyGetter}
          onCellClick={handleCellClick}
          onSelectedCellChange={(args) => {
            setSelectedCellKey(args.column.key);
            handleCellClick({ row: args.row });
          }}
          headerRowHeight={70}
          rowHeight={27}
          className={`${isDark ? 'rdg-dark' : 'rdg-light'} fill-grid`}
          enableVirtualization={false}
          onColumnResize={onColumnResize}
          onColumnsReorder={onColumnsReorder}
          onScroll={suppressScrollRef.current ? undefined : handleScroll}
          renderers={{
            noRowsFallback: <EmptyRowsRenderer />
          }}
        />
        <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2">
          <ActionButton
            module="PENGELUARAN"
            onAdd={handleAdd}
            // checkedRows={checkedRows}
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
            rowsLength={rows.length}
            totalItems={allData ? allData.pagination.totalItems : 0}
            startRow={startRow}
            customActions={[
              {
                label: 'Print',
                icon: <FaPrint />,
                onClick: () => handleReport(),
                className: 'bg-cyan-500 hover:bg-cyan-700'
              }
            ]}
          />
          {isLoadingData ? <LoadRowsRenderer /> : null}
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
                    String(session?.user.id),
                    'GridPengeluaranHeader',
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
      <FormPengeluaran
        popOver={popOver}
        handleClose={handleClose}
        setPopOver={setPopOver}
        submitSuccessful={submitSuccessful}
        isLoadingUpdate={isLoadingUpdate}
        isLoadingDelete={isLoadingDelete}
        forms={forms}
        mode={mode}
        onSubmit={onSubmit as any}
        isLoadingCreate={isLoadingCreate}
      />
    </div>
  );
};

export default GridPengeluaranHeader;
