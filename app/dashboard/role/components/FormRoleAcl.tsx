/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import DataGrid, {
  CellClickArgs,
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import { ImSpinner2 } from 'react-icons/im';
import { useGetAllAcos } from '@/lib/server/useAcos';
import { getAllAcosFn } from '@/lib/apis/acos.api';
import { Checkbox } from '@/components/ui/checkbox';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useGetRoleAcl } from '@/lib/server/useRole';
import { FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { IoMdClose } from 'react-icons/io';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { useTheme } from 'next-themes';
import { debounce } from 'lodash';
import FilterInput from '@/components/custom-ui/FilterInput';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { IAcos } from '@/lib/types/acos.type';

interface Filter {
  page: number;
  limit: number;
  filters: {
    method: string;
    class: string;
    nama: string;
  };
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

type FilterKey = keyof Filter['filters'];

// Arsitektur grid mengikuti GridAlatbayar: window pagination + cache.
// - WINDOW_SIZE halaman hidup di grid sekaligus (pageDataCache)
// - STREAM_BUFFER_SIZE halaman berikutnya di-prefetch diam-diam (streamBuffer)
//   sehingga saat window digeser datanya sudah ada -> tanpa loading.
const WINDOW_SIZE = 5;
const STREAM_BUFFER_SIZE = 5;
const PAGE_SIZE = 50;
const ROW_HEIGHT = 27;
const THRESHOLD_ROWS = 50;

const FormRoleAcl = ({
  popOver,
  setPopOver,
  forms,
  onSubmit,
  deleteMode,
  handleClose,
  isLoadingCreate,
  isLoadingUpdate
}: any) => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const gridRef = useRef<DataGridHandle>(null);

  const [rows, setRows] = useState<IAcos[]>([]);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const selectedRowRef = useRef<number>(0);
  useEffect(() => {
    selectedRowRef.current = selectedRow;
  }, [selectedRow]);

  // --- Selection -----------------------------------------------------------
  // checkedRows disimpan sebagai Set<string> berisi ID ACO (bukan index baris),
  // jadi centang TIDAK ikut hilang saat window pagination bergeser / baris
  // di-recycle dari cache. Semua pembacaan & penulisan memakai String(id) agar
  // tidak ada campur aduk number/string seperti implementasi sebelumnya
  // (handleSelectAll menyimpan string tapi checkbox membaca number -> centang
  // tampak hilang).
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const checkedRowsRef = useRef<Set<string>>(checkedRows);
  useEffect(() => {
    checkedRowsRef.current = checkedRows;
  }, [checkedRows]);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const hasSeededCheckedRef = useRef(false);
  // SAVE diblokir sampai ACL yang sudah tersimpan selesai dimuat. Backend
  // mengartikan data kosong sebagai "hapus semua ACL role ini", jadi menyimpan
  // sebelum seeding selesai (mis. request /roleacl masih jalan atau gagal)
  // akan menghapus seluruh hak akses role tanpa disengaja.
  const [hasSeededChecked, setHasSeededChecked] = useState(false);
  // Daftar seluruh ID yang cocok dengan filter aktif (untuk "select all"),
  // di-cache per kombinasi filter supaya tidak fetch berulang.
  const allIdsCacheRef = useRef<{ key: string; ids: string[] } | null>(null);

  const roleaclDetail = useSelector((state: RootState) => state.roleacl.value);
  const { data: roleacl } = useGetRoleAcl(roleaclDetail?.id as string);

  // --- Window pagination + cache -------------------------------------------
  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: PAGE_SIZE,
    filters: {
      method: '',
      class: '',
      nama: ''
    },
    sortBy: 'class',
    sortDirection: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkStartPage, setBulkStartPage] = useState(1);
  const [shouldBulkFetch, setShouldBulkFetch] = useState(true);
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5]);
  const [pageDataCache, setPageDataCache] = useState<Map<number, IAcos[]>>(
    new Map()
  );
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const streamBufferRef = useRef<Map<number, IAcos[]>>(new Map());
  const prefetchingPagesRef = useRef<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollAdjustment = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPageTransitionRef = useRef(false);
  // Ditandai oleh aksi yang memulai ulang data (filter/sort/reset) supaya Row
  // Combiner tahu kapan boleh memindahkan fokus ke baris pertama. Tanpa flag
  // ini, setiap refetch background akan menarik fokus balik ke baris 1.
  const resetFocusRef = useRef(true);
  const activeFilterInputRef = useRef<HTMLElement | null>(null);
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const interactionModeRef = useRef<'keyboard' | 'pointer'>('pointer');
  const reanchorFromKeyboardRef = useRef(false);

  const minVisiblePage = useMemo(
    () => (visiblePages.length > 0 ? Math.min(...visiblePages) : 1),
    [visiblePages]
  );
  const effectiveLimit = shouldBulkFetch
    ? filters.limit * WINDOW_SIZE
    : filters.limit;

  const { data: acos, isLoading: isLoadingAcos } = useGetAllAcos(
    {
      ...filters,
      page: shouldBulkFetch ? bulkStartPage : currentPage,
      limit: effectiveLimit
    },
    popOver
  );

  const resetBufferingCache = useCallback(() => {
    setShouldBulkFetch(true);
    setBulkStartPage(1);
    setPageDataCache(new Map());
    setVisiblePages(Array.from({ length: WINDOW_SIZE }, (_, i) => i + 1));
    setCurrentPage(1);
    setTotalPages(1);
    setIsFetching(false);
    setIsTransitioning(false);
    setRows([]);
    setSelectedRow(0);
    selectedRowRef.current = 0;
    streamBufferRef.current = new Map();
    prefetchingPagesRef.current = new Set();
    pendingScrollAdjustment.current = 0;
    isPageTransitionRef.current = false;
    resetFocusRef.current = true;
  }, []);

  // Saat window bergeser, index tiap baris di array `rows` ikut bergeser
  // sebanyak jumlah baris halaman yang keluar dari window. Geser index baris
  // terpilih agar tetap menunjuk data yang sama. setSelectedRow ditunda ke Row
  // Combiner supaya commit-nya bersamaan dengan setRows (highlight tidak
  // berkedip).
  const shiftSelectionForWindow = (deltaRows: number) => {
    selectedRowRef.current = Math.max(0, selectedRowRef.current + deltaRows);
    reanchorFromKeyboardRef.current = interactionModeRef.current === 'keyboard';
  };

  const prefetchPages = useCallback(
    async (pagesToFetch: number[], knownTotalPages?: number) => {
      const effectiveTotalPages = knownTotalPages ?? totalPages;

      const validPages = pagesToFetch.filter(
        (p) =>
          p >= 1 &&
          p <= effectiveTotalPages &&
          !streamBufferRef.current.has(p) &&
          !prefetchingPagesRef.current.has(p)
      );
      if (validPages.length === 0) return;

      validPages.forEach((p) => prefetchingPagesRef.current.add(p));

      await Promise.allSettled(
        validPages.map(async (pageNum) => {
          try {
            const data = await getAllAcosFn({
              ...filters,
              page: pageNum,
              limit: filters.limit
            });
            if (data?.data && data.data.length > 0) {
              streamBufferRef.current = new Map(streamBufferRef.current);
              streamBufferRef.current.set(pageNum, data.data);
            }
          } catch (err) {
            // Silent fail — prefetch gagal cukup jatuh ke fetch normal.
            console.warn(`[AcosBuffer] Prefetch page ${pageNum} gagal:`, err);
          } finally {
            prefetchingPagesRef.current.delete(pageNum);
          }
        })
      );
    },
    [filters, totalPages]
  );

  // --- Selection handlers --------------------------------------------------
  const applyChecked = useCallback(
    (updated: Set<string>) => {
      setCheckedRows(updated);
      checkedRowsRef.current = updated;
      // ID ACO dikirim apa adanya sebagai string (varchar uuid v7). JANGAN
      // di-Number(): hasilnya NaN, dan array kosong/NaN membuat backend
      // menghapus seluruh ACL role (roleacl.service -> acoIds.length === 0).
      forms.setValue('data', Array.from(updated));
    },
    [forms]
  );

  const handleRowSelect = useCallback(
    (rowId: string | number) => {
      const key = String(rowId);
      const updated = new Set(checkedRowsRef.current);
      if (updated.has(key)) {
        updated.delete(key);
      } else {
        updated.add(key);
      }
      applyChecked(updated);
    },
    [applyChecked]
  );

  const getAllFilteredIds = useCallback(async () => {
    const key = JSON.stringify(filters.filters);
    if (allIdsCacheRef.current?.key === key) return allIdsCacheRef.current.ids;

    // limit 0 = tanpa pagination di backend -> seluruh baris yang cocok filter.
    const res = await getAllAcosFn({ ...filters, page: 1, limit: 0 });
    const ids = (res?.data ?? []).map((row) => String(row.id));
    allIdsCacheRef.current = { key, ids };
    return ids;
  }, [filters]);

  const isAllSelected = useMemo(
    () =>
      rows.length > 0 && rows.every((row) => checkedRows.has(String(row.id))),
    [rows, checkedRows]
  );

  // Checkbox header memilih SEMUA baris yang cocok filter aktif (lintas
  // halaman), bukan hanya yang kebetulan ada di window — sebelumnya baris di
  // halaman lain tidak ikut tercentang dan hasilnya hilang saat disimpan.
  const handleSelectAll = useCallback(async () => {
    if (isSelectingAll) return;
    const shouldSelect = !isAllSelected;
    setIsSelectingAll(true);
    try {
      const ids = await getAllFilteredIds();
      const updated = new Set(checkedRowsRef.current);
      ids.forEach((id) => {
        if (shouldSelect) {
          updated.add(id);
        } else {
          updated.delete(id);
        }
      });
      applyChecked(updated);
    } catch (err) {
      console.error('Gagal mengambil seluruh ID ACOS:', err);
    } finally {
      setIsSelectingAll(false);
    }
  }, [applyChecked, getAllFilteredIds, isAllSelected, isSelectingAll]);

  // --- Filter & sort -------------------------------------------------------
  const pendingUpdates = useRef<Record<string, string>>({});
  const debouncedFilterUpdate = useRef(
    debounce((updates: Record<string, string>) => {
      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, ...updates },
        page: 1
      }));
      resetBufferingCache();
    }, 300)
  ).current;

  const handleFilterInputChange = useCallback(
    (colKey: FilterKey, value: string) => {
      pendingUpdates.current[colKey] = value;
      const active = document.activeElement as HTMLElement | null;
      if (active && active.classList.contains('filter-input')) {
        activeFilterInputRef.current = active;
      }
      debouncedFilterUpdate(pendingUpdates.current);
    },
    [debouncedFilterUpdate]
  );

  const handleClearFilter = useCallback(
    (colKey: FilterKey) => {
      debouncedFilterUpdate.cancel();
      pendingUpdates.current[colKey] = '';
      activeFilterInputRef.current = inputColRefs.current[colKey] ?? null;
      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, [colKey]: '' },
        page: 1
      }));
      resetBufferingCache();
    },
    [debouncedFilterUpdate, resetBufferingCache]
  );

  const handleClearAllFilters = useCallback(() => {
    debouncedFilterUpdate.cancel();
    pendingUpdates.current = { method: '', class: '', nama: '' };
    activeFilterInputRef.current = null;
    setFilters((prev) => ({
      ...prev,
      filters: { method: '', class: '', nama: '' },
      page: 1
    }));
    resetBufferingCache();
  }, [debouncedFilterUpdate, resetBufferingCache]);

  const handleSort = useCallback(
    (column: string) => {
      activeFilterInputRef.current = null;
      setFilters((prev) => ({
        ...prev,
        sortBy: column,
        sortDirection:
          prev.sortBy === column && prev.sortDirection === 'asc'
            ? 'desc'
            : 'asc',
        page: 1
      }));
      resetBufferingCache();
    },
    [resetBufferingCache]
  );

  const columns = useMemo((): Column<IAcos>[] => {
    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 50,
        resizable: true,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full flex-col items-center gap-1">
            <div className="headers-cell h-[50%] items-center justify-center text-center">
              <p className="text-sm font-normal">No.</p>
            </div>
            <div
              className="flex h-[50%] w-full cursor-pointer items-center justify-center"
              onClick={handleClearAllFilters}
            >
              <FaTimes className="bg-red-500 text-white" />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const localIndex = rows.findIndex((row) => row.id === props.row.id);
          const absoluteNumber =
            localIndex === -1
              ? '—'
              : (minVisiblePage - 1) * filters.limit + localIndex + 1;
          return (
            <div className="flex h-full w-full cursor-pointer items-center justify-center text-xs">
              {absoluteNumber}
            </div>
          );
        }
      },
      {
        key: 'select',
        name: 'Select',
        width: 50,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full flex-col items-center gap-1">
            <div className="headers-cell h-[50%]"></div>
            <div className="flex h-[50%] w-full items-center justify-center">
              {isSelectingAll ? (
                <ImSpinner2 className="mb-2 animate-spin text-primary" />
              ) : (
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={() => void handleSelectAll()}
                  id="header-checkbox"
                  className="mb-2"
                />
              )}
            </div>
          </div>
        ),
        renderCell: ({ row }: { row: IAcos }) => (
          <div className="flex h-full items-center justify-center">
            <Checkbox
              checked={checkedRows.has(String(row.id))}
              onCheckedChange={() => handleRowSelect(row.id)}
              id={`row-checkbox-${row.id}`}
            />
          </div>
        )
      },
      {
        key: 'class',
        name: 'CLASS',
        resizable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('class')}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'class' ? 'font-bold' : 'font-normal'
                }`}
              >
                CLASS
              </p>
              <div className="ml-2">
                {filters.sortBy === 'class' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'class' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <FilterInput
              colKey="class"
              value={filters.filters.class || ''}
              onChange={(value) => handleFilterInputChange('class', value)}
              onClear={() => handleClearFilter('class')}
              inputRef={(el) => {
                inputColRefs.current['class'] = el;
              }}
            />
          </div>
        ),
        renderCell: (props: any) => (
          <div className="m-0 flex h-full cursor-pointer items-center p-0 text-xs">
            {highlightText(props.row.class || '', '', filters.filters.class)}
          </div>
        )
      },
      {
        key: 'method',
        name: 'Method',
        resizable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('method')}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'method' ? 'font-bold' : 'font-normal'
                }`}
              >
                Method
              </p>
              <div className="ml-2">
                {filters.sortBy === 'method' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'method' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <FilterInput
              colKey="method"
              value={filters.filters.method || ''}
              onChange={(value) => handleFilterInputChange('method', value)}
              onClear={() => handleClearFilter('method')}
              inputRef={(el) => {
                inputColRefs.current['method'] = el;
              }}
            />
          </div>
        ),
        renderCell: (props: any) => (
          <div className="m-0 flex h-full cursor-pointer items-center p-0 text-xs">
            {highlightText(props.row.method || '', '', filters.filters.method)}
          </div>
        )
      },
      {
        key: 'nama',
        name: 'Nama',
        resizable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('nama')}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nama' ? 'font-bold' : 'font-normal'
                }`}
              >
                Nama
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nama' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'nama' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <FilterInput
              colKey="nama"
              value={filters.filters.nama || ''}
              onChange={(value) => handleFilterInputChange('nama', value)}
              onClear={() => handleClearFilter('nama')}
              inputRef={(el) => {
                inputColRefs.current['nama'] = el;
              }}
            />
          </div>
        ),
        renderCell: (props: any) => (
          <div className="m-0 flex h-full cursor-pointer items-center p-0 text-xs">
            {highlightText(props.row.nama || '', '', filters.filters.nama)}
          </div>
        )
      }
    ];
  }, [
    filters,
    rows,
    checkedRows,
    isAllSelected,
    isSelectingAll,
    minVisiblePage,
    handleClearAllFilters,
    handleClearFilter,
    handleFilterInputChange,
    handleRowSelect,
    handleSelectAll,
    handleSort
  ]);

  // --- Scroll --------------------------------------------------------------
  // Geser window saat mendekati ujung atas/bawah. Halaman yang sudah ada di
  // streamBuffer masuk seketika (tanpa loading); kalau meleset baru fetch.
  async function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (
      !popOver ||
      isLoadingAcos ||
      rows.length === 0 ||
      isTransitioning ||
      isFetching
    )
      return;

    const { currentTarget } = event;
    const scrollTop = currentTarget.scrollTop;
    const clientHeight = currentTarget.clientHeight;

    if (Math.abs(scrollTop - lastScrollTopRef.current) <= 5) return;

    lastScrollTopRef.current = scrollTop;
    isScrollingRef.current = true;
    scrollContainerRef.current = currentTarget;

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 150);

    const firstVisibleRow = Math.floor(scrollTop / ROW_HEIGHT);
    const lastVisibleRow = Math.floor((scrollTop + clientHeight) / ROW_HEIGHT);

    // --- SCROLL KE BAWAH ---
    if (rows.length - lastVisibleRow <= THRESHOLD_ROWS) {
      const nextPage = Math.max(...visiblePages) + 1;

      if (nextPage <= totalPages && isScrollingRef.current) {
        if (streamBufferRef.current.has(nextPage)) {
          setIsFetching(true);
          setIsTransitioning(true);

          const bufferedData = streamBufferRef.current.get(nextPage)!;
          streamBufferRef.current = new Map(streamBufferRef.current);
          streamBufferRef.current.delete(nextPage);

          isPageTransitionRef.current = true;
          const removedPage = visiblePages[0];
          const removedCount =
            pageDataCache.get(removedPage)?.length ?? filters.limit;
          pendingScrollAdjustment.current = -(removedCount * ROW_HEIGHT);
          shiftSelectionForWindow(-removedCount);

          setPageDataCache((prev) => {
            const updated = new Map(prev);
            updated.set(nextPage, bufferedData);
            updated.delete(removedPage);
            return updated;
          });
          setVisiblePages((prevVisible) => [...prevVisible.slice(1), nextPage]);
          setCurrentPage(nextPage);

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
          setCurrentPage(nextPage);
        }
      }
    }

    // --- SCROLL KE ATAS ---
    if (firstVisibleRow <= THRESHOLD_ROWS) {
      const prevPage = Math.min(...visiblePages) - 1;

      if (prevPage >= 1 && isScrollingRef.current) {
        if (streamBufferRef.current.has(prevPage)) {
          setIsFetching(true);
          setIsTransitioning(true);

          const bufferedData = streamBufferRef.current.get(prevPage)!;
          streamBufferRef.current = new Map(streamBufferRef.current);
          streamBufferRef.current.delete(prevPage);

          isPageTransitionRef.current = true;
          const addedCount = bufferedData.length;
          pendingScrollAdjustment.current = addedCount * ROW_HEIGHT;
          shiftSelectionForWindow(addedCount);

          const removedPage = visiblePages[visiblePages.length - 1];
          setPageDataCache((prev) => {
            const updated = new Map(prev);
            updated.set(prevPage, bufferedData);
            updated.delete(removedPage);
            return updated;
          });
          setVisiblePages((prevVisible) => [
            prevPage,
            ...prevVisible.slice(0, WINDOW_SIZE - 1)
          ]);
          setCurrentPage(prevPage);

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
          // Reset ke 0 dulu agar setCurrentPage(prevPage) pasti memicu refetch
          // walau nilainya sama dengan currentPage yang sudah basi.
          setCurrentPage(0);
          setTimeout(() => setCurrentPage(prevPage), 0);
        }
      }
    }
  }

  function handleCellClick(args: CellClickArgs<IAcos>) {
    const rowIndex = rows.findIndex((r) => r.id === args.row.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
      selectedRowRef.current = rowIndex;
    }
  }

  async function handleKeyDown(
    args: CellKeyDownArgs<IAcos>,
    event: React.KeyboardEvent
  ) {
    const visibleRowCount = 10;

    if (event.key === ' ' || event.key === 'Enter') {
      const row = rows[selectedRowRef.current];
      if (row) {
        event.preventDefault();
        handleRowSelect(row.id);
      }
      return;
    }

    const move = (delta: number) => {
      setSelectedRow((prev) => {
        const next = Math.min(Math.max(prev + delta, 0), rows.length - 1);
        selectedRowRef.current = next;
        return next;
      });
    };

    if (event.key === 'ArrowDown') move(1);
    else if (event.key === 'ArrowUp') move(-1);
    else if (event.key === 'PageDown') move(visibleRowCount - 1);
    else if (event.key === 'PageUp') move(-(visibleRowCount - 1));
  }

  function getRowClass(row: IAcos) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: IAcos) {
    return row.id;
  }

  // --- Seed centang dari data role yang tersimpan ---------------------------
  // Hanya sekali tiap modal dibuka. Kalau di-seed ulang setiap `roleacl`
  // berubah (refetch/invalidate), centang yang sedang dikerjakan user akan
  // tertimpa — inilah salah satu penyebab "yang diselect hilang".
  useEffect(() => {
    if (!popOver) {
      hasSeededCheckedRef.current = false;
      setHasSeededChecked(false);
      return;
    }
    if (hasSeededCheckedRef.current || !roleacl?.data) return;
    hasSeededCheckedRef.current = true;
    applyChecked(new Set(roleacl.data.map((item: any) => String(item.id))));
    setHasSeededChecked(true);
  }, [popOver, roleacl, applyChecked]);

  // --- 1. Bulk fetch (window pertama) --------------------------------------
  useEffect(() => {
    if (!popOver || !shouldBulkFetch || !acos) return;

    const bulkData: IAcos[] = acos.data || [];
    const pageSize = filters.limit;
    const logicalStartPage = (bulkStartPage - 1) * WINDOW_SIZE + 1;

    const newCache = new Map<number, IAcos[]>();
    for (let i = 0; i < WINDOW_SIZE; i++) {
      const pageData = bulkData.slice(i * pageSize, i * pageSize + pageSize);
      if (pageData.length > 0) newCache.set(logicalStartPage + i, pageData);
    }

    // Backend menghitung total TANPA memakai filter kolom (acos.service
    // findAll), jadi totalPages dari server bisa over-estimate saat difilter.
    // Clamp ke halaman terakhir yang benar-benar berisi data supaya window
    // tidak pernah digeser ke halaman kosong.
    const serverTotalPages = Math.ceil(
      (acos.pagination?.totalItems ?? 0) / pageSize
    );
    const lastFilledPage =
      logicalStartPage + Math.max(Math.ceil(bulkData.length / pageSize), 1) - 1;
    const totalPgs =
      bulkData.length < pageSize * WINDOW_SIZE
        ? lastFilledPage
        : Math.max(serverTotalPages, lastFilledPage);

    setPageDataCache(newCache);
    setVisiblePages(
      Array.from({ length: WINDOW_SIZE }, (_, i) => logicalStartPage + i)
    );
    setTotalPages(Math.max(totalPgs, 1));
    setCurrentPage(logicalStartPage);
    setShouldBulkFetch(false);
    setIsFetching(false);

    const lastLogicalPage = Math.min(
      logicalStartPage + WINDOW_SIZE - 1,
      totalPgs
    );
    const initialPrefetch = Array.from(
      { length: STREAM_BUFFER_SIZE },
      (_, i) => lastLogicalPage + 1 + i
    ).filter((p) => p <= totalPgs);
    if (initialPrefetch.length > 0) prefetchPages(initialPrefetch, totalPgs);
  }, [acos, shouldBulkFetch, popOver, filters.limit, bulkStartPage]);

  // --- 2. Pagination fetch & pergeseran window -----------------------------
  useEffect(() => {
    if (!popOver || shouldBulkFetch || !acos) return;

    const newRows: IAcos[] = acos.data || [];
    const maxVisible = Math.max(...visiblePages);
    const minVisible = Math.min(...visiblePages);

    // Halaman kosong = sudah lewat akhir data. Jangan geser window (kalau
    // digeser, baris malah hilang), cukup perbaiki batas totalPages.
    if (newRows.length === 0) {
      if (currentPage > maxVisible) setTotalPages(maxVisible);
      setIsTransitioning(false);
      setIsFetching(false);
      return;
    }

    setPageDataCache((prev) => {
      const updated = new Map(prev);
      updated.set(currentPage, newRows);
      return updated;
    });

    if (newRows.length < filters.limit) {
      setTotalPages(Math.max(currentPage, 1));
    } else if (acos.pagination?.totalPages) {
      setTotalPages(Math.max(acos.pagination.totalPages, currentPage));
    }

    if (currentPage > maxVisible && currentPage <= maxVisible + 1) {
      isPageTransitionRef.current = true;
      const removedPage = visiblePages[0];
      const removedCount =
        pageDataCache.get(removedPage)?.length ?? filters.limit;
      pendingScrollAdjustment.current = -(removedCount * ROW_HEIGHT);
      shiftSelectionForWindow(-removedCount);

      setPageDataCache((prev) => {
        const updated = new Map(prev);
        updated.delete(removedPage);
        return updated;
      });
      setVisiblePages((prevVisible) => [...prevVisible.slice(1), currentPage]);
    } else if (currentPage < minVisible && currentPage >= minVisible - 1) {
      isPageTransitionRef.current = true;
      const removedPage = visiblePages[visiblePages.length - 1];
      pendingScrollAdjustment.current = newRows.length * ROW_HEIGHT;
      shiftSelectionForWindow(newRows.length);

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

    setTimeout(() => {
      setIsTransitioning(false);
      setIsFetching(false);

      const isScrollDown = currentPage >= maxVisible;
      const pagesToPrefetch = isScrollDown
        ? Array.from(
            { length: STREAM_BUFFER_SIZE },
            (_, i) => currentPage + 1 + i
          )
        : Array.from(
            { length: STREAM_BUFFER_SIZE },
            (_, i) => currentPage - 1 - i
          ).filter((p) => p >= 1);

      if (pagesToPrefetch.length > 0) {
        setTimeout(() => prefetchPages(pagesToPrefetch), 200);
      }
    }, 100);
  }, [acos, currentPage, filters, shouldBulkFetch, popOver]);

  // --- 3. Row combiner (cache -> rows) -------------------------------------
  useEffect(() => {
    const combinedRows: IAcos[] = [];
    visiblePages.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (pageData) combinedRows.push(...pageData);
    });
    if (combinedRows.length === 0) return;

    setRows(combinedRows);

    if (isPageTransitionRef.current) {
      isPageTransitionRef.current = false;
      // Commit index yang sudah digeser bersamaan dengan setRows agar highlight
      // menunjuk baris data yang sama dalam satu render (tidak berkedip).
      const target = Math.min(
        Math.max(selectedRowRef.current, 0),
        combinedRows.length - 1
      );
      selectedRowRef.current = target;
      setSelectedRow(target);
      return;
    }

    if (resetFocusRef.current) {
      resetFocusRef.current = false;
      selectedRowRef.current = 0;
      setSelectedRow(0);
      const inputToRestore = activeFilterInputRef.current;
      setTimeout(() => {
        gridRef.current?.scrollToCell?.({ rowIdx: 0, idx: 1 });
        gridRef.current?.selectCell?.({ rowIdx: 0, idx: 1 });
        if (inputToRestore && document.contains(inputToRestore)) {
          requestAnimationFrame(() =>
            inputToRestore.focus({ preventScroll: true })
          );
        }
      }, 50);
    }
  }, [visiblePages, pageDataCache]);

  // Kompensasi scrollTop saat window bergeser supaya baris yang sedang dilihat
  // tetap di posisi visual yang sama (tidak "melompat").
  useLayoutEffect(() => {
    if (pendingScrollAdjustment.current === 0 || !scrollContainerRef.current)
      return;

    const container = scrollContainerRef.current;
    container.scrollTop += pendingScrollAdjustment.current;
    lastScrollTopRef.current = container.scrollTop;
    pendingScrollAdjustment.current = 0;

    // Sel aktif hanya di-anchor ulang kalau pergeseran berasal dari keyboard;
    // saat mouse scroll, sel aktif tidak boleh ikut pindah.
    if (reanchorFromKeyboardRef.current) {
      gridRef.current?.selectCell?.({
        rowIdx: selectedRowRef.current,
        idx: 1
      });
    }
    reanchorFromKeyboardRef.current = false;
  }, [rows]);

  useEffect(() => {
    return () => {
      debouncedFilterUpdate.cancel();
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [debouncedFilterUpdate]);

  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">Role ACL Form</h2>
          <div
            className="cursor-pointer rounded-md border border-zinc-200 bg-red-500 p-0 hover:bg-red-400"
            onClick={() => {
              setPopOver(false);
              handleClose();
            }}
          >
            <IoMdClose className="h-5 w-5 font-bold text-white" />
          </div>
        </div>
        <div className="h-full flex-1 overflow-y-auto bg-background-card pl-1 pr-2">
          <div className="h-full bg-background-card px-5 py-3">
            <Form {...forms}>
              <form onSubmit={onSubmit} className="flex h-full flex-col gap-6">
                <div className="grid grid-cols-1 gap-2">
                  <FormField
                    name="rolename"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">
                          Nama Role
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={roleaclDetail?.rolename}
                            type="text"
                            readOnly={true}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div
                  className="flex h-[500px] w-full flex-col rounded-sm border border-border bg-background"
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
                    <p className="font-bold">ACOS</p>
                    <div className="flex flex-row items-center gap-2">
                      {isLoadingAcos || isFetching || !hasSeededChecked ? (
                        <ImSpinner2 className="animate-spin text-primary" />
                      ) : null}
                      <p className="text-xs">
                        {hasSeededChecked
                          ? `${checkedRows.size} baris terpilih`
                          : 'Memuat ACL tersimpan...'}
                      </p>
                    </div>
                  </div>
                  <DataGrid
                    ref={gridRef}
                    columns={columns}
                    rows={rows}
                    rowKeyGetter={rowKeyGetter}
                    rowClass={getRowClass}
                    onCellClick={handleCellClick}
                    headerRowHeight={70}
                    rowHeight={ROW_HEIGHT}
                    className={`${isDark ? 'rdg-dark' : 'rdg-light'} fill-grid`}
                    enableVirtualization={true}
                    onScroll={handleScroll}
                    onCellKeyDown={handleKeyDown}
                    renderers={{
                      noRowsFallback: <EmptyRowsRenderer />
                    }}
                  />
                </div>
              </form>
            </Form>
          </div>
        </div>
        <FormFooterButtons
          mode={deleteMode ? 'delete' : 'add'}
          onSave={onSubmit}
          onCancel={handleClose}
          isLoadingCreate={isLoadingCreate}
          isLoadingUpdate={isLoadingUpdate}
          saveDisabled={!hasSeededChecked}
          hideSaveAndAdd
        />
      </DialogContent>
    </Dialog>
  );
};

export default FormRoleAcl;
