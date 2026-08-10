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
import DataGrid, { Column, DataGridHandle } from 'react-data-grid';

import { ImSpinner2 } from 'react-icons/im';
import ActionButton from '@/components/custom-ui/ActionButton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import {
  FaFileExport,
  FaPrint,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaTimes
} from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { api2 } from '@/lib/utils/AxiosInstance';
import { useDispatch } from 'react-redux';
import { Checkbox } from '@/components/ui/checkbox';
import { useAlert } from '@/lib/store/client/useAlert';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import IcClose from '@/public/image/x.svg';
import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import { setHeaderData } from '@/lib/store/headerSlice/headerSlice';
import { debounce } from 'lodash';
import FormKasGantung from './FormKasGantung';
import {
  clearOpenName,
  setClearLookup
} from '@/lib/store/lookupSlice/lookupSlice';
import { clearOnReload } from '@/lib/store/filterSlice/filterSlice';
import {
  useCreateKasGantung,
  useDeleteKasGantung,
  useGetKasGantungHeader,
  useUpdatePengembalianKasGantung
} from '@/lib/server/useKasGantung';
import {
  filterKasGantung,
  KasGantungHeader
} from '@/lib/types/kasgantungheader.type';
import {
  KasGantungHeaderInput,
  kasgantungHeaderSchema
} from '@/lib/validations/kasgantung.validation';
import {
  blankToNull,
  cancelPreviousRequest,
  formatDateToDDMMYYYY,
  handleContextMenu,
  loadGridConfig,
  parseCurrency,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import {
  checkValidationKasGantungFn,
  generateKasGantungHeaderExportFn,
  generateKasGantungHeaderReportFn,
  getKasGantungHeaderFn
} from '@/lib/apis/kasgantungheader.api';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import FilterInput from '@/components/custom-ui/FilterInput';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import JsxParser from 'react-jsx-parser';
import { useTheme } from 'next-themes';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { useReportPdfContext } from '@/hooks/ReportPdfProvider';
import { useFormError } from '@/lib/hooks/formErrorContext';
import { HEADER_ROW_HEIGHT, LIMIT, ROW_HEIGHT } from '@/constants/constant';

interface Filter {
  page: number;
  limit: number;
  search: string;
  filters: typeof filterKasGantung;
  sortBy: string;
  isreload: boolean;
  sortDirection: 'asc' | 'desc';
}

const GridKasGantungHeader = () => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const [totalPages, setTotalPages] = useState(1);
  const [popOver, setPopOver] = useState<boolean>(false);
  // Dinaikkan setiap "Save & Add" untuk me-remount form (Dialog) agar semua
  // LookUp re-init dari nilai form yang baru di-reset.
  const [addFormKey, setAddFormKey] = useState<number>(0);

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
  // Versi ref dari isScrolling: di-set sinkron agar pengecekan di dalam
  // handleScroll yang sama langsung melihat nilai terbaru. State `isScrolling`
  // bersifat async, sehingga pada navigasi keyboard (hanya 1 event scroll per
  // tekan PageUp/PageDown) closure-nya masih `false` dan pemicu fetch halaman
  // berikutnya tidak pernah jalan. Ref ini mencegah masalah tsb.
  const isScrollingRef = useRef(false);
  const pendingSelectIdxRef = useRef<number>(1); // default ke idx 1 (skip nomor/select)
  const suppressScrollRef = useRef(false);
  const isPageTransitionRef = useRef(false);
  const { generateReport, generateExport } = useReportPdfContext();

  const lastScrollTopRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingScrollAdjustment = useRef<number>(0);
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5]);
  const minVisiblePage = useMemo(
    () => Math.min(...visiblePages),
    [visiblePages]
  );
  const [pageDataCache, setPageDataCache] = useState<
    Map<number, KasGantungHeader[]>
  >(new Map());

  const { mutateAsync: createKasGantung, isLoading: isLoadingCreate } =
    useCreateKasGantung();
  const { mutateAsync: updateKasGantung, isLoading: isLoadingUpdate } =
    useUpdatePengembalianKasGantung();
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastDispatchedId = useRef<string | null>(null);
  const headerClearedRef = useRef(false);
  const { mutateAsync: deleteKasGantung, isLoading: isLoadingDelete } =
    useDeleteKasGantung();
  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
  const [columnsWidth, setColumnsWidth] = useState<{ [key: string]: number }>(
    {}
  );
  const [mode, setMode] = useState<string>('');
  const [isFilteringRows, setIsFilteringRows] = useState(false);
  const [dataGridKey, setDataGridKey] = useState(0);

  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [fetchedPages, setFetchedPages] = useState<Set<number>>(new Set([1]));
  const [bulkStartPage, setBulkStartPage] = useState(1);

  const [isFetchingManually, setIsFetchingManually] = useState(false);
  const [rows, setRows] = useState<KasGantungHeader[]>([]);
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const dispatch = useDispatch();
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const { alert } = useAlert();
  const { user } = useSelector((state: RootState) => state.auth);
  const selectedRowRef = useRef<number>(0);
  const pendingFocusIdRef = useRef<string | null>(null);
  const suppressRefetchRef = useRef(false);
  const activeFilterInputRef = useRef<HTMLElement | null>(null);
  const [selectedCellKey, setSelectedCellKey] = useState<string>('nobukti');
  const streamBufferRef = useRef<Map<number, KasGantungHeader[]>>(new Map());
  const prefetchingPagesRef = useRef<Set<number>>(new Set());
  const STREAM_BUFFER_SIZE = 5;
  const WINDOW_SIZE = 5;
  const jumpToLastRef = useRef(false);
  const jumpToFirstRef = useRef(false);
  const { committed, onReload } = useSelector(
    (state: RootState) => state.filter
  );
  const interactionModeRef = useRef<'keyboard' | 'pointer'>('pointer');
  const reanchorFromKeyboardRef = useRef(false);
  const gridCellHadFocusRef = useRef(false);
  const getSelectedGridCell = (): HTMLElement | null =>
    gridRef.current?.element?.querySelector<HTMLElement>(
      ':scope > [role="row"] > [role="gridcell"][tabindex="0"]'
    ) ?? null;
  useEffect(() => {
    selectedRowRef.current = selectedRow;
  }, [selectedRow]);
  const isSelectedGridCellFocused = () => {
    const cell = getSelectedGridCell();
    return cell !== null && cell === document.activeElement;
  };

  const restoreGridCellFocus = () => {
    if (!gridCellHadFocusRef.current) return;
    gridCellHadFocusRef.current = false;
    getSelectedGridCell()?.focus({ preventScroll: true });
  };

  const shiftSelectionForWindow = (deltaRows: number) => {
    const fromKeyboard = interactionModeRef.current === 'keyboard';
    reanchorFromKeyboardRef.current = fromKeyboard;

    gridCellHadFocusRef.current = isSelectedGridCellFocused();
    if (!fromKeyboard) return;

    const next = Math.max(0, selectedRowRef.current + deltaRows);
    selectedRowRef.current = next;
  };

  const forms = useForm<KasGantungHeaderInput>({
    resolver:
      mode === 'delete' ? undefined : zodResolver(kasgantungHeaderSchema),
    mode: 'onSubmit',
    defaultValues: {
      nobukti: '',
      tglbukti: '',
      keterangan: null,
      bank_id: null,
      pengeluaran_nobukti: '',
      coakaskeluar: '',
      relasi_id: null,
      alatbayar_id: null,
      details: []
    }
  });
  const {
    setFocus,
    formState: { isSubmitSuccessful }
  } = forms;
  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: LIMIT,
    filters: {
      ...filterKasGantung,
      tglDari: committed.tglDari,
      tglSampai: committed.tglSampai
    },
    isreload: true, // Set true untuk first load
    search: '',
    sortBy: 'nobukti',
    sortDirection: 'asc'
  });
  const gridRef = useRef<DataGridHandle>(null);
  const [prevFilters, setPrevFilters] = useState<Filter>(filters);
  const effectiveLimit = shouldBulkFetch ? filters.limit * 5 : filters.limit;
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const { data: allData, isLoading: isLoadingData } = useGetKasGantungHeader(
    {
      ...filters,
      page: shouldBulkFetch ? bulkStartPage : currentPage,
      limit: effectiveLimit
    },
    abortControllerRef.current?.signal
  );

  const resetBufferingCache = () => {
    setShouldBulkFetch(true);
    setBulkStartPage(1);
    setPageDataCache(new Map());
    setVisiblePages([1, 2, 3, 4, 5]);
    setIsFetching(false);
    streamBufferRef.current = new Map();
    prefetchingPagesRef.current = new Set();
  };

  const columns = useMemo((): Column<KasGantungHeader>[] => {
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
                  filters: filterKasGantung
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
        key: 'select',
        name: '',
        width: 50,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
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
        renderCell: ({ row }: { row: KasGantungHeader }) => (
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
        name: 'Nomor Bukti',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div
            title="NO. BUKTI"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
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
                Nomor Bukti
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
        key: 'tglbukti',
        name: 'Tanggal Bukti',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: () => (
          <div
            title="TANGGAL BUKTI"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
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
                Tanggal Bukti
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
        key: 'bank_nama',
        name: 'Nama Bank',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NAMA BANK"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
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
                Nama Bank
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
              <FilterOptions
                columnKey={column.column.key}
                endpoint="bank"
                value="id"
                label="nama"
                onChange={(value) => handleFilterInputChange('bank_id', value)}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const cellValue = props.row.bank_nama || '';
          return (
            <div
              title={cellValue}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search)}
            </div>
          );
        }
      },
      {
        key: 'pengeluaran_nobukti',
        name: 'Pengeluaran Nomor Bukti',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div
            title="PENGELUARAN NOMOR BUKTI"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('pengeluaran_nobukti')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'pengeluaran_nobukti'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Pengeluaran Nomor Bukti
              </p>
              <div className="ml-2">
                {filters.sortBy === 'pengeluaran_nobukti' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'pengeluaran_nobukti' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="pengeluaran_nobukti"
                value={filters.filters.pengeluaran_nobukti || ''}
                onChange={(value) =>
                  handleFilterInputChange('pengeluaran_nobukti', value)
                }
                onClear={() => handleClearFilter('pengeluaran_nobukti')}
                inputRef={(el) => {
                  inputColRefs.current['pengeluaran_nobukti'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.pengeluaran_nobukti || '';
          const cellValue = props.row.pengeluaran_nobukti || '';
          const HighlightWrapper = () =>
            highlightText(cellValue, filters.search, columnFilter);
          return (
            <div
              title={cellValue}
              className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-sm"
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
        key: 'coakaskeluar',
        name: 'COA Kas Keluar',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div
            title="COA KAS KELUAR"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('coakaskeluar')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'coakaskeluar'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                COA Kas Keluar
              </p>
              <div className="ml-2">
                {filters.sortBy === 'coakaskeluar' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'coakaskeluar' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="coakaskeluar"
                value={filters.filters.coakaskeluar || ''}
                onChange={(value) =>
                  handleFilterInputChange('coakaskeluar', value)
                }
                onClear={() => handleClearFilter('coakaskeluar')}
                inputRef={(el) => {
                  inputColRefs.current['coakaskeluar'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.coakaskeluar || '';
          const cellValue = props.row.coakaskeluar || '';
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
        name: 'Relasi',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div
            title="RELASI"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('relasi_nama')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'relasi_nama' ? 'font-bold' : 'font-normal'
                }`}
              >
                Relasi
              </p>
              <div className="ml-2">
                {filters.sortBy === 'relasi_nama' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'relasi_nama' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="relasi_nama"
                value={filters.filters.relasi_nama || ''}
                onChange={(value) =>
                  handleFilterInputChange('relasi_nama', value)
                }
                onClear={() => handleClearFilter('relasi_nama')}
                inputRef={(el) => {
                  inputColRefs.current['relasi_nama'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.relasi_nama || '';
          const cellValue = props.row.relasi_nama || '';
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
        name: 'DIBAYAR KE',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div
            title="DIBAYAR KE"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
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
                DIBAYAR KE
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
        key: 'alatbayar_nama',
        name: 'Alat Bayar',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div
            title="ALAT BAYAR"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('alatbayar_nama')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'alatbayar_nama'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Alat Bayar
              </p>
              <div className="ml-2">
                {filters.sortBy === 'alatbayar_nama' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'alatbayar_nama' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="alatbayar_nama"
                value={filters.filters.alatbayar_nama || ''}
                onChange={(value) =>
                  handleFilterInputChange('alatbayar_nama', value)
                }
                onClear={() => handleClearFilter('alatbayar_nama')}
                inputRef={(el) => {
                  inputColRefs.current['alatbayar_nama'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.alatbayar_nama || '';
          const cellValue = props.row.alatbayar_nama || '';
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
        name: 'NO WARKAT',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div
            title="NO WARKAT"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
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
                NO WARKAT
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
        name: 'TGL JATUH TEMPO',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div
            title="TGL JATUH TEMPO"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
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
                TGL JATUH TEMPO
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
        key: 'gantungorderan_nobukti',
        name: 'GANTUNG ORDERAN NOBUKTI',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div
            title="GANTUNG ORDERAN NOBUKTI"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('gantungorderan_nobukti')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'gantungorderan_nobukti'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                GANTUNG ORDERAN NOBUKTI
              </p>
              <div className="ml-2">
                {filters.sortBy === 'gantungorderan_nobukti' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'gantungorderan_nobukti' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="gantungorderan_nobukti"
                value={filters.filters.gantungorderan_nobukti || ''}
                onChange={(value) =>
                  handleFilterInputChange('gantungorderan_nobukti', value)
                }
                onClear={() => handleClearFilter('gantungorderan_nobukti')}
                inputRef={(el) => {
                  inputColRefs.current['gantungorderan_nobukti'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.gantungorderan_nobukti || '';
          const cellValue = props.row.gantungorderan_nobukti || '';
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
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div
            title="Keterangan"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
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
        key: 'modifiedby',
        name: 'Modified By',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div
            title="MODIFIED BY"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
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
                MODIFIED BY
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
        renderHeaderCell: () => (
          <div
            title="CREATED AT"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
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
        renderHeaderCell: () => (
          <div
            title="UPDATED AT"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
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
  }, [filters, checkedRows, isAllSelected, rows, minVisiblePage]);

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
      resetBufferingCache();
    }, 300)
  ).current;

  const pendingUpdates = useRef<Record<string, string>>({});

  const handleFilterInputChange = useCallback(
    (colKey: string, value: string) => {
      cancelPreviousRequest(abortControllerRef);
      pendingUpdates.current[colKey] = value;

      // Hanya track jika activeElement memang filter input kolom ini
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.classList.contains('filter-input') ||
          active.tagName === 'INPUT') &&
        active !== inputRef.current // bukan global search
      ) {
        activeFilterInputRef.current = active;
      }

      const originalIndex = columns.findIndex((col) => col.key === colKey);
      const displayIndex =
        columnsOrder.length > 0
          ? columnsOrder.findIndex((idx) => idx === originalIndex)
          : originalIndex;
      pendingSelectIdxRef.current = displayIndex >= 0 ? displayIndex : 1;

      debouncedFilterUpdate(pendingUpdates.current);
    },
    [columns, columnsOrder]
  );

  const handleClearFilter = useCallback(
    (colKey: string) => {
      cancelPreviousRequest(abortControllerRef);
      debouncedFilterUpdate.cancel();
      pendingUpdates.current[colKey] = '';

      // Arahkan ke kolom yang di-clear
      const originalIndex = columns.findIndex((col) => col.key === colKey);
      const displayIndex =
        columnsOrder.length > 0
          ? columnsOrder.findIndex((idx) => idx === originalIndex)
          : originalIndex;
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
      setSelectedRow(0);
      resetBufferingCache();
    },
    [columns, columnsOrder]
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
        ...filterKasGantung,
        tglDari: prev.filters.tglDari,
        tglSampai: prev.filters.tglSampai
      },
      search: searchValue,
      page: 1,
      isreload: false
    }));

    setCheckedRows(new Set());
    setIsAllSelected(false);
    resetBufferingCache();
    setSelectedRow(0);
    setCurrentPage(1);
    setRows([]);
  };

  const handleSort = (column: string) => {
    const originalIndex = columns.findIndex((col) => col.key === column);

    const displayIndex =
      columnsOrder.length > 0
        ? columnsOrder.findIndex((idx) => idx === originalIndex)
        : originalIndex;

    activeFilterInputRef.current = null; // Sort bukan dari input, tidak perlu restore focus
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
    resetBufferingCache();
    setTimeout(() => {
      gridRef?.current?.scrollToCell({ rowIdx: 0, idx: displayIndex });
    }, 200);
    setSelectedRow(0);
    setCurrentPage(1);
    setFetchedPages(new Set([1]));
    setRows([]);
  };

  const handleRowSelect = (rowId: string) => {
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
    setTimeout(() => {
      setIsFilteringRows(false);
    }, 1000);
  };

  const handleClearInput = () => {
    cancelPreviousRequest(abortControllerRef);
    debouncedFilterUpdate.cancel();
    activeFilterInputRef.current = null;
    pendingSelectIdxRef.current = 1; // Reset ke default idx 1
    setFilters((prev) => ({
      ...prev,
      filters: {
        ...prev.filters
      },
      search: '',
      page: 1
    }));
    setCheckedRows(new Set());
    setIsAllSelected(false);
    setRows([]);
    setCurrentPage(1);
    resetBufferingCache();
    gridRef?.current?.scrollToCell?.({ rowIdx: 0, idx: 0 });
    setInputValue('');
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
        String(user?.id),
        'GridKasGantungHeader',
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
        String(user?.id),
        'GridKasGantungHeader',
        [...newOrder],
        columnsWidth
      );
      return newOrder;
    });
  };

  async function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (isLoadingData || rows.length === 0 || isTransitioning || isFetching)
      return;

    const { currentTarget } = event;
    const scrollTop = currentTarget.scrollTop;
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

    const firstVisibleRow = Math.floor(scrollTop / ROW_HEIGHT);
    const lastVisibleRow = Math.floor((scrollTop + clientHeight) / ROW_HEIGHT);

    const THRESHOLD_ROWS = 50;

    // SCROLL KE BAWAH
    const rowsRemainingBelow = rows.length - lastVisibleRow;

    if (rowsRemainingBelow <= THRESHOLD_ROWS) {
      const maxPage = Math.max(...visiblePages);
      const nextPage = maxPage + 1;

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
              updated.delete(removedPage); // Langsung hapus total dari memori
              return updated;
            });

            return newPages;
          });

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
          // Buffer miss — fallback ke fetch normal
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
            const removedPage = prevVisible[WINDOW_SIZE - 1];
            const newPages = [
              prevPage,
              ...prevVisible.slice(0, WINDOW_SIZE - 1)
            ];

            setPageDataCache((prev) => {
              const updated = new Map(prev);
              updated.delete(removedPage); // Langsung hapus total dari memori
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
          // Buffer miss — fallback ke fetch normal
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

  function handleCellClick(args: { row: KasGantungHeader }) {
    const clickedRow = args.row;
    if (!clickedRow) return;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
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
    // pertama — pakai bulk-fetch normal (lebih efisien: 1 request).
    if (totalPages <= WINDOW_SIZE) {
      resetBufferingCache();
      return;
    }

    // Kasus umum: WINDOW_SIZE halaman terakhir TIDAK selalu sejajar dengan
    // batas bulk block (mis. totalPages=23, WINDOW_SIZE=5 -> butuh halaman
    // 19..23, sementara bulk block hanya {1-5,6-10,11-15,16-20,21-25}). Jadi
    // fetch tiap halaman terakhir secara langsung lalu rakit cache & window.
    setIsFetching(true);
    setShouldBulkFetch(false);
    setBulkStartPage(1);
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
          getKasGantungHeaderFn({ ...filters, page: p, limit: filters.limit })
        )
      );

      const newCache = new Map<number, KasGantungHeader[]>();
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

  const resetAddForm = async () => {
    const currentDate = new Date(); // Dapatkan tanggal sekarang
    forms.reset({
      nobukti: '',
      tglbukti: formatDateToDDMMYYYY(currentDate),
      keterangan: '',
      bank_id: null,
      bank_nama: '',
      pengeluaran_nobukti: '',
      coakaskeluar: '',
      relasi_id: null,
      relasi_nama: '',
      alatbayar_id: null,
      alatbayar_nama: '',
      details: []
    });
  };

  const onSuccess = async (
    indexOnPage: number,
    fetchedPages: number[],
    pagedData: Record<string, KasGantungHeader[]>,
    pageNumber: number,
    keepOpenModal = false,
    focusId: string | null = null
  ) => {
    clearError();
    setIsFetchingManually(true);
    // Tandai baris baru agar Row Combiner memfokuskannya by-id setelah data
    // window settle (lihat pendingFocusIdRef). Lebih andal daripada selectCell
    // by-index yang bisa meleset saat window bergeser.
    pendingFocusIdRef.current = focusId ?? null;
    try {
      if (keepOpenModal) {
        // SAVE & ADD: reset form lalu remount modal via addFormKey agar semua
        // LookUp re-init dari nilai form.
        await resetAddForm();
        setAddFormKey((k) => k + 1);
        setPopOver(true);
      } else {
        dispatch(setClearLookup(true));
        forms.reset();
        setPopOver(false);
      }

      if (mode !== 'delete') {
        suppressRefetchRef.current = true;

        const response = await api2.get(
          `/redis/get/kasgantungheader-page-${pageNumber}`
        );
        const loadedRows: KasGantungHeader[] = Array.isArray(response.data)
          ? response.data
          : [];

        const focusIdx =
          focusId != null
            ? loadedRows.findIndex((r) => String(r.id) === String(focusId))
            : -1;
        const targetIndex = focusIdx >= 0 ? focusIdx : indexOnPage;

        setIsDataUpdated(true);
        setShouldBulkFetch(false);
        setRows([]);
        setRows(loadedRows);
        setVisiblePages(fetchedPages);
        setSelectedRow(targetIndex);
        selectedRowRef.current = targetIndex;
        setPageDataCache(
          new Map(
            Object.entries(pagedData).map(([key, value]) => [
              Number(key),
              value as KasGantungHeader[]
            ])
          )
        );
        setCurrentPage(pageNumber);

        const updatedBuffer = new Map(streamBufferRef.current);
        Object.entries(pagedData).forEach(([key, value]) => {
          updatedBuffer.set(Number(key), value as KasGantungHeader[]);
        });
        streamBufferRef.current = updatedBuffer;

        setTimeout(() => {
          gridRef?.current?.selectCell({
            rowIdx: targetIndex,
            idx: 1
          });
        }, 200);

        if (focusId != null) {
          [120, 320, 620].forEach((d) =>
            setTimeout(() => {
              pendingFocusIdRef.current = String(focusId);
            }, d)
          );
          setTimeout(() => {
            if (String(pendingFocusIdRef.current) === String(focusId)) {
              pendingFocusIdRef.current = null;
            }
          }, 950);
        }
        setTimeout(() => {
          suppressRefetchRef.current = false;
        }, 1000);
      }

      setIsDataUpdated(false);
    } catch (error) {
      console.error('Error during onSuccess:', error);
      setIsFetchingManually(false);
      setIsDataUpdated(false);
    }
  };

  const removeById = <T extends { id: unknown }>(list: T[], id: unknown) =>
    list.filter((item) => item.id !== id);

  const onSubmit = async (
    values: KasGantungHeaderInput,
    keepOpenModalArg: unknown = false
  ) => {
    const keepOpenModal = keepOpenModalArg === true;
    clearError();
    const selectedRowId = rows[selectedRow]?.id;

    try {
      dispatch(setProcessing());

      if (mode === 'delete') {
        if (!selectedRowId) return;

        await deleteKasGantung(String(selectedRowId), {
          onSuccess: () => {
            setPopOver(false);

            // 1. Remove from visible rows
            setRows((prevRows) => removeById(prevRows, selectedRowId));

            // 2. Remove from pageDataCache (all pages)
            setPageDataCache((prevCache) => {
              const updated = new Map(prevCache);
              updated.forEach((pageRows, pageNum) => {
                const filtered = removeById(pageRows, selectedRowId);
                if (filtered.length !== pageRows.length) {
                  updated.set(pageNum, filtered);
                }
              });
              return updated;
            });

            // 3. Remove from streamBuffer
            const newBuffer = new Map(streamBufferRef.current);
            newBuffer.forEach((pageRows, pageNum) => {
              const filtered = removeById(pageRows, selectedRowId);
              if (filtered.length !== pageRows.length) {
                newBuffer.set(pageNum, filtered);
              }
            });
            streamBufferRef.current = newBuffer;
            const nextFocusRow = rows[selectedRow + 1] ?? rows[selectedRow - 1];
            if (nextFocusRow) {
              pendingFocusIdRef.current = String(nextFocusRow.id);
            } else {
              setSelectedRow(0);
              selectedRowRef.current = 0;
            }
          }
        });
        return;
      }

      // Backend menolak nominal <= 0 dengan pesan 'Line N: Nominal harus diisi'.
      // Dihadang di sini supaya bahasanya seragam dan tidak perlu roundtrip.
      const barisTanpaNominal = (values.details ?? []).findIndex(
        (detail) => parseCurrency(String(detail?.nominal ?? '')) <= 0
      );
      if (barisTanpaNominal !== -1) {
        alert({
          title: `NOMINAL PADA BARIS ${barisTanpaNominal + 1} WAJIB DIISI.`,
          variant: 'danger',
          submitText: 'OK'
        });
        return;
      }

      // LookUp yang di-clear lewat String(id ?? '') dan defaultValues coakaskeluar
      // '' mengirim string kosong ke kolom relasi. Kolomnya NULL-able, tapi ''
      // ditolak foreign key -> error SQL mentah. Normalkan dulu ke null.
      const payload = blankToNull(values, [
        'relasi_id',
        'bank_id',
        'alatbayar_id',
        'coakaskeluar',
        'pengeluaran_nobukti'
      ]);

      if (mode === 'add') {
        await createKasGantung(
          {
            ...payload,
            details: payload.details.map((detail) => ({ ...detail, id: '0' })),
            ...filters
          },
          {
            onSuccess: (data: any) =>
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
        return;
      }

      if (selectedRowId && mode === 'edit') {
        await updateKasGantung(
          {
            id: String(selectedRowId),
            fields: { ...payload, ...filters }
          },
          {
            onSuccess: (data: any) =>
              onSuccess(
                data.itemIndex,
                data.fetchedPages,
                data.pagedData,
                data.pageNumber,
                false,
                data.updatedItem?.id ?? selectedRowId ?? null
              )
          }
        );
      }
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status !== 400) {
        console.error(error);
      }
    } finally {
      dispatch(setProcessed());
    }
  };

  const hasSelectedRow = rows.length > 0 && rows[selectedRow] !== undefined;

  const alertNoSelectedRow = () => {
    alert({
      title: 'HARAP PILIH DATA TERLEBIH DAHULU!',
      variant: 'danger',
      submitText: 'OK'
    });
  };

  const handleEdit = async () => {
    if (!hasSelectedRow) {
      alertNoSelectedRow();
      return;
    }
    const rowData = rows[selectedRow];
    const result = await checkValidationKasGantungFn({
      aksi: 'EDIT',
      value: rowData.id
    });
    if (result.status == 'failed') {
      alert({
        title: result.message,
        variant: 'danger',
        submitText: 'OK'
      });
      return;
    }
    setPopOver(true);
    setMode('edit');
  };

  const handleDelete = async () => {
    if (!hasSelectedRow) {
      alertNoSelectedRow();
      return;
    }
    const rowData = rows[selectedRow];
    try {
      const result = await checkValidationKasGantungFn({
        aksi: 'DELETE',
        value: rowData.nobukti
      });

      if (result.status == 'failed') {
        alert({
          title: result.message,
          variant: 'danger',
          submitText: 'OK'
        });
        return;
      }
      setMode('delete');
      setPopOver(true);
    } catch (error) {
      console.error('Error during delete validation:', error);
    }
  };

  const handleView = () => {
    if (!hasSelectedRow) {
      alertNoSelectedRow();
      return;
    }
    setMode('view');
    setPopOver(true);
  };

  // Cetak bukti dijalankan di BACKEND (background job + socket). Frontend hanya
  // mengirim id baris yang dicentang plus nama template .mrt-nya —
  // LaporanKasGantung.mrt adalah bukti per transaksi, bukan laporan daftar.
  // Progres render muncul di toast; PDF diambil setelah selesai.
  const handleReport = async () => {
    if (checkedRows.size === 0) {
      alert({
        title: 'PILIH DATA YANG INGIN DI CETAK!',
        variant: 'danger',
        submitText: 'OK'
      });
      return;
    }
    if (checkedRows.size > 1) {
      alert({
        title: 'HANYA BISA MEMILIH SATU DATA!',
        variant: 'danger',
        submitText: 'OK'
      });
      return;
    }
    const rowId = Array.from(checkedRows)[0];

    await generateReport({
      label: 'Kas Gantung',
      payload: {
        mrtName: 'LaporanKasGantung.mrt',
        id: String(rowId),
        judullaporan: 'Laporan Kas Gantung'
      },
      apiFn: generateKasGantungHeaderReportFn,
      // Tombol Export di toolbar viewer — memakai filter grid yang sedang
      // aktif, sama seperti tombol Export di toolbar bawah.
      onExport: () => handleExportExcel()
    });
  };

  const handleExportExcel = async () => {
    const { page, limit, ...filtersWithoutLimit } = filters;

    await generateExport({
      label: 'Export Kas Gantung',
      payload: {
        search: filtersWithoutLimit.search,
        filters: filtersWithoutLimit.filters,
        sortBy: filtersWithoutLimit.sortBy,
        sortDirection: filtersWithoutLimit.sortDirection
      },
      apiFn: generateKasGantungHeaderExportFn
    });
  };

  document.querySelectorAll('.column-headers').forEach((element) => {
    element.classList.remove('c1kqdw7y7-0-0-beta-47');
  });

  function getRowClass(row: KasGantungHeader) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: KasGantungHeader) {
    return row.id;
  }

  function LoadRowsRenderer() {
    return (
      <div>
        <ImSpinner2 className="animate-spin text-3xl text-primary" />
      </div>
    );
  }

  const handleClose = () => {
    setPopOver(false);
    setMode('');
    clearError();
    forms.reset();
  };

  const handleAdd = async () => {
    try {
      setMode('add');
      // Reset SEBELUM buka modal supaya lookupNama (non-reaktif) sudah terisi
      // saat LookUp pertama kali mount.
      await resetAddForm();
      setPopOver(true);
    } catch (error) {
      console.error('Error add kas gantung:', error);
    }
  };

  const prefetchPages = useCallback(
    async (
      pagesToFetch: number[],
      existingCache?: Map<number, KasGantungHeader[]>,
      knownTotalPages?: number
    ) => {
      const cacheToCheck = existingCache ?? pageDataCache;
      const effectiveTotalPages = knownTotalPages ?? totalPages; // pakai nilai fresh jika dikirim

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
            const data = await getKasGantungHeaderFn({
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
    if (isFirstLoad && gridRef.current && rows.length > 0) {
      setSelectedRow(0);
      gridRef.current.selectCell({ rowIdx: 0, idx: 1 });
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
        tglSampai: committed.tglSampai
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
        ...filterKasGantung,
        tglDari: committed.tglDari,
        tglSampai: committed.tglSampai
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

    dispatch(clearOnReload());
  }, [onReload]);

  useEffect(() => {
    if (user?.id) {
      loadGridConfig(
        String(user?.id),
        'GridKasGantungHeader',
        columns,
        setColumnsOrder,
        setColumnsWidth
      );
    }
  }, [user]);

  useEffect(() => {
    if (isSubmitSuccessful) {
      // Pastikan fokus terjadi setelah repaint
      requestAnimationFrame(() => setFocus('keterangan'));
    }
  }, [isSubmitSuccessful, setFocus]);

  // 1. Bulk Fetch (window pertama = WINDOW_SIZE halaman dalam satu request)
  useEffect(() => {
    const handleBulkFetch = async () => {
      if (
        !shouldBulkFetch ||
        !allData ||
        isDataUpdated ||
        isAfterMutation ||
        // Selama settle pasca-mutasi (add/edit), jangan biarkan hasil refetch
        // membangun ulang cache — kalau tidak, Row Combiner jalan lagi setelah
        // pendingFocusIdRef dikonsumsi & fokus loncat ke baris 1. Effect #2
        // (Pagination Fetch) sudah punya guard yang sama.
        suppressRefetchRef.current
      ) {
        return;
      }

      const bulkData = allData.data || [];
      const pageSize = filters.limit;
      const newCache = new Map<number, KasGantungHeader[]>();
      const wasJumpingToLast = jumpToLastRef.current;

      const logicalStartPage = (bulkStartPage - 1) * WINDOW_SIZE + 1;

      // Hasil filter kosong tetap harus mematikan shouldBulkFetch. Kalau tidak,
      // flag bulk nyangkut di true -> grid selamanya dianggap "sedang memuat"
      // sehingga headerData tidak pernah dikosongkan dan grid detail masih
      // menampilkan bukti yang sudah tidak ada di header.
      if (bulkData.length === 0) {
        setPageDataCache(new Map());
        setVisiblePages(
          Array.from({ length: WINDOW_SIZE }, (_, i) => logicalStartPage + i)
        );
        setRows([]);
        setSelectedRow(0);
        selectedRowRef.current = 0;
        setTotalPages(1);
        setHasMore(false);
        setShouldBulkFetch(false);
        setIsFirstLoad(false);
        setIsFetching(false);
        jumpToLastRef.current = false;
        jumpToFirstRef.current = false;
        return;
      }

      for (let i = 0; i < WINDOW_SIZE; i++) {
        const pageNum = logicalStartPage + i;
        const startIdx = i * pageSize;
        const endIdx = startIdx + pageSize;
        const pageData = bulkData.slice(startIdx, endIdx);

        if (pageData.length > 0) {
          newCache.set(pageNum, pageData);
        }
      }

      setPageDataCache(newCache);
      setVisiblePages(
        Array.from({ length: WINDOW_SIZE }, (_, i) => logicalStartPage + i)
      );

      const totalItems = allData.pagination?.totalItems || 0;
      const totalPgs = Math.ceil(totalItems / filters.limit) || 1;

      setTotalPages(totalPgs);
      setHasMore(bulkData.length === filters.limit * WINDOW_SIZE);
      setShouldBulkFetch(false);
      setIsFirstLoad(false);
      setIsFetching(false);

      const lastLogicalPage = Math.min(
        logicalStartPage + WINDOW_SIZE - 1,
        totalPgs
      );
      const initialPrefetch = Array.from(
        { length: STREAM_BUFFER_SIZE },
        (_, i) => lastLogicalPage + 1 + i
      ).filter((p) => p <= totalPgs);

      if (initialPrefetch.length > 0) {
        prefetchPages(initialPrefetch, newCache, totalPgs);
      }

      if (wasJumpingToLast) {
        setCurrentPage(lastLogicalPage);
      }
    };
    handleBulkFetch();
  }, [
    allData,
    shouldBulkFetch,
    isDataUpdated,
    isAfterMutation,
    filters.limit,
    bulkStartPage
  ]);

  // 2. Pagination Fetch & Scroll Adjustment
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

    setPageDataCache((prevCache) => {
      const newCache = new Map(prevCache);
      newCache.set(currentPage, newRows);
      return newCache;
    });

    isPageTransitionRef.current = true;
    const maxVisible = Math.max(...visiblePages);
    const minVisible = Math.min(...visiblePages);

    // --- SCROLL KE BAWAH ---
    if (currentPage > maxVisible && currentPage <= maxVisible + 1) {
      const removedPage = visiblePages[0];
      pendingScrollAdjustment.current = -(filters.limit * ROW_HEIGHT);
      // --- Geser index selected ke atas agar data tetap menunjuk ke item yg sama ---
      shiftSelectionForWindow(-filters.limit);

      setPageDataCache((prev) => {
        const updated = new Map(prev);
        updated.delete(removedPage);
        return updated;
      });
      setVisiblePages((prevVisible) => [...prevVisible.slice(1), currentPage]);
    } else if (currentPage < minVisible && currentPage >= minVisible - 1) {
      // --- SCROLL KE ATAS ---
      const removedPage = visiblePages[visiblePages.length - 1];
      pendingScrollAdjustment.current = filters.limit * ROW_HEIGHT;
      // --- Geser index selected ke bawah ---
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

  // 3. Row Combiner (Mapping cache to rows state)
  useEffect(() => {
    const combinedRows: KasGantungHeader[] = [];
    visiblePages?.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (pageData) combinedRows.push(...pageData);
    });

    if (combinedRows.length > 0) {
      const newMinPage = Math.min(...visiblePages);
      setRows(combinedRows);
      prevMinPageRef.current = newMinPage;
      prevRowsLengthRef.current = combinedRows.length;

      // --- Fokus baris yang baru disimpan (add/edit) BERDASARKAN ID ---
      // Window yang dirakit di onSuccess memuat baris baru; cari index-nya di
      // sini lalu scroll+select. Pakai idx 1 (kolom data pertama) sehingga
      // TIDAK kena THRESHOLD_ROWS handleScroll -> window tidak bergeser ->
      // fokus tidak meleset. `return` mencegah cabang else men-scroll ke row 0
      // (yang memicu pergeseran window).
      if (pendingFocusIdRef.current != null) {
        const fid = pendingFocusIdRef.current;
        pendingFocusIdRef.current = null;
        const fidx = combinedRows.findIndex(
          (r) => String(r.id) === String(fid)
        );
        if (fidx >= 0) {
          selectedRowRef.current = fidx;
          setSelectedRow(fidx);
          setTimeout(() => {
            gridRef.current?.scrollToCell?.({ rowIdx: fidx, idx: 1 });
            gridRef.current?.selectCell?.({ rowIdx: fidx, idx: 1 });
          }, 50);
        }
        return;
      }

      if (jumpToFirstRef.current) {
        // Ctrl+Home — selalu idx 0
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
    } else {
      // Window kosong = tidak ada baris sama sekali. Tanpa ini `rows` menyimpan
      // hasil query sebelumnya.
      setRows((prev) => (prev.length > 0 ? [] : prev));
      selectedRowRef.current = 0;
      setSelectedRow(0);
      isPageTransitionRef.current = false;
      pendingScrollAdjustment.current = 0;
    }
  }, [visiblePages, pageDataCache]);

  // 4. Kompensasi scroll setelah window bergeser
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
        restoreGridCellFocus();
      }
      reanchorFromKeyboardRef.current = false;
    }
  }, [rows]);

  useEffect(() => {
    if (rows.length > 0 && selectedRow !== null) {
      const selectedRowData = rows[selectedRow];
      if (selectedRowData?.id !== lastDispatchedId.current) {
        dispatch(setHeaderData(selectedRowData));
        lastDispatchedId.current = selectedRowData?.id;
      }
      headerClearedRef.current = false;
      return;
    }

    // Grid master-detail: kalau header benar-benar kosong (bukan sekadar sedang
    // memuat), detail harus ikut kosong — kalau tidak, detail bukti sebelumnya
    // tetap tampil di bawah grid yang sudah tidak punya baris.
    const sedangMuat =
      isLoadingData || isFetching || isTransitioning || shouldBulkFetch;
    if (rows.length === 0 && !sedangMuat && !headerClearedRef.current) {
      // Pakai flag sendiri, bukan `lastDispatchedId !== null`: headerData di
      // redux bisa masih terisi dari kunjungan sebelumnya walau komponen ini
      // baru mount (lastDispatchedId masih null), dan detail ikut ketinggalan.
      headerClearedRef.current = true;
      lastDispatchedId.current = null;
      dispatch(setHeaderData({}));
    }
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
    const filterHandler = (e: any) => {
      const keterangan = e.detail;

      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, keterangan },
        page: 1
      }));
      setRows([]);
      setCurrentPage(1);
      resetBufferingCache();
    };

    const printHandler = () => {
      handleReport();
    };

    window.addEventListener('AI_FILTER_Comodity', filterHandler);
    window.addEventListener('AI_PRINT', printHandler);

    return () => {
      window.removeEventListener('AI_FILTER_Comodity', filterHandler);
      window.removeEventListener('AI_PRINT', printHandler);
    };
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

    document.addEventListener('keydown', preventScrollOnSpace);
    return () => {
      document.removeEventListener('keydown', preventScrollOnSpace);
    };
  }, []);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(event.target as Node)
    ) {
      setContextMenu(null);
    }
  };

  useEffect(() => {
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const headerCells = document.querySelectorAll('.rdg-header-row .rdg-cell');
    headerCells.forEach((cell) => {
      cell.setAttribute('tabindex', '-1');
    });
  }, []);

  useEffect(() => {
    if (gridRef.current && dataGridKey) {
      setTimeout(() => {
        gridRef.current?.selectCell({ rowIdx: 0, idx: 1 });
        setIsFirstLoad(false);
      }, 0);
    }
  }, [dataGridKey]);

  // --- Reset Flag Transisi saat selesai
  useEffect(() => {
    if (!isTransitioning && !isFetching) {
      setTimeout(() => {
        hasAdjustedScrollRef.current = false;
      }, 200);
    }
  }, [isTransitioning, isFetching]);

  useEffect(() => {
    const rowData = rows[selectedRow];
    if (rowData && mode !== 'add') {
      forms.setValue('nobukti', rowData.nobukti);
      forms.setValue('tglbukti', rowData.tglbukti ?? '');
      forms.setValue('keterangan', rowData.keterangan ?? '');
      forms.setValue('bank_id', rowData.bank_id ?? null);
      forms.setValue('bank_nama', rowData.bank_nama ?? '');
      forms.setValue('pengeluaran_nobukti', rowData.pengeluaran_nobukti ?? '');
      forms.setValue('coakaskeluar', rowData.coakaskeluar ?? '');
      forms.setValue('relasi_id', rowData.relasi_id ?? null);
      forms.setValue('relasi_nama', rowData.relasi_nama ?? '');
      forms.setValue('alatbayar_id', rowData.alatbayar_id ?? null);
      forms.setValue('alatbayar_nama', rowData.alatbayar_nama ?? '');
      // Saat form pertama kali di-render
      forms.setValue('details', []); // Menyiapkan details sebagai array kosong jika belum ada
    } else if (rows.length === 0 && mode !== 'add') {
      // Grid kosong: buang sisa nilai baris terakhir supaya tidak ada bukti
      // "hantu" yang menempel di form.
      forms.setValue('nobukti', '');
      forms.setValue('keterangan', '');
      forms.setValue('bank_id', null);
      forms.setValue('bank_nama', '');
      forms.setValue('pengeluaran_nobukti', '');
      forms.setValue('coakaskeluar', '');
      forms.setValue('relasi_id', null);
      forms.setValue('relasi_nama', '');
      forms.setValue('alatbayar_id', null);
      forms.setValue('alatbayar_nama', '');
      forms.setValue('details', []);
      forms.setValue('tglbukti', formatDateToDDMMYYYY(new Date()));
    } else {
      const currentDate = new Date(); // Dapatkan tanggal sekarang
      forms.setValue('tglbukti', formatDateToDDMMYYYY(currentDate));
    }
  }, [forms, selectedRow, rows, mode]);

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

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [forms]);

  useEffect(() => {
    return () => {
      debouncedFilterUpdate.cancel();
    };
  }, []);

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
              userId={user.id}
              gridName="GridKasGantungHeader"
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
          headerRowHeight={HEADER_ROW_HEIGHT}
          rowHeight={ROW_HEIGHT}
          className={`${isDark ? 'rdg-dark' : 'rdg-light'} fill-grid`}
          // WAJIB false. Dengan virtualization aktif, RDG hanya me-render baris
          // di viewport (+4 overscan) -- begitu sel aktif ter-scroll keluar
          // layar elemennya ter-unmount, DOM focus jatuh ke <body>, dan
          // Arrow/PageUp/PageDown tidak lagi sampai ke grid. Dengan false, sel
          // aktif tetap ter-mount walau tidak terlihat, sehingga tombol
          // navigasi langsung menarik pandangan kembali ke sel yang ter-select.
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
            module="KAS-GANTUNG"
            onAdd={handleAdd}
            checkedRows={checkedRows}
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
            rowsLength={rows.length}
            totalItems={allData ? allData.pagination.totalItems : 0}
            customActions={[
              {
                label: 'Print',
                icon: <FaPrint />,
                onClick: () => handleReport(),
                className: 'bg-cyan-500 hover:bg-cyan-700'
              },
              {
                label: 'Export',
                icon: <FaFileExport />,
                onClick: () => handleExportExcel(),
                className: 'bg-green-600 hover:bg-green-700'
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
                    user.id,
                    'GridKasGantungHeader',
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
      <FormKasGantung
        key={addFormKey}
        popOver={popOver}
        handleClose={handleClose}
        setPopOver={setPopOver}
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

export default GridKasGantungHeader;
