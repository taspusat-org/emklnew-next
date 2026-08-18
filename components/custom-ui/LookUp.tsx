import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useLayoutEffect
} from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { TbLayoutNavbarFilled } from 'react-icons/tb';
import { IoClose } from 'react-icons/io5';
import { useDispatch } from 'react-redux';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/components/ui/form';
import {
  setLookUpValue,
  setSearchTerm
} from '@/lib/store/searchLookupSlice/searchLookupSlice';
import { Label } from '../ui/label';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { ImSpinner2 } from 'react-icons/im';
import DataGrid, {
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import { api, api2 } from '@/lib/utils/AxiosInstance';
import {
  FaChevronDown,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaTimes
} from 'react-icons/fa';
import {
  clearOpenName,
  setClearLookup,
  setOpenName,
  setSubmitClicked,
  setType,
  addErrorLookup,
  removeErrorLookup,
  clearErrorLookups,
  addPendingLookup,
  removePendingLookup
} from '@/lib/store/lookupSlice/lookupSlice';
import { FormLabel } from '../ui/form';
import IcClose from '@/public/image/x.svg';
import Image from 'next/image';
import { REQUIRED_FIELD } from '@/constants/validation';
import { setSelectLookup } from '@/lib/store/selectLookupSlice/selectLookupSlice';
import { formatCurrency } from '@/lib/utils';
import { debounce } from 'lodash';
import FilterInput from './FilterInput';
import { useTheme } from 'next-themes';
import { highlightText } from './HighlightText';

interface LookUpProps {
  columns: {
    key: string;
    name: string;
    width?: number;
    isCurrency?: boolean;
  }[];
  endpoint?: string;
  label?: string;
  labelLookup?: string;
  singleColumn?: boolean;
  filterby?: Record<string, any>;
  pageSize?: number;
  postData?: string;
  dataToPost?: string | number;
  dataSortBy?: string;
  dataSortDirection?: string;
  extendSize?: string;
  lookupNama?: string;
  lookupValue?: (id: number | string | null) => void;
  showOnButton?: boolean;
  isSubmitClicked?: boolean;
  inputLookupValue?: string | number;
  allowedFilterShowAllFirst?: boolean;
  disabled?: boolean;
  clearDisabled?: boolean;
  selectedRequired?: boolean;
  name?: string;
  forms?: any;
  required?: boolean;
  onSelectRow?: (selectedRowValue?: any | undefined) => void;
  onClear?: () => void;
  autoSearch?: boolean;
  autoComplete?: boolean;
  isExactMatch?: boolean;
  showClearButton?: boolean;
  forInput?: boolean;
  hideFilter?: boolean;
  focusOnError?: boolean;
  errorMessage?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  reduxKey?: string;
}
interface Filter {
  page: number;
  limit: number;
  filters: Record<string, string>;
  search: string;
  sortBy: string;
  sortDirection: string;
}
interface Row {
  id: string;
  [key: string]: any;
}

export default function LookUp({
  columns: rawColumns,
  endpoint,
  extendSize,
  label,
  labelLookup,
  dataSortBy,
  dataSortDirection,
  lookupNama,
  required,
  dataToPost,
  name,
  forms,
  selectedRequired = false,
  showOnButton = true,
  lookupValue,
  singleColumn = false,
  pageSize = 20,
  isSubmitClicked = false,
  postData,
  disabled = false,
  clearDisabled = false,
  filterby,
  onSelectRow,
  onClear,
  autoSearch = true,
  autoComplete = true,
  isExactMatch = false,
  showClearButton = true,
  forInput = false,
  hideFilter = false,
  focusOnError = false,
  errorMessage,
  side,
  reduxKey
}: LookUpProps) {
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [open, setOpen] = useState<boolean>(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isEnterLoading, setIsEnterLoading] = useState(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [onPaste, setOnPaste] = useState<boolean>(false);
  const dispatch = useDispatch();
  const [hasMore, setHasMore] = useState(true);
  const [popoverWidth, setPopoverWidth] = useState<number | string>('auto');
  const [clickedOutside, setClickedOutside] = useState(false);
  const gridLookUpRef = useRef<HTMLDivElement | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [filtering, setFiltering] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [deleteClicked, setDeleteClicked] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const isUserTypingRef = useRef(false);
  const prevLookupNamaRef = useRef<string | undefined>(undefined);
  const hasInitializedRef = useRef(false);
  const renderOrderRef = useRef<number>(0);
  const [showError, setShowError] = useState({
    label: label,
    status: false,
    message: ''
  });
  const [suppressErrorMessage, setSuppressErrorMessage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  const selectFirstRowControllerRef = useRef<AbortController | null>(null);
  const selectFirstRowRequestIdRef = useRef<number>(0);

  const instanceIdRef = useRef<string>(
    `${label}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  const [totalPages, setTotalPages] = useState(1);
  const columnInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>(
    {}
  );
  // Beberapa lookup memakai data redux yang sama tapi dengan `label` berbeda
  // (mis. STATUS LANGSUNG CAIR & STATUS DEFAULT sama-sama grup STATUS NILAI),
  // jadi kunci store bisa di-override lewat `reduxKey`.
  const storeKey = reduxKey || label || '';
  const type = useSelector((state: RootState) => state.lookup.type[storeKey]);
  const data = useSelector((state: RootState) => state.lookup.data[storeKey]);
  const isdefault = useSelector(
    (state: RootState) => state.lookup.isdefault[storeKey]
  );
  const openName = useSelector((state: RootState) => state.lookup.openName);
  const focus = useSelector((state: RootState) => state.lookup.focus);
  const clearLookup = useSelector(
    (state: RootState) => state.lookup.clearLookup
  );
  const submitClicked = useSelector(
    (state: RootState) => state.lookup.submitClicked
  );
  const errorLookups = useSelector(
    (state: RootState) => state.lookup.errorLookups
  );
  const { theme, resolvedTheme } = useTheme();

  const isDark = theme === 'dark' || resolvedTheme === 'dark';

  const [fetchedPages, setFetchedPages] = useState<Set<number>>(new Set([1]));
  const collapse = useSelector((state: RootState) => state.collapse.value);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: 20,
    filters: {},
    search: '',
    sortBy: dataSortBy ? dataSortBy : '',
    sortDirection: dataSortDirection ? dataSortDirection : 'asc'
  });
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isTypingRef = useRef(false);
  const shouldFetchWithoutFilterRef = useRef(false);
  const pasteErrorRef = useRef(false);
  // Teks asli yang diketik user (tetap meski inputValue tertimpa saat navigasi).
  const typedTextRef = useRef<string>('');
  // Penanda agar fetch tidak terpicu saat inputValue berubah karena navigasi.
  const skipNextFetchRef = useRef<boolean>(false);
  // lookupNama terakhir yang sudah di-resolve ke row-nya (hindari fetch ulang).
  const resolvedNamaRef = useRef<string | null>(null);

  // fetchKey di-increment setiap kali ada filter/search baru yang butuh fetch segar.
  // Ini menggantikan rows.length di dependency array agar tidak terjadi fetch loop.
  const [fetchKey, setFetchKey] = useState(0);

  const getAbortController = () => {
    return abortControllerRef.current;
  };

  const setAbortController = (controller: AbortController | null) => {
    abortControllerRef.current = controller;
  };

  const getRequestId = () => {
    return requestIdRef.current;
  };

  const incrementRequestId = () => {
    requestIdRef.current += 1;
    return requestIdRef.current;
  };

  const columnFiltersString = useMemo(
    () => JSON.stringify(filters.filters),
    [filters.filters]
  );

  const initializeColumnFilters = useCallback(() => {
    const initialFilters: Record<string, string> = {};
    rawColumns.forEach((col) => {
      initialFilters[col.name] = '';
    });
    return initialFilters;
  }, [rawColumns]);

  // ─── FIX #1: buildParams — column filters dikirim dengan col.key ke API,
  // dibaca dari filters.filters yang di-key dengan col.name
  const buildParams = useCallback(
    (overrideSearch?: string, skipFilters: boolean = false) => {
      const searchValue =
        overrideSearch !== undefined ? overrideSearch : filters.search;

      const params: Record<string, any> = {
        page: currentPage,
        limit: filters.limit,
        sortDirection: filters.sortDirection
      };

      // Only send sortBy when it actually has a column name. An empty sortBy
      // produces an invalid `ORDER BY` on the backend and returns a 500.
      if (filters.sortBy && filters.sortBy.trim() !== '') {
        params['sortBy'] = filters.sortBy;
      }

      if (!skipFilters) {
        // Search param
        if (searchValue && searchValue.trim() !== '') {
          if (isExactMatch) {
            params['exactMatch'] = searchValue;
          } else {
            params['search'] = searchValue;
          }
        }
        rawColumns.forEach((col) => {
          // Only send column filters that actually have a value. Sending an
          // empty string for every column makes the backend filter numeric/date
          // columns with `= ''`, which MSSQL fails to convert and returns 500.
          const filterValue = filters.filters?.[col.name] ?? '';
          if (filterValue !== '' && filterValue != null) {
            params[col.key] = filterValue;
          }
        });
      }

      // filterby selalu dikirim
      if (filterby && !Array.isArray(filterby)) {
        for (const [k, v] of Object.entries(filterby)) {
          params[k] = v;
        }
      }

      return params;
    },
    [currentPage, filters, filterby, rawColumns, isExactMatch]
  );

  const mapApiToRows = useCallback(
    (payload: any[]): Row[] => {
      return payload.map((item: any) => {
        const row: Row = { id: item.id };
        for (const [k, v] of Object.entries(item)) if (k !== 'id') row[k] = v;
        return row;
      });
    },
    [dataToPost]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onPaste) {
      setOnPaste(false);
      return;
    }
    if (disabled) return;

    const searchValue = e.target.value;

    if (searchValue.trim() === '') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setOnPaste(false);
      setInputValue('');
      typedTextRef.current = '';
      setRows([]);
      setFiltering(false);
      setCurrentPage(1);
      setFetchedPages(new Set([1]));
      setHasMore(true);

      setShowError({ label: label ?? '', status: false, message: '' });
      dispatch(removeErrorLookup(label || ''));
      setSuppressErrorMessage(true);

      setDeleteClicked(true);
      setHasUserInteracted(true);
      isUserTypingRef.current = false;
      isTypingRef.current = false;
      shouldFetchWithoutFilterRef.current = false;

      setFilters((prev) => ({
        ...prev,
        search: '',
        filters: {},
        page: 1
      }));
      clearAllColumnFilters();

      lookupValue?.(null);
      onSelectRow?.(undefined);
      dispatch(setSelectLookup({ key: label ?? '', data: {} }));
      dispatch(setSearchTerm(''));
      dispatch(removePendingLookup(label || ''));

      if (openName === (label || '')) {
        dispatch(clearOpenName());
      }
      setOpen(false);

      setTimeout(() => {
        setDeleteClicked(false);
      }, 100);

      onClear?.();

      return;
    }

    if (!open && searchValue.trim() !== '') {
      setOpen(true);
      dispatch(setOpenName(label || ''));
    }

    pasteErrorRef.current = false;
    isUserTypingRef.current = true;
    isTypingRef.current = true;
    setHasUserInteracted(true);

    if (searchValue.trim() !== '') {
      shouldFetchWithoutFilterRef.current = false;
    }

    setInputValue(searchValue);
    typedTextRef.current = searchValue;

    setShowError({ label: label ?? '', status: false, message: '' });
    dispatch(removeErrorLookup(label || ''));
    setSuppressErrorMessage(true);

    if (searchValue.trim() !== '' && required) {
      dispatch(addPendingLookup(label || ''));
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;

      setRows([]);
      setFilters((prev) => ({
        ...prev,
        filters: initializeColumnFilters(),
        search: searchValue,
        page: 1
      }));

      setFiltering(true);
      setCurrentPage(1);
      setFetchedPages(new Set([1]));
      setFetchKey((k) => k + 1);
    }, 500);
  };

  const clearAllColumnFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      filters: initializeColumnFilters()
    }));
  }, [initializeColumnFilters]);
  const debouncedFilterUpdate = useCallback(
    debounce((colKey: string, value: string) => {
      setRows([]);
      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, [colKey]: value },
        page: 1
      }));
      setCurrentPage(1);
      setFetchedPages(new Set([1]));
      setFiltering(true);
      setOpen(true);
      setFetchKey((k) => k + 1);
    }, 500),
    []
  );
  const handleFilterInputChange = useCallback(
    (colKey: string, value: string) => {
      shouldFetchWithoutFilterRef.current = false;
      setFiltering(true);
      setOpen(true); // ✅ buka popover sync, fetch tidak terblok
      dispatch(setOpenName(label || ''));
      debouncedFilterUpdate(colKey, value);
    },
    [debouncedFilterUpdate, dispatch, label]
  );
  const handleClearFilter = useCallback(
    (colKey: string) => {
      debouncedFilterUpdate.cancel();
      setRows([]);
      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, [colKey]: '' },
        page: 1
      }));
      setCurrentPage(1);
      setFetchedPages(new Set([1])); // ✅ reset pagination agar fetch dari halaman 1
      setFiltering(true);
      setOpen(true); // ✅ pastikan fetch tidak terblok
      shouldFetchWithoutFilterRef.current = false;
      setFetchKey((k) => k + 1);
    },
    [debouncedFilterUpdate]
  );

  const gridRef = useRef<DataGridHandle | null>(null);

  const handlePaste = (event: string) => {
    setOnPaste(true);
    if (disabled) return;
    try {
      const pasted = event.trim();

      if (forInput) {
        setInputValue(pasted);
        lookupValue?.(pasted);
        dispatch(setSelectLookup({ key: label ?? '', data: { text: pasted } }));
        setShowError({ label: label ?? '', status: false, message: '' });
        clearAllColumnFilters();
        dispatch(clearOpenName());
        setOpen(false);
        setTimeout(() => {
          setOnPaste(false);
        }, 100);
        return;
      }

      if (type !== 'local' && endpoint) {
        setInputValue(pasted.toUpperCase());
        setShowError({ label: label ?? '', status: false, message: '' });
        pasteErrorRef.current = false;
        setOpen(false);
        dispatch(clearOpenName());
        setTimeout(() => {
          setOnPaste(false);
        }, 100);
        selectFirstRow(pasted, false, true);
        return;
      }

      const searchSource = type === 'local' && data ? (data as Row[]) : rows;
      const match = searchSource.find(
        (row) =>
          String(row[postData as string]).toUpperCase() === pasted.toUpperCase()
      );
      setInputValue(pasted.toUpperCase());
      if (match) {
        pasteErrorRef.current = false;
        lookupValue?.(dataToPost ? match[dataToPost as string] : match.id);
        onSelectRow?.(match);
        setShowError({ label: label ?? '', status: false, message: '' });
        clearAllColumnFilters();
        dispatch(clearOpenName());
        setOpen(false);
      } else {
        pasteErrorRef.current = true;
        setShowError({
          label: label ?? '',
          status: true,
          message: 'DATA TIDAK DITEMUKAN'
        });
        clearAllColumnFilters();
        setOpen(false);
        dispatch(clearOpenName());
      }
      setTimeout(() => {
        setOnPaste(false);
      }, 100);
    } catch (error) {}
  };

  const formErrorMessage = useMemo(() => {
    if (!forms || !name) return undefined;
    const keys = String(name).split('.');
    let errorObj: any = forms.formState.errors;
    for (const key of keys) {
      if (!errorObj) return undefined;
      errorObj = errorObj[key];
    }
    return errorObj?.message as string | undefined;
  }, [forms?.formState.errors, name]);

  const handleButtonClick = () => {
    setOnPaste(false);
    if (disabled) return;

    if (label === openName) {
      if (open) {
        setCurrentPage(1);
        setFetchedPages(new Set());
        setRows([]);
        clearAllColumnFilters();
        setOpen(false);
        dispatch(clearOpenName());
        shouldFetchWithoutFilterRef.current = false;
      } else {
        if (inputValue && inputValue.trim() !== '') {
          shouldFetchWithoutFilterRef.current = true;
        }
        setOpen(true);
        dispatch(setOpenName(label || ''));
        setShowError({ label: label ?? '', status: false, message: '' });
      }
    } else {
      if (inputValue && inputValue.trim() !== '') {
        shouldFetchWithoutFilterRef.current = true;
      }
      setOpen(true);
      dispatch(setOpenName(label || ''));
      setShowError({ label: label ?? '', status: false, message: '' });
    }
  };

  const handleClearInput = () => {
    setOnPaste(false);
    if (disabled && !clearDisabled) return;
    setFilters({ ...filters, search: '', filters: {} });
    setInputValue('');
    typedTextRef.current = '';
    if (lookupValue) {
      lookupValue(null);
    }
    setShowError({ label: label ?? '', status: false, message: '' });

    setDeleteClicked(true);
    setHasUserInteracted(true);
    isUserTypingRef.current = false;
    isTypingRef.current = false;
    shouldFetchWithoutFilterRef.current = false;
    setFiltering(false);
    dispatch(setSelectLookup({ key: label ?? '', data: {} }));
    dispatch(setSearchTerm(''));
    dispatch(clearOpenName());
    clearAllColumnFilters();
    dispatch(removePendingLookup(label || ''));
    setOpen(false);

    setTimeout(() => {
      setDeleteClicked(false);
    }, 100);

    if (onClear) {
      onClear();
    }
  };

  const handleSort = (column: string) => {
    if (hideFilter) return;
    shouldFetchWithoutFilterRef.current = false;

    if (type === 'local' || !endpoint) {
      const currentSortBy = filters.sortBy;
      const currentSortDirection = filters.sortDirection;
      let newSortDirection: 'asc' | 'desc' = 'asc';
      if (currentSortBy === column && currentSortDirection === 'asc') {
        newSortDirection = 'desc';
      }

      setFilters((prevFilters) => ({
        ...prevFilters,
        sortBy: column,
        sortDirection: newSortDirection,
        page: 1
      }));

      const sortedRows = [...rows].sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];

        if (aValue == null) aValue = '';
        if (bValue == null) bValue = '';

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        } else if (typeof aValue !== typeof bValue) {
          aValue = String(aValue);
          bValue = String(bValue);
        }

        if (aValue < bValue) {
          return newSortDirection === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return newSortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
      setCurrentPage(1);
      setSelectedRow(0);
      setTimeout(() => {
        gridRef?.current?.scrollToCell?.({ rowIdx: 0, idx: 0 });
      }, 200);

      setRows(sortedRows);
      setIsLoading(false);
      return;
    } else {
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
        gridRef?.current?.scrollToCell?.({ rowIdx: 0, idx: 0 });
      }, 200);

      setSelectedRow(0);
      setCurrentPage(1);
      setFetchedPages(new Set([1])); // ✅ tambahkan ini — sudah ada setFetchedPages(new Set([1])) yang benar
      setRows([]);
      setFetchKey((k) => k + 1);
    }
  };

  const inputStopPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const columns: readonly Column<Row>[] = useMemo(() => {
    return rawColumns.map((col, index) => ({
      ...col,
      key: col.key,
      name: col.name,

      headerCellClass: 'column-headers',
      width: singleColumn ? '100%' : col.width ?? 250,
      resizable: true,
      renderHeaderCell: () => (
        <div
          key={index}
          className="flex h-full cursor-pointer flex-col items-center gap-1"
        >
          <div
            className={`headers-cell ${hideFilter ? 'h-[100%]' : 'h-[50%]'}`}
            onClick={() => handleSort(col.name)}
          >
            <p
              className={`text-sm uppercase ${
                filters.sortBy === col.name ? 'font-bold' : 'font-normal'
              }`}
            >
              {col.name}
            </p>
            {hideFilter ? null : (
              <div className="ml-2">
                {filters.sortBy === col.name &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === col.name &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            )}
          </div>
          {hideFilter ? null : (
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey={col.name}
                value={filters.filters[col.name] || ''}
                onChange={(value) => handleFilterInputChange(col.name, value)}
                tabIndex={-1}
                onClick={(e: React.MouseEvent<HTMLInputElement>) =>
                  e.stopPropagation()
                }
                onClear={() => handleClearFilter(col.name)}
                inputRef={(el) => {
                  columnInputRefs.current[col.name] = el;
                }}
              />
            </div>
          )}
        </div>
      ),
      renderCell: (props: any) => {
        const columnFilter = filters.filters[col.name] || '';
        let cellValue = props.row[props.column.key as keyof Row] || '';
        if (col.isCurrency) {
          cellValue = formatCurrency(cellValue);
        }
        return (
          <div
            className={`m-0 flex h-full items-center p-0  text-[12px] ${
              col.isCurrency ? 'justify-end' : 'justify-start'
            } ${forInput ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            style={
              forInput
                ? { pointerEvents: 'none', whiteSpace: 'pre-wrap' }
                : { whiteSpace: 'pre-wrap' }
            }
          >
            {highlightText(cellValue, filters.search, columnFilter)}
          </div>
        );
      }
    }));
  }, [filters, rawColumns, currentPage, singleColumn]);

  const [columnsOrder, setColumnsOrder] = useState((): readonly number[] =>
    columns.map((_, index) => index)
  );

  function isAtTop({ currentTarget }: React.UIEvent<HTMLDivElement>): boolean {
    return currentTarget.scrollTop <= 10;
  }

  function isAtBottom(event: React.UIEvent<HTMLDivElement>): boolean {
    const { currentTarget } = event;
    if (!currentTarget) return false;

    return (
      currentTarget.scrollTop + currentTarget.clientHeight >=
      currentTarget.scrollHeight - 2
    );
  }

  async function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (isLoading || !hasMore || rows.length === 0) return;
    const findUnfetchedPage = (pageOffset: number) => {
      let page = currentPage + pageOffset;
      while (page > 0 && fetchedPages.has(page)) {
        page += pageOffset;
      }
      return page > 0 ? page : null;
    };

    if (isAtBottom(event)) {
      const nextPage = findUnfetchedPage(1);
      if (nextPage && nextPage <= totalPages && !fetchedPages.has(nextPage)) {
        setCurrentPage(nextPage);
      }
    }
  }

  function handleCellClick(args: any) {
    const clickedRow = args.row;
    if (forInput) return;

    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
    }

    selectRowAndClose(clickedRow);
  }

  function onSelectedCellChange(args: { row: Row }) {
    if (forInput) return;
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
    }
  }

  document.querySelectorAll('.column-headers').forEach((element) => {
    element.classList.remove('c1kqdw7y7-0-0-beta-47');
  });

  function onColumnsReorder(sourceKey: string, targetKey: string) {
    setColumnsOrder((columnsOrder) => {
      const sourceColumnOrderIndex = columnsOrder.findIndex(
        (index) => columns[index].key === sourceKey
      );
      const targetColumnOrderIndex = columnsOrder.findIndex(
        (index) => columns[index].key === targetKey
      );
      const sourceColumnOrder = columnsOrder[sourceColumnOrderIndex];
      const newColumnsOrder = columnsOrder.toSpliced(sourceColumnOrderIndex, 1);
      newColumnsOrder.splice(targetColumnOrderIndex, 0, sourceColumnOrder);
      return newColumnsOrder;
    });
  }

  async function fetchRows(
    signal?: AbortSignal,
    overrideSearch?: string,
    skipFilters: boolean = false
  ): Promise<Row[]> {
    const instanceId = instanceIdRef.current;
    try {
      const response = await api2.get(`/${endpoint}`, {
        params: buildParams(overrideSearch, skipFilters),
        signal: signal
      });
      const { data, pagination } = response.data.data
        ? response.data
        : response || {};
      if (pagination?.totalPages) setTotalPages(pagination.totalPages);
      return Array.isArray(data) ? mapApiToRows(data) : [];
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        return [];
      }
      // Surface the *actual* backend reason. A 500 from these list endpoints
      // almost always carries the raw SQL message (e.g. "Invalid column name
      // 'xxx'") in the response body — that pinpoints which param/column is
      // bad. Logging only the AxiosError hides it. Use console.warn so an
      // already-handled fallback (we return []) doesn't trip Next.js's red
      // "Console Error" overlay in dev.
      console.warn(`[${label}] Failed to fetch rows`, {
        endpoint: `/${endpoint}`,
        requestUrl: error?.config?.url,
        params: error?.config?.params,
        status: error?.response?.status,
        serverMessage: error?.response?.data
      });
      return [];
    }
  }

  function getRowClass(row: Row) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    if (forInput) return 'disabled-row';
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: any) {
    return row.id;
  }

  function EmptyRowsRenderer() {
    return (
      <div className="flex h-full w-full items-center px-2">
        <p className="text-sm text-zinc-500">No results found</p>
      </div>
    );
  }

  function LoadRowsRenderer() {
    return (
      <div>
        <ImSpinner2 className="animate-spin text-3xl text-primary" />
      </div>
    );
  }

  const selectRowAndClose = useCallback(
    (rowData: Row) => {
      if (!rowData) {
        setShowError({
          label: label ?? '',
          status: true,
          message: 'DATA TIDAK DITEMUKAN'
        });
        return;
      }

      const classValue = String(rowData[postData as string] ?? '');
      const value = dataToPost ? rowData[dataToPost as string] : rowData.id;

      setInputValue(classValue);
      setClicked(true);
      setHasUserInteracted(true);

      setShowError({ label: label ?? '', status: false, message: '' });
      dispatch(removeErrorLookup(label || ''));
      setSuppressErrorMessage(true);

      setFilters((prev) => ({ ...prev, search: classValue || '' }));

      dispatch(setLookUpValue(rowData as any));
      dispatch(setSelectLookup({ key: label ?? '', data: rowData }));
      dispatch(removePendingLookup(label || ''));
      dispatch(clearOpenName());

      lookupValue?.(value);
      onSelectRow?.(rowData);

      setFiltering(false);
      setOpen(false);
      clearAllColumnFilters();
      setTimeout(() => setClicked(false), 100);
    },
    [label, postData, dataToPost, dispatch, lookupValue, onSelectRow]
  );

  const selectFirstRow = async (
    searchValue?: string,
    fromEnterKey: boolean = false,
    exactMatch: boolean = false
  ) => {
    const instanceId = instanceIdRef.current;
    const valueToSearch = searchValue ?? inputValue;

    if (fromEnterKey) {
      setIsEnterLoading(true);
    }

    try {
      let newRows: Row[] = [];

      if (type === 'local' || !endpoint) {
        const allRows = data ? [...data] : [];

        if (valueToSearch && valueToSearch.trim() !== '') {
          const searchLower = valueToSearch.toLowerCase();
          const validColumnKeys = columns.map((col) => col.key);

          newRows = allRows.filter((row: Row) =>
            validColumnKeys.some((colKey) =>
              String(row[colKey] ?? '')
                .toLowerCase()
                .includes(searchLower)
            )
          );
        } else {
          newRows = allRows;
        }

        if (filterby && !Array.isArray(filterby)) {
          newRows = newRows.filter((row: Row) =>
            Object.entries(filterby).every(
              ([k, v]) => String(row[k]) === String(v)
            )
          );
        }
      } else {
        const previousController = selectFirstRowControllerRef.current;
        if (previousController) {
          previousController.abort(
            `New selectFirstRow for instance: ${instanceId}`
          );
        }

        const controller = new AbortController();
        selectFirstRowControllerRef.current = controller;

        selectFirstRowRequestIdRef.current += 1;
        const myRequestId = selectFirstRowRequestIdRef.current;

        newRows = await fetchRows(controller.signal, valueToSearch, false);

        if (myRequestId !== selectFirstRowRequestIdRef.current) {
          if (fromEnterKey) {
            setIsEnterLoading(false);
          }
          return;
        }
      }
      if (newRows.length > 0) {
        const exactRow = newRows.find(
          (row) =>
            String(row[postData as string] ?? '').toUpperCase() ===
            (valueToSearch ?? '').toUpperCase()
        );
        // Di luar mode exactMatch, baris pertama tetap dipakai sebagai
        // fallback — tapi kalau ada baris yang PERSIS sama dengan isi input,
        // baris itu yang menang supaya nilai yang sedang tampil tidak
        // tertukar dengan hasil match sebagian.
        const targetRow = exactMatch ? exactRow : exactRow ?? newRows[0];

        if (!targetRow) {
          dispatch(removePendingLookup(label || ''));
          pasteErrorRef.current = true;
          setShowError({
            label: label ?? '',
            status: true,
            message: 'DATA TIDAK DITEMUKAN'
          });
          if (focusOnError) {
            dispatch(
              addErrorLookup({
                label: label || '',
                order: renderOrderRef.current
              })
            );
          }
        } else {
          const classValue = String(targetRow[postData as string] ?? '');
          setInputValue(classValue);
          setClicked(true);
          dispatch(setSelectLookup({ key: label ?? '', data: targetRow }));
          dispatch(removePendingLookup(label || ''));
          const value = targetRow[dataToPost as any];
          lookupValue?.(value);
          onSelectRow?.(targetRow);

          setFilters((prev) => ({
            ...prev,
            search: valueToSearch
          }));

          setTimeout(() => setClicked(false), 1000);

          if (fromEnterKey) {
            setTimeout(() => {
              setOpen(false);
              dispatch(clearOpenName());
            }, 1000);
          }
        }
      } else {
        dispatch(removePendingLookup(label || ''));
        setShowError({
          label: label ?? '',
          status: true,
          message: 'DATA TIDAK DITEMUKAN'
        });

        if (focusOnError) {
          dispatch(
            addErrorLookup({
              label: label || '',
              order: renderOrderRef.current
            })
          );
        }

        if (fromEnterKey) {
          setOpen(false);
          dispatch(clearOpenName());
        }
      }
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        if (fromEnterKey) {
          setIsEnterLoading(false);
        }
        return;
      }

      dispatch(removePendingLookup(label || ''));
      console.error(`[${label}] selectFirstRow error:`, err);
      setShowError({
        label: label ?? '',
        status: true,
        message: 'GAGAL MENGAMBIL DATA'
      });

      if (focusOnError) {
        dispatch(
          addErrorLookup({ label: label || '', order: renderOrderRef.current })
        );
      }

      if (fromEnterKey) {
        setOpen(false);
        dispatch(clearOpenName());
      }
    } finally {
      if (fromEnterKey) {
        setIsEnterLoading(false);
      }
    }
  };

  // Resolve teks awal dari parent (`lookupNama`) menjadi row aslinya supaya
  // lookupValue/onSelectRow tetap terpanggil walau dropdown belum pernah
  // dibuka. Sengaja TIDAK memakai selectFirstRow: fungsi itu ikut menimpa
  // inputValue, memunculkan pesan "DATA TIDAK DITEMUKAN", dan memindahkan
  // fokus ke input — tiga hal yang tidak boleh terjadi untuk resolve latar
  // belakang atas nilai yang memang sudah dipercaya dari parent. Kalau resolve
  // gagal, input tetap menampilkan teks dari parent apa adanya.
  const resolveLookupNama = async (namaToResolve: string) => {
    if (!namaToResolve || !endpoint || type === 'local') return;
    if (resolvedNamaRef.current === namaToResolve) return;
    resolvedNamaRef.current = namaToResolve;

    try {
      const controller = new AbortController();
      const fetched = await fetchRows(controller.signal, namaToResolve, false);

      if (fetched.length === 0) {
        // Kemungkinan besar request gagal/dibatalkan — buka lagi kuncinya
        // supaya masih bisa dicoba ulang saat prop berubah lagi.
        resolvedNamaRef.current = null;
        return;
      }

      const match = fetched.find(
        (row) =>
          String(row[postData as string] ?? '').toUpperCase() ===
          namaToResolve.toUpperCase()
      );

      if (!match) return;

      dispatch(setSelectLookup({ key: label ?? '', data: match }));
      lookupValue?.(dataToPost ? match[dataToPost as string] : match.id);
      onSelectRow?.(match);
    } catch {
      // Diabaikan: input tetap memakai teks dari parent.
    }
  };

  // ─── INLINE AUTOCOMPLETE (ghost text) ───────────────────────────────────────
  // Saran mengikuti baris yang sedang ter-select (selectedRow), bukan selalu
  // baris teratas. Ghost text hanya muncul bila teks yang diketik merupakan
  // awalan dari nilai tampilan baris tersebut (case-insensitive).
  const suggestion = useMemo(() => {
    if (!autoComplete || forInput) return '';
    if (!open) return '';
    const typed = inputValue ?? '';
    if (typed.trim() === '') return '';
    if (rows.length === 0) return '';

    const idx = Math.min(Math.max(0, selectedRow), rows.length - 1);
    const candidateRaw = rows[idx]?.[postData as string];
    if (candidateRaw == null) return '';

    const candidate = String(candidateRaw);
    if (
      candidate.length > typed.length &&
      candidate.toLowerCase().startsWith(typed.toLowerCase())
    ) {
      return candidate;
    }
    return '';
  }, [autoComplete, forInput, open, inputValue, rows, selectedRow, postData]);

  // Bagian abu-abu yang ditampilkan (sisa setelah teks yang sudah diketik).
  const suggestionCompletion = suggestion
    ? suggestion.slice(inputValue.length)
    : '';

  const acceptSuggestion = useCallback(() => {
    if (!suggestion) return;
    setInputValue(suggestion);
    setHasUserInteracted(true);
    isUserTypingRef.current = true;
    isTypingRef.current = false;
    setRows([]);
    setFilters((prev) => ({
      ...prev,
      filters: initializeColumnFilters(),
      search: suggestion,
      page: 1
    }));
    setFiltering(true);
    setCurrentPage(1);
    setFetchedPages(new Set([1]));
    setFetchKey((k) => k + 1);
  }, [suggestion, initializeColumnFilters]);

  const handleInputKeydown = async (event: any) => {
    if (forInput) {
      if (event.key === 'Enter') {
        clearAllColumnFilters();
        dispatch(clearOpenName());
        lookupValue?.(inputValue);
        dispatch(
          setSelectLookup({ key: label ?? '', data: { text: inputValue } })
        );
        setOpen(false);
      }
      return;
    }

    // Terima saran inline dengan Tab atau panah kanan (saat kursor di akhir teks)
    if (suggestion) {
      const el = event.currentTarget as HTMLInputElement;
      const caretAtEnd =
        el.selectionStart === el.value.length &&
        el.selectionEnd === el.value.length;

      if (event.key === 'Tab' || (event.key === 'ArrowRight' && caretAtEnd)) {
        event.preventDefault();
        acceptSuggestion();
        return;
      }
    }

    if (!autoSearch && !open && event.key === 'Enter') {
      event.preventDefault();
      selectFirstRow(inputValue);
      return;
    }

    if (!open || label !== openName) {
      return;
    }

    const totalRows = rows.length;
    const visibleRowCount = 12;

    const safeSelectedRow = Math.min(Math.max(0, selectedRow), totalRows - 1);
    const rowData = rows[safeSelectedRow];

    if (event.key === 'Enter') {
      event.preventDefault();
      if (isEnterLoading) {
        return;
      }

      if (open && inputValue.trim() !== '' && totalRows === 0) {
        await selectFirstRow(inputValue, true);
        return;
      }

      if (rowData && totalRows > 0) {
        selectRowAndClose(rowData);
        return;
      }

      if (!rowData && inputValue.trim() !== '') {
        setShowError({
          label: label ?? '',
          status: true,
          message: 'DATA TIDAK DITEMUKAN'
        });
        dispatch(removePendingLookup(label || ''));
        clearAllColumnFilters();
        setOpen(false);
        dispatch(clearOpenName());
        return;
      }
    }

    const moveSelection = (nextRowIdx: number) => {
      if (totalRows <= 0) return;

      const clamped = Math.min(Math.max(0, nextRowIdx), totalRows - 1);
      setSelectedRow(clamped);
      gridRef.current?.scrollToCell?.({ rowIdx: clamped, idx: 0 });

      // Sinkronkan tampilan input dengan baris yang ter-select saat navigasi,
      // TAPI hanya kalau user memang sedang mengetik. Kalau isi input datang
      // dari `lookupNama`/baris yang sudah terpilih (typedTextRef kosong),
      // input TIDAK boleh disentuh — kalau tidak, nilai yang sedang tampil
      // ikut tertimpa/terhapus begitu user menekan panah di popover.
      const baseTyped = typedTextRef.current ?? '';
      if (autoComplete && !forInput && baseTyped !== '' && rows[clamped]) {
        const val = String(rows[clamped][postData as string] ?? '');
        const isPrefix = val.toLowerCase().startsWith(baseTyped.toLowerCase());
        const nextDisplay = isPrefix ? baseTyped : val;

        // Jangan pernah mengosongkan input hanya karena baris terpilih tidak
        // punya nilai di kolom `postData`.
        if (nextDisplay !== '' && nextDisplay !== inputValue) {
          skipNextFetchRef.current = true;
          setInputValue(nextDisplay);
        }
      }
    };

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelection(selectedRow + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(selectedRow - 1);
    } else if (event.key === 'PageDown') {
      event.preventDefault();
      moveSelection(selectedRow + visibleRowCount);
    } else if (event.key === 'PageUp') {
      event.preventDefault();
      moveSelection(selectedRow - visibleRowCount);
    }
  };

  useEffect(() => {
    if (open) {
      setIsFirstLoad(true);
      setSelectedRow(0);
      setTimeout(() => {
        isUserTypingRef.current = false;
        isTypingRef.current = false;
      }, 150);
    }
  }, [open]);

  useEffect(() => {
    if (isFirstLoad && gridRef.current && rows.length > 0 && open) {
      setIsFirstLoad(false);
      setSelectedRow(0);
      gridRef.current.scrollToCell?.({ rowIdx: 0, idx: 0 });
    }
  }, [rows, isFirstLoad, open]);

  const handleClickInput = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (selectedRequired) {
      return;
    }

    if (!open) {
      if (inputValue && inputValue.trim() !== '') {
        shouldFetchWithoutFilterRef.current = true;
      }
      setOpen(true);
      dispatch(setOpenName(label || ''));
      setShowError({ label: label ?? '', status: false, message: '' });
    } else if (open && filters.search.trim() !== '' && rows.length > 0) {
      if (forInput) {
        setOpen(false);
        clearAllColumnFilters();
        dispatch(setOpenName(label || ''));
        dispatch(clearOpenName());
        return;
      }
      // `rows` di sini bisa berisi daftar UTUH (popover sengaja dibuka tanpa
      // memfilter pakai nilai yang sedang tampil), jadi rows[0] belum tentu
      // baris yang cocok dengan input. Ambil baris yang benar-benar sama
      // dengan isi input dulu; kalau tidak ada, jangan sentuh input sama
      // sekali — sebelumnya baris pertama dipakai membabi buta sehingga
      // nilai yang sedang tampil ikut tertimpa/terhapus.
      const currentValue = (inputValue ?? '').trim();
      const matchedRow =
        rows.find(
          (row) =>
            String(row[postData as string] ?? '').toUpperCase() ===
            currentValue.toUpperCase()
        ) ?? (currentValue === '' ? rows[0] : undefined);

      if (!matchedRow) {
        dispatch(clearOpenName());
        setOpen(false);
        clearAllColumnFilters();
        return;
      }

      const matchedValue = String(matchedRow[postData as string] ?? '');

      setFilters({
        ...filters,
        search: matchedValue
      });

      setInputValue(matchedValue);
      const value = dataToPost
        ? matchedRow[dataToPost as string]
        : matchedRow.id;
      lookupValue?.(value);
      onSelectRow?.(matchedRow);
      dispatch(clearOpenName());
      setOpen(false);
      clearAllColumnFilters();
      dispatch(setOpenName(label || ''));
      dispatch(clearOpenName());
    } else if (open && singleColumn) {
      setOpen(false);
      clearAllColumnFilters();
      dispatch(clearOpenName());
    }
  };

  // `skipFilters` = padanan lokal dari parameter dengan nama sama di
  // buildParams (dipakai fetchRows untuk lookup ber-endpoint): search +
  // filter kolom diabaikan, `filterby` TETAP dipakai. Ini yang membuat
  // popover tampil utuh saat dibuka walau input sudah ada isinya.
  const applyFilters = useCallback(
    (rows: Row[], skipFilters: boolean = false) => {
      let filtered = rows;

      if (!skipFilters && filters.search && filters.search.trim() !== '') {
        const validColumnKeys = columns.map((col) => col.key);
        const searchLower = filters.search.toLowerCase();

        filtered = filtered.filter((row: Row) =>
          validColumnKeys.some((colKey) =>
            String(row[colKey] ?? '')
              .toLowerCase()
              .includes(searchLower)
          )
        );
      }

      const nameToKeyMap = rawColumns.reduce(
        (acc, col) => {
          acc[col.name] = col.key;
          return acc;
        },
        {} as Record<string, string>
      );

      for (const [colName, filterValue] of Object.entries(
        skipFilters ? {} : filters.filters || {}
      )) {
        if (!filterValue || filterValue.trim() === '') continue;

        const colKey = nameToKeyMap[colName] || colName;
        filtered = filtered.filter((row: Row) =>
          String(row[colKey as keyof Row] ?? '')
            .toLowerCase()
            .includes(String(filterValue).toLowerCase())
        );
      }

      if (filterby && !Array.isArray(filterby)) {
        filtered = filtered.filter((row: Row) =>
          Object.entries(filterby).every(
            ([k, v]) => String(row[k]) === String(v)
          )
        );
      }

      return filtered;
    },
    [filterby, filters, columns, rawColumns]
  );

  // ─── MAIN FETCH useEffect ────────────────────────────────────────────────────
  // rows.length tidak ada di dependency — menghindari fetch loop.
  // fetchKey di-increment setiap kali filter/search baru siap, memastikan
  // fetch selalu terpicu meski rows sudah kosong terlebih dahulu.
  useEffect(() => {
    // Lewati fetch bila inputValue berubah hanya karena navigasi panah
    // (nilai baris terpilih diisikan ke input, filter/search tidak berubah).
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    // Dihitung SEBELUM cabang lokal supaya kedua jenis lookup (lokal maupun
    // ber-endpoint) memakai aturan yang sama persis: begitu popover dibuka
    // dengan input yang sudah ada isinya, daftar ditampilkan UTUH -- nilai di
    // input TIDAK dipakai sebagai filter -- agar user bisa melihat & memilih
    // opsi lain. Sebelumnya flag ini cuma dipakai cabang endpoint (lewat
    // skipFilters di buildParams), sementara cabang lokal selalu menyaring
    // `data` dengan filters.search sehingga popover terbuka hampir kosong:
    // isinya hanya baris yang sedang terpilih.
    const shouldFetchForDefault =
      !hasUserInteracted && !inputValue && !lookupNama;
    const hasActiveColumnFilters = Object.values(filters.filters || {}).some(
      (v) => v && v.trim() !== ''
    );
    // Filter kolom yang aktif selalu menang: itu memang diketik user di dalam
    // popover, bukan sisa nilai terpilih.
    const shouldSkipFilters =
      !hasActiveColumnFilters &&
      (shouldFetchWithoutFilterRef.current || shouldFetchForDefault);

    if (type === 'local' || !endpoint) {
      const filteredRows = data ? applyFilters(data, shouldSkipFilters) : [];

      if (isdefault && !hasUserInteracted && !lookupNama && !inputValue) {
        if (isdefault === 'YA') {
          const defaultRow = filteredRows.find(
            (row: any) => row.default === 'YA'
          );
          if (defaultRow) {
            setInputValue(defaultRow?.text);
            if (lookupValue) {
              lookupValue(
                dataToPost ? defaultRow[dataToPost as string] : defaultRow?.id
              );
            }
            onSelectRow?.(defaultRow);
          }
        }
      }

      setRows(filteredRows);
      setIsLoading(false);
      return;
    }

    if (isTypingRef.current) {
      return;
    }

    if (!open && !shouldFetchForDefault) {
      setIsLoading(false);
      return;
    }

    const instanceId = instanceIdRef.current;
    setIsLoading(true);

    const previousController = getAbortController();
    if (previousController) {
      previousController.abort(`New request for instance: ${instanceId}`);
    }

    const controller = new AbortController();
    setAbortController(controller);

    const myRequestId = incrementRequestId();

    (async () => {
      try {
        const newRows = await fetchRows(
          controller.signal,
          undefined,
          shouldSkipFilters
        );

        if (myRequestId !== getRequestId()) return;

        setRows((prev) => {
          if (currentPage === 1) return newRows;

          const seen = new Set<number | string>();
          const merged = [...prev, ...newRows].filter((r) => {
            const k = r.id;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          return merged;
        });

        setFetchedPages((prev) => {
          const s = new Set(prev);
          s.add(currentPage);
          return s;
        });

        setHasMore(currentPage < totalPages);
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          return;
        }
        if (myRequestId === getRequestId()) {
          console.error(`[${instanceId}] Failed to fetch rows:`, err);
        }
      } finally {
        if (myRequestId === getRequestId()) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      // Tidak abort di cleanup untuk mencegah cancel premature
    };
  }, [
    open,
    endpoint,
    type,
    currentPage,
    filters.search,
    filters.sortBy,
    filters.sortDirection,
    columnFiltersString,
    totalPages,
    data,
    applyFilters,
    hasUserInteracted,
    inputValue,
    lookupNama,
    fetchKey // ← pengganti rows.length: hanya naik saat filter benar-benar siap
  ]);

  useEffect(() => {
    if (
      type !== 'local' &&
      endpoint &&
      !hasUserInteracted &&
      !inputValue &&
      !lookupNama &&
      rows.length > 0
    ) {
      const defaultRow = rows.find((row: any) => row.default === 'YA');
      if (defaultRow) {
        const value = dataToPost
          ? defaultRow[dataToPost as string]
          : defaultRow.id;
        const classValue = defaultRow[postData as string];

        setInputValue(classValue);
        lookupValue?.(value);
        onSelectRow?.(defaultRow);
        dispatch(setSelectLookup({ key: label ?? '', data: defaultRow }));
      }
    }
  }, [
    type,
    endpoint,
    rows,
    hasUserInteracted,
    inputValue,
    lookupNama,
    dataToPost,
    postData,
    lookupValue,
    onSelectRow,
    dispatch,
    label
  ]);

  useEffect(() => {
    const handleResize = () => {
      if (inputRef.current) {
        setPopoverWidth(inputRef.current.offsetWidth);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);

    if (inputRef.current) {
      resizeObserver.observe(inputRef.current);
    }

    return () => {
      if (inputRef.current) {
        resizeObserver.unobserve(inputRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedRequired) {
        return;
      }

      const isOutside =
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        gridLookUpRef.current &&
        !gridLookUpRef.current.contains(e.target as Node);

      if (!isOutside) {
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (forInput) {
        setClickedOutside(true);
        setOpen(false);
        dispatch(clearOpenName());
        dispatch(removePendingLookup(label || ''));
        setFiltering(false);
        shouldFetchWithoutFilterRef.current = false;
        return;
      }

      setClickedOutside(true);
      setOpen(false);
      clearAllColumnFilters();
      dispatch(clearOpenName());
      setFiltering(false);
      shouldFetchWithoutFilterRef.current = false;

      const currentInputValue = inputValue;

      if (currentInputValue && currentInputValue.trim() !== '') {
        selectFirstRow(currentInputValue);
      } else {
        dispatch(removePendingLookup(label || ''));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [
    inputValue,
    rows,
    postData,
    dataToPost,
    selectedRequired,
    forInput,
    lookupValue,
    onSelectRow,
    label,
    dispatch,
    selectFirstRow
  ]);

  useEffect(() => {
    if (
      autoSearch &&
      !onPaste &&
      !deleteClicked &&
      !clicked &&
      !clickedOutside &&
      label === openName
    ) {
      if (filters.search.trim() !== '' && filtering) {
        setOpen(true);
        setSelectedRow(0);
        setClickedOutside(false);
      } else if (
        Object.values(filters.filters || {}).some(
          (v) => v && v.trim() !== ''
        ) &&
        filtering
      ) {
        setOpen(true);
        setSelectedRow(0);
        setClickedOutside(false);
      }
    }

    if (clickedOutside) {
      setTimeout(() => setClickedOutside(false), 100);
    }
  }, [
    filters.search,
    columnFiltersString,
    filtering,
    autoSearch,
    onPaste,
    deleteClicked,
    clicked,
    clickedOutside,
    openName,
    label
  ]);

  useEffect(() => {
    let newWidth = inputRef.current?.offsetWidth || 'auto';
    if (extendSize) {
      const extendedWidth = parseInt(extendSize, 10);
      if (!isNaN(extendedWidth)) {
        newWidth = parseInt(newWidth as string, 10) + extendedWidth + 'px';
      }
    }
    setPopoverWidth(newWidth);
  }, [extendSize]);

  useEffect(() => {
    if (!hasInitializedRef.current && lookupNama) {
      setInputValue(lookupNama);

      const foundRow = rows.find(
        (row) => String(row[postData as string]) === String(lookupNama)
      );

      if (foundRow) {
        onSelectRow?.(foundRow);
        lookupValue?.(
          dataToPost ? foundRow[dataToPost as string] : foundRow?.id
        );
      } else if (type !== 'local' && endpoint) {
        // Lookup remote yang belum pernah dibuka = `rows` masih kosong,
        // jadi foundRow tidak akan pernah ketemu dari cache lokal ini —
        // padahal caller cuma kasih teks awal (lookupNama) tanpa pernah
        // membuka dropdown untuk resolve dulu. Resolve sekali di background
        // supaya onSelectRow/lookupValue tetap terpanggil otomatis dengan
        // row aslinya, bukan cuma tampil sebagai teks.
        resolveLookupNama(lookupNama);
      }

      hasInitializedRef.current = true;
      prevLookupNamaRef.current = lookupNama;
    }
  }, [lookupNama, rows]);

  useEffect(() => {
    if (!hasInitializedRef.current || isUserTypingRef.current) {
      return;
    }

    const hasValueChanged = prevLookupNamaRef.current !== lookupNama;

    if (!hasValueChanged) {
      return;
    }

    if (lookupNama && !deleteClicked && !clicked) {
      setInputValue(lookupNama);

      const foundRow = rows.find(
        (row) => String(row[postData as string]) === String(lookupNama)
      );

      if (foundRow) {
        onSelectRow?.(foundRow);
        lookupValue?.(
          dataToPost ? foundRow[dataToPost as string] : foundRow?.id
        );
      } else if (type !== 'local' && endpoint) {
        // Sama seperti efek inisialisasi di atas: nilai lookupNama baru ini
        // belum tentu ada di cache `rows` lokal (mis. dropdown belum dibuka
        // sejak prop berubah) — resolve sekali di background.
        resolveLookupNama(lookupNama);
      }

      prevLookupNamaRef.current = lookupNama;
    } else if (!lookupNama && !deleteClicked && !clicked) {
      setInputValue('');
      setFilters((prev) => ({ ...prev, search: '', filters: {} }));

      prevLookupNamaRef.current = lookupNama;
    }
    // Kalau perubahan datang saat `clicked`/`deleteClicked` masih aktif,
    // prevLookupNamaRef sengaja TIDAK diperbarui supaya nilai baru tetap
    // dianggap "belum diterapkan" dan diproses lagi di render berikutnya —
    // sebelumnya update seperti ini hilang diam-diam dan input jadi kosong.
  }, [lookupNama, rows, deleteClicked, clicked]);

  useEffect(() => {
    isUserTypingRef.current = false;
  }, [lookupNama]);

  useEffect(() => {
    if (clearLookup) {
      setInputValue('');
      dispatch(setClearLookup(false));
      setFilters({ ...filters, search: '', filters: {} });
      shouldFetchWithoutFilterRef.current = false;
    }
  }, [clearLookup, dispatch]);

  useEffect(() => {
    const preventScrollOnSpace = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', preventScrollOnSpace);

    return () => {
      document.removeEventListener('keydown', preventScrollOnSpace);
    };
  }, []);

  useEffect(() => {
    const handleGlobalEnter = async (event: KeyboardEvent) => {
      if (label !== openName) return;

      if (event.key !== 'Enter') return;

      if (isEnterLoading) return;

      if (forInput) return;

      if (open && rows.length > 0) {
        event.preventDefault();
        const safeSelectedRow = Math.min(
          Math.max(0, selectedRow),
          rows.length - 1
        );
        const rowData = rows[safeSelectedRow];
        if (rowData) {
          selectRowAndClose(rowData);
          return;
        }
      }

      if (inputValue.trim() !== '') {
        event.preventDefault();
        if (open && rows.length === 0 && !isLoading) {
          setShowError({
            label: label ?? '',
            status: true,
            message: 'DATA TIDAK DITEMUKAN'
          });
          dispatch(removePendingLookup(label || ''));
          setOpen(false);
          dispatch(clearOpenName());
          return;
        }

        await selectFirstRow(inputValue, true);
        return;
      }
    };

    document.addEventListener('keydown', handleGlobalEnter);

    return () => {
      document.removeEventListener('keydown', handleGlobalEnter);
    };
  }, [
    label,
    openName,
    open,
    rows,
    selectedRow,
    inputValue,
    forInput,
    isEnterLoading,
    isLoading,
    selectRowAndClose,
    dispatch,
    setShowError
  ]);

  useEffect(() => {
    if (label === openName && !onPaste) {
      setOpen(true);
    }
  }, [openName, label, onPaste]);

  const prevOpenRef = useRef<boolean>(open);
  useEffect(() => {
    if (prevOpenRef.current && !open && forInput) {
      lookupValue?.(inputValue);
      dispatch(
        setSelectLookup({ key: label ?? '', data: { text: inputValue } })
      );
    }
    prevOpenRef.current = open;
  }, [open, forInput, inputValue, lookupValue, dispatch, label]);

  useEffect(() => {
    const preventScrollOnSpace = (event: KeyboardEvent) => {
      if (inputRef.current) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          setSelectedRow(0);
          gridRef?.current?.selectCell({ rowIdx: 0, idx: 0 });
        }
        return;
      }
      document.addEventListener('keydown', preventScrollOnSpace);
    };
  }, [inputRef]);

  useEffect(() => {
    if (submitClicked && required) {
      if (
        showError.label?.toLowerCase() === label?.toLowerCase() &&
        (inputValue === '' || inputValue == null || inputValue === undefined)
      ) {
        // Reset dulu agar useEffect errorLookups re-trigger meski value sama
        dispatch(removeErrorLookup(label || ''));
        setShowError({ label: label ?? '', status: false, message: '' });

        setTimeout(() => {
          setShowError({
            label: label ?? '',
            status: true,
            message: `${label} ${REQUIRED_FIELD}`
          });
        }, 0);
      } else {
        setShowError({ label: label ?? '', status: false, message: '' });
      }
    }
    dispatch(setSubmitClicked(false));
  }, [required, submitClicked, inputValue, lookupNama, label, dispatch]);

  useEffect(() => {
    if (onPaste) return;
    if (pasteErrorRef.current) return;

    if (inputValue !== '') {
      setShowError({ label: label ?? '', status: false, message: '' });
    } else if (
      lookupNama !== undefined &&
      String(label) === String(showError.label)
    ) {
      setShowError({ label: label ?? '', status: false, message: '' });
    }
  }, [lookupNama, inputValue, label, showError.label]);

  useEffect(() => {
    if (focus === name && submitClicked) {
    }
  }, [focus, name, inputRef, submitClicked]);

  useEffect(() => {
    if (focusOnError && required) {
      const order = Date.now() + Math.random();
      renderOrderRef.current = order;
    }
  }, []);

  useEffect(() => {
    if (showError.status && showError.label === label) {
      dispatch(
        addErrorLookup({ label: label || '', order: renderOrderRef.current })
      );
    } else if (!showError.status) {
      dispatch(removeErrorLookup(label || ''));
    }
  }, [
    showError.status,
    showError.label,
    label,
    dispatch,
    errorMessage,
    formErrorMessage
  ]);
  useEffect(() => {
    if (errorLookups.length > 0) {
      const firstError = errorLookups[0];
      if (firstError.label === label) {
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 100);
      }
    }
  }, [errorLookups, label, errorMessage, formErrorMessage]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      const controller = getAbortController();
      if (controller) {
        controller.abort(`Component unmount: ${label}`);
        setAbortController(null);
      }
    };
  }, []);
  useEffect(() => {
    if (formErrorMessage) {
      setShowError({
        label: label ?? '',
        status: false,
        message: ''
      });
    }
  }, [formErrorMessage, label]);

  // Setelah ini:
  useEffect(() => {
    if (errorMessage || formErrorMessage) {
      setSuppressErrorMessage(false);
    }
  }, [errorMessage, formErrorMessage]);

  // Tambahkan:
  useEffect(() => {
    if (showError.status && showError.label === label) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [showError.status, showError.label, label]);

  useEffect(() => {
    if ((errorMessage || formErrorMessage) && !suppressErrorMessage) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [errorMessage, formErrorMessage, suppressErrorMessage]);
  useEffect(() => {
    if (forms?.formState.isSubmitted || forms?.formState.submitCount) {
      setSuppressErrorMessage(false);
    }
  }, [forms?.formState.submitCount, forms?.formState.isSubmitted]);
  return (
    <Popover open={open} onOpenChange={() => {}}>
      <PopoverTrigger asChild>
        <div className="flex w-full flex-col">
          {forms ? (
            <FormField
              name={String(name) ?? ''}
              control={forms?.control}
              render={({ field }) => (
                <FormItem className="flex w-full flex-col justify-between ">
                  <FormControl>
                    <div
                      className="relative flex w-full flex-row items-center"
                      ref={popoverRef}
                    >
                      <Input
                        {...field}
                        ref={inputRef}
                        onPaste={(e) =>
                          handlePaste(e.clipboardData.getData('text'))
                        }
                        // Token tema, sama dengan cabang non-FormControl di
                        // bawah. Versi lama memakai text-zinc-900 + border-zinc-300
                        // yang dipatok terang, jadi begitu field ada isinya
                        // teksnya hitam di atas background gelap (tak terbaca).
                        className={`w-full rounded-r-none text-sm text-input-text lg:w-[100%] rounded-none${
                          showOnButton && !forInput
                            ? 'rounded-r-none border-r-0'
                            : ''
                        } border border-input-border pr-10 focus:border-input-border-focus`}
                        disabled={disabled}
                        value={inputValue}
                        onClick={(e) => handleClickInput(e as any)}
                        onKeyDown={handleInputKeydown}
                        onChange={(e) => {
                          handleInputChange(e);
                        }}
                      />

                      {suggestionCompletion ? (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 left-0 flex h-9 items-center overflow-hidden whitespace-pre pl-3 pr-20 text-sm font-normal uppercase tracking-normal text-input-text"
                        >
                          <span className="invisible text-sm">
                            {inputValue}
                          </span>
                          <span className="text-sm text-zinc-400">
                            {suggestionCompletion}
                          </span>
                        </div>
                      ) : null}

                      {!forInput && showClearButton ? (
                        <Button
                          type="button"
                          disabled={disabled && !clearDisabled ? true : false}
                          variant="ghost"
                          className="absolute right-10 text-gray-500 hover:bg-transparent"
                          onClick={handleClearInput}
                        >
                          <Image
                            src={IcClose}
                            width={15}
                            height={15}
                            alt="close"
                          />
                        </Button>
                      ) : null}

                      {showOnButton && !forInput ? (
                        // Kelas HARUS pakai token tema, sama dengan cabang
                        // non-FormControl di bawah. Versi lama memakai warna
                        // biru-muda yang dipatok (#e0ecff dkk) sehingga tombolnya
                        // menyala putih di dark mode.
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-l-none border border-input-border bg-background-grid-header text-button-text hover:bg-background-input-focus hover:text-button-text"
                          onClick={handleButtonClick}
                          disabled={disabled}
                        >
                          <FaChevronDown />
                        </Button>
                      ) : null}
                    </div>
                  </FormControl>
                  <p className="text-[0.8rem] text-destructive">
                    {showError.status === true && label === showError.label
                      ? showError.message
                      : !suppressErrorMessage &&
                        (errorMessage || formErrorMessage)
                      ? errorMessage || formErrorMessage
                      : null}
                  </p>
                </FormItem>
              )}
            />
          ) : (
            <div className="flex w-full flex-col justify-between ">
              <div
                className="relative flex w-full flex-row items-center"
                ref={popoverRef}
              >
                <Input
                  ref={inputRef}
                  onPaste={(e) => handlePaste(e.clipboardData.getData('text'))}
                  className={`w-full rounded-r-none text-sm text-input-text lg:w-[100%] rounded-none${
                    showOnButton && !forInput ? 'rounded-r-none border-r-0' : ''
                  } border border-input-border pr-10 focus:border-input-border-focus`}
                  disabled={disabled}
                  value={inputValue}
                  onClick={(e) => handleClickInput(e as any)}
                  onKeyDownCapture={(e) => {
                    if (
                      e.key === 'ArrowLeft' ||
                      e.key === 'ArrowRight' ||
                      e.key === 'Home' ||
                      e.key === 'End'
                    ) {
                      e.stopPropagation();
                    }
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    handleInputKeydown(e);
                  }}
                  onChange={(e) => {
                    handleInputChange(e);
                  }}
                  name={String(name) ?? ''}
                />

                {suggestionCompletion ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 flex h-9 items-center overflow-hidden whitespace-pre pl-3 pr-20 text-sm font-normal uppercase tracking-normal text-input-text"
                  >
                    <span className="invisible text-sm">{inputValue}</span>
                    <span className="text-sm text-zinc-400">
                      {suggestionCompletion}
                    </span>
                  </div>
                ) : null}

                {!forInput && showClearButton ? (
                  <Button
                    type="button"
                    disabled={disabled && !clearDisabled ? true : false}
                    variant="ghost"
                    className="absolute right-10 text-gray-500 hover:bg-transparent"
                    onClick={handleClearInput}
                  >
                    <Image src={IcClose} width={15} height={15} alt="close" />
                  </Button>
                ) : null}

                {showOnButton && !forInput ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-l-none border border-input-border bg-background-grid-header text-button-text hover:bg-[#7eafff] hover:text-[#0e2d5f]"
                    onClick={handleButtonClick}
                    disabled={disabled}
                  >
                    <FaChevronDown />
                  </Button>
                ) : null}
              </div>
              <p className="text-[0.8rem] text-destructive">
                {showError.status === true && label === showError.label
                  ? showError.message
                  : !suppressErrorMessage && (errorMessage || formErrorMessage)
                  ? errorMessage || formErrorMessage
                  : null}
              </p>
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        id="popover-content"
        className="h-fit border border-border p-0 shadow-none backdrop-blur-none"
        side={side}
        align="start"
        sideOffset={side === 'top' ? 4 : -2}
        avoidCollisions={!side ? true : side === 'top'}
        style={{ width: popoverWidth }}
        onEscapeKeyDown={() => {
          if (!isEnterLoading) {
            setOpen(false);
          }
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {open && (
          <div ref={gridLookUpRef} className="w-full">
            <div
              className={`${
                collapse === true ? 'w-full' : 'w-[100%]'
              } flex-grow overflow-hidden transition-all duration-300`}
            >
              <div className="min-w-full rounded-lg bg-white">
                <div className="flex h-[25px] w-full flex-row items-center border border-x-0 border-t-0 border-border bg-background-grid-header px-2 py-2">
                  <p className="text-[12px]">{labelLookup}</p>
                </div>
                <div
                  className={`${
                    rows.length > 0
                      ? rows.length < 10
                        ? 'h-fit'
                        : 'h-[290px]'
                      : singleColumn && rows.length <= 0
                      ? 'h-[30px]'
                      : 'h-[100px]'
                  }`}
                >
                  <DataGrid
                    ref={gridRef}
                    columns={columns}
                    rows={rows}
                    rowKeyGetter={rowKeyGetter}
                    onScroll={handleScroll}
                    rowClass={getRowClass}
                    onCellClick={handleCellClick}
                    onSelectedCellChange={(args: any) => {
                      onSelectedCellChange({ row: args.row });
                    }}
                    rowHeight={30}
                    headerRowHeight={singleColumn ? 0 : hideFilter ? 30 : 70}
                    className={`${isDark ? 'rdg-dark' : 'rdg-light'} ${
                      rows.length > 0
                        ? rows.length < 10
                          ? 'h-fit'
                          : 'h-[290px]'
                        : singleColumn && rows.length <= 0
                        ? 'h-[30px]'
                        : 'h-[100px]'
                    } ${rows.length < 10 ? 'overflow-hidden' : ''}`}
                    onColumnsReorder={onColumnsReorder}
                    renderers={{
                      noRowsFallback: <EmptyRowsRenderer />
                    }}
                  />
                  {isLoading ? (
                    <div className="absolute bottom-0 flex w-full flex-row gap-2 bg-background-grid-header py-1">
                      <LoadRowsRenderer />
                      <p className="text-primary-text text-sm">Loading...</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
