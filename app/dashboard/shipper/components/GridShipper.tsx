'use client';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback
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
import FormShipper from './FormShipper';
import { useQueryClient } from 'react-query';

import {
  useCreateShipper,
  useDeleteShipper,
  useGetShipper,
  useUpdateShipper
} from '@/lib/server/useShipper';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { FaPrint, FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { api2 } from '@/lib/utils/AxiosInstance';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { useDispatch } from 'react-redux';
import { Checkbox } from '@/components/ui/checkbox';
import { useAlert } from '@/lib/store/client/useAlert';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import IcClose from '@/public/image/x.svg';
import { IShipper, filterShipper } from '@/lib/types/shipper.type';
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
  ShipperInput,
  ShipperSchema
} from '@/lib/validations/shipper.validation';
import { formatCurrency } from '@/lib/utils';
import { getShipperFn } from '@/lib/apis/shipper.api';
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
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { LoadRowsRenderer } from '@/components/LoadRows';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { useTheme } from 'next-themes';

interface Filter {
  page: number;
  limit: number;
  search: string;

  filters: typeof filterShipper;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridShipper = () => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const [isFilteringRows, setIsFilteringRows] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const [totalPages, setTotalPages] = useState(1);
  const [popOver, setPopOver] = useState<boolean>(false);
  const { mutateAsync: createShipper, isLoading: isLoadingCreate } =
    useCreateShipper();
  const { mutateAsync: updateShipper, isLoading: isLoadingUpdate } =
    useUpdateShipper();
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { mutateAsync: deleteShipper, isLoading: isLoadingDelete } =
    useDeleteShipper();
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
  const queryClient = useQueryClient();
  const [isFetchingManually, setIsFetchingManually] = useState(false);
  const [rows, setRows] = useState<IShipper[]>([]);
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const prevPageRef = useRef(currentPage);
  const dispatch = useDispatch();
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const { alert } = useAlert();
  const { user, cabang_id } = useSelector((state: RootState) => state.auth);
  const getCoa = useSelector((state: RootState) => state.lookup.data);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAfterMutation, setIsAfterMutation] = useState(false);
  const [shouldBulkFetch, setShouldBulkFetch] = useState(true);
  const scrollPositionRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null); // TAMBAHAN BARU
  const prevRowsLengthRef = useRef<number>(0);
  const prevMinPageRef = useRef<number>(1);
  const hasAdjustedScrollRef = useRef<boolean>(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(
    null
  );
  const lastScrollTopRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5]);
  const [pageDataCache, setPageDataCache] = useState<Map<number, IShipper[]>>(
    new Map()
  );
  const forms = useForm<ShipperInput>({
    resolver: mode === 'delete' ? undefined : zodResolver(ShipperSchema),
    mode: 'onSubmit',
    defaultValues: {
      nama: '',
      keterangan: '',
      contactperson: '',
      alamat: '',
      coa: '',
      coa_text: '',
      coapiutang: '',
      coapiutang_text: '',
      coahutang: '',
      coahutang_text: '',
      kota: '',
      kodepos: '',
      telp: '',
      email: '',
      fax: '',
      web: '',
      creditlimit: undefined,
      creditterm: undefined,
      credittermplus: undefined,
      npwp: '',
      coagiro: '',
      coagiro_text: '',
      ppn: undefined,
      titipke: '',
      ppnbatalmuat: undefined,
      grup: '',
      formatdeliveryreport: undefined,
      comodity: '',
      namashippercetak: '',
      formatcetak: undefined,
      marketing_id: '',
      marketing_text: '',
      blok: '',
      nomor: '',
      rt: '',
      rw: '',
      kelurahan: '',
      kabupaten: '',
      kecamatan: '',
      propinsi: '',
      isdpp10psn: undefined,
      usertracing: '',
      passwordtracing: '',
      kodeprospek: '',
      namashipperprospek: '',
      emaildelay: '',
      keterangan1barisinvoice: '',
      nik: '',
      namaparaf: '',
      saldopiutang: undefined,
      keteranganshipperjobminus: '',
      tglemailshipperjobminus: '',
      tgllahir: '',
      idshipperasal: null,
      shipperasal_text: '',
      initial: '',
      tipe: '',
      idtipe: null,
      idinitial: null,
      nshipperprospek: '',
      parentshipper_id: null,
      parentshipper_text: '',
      npwpnik: '',
      nitku: '',
      kodepajak: '',
      statusaktif: '',
      text: ''
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
    limit: 30,
    search: '',
    filters: filterShipper,
    sortBy: 'nama',
    sortDirection: 'asc'
  });
  const gridRef = useRef<DataGridHandle>(null);
  const [prevFilters, setPrevFilters] = useState<Filter>(filters);
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const effectiveLimit = shouldBulkFetch ? 150 : filters.limit;

  const { data: allShipper, isLoading: isLoadingShipper } = useGetShipper(
    {
      ...filters,
      page: currentPage,
      limit: effectiveLimit
    },
    abortControllerRef.current?.signal
  );

  const debouncedFilterUpdate = useRef(
    debounce((colKey: string, value: string) => {
      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, [colKey]: value },
        page: 1,
        search: ''
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
      setInputValue(''); // Reset global search input saat filter kolom diubah
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
  }, []);
  const { clearError } = useFormError();
  const handleColumnFilterChange = (
    colKey: keyof Filter['filters'] | string,
    value: string
  ) => {
    // 1. cari index di array columns asli
    const originalIndex = columns.findIndex((col) => col.key === colKey);

    // 2. hitung index tampilan berdasar columnsOrder
    //    jika belum ada reorder (columnsOrder kosong), fallback ke originalIndex
    const displayIndex =
      columnsOrder.length > 0
        ? columnsOrder.findIndex((idx) => idx === originalIndex)
        : originalIndex;

    // update filter seperti biasa…
    setFilters((prev) => ({
      ...prev,
      filters: { ...prev.filters, [colKey]: value },
      search: '',
      page: 1
    }));
    setInputValue('');
    setCheckedRows(new Set());
    setIsAllSelected(false);

    // 3. focus sel di grid pakai displayIndex
    setTimeout(() => {
      gridRef?.current?.selectCell({ rowIdx: 0, idx: displayIndex });
    }, 100);

    // 4. focus input filter
    setTimeout(() => {
      const ref = inputColRefs.current[colKey];
      ref?.focus();
    }, 200);

    setSelectedRow(0);
  };
  const handleDropdownFilterChange = (
    colKey: keyof Filter['filters'],
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      filters: { ...prev.filters, [colKey]: value },
      search: '',
      page: 1
    }));
    setInputValue('');
    setCheckedRows(new Set());
    setIsAllSelected(false);
    setSelectedRow(0);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(event.target as Node)
    ) {
      setContextMenu(null);
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelPreviousRequest(abortControllerRef);
    const searchValue = e.target.value;
    setInputValue(searchValue);
    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      filters: filterShipper,
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
    setRows([]);
  };
  const handleSort = (column: string) => {
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

  const columns = useMemo((): Column<IShipper>[] => {
    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 50,
        minWidth: 10,
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
                  filters: filterShipper
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
          const rowIndex = rows.findIndex((row) => row.id === props.row.id);
          return (
            <div className="flex h-full w-full cursor-pointer items-center justify-center text-sm">
              {rowIndex + 1}
            </div>
          );
        }
      },
      {
        key: 'select',
        name: '',
        width: 50,
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full flex-col items-center gap-1">
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
        renderCell: ({ row }: { row: IShipper }) => (
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
        key: 'nama',
        name: 'Nama',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nama')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
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
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nama' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
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
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nama || '';
          const cellValue = props.row.nama || '';
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
        name: 'Keterangan',
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
        key: 'contactperson',
        name: 'Contact Person',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('contactperson')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'contactperson'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Contact Person
              </p>
              <div className="ml-2">
                {filters.sortBy === 'contactperson' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'contactperson' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="contactperson"
                value={filters.filters.contactperson || ''}
                onChange={(value) =>
                  handleFilterInputChange('contactperson', value)
                }
                onClear={() => handleClearFilter('contactperson')}
                inputRef={(el) => {
                  inputColRefs.current['contactperson'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.contactperson || '';
          const cellValue = props.row.contactperson || '';
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
        key: 'alamat',
        name: 'Alamat',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('alamat')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'alamat' ? 'font-bold' : 'font-normal'
                }`}
              >
                Alamat
              </p>
              <div className="ml-2">
                {filters.sortBy === 'alamat' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'alamat' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="alamat"
                value={filters.filters.alamat || ''}
                onChange={(value) => handleFilterInputChange('alamat', value)}
                onClear={() => handleClearFilter('alamat')}
                inputRef={(el) => {
                  inputColRefs.current['alamat'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.alamat || '';
          const cellValue = props.row.alamat || '';
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
        key: 'coa',
        name: 'COA',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('coa')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'coa' ? 'font-bold' : 'font-normal'
                }`}
              >
                COA
              </p>
              <div className="ml-2">
                {filters.sortBy === 'coa' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'coa' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="coa_text"
                value={filters.filters.coa_text || ''}
                onChange={(value) => handleFilterInputChange('coa_text', value)}
                onClear={() => handleClearFilter('coa_text')}
                inputRef={(el) => {
                  inputColRefs.current['coa_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.coa_text || '';
          const cellValue = props.row.coa_text || '';
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
        key: 'coapiutang',
        name: 'COA Piutang',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('coapiutang')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'coapiutang' ? 'font-bold' : 'font-normal'
                }`}
              >
                COA Piutang
              </p>
              <div className="ml-2">
                {filters.sortBy === 'coapiutang' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'coapiutang' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="coapiutang_text"
                value={filters.filters.coapiutang_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('coapiutang_text', value)
                }
                onClear={() => handleClearFilter('coapiutang_text')}
                inputRef={(el) => {
                  inputColRefs.current['coapiutang_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.coapiutang_text || '';
          const cellValue = props.row.coapiutang_text || '';
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
        key: 'coahutang',
        name: 'COA Hutang',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('coahutang')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'coahutang' ? 'font-bold' : 'font-normal'
                }`}
              >
                COA Hutang
              </p>
              <div className="ml-2">
                {filters.sortBy === 'coahutang' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'coahutang' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="coahutang_text"
                value={filters.filters.coahutang_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('coahutang_text', value)
                }
                onClear={() => handleClearFilter('coahutang_text')}
                inputRef={(el) => {
                  inputColRefs.current['coahutang_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.coahutang_text || '';
          const cellValue = props.row.coahutang_text || '';
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
        key: 'kota',
        name: 'Kota',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('kota')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kota' ? 'font-bold' : 'font-normal'
                }`}
              >
                Kota
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kota' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kota' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kota"
                value={filters.filters.kota || ''}
                onChange={(value) => handleFilterInputChange('kota', value)}
                onClear={() => handleClearFilter('kota')}
                inputRef={(el) => {
                  inputColRefs.current['kota'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kota || '';
          const cellValue = props.row.kota || '';
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
        key: 'kodepos',
        name: 'Kode Pos',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('kodepos')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kodepos' ? 'font-bold' : 'font-normal'
                }`}
              >
                Kode Pos
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kodepos' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kodepos' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kodepos"
                value={filters.filters.kodepos || ''}
                onChange={(value) => handleFilterInputChange('kodepos', value)}
                onClear={() => handleClearFilter('kodepos')}
                inputRef={(el) => {
                  inputColRefs.current['kodepos'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kodepos || '';
          const cellValue = props.row.kodepos || '';
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
        key: 'telp',
        name: 'Telp',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('telp')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'telp' ? 'font-bold' : 'font-normal'
                }`}
              >
                Telp
              </p>
              <div className="ml-2">
                {filters.sortBy === 'telp' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'telp' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="telp"
                value={filters.filters.telp || ''}
                onChange={(value) => handleFilterInputChange('telp', value)}
                onClear={() => handleClearFilter('telp')}
                inputRef={(el) => {
                  inputColRefs.current['telp'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.telp || '';
          const cellValue = props.row.telp || '';
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
        key: 'email',
        name: 'Email',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('email')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'email' ? 'font-bold' : 'font-normal'
                }`}
              >
                Email
              </p>
              <div className="ml-2">
                {filters.sortBy === 'email' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'email' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="email"
                value={filters.filters.email || ''}
                onChange={(value) => handleFilterInputChange('email', value)}
                onClear={() => handleClearFilter('email')}
                inputRef={(el) => {
                  inputColRefs.current['email'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.email || '';
          const cellValue = props.row.email || '';
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
        key: 'fax',
        name: 'Fax',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('fax')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'fax' ? 'font-bold' : 'font-normal'
                }`}
              >
                Fax
              </p>
              <div className="ml-2">
                {filters.sortBy === 'fax' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'fax' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="fax"
                value={filters.filters.fax || ''}
                onChange={(value) => handleFilterInputChange('fax', value)}
                onClear={() => handleClearFilter('fax')}
                inputRef={(el) => {
                  inputColRefs.current['fax'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.fax || '';
          const cellValue = props.row.fax || '';
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
        key: 'web',
        name: 'Website',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('web')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'web' ? 'font-bold' : 'font-normal'
                }`}
              >
                Website
              </p>
              <div className="ml-2">
                {filters.sortBy === 'web' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'web' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="web"
                value={filters.filters.web || ''}
                onChange={(value) => handleFilterInputChange('web', value)}
                onClear={() => handleClearFilter('web')}
                inputRef={(el) => {
                  inputColRefs.current['web'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.web || '';
          const cellValue = props.row.web || '';
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
        key: 'creditlimit',
        name: 'Credit Limit',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('creditlimit')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'creditlimit' ? 'font-bold' : 'font-normal'
                }`}
              >
                Credit Limit
              </p>
              <div className="ml-2">
                {filters.sortBy === 'creditlimit' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'creditlimit' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="creditlimit"
                value={filters.filters.creditlimit || ''}
                onChange={(value) =>
                  handleFilterInputChange('creditlimit', value)
                }
                onClear={() => handleClearFilter('creditlimit')}
                inputRef={(el) => {
                  inputColRefs.current['creditlimit'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.creditlimit || '';
          const cellValue =
            props.row.creditlimit != null
              ? formatCurrency(props.row.creditlimit)
              : formatCurrency(0);
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
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
        key: 'creditterm',
        name: 'Credit Term',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('creditterm')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'creditterm' ? 'font-bold' : 'font-normal'
                }`}
              >
                Credit Term
              </p>
              <div className="ml-2">
                {filters.sortBy === 'creditterm' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'creditterm' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="creditterm"
                value={filters.filters.creditterm || ''}
                onChange={(value) =>
                  handleFilterInputChange('creditterm', value)
                }
                onClear={() => handleClearFilter('creditterm')}
                inputRef={(el) => {
                  inputColRefs.current['creditterm'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.creditterm || '';
          const cellValue =
            props.row.creditterm != null
              ? formatCurrency(props.row.creditterm)
              : formatCurrency(0);
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
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
        key: 'credittermplus',
        name: 'Credit Term Plus',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('credittermplus')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'credittermplus'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Credit Term Plus
              </p>
              <div className="ml-2">
                {filters.sortBy === 'credittermplus' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'credittermplus' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="credittermplus"
                value={filters.filters.credittermplus || ''}
                onChange={(value) =>
                  handleFilterInputChange('credittermplus', value)
                }
                onClear={() => handleClearFilter('credittermplus')}
                inputRef={(el) => {
                  inputColRefs.current['credittermplus'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.credittermplus || '';
          const cellValue =
            props.row.credittermplus != null
              ? formatCurrency(props.row.credittermplus)
              : formatCurrency(0);
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
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
        key: 'npwp',
        name: 'NPWP',
        resizable: true,
        draggable: true,
        width: 280,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('npwp')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'npwp' ? 'font-bold' : 'font-normal'
                }`}
              >
                NPWP
              </p>
              <div className="ml-2">
                {filters.sortBy === 'npwp' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'npwp' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="npwp"
                value={filters.filters.npwp || ''}
                onChange={(value) => handleFilterInputChange('npwp', value)}
                onClear={() => handleClearFilter('npwp')}
                inputRef={(el) => {
                  inputColRefs.current['npwp'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.npwp || '';
          const cellValue = props.row.npwp || '';
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
        key: 'coagiro',
        name: 'COA Giro',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('coagiro')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'coagiro' ? 'font-bold' : 'font-normal'
                }`}
              >
                COA Giro
              </p>
              <div className="ml-2">
                {filters.sortBy === 'coagiro' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'coagiro' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="coagiro_text"
                value={filters.filters.coagiro_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('coagiro_text', value)
                }
                onClear={() => handleClearFilter('coagiro_text')}
                inputRef={(el) => {
                  inputColRefs.current['coagiro_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.coagiro_text || '';
          const cellValue = props.row.coagiro_text || '';
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
        key: 'ppn',
        name: 'PPN',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('ppn')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'ppn' ? 'font-bold' : 'font-normal'
                }`}
              >
                PPN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'ppn' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'ppn' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="ppn"
                value={filters.filters.ppn || ''}
                onChange={(value) => handleFilterInputChange('ppn', value)}
                onClear={() => handleClearFilter('ppn')}
                inputRef={(el) => {
                  inputColRefs.current['ppn'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.ppn || '';
          const cellValue =
            props.row.ppn != null
              ? formatCurrency(props.row.ppn)
              : formatCurrency(0);
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
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
        key: 'titipke',
        name: 'Titip Ke',
        resizable: true,
        draggable: true,
        width: 260,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('titipke')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'titipke' ? 'font-bold' : 'font-normal'
                }`}
              >
                Titip Ke
              </p>
              <div className="ml-2">
                {filters.sortBy === 'titipke' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'titipke' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="titipke"
                value={filters.filters.titipke || ''}
                onChange={(value) => handleFilterInputChange('titipke', value)}
                onClear={() => handleClearFilter('titipke')}
                inputRef={(el) => {
                  inputColRefs.current['titipke'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.titipke || '';
          const cellValue = props.row.titipke || '';
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
        key: 'ppnbatalmuat',
        name: 'PPN Batal Muat',
        resizable: true,
        draggable: true,
        width: 280,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('ppnbatalmuat')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'ppnbatalmuat'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                PPN Batal Muat
              </p>
              <div className="ml-2">
                {filters.sortBy === 'ppnbatalmuat' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'ppnbatalmuat' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="ppnbatalmuat"
                value={filters.filters.ppnbatalmuat || ''}
                onChange={(value) =>
                  handleFilterInputChange('ppnbatalmuat', value)
                }
                onClear={() => handleClearFilter('ppnbatalmuat')}
                inputRef={(el) => {
                  inputColRefs.current['ppnbatalmuat'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.ppnbatalmuat || '';
          const cellValue =
            props.row.ppnbatalmuat != null
              ? formatCurrency(props.row.ppnbatalmuat)
              : formatCurrency(0);
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
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
        key: 'grup',
        name: 'Grup',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('grup')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'grup' ? 'font-bold' : 'font-normal'
                }`}
              >
                Grup
              </p>
              <div className="ml-2">
                {filters.sortBy === 'grup' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'grup' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="grup"
                value={filters.filters.grup || ''}
                onChange={(value) => handleFilterInputChange('grup', value)}
                onClear={() => handleClearFilter('grup')}
                inputRef={(el) => {
                  inputColRefs.current['grup'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.grup || '';
          const cellValue = props.row.grup || '';
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
        key: 'formatdeliveryreport',
        name: 'Format Delivery Report',
        resizable: true,
        draggable: true,
        width: 210,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('formatdeliveryreport')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'formatdeliveryreport'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Format Delivery Report
              </p>
              <div className="ml-2">
                {filters.sortBy === 'formatdeliveryreport' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'formatdeliveryreport' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="formatdeliveryreport"
                value={filters.filters.formatdeliveryreport || ''}
                onChange={(value) =>
                  handleFilterInputChange('formatdeliveryreport', value)
                }
                onClear={() => handleClearFilter('formatdeliveryreport')}
                inputRef={(el) => {
                  inputColRefs.current['formatdeliveryreport'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.formatdeliveryreport || '';
          const cellValue =
            props.row.formatdeliveryreport != null
              ? formatCurrency(props.row.formatdeliveryreport)
              : formatCurrency(0);

          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
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
        name: 'Comodity',
        resizable: true,
        draggable: true,
        width: 200,
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
                Comodity
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
        key: 'namashippercetak',
        name: 'Nama Shipper Cetak',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('namashippercetak')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'namashippercetak'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Nama Shipper Cetak
              </p>
              <div className="ml-2">
                {filters.sortBy === 'namashippercetak' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'namashippercetak' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="namashippercetak"
                value={filters.filters.namashippercetak || ''}
                onChange={(value) =>
                  handleFilterInputChange('namashippercetak', value)
                }
                onClear={() => handleClearFilter('namashippercetak')}
                inputRef={(el) => {
                  inputColRefs.current['namashippercetak'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.namashippercetak || '';
          const cellValue = props.row.namashippercetak || '';
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
        key: 'formatcetak',
        name: 'Format Cetak',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('formatcetak')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'formatcetak' ? 'font-bold' : 'font-normal'
                }`}
              >
                Format Cetak
              </p>
              <div className="ml-2">
                {filters.sortBy === 'formatcetak' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'formatcetak' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="formatcetak"
                value={filters.filters.formatcetak || ''}
                onChange={(value) =>
                  handleFilterInputChange('formatcetak', value)
                }
                onClear={() => handleClearFilter('formatcetak')}
                inputRef={(el) => {
                  inputColRefs.current['formatcetak'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.formatcetak || '';
          const cellValue =
            props.row.formatcetak != null
              ? formatCurrency(props.row.formatcetak)
              : formatCurrency(0);
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
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
        key: 'marketing_id',
        name: 'Marketing',
        resizable: true,
        draggable: true,
        width: 180,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('marketing_id')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'marketing_id'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Marketing
              </p>
              <div className="ml-2">
                {filters.sortBy === 'marketing_id' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'marketing_id' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="marketing_text"
                value={filters.filters.marketing_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('marketing_text', value)
                }
                onClear={() => handleClearFilter('marketing_text')}
                inputRef={(el) => {
                  inputColRefs.current['marketing_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.marketing_text || '';
          const cellValue = props.row.marketing_text || '';
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
        key: 'blok',
        name: 'Blok',
        resizable: true,
        draggable: true,
        width: 120,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('blok')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'blok' ? 'font-bold' : 'font-normal'
                }`}
              >
                Blok
              </p>
              <div className="ml-2">
                {filters.sortBy === 'blok' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'blok' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="blok"
                value={filters.filters.blok || ''}
                onChange={(value) => handleFilterInputChange('blok', value)}
                onClear={() => handleClearFilter('blok')}
                inputRef={(el) => {
                  inputColRefs.current['blok'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.blok || '';
          const cellValue = props.row.blok || '';
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
        key: 'number',
        name: 'Nomor',
        resizable: true,
        draggable: true,
        width: 120,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('nomor')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nomor' ? 'font-bold' : 'font-normal'
                }`}
              >
                Nomor
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nomor' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nomor' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nomor"
                value={filters.filters.nomor || ''}
                onChange={(value) => handleFilterInputChange('nomor', value)}
                onClear={() => handleClearFilter('nomor')}
                inputRef={(el) => {
                  inputColRefs.current['nomor'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nomor || '';
          const cellValue = props.row.nomor || '';
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
        key: 'rt',
        name: 'RT',
        resizable: true,
        draggable: true,
        width: 80,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('rt')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'rt' ? 'font-bold' : 'font-normal'
                }`}
              >
                RT
              </p>
              <div className="ml-2">
                {filters.sortBy === 'rt' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'rt' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="rt"
                value={filters.filters.rt || ''}
                onChange={(value) => handleFilterInputChange('rt', value)}
                onClear={() => handleClearFilter('rt')}
                inputRef={(el) => {
                  inputColRefs.current['rt'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.rt || '';
          const cellValue = props.row.rt || '';
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
        key: 'rw',
        name: 'RW',
        resizable: true,
        draggable: true,
        width: 80,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('rw')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'rw' ? 'font-bold' : 'font-normal'
                }`}
              >
                RW
              </p>
              <div className="ml-2">
                {filters.sortBy === 'rw' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'rw' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="rw"
                value={filters.filters.rw || ''}
                onChange={(value) => handleFilterInputChange('rw', value)}
                onClear={() => handleClearFilter('rw')}
                inputRef={(el) => {
                  inputColRefs.current['rw'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.rw || '';
          const cellValue = props.row.rw || '';
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
        key: 'kelurahan',
        name: 'kelurahan',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('kelurahan')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kelurahan' ? 'font-bold' : 'font-normal'
                }`}
              >
                kelurahan
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kelurahan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kelurahan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kelurahan"
                value={filters.filters.kelurahan || ''}
                onChange={(value) =>
                  handleFilterInputChange('kelurahan', value)
                }
                onClear={() => handleClearFilter('kelurahan')}
                inputRef={(el) => {
                  inputColRefs.current['kelurahan'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kelurahan || '';
          const cellValue = props.row.kelurahan || '';
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
        key: 'kabupaten',
        name: 'kabupaten',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('kabupaten')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kabupaten' ? 'font-bold' : 'font-normal'
                }`}
              >
                kabupaten
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kabupaten' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kabupaten' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kabupaten"
                value={filters.filters.kabupaten || ''}
                onChange={(value) =>
                  handleFilterInputChange('kabupaten', value)
                }
                onClear={() => handleClearFilter('kabupaten')}
                inputRef={(el) => {
                  inputColRefs.current['kabupaten'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kabupaten || '';
          const cellValue = props.row.kabupaten || '';
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
        key: 'kecamatan',
        name: 'kecamatan',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('kecamatan')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kecamatan' ? 'font-bold' : 'font-normal'
                }`}
              >
                kecamatan
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kecamatan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kecamatan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kecamatan"
                value={filters.filters.kecamatan || ''}
                onChange={(value) =>
                  handleFilterInputChange('kecamatan', value)
                }
                onClear={() => handleClearFilter('kecamatan')}
                inputRef={(el) => {
                  inputColRefs.current['kecamatan'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kecamatan || '';
          const cellValue = props.row.kecamatan || '';
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
        key: 'propinsi',
        name: 'propinsi',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('propinsi')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'propinsi' ? 'font-bold' : 'font-normal'
                }`}
              >
                propinsi
              </p>
              <div className="ml-2">
                {filters.sortBy === 'propinsi' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'propinsi' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="propinsi"
                value={filters.filters.propinsi || ''}
                onChange={(value) => handleFilterInputChange('propinsi', value)}
                onClear={() => handleClearFilter('propinsi')}
                inputRef={(el) => {
                  inputColRefs.current['propinsi'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.propinsi || '';
          const cellValue = props.row.propinsi || '';
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
        key: 'isdpp10psn',
        name: 'isdpp10psn',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('isdpp10psn')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'isdpp10psn' ? 'font-bold' : 'font-normal'
                }`}
              >
                isdpp10psn
              </p>
              <div className="ml-2">
                {filters.sortBy === 'isdpp10psn' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'isdpp10psn' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="isdpp10psn"
                value={filters.filters.isdpp10psn || ''}
                onChange={(value) =>
                  handleFilterInputChange('isdpp10psn', value)
                }
                onClear={() => handleClearFilter('isdpp10psn')}
                inputRef={(el) => {
                  inputColRefs.current['isdpp10psn'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.isdpp10psn || '';
          const cellValue =
            props.row.isdpp10psn != null
              ? formatCurrency(props.row.isdpp10psn)
              : formatCurrency(0);
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
        key: 'usertracing',
        name: 'user tracing',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('usertracing')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'usertracing' ? 'font-bold' : 'font-normal'
                }`}
              >
                user tracing
              </p>
              <div className="ml-2">
                {filters.sortBy === 'usertracing' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'usertracing' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="usertracing"
                value={filters.filters.usertracing || ''}
                onChange={(value) =>
                  handleFilterInputChange('usertracing', value)
                }
                onClear={() => handleClearFilter('usertracing')}
                inputRef={(el) => {
                  inputColRefs.current['usertracing'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.usertracing || '';
          const cellValue = props.row.usertracing || '';
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
        key: 'passwordtracing',
        name: 'password tracing',
        resizable: true,
        draggable: true,
        width: 170,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('passwordtracing')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'passwordtracing'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                password tracing
              </p>
              <div className="ml-2">
                {filters.sortBy === 'passwordtracing' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'passwordtracing' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="passwordtracing"
                value={filters.filters.passwordtracing || ''}
                onChange={(value) =>
                  handleFilterInputChange('passwordtracing', value)
                }
                onClear={() => handleClearFilter('passwordtracing')}
                inputRef={(el) => {
                  inputColRefs.current['passwordtracing'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.passwordtracing || '';
          const cellValue = props.row.passwordtracing || '';
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
        key: 'kodeprospek',
        name: 'kode prospek',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('kodeprospek')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kodeprospek' ? 'font-bold' : 'font-normal'
                }`}
              >
                kode prospek
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kodeprospek' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kodeprospek' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kodeprospek"
                value={filters.filters.kodeprospek || ''}
                onChange={(value) =>
                  handleFilterInputChange('kodeprospek', value)
                }
                onClear={() => handleClearFilter('kodeprospek')}
                inputRef={(el) => {
                  inputColRefs.current['kodeprospek'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kodeprospek || '';
          const cellValue = props.row.kodeprospek || '';
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
        key: 'namashipperprospek',
        name: 'nama shipper prospek',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('namashipperprospek')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'namashipperprospek'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                nama shipper prospek
              </p>
              <div className="ml-2">
                {filters.sortBy === 'namashipperprospek' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'namashipperprospek' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="namashipperprospek"
                value={filters.filters.namashipperprospek || ''}
                onChange={(value) =>
                  handleFilterInputChange('namashipperprospek', value)
                }
                onClear={() => handleClearFilter('namashipperprospek')}
                inputRef={(el) => {
                  inputColRefs.current['namashipperprospek'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.namashipperprospek || '';
          const cellValue = props.row.namashipperprospek || '';
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
        key: 'emaildelay',
        name: 'email delay',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('emaildelay')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'emaildelay' ? 'font-bold' : 'font-normal'
                }`}
              >
                email delay
              </p>
              <div className="ml-2">
                {filters.sortBy === 'emaildelay' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'emaildelay' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="emaildelay"
                value={filters.filters.emaildelay || ''}
                onChange={(value) =>
                  handleFilterInputChange('emaildelay', value)
                }
                onClear={() => handleClearFilter('emaildelay')}
                inputRef={(el) => {
                  inputColRefs.current['emaildelay'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.emaildelay || '';
          const cellValue = props.row.emaildelay || '';
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
        key: 'keterangan1barisinvoice',
        name: 'keterangan 1 baris invoice',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('keterangan1barisinvoice')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'keterangan1barisinvoice'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                KETERANGAN 1 BARIS INVOICE
              </p>
              <div className="ml-2">
                {filters.sortBy === 'keterangan1barisinvoice' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'keterangan1barisinvoice' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="keterangan1barisinvoice"
                value={filters.filters.keterangan1barisinvoice || ''}
                onChange={(value) =>
                  handleFilterInputChange('keterangan1barisinvoice', value)
                }
                onClear={() => handleClearFilter('keterangan1barisinvoice')}
                inputRef={(el) => {
                  inputColRefs.current['keterangan1barisinvoice'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.keterangan1barisinvoice || '';
          const cellValue = props.row.keterangan1barisinvoice || '';
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
        key: 'nik',
        name: 'nik',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('nik')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nik' ? 'font-bold' : 'font-normal'
                }`}
              >
                nik
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nik' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nik' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nik"
                value={filters.filters.nik || ''}
                onChange={(value) => handleFilterInputChange('nik', value)}
                onClear={() => handleClearFilter('nik')}
                inputRef={(el) => {
                  inputColRefs.current['nik'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nik || '';
          const cellValue = props.row.nik || '';
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
        key: 'namaparaf',
        name: 'nama paraf',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('namaparaf')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'namaparaf' ? 'font-bold' : 'font-normal'
                }`}
              >
                NAMA PARAF
              </p>
              <div className="ml-2">
                {filters.sortBy === 'namaparaf' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'namaparaf' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="namaparaf"
                value={filters.filters.namaparaf || ''}
                onChange={(value) =>
                  handleFilterInputChange('namaparaf', value)
                }
                onClear={() => handleClearFilter('namaparaf')}
                inputRef={(el) => {
                  inputColRefs.current['namaparaf'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.namaparaf || '';
          const cellValue = props.row.namaparaf || '';
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
        key: 'saldopiutang',
        name: 'saldo piutang',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('saldopiutang')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'saldopiutang'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                saldo piutang
              </p>
              <div className="ml-2">
                {filters.sortBy === 'saldopiutang' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'saldopiutang' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="saldopiutang"
                value={filters.filters.saldopiutang || ''}
                onChange={(value) =>
                  handleFilterInputChange('saldopiutang', value)
                }
                onClear={() => handleClearFilter('saldopiutang')}
                inputRef={(el) => {
                  inputColRefs.current['saldopiutang'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.saldopiutang || '';
          const cellValue =
            props.row.saldopiutang != null
              ? formatCurrency(props.row.saldopiutang)
              : formatCurrency(0);
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
        key: 'keteranganshipperjobminus',
        name: 'keterangan shipper job minus',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('keteranganshipperjobminus')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'keteranganshipperjobminus'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                keterangan shipper job minus
              </p>
              <div className="ml-2">
                {filters.sortBy === 'keteranganshipperjobminus' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'keteranganshipperjobminus' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="keteranganshipperjobminus"
                value={filters.filters.keteranganshipperjobminus || ''}
                onChange={(value) =>
                  handleFilterInputChange('keteranganshipperjobminus', value)
                }
                onClear={() => handleClearFilter('keteranganshipperjobminus')}
                inputRef={(el) => {
                  inputColRefs.current['keteranganshipperjobminus'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.keteranganshipperjobminus || '';
          const cellValue = props.row.keteranganshipperjobminus || '';
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
        key: 'tglemailshipperjobminus',
        name: 'tgl email shipper job minus',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 300,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('tglemailshipperjobminus')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tglemailshipperjobminus'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                TANGGAL EMAIL SHIPPER JOB MINUS
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tglemailshipperjobminus' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tglemailshipperjobminus' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tglemailshipperjobminus"
                value={filters.filters.tglemailshipperjobminus || ''}
                onChange={(value) =>
                  handleFilterInputChange('tglemailshipperjobminus', value)
                }
                onClear={() => handleClearFilter('tglemailshipperjobminus')}
                inputRef={(el) => {
                  inputColRefs.current['tglemailshipperjobminus'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tglemailshipperjobminus || '';
          const cellValue = props.row.tglemailshipperjobminus || '';
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
        key: 'tgllahir',
        name: 'tgl lahir',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('tgllahir')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tgllahir' ? 'font-bold' : 'font-normal'
                }`}
              >
                Tanggal Lahir
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tgllahir' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tgllahir' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tgllahir"
                value={filters.filters.tgllahir || ''}
                onChange={(value) => handleFilterInputChange('tgllahir', value)}
                onClear={() => handleClearFilter('tgllahir')}
                inputRef={(el) => {
                  inputColRefs.current['tgllahir'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tgllahir || '';
          const cellValue = props.row.tgllahir || '';
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
        key: 'idshipperasal',
        name: 'id shipperasal',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('idshipperasal')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'idshipperasal'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                shipper asal
              </p>
              <div className="ml-2">
                {filters.sortBy === 'idshipperasal' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'idshipperasal' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="shipperasal_text"
                value={filters.filters.shipperasal_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('shipperasal_text', value)
                }
                onClear={() => handleClearFilter('shipperasal_text')}
                inputRef={(el) => {
                  inputColRefs.current['shipperasal_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.shipperasal_text || '';
          const cellValue = props.row.shipperasal_text || '';
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
        key: 'initial',
        name: 'initial',
        resizable: true,
        draggable: true,
        width: 100,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('initial')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'initial' ? 'font-bold' : 'font-normal'
                }`}
              >
                initial
              </p>
              <div className="ml-2">
                {filters.sortBy === 'initial' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'initial' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="initial"
                value={filters.filters.initial || ''}
                onChange={(value) => handleFilterInputChange('initial', value)}
                onClear={() => handleClearFilter('initial')}
                inputRef={(el) => {
                  inputColRefs.current['initial'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.initial || '';
          const cellValue = props.row.initial || '';
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
        key: 'tipe',
        name: 'tipe',
        resizable: true,
        draggable: true,
        width: 100,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('tipe')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tipe' ? 'font-bold' : 'font-normal'
                }`}
              >
                Tipe
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tipe' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tipe' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tipe"
                value={filters.filters.tipe || ''}
                onChange={(value) => handleFilterInputChange('tipe', value)}
                onClear={() => handleClearFilter('tipe')}
                inputRef={(el) => {
                  inputColRefs.current['tipe'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tipe || '';
          const cellValue = props.row.tipe || '';
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
        key: 'idtipe',
        name: 'id tipe',
        resizable: true,
        draggable: true,
        width: 120,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('idtipe')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'idtipe' ? 'font-bold' : 'font-normal'
                }`}
              >
                id tipe
              </p>
              <div className="ml-2">
                {filters.sortBy === 'idtipe' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'idtipe' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="idtipe"
                value={filters.filters.idtipe || ''}
                onChange={(value) => handleFilterInputChange('idtipe', value)}
                onClear={() => handleClearFilter('idtipe')}
                inputRef={(el) => {
                  inputColRefs.current['idtipe'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.idtipe || '';
          const cellValue = props.row.idtipe || '';
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
        key: 'idinitial',
        name: 'id initial',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('idinitial')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'idinitial' ? 'font-bold' : 'font-normal'
                }`}
              >
                ID Initial
              </p>
              <div className="ml-2">
                {filters.sortBy === 'idinitial' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'idinitial' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="idinitial"
                value={filters.filters.idinitial || ''}
                onChange={(value) =>
                  handleFilterInputChange('idinitial', value)
                }
                onClear={() => handleClearFilter('idinitial')}
                inputRef={(el) => {
                  inputColRefs.current['idinitial'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.idinitial || '';
          const cellValue = props.row.idinitial || '';
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
        key: 'nshipperprospek',
        name: 'nama shipper prospek',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('nshipperprospek')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nshipperprospek'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Nama Shipper Prospek
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nshipperprospek' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nshipperprospek' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nshipperprospek"
                value={filters.filters.nshipperprospek || ''}
                onChange={(value) =>
                  handleFilterInputChange('nshipperprospek', value)
                }
                onClear={() => handleClearFilter('nshipperprospek')}
                inputRef={(el) => {
                  inputColRefs.current['nshipperprospek'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nshipperprospek || '';
          const cellValue = props.row.nshipperprospek || '';
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
        key: 'parentshipper_id',
        name: 'parent shipper',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('parentshipper_id')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'parentshipper_id'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Parent Shipper
              </p>
              <div className="ml-2">
                {filters.sortBy === 'parentshipper_id' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'parentshipper_id' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="parentshipper_text"
                value={filters.filters.parentshipper_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('parentshipper_text', value)
                }
                onClear={() => handleClearFilter('parentshipper_text')}
                inputRef={(el) => {
                  inputColRefs.current['parentshipper_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.parentshipper_text || '';
          const cellValue = props.row.parentshipper_text || '';
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
        key: 'npwpnik',
        name: 'npwp nik',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('npwpnik')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'npwpnik' ? 'font-bold' : 'font-normal'
                }`}
              >
                npwp nik
              </p>
              <div className="ml-2">
                {filters.sortBy === 'npwpnik' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'npwpnik' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="npwpnik"
                value={filters.filters.npwpnik || ''}
                onChange={(value) => handleFilterInputChange('npwpnik', value)}
                onClear={() => handleClearFilter('npwpnik')}
                inputRef={(el) => {
                  inputColRefs.current['npwpnik'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.npwpnik || '';
          const cellValue = props.row.npwpnik || '';
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
        key: 'nitku',
        name: 'nitku',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('nitku')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nitku' ? 'font-bold' : 'font-normal'
                }`}
              >
                nitku
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nitku' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nitku' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nitku"
                value={filters.filters.nitku || ''}
                onChange={(value) => handleFilterInputChange('nitku', value)}
                onClear={() => handleClearFilter('nitku')}
                inputRef={(el) => {
                  inputColRefs.current['nitku'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nitku || '';
          const cellValue = props.row.nitku || '';
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
        key: 'kodepajak',
        name: 'kode pajak',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('kodepajak')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kodepajak' ? 'font-bold' : 'font-normal'
                }`}
              >
                kode pajak
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kodepajak' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kodepajak' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kodepajak"
                value={filters.filters.kodepajak || ''}
                onChange={(value) =>
                  handleFilterInputChange('kodepajak', value)
                }
                onClear={() => handleClearFilter('kodepajak')}
                inputRef={(el) => {
                  inputColRefs.current['kodepajak'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kodepajak || '';
          const cellValue = props.row.kodepajak || '';
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
        key: 'statusaktif',
        name: 'Status Aktif',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('statusaktif')}
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
                  handleColumnFilterChange('statusaktif', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.memo ? JSON.parse(props.row.memo) : null;
          if (memoData) {
            return (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
                  >
                    <p>{memoData.MEMO}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
        }
      },
      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'statustidakasuransi',
      //   name: 'STATUS TIDAK ASURANSI',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 210,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('statustidakasuransi')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'statustidakasuransi'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           STATUS TIDAK ASURANSI
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'statustidakasuransi' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'statustidakasuransi' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('statustidakasuransi_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.statustidakasuransi_memo
      //       ? JSON.parse(props.row.statustidakasuransi_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'asuransi_tas',
      //   name: 'ASURANSI TAS',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 190,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('asuransi_tas')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'asuransi_tas'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           ASURANSI TAS
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'asuransi_tas' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'asuransi_tas' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('asuransi_tas_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.asuransi_tas_memo
      //       ? JSON.parse(props.row.asuransi_tas_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'top_field',
      //   name: 'TOP',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 200,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('top_field')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'top_field' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           TOP
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'top_field' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'top_field' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('top_field_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.top_field_memo
      //       ? JSON.parse(props.row.top_field_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'open_field',
      //   name: 'OPEN',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 190,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('open_field')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'open_field' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           OPEN
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'open_field' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'open_field' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('open_field_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.open_field_memo
      //       ? JSON.parse(props.row.open_field_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'bongkaran',
      //   name: 'BONGKARAN',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 200,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('bongkaran')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'bongkaran' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           BONGKARAN
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'bongkaran' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'bongkaran' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('bongkaran_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.bongkaran_memo
      //       ? JSON.parse(props.row.bongkaran_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'delivery_report',
      //   name: 'DELIVERY REPORT',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 220,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('delivery_report')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'delivery_report'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           DELIVERY REPORT
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'delivery_report' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'delivery_report' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('delivery_report_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.delivery_report_memo
      //       ? JSON.parse(props.row.delivery_report_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'final_asuransi_bulan',
      //   name: 'FINAL ASURANSI BULAN',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 230,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('final_asuransi_bulan')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'final_asuransi_bulan'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           FINAL ASURANSI BULAN
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'final_asuransi_bulan' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'final_asuransi_bulan' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('final_asuransi_bulan_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.final_asuransi_bulan_memo
      //       ? JSON.parse(props.row.final_asuransi_bulan_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'job_banyak_invoice',
      //   name: 'JOB BANYAK INVOICE',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 230,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('job_banyak_invoice')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'job_banyak_invoice'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           JOB BANYAK INVOICE
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'job_banyak_invoice' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'job_banyak_invoice' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('job_banyak_invoice_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.job_banyak_invoice_memo
      //       ? JSON.parse(props.row.job_banyak_invoice_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'job_pajak',
      //   name: 'JOB PAJAK',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 190,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('job_pajak')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'job_pajak' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           JOB PAJAK
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'job_pajak' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'job_pajak' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('job_pajak_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.job_pajak_memo
      //       ? JSON.parse(props.row.job_pajak_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'cetak_keterangan_shipper',
      //   name: 'CETAK KETERANGAN SHIPPER',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 250,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('cetak_keterangan_shipper')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'cetak_keterangan_shipper'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           CETAK KETERANGAN SHIPPER
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'cetak_keterangan_shipper' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'cetak_keterangan_shipper' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange(
      //               'cetak_keterangan_shipper_nama',
      //               value
      //             )
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.cetak_keterangan_shipper_memo
      //       ? JSON.parse(props.row.cetak_keterangan_shipper_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'fumigasi',
      //   name: 'FUMIGASI',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 190,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('fumigasi')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'fumigasi' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           FUMIGASI
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'fumigasi' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'fumigasi' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('fumigasi_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.fumigasi_memo
      //       ? JSON.parse(props.row.fumigasi_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'adjust_tagih_warkat',
      //   name: 'ADJUST TAGIH WARKAT',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 230,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('adjust_tagih_warkat')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'adjust_tagih_warkat'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           ADJUST TAGIH WARKAT
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'adjust_tagih_warkat' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'adjust_tagih_warkat' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('adjust_tagih_warkat_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.adjust_tagih_warkat_memo
      //       ? JSON.parse(props.row.adjust_tagih_warkat_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'job_non_ppn',
      //   name: 'JOB NON PPN',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 210,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('job_non_ppn')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'job_non_ppn' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           JOB NON PPN
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'job_non_ppn' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'job_non_ppn' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('job_non_ppn_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.job_non_ppn_memo
      //       ? JSON.parse(props.row.job_non_ppn_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'approval_pajakp_pisah_ongkos',
      //   name: 'APPROVAL PAJAKP PISAH ONGKOS',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 250,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('approval_pajakp_pisah_ongkos')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'approval_pajakp_pisah_ongkos'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           APPROVAL PAJAKP PISAH ONGKOS
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'approval_pajakp_pisah_ongkos' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'approval_pajakp_pisah_ongkos' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange(
      //               'approval_pajakp_pisah_ongkos_nama',
      //               value
      //             )
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.approval_pajakp_pisah_ongkos_memo
      //       ? JSON.parse(props.row.approval_pajakp_pisah_ongkos_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'decimal_invoice',
      //   name: 'DECIMAL INVOICE',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 210,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('decimal_invoice')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'decimal_invoice'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           DECIMAL INVOICE
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'decimal_invoice' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'decimal_invoice' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('decimal_invoice_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.decimal_invoice_memo
      //       ? JSON.parse(props.row.decimal_invoice_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'reimbursement',
      //   name: 'REIMBURSEMENT',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 200,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('reimbursement')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'reimbursement'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           REIMBURSEMENT
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'reimbursement' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'reimbursement' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('reimbursement_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.reimbursement_memo
      //       ? JSON.parse(props.row.reimbursement_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'not_invoice_tambahan',
      //   name: 'NOT INVOICE TAMBAHAN',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 250,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('not_invoice_tambahan')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'not_invoice_tambahan'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           NOT INVOICE TAMBAHAN
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'not_invoice_tambahan' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'not_invoice_tambahan' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('not_invoice_tambahan_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.not_invoice_tambahan_memo
      //       ? JSON.parse(props.row.not_invoice_tambahan_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'invoice_jasa_pengurusan_transportasi',
      //   name: 'INVOICE JASA PENGURUSAN TRANSPORTASI',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 290,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('invoice_jasa_pengurusan_transportasi')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'invoice_jasa_pengurusan_transportasi'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           INVOICE JASA PENGURUSAN TRANSPORTASI
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'invoice_jasa_pengurusan_transportasi' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'invoice_jasa_pengurusan_transportasi' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange(
      //               'invoice_jasa_pengurusan_transportasi_nama',
      //               value
      //             )
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.invoice_jasa_pengurusan_transportasi_memo
      //       ? JSON.parse(props.row.invoice_jasa_pengurusan_transportasi_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'not_ucase_shipper',
      //   name: 'NOT UCASE SHIPPER',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 230,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('not_ucase_shipper')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'not_ucase_shipper'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           NOT UCASE SHIPPER
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'not_ucase_shipper' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'not_ucase_shipper' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('not_ucase_shipper_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.not_ucase_shipper_memo
      //       ? JSON.parse(props.row.not_ucase_shipper_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'shipper_sttb',
      //   name: 'SHIPPER STTB',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 210,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('shipper_sttb')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'shipper_sttb'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           SHIPPER STTB
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'shipper_sttb' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'shipper_sttb' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('shipper_sttb_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.shipper_sttb_memo
      //       ? JSON.parse(props.row.shipper_sttb_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'shipper_cabang',
      //   name: 'SHIPPER CABANG',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 220,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('shipper_cabang')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'shipper_cabang'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           SHIPPER CABANG
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'shipper_cabang' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'shipper_cabang' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('shipper_cabang_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.shipper_cabang_memo
      //       ? JSON.parse(props.row.shipper_cabang_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'spk',
      //   name: 'SPK',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 160,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('spk')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'spk' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           SPK
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'spk' && filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'spk' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('spk_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.spk_memo
      //       ? JSON.parse(props.row.spk_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'ppn_warkat_eksport',
      //   name: 'PPN WARKAT EKSPORT',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 240,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('ppn_warkat_eksport')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'ppn_warkat_eksport'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           PPN WARKAT EKSPORT
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'ppn_warkat_eksport' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'ppn_warkat_eksport' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('ppn_warkat_eksport_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.ppn_warkat_eksport_memo
      //       ? JSON.parse(props.row.ppn_warkat_eksport_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'ppn_11',
      //   name: 'PPN 11%',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 180,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('ppn_11')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'ppn_11' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           PPN 11%
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'ppn_11' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'ppn_11' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('ppn_11_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.ppn_11_memo
      //       ? JSON.parse(props.row.ppn_11_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'non_prospek',
      //   name: 'NON PROSPEK',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 200,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('non_prospek')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'non_prospek' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           NON PROSPEK
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'non_prospek' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'non_prospek' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('non_prospek_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.non_prospek_memo
      //       ? JSON.parse(props.row.non_prospek_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'info_delay',
      //   name: 'INFO DELAY',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 190,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('info_delay')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'info_delay' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           INFO DELAY
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'info_delay' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'info_delay' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('info_delay_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.info_delay_memo
      //       ? JSON.parse(props.row.info_delay_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'job_minus',
      //   name: 'JOB MINUS',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 200,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('job_minus')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'job_minus' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           JOB MINUS
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'job_minus' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'job_minus' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('job_minus_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.job_minus_memo
      //       ? JSON.parse(props.row.job_minus_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'shipper_sendiri',
      //   name: 'SHIPPER SENDIRI',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 230,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('shipper_sendiri')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'shipper_sendiri'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           SHIPPER SENDIRI
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'shipper_sendiri' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'shipper_sendiri' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('shipper_sendiri_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.shipper_sendiri_memo
      //       ? JSON.parse(props.row.shipper_sendiri_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'wajib_invoice_sebelum_biaya',
      //   name: 'WAJIB INVOICE SEBELUM BIAYA',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 270,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('wajib_invoice_sebelum_biaya')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'wajib_invoice_sebelum_biaya'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           WAJIB INVOICE SEBELUM BIAYA
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'wajib_invoice_sebelum_biaya' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'wajib_invoice_sebelum_biaya' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange(
      //               'wajib_invoice_sebelum_biaya_nama',
      //               value
      //             )
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.wajib_invoice_sebelum_biaya_memo
      //       ? JSON.parse(props.row.wajib_invoice_sebelum_biaya_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'tanpa_nik_npwp',
      //   name: 'TANPA NIK NPWP',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 230,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('tanpa_nik_npwp')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'tanpa_nik_npwp'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           TANPA NIK NPWP
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'tanpa_nik_npwp' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'tanpa_nik_npwp' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('tanpa_nik_npwp_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.delivery_report_memo
      //       ? JSON.parse(props.row.delivery_report_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'pusat',
      //   name: 'PUSAT',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 170,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('pusat')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'pusat' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           PUSAT
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'pusat' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'pusat' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('pusat_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.pusat_memo
      //       ? JSON.parse(props.row.pusat_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'app_saldo_piutang',
      //   name: 'APP SALDO PIUTANG',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 230,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('app_saldo_piutang')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'app_saldo_piutang'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           APP SALDO PIUTANG
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'app_saldo_piutang' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'app_saldo_piutang' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('app_saldo_piutang_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.app_saldo_piutang_memo
      //       ? JSON.parse(props.row.app_saldo_piutang_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'nama_paraf',
      //   name: 'NAMA PARAF',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 200,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('nama_paraf')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'nama_paraf' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           NAMA PARAF
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'nama_paraf' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'nama_paraf' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('nama_paraf_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.nama_paraf_memo
      //       ? JSON.parse(props.row.nama_paraf_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'not_order_trucking',
      //   name: 'NOT ORDER TRUCKING',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 230,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('not_order_trucking')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'not_order_trucking'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           NOT ORDER TRUCKING
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'not_order_trucking' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'not_order_trucking' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('not_order_trucking_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.not_order_trucking_memo
      //       ? JSON.parse(props.row.not_order_trucking_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'passport',
      //   name: 'PASSPORT',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 180,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('passport')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'passport' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           PASSPORT
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'passport' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'passport' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('passport_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.passport_memo
      //       ? JSON.parse(props.row.passport_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'ppn_kunci',
      //   name: 'PPN KUNCI',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 190,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('ppn_kunci')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'ppn_kunci' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           PPN KUNCI
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'ppn_kunci' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'ppn_kunci' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('ppn_kunci_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.ppn_kunci_memo
      //       ? JSON.parse(props.row.ppn_kunci_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'approval_shipper_job_minus',
      //   name: 'APPROVAL SHIPPER JOB MINUS',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 270,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('approval_shipper_job_minus')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'approval_shipper_job_minus'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           APPROVAL SHIPPER JOB MINUS
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'approval_shipper_job_minus' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'approval_shipper_job_minus' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange(
      //               'approval_shipper_job_minus_nama',
      //               value
      //             )
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.approval_shipper_job_minus_memo
      //       ? JSON.parse(props.row.approval_shipper_job_minus_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'approval_top',
      //   name: 'APPROVAL TOP',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 210,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('approval_top')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'approval_top'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           APPROVAL TOP
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'approval_top' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'approval_top' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('approval_top_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.approval_top_memo
      //       ? JSON.parse(props.row.approval_top_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'blacklist_shipper',
      //   name: 'BLACKLIST SHIPPER',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 240,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('blacklist_shipper')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'blacklist_shipper'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           BLACKLIST SHIPPER
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'blacklist_shipper' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'blacklist_shipper' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('blacklist_shipper_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.blacklist_shipper_memo
      //       ? JSON.parse(props.row.blacklist_shipper_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'non_lapor_pajak',
      //   name: 'NON LAPOR PAJAK',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 210,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('non_lapor_pajak')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'non_lapor_pajak'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           NON LAPOR PAJAK
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'non_lapor_pajak' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'non_lapor_pajak' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('non_lapor_pajak_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.non_lapor_pajak_memo
      //       ? JSON.parse(props.row.non_lapor_pajak_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'shipper_potongan',
      //   name: 'SHIPPER POTONGAN',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 220,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('shipper_potongan')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'shipper_potongan'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           SHIPPER POTONGAN
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'shipper_potongan' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'shipper_potongan' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('shipper_potongan_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.shipper_potongan_memo
      //       ? JSON.parse(props.row.shipper_potongan_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'shipper_tidak_tagih_invoice_utama',
      //   name: 'SHIPPER TIDAK TAGIH INVOICE UTAMA',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 300,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('shipper_tidak_tagih_invoice_utama')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'shipper_tidak_tagih_invoice_utama'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           SHIPPER TIDAK TAGIH INVOICE UTAMA
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'shipper_tidak_tagih_invoice_utama' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'shipper_tidak_tagih_invoice_utama' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange(
      //               'shipper_tidak_tagih_invoice_utama_nama',
      //               value
      //             )
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.shipper_tidak_tagih_invoice_utama_memo
      //       ? JSON.parse(props.row.shipper_tidak_tagih_invoice_utama_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'not_tampil_web',
      //   name: 'NOT TAMPIL WEB',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 210,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('not_tampil_web')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'not_tampil_web'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           NOT TAMPIL WEB
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'not_tampil_web' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'not_tampil_web' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('not_tampil_web_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.not_tampil_web_memo
      //       ? JSON.parse(props.row.not_tampil_web_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'not_free_admin',
      //   name: 'NOT FREE ADMIN',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 200,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('not_free_admin')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'not_free_admin'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           NOT FREE ADMIN
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'not_free_admin' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'not_free_admin' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('not_free_admin_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.not_free_admin_memo
      //       ? JSON.parse(props.row.not_free_admin_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'non_reimbursement',
      //   name: 'NON REIMBURSEMENT',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 230,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('non_reimbursement')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'non_reimbursement'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           NON REIMBURSEMENT
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'non_reimbursement' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'non_reimbursement' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('non_reimbursement_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.non_reimbursement_memo
      //       ? JSON.parse(props.row.non_reimbursement_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'app_cetak_invoice_lain',
      //   name: 'APP CETAK INVOICE LAIN',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 260,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('app_cetak_invoice_lain')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'app_cetak_invoice_lain'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           APP CETAK INVOICE LAIN
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'app_cetak_invoice_lain' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'app_cetak_invoice_lain' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('app_cetak_invoice_lain_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.app_cetak_invoice_lain_memo
      //       ? JSON.parse(props.row.app_cetak_invoice_lain_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'lewat_hitung_ulang_ppn',
      //   name: 'LEWAT HITUNG ULANG PPN',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 260,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('lewat_hitung_ulang_ppn')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'lewat_hitung_ulang_ppn'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           LEWAT HITUNG ULANG PPN
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'lewat_hitung_ulang_ppn' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'lewat_hitung_ulang_ppn' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('lewat_hitung_ulang_ppn_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.lewat_hitung_ulang_ppn_memo
      //       ? JSON.parse(props.row.lewat_hitung_ulang_ppn_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'online',
      //   name: 'ONLINE',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 190,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('online')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'online' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           ONLINE
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'online' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'online' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('online_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.online_memo
      //       ? JSON.parse(props.row.online_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'keterangan_buruh',
      //   name: 'KETERANGAN BURUH',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 240,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('keterangan_buruh')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'keterangan_buruh'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           KETERANGAN BURUH
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'keterangan_buruh' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'keterangan_buruh' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('keterangan_buruh_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.keterangan_buruh_memo
      //       ? JSON.parse(props.row.keterangan_buruh_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'edit_keterangan_invoice_utama',
      //   name: 'EDIT KETERANGAN INVOICE UTAMA',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 300,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('edit_keterangan_invoice_utama')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'edit_keterangan_invoice_utama'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           EDIT KETERANGAN INVOICE UTAMA
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'edit_keterangan_invoice_utama' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'edit_keterangan_invoice_utama' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange(
      //               'edit_keterangan_invoice_utama_nama',
      //               value
      //             )
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.edit_keterangan_invoice_utama_memo
      //       ? JSON.parse(props.row.edit_keterangan_invoice_utama_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'tampil_keterangan_tambahan_sttb',
      //   name: 'TAMPIL KETERANGAN TAMBAHAN STTB',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 300,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('tampil_keterangan_tambahan_sttb')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'tampil_keterangan_tambahan_sttb'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           TAMPIL KETERANGAN TAMBAHAN STTB
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'tampil_keterangan_tambahan_sttb' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'tampil_keterangan_tambahan_sttb' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange(
      //               'tampil_keterangan_tambahan_sttb_nama',
      //               value
      //             )
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.tampil_keterangan_tambahan_sttb_memo
      //       ? JSON.parse(props.row.tampil_keterangan_tambahan_sttb_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'update_ppn_shiper_khusus',
      //   name: 'UPDATE PPN SHIPPER KHUSUS',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 270,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('update_ppn_shiper_khusus')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'update_ppn_shiper_khusus'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           UPDATE PPN SHIPPER KHUSUS
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'update_ppn_shiper_khusus' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'update_ppn_shiper_khusus' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange(
      //               'update_ppn_shiper_khusus_nama',
      //               value
      //             )
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.update_ppn_shiper_khusus_memo
      //       ? JSON.parse(props.row.update_ppn_shiper_khusus_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'shipper_rincian',
      //   name: 'SHIPPER RINCIAN',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 230,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('shipper_rincian')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'shipper_rincian'
      //               ? 'font-bold'
      //               : 'font-normal'
      //           }`}
      //         >
      //           SHIPPER RINCIAN
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'shipper_rincian' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'shipper_rincian' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('shipper_rincian_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.shipper_rincian_memo
      //       ? JSON.parse(props.row.shipper_rincian_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'national_id',
      //   name: 'NATIONAL ID',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 190,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('national_id')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'national_id' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           NATIONAL ID
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'national_id' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'national_id' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('national_id_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.national_id_memo
      //       ? JSON.parse(props.row.national_id_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },
      // {
      //   key: 'refdesc_po',
      //   name: 'REFDESC PO',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 210,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('refdesc_po')}
      //         onContextMenu={(event) =>
      //           setContextMenu(handleContextMenu(event))
      //         }
      //       >
      //         <p
      //           className={`text-sm ${
      //             filters.sortBy === 'refdesc_po' ? 'font-bold' : 'font-normal'
      //           }`}
      //         >
      //           REFDESC PO
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'refdesc_po' &&
      //           filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'refdesc_po' &&
      //             filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <FilterOptions
      //            columnKey={column.column.key}
      //           endpoint="parameter"
      //           value="id"
      //           label="text"
      //           filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //           onChange={(value) =>
      //             handleColumnFilterChange('refdesc_po_nama', value)
      //           }
      //         />
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const memoData = props.row.refdesc_po_memo
      //       ? JSON.parse(props.row.refdesc_po_memo)
      //       : null;
      //     if (memoData) {
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="flex h-full w-full items-center justify-center py-1">
      //                 <div
      //                   className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //                   style={{
      //                     backgroundColor: memoData.WARNA,
      //                     color: memoData.WARNATULISAN,
      //                     padding: '2px 6px',
      //                     borderRadius: '2px',
      //                     textAlign: 'left',
      //                     fontWeight: '600'
      //                   }}
      //                 >
      //                   <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //                 </div>
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{memoData.MEMO}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }

      //     return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //   }
      // },

      {
        key: 'modifiedby',
        name: 'Modified By',
        resizable: true,
        draggable: true,

        headerCellClass: 'column-headers',

        width: 150,
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
  }, [
    filters,
    checkedRows,
    isAllSelected,
    rows,
    getCoa
    // statusColumns,
    // pvtFields
  ]);

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
      saveGridConfig(user.id, 'GridShipper', [...columnsOrder], newWidthMap);
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

      saveGridConfig(user.id, 'GridShipper', [...newOrder], columnsWidth);
      return newOrder;
    });
  };
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
    if (
      isLoadingShipper ||
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

    // Deteksi apakah user benar-benar melakukan scroll
    const hasScrolled = Math.abs(scrollTop - lastScrollTopRef.current) > 5;

    if (!hasScrolled) {
      return;
    }

    // Update last scroll position
    lastScrollTopRef.current = scrollTop;

    // Set flag bahwa user sedang scroll
    setIsScrolling(true);

    // Clear timeout sebelumnya
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set timeout untuk mendeteksi scroll berhenti
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    // SIMPAN SCROLL CONTAINER & POSITION
    scrollPositionRef.current = scrollTop;
    scrollContainerRef.current = currentTarget;

    // HITUNG ROW INDEX BERDASARKAN SCROLL POSITION
    const rowHeight = 30;
    const firstVisibleRow = Math.floor(scrollTop / rowHeight);
    const lastVisibleRow = Math.floor((scrollTop + clientHeight) / rowHeight);

    // Threshold berdasarkan jumlah baris (50 baris dari atas/bawah)
    const THRESHOLD_ROWS = 50;

    // SCROLL KE BAWAH - trigger jika kurang dari 50 baris tersisa di bawah
    const rowsRemainingBelow = rows.length - lastVisibleRow;
    if (rowsRemainingBelow <= THRESHOLD_ROWS) {
      const maxPage = Math.max(...visiblePages);
      const nextPage = maxPage + 1;

      if (
        nextPage <= totalPages &&
        !pageDataCache.has(nextPage) &&
        !isFetching &&
        isScrolling
      ) {
        setIsFetching(true);
        setIsTransitioning(true);
        hasAdjustedScrollRef.current = false;
        setCurrentPage(nextPage);
      }
    }

    // SCROLL KE ATAS - trigger jika scroll berada di 50 baris pertama
    if (firstVisibleRow <= THRESHOLD_ROWS) {
      const minPage = Math.min(...visiblePages);
      const prevPage = minPage - 1;

      if (
        prevPage >= 1 &&
        !pageDataCache.has(prevPage) &&
        !isFetching &&
        isScrolling
      ) {
        setIsFetching(true);
        setIsTransitioning(true);
        hasAdjustedScrollRef.current = false;
        setCurrentPage(prevPage);
      }
    }
  }

  function handleCellClick(args: { row: IShipper }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
    }
  }
  async function handleKeyDown(
    args: CellKeyDownArgs<IShipper>,
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
  const onSuccess = async (
    indexOnPage: number,
    fetchedPages: number[],
    pagedData: Record<string, IShipper[]>,
    pageNumber: number,
    keepOpenModal = false
  ) => {
    dispatch(setClearLookup(true));
    clearError();
    setIsFetchingManually(true);

    try {
      if (keepOpenModal) {
        forms.reset();
        setPopOver(true);
      } else {
        forms.reset();
        setPopOver(false);
      }
      if (mode !== 'delete') {
        const response = await api2.get(
          `/redis/get/shipper-page-${pageNumber}`
        );
        // Set the rows only if the data has changed
        if (JSON.stringify(response.data) !== JSON.stringify(rows)) {
          setRows([]);
          setRows(response.data);
          setIsDataUpdated(true);
          setVisiblePages(fetchedPages);
          setSelectedRow(indexOnPage);
          setPageDataCache(
            new Map(
              Object.entries(pagedData).map(([key, value]) => [
                Number(key),
                value as IShipper[]
              ])
            )
          );

          setTimeout(() => {
            gridRef?.current?.selectCell({
              rowIdx: indexOnPage,
              idx: 1
            });
          }, 200);
        }
      }

      setIsDataUpdated(false);
    } catch (error) {
      console.error('Error during onSuccess:', error);
      setIsFetchingManually(false);
      setIsDataUpdated(false);
    }
  };
  const onSubmit = async (values: ShipperInput, keepOpenModal = false) => {
    clearError();
    const selectedRowId = rows[selectedRow]?.id;
    try {
      dispatch(setProcessing());
      if (mode === 'delete') {
        if (selectedRowId) {
          await deleteShipper(selectedRowId as unknown as string, {
            onSuccess: () => {
              setPopOver(false);
              setRows((prevRows) =>
                prevRows.filter((row) => row.id !== selectedRowId)
              );
              if (selectedRow === 0) {
                setSelectedRow(selectedRow);
                gridRef?.current?.selectCell({ rowIdx: selectedRow, idx: 1 });
              } else {
                setSelectedRow(selectedRow - 1);
                gridRef?.current?.selectCell({
                  rowIdx: selectedRow - 1,
                  idx: 1
                });
              }
            }
          });
        }
        return;
      }
      if (mode === 'add') {
        const newOrder = await createShipper(
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
                keepOpenModal
              )
          }
        );

        if (newOrder !== undefined && newOrder !== null) {
        }
        return;
      }
      if (selectedRowId && mode === 'edit') {
        await updateShipper(
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
                data.pageNumber
              )
          }
        );
        queryClient.invalidateQueries('shipper');
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

  const handleReport = async () => {
    try {
      dispatch(setProcessing());
      const now = new Date();
      const pad = (n: any) => n.toString().padStart(2, '0');
      const tglcetak = `${pad(now.getDate())}-${pad(
        now.getMonth() + 1
      )}-${now.getFullYear()} ${pad(now.getHours())}:${pad(
        now.getMinutes()
      )}:${pad(now.getSeconds())}`;
      const { page, limit, ...filtersWithoutLimit } = filters;
      const response = await getShipperFn(filtersWithoutLimit);
      const reportRows = response.data.map((row) => ({
        ...row,
        judullaporan: 'Laporan Shipper',
        usercetak: user.username,
        tglcetak: tglcetak,
        judul: 'PT.TRANSPORINDO AGUNG SEJAHTERA'
      }));

      sessionStorage.setItem(
        'filtersWithoutLimit',
        JSON.stringify(filtersWithoutLimit)
      );

      import('stimulsoft-reports-js/Scripts/stimulsoft.blockly.editor')
        .then((module) => {
          const { Stimulsoft } = module;
          Stimulsoft.Base.StiFontCollection.addOpentypeFontFile(
            '/fonts/tahoma.ttf',
            'Tahoma'
          ); // Regular
          Stimulsoft.Base.StiFontCollection.addOpentypeFontFile(
            '/fonts/tahomabd.ttf',
            'Tahoma'
          ); // Bold
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
          report.loadFile('/reports/LaporanShipper.mrt');
          report.dictionary.dataSources.clear();
          dataSet.readJson({ data: reportRows });
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
              window.open('/reports/shipper', '_blank');
            }, Stimulsoft.Report.StiExportFormat.Pdf);
          });
        })
        .catch((error) => {
          console.error('Failed to load Stimulsoft:', error);
        });
    } catch (error) {
      dispatch(setProcessed());
    } finally {
      dispatch(setProcessed());
    }
  };

  function getRowClass(row: IShipper) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: IShipper) {
    return row.id;
  }

  const handleClose = () => {
    setPopOver(false);
    setMode('');
    clearError();
    forms.reset();
  };
  const statusAktifDefaultRef = useRef<{ id: string; text: string } | null>(
    null
  );

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
      statusaktif: aktif.id,
      text: aktif.text
    });
  };

  const handleAdd = async () => {
    setMode('add');
    setPopOver(true);
    await resetAddForm();
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        forms.reset(); // Reset the form when the Escape key is pressed
        setMode(''); // Reset the mode to empty
        setPopOver(false);
        clearError();
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

  // Update properti width pada setiap kolom berdasarkan state columnsWidth
  const finalColumns = useMemo(() => {
    return orderedColumns.map((col) => ({
      ...col,
      width: columnsWidth[col.key] ?? col.width
    }));
  }, [orderedColumns, columnsWidth]);

  useEffect(() => {
    loadGridConfig(
      user.id,
      'GridShipper',
      columns,
      setColumnsOrder,
      setColumnsWidth
    );
  }, []);
  useEffect(() => {
    if (isFirstLoad && gridRef.current && rows.length > 0) {
      setSelectedRow(0);
      gridRef.current.selectCell({ rowIdx: 0, idx: 1 });
      setIsFirstLoad(false);
    }
  }, [rows, isFirstLoad]);

  useEffect(() => {
    const handleBulkFetch = async () => {
      // Hanya proses jika shouldBulkFetch true dan ada data dari API
      if (!shouldBulkFetch || !allShipper || isDataUpdated || isAfterMutation) {
        return;
      }

      const bulkData = allShipper.data || [];

      if (bulkData.length === 0) return;

      const pageSize = 30;
      const newCache = new Map<number, IShipper[]>();

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

      if (allShipper.pagination?.totalPages) {
        setTotalPages(allShipper.pagination.totalPages);
      }

      setHasMore(bulkData.length === 150);
      setShouldBulkFetch(false); // Reset flag setelah bulk fetch selesai
      setIsFirstLoad(false);
      setIsFetching(false);

      setTimeout(() => {
        if (gridRef.current) {
          setSelectedRow(0);
          gridRef.current.selectCell({ rowIdx: 0, idx: 1 });
        }
      }, 100);
    };

    handleBulkFetch();
  }, [allShipper, shouldBulkFetch, isDataUpdated, isAfterMutation]);
  useEffect(() => {
    // Skip jika masih bulk fetch mode atau after mutation
    if (shouldBulkFetch || isDataUpdated || isAfterMutation) {
      return;
    }

    if (!allShipper) return;

    const newRows = allShipper.data || [];

    // SIMPAN SCROLL INFO SEBELUM UPDATE
    const scrollContainer = scrollContainerRef.current;
    const scrollBeforeUpdate = scrollContainer
      ? {
          scrollTop: scrollContainer.scrollTop,
          scrollHeight: scrollContainer.scrollHeight,
          clientHeight: scrollContainer.clientHeight
        }
      : null;

    // Cache data halaman yang baru di-fetch
    setPageDataCache((prevCache) => {
      const newCache = new Map(prevCache);
      newCache.set(currentPage, newRows);
      return newCache;
    });

    // Update visible pages dengan scroll adjustment
    setVisiblePages((prevVisible) => {
      const maxVisible = Math.max(...prevVisible);
      const minVisible = Math.min(...prevVisible);

      // ==========================================
      // SCROLL KE BAWAH
      // ==========================================
      if (currentPage > maxVisible) {
        const newPages = [...prevVisible.slice(1), currentPage];
        const removedPage = prevVisible[0];

        // ADJUST SCROLL SETELAH PAGE DIHAPUS
        setTimeout(() => {
          if (scrollContainer && scrollBeforeUpdate) {
            const rowHeight = 30;
            const rowsPerPage = 30;
            const removedHeight = rowsPerPage * rowHeight; // 900px

            // Kurangi scroll position sebesar height yang dihapus
            // TAPI pastikan tidak kurang dari 0
            const newScrollTop = Math.max(
              0,
              scrollBeforeUpdate.scrollTop - removedHeight
            );

            requestAnimationFrame(() => {
              scrollContainer.scrollTop = newScrollTop;
              scrollPositionRef.current = newScrollTop;
            });
          }
        }, 50);

        // Hapus page dari cache
        setPageDataCache((prev) => {
          const updated = new Map(prev);
          updated.delete(removedPage);
          return updated;
        });

        return newPages;
      }

      // ==========================================
      // SCROLL KE ATAS
      // ==========================================
      if (currentPage < minVisible) {
        const newPages = [currentPage, ...prevVisible.slice(0, 4)];
        const removedPage = prevVisible[4];

        // ADJUST SCROLL SETELAH PAGE DITAMBAH DI DEPAN
        setTimeout(() => {
          if (
            scrollContainer &&
            scrollBeforeUpdate &&
            !hasAdjustedScrollRef.current
          ) {
            const rowHeight = 30;
            const rowsPerPage = 30;
            const addedHeight = rowsPerPage * rowHeight; // 900px

            // KUNCI PERBAIKAN:
            // Ketika page baru ditambahkan di depan, semua row existing bergeser ke bawah
            // User yang tadinya di row 10 (scrollTop ~300px), sekarang berada di row 40 (scrollTop ~300px)
            // Seharusnya berada di row 40 dengan scrollTop ~1200px (300 + 900)

            const newScrollTop = scrollBeforeUpdate.scrollTop + addedHeight;

            requestAnimationFrame(() => {
              scrollContainer.scrollTop = newScrollTop;
              scrollPositionRef.current = newScrollTop;
              hasAdjustedScrollRef.current = true;
            });
          }
        }, 50);

        // Hapus page dari cache
        setPageDataCache((prev) => {
          const updated = new Map(prev);
          updated.delete(removedPage);
          return updated;
        });

        return newPages;
      }

      return prevVisible;
    });

    if (allShipper.pagination?.totalPages) {
      setTotalPages(allShipper.pagination.totalPages);
    }

    setHasMore(newRows.length === filters.limit);
    setPrevFilters(filters);

    setTimeout(() => {
      setIsTransitioning(false);
      setIsFetching(false);
    }, 100);
  }, [
    allShipper,
    currentPage,
    filters,
    isDataUpdated,
    shouldBulkFetch,
    isAfterMutation
  ]);
  useEffect(() => {
    const combinedRows: IShipper[] = [];

    // Combine semua page yang visible
    visiblePages?.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (pageData) {
        combinedRows.push(...pageData);
      }
    });

    if (combinedRows.length > 0) {
      const newMinPage = Math.min(...visiblePages);

      // Update rows state
      setRows(combinedRows);

      // Simpan nilai untuk perbandingan di render berikutnya
      prevMinPageRef.current = newMinPage;
      prevRowsLengthRef.current = combinedRows.length;
    }
  }, [visiblePages, pageDataCache]);
  useEffect(() => {
    const headerCells = document.querySelectorAll('.rdg-header-row .rdg-cell');
    headerCells.forEach((cell) => {
      cell.setAttribute('tabindex', '-1');
    });
    document.querySelectorAll('.column-headers').forEach((element) => {
      element.classList.remove('c1kqdw7y7-0-0-beta-47');
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
      // id varchar(200) UUID — Number() lama jadi NaN → update mengenai baris
      // salah / gagal. Set sebagai string apa adanya.
      forms.setValue('id', String(rowData?.id ?? ''));
      forms.setValue('nama', rowData?.nama);
      forms.setValue('keterangan', rowData?.keterangan);
      forms.setValue('contactperson', rowData?.contactperson);
      forms.setValue('alamat', rowData?.alamat);
      forms.setValue('kota', rowData?.kota);
      forms.setValue('kodepos', rowData?.kodepos);
      forms.setValue('telp', rowData?.telp);
      forms.setValue('email', rowData?.email);
      forms.setValue('fax', rowData?.fax);
      forms.setValue('web', rowData?.web);
      forms.setValue('npwp', rowData?.npwp);
      forms.setValue('titipke', rowData?.titipke);
      forms.setValue('comodity', rowData?.comodity);
      forms.setValue('namashippercetak', rowData?.namashippercetak);
      forms.setValue('blok', rowData?.blok);
      forms.setValue('nomor', rowData?.nomor);
      forms.setValue('rt', rowData?.rt);
      forms.setValue('rw', rowData?.rw);
      forms.setValue('kelurahan', rowData?.kelurahan);
      forms.setValue('kabupaten', rowData?.kabupaten);
      forms.setValue('kecamatan', rowData?.kecamatan);
      forms.setValue('propinsi', rowData?.propinsi);
      forms.setValue('usertracing', rowData?.usertracing);
      forms.setValue('passwordtracing', rowData?.passwordtracing);
      forms.setValue('kodeprospek', rowData?.kodeprospek);
      forms.setValue('namashipperprospek', rowData?.namashipperprospek);
      forms.setValue('emaildelay', rowData?.emaildelay);
      forms.setValue(
        'keterangan1barisinvoice',
        rowData?.keterangan1barisinvoice
      );
      forms.setValue('nik', rowData?.nik);
      forms.setValue('namaparaf', rowData?.namaparaf);
      forms.setValue(
        'keteranganshipperjobminus',
        rowData?.keteranganshipperjobminus
      );
      forms.setValue('initial', rowData?.initial);
      forms.setValue('tipe', rowData?.tipe);
      forms.setValue('nshipperprospek', rowData?.nshipperprospek);
      forms.setValue('npwpnik', rowData?.npwpnik);
      forms.setValue('nitku', rowData?.nitku);
      forms.setValue('kodepajak', rowData?.kodepajak);

      forms.setValue(
        'tglemailshipperjobminus',
        rowData?.tglemailshipperjobminus
      );
      forms.setValue('tgllahir', rowData?.tgllahir);

      forms.setValue('coa', rowData?.coa);
      forms.setValue('coapiutang', rowData?.coapiutang);
      forms.setValue('coahutang', rowData?.coahutang);
      forms.setValue('creditlimit', formatCurrency(rowData?.creditlimit));
      forms.setValue('creditterm', rowData?.creditterm);
      forms.setValue('credittermplus', rowData?.credittermplus);
      forms.setValue('coagiro', rowData?.coagiro);
      forms.setValue(
        'ppn',
        rowData?.ppn == null ? undefined : formatCurrency(rowData?.ppn)
      );

      forms.setValue(
        'ppnbatalmuat',
        rowData?.ppnbatalmuat == null
          ? undefined
          : formatCurrency(rowData?.ppnbatalmuat)
      );

      forms.setValue('grup', rowData?.grup);
      forms.setValue(
        'formatdeliveryreport',
        rowData?.formatdeliveryreport != null
          ? Number(rowData?.formatdeliveryreport)
          : undefined
      );

      forms.setValue(
        'formatcetak',
        rowData?.formatcetak != null ? Number(rowData?.formatcetak) : undefined
      );

      // marketing_id & parentshipper_id varchar(200) UUID — set sebagai string,
      // bukan Number() (UUID → NaN). idshipperasal/idtipe/idinitial &
      // formatcetak/formatdeliveryreport memang bigint → tetap Number().
      forms.setValue('marketing_id', String(rowData?.marketing_id ?? ''));
      forms.setValue(
        'isdpp10psn',
        rowData?.isdpp10psn == null
          ? undefined
          : formatCurrency(rowData?.isdpp10psn)
      );
      forms.setValue(
        'saldopiutang',
        rowData?.saldopiutang == null
          ? undefined
          : formatCurrency(rowData?.saldopiutang)
      );
      forms.setValue('idshipperasal', Number(rowData?.idshipperasal));
      forms.setValue(
        'idtipe',
        rowData?.idtipe != null ? Number(rowData?.idtipe) : undefined
      );

      forms.setValue(
        'idinitial',
        rowData?.idinitial != null ? Number(rowData?.idinitial) : undefined
      );
      forms.setValue('parentshipper_id', rowData?.parentshipper_id ?? null);
      forms.setValue('statusaktif', rowData?.statusaktif ?? '');

      // Join / text reference
      forms.setValue('coa_text', rowData?.coa_text);
      forms.setValue('coapiutang_text', rowData?.coapiutang_text);
      forms.setValue('coahutang_text', rowData?.coahutang_text);
      forms.setValue('coagiro_text', rowData?.coagiro_text);
      forms.setValue('shipperasal_text', rowData?.shipperasal_text);
      forms.setValue('parentshipper_text', rowData?.parentshipper_text);
      forms.setValue('marketing_text', rowData?.marketing_text);

      forms.setValue('text', rowData?.text);
    }
    // JANGAN set/reset form saat mode 'add' di sini — resetAddForm() di handleAdd menanganinya
  }, [forms, selectedRow, rows, mode]);
  useEffect(() => {
    if (isSubmitSuccessful) {
      // reset();
      // Pastikan fokus terjadi setelah repaint
      requestAnimationFrame(() => setFocus('nama'));
    }
  }, [isSubmitSuccessful, setFocus]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);
  useEffect(() => {
    if (!isTransitioning && !isFetching) {
      // Reset flag setelah transisi selesai
      setTimeout(() => {
        hasAdjustedScrollRef.current = false;
      }, 200);
    }
  }, [isTransitioning, isFetching]);
  useEffect(() => {
    return () => {
      debouncedFilterUpdate.cancel();
    };
  }, []);
  useEffect(() => {
    if (!isTransitioning && !isFetching) {
      // Reset flag setelah transisi selesai
      setTimeout(() => {
        hasAdjustedScrollRef.current = false;
      }, 200);
    }
  }, [isTransitioning, isFetching]);
  return (
    <div className={`flex h-[100%] w-full justify-center`}>
      <div className="flex h-[100%]  w-full flex-col rounded-sm border border-border bg-background">
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
              gridName="GridShipper"
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
          // enableVirtualization={false}
          onColumnResize={onColumnResize}
          onColumnsReorder={onColumnsReorder}
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
            module="SHIPPER"
            onAdd={handleAdd}
            checkedRows={checkedRows}
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
            rowsLength={rows.length}
            totalItems={allShipper ? allShipper.pagination.totalItems : 0}
            startRow={(Math.min(...visiblePages) - 1) * filters.limit + 1}
            customActions={[
              {
                label: 'Print',
                icon: <FaPrint />,
                onClick: () => handleReport(),
                className: 'bg-cyan-500 hover:bg-cyan-700'
              }
            ]}
          />
          {isLoadingShipper ? <LoadRowsRenderer /> : null}
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
                // onClick={resetGridConfig}
                onClick={() => {
                  resetGridConfig(
                    user.id,
                    'GridShipper',
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
      <FormShipper
        popOver={popOver}
        handleClose={handleClose}
        setPopOver={setPopOver}
        isLoadingUpdate={isLoadingUpdate}
        isLoadingDelete={isLoadingDelete}
        forms={forms}
        mode={mode as any}
        onSubmit={forms.handleSubmit(onSubmit as any)}
        isLoadingCreate={isLoadingCreate}
      />
    </div>
  );
};

export default GridShipper;
