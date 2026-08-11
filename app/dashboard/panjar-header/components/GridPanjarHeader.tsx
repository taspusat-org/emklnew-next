'use client';

import Image from 'next/image';
import { debounce } from 'lodash';
import 'react-data-grid/lib/styles.scss';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import IcClose from '@/public/image/x.svg';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import { api2 } from '@/lib/utils/AxiosInstance';
import { Checkbox } from '@/components/ui/checkbox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAlert } from '@/lib/store/client/useAlert';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { useQueryClient } from 'react-query';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { useFormError } from '@/lib/hooks/formErrorContext';
import FilterInput from '@/components/custom-ui/FilterInput';
import ActionButton from '@/components/custom-ui/ActionButton';
import { setHeaderData } from '@/lib/store/headerSlice/headerSlice';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  FaFileExport,
  FaPrint,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaTimes
} from 'react-icons/fa';
import {
  clearOpenName,
  setClearLookup
} from '@/lib/store/lookupSlice/lookupSlice';
import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import {
  PanjarHeader,
  filterPanjarHeader
} from '@/lib/types/panjarheader.type';
import DataGrid, {
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import {
  cancelPreviousRequest,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import {
  panjarHeaderInput,
  panjarHeaderSchema
} from '@/lib/validations/panjarheader.validation';
import FormPanjarHeader from './FormPanjarHeader';
import {
  useCreatePanjarHeader,
  useDeletePanjarHeader,
  useGetAllPanjarHeader,
  useUpdatePanjarHeader
} from '@/lib/server/usePanjarheader';
import {
  checkValidationPanjarHeaderFn,
  getAllPanjarHeaderFn
} from '@/lib/apis/panjarheader.api';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import {
  generatePanjarHeaderExportFn,
  generatePanjarHeaderReportFn
} from '@/lib/apis/report.api';
import { useReportPdfContext } from '@/hooks/ReportPdfProvider';
import { useTheme } from 'next-themes';
import { clearOnReload } from '@/lib/store/filterSlice/filterSlice';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface Filter {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  filters: typeof filterPanjarHeader;
}

const GridPanjarHeader = () => {
  const { alert } = useAlert();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { clearError } = useFormError();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const { generateReport, generateExport } = useReportPdfContext();
  const { user } = useSelector((state: RootState) => state.auth);
  // `committed` = filter yang SUDAH di-Reload user (FilterGrid memakai pola
  // pending -> commitFilter). Grid tidak pernah membaca `pending`, jadi
  // mengetik tanggal / memilih jenis orderan tidak memicu fetch sampai Reload.
  const { committed, onReload } = useSelector(
    (state: RootState) => state.filter
  );
  const gridRef = useRef<DataGridHandle>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // AbortController untuk cancel request
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [rows, setRows] = useState<PanjarHeader[]>([]);
  const [mode, setMode] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [dataGridKey, setDataGridKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [popOver, setPopOver] = useState<boolean>(false);
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [isFilteringRows, setIsFilteringRows] = useState(false);
  const [isFetchingManually, setIsFetchingManually] = useState(false);
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [columnsWidth, setColumnsWidth] = useState<{ [key: string]: number }>(
    {}
  );
  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: 50,
    search: '',
    sortBy: 'nobukti',
    sortDirection: 'asc',
    filters: {
      ...filterPanjarHeader,
      tglDari: committed.tglDari,
      tglSampai: committed.tglSampai,
      jenisOrderan: committed.jenisOrderan
    }
  });
  const [prevFilters, setPrevFilters] = useState<Filter>(filters);

  const WINDOW_SIZE = 5;
  const STREAM_BUFFER_SIZE = 5;
  const ROW_HEIGHT = 30;

  const [shouldBulkFetch, setShouldBulkFetch] = useState(true);
  const [bulkStartPage, setBulkStartPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5]);
  const minVisiblePage = useMemo(
    () => Math.min(...visiblePages),
    [visiblePages]
  );
  const [pageDataCache, setPageDataCache] = useState<
    Map<number, PanjarHeader[]>
  >(new Map());

  const streamBufferRef = useRef<Map<number, PanjarHeader[]>>(new Map());
  const prefetchingPagesRef = useRef<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);
  const pendingScrollAdjustment = useRef<number>(0);
  const hasAdjustedScrollRef = useRef<boolean>(false);
  const isPageTransitionRef = useRef(false);
  const pendingSelectIdxRef = useRef<number>(1);
  const selectedRowRef = useRef<number>(0);
  const lastDispatchedId = useRef<string | null>(null);
  const pendingInitialFocusRef = useRef(true);
  // MASTER-DETAIL: id header yang BENAR-BENAR dipilih user (klik, panah, atau
  // selectCell programatik). Ini acuan grid detail — BUKAN `selectedRow`, yang
  // ikut digeser tiap window lazy loading bergeser sehingga tidak bisa dipercaya
  // sebagai penunjuk "baris pilihan user". Pola sama dengan GridPengeluaranHeader.
  const selectedHeaderIdRef = useRef<string | null>(null);
  // ID baris yang baru disimpan (add/edit). Dipakai Row Combiner untuk
  // memfokuskan baris itu BERDASARKAN ID (bukan index) setelah data window
  // settle — index bisa meleset karena window pagination ikut bergeser saat
  // re-render.
  const pendingFocusIdRef = useRef<string | null>(null);
  // Diset true selama window settle pasca-mutasi (add/edit) untuk memblokir
  // data-effect memproses ulang hasil refetch (yang menimpa fokus ke baris 0).
  // Ref (bukan state) supaya reset-nya TIDAK memicu ulang effect.
  const suppressRefetchRef = useRef(false);

  useEffect(() => {
    selectedRowRef.current = selectedRow;
  }, [selectedRow]);

  // Saat window pagination bergeser, index tiap baris di `rows` ikut bergeser
  // sebanyak filters.limit. Geser juga selectedRowRef supaya baris DATA yang
  // sama tetap ter-highlight; commit ke state ditunda ke Row Combiner agar
  // selectedRow & rows berubah di render yang sama (highlight tidak berkedip).
  const shiftSelectionForWindow = (deltaRows: number) => {
    selectedRowRef.current = Math.max(0, selectedRowRef.current + deltaRows);
  };

  const currentMinPage =
    visiblePages.length > 0 ? Math.min(...visiblePages) : 1;
  const startRow = (currentMinPage - 1) * filters.limit + 1;

  const effectiveLimit = shouldBulkFetch
    ? filters.limit * WINDOW_SIZE
    : filters.limit;

  const { data: allPanjarHeader, isLoading: isLoadingPanjarHeader } =
    useGetAllPanjarHeader(
      {
        ...filters,
        page: shouldBulkFetch ? bulkStartPage : currentPage,
        limit: effectiveLimit
      },
      abortControllerRef.current?.signal
    );

  // bulkPage = nomor window (1 = halaman 1..WINDOW_SIZE, 2 = berikutnya, dst).
  const resetBufferingCache = (bulkPage = 1) => {
    const logicalStartPage = (bulkPage - 1) * WINDOW_SIZE + 1;
    setShouldBulkFetch(true);
    setBulkStartPage(bulkPage);
    setPageDataCache(new Map());
    setVisiblePages(
      Array.from({ length: WINDOW_SIZE }, (_, i) => logicalStartPage + i)
    );
    setIsFetching(false);
    setIsTransitioning(false);
    streamBufferRef.current = new Map();
    prefetchingPagesRef.current = new Set();
  };

  // Dipanggil saat DATASET-nya yang berganti (search / filter kolom / sort /
  // periode). Beda dengan pergeseran window lazy loading: di sini baris pilihan
  // lama memang sudah tidak relevan, jadi acuan id dilepas supaya baris pertama
  // hasil query baru yang dipakai grid detail.
  const resetSelectionForNewDataset = () => {
    selectedHeaderIdRef.current = null;
    selectedRowRef.current = 0;
    setSelectedRow(0);
  };

  const { mutateAsync: createPanjarHeader, isLoading: isLoadingCreate } =
    useCreatePanjarHeader();
  const { mutateAsync: updatePanjarHeader, isLoading: isLoadingUpdate } =
    useUpdatePanjarHeader();
  const { mutateAsync: deletePanjarHeader, isLoading: isLoadingDelete } =
    useDeletePanjarHeader();

  const forms = useForm<panjarHeaderInput>({
    resolver: mode === 'delete' ? undefined : zodResolver(panjarHeaderSchema),
    mode: 'onSubmit',
    defaultValues: {
      nobukti: '',
      details: []
    }
  });

  const {
    setFocus,
    reset,
    formState: { isSubmitSuccessful }
  } = forms;

  const debouncedFilterUpdate = useRef(
    debounce((colKey: string, value: string) => {
      setInputValue('');
      setFilters((prev) => ({
        ...prev,
        search: '',
        filters: { ...prev.filters, [colKey]: value },
        page: 1
      }));
      setCheckedRows(new Set());
      setIsAllSelected(false);
      setRows([]);
      setCurrentPage(1);
      resetSelectionForNewDataset();
      resetBufferingCache();
    }, 300)
  ).current;

  const handleFilterInputChange = useCallback(
    (colKey: string, value: string) => {
      cancelPreviousRequest(abortControllerRef);
      debouncedFilterUpdate(colKey, value);
    },
    []
  );

  const handleClearFilter = useCallback((colKey: string) => {
    cancelPreviousRequest(abortControllerRef);
    debouncedFilterUpdate.cancel(); // Cancel pending updates
    setFilters((prev) => ({
      ...prev,
      filters: { ...prev.filters, [colKey]: '' },
      page: 1
    }));
    setCheckedRows(new Set());
    setIsAllSelected(false);
    setRows([]);
    setCurrentPage(1);
    resetSelectionForNewDataset();
    resetBufferingCache();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setInputValue(searchValue);
    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      filters: {
        ...filterPanjarHeader,
        tglDari: prev.filters.tglDari,
        tglSampai: prev.filters.tglSampai,
        jenisOrderan: prev.filters.jenisOrderan
      },
      search: searchValue,
      page: 1
    }));
    setCheckedRows(new Set());
    setIsAllSelected(false);
    setTimeout(() => {
      gridRef?.current?.selectCell({ rowIdx: 0, idx: 1 });
    }, 100);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 200);

    setCurrentPage(1);
    setRows([]);
    resetSelectionForNewDataset();
    // Hasil pencarian = himpunan baris yang berbeda, jadi window & buffer lama
    // tidak lagi valid.
    resetBufferingCache();
  };

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
    setCurrentPage(1);
    setRows([]);
    resetSelectionForNewDataset();
    resetBufferingCache();
  };

  const handleSort = (column: string) => {
    cancelPreviousRequest(abortControllerRef);
    const originalIndex = columns.findIndex((col) => col.key === column);

    // hitung index tampilan berdasar columnsOrder; jika belum ada reorder
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
    }, 250);
    setCurrentPage(1);
    setRows([]);
    resetSelectionForNewDataset();
    // Sort berubah -> urutan seluruh hasil berubah, halaman lama tidak valid.
    resetBufferingCache();
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

  const columns = useMemo((): Column<PanjarHeader>[] => {
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
                  filters: {
                    ...filterPanjarHeader,
                    tglDari: filters.filters.tglDari,
                    tglSampai: filters.filters.tglSampai,
                    jenisOrderan: filters.filters.jenisOrderan
                  }
                }),
                  setInputValue('');
                setRows([]);
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
          // Nomor ABSOLUT (mengikuti posisi baris di seluruh dataset), bukan
          // index dalam window — kalau tidak, nomor akan mengulang dari 1 tiap
          // kali window bergeser.
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
        renderCell: ({ row }: { row: PanjarHeader }) => (
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
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NO BUKTI"
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
        key: 'tglbukti',
        name: 'tgl bukti',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="TGL BUKTI"
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
                TGL BUKTI
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
        key: 'jenisorder_nama',
        name: 'jenis order',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: (column: any) => (
          <div
            title="JENIS ORDERAN"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('jenisorder_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'jenisorder_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                JENIS ORDERAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'jenisorder_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'jenisorder_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="jenisorder_nama"
                value={filters.filters.jenisorder_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('jenisorder_text', value)
                }
                onClear={() => handleClearFilter('jenisorder_text')}
                inputRef={(el) => {
                  inputColRefs.current['jenisorder_nama'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.jenisorder_text || '';
          const cellValue = props.row.jenisorder_nama || '';
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
        key: 'biayaemkl_nama',
        name: 'biaya emkl',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 250,
        renderHeaderCell: (column: any) => (
          <div
            title="BIAYA EMKL"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('biayaemkl_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'biayaemkl_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                BIAYA EMKL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'biayaemkl_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'biayaemkl_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="biayaemkl_nama"
                value={filters.filters.biayaemkl_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('biayaemkl_text', value)
                }
                onClear={() => handleClearFilter('biayaemkl_text')}
                inputRef={(el) => {
                  inputColRefs.current['biayaemkl_nama'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.biayaemkl_text || '';
          const cellValue = props.row.biayaemkl_nama || '';
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
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="KETERANGAN"
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
        key: 'modifiedby',
        name: 'modified by',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="MODIFIED BY"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
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
        name: 'created at',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="CREATED AT"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
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
                CREATED AT
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
        name: 'updated at',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="UPDATED AT"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
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
                UPDATED AT
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
  }, [filters, rows, filters.filters, checkedRows, minVisiblePage]);

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

  const handleAdd = async () => {
    setPopOver(true);
    setMode('add');
    forms.reset();
  };

  const handleEdit = async () => {
    if (selectedRow !== null) {
      const rowData = rows[selectedRow];
      if (!rowData) return;

      const result = await checkValidationPanjarHeaderFn({
        aksi: 'EDIT',
        value: rowData.id
      });

      if (result.data.status == 'failed') {
        alert({
          title: result.data.message,
          variant: 'danger',
          submitText: 'OK'
        });
      } else {
        setPopOver(true);
        setMode('edit');
      }
    }
  };

  const handleMultipleDelete = async (idsToDelete: string[]) => {
    try {
      for (const id of idsToDelete) {
        // Hapus data satu per satu
        await deletePanjarHeader(id);
      }

      setRows(
        (
          prevRows // Update state setelah semua data berhasil dihapus
        ) => prevRows.filter((row) => !idsToDelete.includes(row.id))
      );
      setCheckedRows(new Set()); // Reset checked rows
      setIsAllSelected(false);

      // Header yang sedang dipakai grid detail ikut terhapus -> lepas acuannya
      // supaya effect master-detail memilih ulang dari baris yang tersisa
      // (kalau tidak, detail bertahan menampilkan panjar yang sudah tidak ada).
      if (
        selectedHeaderIdRef.current &&
        idsToDelete.some((id) => String(id) === selectedHeaderIdRef.current)
      ) {
        selectedHeaderIdRef.current = null;
      }

      // Update selected row
      if (selectedRow >= rows.length - idsToDelete.length) {
        setSelectedRow(Math.max(0, rows.length - idsToDelete.length - 1));
      }

      setTimeout(() => {
        // Focus grid
        gridRef?.current?.selectCell({
          rowIdx: Math.max(0, selectedRow - 1),
          idx: 1
        });
      }, 100);

      alert({
        title: 'Berhasil!',
        variant: 'success',
        submitText: 'OK'
      });
    } catch (error) {
      console.error('Error in handleMultipleDelete:', error);
      alert({
        title: 'Error!',
        variant: 'danger',
        submitText: 'OK'
      });
    }
  };

  const handleDelete = async () => {
    try {
      dispatch(setProcessing());

      if (checkedRows.size === 0) {
        if (selectedRow !== null) {
          const rowData = rows[selectedRow];
          if (!rowData) return;

          const result = await checkValidationPanjarHeaderFn({
            aksi: 'DELETE',
            value: rowData.id
          });

          if (result.data.status == 'failed') {
            alert({
              title: result.data.message,
              variant: 'danger',
              submitText: 'OK'
            });
          } else {
            setMode('delete');
            setPopOver(true);
          }
        }
      } else {
        const checkedRowsArray = Array.from(checkedRows);
        const validationPromises = checkedRowsArray.map(async (id) => {
          try {
            const response = await checkValidationPanjarHeaderFn({
              aksi: 'DELETE',
              value: id
            });
            return {
              id,
              canDelete: response.data.status === 'success',
              message: response.data?.message
            };
          } catch (error) {
            return { id, canDelete: false, message: 'Error validating data' };
          }
        });

        const validationResults = await Promise.all(validationPromises);
        const cannotDeleteItems = validationResults.filter(
          (result) => !result.canDelete
        );

        if (cannotDeleteItems.length > 0) {
          alert({
            title: 'Beberapa data tidak dapat dihapus!',
            variant: 'danger',
            submitText: 'OK'
          });
          return;
        }

        try {
          await alert({
            title: 'Apakah anda yakin ingin menghapus data ini ?',
            variant: 'danger',
            submitText: 'YA',
            catchOnCancel: true,
            cancelText: 'TIDAK'
          });

          await handleMultipleDelete(checkedRowsArray);
          dispatch(setProcessed());
        } catch (alertError) {
          dispatch(setProcessed());
          return;
        }
      }
    } catch (error) {
      console.error('Error in handleDelete:', error);
      alert({
        title: 'Error!',
        variant: 'danger',
        submitText: 'OK'
      });
    } finally {
      dispatch(setProcessed());
    }
  };

  const handleView = () => {
    if (selectedRow !== null) {
      setMode('view');
      setPopOver(true);
    }
  };

  const handleClose = () => {
    setPopOver(false);
    setMode('');
    clearError();
    forms.reset();
  };

  const handleExportExcel = async (exportFilters?: any) => {
    const { page, limit, ...filtersWithoutLimit } = filters;
    const activeFilters = exportFilters ?? filtersWithoutLimit;

    await generateExport({
      label: 'Export Panjar',
      payload: {
        search: activeFilters.search,
        filters: activeFilters.filters,
        sortBy: activeFilters.sortBy,
        sortDirection: activeFilters.sortDirection
      },
      apiFn: generatePanjarHeaderExportFn
    });
  };

  // Cetak laporan dijalankan di BACKEND (background job + socket). Frontend
  // hanya mengirim id baris yang dicentang dan nama template .mrt-nya. Progres
  // render muncul di toast; PDF diambil setelah selesai.
  const handleReport = async () => {
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
    const { page, limit, ...filtersWithoutLimit } = filters;

    await generateReport({
      label: 'Panjar',
      payload: {
        mrtName: 'LaporanPanjar.mrt',
        id: rowId,
        judullaporan: 'PT. TRANSPORINDO AGUNG SEJAHTERA'
      },
      apiFn: generatePanjarHeaderReportFn,
      // Tombol Export di toolbar viewer — memakai filter yang sama dengan
      // laporan yang sedang dibuka (sama seperti di halaman /reports/*).
      onExport: () => handleExportExcel(filtersWithoutLimit)
    });
  };

  /**
   * KONTRAK BACKEND (sama seperti groupbiayaextra & alatbayar): endpoint
   * create/update mengembalikan { itemIndex (index DALAM window), fetchedPages,
   * pagedData, pageNumber } dan menyimpan window-nya di redis per halaman
   * (`panjarheader-page-<n>`), jadi window tidak perlu dirakit ulang di sini.
   */
  const onSuccess = async (
    indexOnPage: number,
    fetchedPages: number[],
    pagedData: Record<string, PanjarHeader[]>,
    pageNumber: number,
    keepOpenModal = false,
    focusId: string | null = null
  ) => {
    dispatch(setClearLookup(true));
    clearError();
    setIsFetchingManually(true);
    // Tandai baris baru agar Row Combiner memfokuskannya by-id setelah data
    // window settle. Lebih andal daripada selectCell by-index yang bisa meleset
    // saat window bergeser.
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
        // Blokir data-effect memproses ulang hasil refetch pasca-mutasi selama
        // window settle, agar fokus by-id tidak tertimpa.
        suppressRefetchRef.current = true;

        const response = await api2.get(
          `/redis/get/panjarheader-page-${pageNumber}`
        );
        const loadedRows: PanjarHeader[] = Array.isArray(response.data)
          ? response.data
          : [];

        // Fokus BERDASARKAN ID baris, bukan indexOnPage dari backend. Setelah
        // edit, posisi baris di window yang dimuat bisa berbeda dari hitungan
        // index backend sehingga fokus meleset. Fallback ke indexOnPage bila id
        // tak ketemu.
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
        // Acuan master-detail ikut pindah ke baris yang baru disimpan.
        const focusedRowId = loadedRows[targetIndex]?.id ?? focusId;
        if (focusedRowId != null) {
          selectedHeaderIdRef.current = String(focusedRowId);
        }
        setPageDataCache(
          new Map(
            Object.entries(pagedData).map(([key, value]) => [
              Number(key),
              value as PanjarHeader[]
            ])
          )
        );
        setCurrentPage(pageNumber);

        const updatedBuffer = new Map(streamBufferRef.current);
        Object.entries(pagedData).forEach(([key, value]) => {
          updatedBuffer.set(Number(key), value as PanjarHeader[]);
        });
        streamBufferRef.current = updatedBuffer;

        setTimeout(() => {
          gridRef?.current?.selectCell({
            rowIdx: targetIndex,
            idx: 1
          });
        }, 200);

        // Penahan fokus pasca-mutasi. setCurrentPage(pageNumber) memicu refetch
        // yang menjalankan Row Combiner lagi; karena pendingFocusIdRef sudah
        // dikonsumsi pada run pertama, cabang else-nya men-scroll ke baris 0
        // (gejala "edit selalu balik ke baris 1"). Re-assert id fokus beberapa
        // kali selama window settle lalu bersihkan.
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

  const onSubmit = async (values: panjarHeaderInput, keepOpenModal = false) => {
    clearError();
    const selectedRowId = rows[selectedRow]?.id;
    try {
      dispatch(setProcessing());
      if (mode === 'delete') {
        if (selectedRowId) {
          await deletePanjarHeader(selectedRowId, {
            onSuccess: () => {
              setPopOver(false);

              // 1. Buang dari baris yang tampil
              setRows((prevRows) =>
                prevRows.filter((row) => row.id !== selectedRowId)
              );

              // 2. Buang dari pageDataCache (semua halaman)
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

              // 3. Buang dari streamBuffer
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

              // 4. Fokus baris BERIKUTNYA (by-id). Setelah baris dihapus, baris
              // tepat di bawahnya naik mengisi slot yang sama.
              const nextFocusRow =
                rows[selectedRow + 1] ?? rows[selectedRow - 1];
              if (nextFocusRow) {
                pendingFocusIdRef.current = String(nextFocusRow.id);
                // Acuan master-detail langsung pindah: id yang lama sudah tidak
                // ada di `rows`, dan tanpa ini detail bertahan menampilkan
                // panjar yang barusan dihapus.
                selectedHeaderIdRef.current = String(nextFocusRow.id);
              } else {
                setSelectedRow(0);
                selectedRowRef.current = 0;
                selectedHeaderIdRef.current = null;
              }
            }
          });
        }
        return;
      }

      if (mode === 'add') {
        await createPanjarHeader(
          {
            ...values,
            // id detail 0 = penanda baris BARU untuk backend. Dikirim sebagai
            // angka, dan skema zod (FE & BE) memang menerima string|number.
            details: values.details.map((detail: any) => ({
              ...detail,
              id: 0
            })),
            ...filters // Kirim filter ke body/payload
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
        await updatePanjarHeader(
          {
            id: selectedRowId,
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
                data.updatedItem?.id ?? selectedRowId ?? null
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
    }
  };

  const onColumnResize = (index: number, width: number) => {
    const columnKey = columns[columnsOrder[index]].key; // 1) Dapatkan key kolom yang di-resize

    const newWidthMap = { ...columnsWidth, [columnKey]: width }; // 2) Update state width seketika (biar kolom langsung responsif)
    setColumnsWidth(newWidthMap);

    if (resizeDebounceTimeout.current) {
      // 3) Bersihkan timeout sebelumnya agar tidak menumpuk
      clearTimeout(resizeDebounceTimeout.current);
    }

    // 4) Set ulang timer: hanya ketika 300ms sejak resize terakhir berlalu,
    //    saveGridConfig akan dipanggil
    resizeDebounceTimeout.current = setTimeout(() => {
      saveGridConfig(
        user.id,
        'GridPanjarHeader',
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

      saveGridConfig(user.id, 'GridPanjarHeader', [...newOrder], columnsWidth);
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

  document.querySelectorAll('.column-headers').forEach((element) => {
    element.classList.remove('c1kqdw7y7-0-0-beta-47');
  });

  // MASTER-DETAIL: ini SATU-SATUNYA tempat id header terpilih dicatat.
  // Dipanggil onCellClick (klik mouse) dan onSelectedCellChange (panah keyboard
  // + selectCell programatik). Pergeseran window saat scroll TIDAK lewat sini —
  // dia cuma menggeser `selectedRow` — sehingga pilihan user tidak ikut bergeser
  // dan grid detail tetap menampilkan panjar yang sama.
  //
  // setHeaderData sengaja TIDAK di-dispatch di sini: satu-satunya yang
  // mendispatch adalah effect di bawah, dengan id (bukan index) sebagai acuan.
  function handleCellClick(
    args: { row: PanjarHeader },
    fromMouseClick = false
  ) {
    const clickedRow = args.row;
    // args.row bisa undefined saat grid sedang re-render di tengah pergeseran
    // window (selectCell programatik menembak index yang barisnya sudah hilang).
    if (!clickedRow) return;

    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex === -1) return;

    setSelectedRow(rowIndex);

    // Klik mouse selalu dianggap pilihan sadar user, jadi tidak pernah diabaikan
    // walau kebetulan jatuh saat window sedang bergeser/fetch. Sebaliknya
    // onSelectedCellChange bisa terpicu oleh grid sendiri saat baris di bawah
    // sel aktif bergeser — di fase itu id lama yang dipertahankan.
    if (fromMouseClick || (!isTransitioning && !isFetching)) {
      selectedHeaderIdRef.current = String(clickedRow.id);
    }
  }

  function getRowClass(row: PanjarHeader) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: PanjarHeader) {
    return row.id;
  }

  // Tarik halaman-halaman berikutnya diam-diam ke streamBuffer. Saat window
  // nanti bergeser ke salah satunya, datanya sudah ada -> tidak ada spinner &
  // tidak ada network latency di jalur scroll.
  const prefetchPages = useCallback(
    async (
      pagesToFetch: number[],
      existingCache?: Map<number, PanjarHeader[]>,
      knownTotalPages?: number
    ) => {
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
            const data = await getAllPanjarHeaderFn({
              ...filters,
              page: pageNum,
              limit: filters.limit
            });

            if (data?.data && data.data.length > 0) {
              streamBufferRef.current = new Map(streamBufferRef.current);
              streamBufferRef.current.set(pageNum, data.data);
            }
          } catch (err) {
            // Prefetch gagal tidak perlu diberitahukan ke user.
            console.warn(`[StreamBuffer] Prefetch page ${pageNum} gagal:`, err);
          } finally {
            prefetchingPagesRef.current.delete(pageNum);
          }
        })
      );
    },
    [filters, totalPages, pageDataCache]
  );

  async function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (
      isLoadingPanjarHeader ||
      rows.length === 0 ||
      isTransitioning ||
      isFetching
    )
      return;

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
          setPageDataCache((prev) => new Map(prev).set(nextPage, bufferedData));

          streamBufferRef.current = new Map(streamBufferRef.current);
          streamBufferRef.current.delete(nextPage);

          isPageTransitionRef.current = true;
          pendingScrollAdjustment.current = -(filters.limit * ROW_HEIGHT);
          shiftSelectionForWindow(-filters.limit);

          setVisiblePages((prevVisible) => {
            const removedPage = prevVisible[0];
            setPageDataCache((prev) => {
              const updated = new Map(prev);
              updated.delete(removedPage);
              return updated;
            });
            return [...prevVisible.slice(1), nextPage];
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
          setPageDataCache((prev) => new Map(prev).set(prevPage, bufferedData));

          streamBufferRef.current = new Map(streamBufferRef.current);
          streamBufferRef.current.delete(prevPage);

          isPageTransitionRef.current = true;
          pendingScrollAdjustment.current = filters.limit * ROW_HEIGHT;
          shiftSelectionForWindow(filters.limit);

          setVisiblePages((prevVisible) => {
            const removedPage = prevVisible[prevVisible.length - 1];
            setPageDataCache((prev) => {
              const updated = new Map(prev);
              updated.delete(removedPage);
              return updated;
            });
            return [prevPage, ...prevVisible.slice(0, WINDOW_SIZE - 1)];
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
          // Reset dulu supaya setCurrentPage(prevPage) pasti memicu refetch
          // walau nilainya sama dengan currentPage saat ini.
          setCurrentPage(0);
          setTimeout(() => setCurrentPage(prevPage), 0);
        }
      }
    }
  }

  async function handleKeyDown(
    args: CellKeyDownArgs<PanjarHeader>,
    event: React.KeyboardEvent
  ) {
    const visibleRowCount = 10;
    const firstDataRowIndex = 0;
    const selectedRowId = rows[selectedRow]?.id;

    if (event.key === 'ArrowDown') {
      setSelectedRow((prev) => {
        if (prev === null) return firstDataRowIndex;
        const nextRow = Math.min(prev + 1, rows.length - 1);
        return nextRow;
      });
    } else if (event.key === 'ArrowUp') {
      setSelectedRow((prev) => {
        if (prev === null) return firstDataRowIndex;
        const newRow = Math.max(prev - 1, firstDataRowIndex);
        return newRow;
      });
    } else if (event.key === 'ArrowRight') {
      setSelectedCol((prev) => {
        return Math.min(prev + 1, columns.length - 1);
      });
    } else if (event.key === 'ArrowLeft') {
      setSelectedCol((prev) => {
        return Math.max(prev - 1, 0);
      });
    } else if (event.key === 'PageDown') {
      setSelectedRow((prev) => {
        if (prev === null) return firstDataRowIndex;

        const nextRow = Math.min(prev + visibleRowCount - 2, rows.length - 1);
        return nextRow;
      });
    } else if (event.key === 'PageUp') {
      setSelectedRow((prev) => {
        if (prev === null) return firstDataRowIndex;

        const newRow = Math.max(prev - visibleRowCount + 2, firstDataRowIndex);
        return newRow;
      });
    } else if (event.key === ' ') {
      // Handle spacebar keydown to toggle row selection
      if (selectedRowId !== undefined) {
        handleRowSelect(selectedRowId);
      }
    }
  }

  useEffect(() => {
    loadGridConfig(
      user.id,
      'GridPanjarHeader',
      columns,
      setColumnsOrder,
      setColumnsWidth
    );
  }, []);

  useEffect(() => {
    setIsFirstLoad(true);
  }, []);

  useEffect(() => {
    if (isFirstLoad && gridRef.current && rows.length > 0) {
      setSelectedRow(0);
      selectedRowRef.current = 0;
      gridRef.current.selectCell({ rowIdx: 0, idx: 1 });
      selectedHeaderIdRef.current = String(rows[0].id);
      dispatch(setHeaderData(rows[0]));
      lastDispatchedId.current = rows[0].id;
      setIsFirstLoad(false);
    }
  }, [rows, isFirstLoad]);

  // Reload dari FilterGrid: periode / jenis orderan berubah = dataset berbeda,
  // jadi filter kolom & window lama dibuang seluruhnya.
  useEffect(() => {
    if (!onReload) return;

    setFilters((prev) => ({
      ...prev,
      page: 1,
      filters: {
        ...filterPanjarHeader,
        tglDari: committed.tglDari,
        tglSampai: committed.tglSampai,
        jenisOrderan: committed.jenisOrderan
      }
    }));

    setCurrentPage(1);
    setCheckedRows(new Set());
    setIsAllSelected(false);
    setRows([]);
    resetSelectionForNewDataset();
    resetBufferingCache();

    pendingInitialFocusRef.current = true;

    // ✅ Reset onReload setelah selesai diproses
    dispatch(clearOnReload());
  }, [onReload]);

  // 1. Bulk Fetch — sekali ambil WINDOW_SIZE halaman, lalu dipecah ke cache.
  useEffect(() => {
    if (
      !shouldBulkFetch ||
      !allPanjarHeader ||
      isDataUpdated ||
      // Selama settle pasca-mutasi (add/edit), jangan biarkan hasil refetch
      // membangun ulang cache — kalau tidak, Row Combiner jalan lagi setelah
      // pendingFocusIdRef dikonsumsi & fokus loncat ke baris 1.
      suppressRefetchRef.current
    ) {
      return;
    }

    const bulkData = allPanjarHeader.data || [];
    if (bulkData.length === 0) {
      setShouldBulkFetch(false);
      setIsFirstLoad(false);
      setIsFetching(false);
      setRows([]);
      return;
    }

    const pageSize = filters.limit;
    const newCache = new Map<number, PanjarHeader[]>();
    const logicalStartPage = (bulkStartPage - 1) * WINDOW_SIZE + 1;

    for (let i = 0; i < WINDOW_SIZE; i++) {
      const pageData = bulkData.slice(i * pageSize, (i + 1) * pageSize);
      if (pageData.length > 0) newCache.set(logicalStartPage + i, pageData);
    }

    setPageDataCache(newCache);
    setVisiblePages(
      Array.from({ length: WINDOW_SIZE }, (_, i) => logicalStartPage + i)
    );

    const totalItems = allPanjarHeader.pagination?.totalItems || 0;
    // pagination.totalPages dari backend dihitung memakai limit bulk
    // (limit * WINDOW_SIZE), jadi TIDAK bisa dipakai langsung — hitung ulang
    // dengan limit per-halaman yang sebenarnya.
    const totalPgs = Math.ceil(totalItems / filters.limit) || 1;

    setTotalPages(totalPgs);
    setHasMore(bulkData.length === filters.limit * WINDOW_SIZE);
    setShouldBulkFetch(false);
    setIsFirstLoad(false);
    setIsFetching(false);
    setPrevFilters(filters);

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
  }, [
    allPanjarHeader,
    shouldBulkFetch,
    isDataUpdated,
    filters.limit,
    bulkStartPage
  ]);

  // 2. Pagination Fetch — hasil fetch satu halaman (buffer miss) masuk cache
  //    dan window digeser satu langkah.
  useEffect(() => {
    if (
      shouldBulkFetch ||
      isDataUpdated ||
      isFetchingManually ||
      suppressRefetchRef.current
    )
      return;
    if (!allPanjarHeader) return;
    // currentPage 0 = fase antara dari trik setCurrentPage(0) di handleScroll.
    if (currentPage < 1) return;

    const newRows = allPanjarHeader.data || [];

    setPageDataCache((prevCache) =>
      new Map(prevCache).set(currentPage, newRows)
    );

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

    if (allPanjarHeader.pagination?.totalPages) {
      setTotalPages(allPanjarHeader.pagination.totalPages);
    }

    setHasMore(newRows.length === filters.limit);
    setPrevFilters(filters);

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
  }, [
    allPanjarHeader,
    currentPage,
    filters,
    isDataUpdated,
    shouldBulkFetch,
    isFetchingManually
  ]);

  // 3. Row Combiner — gabungkan halaman yang sedang terlihat jadi `rows`.
  useEffect(() => {
    const combinedRows: PanjarHeader[] = [];
    visiblePages?.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (pageData) combinedRows.push(...pageData);
    });

    if (combinedRows.length === 0) return;

    setRows(combinedRows);

    // --- Fokus baris yang baru disimpan (add/edit) BERDASARKAN ID ---
    // `return` mencegah cabang lain men-scroll ke row 0 (yang memicu
    // pergeseran window lewat handleScroll).
    if (pendingFocusIdRef.current != null) {
      const fid = pendingFocusIdRef.current;
      pendingFocusIdRef.current = null;
      const fidx = combinedRows.findIndex((r) => String(r.id) === String(fid));
      if (fidx >= 0) {
        selectedRowRef.current = fidx;
        setSelectedRow(fidx);
        // Baris hasil add/edit = pilihan yang disengaja, jadi jadikan acuan
        // master-detail. Tanpa ini effect di bawah menarik pilihan balik ke id
        // lama sebelum selectCell sempat memperbaruinya.
        selectedHeaderIdRef.current = String(fid);
        setTimeout(() => {
          gridRef.current?.scrollToCell?.({ rowIdx: fidx, idx: 1 });
          gridRef.current?.selectCell?.({ rowIdx: fidx, idx: 1 });
        }, 50);
      }
      return;
    }

    if (isPageTransitionRef.current) {
      isPageTransitionRef.current = false;
      // Commit selectedRow yang sudah digeser BERSAMAAN dengan setRows, supaya
      // highlight tidak berkedip di satu frame.
      const targetRow = Math.min(
        Math.max(selectedRowRef.current, 0),
        combinedRows.length - 1
      );
      selectedRowRef.current = targetRow;
      setSelectedRow(targetRow);
    } else if (pendingInitialFocusRef.current) {
      pendingInitialFocusRef.current = false;
      selectedRowRef.current = 0;
      setSelectedRow(0);
      setTimeout(() => {
        gridRef.current?.scrollToCell?.({
          rowIdx: 0,
          idx: pendingSelectIdxRef.current
        });
        gridRef.current?.selectCell?.({
          rowIdx: 0,
          idx: pendingSelectIdxRef.current
        });
      }, 50);
    }
  }, [visiblePages, pageDataCache]);

  // Kompensasi scrollTop setelah window bergeser, supaya baris yang sedang
  // dilihat user tetap di posisi visual yang sama (tidak meloncat).
  useLayoutEffect(() => {
    if (pendingScrollAdjustment.current !== 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop += pendingScrollAdjustment.current;

      scrollPositionRef.current = container.scrollTop;
      lastScrollTopRef.current = container.scrollTop;
      hasAdjustedScrollRef.current = true;
      pendingScrollAdjustment.current = 0;
    }
  }, [rows]);

  // Baris terpilih = header yang dipakai grid detail di bawahnya.
  useEffect(() => {
    // Selama lazy loading masih bergerak, `rows` boleh kosong sesaat dan
    // `selectedRow` boleh menunjuk index yang barisnya belum/sudah tidak ada.
    // Semua itu keadaan SEMENTARA, bukan "user membatalkan pilihan".
    const sedangMuat =
      isLoadingPanjarHeader ||
      isFetching ||
      isTransitioning ||
      shouldBulkFetch ||
      isFetchingManually;

    if (rows.length === 0) {
      // Kosong sementara (ganti window, refetch) -> pertahankan pilihan lama,
      // supaya saat data balik masih ada acuan untuk memulihkannya dan grid
      // detail tidak sempat ikut kosong.
      if (sedangMuat) return;

      // Benar-benar tidak ada data (filter tidak ketemu / periode kosong).
      selectedHeaderIdRef.current = null;
      lastDispatchedId.current = null;
      dispatch(setHeaderData({}));
      return;
    }

    // ID yang menang, BUKAN index. `selectedRow` digeser sebanyak filters.limit
    // tiap kali window bergeser, jadi nilainya tidak bisa dipercaya sebagai
    // penunjuk "baris yang dipilih user". Id cuma dicatat di handleCellClick
    // (pemilihan yang disengaja), sehingga dia tetap menunjuk panjar yang sama
    // sepanjang user scroll.
    const idById = selectedHeaderIdRef.current;
    const idxById = idById
      ? rows.findIndex((r) => String(r.id) === String(idById))
      : -1;

    if (idxById >= 0) {
      if (idxById !== selectedRow) {
        // Barisnya masih di window tapi pindah index (window bergeser) ->
        // samakan lagi supaya highlight (getRowClass) menunjuk baris yang benar.
        selectedRowRef.current = idxById;
        setSelectedRow(idxById);
      }
      const rowById = rows[idxById];
      if (rowById.id !== lastDispatchedId.current) {
        dispatch(setHeaderData(rowById));
        lastDispatchedId.current = rowById.id;
      }
      return;
    }

    if (!idById) {
      // Belum pernah ada pilihan (load pertama / dataset baru) -> pakai index.
      const selectedRowData = rows[selectedRow] ?? rows[0];
      if (selectedRowData) {
        selectedHeaderIdRef.current = String(selectedRowData.id);
        if (selectedRowData.id !== lastDispatchedId.current) {
          dispatch(setHeaderData(selectedRowData));
          lastDispatchedId.current = selectedRowData.id;
        }
      }
      return;
    }

    // Ada pilihan, tapi halamannya sudah keluar dari window (user scroll jauh).
    // Sengaja TIDAK dispatch apa pun: headerData dibiarkan menunjuk panjar yang
    // dipilih user, jadi grid detail tetap terisi. Kalau di sini di-dispatch
    // {}, detail akan mengosongkan diri DAN mematikan query-nya (enabled: !!id)
    // sehingga tampak "no rows data found" padahal headernya ada isinya.
    // Ref-nya juga dipertahankan supaya pilihan pulih otomatis saat user scroll
    // balik ke halaman itu.
  }, [
    rows,
    selectedRow,
    dispatch,
    isLoadingPanjarHeader,
    isFetching,
    isTransitioning,
    shouldBulkFetch,
    isFetchingManually
  ]);

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

  useEffect(() => {
    const preventScrollOnSpace = (event: KeyboardEvent) => {
      if (
        // Cek apakah target yang sedang fokus adalah input atau textarea
        event.key === ' ' &&
        !(
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement
        )
      ) {
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', preventScrollOnSpace);
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
    if (selectedRow !== null && rows.length > 0 && mode !== 'add') {
      const rowData = rows[selectedRow];

      forms.setValue('id', rowData?.id ?? '');
      forms.setValue('nobukti', rowData?.nobukti ?? '');
      forms.setValue('tglbukti', rowData?.tglbukti ?? '');
      // jenisorder_id & biayaemkl_id adalah uuid v7 bertipe TEXT — dikirim apa
      // adanya (String), tidak boleh diubah case-nya atau dikonversi ke angka.
      forms.setValue('jenisorder_id', String(rowData?.jenisorder_id ?? ''));
      forms.setValue('jenisorder_nama', rowData?.jenisorder_nama ?? '');
      forms.setValue('biayaemkl_id', String(rowData?.biayaemkl_id ?? ''));
      forms.setValue('biayaemkl_nama', rowData?.biayaemkl_nama ?? '');
      forms.setValue('keterangan', rowData?.keterangan ?? '');
    }
    // JANGAN forms.reset() saat mode 'add' di sini: effect ini ikut ter-trigger
    // setiap kali `rows` di-update background fetch selama modal Add terbuka,
    // sehingga akan me-reset nilai yang baru diisi user.
  }, [forms, selectedRow, rows, mode]);

  useEffect(() => {
    columns.forEach((col) => {
      // Initialize the refs based on columns dynamically
      if (!inputColRefs.current[col.key]) {
        inputColRefs.current[col.key] = null;
      }
    });
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        forms.reset();
        setMode('');
        clearError();
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

  useEffect(() => {
    if (isSubmitSuccessful) {
      // Pastikan fokus terjadi setelah repaint
      requestAnimationFrame(() => setFocus('tglbukti'));
    }
  }, [isSubmitSuccessful, setFocus]);

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
              gridName="GridPanjarHeader"
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
          rowKeyGetter={rowKeyGetter}
          rowClass={getRowClass}
          onCellClick={(args) => handleCellClick(args, true)}
          headerRowHeight={70}
          rowHeight={ROW_HEIGHT}
          className={`${isDark ? 'rdg-dark' : 'rdg-light'} fill-grid`}
          // WAJIB false: dengan virtualization aktif, sel aktif yang ter-scroll
          // keluar layar ikut ter-unmount sehingga DOM focus jatuh ke <body> dan
          // Arrow/PageUp/PageDown tidak lagi sampai ke grid.
          enableVirtualization={false}
          onColumnResize={onColumnResize}
          onColumnsReorder={onColumnsReorder}
          onCellKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onSelectedCellChange={(args) => {
            handleCellClick({ row: args.row });
          }}
          renderers={{
            noRowsFallback: <EmptyRowsRenderer />
          }}
        />
        <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2">
          <ActionButton
            module="PANJAR-HEADER"
            onAdd={handleAdd}
            checkedRows={checkedRows}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            rowsLength={rows.length}
            totalItems={
              allPanjarHeader ? allPanjarHeader.pagination.totalItems : 0
            }
            startRow={startRow}
            customActions={[
              {
                label: 'Print',
                icon: <FaPrint />,
                shortcut: 'P',
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
          {isLoadingPanjarHeader ? <LoadRowsRenderer /> : null}
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
                    'GridPanjarHeader',
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
      <FormPanjarHeader
        mode={mode}
        forms={forms}
        popOver={popOver}
        setPopOver={setPopOver}
        handleClose={handleClose}
        onSubmit={(keepOpenModal: boolean) =>
          forms.handleSubmit((values) =>
            onSubmit(values as any, keepOpenModal)
          )()
        }
        isLoadingCreate={isLoadingCreate}
        isLoadingUpdate={isLoadingUpdate}
        isLoadingDelete={isLoadingDelete}
      />
    </div>
  );
};

export default GridPanjarHeader;
