'use client';

import Image from 'next/image';
import { debounce } from 'lodash';
import 'react-data-grid/lib/styles.scss';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import IcClose from '@/public/image/x.svg';
import { useQueryClient } from 'react-query';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { NOMOR_CELL_BOX } from '@/constants/constant';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAlert } from '@/lib/store/client/useAlert';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { useFormError } from '@/lib/hooks/formErrorContext';
import FilterInput from '@/components/custom-ui/FilterInput';
import ActionButton from '@/components/custom-ui/ActionButton';
import { setHeaderData } from '@/lib/store/headerSlice/headerSlice';
import { clearOnReload } from '@/lib/store/filterSlice/filterSlice';
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
  setDetailDataReport,
  setReportData
} from '@/lib/store/reportSlice/reportSlice';
import DataGrid, {
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import {
  cancelPreviousRequest,
  formatCurrency,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import FormEstimasiBiayaHeader from './FormEstimasiBiayaHeader';
import {
  EstimasiBiayaHeader,
  filterEstimasiBiayaHeader
} from '@/lib/types/estimasibiayaheader.type';
import {
  estimasiBiayaHeaderInput,
  estimasiBiayaHeaderSchema
} from '@/lib/validations/estimasibiayaheader.validation';
import {
  useCreateEstimasiBiayaHeader,
  useDeleteEstimasiBiayaHeader,
  useGetAllEstimasiBiayaHeader,
  useUpdateEstimasiBiayaHeader
} from '@/lib/server/useEstimasiBiayaHeader';
import {
  checkValidationEstimasiBiayaFn,
  getAllEstimasiBiayaHeaderFn,
  getEstimasiBiayaDetailBiayaByIdFn
} from '@/lib/apis/estimasibiayaheader.api';
import { useReportPdfContext } from '@/hooks/ReportPdfProvider';
import { useGridRowNavigation } from '@/hooks/use-grid-row-navigation';
import {
  generateEstimasiBiayaExportFn,
  generateEstimasiBiayaReportFn
} from '@/lib/apis/report.api';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { useTheme } from 'next-themes';
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
  filters: typeof filterEstimasiBiayaHeader;
}

// Memo status PPN cuma punya segelintir nilai unik, tapi JSON.parse dipanggil
// per baris per render. Cache-kan per string mentahnya. try/catch supaya memo
// yang rusak tidak menjatuhkan seluruh render grid.
const memoCache = new Map<string, any>();
const parseMemo = (raw?: string | null) => {
  if (!raw) return null;
  if (memoCache.has(raw)) return memoCache.get(raw);
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  memoCache.set(raw, parsed);
  return parsed;
};

const GridEstimasiBiayaHeader = () => {
  const { alert } = useAlert();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { clearError } = useFormError();
  const { generateReport, generateExport } = useReportPdfContext();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const { user } = useSelector((state: RootState) => state.auth);
  const { committed, onReload } = useSelector(
    (state: RootState) => state.filter
  );
  const gridRef = useRef<DataGridHandle>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // AbortController untuk cancel request
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [rows, setRows] = useState<EstimasiBiayaHeader[]>([]);
  const [mode, setMode] = useState<string>('');
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
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [isFilteringRows, setIsFilteringRows] = useState(false);
  const [isFetchingManually, setIsFetchingManually] = useState(false);
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
      ...filterEstimasiBiayaHeader,
      tglDari: committed.tglDari,
      tglSampai: committed.tglSampai
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
    Map<number, EstimasiBiayaHeader[]>
  >(new Map());

  const streamBufferRef = useRef<Map<number, EstimasiBiayaHeader[]>>(new Map());
  const prefetchingPagesRef = useRef<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);
  const pendingScrollAdjustment = useRef<number>(0);
  const hasAdjustedScrollRef = useRef<boolean>(false);
  const isPageTransitionRef = useRef(false);
  // Penanda Ctrl+Home / Ctrl+End: dibaca Row Combiner setelah data window
  // baru tiba, supaya baris pertama/terakhir yang difokuskan.
  const jumpToLastRef = useRef(false);
  const jumpToFirstRef = useRef(false);
  const pendingSelectIdxRef = useRef<number>(1);
  const selectedRowRef = useRef<number>(0);
  const lastDispatchedId = useRef<string | null>(null);
  const pendingInitialFocusRef = useRef(true);
  // Jangkar pilihan user. Header yang dikirim ke detail memakai jangkar ini,
  // BUKAN rows[selectedRow] — saat window bergeser karena scroll, index tiap
  // baris ikut bergeser sehingga rows[selectedRow] menunjuk baris lain dan
  // detail/rincian ikut ter-reset. Jangkar hanya berpindah kalau user memang
  // mengubah pilihan: klik baris, panah atas/bawah, atau setelah simpan.
  const selectedRowIdRef = useRef<string | null>(null);
  const selectedRowDataRef = useRef<EstimasiBiayaHeader | null>(null);
  const headerClearedRef = useRef(false);
  // Diisi setelah simpan: id baris yang harus difokuskan begitu data baru tiba.
  const pendingFocusIdRef = useRef<string | null>(null);

  const anchorSelection = (row?: EstimasiBiayaHeader | null) => {
    if (!row) return;
    selectedRowIdRef.current = String(row.id);
    selectedRowDataRef.current = row;
  };

  const clearSelectionAnchor = () => {
    selectedRowIdRef.current = null;
    selectedRowDataRef.current = null;
  };

  // Baris yang dipakai tombol EDIT/DELETE/VIEW & form: jangkar dulu, baru
  // index — supaya aksi tetap mengenai baris pilihan user walau window sudah
  // bergeser jauh karena scroll.
  const getSelectedRowData = (): EstimasiBiayaHeader | undefined =>
    selectedRowDataRef.current ?? rows[selectedRow];

  useEffect(() => {
    selectedRowRef.current = selectedRow;
  }, [selectedRow]);

  // Saat window pagination bergeser, index tiap baris di `rows` ikut bergeser
  // sebanyak filters.limit. Geser juga selectedRowRef supaya baris DATA yang
  // sama tetap ter-highlight; commit ke state ditunda ke Row Combiner agar
  // selectedRow & rows berubah di render yang sama (highlight tidak berkedip).
  // Index KOLOM sel aktif — dicatat supaya re-anchor selectCell setelah
  // window bergeser tidak melompat ke kolom lain.
  const selectedCellIdxRef = useRef<number>(1);

  // Menjaga navigasi keyboard tetap hidup saat window bergeser: mengembalikan
  // DOM focus ke sel aktif yang BARU. Tanpa ini, baris pemegang focus
  // ter-unmount bersama halaman yang dibuang, focus jatuh ke <body>, dan
  // Arrow/PageUp/PageDown berhenti bekerja begitu user ada di halaman kedua
  // atau lebih.
  //
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

  const currentMinPage =
    visiblePages.length > 0 ? Math.min(...visiblePages) : 1;
  const startRow = (currentMinPage - 1) * filters.limit + 1;

  const effectiveLimit = shouldBulkFetch
    ? filters.limit * WINDOW_SIZE
    : filters.limit;

  const {
    data: allEstimasiBiayaHeader,
    isLoading: isLoadingEstimasiBiayaHeader
  } = useGetAllEstimasiBiayaHeader(
    {
      ...filters,
      page: shouldBulkFetch ? bulkStartPage : currentPage,
      limit: effectiveLimit,
      // Saat bulk fetch, awal window ditentukan offset absolut — bukan
      // (page - 1) * limit. Tanpa ini window hanya bisa mulai di kelipatan
      // WINDOW_SIZE, sehingga baris yang kebetulan ada di halaman terakhir
      // menghasilkan window berisi satu baris saja.
      ...(shouldBulkFetch
        ? { customOffset: (bulkStartPage - 1) * filters.limit }
        : {})
    },
    abortControllerRef.current?.signal
  );

  // startPage = HALAMAN LOGIS awal window (boleh berapa saja, tidak harus
  // kelipatan WINDOW_SIZE).
  const resetBufferingCache = (startPage = 1) => {
    const logicalStartPage = Math.max(1, startPage);
    setShouldBulkFetch(true);
    setBulkStartPage(logicalStartPage);
    setPageDataCache(new Map());
    setVisiblePages(
      Array.from({ length: WINDOW_SIZE }, (_, i) => logicalStartPage + i)
    );
    setIsFetching(false);
    setIsTransitioning(false);
    streamBufferRef.current = new Map();
    prefetchingPagesRef.current = new Set();
    // Dataset dibangun ulang → jangkar lama tidak berlaku lagi; Row Combiner
    // akan menjangkar ulang ke baris pertama window yang baru.
    clearSelectionAnchor();
  };

  const { mutateAsync: createEstimasiBiayaHeader, isLoading: isLoadingCreate } =
    useCreateEstimasiBiayaHeader();
  const { mutateAsync: updateEstimasiBiayaHeader, isLoading: isLoadingUpdate } =
    useUpdateEstimasiBiayaHeader();
  const { mutateAsync: deleteEstimasiBiayaHeader, isLoading: isLoadingDelete } =
    useDeleteEstimasiBiayaHeader();

  const forms = useForm<estimasiBiayaHeaderInput>({
    resolver: zodResolver(estimasiBiayaHeaderSchema),
    mode: 'onSubmit',
    defaultValues: {
      nobukti: '',
      detailsbiaya: [],
      detailsinvoice: []
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
      resetBufferingCache();
    }, 300) // Bisa dikurangi jadi 250-300ms
  ).current;

  const handleFilterInputChange = useCallback(
    (colKey: string, value: string) => {
      cancelPreviousRequest(abortControllerRef);
      debouncedFilterUpdate(colKey, value);
      setTimeout(() => {
        setSelectedRow(0);
        gridRef?.current?.selectCell({ rowIdx: 0, idx: 1 });
      }, 400);
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
    resetBufferingCache();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setInputValue(searchValue);
    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      filters: {
        ...filterEstimasiBiayaHeader,
        tglDari: committed.tglDari,
        tglSampai: committed.tglSampai
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

    setSelectedRow(0);
    setCurrentPage(1);
    setRows([]);
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
    resetBufferingCache();
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
    setCurrentPage(1);
    setRows([]);
    resetBufferingCache();
  };

  // Ctrl+Home — bangun ulang window dari halaman 1.
  const handleGoToFirstPage = useCallback(() => {
    jumpToFirstRef.current = true;
    setRows([]);
    setCurrentPage(1);
    resetBufferingCache(1);
  }, []);

  // Ctrl+End — WINDOW_SIZE halaman terakhir. Tidak bisa lewat bulk-fetch
  // biasa karena halaman terakhir jarang sejajar dengan batas blok bulk,
  // jadi tiap halaman diambil sendiri lalu cache & window dirakit manual.
  const handleGoToLastPage = useCallback(async () => {
    if (totalPages < 1) return;

    jumpToLastRef.current = true;
    setRows([]);

    if (totalPages <= WINDOW_SIZE) {
      resetBufferingCache(1);
      return;
    }

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
          getAllEstimasiBiayaHeaderFn({
            ...filters,
            page: p,
            limit: filters.limit
          })
        )
      );

      const newCache = new Map<number, any[]>();
      results.forEach((res: any, i: number) => {
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

  const { handleKeyDownCapture } = useGridRowNavigation({
    rowCount: rows.length,
    gridRef,
    selectedRowRef,
    setSelectedRow,
    searchInputRef: inputRef,
    onGoToFirstPage: handleGoToFirstPage,
    onGoToLastPage: handleGoToLastPage
  });

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

  const columns = useMemo((): Column<EstimasiBiayaHeader>[] => {
    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 40,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          // gap-1 WAJIB sama dengan kolom lain: dua anak h-[50%] + gap 4px
          // melebihi tinggi container, keduanya menyusut 2px, dan garis bawah
          // baris judul berhenti di H/2-2.
          <div className="flex h-full w-full flex-col gap-1">
            <div className="headers-cell h-[50%] w-full">
              <p className="w-full text-center text-sm font-normal">No.</p>
            </div>

            <div className={`h-[50%] w-[calc(100%+2px)] ${NOMOR_CELL_BOX}`}>
              <div className="flex justify-center">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={() => handleSelectAll()}
                  id="header-checkbox"
                />
              </div>
              <div
                className="flex cursor-pointer items-center justify-center"
                onClick={() => {
                  setFilters({
                    ...filters,
                    search: '',
                    filters: {
                      ...filterEstimasiBiayaHeader
                    }
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
          </div>
        ),
        renderCell: (props: any) => {
          // Nomor ABSOLUT, bukan index dalam window. `rows` hanya memuat
          // WINDOW_SIZE halaman yang sedang terlihat, jadi index lokal akan
          // mengulang dari 1 tiap kali window bergeser.
          const rowId = props.row.id;
          const localIndex = rows.findIndex((row) => row.id === rowId);
          const absoluteNumber =
            localIndex === -1
              ? '—'
              : (minVisiblePage - 1) * filters.limit + localIndex + 1;
          return (
            <div
              className={`-ml-[5px] h-full w-[calc(100%+9px)] cursor-pointer ${NOMOR_CELL_BOX}`}
            >
              <div className="flex justify-center">
                <Checkbox
                  checked={checkedRows.has(rowId)}
                  onCheckedChange={() => handleRowSelect(rowId)}
                  id={`row-checkbox-${rowId}`}
                />
              </div>
              <div className="flex justify-center text-sm">
                {absoluteNumber}
              </div>
            </div>
          );
        }
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
        key: 'jenisorder',
        name: 'jenis order',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="JENIS ORDER"
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
                JENIS ORDER
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
                colKey="jenisorder"
                value={filters.filters.jenisorder_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('jenisorder_text', value)
                }
                onClear={() => handleClearFilter('jenisorder_text')}
                inputRef={(el) => {
                  inputColRefs.current['jenisorder_text'] = el;
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
        key: 'orderan_nobukti',
        name: 'orderan no bukti',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NO BUKTI ORDERAN"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('orderan_nobukti')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'orderan_nobukti'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                NO BUKTI ORDERAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'orderan_nobukti' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'orderan_nobukti' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="orderan_nobukti"
                value={filters.filters.orderan_nobukti || ''}
                onChange={(value) =>
                  handleFilterInputChange('orderan_nobukti', value)
                }
                onClear={() => handleClearFilter('orderan_nobukti')}
                inputRef={(el) => {
                  inputColRefs.current['orderan_nobukti'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.orderan_nobukti || '';
          const cellValue = props.row.orderan_nobukti || '';
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
        key: 'nominal',
        name: 'nominal',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="NOMINAL"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nominal')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p className="text-sm font-normal">nominal</p>
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
        key: 'shipper',
        name: 'shipper',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="SHIPPER"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('shipper_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'shipper_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                shipper
              </p>
              <div className="ml-2">
                {filters.sortBy === 'shipper_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'shipper_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="shipper_text"
                value={filters.filters.shipper_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('shipper_text', value)
                }
                onClear={() => handleClearFilter('shipper_text')}
                inputRef={(el) => {
                  inputColRefs.current['shipper'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.shipper_text || '';
          const cellValue = props.row.shipper_nama || '';
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
        key: 'statusppn',
        name: 'status ppn',
        resizable: true,
        draggable: true,
        width: 100,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="STATUS PPN"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('statusppn_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statusppn_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                status ppn
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statusppn_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statusppn_text' &&
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
                selectedValue={filters.filters.statusppn_text}
                onChange={(value) =>
                  handleFilterInputChange('statusppn_text', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = parseMemo(props.row.statusppn_memo);
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
          return <div className="text-xs text-gray-500"></div>;
        }
      },
      {
        key: 'asuransi',
        name: 'asuransi',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="ASURANSI"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('asuransi_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'asuransi_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                asuransi
              </p>
              <div className="ml-2">
                {filters.sortBy === 'asuransi_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'asuransi_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="asuransi_text"
                value={filters.filters.asuransi_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('asuransi_text', value)
                }
                onClear={() => handleClearFilter('asuransi_text')}
                inputRef={(el) => {
                  inputColRefs.current['asuransi'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.asuransi_text || '';
          const cellValue = props.row.asuransi_nama || '';
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
        key: 'comodity',
        name: 'comodity',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="COMODITY"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('comodity_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'comodity_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                comodity
              </p>
              <div className="ml-2">
                {filters.sortBy === 'comodity_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'comodity_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="comodity_text"
                value={filters.filters.comodity_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('comodity_text', value)
                }
                onClear={() => handleClearFilter('comodity_text')}
                inputRef={(el) => {
                  inputColRefs.current['comodity'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.comodity_text || '';
          const cellValue = props.row.comodity_nama || '';
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
        key: 'consignee',
        name: 'consignee',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="CONSIGNEE"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('consignee_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'consignee_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                consignee
              </p>
              <div className="ml-2">
                {filters.sortBy === 'consignee_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'consignee_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="consignee_text"
                value={filters.filters.consignee_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('consignee_text', value)
                }
                onClear={() => handleClearFilter('consignee_text')}
                inputRef={(el) => {
                  inputColRefs.current['consignee'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.consignee_text || '';
          const cellValue = props.row.consignee_nama || '';
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
        width: 150,
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
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
        renderHeaderCell: (column: any) => (
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
  }, [filters, rows, filters.filters, checkedRows]);

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
      const result = await checkValidationEstimasiBiayaFn({
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

  const handleMultipleDelete = async (idsToDelete: number[]) => {
    try {
      for (const id of idsToDelete) {
        // Hapus data satu per satu
        await deleteEstimasiBiayaHeader(id as unknown as string);
      }

      setRows(
        (
          prevRows // Update state setelah semua data berhasil dihapus
        ) => prevRows.filter((row) => !idsToDelete.includes(row.id))
      );
      setCheckedRows(new Set()); // Reset checked rows
      setIsAllSelected(false);

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

          const result = await checkValidationEstimasiBiayaFn({
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
            const response = await checkValidationEstimasiBiayaFn({
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
          const cannotDeleteIds = cannotDeleteItems
            .map((item) => item.id)
            .join(', ');

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

  // Export Excel dijalankan di BACKEND (background job + socket), sama
  // seperti alur cetak laporan. Frontend hanya mengirim filter yang sedang
  // aktif di grid — filter kolom, search global, dan sort — lalu progresnya
  // muncul di toast beserta tombol Download setelah selesai.
  const handleExportExcel = async (exportFilters?: any) => {
    const { page, limit, ...filtersWithoutLimit } = filters;
    const activeFilters = exportFilters ?? filtersWithoutLimit;

    await generateExport({
      label: 'Export Estimasi Biaya',
      payload: {
        search: activeFilters.search,
        filters: activeFilters.filters,
        sortBy: activeFilters.sortBy,
        sortDirection: activeFilters.sortDirection
      },
      apiFn: generateEstimasiBiayaExportFn
    });
  };

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
      label: 'Estimasi Biaya',
      payload: {
        mrtName: 'LaporanEstimasiBiaya.mrt',
        id: String(rowId),
        judullaporan: 'PT. TRANSPORINDO AGUNG SEJAHTERA'
      },
      apiFn: generateEstimasiBiayaReportFn,
      // Tombol Export di viewer memakai filter grid yang sama.
      onExport: () => handleExportExcel()
    });
  };

  const onSuccess = async (
    indexOnPage: any,
    pageNumber: any,
    keepOpenModal: any = false,
    savedId?: any
  ) => {
    dispatch(setClearLookup(true));
    clearError();

    try {
      if (keepOpenModal) {
        forms.reset();
        setPopOver(true);
      } else {
        forms.reset();
        setPopOver(false);

        if (mode !== 'delete') {
          // Bangun ulang window dari halaman tempat baris hasil simpan berada.
          // Cache lama dibuang supaya tidak bercampur dengan data pasca-mutasi.
          //
          // `indexOnPage` sebenarnya dataIndex dari backend: index ABSOLUT di
          // seluruh daftar terfilter, BUKAN index di dalam halaman.
          const absoluteIndex = Math.max(0, Number(indexOnPage) || 0);
          const pageOfRow = Math.max(1, Number(pageNumber) || 1);

          // Window dibuat berakhir DI halaman baris tersebut. Kalau memakai
          // window yang selalu dimulai di kelipatan WINDOW_SIZE, baris yang
          // jatuh di halaman terakhir menghasilkan window berisi satu baris
          // saja — dan karena tidak ada scrollbar, user tidak bisa scroll ke
          // atas untuk melihat data sebelumnya.
          const logicalStartPage = Math.max(1, pageOfRow - WINDOW_SIZE + 1);
          const rowIdxInWindow = Math.max(
            0,
            absoluteIndex - (logicalStartPage - 1) * filters.limit
          );

          // Fokus baris hasil simpan dikunci lewat ID, bukan cuma index.
          // Antara sekarang dan datangnya data baru, `rows` MASIH berisi window
          // lama — kalau hanya mengandalkan index, effect dispatch akan
          // menjangkar ke baris lama di posisi itu, lalu detail memuat data
          // milik estimasi yang salah.
          pendingFocusIdRef.current = savedId != null ? String(savedId) : null;

          setCurrentPage(pageOfRow);
          resetBufferingCache(logicalStartPage);
          setSelectedRow(rowIdxInWindow);
          selectedRowRef.current = rowIdxInWindow;

          setTimeout(() => {
            gridRef?.current?.scrollToCell?.({
              rowIdx: rowIdxInWindow,
              idx: 1
            });
            gridRef?.current?.selectCell({
              rowIdx: rowIdxInWindow,
              idx: 1
            });
          }, 200);
        }

        setIsDataUpdated(false);
      }
    } catch (error) {
      console.error('Error during onSuccess:', error);
      setIsDataUpdated(false);
    } finally {
      // dispatch(setClearLookup(false));
      setIsDataUpdated(false);
    }
  };

  // Tanpa ini, gagal validasi zod = tombol SIMPAN diam saja. detailsbiaya
  // dan detailsinvoice tidak punya <FormMessage> di mana pun, jadi error di
  // dalamnya TIDAK akan muncul sendiri seperti field header. Semua path
  // dikumpulkan supaya user tahu persis apa yang harus diperbaiki.
  const onInvalid = (errors: any) => {
    const daftar: string[] = [];

    const telusuri = (simpul: any, jalur: string[]) => {
      if (!simpul || typeof simpul !== 'object') return;

      const pesan = typeof simpul.message === 'string' ? simpul.message : null;
      if (pesan) {
        const label = jalur
          .map((p) =>
            /^\d+$/.test(p)
              ? `BARIS ${Number(p) + 1}`
              : p.replace(/_/g, ' ').toUpperCase()
          )
          .join(' ');
        daftar.push(label ? `${label}: ${pesan}` : pesan);
        return;
      }

      if (Array.isArray(simpul)) {
        simpul.forEach((anak, i) => telusuri(anak, [...jalur, String(i)]));
        return;
      }
      Object.keys(simpul).forEach((k) => {
        if (k === 'ref' || k === 'type') return;
        telusuri(simpul[k], k === 'root' ? jalur : [...jalur, k]);
      });
    };

    telusuri(errors, []);

    if (daftar.length > 0) {
      alert({
        title: daftar.slice(0, 8).join('\n'),
        variant: 'danger',
        submitText: 'OK'
      });
    }
  };

  const onSubmit = async (
    values: estimasiBiayaHeaderInput,
    keepOpenModal = false
  ) => {
    clearError();
    const selectedRowId = rows[selectedRow]?.id;
    try {
      dispatch(setProcessing());
      if (mode === 'delete') {
        if (selectedRowId) {
          await deleteEstimasiBiayaHeader(selectedRowId as unknown as string, {
            onSuccess: () => {
              setPopOver(false);

              // Menghapus dari `rows` saja TIDAK cukup: Row Combiner menyusun
              // ulang `rows` dari pageDataCache setiap kali cache/window
              // berubah, jadi baris yang dihapus muncul lagi. Sumbernya harus
              // ikut dibersihkan.

              // 1. Baris yang sedang tampil
              setRows((prevRows) =>
                prevRows.filter((row) => row.id !== selectedRowId)
              );

              // 2. Cache seluruh halaman di window
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

              // 3. Halaman yang sudah di-prefetch ke buffer
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

              // 4. Fokus baris BERIKUTNYA lewat ID, bukan selectCell by-index:
              // Row Combiner jalan lagi setelah cache berubah, dan tanpa
              // pendingFocusIdRef fokusnya balik ke baris 0.
              const nextFocusRow =
                rows[selectedRow + 1] ?? rows[selectedRow - 1];
              if (nextFocusRow) {
                pendingFocusIdRef.current = String(nextFocusRow.id);
              } else {
                setSelectedRow(0);
                selectedRowRef.current = 0;
              }
              clearSelectionAnchor();
            }
          });
        }
        return;
      }

      if (mode === 'add') {
        const newOrder = await createEstimasiBiayaHeader(
          {
            ...values,
            detailsbiaya: values.detailsbiaya.map((detail: any) => ({
              ...detail,
              id: '0'
            })),
            detailsinvoice: values.detailsinvoice.map((detail: any) => ({
              ...detail,
              id: '0'
            })),
            ...filters // Kirim filter ke body/payload
          },
          {
            onSuccess: (data) =>
              onSuccess(
                data.dataIndex,
                data.pageNumber,
                keepOpenModal,
                data.newItem?.id
              )
          }
        );

        if (newOrder !== undefined && newOrder !== null) {
        }
        return;
      }

      if (selectedRowId && mode === 'edit') {
        await updateEstimasiBiayaHeader(
          {
            id: selectedRowId as unknown as string,
            fields: { ...values, ...filters }
          },
          {
            onSuccess: (data) =>
              onSuccess(
                data.dataIndex,
                data.pageNumber,
                false,
                data.updatedData?.id ?? selectedRowId
              )
          }
        );
        queryClient.invalidateQueries('estimasibiaya');
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
        'GridEstimasiBiayaHeader',
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
        'GridEstimasiBiayaHeader',
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

  document.querySelectorAll('.column-headers').forEach((element) => {
    element.classList.remove('c1kqdw7y7-0-0-beta-47');
  });

  function handleCellClick(args: { row: EstimasiBiayaHeader }) {
    const clickedRow = args.row;
    // args.row bisa undefined saat grid re-render di tengah pergeseran window
    // (selectCell programatik menembak index yang barisnya sudah hilang).
    if (!clickedRow) return;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    const foundRow = rows.find((r) => r.id === clickedRow?.id);
    if (rowIndex !== -1 && foundRow) {
      setSelectedRow(rowIndex);
      // Klik = perubahan pilihan yang disengaja user → jangkar ikut pindah.
      anchorSelection(foundRow);
      dispatch(setHeaderData(foundRow));
      lastDispatchedId.current = foundRow.id;
    }
  }

  function getRowClass(row: EstimasiBiayaHeader) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  const prefetchPages = useCallback(
    async (
      pagesToFetch: number[],
      existingCache?: Map<number, EstimasiBiayaHeader[]>,
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
            const data = await getAllEstimasiBiayaHeaderFn({
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

  function rowKeyGetter(row: EstimasiBiayaHeader) {
    return row.id;
  }

  async function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (
      isLoadingEstimasiBiayaHeader ||
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
    args: CellKeyDownArgs<EstimasiBiayaHeader>,
    event: React.KeyboardEvent
  ) {
    const visibleRowCount = 10;
    const firstDataRowIndex = 0;
    const selectedRowId = rows[selectedRow]?.id;

    // Panah atas/bawah = user memang memindahkan pilihan → jangkar ikut pindah
    // (berbeda dengan scroll mouse yang hanya menggeser window).
    const moveSelectionBy = (delta: number) => {
      const nextRow = Math.min(
        Math.max((selectedRowRef.current ?? 0) + delta, firstDataRowIndex),
        rows.length - 1
      );
      selectedRowRef.current = nextRow;
      setSelectedRow(nextRow);
      anchorSelection(rows[nextRow]);
    };

    if (event.key === 'ArrowDown') {
      moveSelectionBy(1);
    } else if (event.key === 'ArrowUp') {
      moveSelectionBy(-1);
    } else if (event.key === 'ArrowRight') {
      setSelectedCol((prev) => {
        return Math.min(prev + 1, columns.length - 1);
      });
    } else if (event.key === 'ArrowLeft') {
      setSelectedCol((prev) => {
        return Math.max(prev - 1, 0);
      });
    } else if (event.key === 'PageDown') {
      moveSelectionBy(visibleRowCount - 2);
    } else if (event.key === 'PageUp') {
      moveSelectionBy(-(visibleRowCount - 2));
    } else if (event.key === ' ') {
      // Handle spacebar keydown to toggle row selection
      if (selectedRowId !== undefined) {
        handleRowSelect(selectedRowId); // Toggling the selection of the row
      }
    }
  }

  useEffect(() => {
    loadGridConfig(
      user.id,
      'GridEstimasiBiayaHeader',
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
      gridRef.current.selectCell({ rowIdx: 0, idx: 1 });
      dispatch(setHeaderData(rows[0]));
      setIsFirstLoad(false);
    }
  }, [rows, isFirstLoad]);

  useEffect(() => {
    if (!isFirstLoad) return;
    if (
      committed.tglDari === filters.filters.tglDari &&
      committed.tglSampai === filters.filters.tglSampai
    ) {
      return;
    }

    setFilters((prevFilters) => ({
      ...prevFilters,
      filters: {
        ...prevFilters.filters,
        tglDari: committed.tglDari,
        tglSampai: committed.tglSampai
      }
    }));
    setCurrentPage(1);
    setRows([]);
    resetBufferingCache();
  }, [committed.tglDari, committed.tglSampai, filters, isFirstLoad]);

  useEffect(() => {
    if (!onReload) return;

    setFilters((prev) => ({
      ...prev,
      page: 1,
      filters: {
        ...prev.filters,
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

    pendingInitialFocusRef.current = true;

    dispatch(clearOnReload());
  }, [onReload]);

  useEffect(() => {
    if (!shouldBulkFetch || !allEstimasiBiayaHeader || isDataUpdated) {
      return;
    }

    const bulkData = allEstimasiBiayaHeader.data || [];
    if (bulkData.length === 0) {
      setShouldBulkFetch(false);
      setIsFirstLoad(false);
      setIsFetching(false);
      setRows([]);
      return;
    }

    const pageSize = filters.limit;
    const wasJumpingToLast = jumpToLastRef.current;
    const newCache = new Map<number, EstimasiBiayaHeader[]>();
    // bulkStartPage SUDAH berupa halaman logis (lihat resetBufferingCache),
    // jadi tidak dikalikan WINDOW_SIZE lagi.
    const logicalStartPage = bulkStartPage;

    for (let i = 0; i < WINDOW_SIZE; i++) {
      const pageData = bulkData.slice(i * pageSize, (i + 1) * pageSize);
      if (pageData.length > 0) newCache.set(logicalStartPage + i, pageData);
    }

    setPageDataCache(newCache);
    setVisiblePages(
      Array.from({ length: WINDOW_SIZE }, (_, i) => logicalStartPage + i)
    );

    const totalItems = allEstimasiBiayaHeader.pagination?.totalItems || 0;
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

    if (wasJumpingToLast) {
      setCurrentPage(lastLogicalPage);
    }
  }, [
    allEstimasiBiayaHeader,
    shouldBulkFetch,
    isDataUpdated,
    filters.limit,
    bulkStartPage
  ]);

  // 2. Pagination Fetch — hasil fetch satu halaman (buffer miss) masuk cache
  //    dan window digeser satu langkah.
  useEffect(() => {
    if (shouldBulkFetch || isDataUpdated || isFetchingManually) return;
    if (!allEstimasiBiayaHeader) return;

    const newRows = allEstimasiBiayaHeader.data || [];

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

    if (allEstimasiBiayaHeader.pagination?.totalPages) {
      setTotalPages(allEstimasiBiayaHeader.pagination.totalPages);
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
    allEstimasiBiayaHeader,
    currentPage,
    filters,
    isDataUpdated,
    shouldBulkFetch
  ]);

  // 3. Row Combiner — gabungkan halaman yang sedang terlihat jadi `rows`.
  useEffect(() => {
    // Dedupe per id: setelah sebuah baris dihapus, halaman di server
    // bergeser satu baris, sedangkan cache window masih memegang susunan
    // lama — baris yang sama bisa muncul di dua halaman cache sekaligus dan
    // react-data-grid melapor "two children with the same key".
    const combinedRows: EstimasiBiayaHeader[] = [];
    const idTerpakai = new Set<string>();
    visiblePages?.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (!pageData) return;
      pageData.forEach((row) => {
        const id = String(row.id);
        if (idTerpakai.has(id)) return;
        idTerpakai.add(id);
        combinedRows.push(row);
      });
    });

    if (combinedRows.length === 0) return;

    setRows(combinedRows);

    // Fokus baris hasil simpan: cari berdasarkan ID di data yang BARU datang.
    // Didahulukan supaya tidak tertimpa cabang lain, lalu `return` supaya
    // window tidak ikut di-scroll ke baris 0.
    if (pendingFocusIdRef.current != null) {
      const idFokus = pendingFocusIdRef.current;
      const idx = combinedRows.findIndex((r) => String(r.id) === idFokus);

      if (idx >= 0) {
        pendingFocusIdRef.current = null;
        isPageTransitionRef.current = false;
        selectedRowRef.current = idx;
        setSelectedRow(idx);
        anchorSelection(combinedRows[idx]);

        setTimeout(() => {
          gridRef.current?.scrollToCell?.({ rowIdx: idx, idx: 1 });
          gridRef.current?.selectCell?.({ rowIdx: idx, idx: 1 });
        }, 50);
        return;
      }
      // Belum ketemu (data baru belum tiba) — biarkan menunggu putaran berikut.
    }

    if (jumpToFirstRef.current) {
      // Ctrl+Home — selalu baris pertama window baru.
      jumpToFirstRef.current = false;
      selectedRowRef.current = 0;
      setSelectedRow(0);
      anchorSelection(combinedRows[0]);
      setTimeout(() => {
        gridRef.current?.scrollToCell?.({ rowIdx: 0, idx: 1 });
        gridRef.current?.selectCell?.({ rowIdx: 0, idx: 1 });
      }, 50);
      return;
    }

    if (jumpToLastRef.current) {
      // Ctrl+End — baris terakhir window baru.
      jumpToLastRef.current = false;
      const lastIdx = combinedRows.length - 1;
      selectedRowRef.current = lastIdx;
      setSelectedRow(lastIdx);
      anchorSelection(combinedRows[lastIdx]);
      setTimeout(() => {
        gridRef.current?.scrollToCell?.({ rowIdx: lastIdx, idx: 1 });
        gridRef.current?.selectCell?.({ rowIdx: lastIdx, idx: 1 });
      }, 50);
      return;
    }

    if (isPageTransitionRef.current) {
      isPageTransitionRef.current = false;
      // Window bergeser: cari lagi baris yang dijangkar user berdasarkan ID.
      // Kalau masih ada di window, index-nya dikoreksi supaya highlight tetap
      // menempel di baris DATA yang sama. Kalau sudah keluar window, index
      // dibiarkan clamp — header yang dikirim ke detail tetap dari jangkar,
      // jadi rincian tidak ikut berubah/hilang saat user scroll.
      const anchoredIdx =
        selectedRowIdRef.current != null
          ? combinedRows.findIndex(
              (r) => String(r.id) === selectedRowIdRef.current
            )
          : -1;

      const targetRow =
        anchoredIdx >= 0
          ? anchoredIdx
          : Math.min(
              Math.max(selectedRowRef.current, 0),
              combinedRows.length - 1
            );

      selectedRowRef.current = targetRow;
      setSelectedRow(targetRow);

      if (selectedRowIdRef.current == null) {
        anchorSelection(combinedRows[targetRow]);
      }
    } else if (pendingInitialFocusRef.current) {
      pendingInitialFocusRef.current = false;
      selectedRowRef.current = 0;
      setSelectedRow(0);
      anchorSelection(combinedRows[0]);
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
    // Sedang menunggu baris hasil simpan: JANGAN kirim header apa pun dulu.
    // `rows` di fase ini masih window lama, jadi baris di index yang sama
    // milik estimasi lain — detail akan memuat data yang salah.
    if (pendingFocusIdRef.current != null) return;

    if (rows.length > 0 && selectedRow !== null) {
      headerClearedRef.current = false;
      // Utamakan baris jangkar: saat window bergeser, rows[selectedRow] bisa
      // menunjuk baris lain, sementara jangkar tetap baris pilihan user.
      let selectedRowData = selectedRowDataRef.current;
      if (!selectedRowData) {
        selectedRowData = rows[selectedRow] ?? null;
        anchorSelection(selectedRowData);
      }
      if (!selectedRowData) return;

      // Kirim HANYA kalau headernya benar-benar berganti. Tanpa penjaga ini,
      // tiap pergeseran window mengirim ulang header yang sama dan kedua
      // query detail ikut refetch — itu yang membuat scroll terasa berat.
      if (selectedRowData.id !== lastDispatchedId.current) {
        dispatch(setHeaderData(selectedRowData));
        lastDispatchedId.current = selectedRowData.id;
      }
      return;
    }

    // Detail hanya dikosongkan kalau header memang benar-benar kosong, bukan
    // saat window sedang dimuat ulang — kalau tidak, detail ikut hilang tiap
    // kali data sedang dijemput.
    const sedangMuat =
      isLoadingEstimasiBiayaHeader ||
      isFetching ||
      isTransitioning ||
      shouldBulkFetch;
    if (rows.length === 0 && !sedangMuat && !headerClearedRef.current) {
      headerClearedRef.current = true;
      lastDispatchedId.current = null;
      clearSelectionAnchor();
      dispatch(setHeaderData({}));
    }
  }, [
    rows,
    selectedRow,
    dispatch,
    isLoadingEstimasiBiayaHeader,
    isFetching,
    isTransitioning,
    shouldBulkFetch
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
        event.preventDefault(); // Mencegah scroll pada tombol space jika bukan di input
      }
    };

    document.addEventListener('keydown', preventScrollOnSpace); // Menambahkan event listener saat komponen di-mount

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
    if (selectedRow !== null && rows.length > 0 && mode !== 'add') {
      const rowData = rows[selectedRow];

      forms.setValue('id', rowData?.id);
      forms.setValue('nobukti', rowData?.nobukti);
      forms.setValue('tglbukti', rowData?.tglbukti);
      forms.setValue('jenisorder_id', String(rowData?.jenisorder_id ?? ''));
      forms.setValue('jenisorder_nama', rowData?.jenisorder_nama);
      // forms.setValue('orderan_id', Number(rowData?.orderan_id) ?? 0);
      forms.setValue('orderan_nobukti', rowData?.orderan_nobukti);
      forms.setValue(
        'nominal',
        rowData.nominal == null ? '' : formatCurrency(rowData?.nominal)
      );
      forms.setValue('shipper_id', String(rowData?.shipper_id ?? ''));
      forms.setValue('shipper_nama', rowData?.shipper_nama);
      forms.setValue('statusppn', rowData?.statusppn ?? '');
      forms.setValue('statusppn_nama', rowData?.statusppn_nama ?? '');
      forms.setValue('asuransi_id', String(rowData?.asuransi_id ?? ''));
      forms.setValue('asuransi_nama', rowData?.asuransi_nama);
      forms.setValue('comodity_id', String(rowData?.comodity_id ?? ''));
      forms.setValue('comodity_nama', rowData?.comodity_nama);
      forms.setValue('consignee_id', String(rowData?.consignee_id ?? ''));
      forms.setValue('consignee_nama', rowData?.consignee_nama);
    }
  }, [forms, selectedRow, rows, mode, popOver]);

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
        forms.reset(); // Reset the form when the Escape key is pressed
        setMode(''); // Reset the mode to empty
        clearError();
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
    if (isSubmitSuccessful) {
      // reset();
      // Pastikan fokus terjadi setelah repaint
      requestAnimationFrame(() => setFocus('tglbukti'));
    }
  }, [isSubmitSuccessful, setFocus]);

  return (
    <div
      // PageUp/PageDown ditangkap di pembungkus, bukan di <DataGrid>:
      // react-data-grid tidak meneruskan prop DOM sembarangan, dan input
      // filter/search menelan event keyboard-nya sendiri.
      onKeyDownCapture={(event) => {
        // Tandai modalitas dulu, baru navigasi baris. handleKeyDownCapture
        // yang benar-benar memindah baris saat fokus di input filter/search.
        if (
          event.key === 'ArrowDown' ||
          event.key === 'ArrowUp' ||
          event.key === 'PageDown' ||
          event.key === 'PageUp'
        ) {
          interactionModeRef.current = 'keyboard';
        }
        handleKeyDownCapture(event);
      }}
      onWheelCapture={() => {
        interactionModeRef.current = 'pointer';
      }}
      onPointerDownCapture={() => {
        interactionModeRef.current = 'pointer';
      }}
      className={`flex h-[100%] w-full justify-center`}
    >
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
              gridName="GridEstimasiBiayaHeader"
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
          onCellClick={handleCellClick}
          headerRowHeight={70}
          rowHeight={30}
          className={`${isDark ? 'rdg-dark' : 'rdg-light'} fill-grid`}
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
            module="ESTIMASI-BIAYA-HEADER"
            onAdd={handleAdd}
            checkedRows={checkedRows}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            rowsLength={rows.length}
            totalItems={allEstimasiBiayaHeader?.pagination?.totalItems ?? 0}
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
          {isLoadingEstimasiBiayaHeader ? <LoadRowsRenderer /> : null}
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
                    'GridEstimasiBiayaHeader',
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
      <FormEstimasiBiayaHeader
        mode={mode}
        forms={forms}
        popOver={popOver}
        setPopOver={setPopOver}
        handleClose={handleClose}
        onSubmit={forms.handleSubmit(onSubmit as any, onInvalid)}
        isLoadingCreate={isLoadingCreate}
        isLoadingUpdate={isLoadingUpdate}
        isLoadingDelete={isLoadingDelete}
      />
    </div>
  );
};

export default GridEstimasiBiayaHeader;
