'use client';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
  memo
} from 'react';
import 'react-data-grid/lib/styles.scss';

import DataGrid, {
  CellClickArgs,
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
// Untuk types, import langsung (types tidak affect runtime)

import { ImSpinner2 } from 'react-icons/im';
import ActionButton from '@/components/custom-ui/ActionButton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormMenu from './FormMenu';
import { useQueryClient } from 'react-query';
import { MenuInput, menuSchema } from '@/lib/validations/menu.validation';

import {
  useCreateMenu,
  useDeleteMenu,
  useGetMenu,
  useUpdateMenu
} from '@/lib/server/useMenu';

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
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { useTheme } from 'next-themes';
import { useDispatch } from 'react-redux';
import { Checkbox } from '@/components/ui/checkbox';
import { useAlert } from '@/lib/store/client/useAlert';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import IcClose from '@/public/image/x.svg';
import { setHeaderData } from '@/lib/store/headerSlice/headerSlice';
import { IMenu } from '@/lib/types/menu.type';
import { number } from 'zod';
import {
  clearOpenName,
  setClearLookup
} from '@/lib/store/lookupSlice/lookupSlice';
import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import { useFormError } from '@/lib/hooks/formErrorContext';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { debounce } from 'lodash';
import FilterInput from '@/components/custom-ui/FilterInput';
import {
  cancelPreviousRequest,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';

import {
  exportMenuBySelectFn,
  getMenuFn,
  reportMenuBySelectFn
} from '@/lib/apis/menu.api';
import { generateMenuExportFn } from '@/lib/apis/report.api';
import { useReportPdfContext } from '@/hooks/ReportPdfProvider';
import { syncAcosFn } from '@/lib/apis/acos.api';
import { useReportProgress } from '@/components/custom-ui/ReportProgressProvider';
import { loadStimulsoftScript } from '@/lib/loadStimulsoft';

interface Filter {
  page: number;
  limit: number;
  search: string;

  filters: {
    title: string;
    // Kolom turunan JOIN: yang difilter/di-sort adalah JUDUL parent
    // (parent.title), bukan id-nya — id parent berupa uuid yang tidak berarti
    // buat user. Backend memetakan key ini ke parent.title.
    parent_nama: string;
    icon: string;
    created_at: string;
    updated_at: string;
    statusaktif?: string;
    modifiedby?: string;
  };
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const EMPTY_FILTERS: Filter['filters'] = {
  title: '',
  parent_nama: '',
  icon: '',
  created_at: '',
  updated_at: '',
  statusaktif: '',
  modifiedby: ''
};

const GridMenu = () => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const [totalPages, setTotalPages] = useState(1);
  const [popOver, setPopOver] = useState<boolean>(false);
  // Dinaikkan setiap "Save & Add" untuk me-remount form (Dialog) agar semua
  // LookUp re-init dari nilai form hasil resetAddForm -> STATUS AKTIF kembali
  // ke "AKTIF" dan field lain kosong. Tanpa ini, modal yang tetap terbuka
  // membuat LookUp memakai state lama (tampilan status aktif kosong).
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
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(
    null
  );
  // Tambah ref baru di dekat ref lainnya
  const pendingSelectIdxRef = useRef<number>(1); // default ke idx 1 (skip nomor/select)
  const suppressScrollRef = useRef(false);
  const isPageTransitionRef = useRef(false);
  const { start } = useReportProgress();
  const { generateExport } = useReportPdfContext();

  const lastScrollTopRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingScrollAdjustment = useRef<number>(0);
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5]);
  const minVisiblePage = useMemo(
    () => Math.min(...visiblePages),
    [visiblePages]
  );
  const [pageDataCache, setPageDataCache] = useState<Map<number, IMenu[]>>(
    new Map()
  );

  const { mutateAsync: createMenu, isLoading: isLoadingCreate } =
    useCreateMenu();
  const { mutateAsync: updateMenu, isLoading: isLoadingUpdate } =
    useUpdateMenu();
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastDispatchedId = useRef<number | null>(null);
  const { mutateAsync: deleteMenu, isLoading: isLoadingDelete } =
    useDeleteMenu();
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
  const queryClient = useQueryClient();
  const [bulkStartPage, setBulkStartPage] = useState(1);

  const [isFetchingManually, setIsFetchingManually] = useState(false);
  const [rows, setRows] = useState<IMenu[]>([]);
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const prevPageRef = useRef(currentPage);
  const dispatch = useDispatch();
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const { alert } = useAlert();
  const { user, cabang_id } = useSelector((state: RootState) => state.auth);
  const getLookup = useSelector((state: RootState) => state.lookup.data);
  const selectedRowRef = useRef<number>(0);
  useEffect(() => {
    selectedRowRef.current = selectedRow;
  }, [selectedRow]);
  // ID baris yang baru disimpan (add/edit). Dipakai Row Combiner untuk
  // memfokuskan baris itu BERDASARKAN ID (bukan index) setelah data window
  // settle -- index bisa meleset karena window pagination ikut bergeser saat
  // re-render. Selama ref ini ter-set, Combiner TIDAK menjalankan scroll-ke-
  // row-0 (cabang else) yang memicu handleScroll menggeser window.
  const pendingFocusIdRef = useRef<string | null>(null);
  // Diset true selama window settle pasca-mutasi (add/edit) untuk memblokir
  // data-effect memproses ulang hasil refetch (yang menimpa fokus ke baris 0).
  // Ref (bukan state) supaya reset-nya TIDAK memicu ulang effect.
  const suppressRefetchRef = useRef(false);
  const activeFilterInputRef = useRef<HTMLElement | null>(null);
  const [selectedCellKey, setSelectedCellKey] = useState<string>('nomor');
  const streamBufferRef = useRef<Map<number, IMenu[]>>(new Map());
  const prefetchingPagesRef = useRef<Set<string>>(new Set());
  const STREAM_BUFFER_SIZE = 5;
  const WINDOW_SIZE = 5;
  const ROW_HEIGHT = 27;
  const jumpToLastRef = useRef(false);
  const jumpToFirstRef = useRef(false);
  // Modalitas input terakhir: 'keyboard' (Arrow/Page) atau 'pointer' (wheel/drag
  // scrollbar). Dipakai utk menentukan apakah selectCell harus di-re-anchor
  // ke baris data yg sama setelah window-shift.
  const interactionModeRef = useRef<'keyboard' | 'pointer'>('pointer');
  // Diset saat window benar-benar bergeser (shiftSelectionForWindow). Menandai
  // apakah pergeseran itu dari keyboard, sehingga useLayoutEffect tahu apakah
  // perlu re-anchor selectCell. Mouse scroll TIDAK boleh memindahkan sel aktif.
  const reanchorFromKeyboardRef = useRef(false);

  // Saat window pagination bergeser (halaman atas/bawah keluar dari window),
  // index setiap baris di array `rows` ikut bergeser sebanyak filters.limit.
  // Fungsi ini menjaga agar baris DATA yang sama tetap ter-select dengan HANYA
  // menggeser index (selectedRowRef) -- highlight digambar via getRowClass.
  // Posisi visual dijaga oleh kompensasi scrollTop (pendingScrollAdjustment),
  // jadi kita TIDAK memanggil selectCell/scrollToCell di sini agar grid tidak
  // dipaksa scroll ke baris tsb.
  // CATATAN: setSelectedRow TIDAK dipanggil di sini -- ditunda ke Row Combiner
  // agar commit bersamaan dengan setRows. Jika selectedRow di-update sekarang,
  // akan ada 1 frame di mana selectedRow sudah bergeser tapi `rows` belum
  // -> highlight kuning "berkedip".
  const shiftSelectionForWindow = (deltaRows: number) => {
    const next = Math.max(0, selectedRowRef.current + deltaRows);
    selectedRowRef.current = next;
    reanchorFromKeyboardRef.current = interactionModeRef.current === 'keyboard';
  };

  const forms = useForm<MenuInput>({
    resolver:
      mode === 'delete'
        ? undefined
        : zodResolver(menuSchema(mode as 'add' | 'edit' | 'delete')),
    mode: 'onSubmit',
    defaultValues: {
      title: '',
      aco_id: '',
      acos_nama: '',
      icon: '',
      parentId: '',
      parent_nama: '',
      isActive: 1,
      statusaktif: '',
      statusaktif_nama: ''
    }
  });
  const {
    setFocus,
    reset,
    formState: { isSubmitSuccessful }
  } = forms;
  const router = useRouter();
  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: 50,
    search: '',
    filters: { ...EMPTY_FILTERS },
    sortBy: 'title',
    sortDirection: 'asc'
  });
  const gridRef = useRef<DataGridHandle>(null);
  const [prevFilters, setPrevFilters] = useState<Filter>(filters);
  const effectiveLimit = shouldBulkFetch ? filters.limit * 5 : filters.limit;
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const { data: allMenu, isLoading: isLoadingMenu } = useGetMenu(
    {
      ...filters,
      page: shouldBulkFetch ? bulkStartPage : currentPage,
      limit: effectiveLimit
    },
    abortControllerRef.current?.signal
  );

  const currentMinPage =
    visiblePages.length > 0 ? Math.min(...visiblePages) : 1;
  const startRow = (currentMinPage - 1) * filters.limit + 1;

  const resetBufferingCache = () => {
    setShouldBulkFetch(true);
    setBulkStartPage(1);
    setPageDataCache(new Map());
    setVisiblePages([1, 2, 3, 4, 5]);
    setIsFetching(false);
    streamBufferRef.current = new Map();
    prefetchingPagesRef.current = new Set();
  };
  const columns = useMemo((): Column<IMenu>[] => {
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
                  filters: { ...EMPTY_FILTERS }
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
        renderCell: ({ row }: { row: IMenu }) => (
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
        key: 'title',
        name: 'Nama Menu',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NAMA MENU"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('title')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'title' ? 'font-bold' : 'font-normal'
                }`}
              >
                Nama Menu
              </p>
              <div className="ml-2">
                {filters.sortBy === 'title' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'title' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="title"
                value={filters.filters.title || ''}
                onChange={(value) => handleFilterInputChange('title', value)}
                onClear={() => handleClearFilter('title')}
                inputRef={(el) => {
                  inputColRefs.current['title'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.title || '';
          const cellValue = props.row.title || '';
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
        key: 'parent_nama',
        name: 'Menu Parent',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="MENU PARENT"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('parent_nama')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'parent_nama' ? 'font-bold' : 'font-normal'
                }`}
              >
                Menu Parent
              </p>
              <div className="ml-2">
                {filters.sortBy === 'parent_nama' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'parent_nama' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="parent_nama"
                value={filters.filters.parent_nama || ''}
                onChange={(value) =>
                  handleFilterInputChange('parent_nama', value)
                }
                onClear={() => handleClearFilter('parent_nama')}
                inputRef={(el) => {
                  inputColRefs.current['parent_nama'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.parent_nama || '';
          // Tampilkan JUDUL parent, bukan id-nya: sejak id menu memakai uuid v7
          // kolom ini hanya menampilkan deretan uuid yang tak berarti buat user.
          const cellValue = props.row.parent_nama || '';
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
        key: 'statusaktif',
        name: 'Status Aktif',
        resizable: true,
        draggable: true,
        width: 100,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="STATUS AKTIF"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('statusaktif')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statusaktif' ? 'font-bold' : 'font-normal'
                }`}
              >
                Status Aktif
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statusaktif' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statusaktif' &&
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
                filterBy={{ grp: 'STATUS AKTIF', subgrp: 'STATUS AKTIF' }}
                onChange={(value) =>
                  handleFilterInputChange('statusaktif', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.memo ? JSON.parse(props.row.memo) : null;
          if (memoData) {
            return (
              <div
                title={memoData.MEMO}
                className="flex h-full w-full items-center justify-center py-1"
              >
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
                  <p style={{ fontSize: '13px', color: memoData.WARNATULISAN }}>
                    {memoData.SINGKATAN}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div title="N/A" className="text-xs text-gray-500">
              N/A
            </div>
          ); // Tampilkan 'N/A' jika memo tidak tersedia
        }
      },
      {
        key: 'icon',
        name: 'Menu Icon',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="MENU ICON"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('icon')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'icon' ? 'font-bold' : 'font-normal'
                }`}
              >
                Menu Icon
              </p>
              <div className="ml-2">
                {filters.sortBy === 'icon' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'icon' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="icon"
                value={filters.filters.icon || ''}
                onChange={(value) => handleFilterInputChange('icon', value)}
                onClear={() => handleClearFilter('icon')}
                inputRef={(el) => {
                  inputColRefs.current['icon'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.icon || '';
          const cellValue = props.row.icon || '';
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
              className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-sm"
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
              className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-sm"
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
      // gridRef?.current?.scrollToCell?.({ rowIdx: 0, idx: 0 });
    }, 300)
  ).current;

  const pendingUpdates = useRef<Record<string, string>>({});

  const handleFilterInputChange = useCallback(
    (colKey: string, value: string) => {
      cancelPreviousRequest(abortControllerRef);
      pendingUpdates.current[colKey] = value;

      // ✅ Hanya track jika activeElement memang filter input kolom ini
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
  const handleClearFilter = useCallback((colKey: string) => {
    cancelPreviousRequest(abortControllerRef);
    debouncedFilterUpdate.cancel();
    pendingUpdates.current[colKey] = '';

    // ✅ Arahkan ke kolom yang di-clear
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
    resetBufferingCache();
  }, []);

  const { clearError } = useFormError();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelPreviousRequest(abortControllerRef);
    const searchValue = e.target.value;

    // ✅ Track global search input agar focus bisa di-restore
    activeFilterInputRef.current = inputRef.current;
    pendingSelectIdxRef.current = 1;

    setInputValue(searchValue);
    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      filters: { ...EMPTY_FILTERS },
      search: searchValue,
      page: 1
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

    activeFilterInputRef.current = null; // ✅ Sort bukan dari input, tidak perlu restore focus
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
    debouncedFilterUpdate.cancel();
    activeFilterInputRef.current = null;
    pendingSelectIdxRef.current = 1; // ✅ Reset ke default idx 1
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
        'GridMenu',
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

      saveGridConfig(String(user?.id), 'GridMenu', [...newOrder], columnsWidth);
      return newOrder;
    });
  };

  async function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (isLoadingMenu || rows.length === 0 || isTransitioning || isFetching)
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

          // Update visiblePages (geser window)
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

          isPageTransitionRef.current = true;
          pendingScrollAdjustment.current = filters.limit * ROW_HEIGHT;
          shiftSelectionForWindow(filters.limit);
          setVisiblePages((prevVisible) => {
            const removedPage = prevVisible[4];
            const newPages = [prevPage, ...prevVisible.slice(0, 4)];

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

  function handleCellClick(args: { row: IMenu }) {
    const clickedRow = args.row;
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
          getMenuFn({ ...filters, page: p, limit: filters.limit })
        )
      );

      const newCache = new Map<number, IMenu[]>();
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
  // Cache default STATUS AKTIF ("AKTIF") supaya tidak fetch berulang.
  const statusAktifDefaultRef = useRef<{ id: string; text: string } | null>(
    null
  );

  // Reset form mode "add" sekaligus set default STATUS AKTIF = "AKTIF".
  // Auto-default LookUp tidak reliabel untuk field ini, jadi di-set eksplisit
  // dari data parameter (id berupa varchar, jadi disimpan sebagai string).
  const resetAddForm = async () => {
    let aktif = statusAktifDefaultRef.current;
    if (!aktif) {
      try {
        const res = await api2.get('/parameter', {
          params: { grp: 'status aktif' }
        });
        const params: any[] = res?.data?.data ?? res?.data ?? [];
        const row =
          params.find((p) => p?.default === 'YA') ??
          params.find((p) => String(p?.text).toUpperCase() === 'AKTIF');
        aktif = row
          ? { id: String(row.id), text: row.text ?? 'AKTIF' }
          : { id: '', text: '' };
        statusAktifDefaultRef.current = aktif;
      } catch (e) {
        console.error('Gagal mengambil default STATUS AKTIF:', e);
        aktif = { id: '', text: '' };
      }
    }
    forms.reset({
      title: '',
      aco_id: '',
      acos_nama: '',
      icon: '',
      parentId: '',
      parent_nama: '',
      isActive: 1,
      statusaktif: aktif.id,
      statusaktif_nama: aktif.text
    });
  };

  const onSuccess = async (
    indexOnPage: number,
    fetchedPages: number[],
    pagedData: Record<string, IMenu[]>,
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
        // SAVE & ADD: reset form (set default STATUS AKTIF = "AKTIF") lalu
        // remount modal via addFormKey agar semua LookUp re-init dari nilai
        // form. JANGAN dispatch setClearLookup di sini: pada mount, effect
        // clearLookup berjalan SETELAH init sehingga malah mengosongkan
        // tampilan status aktif yang baru di-set.
        await resetAddForm();
        setAddFormKey((k) => k + 1);
        setPopOver(true);
      } else {
        dispatch(setClearLookup(true));
        forms.reset();
        setPopOver(false);
      }
      if (mode !== 'delete') {
        // Blokir data-effect memproses ulang hasil refetch pasca-mutasi selama
        // window settle, agar fokus by-id tidak tertimpa (fokus "lompat ke
        // baris 1"). Dibuka lagi via setTimeout di bawah.
        suppressRefetchRef.current = true;
        const response = await api2.get(`/redis/get/menus-page-${pageNumber}`);
        setRows([]);
        setRows(response.data);
        // Fokus BERDASARKAN ID baris, bukan indexOnPage dari backend. Setelah
        // edit, posisi baris di data window yang dimuat bisa berbeda dari
        // hitungan index backend (mis. tie-break urutan nama) sehingga fokus
        // meleset. Cari index baris (add: newItem.id, edit: updatedItem.id)
        // langsung di data yang dimuat -> selalu tepat. Fallback ke indexOnPage
        // bila id tak ketemu.
        const loadedRows: IMenu[] = Array.isArray(response.data)
          ? response.data
          : [];
        const focusIdx =
          focusId != null
            ? loadedRows.findIndex((r) => String(r.id) === String(focusId))
            : -1;
        const targetIndex = focusIdx >= 0 ? focusIdx : indexOnPage;
        console.log('[FOCUS DEBUG menu]', {
          mode,
          focusId,
          focusIdx,
          targetIndex,
          indexOnPage,
          loadedRowsLen: loadedRows.length,
          pageNumber,
          fetchedPages,
          firstIds: loadedRows.slice(0, 3).map((r) => r.id)
        });
        setIsDataUpdated(true);
        setVisiblePages(fetchedPages);
        setSelectedRow(targetIndex);
        setPageDataCache(
          new Map(
            Object.entries(pagedData).map(([key, value]) => [
              Number(key),
              value as IMenu[]
            ])
          )
        );
        setCurrentPage(pageNumber);

        const updatedBuffer = new Map(streamBufferRef.current);
        Object.entries(pagedData).forEach(([key, value]) => {
          updatedBuffer.set(Number(key), value as IMenu[]);
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
        // (gejala "edit selalu ke baris 1"). Re-assert id fokus beberapa kali
        // selama window settle agar SETIAP run Row Combiner (termasuk akibat
        // refetch) memfokuskan ulang baris yang benar by-id, lalu bersihkan
        // supaya tidak mengganggu navigasi berikutnya.
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

        // Buka blokir refetch setelah window settle. Karena ref, reset ini TIDAK
        // memicu ulang data-effect -> tidak ada clobber saat dibuka.
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
  const onSubmit = async (values: MenuInput, keepOpenModal = false) => {
    clearError();
    const selectedRowId = rows[selectedRow]?.id;
    try {
      dispatch(setProcessing());
      if (mode === 'delete') {
        if (selectedRowId) {
          await deleteMenu(selectedRowId as unknown as string, {
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

              // 4. Fokus baris BERIKUTNYA (by-id). Setelah baris dihapus,
              // baris tepat di bawahnya naik mengisi slot yang sama -> itulah
              // yang difokuskan. Jika yang dihapus baris paling bawah window,
              // jatuh ke baris di atasnya. Pemfokusan dilakukan via
              // pendingFocusIdRef (BY-ID), bukan selectCell by-index: Row
              // Combiner jalan ulang setelah cache di-update, dan tanpa
              // pendingFocusIdRef cabang else-nya men-scroll & men-select balik
              // ke row 0 (lihat onSuccess add/edit yang memakai pola sama).
              const nextFocusRow =
                rows[selectedRow + 1] ?? rows[selectedRow - 1];
              if (nextFocusRow) {
                pendingFocusIdRef.current = String(nextFocusRow.id);
              } else {
                // Tidak ada baris tersisa pada window ini.
                setSelectedRow(0);
                selectedRowRef.current = 0;
              }
            }
          });
        }
        return;
      }
      if (mode === 'add') {
        const newOrder = await createMenu(
          {
            ...values,
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
        await updateMenu(
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
    }
  };

  const handleEdit = () => {
    if (selectedRow !== null) {
      const rowData = rows[selectedRow];
      setPopOver(true);
      setMode('edit');
    }
  };
  const handleDelete = () => {
    if (selectedRow !== null) {
      setMode('delete');
      setPopOver(true);
    }
  };
  const handleView = () => {
    if (selectedRow !== null) {
      setMode('view');
      setPopOver(true);
    }
  };

  // Baris tambahan yang dipakai header template .mrt.
  const withReportHeader = (data: any[]) => {
    const now = new Date();
    const pad = (n: any) => n.toString().padStart(2, '0');
    const tglcetak = `${pad(now.getDate())}-${pad(
      now.getMonth() + 1
    )}-${now.getFullYear()} ${pad(now.getHours())}:${pad(
      now.getMinutes()
    )}:${pad(now.getSeconds())}`;

    return data.map((row: any) => ({
      ...row,
      judullaporan: 'Laporan Menu',
      usercetak: user.username,
      tglcetak,
      judul: 'PT.TRANSPORINDO AGUNG SEJAHTERA'
    }));
  };

  // Render PDF di browser lewat Stimulsoft, sama seperti alat bayar: progres
  // dilaporkan ke ReportProgressProvider (job) dan hasilnya dibuka di tab
  // /reports/menu lewat sessionStorage.
  const renderReportPdf = async (reportRows: any[], job: any) => {
    job.rendering();
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
    report.loadFile('/reports/LaporanMenu.mrt');
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
            job.finish(() => window.open('/reports/menu', '_blank'));
            resolve();
          } catch (err) {
            reject(err);
          }
        }, Stimulsoft.Report.StiExportFormat.Pdf);
      });
    });
  };

  const handleReport = async () => {
    const job = start('Menu', 'pdf');

    try {
      job.fetching();
      const { page, limit, ...filtersWithoutLimit } = filters;
      // limit: 0 = tanpa paging (ambil semua baris yang lolos filter). Tanpa
      // ini backend memakai default FindAllSchema (limit 10) sehingga laporan
      // hanya berisi 10 baris pertama.
      const response = await getMenuFn({ ...filtersWithoutLimit, limit: 0 });

      // Filter disimpan supaya tombol Export di viewer memakai filter yang
      // sama dengan laporan yang sedang dibuka.
      sessionStorage.setItem(
        'filtersWithoutLimit',
        JSON.stringify({ ...filtersWithoutLimit, limit: 0 })
      );

      await renderReportPdf(withReportHeader(response.data), job);
    } catch (err) {
      job.fail('Gagal membuat laporan PDF');
      console.error('[handleReport PDF]', err);
    }
  };

  const handleReportBySelect = async () => {
    if (checkedRows.size === 0) {
      alert({
        title: 'PILIH DATA YANG INGIN DI CETAK!',
        variant: 'danger',
        submitText: 'OK'
      });
      return;
    }

    const job = start('Menu', 'pdf');
    try {
      job.fetching();
      const jsonCheckedRows = Array.from(checkedRows).map((id) => ({ id }));
      const response = await reportMenuBySelectFn(jsonCheckedRows);

      sessionStorage.setItem('filtersWithoutLimit', JSON.stringify({}));

      await renderReportPdf(withReportHeader(response ?? []), job);
    } catch (err) {
      job.fail('Gagal membuat laporan PDF');
      console.error('[handleReportBySelect PDF]', err);
    }
  };

  /**
   * Export Excel dijalankan di BACKEND (background job + socket), sama seperti
   * alur cetak laporan. Frontend hanya mengirim filter yang sedang aktif di
   * grid — filter kolom, search global, dan sort — lalu progresnya muncul di
   * toast. Setelah selesai, toast menampilkan tombol Download untuk menyimpan
   * file xlsx-nya.
   */
  const handleExport = async () => {
    const { page, limit, ...filtersWithoutLimit } = filters;

    await generateExport({
      label: 'Export Menu',
      payload: {
        search: filtersWithoutLimit.search,
        filters: filtersWithoutLimit.filters,
        sortBy: filtersWithoutLimit.sortBy,
        sortDirection: filtersWithoutLimit.sortDirection
      },
      apiFn: generateMenuExportFn
    });
  };

  const handleExportBySelect = async () => {
    if (checkedRows.size === 0) {
      alert({
        title: 'PILIH DATA YANG INGIN DI CETAK!',
        variant: 'danger',
        submitText: 'OK'
      });
      return;
    }

    const jsonCheckedRows = Array.from(checkedRows).map((id) => ({ id }));
    try {
      const response = await exportMenuBySelectFn(jsonCheckedRows);

      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `laporan_menu_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting menu data:', error);
      alert({
        title: 'Failed to generate the export. Please try again.',
        variant: 'danger',
        submitText: 'OK'
      });
    }
  };

  document.querySelectorAll('.column-headers').forEach((element) => {
    element.classList.remove('c1kqdw7y7-0-0-beta-47');
  });
  function getRowClass(row: IMenu) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: IMenu) {
    return row.id;
  }

  function EmptyRowsRenderer() {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ textAlign: 'center', gridColumn: '1/-1' }}
      >
        NO ROWS DATA FOUND
      </div>
    );
  }
  const handleResequence = () => {
    router.push('/dashboard/resequence');
  };
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
      // Sinkronkan daftar ACO dulu supaya lookup ACO di form menampilkan
      // endpoint yang baru ditambahkan (khusus modul menu).
      await syncAcosFn();
      setMode('add');
      // Fetch default AKTIF lalu reset SEBELUM buka modal, supaya lookupNama
      // (non-reaktif) sudah terisi saat LookUp pertama kali mount.
      await resetAddForm();
      setPopOver(true);
    } catch (error) {
      console.error('Error add menu:', error);
    }
  };

  const prefetchPages = useCallback(
    async (
      pagesToFetch: number[],
      existingCache?: Map<number, IMenu[]>,
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
            const data = await getMenuFn({
              ...filters,
              page: pageNum,
              limit: filters.limit
            });

            if (data?.data && data.data.length > 0) {
              console.log(
                `[StreamBuffer] ✅ Berhasil masuk cache: Page ${pageNum}`
              );
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
    if (user?.id) {
      loadGridConfig(
        String(user?.id),
        'GridMenu',
        columns,
        setColumnsOrder,
        setColumnsWidth
      );
    }
  }, [user]);

  useEffect(() => {
    if (isSubmitSuccessful) {
      // reset();
      // Pastikan fokus terjadi setelah repaint
      requestAnimationFrame(() => setFocus('title'));
    }
  }, [isSubmitSuccessful, setFocus]);

  // useEffect(() => {
  //   if (isFirstLoad) {
  //     setFilters((prevFilters) => ({
  //       ...prevFilters,
  //       filters: {
  //         ...prevFilters.filters
  //       },
  //       page: 1
  //     }));
  //     resetBufferingCache(); // ADDED
  //   }
  // }, [filters, isFirstLoad]);

  // 1. Bulk Fetch Initialization
  useEffect(() => {
    const handleBulkFetch = async () => {
      if (
        !shouldBulkFetch ||
        !allMenu ||
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

      const bulkData = allMenu.data || [];
      if (bulkData.length === 0) return;

      const pageSize = filters.limit;
      const newCache = new Map<number, IMenu[]>();
      const wasJumpingToLast = jumpToLastRef.current;

      const logicalStartPage = (bulkStartPage - 1) * WINDOW_SIZE + 1;
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

      const totalItems = allMenu.pagination?.totalItems || 0;
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
    allMenu,
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

    if (!allMenu) return;

    const newRows = allMenu.data || [];

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
    if (currentPage > maxVisible && currentPage <= maxVisible + 1) {
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
    } else if (currentPage < minVisible && currentPage >= minVisible - 1) {
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

    if (allMenu.pagination?.totalPages) {
      setTotalPages(allMenu.pagination.totalPages);
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
    allMenu,
    currentPage,
    filters,
    isDataUpdated,
    shouldBulkFetch,
    isAfterMutation
  ]);

  // 3. Row Combiner (Mapping cache to rows state)
  // 3. Row Combiner (Mapping cache to rows state)
  useEffect(() => {
    const combinedRows: IMenu[] = [];
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
      // Backend mengembalikan window yang memuat baris baru; cari index-nya di
      // sini lalu scroll+select. Pakai posisi tengah window (idx 1 = kolom data
      // pertama) sehingga TIDAK kena THRESHOLD_ROWS handleScroll -> window tidak
      // bergeser -> fokus tidak meleset. `return` mencegah cabang else
      // men-scroll ke row 0 (yang memicu pergeseran window).
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
    if (rows.length > 0 && selectedRow !== null) {
      const selectedRowData = rows[selectedRow];
      // dispatch(setHeaderData(selectedRowData));
      if (selectedRowData?.id !== lastDispatchedId.current) {
        dispatch(setHeaderData(selectedRowData));
        lastDispatchedId.current = selectedRowData?.id;
      }
    }
  }, [rows, selectedRow, dispatch]);
  useEffect(() => {
    const preventScrollOnSpace = (event: KeyboardEvent) => {
      if (
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

  const handleClickOutside = (event: MouseEvent) => {
    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(event.target as Node)
    ) {
      setContextMenu(null);
    }
  };

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
    if (selectedRow !== null && rows.length > 0 && mode !== 'add') {
      forms.setValue('id', rowData?.id ?? '');
      forms.setValue('title', rowData?.title);
      forms.setValue('icon', rowData?.icon ?? '');
      forms.setValue('isActive', Number(rowData?.isActive ?? 1));

      // aco_id / parentId = varchar UUID, jangan dikonversi ke number.
      forms.setValue('aco_id', String(rowData?.aco_id ?? ''));
      forms.setValue('acos_nama', rowData?.acos_nama ?? '');

      forms.setValue('parentId', String(rowData?.parentId ?? ''));
      forms.setValue('parent_nama', rowData?.parent_nama ?? '');

      forms.setValue('statusaktif', String(rowData?.statusaktif ?? ''));
      forms.setValue('statusaktif_nama', rowData?.text ?? '');
    }
    // JANGAN forms.reset() saat mode 'add' di sini. Effect ini ikut ter-trigger
    // setiap kali `rows` di-update background fetch (bulk/prefetch) selama modal
    // Add terbuka, sehingga me-reset nilai yang baru diisi user ke default
    // kosong (''). Sejak id status migrasi number→string (z.string().min(1)),
    // default '' membuat validasi gagal diam-diam → Save/Save & Add "tidak
    // terjadi apa-apa" padahal LookUp masih menampilkan teks. Reset form
    // add-mode sudah ditangani handleAdd()/onSuccess() lewat resetAddForm().
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
              userId={String(user?.id)}
              gridName="GridMenu"
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
          enableVirtualization={true}
          onColumnResize={onColumnResize}
          onColumnsReorder={onColumnsReorder}
          onScroll={suppressScrollRef.current ? undefined : handleScroll}
          renderers={{
            noRowsFallback: <EmptyRowsRenderer />
          }}
        />
        <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2">
          <ActionButton
            module="MENU"
            onAdd={handleAdd}
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
            checkedRows={checkedRows as unknown as Set<number>}
            rowsLength={rows.length}
            totalItems={allMenu ? allMenu.pagination.totalItems : 0}
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
                label: 'Resequence',
                icon: <FaPlus />,
                onClick: () => handleResequence(),
                variant: 'success',
                className: 'bg-purple-700 hover:bg-purple-800'
              }
            ]}
            dropdownMenus={[
              {
                label: 'Report',
                icon: <FaPrint />,
                className: 'bg-cyan-500 hover:bg-cyan-700',
                actions: [
                  {
                    label: 'REPORT ALL',
                    onClick: () => handleReport(),
                    className: 'bg-cyan-500 hover:bg-cyan-700'
                  },
                  {
                    label: 'REPORT BY SELECT',
                    onClick: () => handleReportBySelect(),
                    className: 'bg-cyan-500 hover:bg-cyan-700'
                  }
                ]
              },
              {
                label: 'Export',
                icon: <FaFileExport />,
                className: 'bg-green-600 hover:bg-green-700',
                actions: [
                  {
                    label: 'EXPORT ALL',
                    onClick: () => handleExport(),
                    className: 'bg-green-600 hover:bg-green-700'
                  },
                  {
                    label: 'EXPORT BY SELECT',
                    onClick: () => handleExportBySelect(),
                    className: 'bg-green-600 hover:bg-green-700'
                  }
                ]
              }
            ]}
          />
          {isLoadingMenu ? <LoadRowsRenderer /> : null}
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
                    String(user?.id),
                    'GridMenu',

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
      <FormMenu
        key={addFormKey}
        popOver={popOver}
        handleClose={handleClose}
        setPopOver={setPopOver}
        isLoadingUpdate={isLoadingUpdate}
        isLoadingDelete={isLoadingDelete}
        forms={forms}
        mode={mode as any}
        onSubmit={(keepOpenModal: boolean) =>
          forms.handleSubmit((values) => onSubmit(values, keepOpenModal))()
        }
        isLoadingCreate={isLoadingCreate}
      />
    </div>
  );
};

export default GridMenu;
