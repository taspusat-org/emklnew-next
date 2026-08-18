'use client';

import Image from 'next/image';
import { debounce } from 'lodash';
import JsxParser from 'react-jsx-parser';
import 'react-data-grid/lib/styles.scss';
import { useForm } from 'react-hook-form';
import FormJobParty from './FormJobParty';
import IcClose from '@/public/image/x.svg';
import { useQueryClient } from 'react-query';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import { api2 } from '@/lib/utils/AxiosInstance';
import { Checkbox } from '@/components/ui/checkbox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAlert } from '@/lib/store/client/useAlert';
import { useSelector, useDispatch } from 'react-redux';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import FormBookingMuatan from './FormBookingOrderanMuatan';
import { useFormError } from '@/lib/hooks/formErrorContext';
import FilterInput from '@/components/custom-ui/FilterInput';
import ActionButton from '@/components/custom-ui/ActionButton';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import { useLainnyaDialog } from '@/lib/store/client/useDialogLainnya';
import { useApprovalDialog } from '@/lib/store/client/useDialogApproval';
import { FaPrint, FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  setHeaderData,
  setUrlApproval
} from '@/lib/store/headerSlice/headerSlice';
import {
  clearOpenName,
  setClearLookup
} from '@/lib/store/lookupSlice/lookupSlice';
import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import {
  JENISORDERMUATAN,
  JENISORDERMUATANNAMA
} from '@/constants/bookingorderan';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  cancelPreviousRequest,
  formatCurrency,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import {
  BookingOrderanMuatan,
  filterBookingOrderanMuatan
} from '@/lib/types/bookingOrderanHeader.type';
import {
  checkValidationBookingOrderanHeaderFn,
  getAllBookingOrderanMuatanFn,
  getBookingOrderanMuatanByIdFn
} from '@/lib/apis/bookingOrderanHeader.api';
import { getParameterFn } from '@/lib/apis/parameter.api';
import {
  bookingOrderanMuatanInput,
  bookingOrderanMuatanSchema,
  jobPartyHeaderInput,
  jobPartyHeaderSchema
} from '@/lib/validations/bookingorderanheader.validation';
import DataGrid, {
  CellClickArgs,
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import {
  useCreateBookingMuatanParty,
  useCreateBookingOrderanHeader,
  useDeleteBookingOrderanHeader,
  useGetAllBookingOrderanHeader,
  useUpdateBookingOrderanHeader
} from '@/lib/server/useBookingOrderanHeader';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { useTheme } from 'next-themes';
import { useGridRowNavigation } from '@/hooks/use-grid-row-navigation';
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
  filters: typeof filterBookingOrderanMuatan;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridBookingMuatan = () => {
  const { alert } = useAlert();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { clearError } = useFormError();
  const { closeDialog } = useLainnyaDialog();
  const { theme, resolvedTheme } = useTheme();
  const { successApproved } = useApprovalDialog();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const { user } = useSelector((state: RootState) => state.auth);
  const {
    selectedDate,
    selectedDate2,
    selectedJenisOrderan,
    selectedJenisOrderanNama,
    onReload
  } = useSelector((state: RootState) => state.filter);

  const gridRef = useRef<DataGridHandle>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const abortControllerRef = useRef<AbortController | null>(null); // AbortController untuk cancel request
  const colTimersRef = useRef<
    Map<keyof Filter['filters'], ReturnType<typeof setTimeout>>
  >(new Map());

  const [mode, setMode] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [dataGridKey, setDataGridKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [popOver, setPopOver] = useState<boolean>(false);
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [reloadForm, setReloadForm] = useState<boolean>(false);
  const [rows, setRows] = useState<BookingOrderanMuatan[]>([]);
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
    // 50 supaya bulk awal = 1 request × 5 halaman = 250 baris, sama seperti
    // boilerplate GridGroupbiayaextra.
    limit: 50,
    filters: {
      ...filterBookingOrderanMuatan,
      tglDari: selectedDate,
      tglSampai: selectedDate2,
      jenisOrderan: String(selectedJenisOrderan)
    },
    search: '',
    sortBy: 'nobukti',
    sortDirection: 'asc'
  });
  const [prevFilters, setPrevFilters] = useState<Filter>(filters);

  // ── Lazy loading berjendela (pola GridGroupbiayaextra) ────────────────────
  // Grid hanya menyimpan WINDOW_SIZE halaman di memori (`visiblePages`), isinya
  // di `pageDataCache`. Halaman di luar window dibuang; halaman berikutnya
  // di-prefetch diam-diam ke `streamBufferRef` supaya saat user scroll sampai
  // ambang batas, window bergeser tanpa spinner.
  const WINDOW_SIZE = 5;
  const STREAM_BUFFER_SIZE = 5;
  const ROW_HEIGHT = 30;

  const [shouldBulkFetch, setShouldBulkFetch] = useState(true);
  const [bulkStartPage, setBulkStartPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5]);
  const [pageDataCache, setPageDataCache] = useState<
    Map<number, BookingOrderanMuatan[]>
  >(new Map());

  const streamBufferRef = useRef<Map<number, BookingOrderanMuatan[]>>(
    new Map()
  );
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
  const headerClearedRef = useRef(false);
  // Jangkar pilihan user (BY-ID). Saat window bergeser karena scroll, index
  // tiap baris ikut bergeser — tanpa jangkar, baris yang ter-highlight berubah
  // diam-diam. Hanya berpindah kalau user memang mengubah pilihan.
  const selectedRowIdRef = useRef<string | null>(null);
  const selectedRowDataRef = useRef<BookingOrderanMuatan | null>(null);
  // Diisi setelah simpan/hapus: id baris yang harus difokuskan begitu data
  // baru tiba.
  const pendingFocusIdRef = useRef<string | null>(null);

  const anchorSelection = (row?: BookingOrderanMuatan | null) => {
    if (!row) return;
    selectedRowIdRef.current = String(row.id);
    selectedRowDataRef.current = row;
  };

  const clearSelectionAnchor = () => {
    selectedRowIdRef.current = null;
    selectedRowDataRef.current = null;
  };

  const getSelectedRowData = (): BookingOrderanMuatan | undefined =>
    selectedRowDataRef.current ?? rows[selectedRow];

  useEffect(() => {
    selectedRowRef.current = selectedRow;
  }, [selectedRow]);

  const shiftSelectionForWindow = (deltaRows: number) => {
    selectedRowRef.current = Math.max(0, selectedRowRef.current + deltaRows);
  };

  const currentMinPage =
    visiblePages.length > 0 ? Math.min(...visiblePages) : 1;
  const startRow = (currentMinPage - 1) * filters.limit + 1;

  const effectiveLimit = shouldBulkFetch
    ? filters.limit * WINDOW_SIZE
    : filters.limit;

  const {
    data: allDataBookingMuatan,
    isLoading: isLoadingBookingMuatan,
    refetch
  } = useGetAllBookingOrderanHeader(
    {
      ...filters,
      page: shouldBulkFetch ? bulkStartPage : currentPage,
      limit: effectiveLimit,
      // Awal window ditentukan offset absolut supaya window bisa mulai di
      // halaman mana pun (mis. setelah simpan, baris baru di halaman terakhir).
      ...(shouldBulkFetch
        ? { customOffset: (bulkStartPage - 1) * filters.limit }
        : {})
    },
    abortControllerRef.current?.signal
  );

  // startPage = HALAMAN LOGIS awal window (boleh berapa saja).
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
    clearSelectionAnchor();
  };

  const { mutateAsync: createBookingMuatan, isLoading: isLoadingCreate } =
    useCreateBookingOrderanHeader();
  const {
    mutateAsync: createBookingMuatanParty,
    isLoading: isLoadingCreateParty
  } = useCreateBookingMuatanParty();
  const { mutateAsync: updateBookingMuatan, isLoading: isLoadingUpdate } =
    useUpdateBookingOrderanHeader();
  const { mutateAsync: deleteBookingMuatan, isLoading: isLoadingDelete } =
    useDeleteBookingOrderanHeader();

  const forms = useForm<bookingOrderanMuatanInput>({
    resolver: zodResolver(bookingOrderanMuatanSchema),
    mode: 'onSubmit',
    defaultValues: {
      nobukti: ''
    }
  });

  console.log(
    'selectedJenisOrderan',
    selectedJenisOrderan,
    selectedDate,
    selectedDate2,
    'selectedJenisOrderanNama',
    selectedJenisOrderanNama,
    'filters',
    filters,
    'forms.getValues()',
    forms.getValues()
  );

  const formsJobParty = useForm<jobPartyHeaderInput>({
    resolver: zodResolver(jobPartyHeaderSchema),
    mode: 'onSubmit'
  });

  useEffect(() => {
    const ambilIdJenisOrderanMuatan = async () => {
      try {
        const hasil = await getParameterFn({
          isLookUp: 'true',
          filters: { grp: 'jenis orderan' }
        });

        const muatan = (hasil?.data ?? []).find(
          (item: any) =>
            String(item?.subgrp ?? '').toUpperCase() === JENISORDERMUATANNAMA
        );

        if (!muatan?.id) return;

        forms.reset({
          ...forms.getValues(),
          jenisorder_id: String(muatan.id),
          jenisorder_nama: JENISORDERMUATANNAMA
        });
      } catch {}
    };

    ambilIdJenisOrderanMuatan();
  }, [forms]);

  const {
    setFocus,
    reset,
    formState: { isSubmitSuccessful }
  } = forms;

  // const handleColumnFilterChange = (
  //   colKey: keyof Filter['filters'],
  //   value: string
  // ) => {
  //   // Set timeout baru untuk debounce
  //   // Cancel request sebelumnya jika ada
  //   cancelPreviousRequest();

  //   // Logika yang ada pada handleColumnFilterChange sebelumnya
  //   const originalIndex = columns.findIndex((col) => col.key === colKey);
  //   const displayIndex =
  //     columnsOrder.length > 0
  //       ? columnsOrder.findIndex((idx) => idx === originalIndex)
  //       : originalIndex;

  //   setFilters((prev) => ({
  //     ...prev,
  //     filters: { ...prev.filters, [colKey]: value },
  //     search: '',
  //     page: 1
  //   }));

  //   setInputValue('');
  //   setCheckedRows(new Set());
  //   setIsAllSelected(false);

  //   setTimeout(() => {
  //     gridRef?.current?.selectCell({ rowIdx: 0, idx: displayIndex });
  //   }, 100);

  //   setTimeout(() => {
  //     const ref = inputColRefs.current[colKey];
  //     ref?.focus();
  //   }, 200);

  //   setSelectedRow(0);
  //   setCurrentPage(1);
  // };

  const debouncedFilterUpdate = useRef(
    debounce((colKey: string, value: string) => {
      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, [colKey]: value },
        page: 1
      }));
      setCheckedRows(new Set());
      setIsAllSelected(false);
      setRows([]);
      setCurrentPage(1);
      setSelectedRow(0);
    }, 300) // Bisa dikurangi jadi 250-300ms
  ).current;

  const handleFilterInputChange = useCallback(
    (colKey: string, value: string) => {
      cancelPreviousRequest(abortControllerRef);
      debouncedFilterUpdate(colKey, value);
    },
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelPreviousRequest(abortControllerRef);
    const searchValue = e.target.value;
    // Langsung update input value tanpa debounce
    setInputValue(searchValue);

    // Menunggu beberapa waktu sebelum update filter
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      // Mengupdate filter setelah debounce
      setCurrentPage(1);
      setFilters((prev) => ({
        ...prev,
        filters: filterBookingOrderanMuatan, // Gunakan filter yang relevan
        tglDari: selectedDate,
        tglSampai: selectedDate2,
        jenisOrderan: String(selectedJenisOrderan),
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
    }, 300); // Mengatur debounce hanya untuk update filter
  };

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

  // PageUp/PageDown saat lazy loading — pola GridGroupbiayaextra.
  // scrollToCell-nya yang membuat window ikut bergeser & memuat halaman
  // berikutnya, sama seperti saat user menggulung dengan mouse.
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
          getAllBookingOrderanMuatanFn({
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

  const columns = useMemo((): Column<BookingOrderanMuatan>[] => {
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
                  filters: filterBookingOrderanMuatan
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
          // Nomor ABSOLUT lintas window, bukan index di dalam `rows`: window
          // hanya memuat 5 halaman, jadi index lokal akan mengulang dari 1
          // setiap kali window bergeser.
          const localIndex = rows.findIndex((row) => row.id === props.row.id);
          const absoluteNumber =
            localIndex === -1
              ? '—'
              : (currentMinPage - 1) * filters.limit + localIndex + 1;
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
            <div className="headers-cell h-[50%]"></div>
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
        renderCell: ({ row }: { row: BookingOrderanMuatan }) => (
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
              {/* <Input
                ref={(el) => {
                  inputColRefs.current['nobukti'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.nobukti
                    ? filters.filters.nobukti.toUpperCase()
                    : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase(); // Menjadikan input menjadi uppercase
                  handleColumnFilterChange('nobukti', value);
                }}
              />
              {filters.filters.nobukti && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('nobukti', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )} */}

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
        key: 'orderan_nobukti',
        name: 'orderan No Bukti',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
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
                No Bukti Orderan
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
          const value = props.row.orderan_nobukti; // atau dari props.row
          const cellValue = props.row.orderan_nobukti || '';
          // Buat component wrapper untuk highlightText
          const HighlightWrapper = () => {
            return highlightText(cellValue, filters.search, columnFilter);
          };
          // return (
          //   <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
          //     <JsxParser
          //       components={{ HighlightWrapper }}
          //       jsx={props.row.link}
          //       renderInWrapper={false}
          //     />
          //   </div>
          // );
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
                    {/* {highlightText(cellValue, filters.search, columnFilter)} */}
                    <JsxParser
                      components={{ HighlightWrapper }}
                      jsx={props.row.link}
                      renderInWrapper={false}
                    />
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
        key: 'tglbukti',
        name: 'tgl bukti',
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
                tgl bukti
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
        key: 'jenisorder',
        name: 'jenis order',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
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
                colKey="jenisorder"
                value={filters.filters.jenisorder_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('jenisorder_text', value)
                }
                onClear={() => handleClearFilter('jenisorder_text')}
                inputRef={(el) => {
                  inputColRefs.current['jenisorder'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.jenisorder_text || '';
          const cellValue = props.row.jenisorder_nama || '';
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
        key: 'container',
        name: 'container',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('container_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'container_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                CONTAINER
              </p>
              <div className="ml-2">
                {filters.sortBy === 'container_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'container_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="container"
                value={filters.filters.container_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('container_text', value)
                }
                onClear={() => handleClearFilter('container_text')}
                inputRef={(el) => {
                  inputColRefs.current['container'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.container_text || '';
          const cellValue = props.row.container_nama || '';
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
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
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
                SHIPPER
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
                colKey="shipper"
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
        key: 'tujuankapal',
        name: 'tujuan kapal',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
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
                colKey="tujuankapal"
                value={filters.filters.tujuankapal_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('tujuankapal_text', value)
                }
                onClear={() => handleClearFilter('tujuankapal_text')}
                inputRef={(el) => {
                  inputColRefs.current['tujuankapal'] = el;
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
        key: 'marketing',
        name: 'marketing',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('marketing_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'marketing_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                MARKETING
              </p>
              <div className="ml-2">
                {filters.sortBy === 'marketing_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'marketing_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="marketing"
                value={filters.filters.marketing_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('marketing_text', value)
                }
                onClear={() => handleClearFilter('marketing_text')}
                inputRef={(el) => {
                  inputColRefs.current['marketing'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.marketing_text || '';
          const cellValue = props.row.marketing_nama || '';
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
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
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
        key: 'schedule',
        name: 'schedule',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('schedule_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'schedule_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                SCHEDULE
              </p>
              <div className="ml-2">
                {filters.sortBy === 'schedule_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'schedule_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="schedule"
                value={filters.filters.schedule_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('schedule_text', value)
                }
                onClear={() => handleClearFilter('schedule_text')}
                inputRef={(el) => {
                  inputColRefs.current['schedule'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.schedule_text || '';
          const cellValue = props.row.schedule_nama || '';
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
        key: 'pelayarancontainer',
        name: 'pelayaran container',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('pelayarancontainer_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'pelayarancontainer_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                PELAYARAN CONTAINER
              </p>
              <div className="ml-2">
                {filters.sortBy === 'pelayarancontainer_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'pelayarancontainer_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="pelayarancontainer"
                value={filters.filters.pelayarancontainer_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('pelayarancontainer_text', value)
                }
                onClear={() => handleClearFilter('pelayarancontainer_text')}
                inputRef={(el) => {
                  inputColRefs.current['pelayarancontainer'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.pelayarancontainer_text || '';
          const cellValue = props.row.pelayarancontainer_nama || '';
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
        key: 'jenismuatan',
        name: 'jenis muatan',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('jenismuatan_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'jenismuatan_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                JENIS MUATAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'jenismuatan_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'jenismuatan_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="jenismuatan"
                value={filters.filters.jenismuatan_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('jenismuatan_text', value)
                }
                onClear={() => handleClearFilter('jenismuatan_text')}
                inputRef={(el) => {
                  inputColRefs.current['jenismuatan'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.jenismuatan_text || '';
          const cellValue = props.row.jenismuatan_nama || '';
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
        key: 'sandarkapal',
        name: 'sandar kapal',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('sandarkapal_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'sandarkapal_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                SANDAR KAPAL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'sandarkapal_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'sandarkapal_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="sandarkapal"
                value={filters.filters.sandarkapal_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('sandarkapal_text', value)
                }
                onClear={() => handleClearFilter('sandarkapal_text')}
                inputRef={(el) => {
                  inputColRefs.current['sandarkapal'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.sandarkapal_text || '';
          const cellValue = props.row.sandarkapal_nama || '';
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
        key: 'nopolisi',
        name: 'no polisi',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nopolisi')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nopolisi' ? 'font-bold' : 'font-normal'
                }`}
              >
                NO POLISI
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nopolisi' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nopolisi' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nopolisi"
                value={filters.filters.nopolisi || ''}
                onChange={(value) => handleFilterInputChange('nopolisi', value)}
                onClear={() => handleClearFilter('nopolisi')}
                inputRef={(el) => {
                  inputColRefs.current['nopolisi'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nopolisi || '';
          const cellValue = props.row.nopolisi || '';
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
        key: 'nosp',
        name: 'no sp',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nosp')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nosp' ? 'font-bold' : 'font-normal'
                }`}
              >
                NO SP
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nosp' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nosp' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nosp"
                value={filters.filters.nosp || ''}
                onChange={(value) => handleFilterInputChange('nosp', value)}
                onClear={() => handleClearFilter('nosp')}
                inputRef={(el) => {
                  inputColRefs.current['nosp'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nosp || '';
          const cellValue = props.row.nosp || '';
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
        key: 'nocontainer',
        name: 'no container',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nocontainer')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nocontainer' ? 'font-bold' : 'font-normal'
                }`}
              >
                NO CONTAINER
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nocontainer' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nocontainer' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nocontainer"
                value={filters.filters.nocontainer || ''}
                onChange={(value) =>
                  handleFilterInputChange('nocontainer', value)
                }
                onClear={() => handleClearFilter('nocontainer')}
                inputRef={(el) => {
                  inputColRefs.current['nocontainer'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nocontainer || '';
          const cellValue = props.row.nocontainer || '';
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
        key: 'noseal',
        name: 'no seal',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('noseal')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'noseal' ? 'font-bold' : 'font-normal'
                }`}
              >
                NO SEAL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'noseal' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'noseal' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="noseal"
                value={filters.filters.noseal || ''}
                onChange={(value) => handleFilterInputChange('noseal', value)}
                onClear={() => handleClearFilter('noseal')}
                inputRef={(el) => {
                  inputColRefs.current['noseal'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.noseal || '';
          const cellValue = props.row.noseal || '';
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
        key: 'lokasistuffing',
        name: 'lokasi stuffing',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('lokasistuffing_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'lokasistuffing_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                LOKASI STUFFING
              </p>
              <div className="ml-2">
                {filters.sortBy === 'lokasistuffing_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'lokasistuffing_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="lokasistuffing"
                value={filters.filters.lokasistuffing_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('lokasistuffing_text', value)
                }
                onClear={() => handleClearFilter('lokasistuffing_text')}
                inputRef={(el) => {
                  inputColRefs.current['lokasistuffing'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.lokasistuffing_text || '';
          const cellValue = props.row.lokasistuffing_nama || '';
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
        key: 'nominalstuffing',
        name: 'nominal stuffing',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nominalstuffing')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nominalstuffing'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                NOMINAL STUFFING
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nominalstuffing' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nominalstuffing' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nominalstuffing"
                value={filters.filters.nominalstuffing || ''}
                onChange={(value) =>
                  handleFilterInputChange('nominalstuffing', value)
                }
                onClear={() => handleClearFilter('nominalstuffing')}
                inputRef={(el) => {
                  inputColRefs.current['nominalstuffing'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nominalstuffing || '';
          const cellValue =
            props.row.nominalstuffing != null &&
            props.row.nominalstuffing !== ''
              ? formatCurrency(props.row.nominalstuffing)
              : '';
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
        key: 'emkllain',
        name: 'emkl lain',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
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
                colKey="emkllain"
                value={filters.filters.emkllain_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('emkllain_text', value)
                }
                onClear={() => handleClearFilter('emkllain_text')}
                inputRef={(el) => {
                  inputColRefs.current['emkllain'] = el;
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
        key: 'asalmuatan',
        name: 'asal muatan',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('asalmuatan')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'asalmuatan' ? 'font-bold' : 'font-normal'
                }`}
              >
                ASAL MUATAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'asalmuatan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'asalmuatan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="asalmuatan"
                value={filters.filters.asalmuatan || ''}
                onChange={(value) =>
                  handleFilterInputChange('asalmuatan', value)
                }
                onClear={() => handleClearFilter('asalmuatan')}
                inputRef={(el) => {
                  inputColRefs.current['asalmuatan'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.asalmuatan || '';
          const cellValue = props.row.asalmuatan || '';
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
        key: 'daftarbl',
        name: 'daftar bl',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
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
                colKey="daftarbl"
                value={filters.filters.daftarbl_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('daftarbl_text', value)
                }
                onClear={() => handleClearFilter('daftarbl_text')}
                inputRef={(el) => {
                  inputColRefs.current['daftarbl'] = el;
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
      },
      {
        key: 'comodity',
        name: 'comodity',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
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
        key: 'gandengan',
        name: 'gandengan',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('gandengan')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'gandengan' ? 'font-bold' : 'font-normal'
                }`}
              >
                GANDENGAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'gandengan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'gandengan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="gandengan"
                value={filters.filters.gandengan || ''}
                onChange={(value) =>
                  handleFilterInputChange('gandengan', value)
                }
                onClear={() => handleClearFilter('gandengan')}
                inputRef={(el) => {
                  inputColRefs.current['gandengan'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.gandengan || '';
          const cellValue = props.row.gandengan || '';
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
        key: 'tradoluar',
        name: 'trado luar',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statustradoluar')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statustradoluar'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                STATUS TRADO LUAR
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statustradoluar' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statustradoluar' &&
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
                  // handleColumnFilterChange('tradoluar_text', value)
                  handleFilterInputChange('tradoluar_text', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.tradoluar_memo
            ? JSON.parse(props.row.tradoluar_memo)
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
          return <div className="text-xs text-gray-500"></div>;
        }
      },
      {
        key: 'pisahbl',
        name: 'pisah bl',
        resizable: true,
        draggable: true,
        width: 100,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statuspisahbl')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statuspisahbl'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                PISAH BL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statuspisahbl' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statuspisahbl' &&
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
                  handleFilterInputChange('pisahbl_text', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.pisahbl_memo
            ? JSON.parse(props.row.pisahbl_memo)
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
          return <div className="text-xs text-gray-500"></div>;
        }
      },
      {
        key: 'jobptd',
        name: 'job ptd',
        resizable: true,
        draggable: true,
        width: 100,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statusjobptd')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statusjobptd'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                JOB PTD
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statusjobptd' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statusjobptd' &&
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
                  handleFilterInputChange('jobptd_text', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.jobptd_memo
            ? JSON.parse(props.row.jobptd_memo)
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
          return <div className="text-xs text-gray-500"></div>;
        }
      },
      {
        key: 'transit',
        name: 'transit',
        resizable: true,
        draggable: true,
        width: 100,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statustransit')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statustransit'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                TRANSIT
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statustransit' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statustransit' &&
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
                  handleFilterInputChange('transit_text', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.transit_memo
            ? JSON.parse(props.row.transit_memo)
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
          return <div className="text-xs text-gray-500"></div>;
        }
      },
      {
        key: 'stuffingdepo',
        name: 'stuffing depo',
        resizable: true,
        draggable: true,
        width: 100,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statusstuffingdepo')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statusstuffingdepo'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                STUFFING DEPO
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statusstuffingdepo' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statusstuffingdepo' &&
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
                  handleFilterInputChange('stuffingdepo_text', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.stuffingdepo_memo
            ? JSON.parse(props.row.stuffingdepo_memo)
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
          return <div className="text-xs text-gray-500"></div>;
        }
      },
      {
        key: 'opendoor',
        name: 'open door',
        resizable: true,
        draggable: true,
        width: 100,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statusopendoor')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statusopendoor'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                OPEN DOOR
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statusopendoor' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statusopendoor' &&
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
                  handleFilterInputChange('opendoor_text', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.opendoor_memo
            ? JSON.parse(props.row.opendoor_memo)
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
          return <div className="text-xs text-gray-500"></div>;
        }
      },
      {
        key: 'batalmuat',
        name: 'batal muat',
        resizable: true,
        draggable: true,
        width: 100,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statusbatalmuat')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statusbatalmuat'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                BATAL MUAT
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statusbatalmuat' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statusbatalmuat' &&
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
                  handleFilterInputChange('batalmuat_text', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.batalmuat_memo
            ? JSON.parse(props.row.batalmuat_memo)
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
          return <div className="text-xs text-gray-500"></div>;
        }
      },
      {
        key: 'soc',
        name: 'soc',
        resizable: true,
        draggable: true,
        width: 100,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statussoc')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statussoc' ? 'font-bold' : 'font-normal'
                }`}
              >
                SOC
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statussoc' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statussoc' &&
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
                onChange={(value) => handleFilterInputChange('soc_text', value)} // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.soc_memo
            ? JSON.parse(props.row.soc_memo)
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
          return <div className="text-xs text-gray-500"></div>;
        }
      },
      {
        key: 'pengurusandoor',
        name: 'pengurusan door',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statuspengurusandoor')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statuspengurusandoor'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                PENGURUSAN DOOR EKSPEDISI LAIN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statuspengurusandoor' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statuspengurusandoor' &&
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
                  handleFilterInputChange('pengurusandoor_text', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.pengurusandoor_memo
            ? JSON.parse(props.row.pengurusandoor_memo)
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
          return <div className="text-xs text-gray-500"></div>;
        }
      },
      {
        key: 'approval',
        name: 'approval',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statusapproval')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statusapproval'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                STATUS APPROVAL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statusapproval' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statusapproval' &&
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
                filterBy={{ grp: 'STATUS APPROVAL', subgrp: 'STATUS APPROVAL' }}
                onChange={(value) =>
                  handleFilterInputChange('approval_text', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.approval_memo
            ? JSON.parse(props.row.approval_memo)
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
          return <div className="text-xs text-gray-500"></div>;
        }
      },
      {
        key: 'modifiedby',
        name: 'Modified By',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
              onClick={() => handleSort('modifiedby')}
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
  }, [filters, rows, checkedRows]);

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
    setMode('add');
    setPopOver(true);
    forms.reset();
  };

  const handleEdit = async () => {
    if (selectedRow === null || checkedRows.size > 0) {
      alert({
        title: 'PILIH DATA YANG INGIN DI EDIT!',
        variant: 'danger',
        submitText: 'OK'
      });
      return;
    }
    if (selectedRow !== null) {
      const rowData = rows[selectedRow];
      const result = await checkValidationBookingOrderanHeaderFn({
        aksi: 'EDIT',
        value: rowData.id,
        jenisOrderan: selectedJenisOrderan
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
        await deleteBookingMuatan({
          id: id as unknown as string,
          jenisOrderan: String(selectedJenisOrderan)
        });
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

          const result = await checkValidationBookingOrderanHeaderFn({
            aksi: 'DELETE',
            value: rowData.id,
            jenisOrderan: selectedJenisOrderan
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
            const response = await checkValidationBookingOrderanHeaderFn({
              aksi: 'DELETE',
              value: id,
              jenisOrderan: selectedJenisOrderan
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
    closeDialog();
    forms.reset();
    formsJobParty.reset();
    setReloadForm(false);
  };

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

    try {
      dispatch(setProcessing());
      const rowId = Array.from(checkedRows)[0];
      const selectedRowNobukti = rows.find((r) => r.id === rowId)?.nobukti;

      const response = await getBookingOrderanMuatanByIdFn(rowId);
      // const responseDetail = await getPengeluaranEmklDetailFn({
      //   filters: { nobukti: selectedRowNobukti }
      // });
      // const totalNominal = responseDetail.data.reduce(
      //   (sum: number, i: any) => sum + Number(i.nominal || 0),
      //   0
      // );

      if (response.data === null || response.data.length === 0) {
        alert({
          title: 'TERJADI KESALAHAN SAAT MEMBUAT LAPORAN!',
          variant: 'danger',
          submitText: 'OK'
        });
        return;
      }
      const reportRows = response.data.map((row) => ({
        ...row,
        judullaporan: 'Laporan booking Orderan Muatan',
        usercetak: user.username,
        tglcetak: new Date().toLocaleDateString(),
        // terbilang: numberToTerbilang(totalNominal),
        judul: 'PT.TRANSPORINDO AGUNG SEJAHTERA'
      }));
      sessionStorage.setItem('dataId', rowId as unknown as string);
      import('stimulsoft-reports-js/Scripts/stimulsoft.blockly.editor')
        .then((module) => {
          const { Stimulsoft } = module;
          Stimulsoft.Base.StiFontCollection.addOpentypeFontFile(
            '/fonts/tahomabd.ttf',
            'TahomaBD'
          );
          Stimulsoft.Base.StiFontCollection.addOpentypeFontFile(
            '/fonts/tahoma.ttf',
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

          // Load the report template (MRT file)
          report.loadFile('/reports/LaporanPengeluaranKasEmklHeader.mrt');
          report.dictionary.dataSources.clear();
          dataSet.readJson({ data: reportRows });
          // dataSet.readJson({ detail: responseDetail.data });
          report.regData(dataSet.dataSetName, '', dataSet);
          report.dictionary.synchronize();

          // Render the report asynchronously

          report.renderAsync(() => {
            // Export the report to PDF asynchronously
            report.exportDocumentAsync((pdfData: any) => {
              const pdfBlob = new Blob([new Uint8Array(pdfData)], {
                type: 'application/pdf'
              });
              const pdfUrl = URL.createObjectURL(pdfBlob);

              // Store the Blob URL in sessionStorage
              sessionStorage.setItem('pdfUrl', pdfUrl);

              // Navigate to the report page
              window.open('/reports/pengeluaranemklheader', '_blank');
            }, Stimulsoft.Report.StiExportFormat.Pdf);
          });
        })
        .catch((error) => {
          console.error('Failed to load Stimulsoft:', error);
        });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      dispatch(setProcessed());
    }
  };

  // const handleReport = async () => {
  //   if (checkedRows.size === 0) {
  //     alert({
  //       title: 'PILIH DATA YANG INGIN DI CETAK!',
  //       variant: 'danger',
  //       submitText: 'OK'
  //     });
  //     return; // Stop execution if no rows are selected
  //   }
  //   if (checkedRows.size > 1) {
  //     alert({
  //       title: 'HANYA BISA MEMILIH SATU DATA!',
  //       variant: 'danger',
  //       submitText: 'OK'
  //     });
  //     return; // Stop execution if no rows are selected
  //   }

  //   const rowId = Array.from(checkedRows)[0];
  //   const selectedRowNobukti = rows.find((r) => r.id === rowId)?.nobukti;

  //   const response = await getBookingOrderanMuatanByIdFn(rowId);
  //   // const responseDetail = await getPengeluaranEmklDetailFn({
  //   //   filters: { nobukti: selectedRowNobukti }
  //   // });
  //   //
  //   // const totalNominal = responseDetail.data.reduce(
  //   //   (sum: number, i: any) => sum + Number(i.nominal || 0),
  //   //   0
  //   // );

  //   if (response.data === null || response.data.length === 0) {
  //     alert({
  //       title: 'DATA TIDAK TERSEDIA!',
  //       variant: 'danger',
  //       submitText: 'ok'
  //     });
  //   } else {
  //     const reportRows = response.data.map((row: any) => ({
  //       ...row,
  //       judullaporan: 'Laporan Pengeluaran',
  //       usercetak: user.username,
  //       tglcetak: formatDateToDDMMYYYY(new Date()),
  //       // terbilang: numberToTerbilang(totalNominal),
  //       judul: 'PT.TRANSPORINDO AGUNG SEJAHTERA'
  //     }));
  //     dispatch(setReportData(reportRows));
  //     dispatch(setDetailDataReport(responseDetail.data));
  //     window.open('/reports/designer', '_blank');
  //   }
  // };

  // const handleReport = async () => {
  //   if (checkedRows.size === 0) {
  //     alert({
  //       title: 'PILIH DATA YANG INGIN DI CETAK!',
  //       variant: 'danger',
  //       submitText: 'OK'
  //     });
  //     return; // Stop execution if no rows are selected
  //   }
  //   if (checkedRows.size > 1) {
  //     alert({
  //       title: 'HANYA BISA MEMILIH SATU DATA!',
  //       variant: 'danger',
  //       submitText: 'OK'
  //     });
  //     return; // Stop execution if no rows are selected
  //   }

  //   const rowId = Array.from(checkedRows)[0];
  //   const now = new Date();
  //   const pad = (n: any) => n.toString().padStart(2, '0');
  //   const tglcetak = `${pad(now.getDate())}-${pad(
  //     now.getMonth() + 1
  //   )}-${now.getFullYear()} ${pad(now.getHours())}:${pad(
  //     now.getMinutes()
  //   )}:${pad(now.getSeconds())}`;
  //   const { page, limit, ...filtersWithoutLimit } = filters;
  //   dispatch(setProcessing()); // Show loading overlay when the request starts

  //   try {
  //     const response = await getBookingOrderanMuatanByIdFn(
  //       rowId,
  //       // filtersWithoutLimit
  //     );

  //

  //     // const responseDetail = await getPengeluaranDetailFn(rowId);
  //     const totalNominal = response.data.reduce(
  //       (sum: number, i: any) => sum + Number(i.nominal || 0),
  //       0
  //     );
  //     if (response.data === null || response.data.length === 0) {
  //       alert({
  //         title: 'DATA TIDAK TERSEDIA!',
  //         variant: 'danger',
  //         submitText: 'OK'
  //       });
  //     } else {
  //       const reportRows = response.data.map((row: any) => ({
  //         ...row,
  //         judullaporan: 'PT. TRANSPORINDO AGUNG SEJAHTERA',
  //         usercetak: user.username,
  //         tglcetak,
  //         // terbilang: numberToTerbilang(totalNominal),
  //         judul: `LAPORAN BOOKING ORDERAN MUATAN`
  //       }));
  //
  //       dispatch(setReportData(reportRows));
  //       // dispatch(setDetailDataReport(responseDetail.data));
  //       window.open('/reports/designer', '_blank');
  //     }
  //   } catch (error) {
  //     console.error('Error generating report:', error);
  //     alert({
  //       title: 'Terjadi kesalahan saat memuat data!',
  //       variant: 'danger',
  //       submitText: 'OK'
  //     });
  //   } finally {
  //     dispatch(setProcessed()); // Hide loading overlay when the request is finished
  //   }
  // };

  const onSuccess = async (
    indexOnPage: any,
    pageNumber: any,
    keepOpenModal: any = false,
    savedId?: any
  ) => {
    dispatch(setClearLookup(true));
    clearError();
    closeDialog();

    try {
      if (keepOpenModal) {
        forms.reset();
        setPopOver(true);
      } else {
        forms.reset();
        setPopOver(false);

        if (mode !== 'delete') {
          // Bangun ulang window dari halaman tempat baris hasil simpan berada.
          //
          // `indexOnPage` sebenarnya dataIndex dari backend: index ABSOLUT di
          // seluruh daftar terfilter, BUKAN index di dalam halaman.
          const absoluteIndex = Math.max(0, Number(indexOnPage) || 0);
          const pageOfRow = Math.max(1, Number(pageNumber) || 1);

          // Window dibuat BERAKHIR di halaman baris tersebut supaya baris yang
          // jatuh di halaman terakhir tidak menghasilkan window berisi satu
          // baris (dan tanpa scrollbar, tidak bisa scroll balik ke atas).
          const logicalStartPage = Math.max(1, pageOfRow - WINDOW_SIZE + 1);
          const rowIdxInWindow = Math.max(
            0,
            absoluteIndex - (logicalStartPage - 1) * filters.limit
          );

          // Fokus dikunci BY-ID: sampai data baru tiba, `rows` masih window
          // lama, jadi index yang sama menunjuk baris milik booking lain.
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
            gridRef?.current?.selectCell({ rowIdx: rowIdxInWindow, idx: 1 });
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

  // Tanpa ini, gagal validasi zod = tombol SIMPAN diam saja. Error pada field
  // tersembunyi atau pada baris detail yang sedang tidak terlihat tidak pernah
  // sampai ke user. Dipakai bersama untuk form booking biasa & form JOB PARTY.
  const onInvalid = (errors: any) => {
    const kumpulkan = (obj: any, jalur: string[] = []): string[] => {
      if (!obj || typeof obj !== 'object') return [];
      if (typeof obj.message === 'string') {
        return [`${jalur.join('.')}: ${obj.message}`];
      }
      return Object.entries(obj).flatMap(([kunci, nilai]) =>
        kumpulkan(nilai, [...jalur, kunci])
      );
    };

    const daftar = kumpulkan(errors);
    console.warn('[BOOKING ORDERAN] validasi gagal:', daftar);

    alert({
      title: daftar.length > 0 ? daftar.join('\n') : 'DATA BELUM LENGKAP',
      variant: 'danger',
      submitText: 'OK'
    });
  };

  const onSubmit = async (
    values: bookingOrderanMuatanInput,
    keepOpenModal = false
  ) => {
    clearError();
    const selectedRowId = rows[selectedRow]?.id;
    const selectedRowHeaderId = rows[selectedRow]?.header_id;

    try {
      dispatch(setProcessing());
      if (mode === 'delete') {
        if (selectedRowId) {
          await deleteBookingMuatan(
            {
              id: selectedRowId as unknown as string,
              jenisOrderan: String(selectedJenisOrderan)
            },
            {
              onSuccess: () => {
                setPopOver(false);

                // Menghapus dari `rows` saja TIDAK cukup: Row Combiner
                // menyusun ulang `rows` dari pageDataCache setiap kali
                // cache/window berubah, jadi baris yang dihapus muncul lagi.
                // Pola ini dari GridGroupbiayaextra.

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

                // 3. Halaman hasil prefetch
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

                // 4. Fokus baris berikutnya BY-ID (selectCell by-index akan
                // ditimpa Row Combiner yang jalan lagi setelah cache berubah).
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
            }
          );
        }
        return;
      }
      if (mode === 'add') {
        const newOrder = await createBookingMuatan(
          {
            ...values,
            ...filters // Kirim filter ke body/payload
          },
          {
            onSuccess: (data) =>
              onSuccess(data.dataIndex, data.pageNumber, keepOpenModal)
          }
        );

        if (newOrder !== undefined && newOrder !== null) {
        }
        return;
      }

      if (selectedRowId && mode === 'edit') {
        await updateBookingMuatan(
          {
            id: selectedRowHeaderId as unknown as string,
            fields: { ...values, ...filters }
          },
          { onSuccess: (data) => onSuccess(data.dataIndex, data.pageNumber) }
        );
        queryClient.invalidateQueries('bookingorderan');
      }
    } catch (error: any) {
      if (error?.response?.status !== 400) {
        console.error(error);
      }
    } finally {
      dispatch(setProcessed());
    }
  };

  const onSubmitParty = async (values: jobPartyHeaderInput) => {
    clearError();
    try {
      dispatch(setProcessing());
      const newOrder = await createBookingMuatanParty(
        {
          ...values,
          ...filters // Kirim filter ke body/payload
        },
        {
          onSuccess: (data) => onSuccess(data.dataIndex, data.pageNumber)
        }
      );

      if (newOrder !== undefined && newOrder !== null) {
      }
      return;
    } catch (error: any) {
      if (error?.response?.status !== 400) {
        console.error(error);
      }
    } finally {
      dispatch(setProcessed());
    }
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
        user.id,
        'GridBookingMuatan',
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

      saveGridConfig(user.id, 'GridBookingMuatan', [...newOrder], columnsWidth);
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

  function handleCellClick(args: CellClickArgs<BookingOrderanMuatan>) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    const foundRow = rows.find((r) => r.id === clickedRow?.id);
    if (rowIndex !== -1 && foundRow) {
      setSelectedRow(rowIndex);
      dispatch(setHeaderData(foundRow));
    }
  }

  function getRowClass(row: BookingOrderanMuatan) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: BookingOrderanMuatan) {
    return row.id;
  }

  const prefetchPages = useCallback(
    async (
      pagesToFetch: number[],
      existingCache?: Map<number, BookingOrderanMuatan[]>,
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
            const data = await getAllBookingOrderanMuatanFn({
              ...filters,
              page: pageNum,
              limit: filters.limit
            });

            if (data?.data && data.data.length > 0) {
              streamBufferRef.current = new Map(streamBufferRef.current);
              streamBufferRef.current.set(pageNum, data.data);
            }
          } catch (err) {
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
      isLoadingBookingMuatan ||
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
          // Reset dulu supaya setCurrentPage(prevPage) pasti memicu refetch.
          setCurrentPage(0);
          setTimeout(() => setCurrentPage(prevPage), 0);
        }
      }
    }
  }

  async function handleKeyDown(
    args: CellKeyDownArgs<BookingOrderanMuatan>,
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
        handleRowSelect(selectedRowId); // Toggling the selection of the row
      }
    }
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      colTimersRef.current.forEach((t) => clearTimeout(t));
      colTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    setIsFirstLoad(true);
    loadGridConfig(
      user.id,
      'GridBookingMuatan',
      columns,
      setColumnsOrder,
      setColumnsWidth
    );
    dispatch(setUrlApproval('bookingorderanheader/approvalBooking'));
  }, []);

  useEffect(() => {
    if (onReload) {
      setFilters((prevFilters: Filter) => ({
        ...prevFilters,
        filters: {
          ...filterBookingOrderanMuatan,
          jenisOrderan: String(selectedJenisOrderan)
        }
      }));
    }
  }, [selectedJenisOrderan, selectedJenisOrderanNama]);

  useEffect(() => {
    if (isFirstLoad && gridRef.current && rows.length > 0) {
      setSelectedRow(0);
      gridRef.current.selectCell({ rowIdx: 0, idx: 1 });
      dispatch(setHeaderData(rows[0]));
      setIsFirstLoad(false);
    }
  }, [rows, isFirstLoad]);

  useEffect(() => {
    if (isFirstLoad) {
      if (
        selectedDate !== filters.filters.tglDari ||
        selectedDate2 !== filters.filters.tglSampai
      ) {
        //
        setFilters((prevFilters) => ({
          ...prevFilters,
          filters: {
            ...prevFilters.filters,
            tglDari: selectedDate,
            tglSampai: selectedDate2,
            jenisOrderan: String(selectedJenisOrderan)
          }
        }));
      }
    } else if (onReload) {
      // Jika onReload diklik, update filter tanggal
      if (
        selectedDate !== filters.filters.tglDari ||
        selectedDate2 !== filters.filters.tglSampai
      ) {
        //
        setFilters((prevFilters) => ({
          ...prevFilters,
          filters: {
            ...prevFilters.filters,
            tglDari: selectedDate,
            tglSampai: selectedDate2,
            jenisOrderan: String(selectedJenisOrderan)
          }
        }));
      }
    }
  }, [selectedDate, selectedDate2, filters, onReload, isFirstLoad]);

  // 1. Bulk Fetch — sekali ambil WINDOW_SIZE halaman, lalu dipecah ke cache.
  useEffect(() => {
    if (!shouldBulkFetch || !allDataBookingMuatan || isDataUpdated) return;

    const bulkData = allDataBookingMuatan.data || [];
    if (bulkData.length === 0) {
      setShouldBulkFetch(false);
      setIsFirstLoad(false);
      setIsFetching(false);
      setRows([]);
      return;
    }

    const pageSize = filters.limit;
    const wasJumpingToLast = jumpToLastRef.current;
    const newCache = new Map<number, BookingOrderanMuatan[]>();
    const logicalStartPage = bulkStartPage;

    for (let i = 0; i < WINDOW_SIZE; i++) {
      const pageData = bulkData.slice(i * pageSize, (i + 1) * pageSize);
      if (pageData.length > 0) newCache.set(logicalStartPage + i, pageData);
    }

    setPageDataCache(newCache);
    setVisiblePages(
      Array.from({ length: WINDOW_SIZE }, (_, i) => logicalStartPage + i)
    );

    const totalItems = allDataBookingMuatan.pagination?.totalItems || 0;
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
    allDataBookingMuatan,
    shouldBulkFetch,
    isDataUpdated,
    filters.limit,
    bulkStartPage
  ]);

  // 2. Pagination Fetch — hasil fetch satu halaman (buffer miss) masuk cache
  //    dan window digeser satu langkah.
  useEffect(() => {
    if (shouldBulkFetch || isDataUpdated || isFetchingManually) return;
    if (!allDataBookingMuatan) return;

    const newRows = allDataBookingMuatan.data || [];

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

    if (allDataBookingMuatan.pagination?.totalPages) {
      setTotalPages(allDataBookingMuatan.pagination.totalPages);
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
    allDataBookingMuatan,
    currentPage,
    filters,
    isDataUpdated,
    shouldBulkFetch
  ]);

  // 3. Row Combiner — gabungkan halaman yang sedang terlihat jadi `rows`.
  useEffect(() => {
    const combinedRows: BookingOrderanMuatan[] = [];
    visiblePages?.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (pageData) combinedRows.push(...pageData);
    });

    if (combinedRows.length === 0) return;

    setRows(combinedRows);

    // Fokus baris hasil simpan/hapus: cari BY-ID di data yang baru datang.
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
      // Window bergeser: kunci ulang index ke baris jangkar kalau masih ada.
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
    }
  }, [rows]);

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
    const rowData = rows[selectedRow];
    if (selectedRow !== null && rows.length > 0 && mode !== 'add') {
      forms.setValue('nobukti', rowData.nobukti);
      forms.setValue('tglbukti', rowData.tglbukti);
      forms.setValue('jenisorder_id', String(selectedJenisOrderan ?? ''));
      forms.setValue(
        'jenisorder_nama',
        selectedJenisOrderanNama || JENISORDERMUATANNAMA
      );
      forms.setValue('container_id', String(rowData?.container_id ?? ''));
      forms.setValue('container_nama', rowData?.container_nama);
      forms.setValue('shipper_id', String(rowData?.shipper_id ?? ''));
      forms.setValue('shipper_nama', rowData?.shipper_nama);
      forms.setValue('tujuankapal_id', String(rowData?.tujuankapal_id ?? ''));
      forms.setValue('tujuankapal_nama', rowData?.tujuankapal_nama);
      forms.setValue('marketing_id', String(rowData?.marketing_id ?? ''));
      forms.setValue('marketing_nama', rowData?.marketing_nama);
      forms.setValue('keterangan', rowData?.keterangan);
      forms.setValue('schedule_id', String(rowData?.schedule_id ?? ''));
      forms.setValue('schedule_nama', rowData?.schedule_nama);
      forms.setValue(
        'pelayarancontainer_id',
        String(rowData?.pelayarancontainer_id ?? '')
      );
      forms.setValue(
        'pelayarancontainer_nama',
        rowData?.pelayarancontainer_nama
      );
      forms.setValue('jenismuatan_id', String(rowData?.jenismuatan_id ?? ''));
      forms.setValue('jenismuatan_nama', rowData?.jenismuatan_nama);
      forms.setValue('sandarkapal_id', String(rowData?.sandarkapal_id ?? ''));
      forms.setValue('sandarkapal_nama', rowData?.sandarkapal_nama);
      forms.setValue('tradoluar', String(rowData?.tradoluar ?? ''));
      forms.setValue('tradoluar_nama', rowData?.tradoluar_nama);
      forms.setValue('nopolisi', rowData?.nopolisi);
      forms.setValue('nosp', rowData?.nosp);
      forms.setValue('nocontainer', rowData?.nocontainer);
      forms.setValue('noseal', rowData?.noseal);
      forms.setValue('lokasistuffing', String(rowData?.lokasistuffing ?? ''));
      forms.setValue('lokasistuffing_nama', rowData?.lokasistuffing_nama);
      forms.setValue(
        'nominalstuffing',
        rowData.nominalstuffing == null
          ? undefined
          : formatCurrency(rowData?.nominalstuffing)
      );
      forms.setValue('emkl_id', String(rowData?.emkl_id ?? ''));
      forms.setValue('emkllain_nama', rowData?.emkllain_nama);
      forms.setValue('asalmuatan', rowData?.asalmuatan);
      forms.setValue('daftarbl_id', String(rowData?.daftarbl_id ?? ''));
      forms.setValue('daftarbl_nama', rowData?.daftarbl_nama);
      forms.setValue('comodity', rowData?.comodity);
      forms.setValue('gandengan', rowData?.gandengan);
      forms.setValue('pisahbl', String(rowData?.pisahbl ?? ''));
      forms.setValue('pisahbl_nama', rowData?.pisahbl_nama);
      forms.setValue('jobptd', String(rowData?.jobptd ?? ''));
      forms.setValue('jobptd_nama', rowData?.jobptd_nama);
      forms.setValue('transit', String(rowData?.transit ?? ''));
      forms.setValue('transit_nama', rowData?.transit_nama);
      forms.setValue('stuffingdepo', String(rowData?.stuffingdepo ?? ''));
      forms.setValue('stuffingdepo_nama', rowData?.stuffingdepo_nama);
      forms.setValue('opendoor', String(rowData?.opendoor ?? ''));
      forms.setValue('opendoor_nama', rowData?.opendoor_nama);
      forms.setValue('batalmuat', String(rowData?.batalmuat ?? ''));
      forms.setValue('batalmuat_nama', rowData?.batalmuat_nama);
      forms.setValue('soc', String(rowData?.soc ?? ''));
      forms.setValue('soc_nama', rowData?.soc_nama);
      forms.setValue(
        'pengurusandoorekspedisilain',
        String(rowData?.pengurusandoor ?? '')
      );
      forms.setValue(
        'pengurusandoorekspedisilain_nama',
        rowData?.pengurusandoor_nama
      );
    } else {
      forms.setValue('nobukti', '');
      forms.setValue(
        'jenisorder_nama',
        selectedJenisOrderanNama || JENISORDERMUATANNAMA
      );
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
        forms.reset(); // Reset the form when the Escape key is pressed
        formsJobParty.reset();
        // formsJobParty.resetField('details');
        setMode(''); // Reset the mode to empty
        clearError();
        setPopOver(false);
        dispatch(clearOpenName());
        closeDialog();
        setReloadForm(false);
      }
    };

    // Add event listener for keydown when the component is mounted
    document.addEventListener('keydown', handleEscape);

    // Cleanup event listener when the component is unmounted or the effect is re-run
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [forms, formsJobParty]);

  useEffect(() => {
    // Memastikan refetch dilakukan saat filters berubah
    if (filters !== prevFilters) {
      refetch(); // Memanggil ulang API untuk mendapatkan data terbaru
      setPrevFilters(filters); // Simpan filters terbaru
    }
  }, [filters, refetch]); // Dependency array termasuk filters dan refetch

  useEffect(() => {
    if (isSubmitSuccessful) {
      // reset();
      // Pastikan fokus terjadi setelah repaint
      requestAnimationFrame(() => setFocus('tglbukti'));
    }
  }, [isSubmitSuccessful, setFocus]);

  useEffect(() => {
    if (successApproved) {
      setIsFirstLoad(true);
      setCheckedRows(new Set());
      setCurrentPage(1);
      setHasMore(true);
      resetBufferingCache();
      setFilters((prevFilters) => ({
        ...prevFilters,
        page: 1
      }));
    }
  }, [successApproved]);

  return (
    <div
      // PageUp/PageDown ditangkap di pembungkus, bukan di <DataGrid>:
      // react-data-grid tidak meneruskan prop DOM sembarangan, dan input
      // filter/search menelan event keyboard-nya sendiri.
      onKeyDownCapture={handleKeyDownCapture}
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
              gridName="GridBookingMuatan"
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
          renderers={{
            noRowsFallback: <EmptyRowsRenderer />
          }}
        />
        <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2">
          <ActionButton
            module="BOOKINGORDERANMUATAN"
            onAdd={handleAdd}
            checkedRows={checkedRows}
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
            rowsLength={rows.length}
            totalItems={
              allDataBookingMuatan
                ? allDataBookingMuatan.pagination.totalItems
                : 0
            }
            startRow={startRow}
            customActions={[
              {
                label: 'Print',
                icon: <FaPrint />,
                onClick: () => handleReport(),
                className: 'bg-cyan-500 hover:bg-cyan-700'
              }
              // {
              //   label: 'Lainnya',
              //   // icon: <FaPrint />,
              //   onClick: () => handleJobParty(),
              //   className: 'bg-cyan-500 hover:bg-cyan-700'
              // }
            ]}
          />
          {isLoadingBookingMuatan ? <LoadRowsRenderer /> : null}
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
                    'GridBookingMuatan',
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
      <FormBookingMuatan
        popOver={popOver}
        handleClose={handleClose}
        setPopOver={setPopOver}
        isLoadingUpdate={isLoadingUpdate}
        isLoadingDelete={isLoadingDelete}
        forms={forms}
        mode={mode}
        onSubmit={forms.handleSubmit(onSubmit as any, onInvalid)}
        isLoadingCreate={isLoadingCreate}
      />

      <FormJobParty
        forms={formsJobParty}
        handleClose={handleClose}
        setPopOver={setPopOver}
        reloadForm={reloadForm}
        setReloadForm={setReloadForm}
        // isLoadingUpdate={isLoadingUpdate}
        // isLoadingDelete={isLoadingDelete}
        // popOver={popOver}
        // mode={mode}
        onSubmit={formsJobParty.handleSubmit(onSubmitParty as any, onInvalid)}
        isLoadingCreate={isLoadingCreateParty}
      />
    </div>
  );
};

export default GridBookingMuatan;
