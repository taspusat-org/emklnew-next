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
  CellClickArgs,
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import { ImSpinner2 } from 'react-icons/im';
import { useDispatch, useSelector } from 'react-redux';
import { FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { useGetLogtrail } from '@/lib/server/useLogtrail';
import {
  setIdDetailLogtrail,
  setIdHeaderLogtrail
} from '@/lib/store/logtrailSlice/logtrailSlice';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import IcClose from '@/public/image/x.svg';
import { Button } from '@/components/ui/button';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import {
  cancelPreviousRequest,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import { useReportPdfContext } from '@/hooks/ReportPdfProvider';
import { useReportProgress } from '@/components/custom-ui/ReportProgressProvider';
import { useQueryClient } from 'react-query';
import { useAlert } from '@/lib/store/client/useAlert';
import { RootState } from '@/lib/store/store';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useFormError } from '@/lib/hooks/formErrorContext';
import { filterLogtrail, ILogtrail } from '@/lib/types/logtrail.type';
import {
  HEADER_ROW_HEIGHT,
  LIMIT,
  NOMOR_CELL_BOX,
  ROW_HEIGHT
} from '@/constants/constant';
import { clearOpenName } from '@/lib/store/lookupSlice/lookupSlice';
import { setHeaderData } from '@/lib/store/headerSlice/headerSlice';
import { debounce } from 'lodash';
import { getLogtrailFn } from '@/lib/apis/logtrail.api';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import FilterInput from '@/components/custom-ui/FilterInput';

interface Filter {
  page: number;
  limit: number;
  search: string;
  filters: {
    id: string; // Filter berdasarkan class
    namatabel: string; // Filter berdasarkan method
    postingdari: string; // Filter berdasarkan nama
    idtrans: string; // Filter berdasarkan nama
    nobuktitrans: string; // Filter berdasarkan nama
    aksi: string; // Filter berdasarkan nama
    modifiedby: string; // Filter berdasarkan nama
    updated_at: string; // Filter berdasarkan nama
    created_at: string; // Filter berdasarkan nama
  };
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridLogtrail = () => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const [totalPages, setTotalPages] = useState(1);

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
  const isScrollingRef = useRef(false);
  const pendingSelectIdxRef = useRef<number>(1);
  const suppressScrollRef = useRef(false);
  const isPageTransitionRef = useRef(false);

  const lastScrollTopRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingScrollAdjustment = useRef<number>(0);
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5]);
  const minVisiblePage = useMemo(
    () => Math.min(...visiblePages),
    [visiblePages]
  );
  const [pageDataCache, setPageDataCache] = useState<Map<number, ILogtrail[]>>(
    new Map()
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastDispatchedId = useRef<number | null>(null);
  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
  const [columnsWidth, setColumnsWidth] = useState<{ [key: string]: number }>(
    {}
  );
  const [isFilteringRows, setIsFilteringRows] = useState(false);
  const [dataGridKey, setDataGridKey] = useState(0);

  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [fetchedPages, setFetchedPages] = useState<Set<number>>(new Set([1]));
  const [bulkStartPage, setBulkStartPage] = useState(1);
  const [rows, setRows] = useState<ILogtrail[]>([]);
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null);
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
  const pendingFocusIdRef = useRef<string | null>(null);
  const suppressRefetchRef = useRef(false);
  const activeFilterInputRef = useRef<HTMLElement | null>(null);
  const [selectedCellKey, setSelectedCellKey] = useState<string>('namatabel');
  const streamBufferRef = useRef<Map<number, ILogtrail[]>>(new Map());
  const prefetchingPagesRef = useRef<Set<string>>(new Set());
  const STREAM_BUFFER_SIZE = 5;
  const WINDOW_SIZE = 5;
  const jumpToLastRef = useRef(false);
  const jumpToFirstRef = useRef(false);
  const interactionModeRef = useRef<'keyboard' | 'pointer'>('pointer');
  const reanchorFromKeyboardRef = useRef(false);
  const shiftSelectionForWindow = (deltaRows: number) => {
    const next = Math.max(0, selectedRowRef.current + deltaRows);
    selectedRowRef.current = next;
    reanchorFromKeyboardRef.current = interactionModeRef.current === 'keyboard';
  };

  const router = useRouter();
  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: LIMIT,
    search: '',
    filters: filterLogtrail,
    sortBy: 'id',
    sortDirection: 'asc'
  });
  const gridRef = useRef<DataGridHandle>(null);
  const [prevFilters, setPrevFilters] = useState<Filter>(filters);
  const effectiveLimit = shouldBulkFetch ? filters.limit * 5 : filters.limit;
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const { data: allLogtrail, isLoading: isLoadingLogtrail } = useGetLogtrail(
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

  const columns = useMemo((): Column<ILogtrail>[] => {
    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 40,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full w-full flex-col gap-1">
            <div
              className="headers-cell h-[50%] w-full"
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p className="w-full text-center text-sm font-normal">No.</p>
            </div>

            <div className={`h-[50%] w-[calc(100%+2px)] ${NOMOR_CELL_BOX}`}>
              <div
                className="flex cursor-pointer items-center justify-center"
                onClick={() => {
                  setFilters({
                    ...filters,
                    search: '',
                    filters: filterLogtrail
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
              <div className="flex items-center justify-center text-sm">
                {absoluteNumber}
              </div>
            </div>
          );
        }
      },

      {
        key: 'id',
        name: 'ID',
        resizable: true,
        draggable: true,
        width: 80,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="ID"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('id')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'id' ? 'font-bold' : 'font-normal'
                }`}
              >
                ID
              </p>
              <div className="ml-2">
                {filters.sortBy === 'id' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'id' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="id"
                value={filters.filters.id || ''}
                onChange={(value) => handleFilterInputChange('id', value)}
                onClear={() => handleClearFilter('id')}
                inputRef={(el) => {
                  inputColRefs.current['id'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.id || '';
          const cellValue = props.row.id || '';
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
        key: 'namatabel',
        name: 'Nama Tabel',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NAMA TABEL"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('namatabel')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'namatabel' ? 'font-bold' : 'font-normal'
                }`}
              >
                Nama Tabel
              </p>
              <div className="ml-2">
                {filters.sortBy === 'namatabel' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'namatabel' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="namatabel"
                value={filters.filters.namatabel || ''}
                onChange={(value) =>
                  handleFilterInputChange('namatabel', value)
                }
                onClear={() => handleClearFilter('namatabel')}
                inputRef={(el) => {
                  inputColRefs.current['namatabel'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.namatabel || '';
          const cellValue = props.row.namatabel || '';
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
        name: 'Posting Dari',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="POSTING DARI"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
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
                Posting Dari
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
        key: 'idtrans',
        name: 'ID Trans',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="ID TRANS"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('idtrans')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'idtrans' ? 'font-bold' : 'font-normal'
                }`}
              >
                ID Trans
              </p>
              <div className="ml-2">
                {filters.sortBy === 'idtrans' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'idtrans' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="idtrans"
                value={filters.filters.idtrans || ''}
                onChange={(value) => handleFilterInputChange('idtrans', value)}
                onClear={() => handleClearFilter('idtrans')}
                inputRef={(el) => {
                  inputColRefs.current['idtrans'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.idtrans || '';
          const cellValue = props.row.idtrans || '';
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
        key: 'nobuktitrans',
        name: 'NO BUKTI TRANS',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NO BUKTI TRANS"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nobuktitrans')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nobuktitrans'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                NO BUKTI TRANS
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nobuktitrans' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nobuktitrans' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nobuktitrans"
                value={filters.filters.nobuktitrans || ''}
                onChange={(value) =>
                  handleFilterInputChange('nobuktitrans', value)
                }
                onClear={() => handleClearFilter('nobuktitrans')}
                inputRef={(el) => {
                  inputColRefs.current['nobuktitrans'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nobuktitrans || '';
          const cellValue = props.row.nobuktitrans || '';
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
        key: 'aksi',
        name: 'AKSI',
        resizable: true,
        draggable: true,
        width: 80,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="AKSI"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('aksi')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'aksi' ? 'font-bold' : 'font-normal'
                }`}
              >
                AKSI
              </p>
              <div className="ml-2">
                {filters.sortBy === 'aksi' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'aksi' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="aksi"
                value={filters.filters.aksi || ''}
                onChange={(value) => handleFilterInputChange('aksi', value)}
                onClear={() => handleClearFilter('aksi')}
                inputRef={(el) => {
                  inputColRefs.current['aksi'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.aksi || '';
          const cellValue = props.row.aksi || '';
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
        width: 100,
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
        width: 170,
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

        width: 170,
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
  }, [filters, rows, filters.filters]);

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

    activeFilterInputRef.current = inputRef.current;
    pendingSelectIdxRef.current = 1;

    setInputValue(searchValue);
    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      ...filters,
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
    pendingSelectIdxRef.current = 1;
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
    const columnKey = columns[columnsOrder[index]].key;

    const newWidthMap = { ...columnsWidth, [columnKey]: width };
    setColumnsWidth(newWidthMap);

    if (resizeDebounceTimeout.current) {
      clearTimeout(resizeDebounceTimeout.current);
    }

    resizeDebounceTimeout.current = setTimeout(() => {
      saveGridConfig(
        String(user?.id),
        'GridLogtrail',
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
        'GridLogtrail',
        [...newOrder],
        columnsWidth
      );
      return newOrder;
    });
  };

  async function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (isLoadingLogtrail || rows.length === 0 || isTransitioning || isFetching)
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

    const rowHeight = 27;
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

          const pagesToPrefetch = Array.from(
            { length: STREAM_BUFFER_SIZE },
            (_, i) => nextPage + 1 + i
          );
          prefetchPages(pagesToPrefetch);
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
            const removedPage = prevVisible[4];
            const newPages = [prevPage, ...prevVisible.slice(0, 4)];

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

          const pagesToPrefetch = Array.from(
            { length: STREAM_BUFFER_SIZE },
            (_, i) => prevPage - 1 - i
          ).filter((p) => p >= 1);
          prefetchPages(pagesToPrefetch);
        } else if (!pageDataCache.has(prevPage)) {
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;
          setCurrentPage(0);
          setTimeout(() => setCurrentPage(prevPage), 0);
        }
      }
    }
  }

  function handleCellClick(args: { row: ILogtrail }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
      dispatch(setIdHeaderLogtrail(clickedRow?.id as unknown as number));
      dispatch(setIdDetailLogtrail(clickedRow?.idtrans as unknown as number));
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

    if (totalPages <= WINDOW_SIZE) {
      resetBufferingCache();
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
          getLogtrailFn({ ...filters, page: p, limit: filters.limit })
        )
      );

      const newCache = new Map<number, ILogtrail[]>();
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

  document.querySelectorAll('.column-headers').forEach((element) => {
    element.classList.remove('c1kqdw7y7-0-0-beta-47');
  });
  function getRowClass(row: ILogtrail) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: ILogtrail) {
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
  const prefetchPages = useCallback(
    async (
      pagesToFetch: number[],
      existingCache?: Map<number, ILogtrail[]>,
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
            const data = await getLogtrailFn({
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
      dispatch(setIdHeaderLogtrail(rows[0].id as unknown as number));
      dispatch(setIdDetailLogtrail(rows[0].idtrans as unknown as number));
    }
  }, [rows, isFirstLoad]);
  useEffect(() => {
    if (user?.id) {
      loadGridConfig(
        String(user?.id),
        'GridLogtrail',
        columns,
        setColumnsOrder,
        setColumnsWidth
      );
    }
  }, [user]);

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
        !allLogtrail ||
        isDataUpdated ||
        isAfterMutation ||
        suppressRefetchRef.current
      ) {
        return;
      }

      const bulkData = allLogtrail.data || [];
      if (bulkData.length === 0) return;

      const pageSize = filters.limit;
      const newCache = new Map<number, ILogtrail[]>();
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

      const totalItems = allLogtrail.pagination?.totalItems || 0;
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
    allLogtrail,
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

    if (!allLogtrail) return;

    const newRows = allLogtrail.data || [];

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

    if (allLogtrail.pagination?.totalPages) {
      setTotalPages(allLogtrail.pagination.totalPages);
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
    allLogtrail,
    currentPage,
    filters,
    isDataUpdated,
    shouldBulkFetch,
    isAfterMutation
  ]);

  // 3. Row Combiner (Mapping cache to rows state)
  useEffect(() => {
    const combinedRows: ILogtrail[] = [];
    visiblePages?.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (pageData) combinedRows.push(...pageData);
    });

    if (combinedRows.length > 0) {
      const newMinPage = Math.min(...visiblePages);
      setRows(combinedRows);
      prevMinPageRef.current = newMinPage;
      prevRowsLengthRef.current = combinedRows.length;

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
      dispatch(setIdHeaderLogtrail(selectedRowData.id as unknown as number)); // Pastikan data sudah benar
      dispatch(
        setIdDetailLogtrail(selectedRowData.idtrans as unknown as number)
      ); // Pastikan data sudah benar
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
    // Initialize the refs based on columns dynamically
    columns.forEach((col) => {
      if (!inputColRefs.current[col.key]) {
        inputColRefs.current[col.key] = null;
      }
    });
  }, []);

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
              gridName="GridLogtrail"
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
          enableVirtualization={false}
          onColumnResize={onColumnResize}
          onColumnsReorder={onColumnsReorder}
          onScroll={suppressScrollRef.current ? undefined : handleScroll}
          renderers={{
            noRowsFallback: <EmptyRowsRenderer />
          }}
        />
        <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2">
          {isLoadingLogtrail ? <LoadRowsRenderer /> : null}
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
                    'GridLogtrail',
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

export default GridLogtrail;
