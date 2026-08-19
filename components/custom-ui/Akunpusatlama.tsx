'use client';

import Image from 'next/image';
import 'react-data-grid/lib/styles.scss';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import IcClose from '@/public/image/x.svg';
import { ImSpinner2 } from 'react-icons/im';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import { api2 } from '@/lib/utils/AxiosInstance';
import { Checkbox } from '@/components/ui/checkbox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAlert } from '@/lib/store/client/useAlert';
import { QueryClient, useQueryClient } from 'react-query';
import { useFormError } from '@/lib/hooks/formErrorContext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ActionButton from '@/components/custom-ui/ActionButton';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import { FaPrint, FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import {
  checkValidationTypeAkuntansiFn,
  getAllTypeAkuntansiFn
} from '@/lib/apis/typeakuntansi.api';
import {
  clearOpenName,
  setClearLookup
} from '@/lib/store/lookupSlice/lookupSlice';
import {
  TypeakuntansiInput,
  typeakuntansiSchema
} from '@/lib/validations/typeakuntansi.validation';
import DataGrid, {
  CellClickArgs,
  CellKeyDownArgs,
  Column,
  DataGridHandle,
  Row
} from 'react-data-grid';
import {
  useDeleteTypeAkuntansi,
  useGetAllTypeAkuntansi,
  useCreateTypeAkuntansi,
  useUpdateTypeAkuntansi
} from '@/lib/server/useTypeAkuntansi';
import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import FormAkunPusat from './FormAkunPusat';
import { filterAkunpusat, IAkunpusat } from '@/lib/types/akunpusat.type';
import {
  useCreateAkunpusat,
  useDeleteAkunpusat,
  useGetAkunpusat,
  useUpdateAkunpusat
} from '@/lib/server/useAkunpusat';
import {
  AkunpusatInput,
  AkunpusatSchema
} from '@/lib/validations/akunpusat.validation';
import { setReportData } from '@/lib/store/reportSlice/reportSlice';
import { getAkunpusatFn } from '@/lib/apis/akunpusat.api';
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
import { LoadRowsRenderer } from '@/components/LoadRows';
import { EmptyRowsRenderer } from '@/components/EmptyRows';

interface Filter {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  filters: typeof filterAkunpusat;
}

const GridAkunPusat = () => {
  const { alert } = useAlert();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { clearError } = useFormError();
  const { user } = useSelector((state: RootState) => state.auth);
  const gridRef = useRef<DataGridHandle>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const abortControllerRef = useRef<AbortController | null>(null); // AbortController untuk cancel request
  const [rows, setRows] = useState<IAkunpusat[]>([]);
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
  const [fetchingPages, setFetchingPages] = useState<Set<number>>(new Set());
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [checkedRows, setCheckedRows] = useState<Set<number>>(new Set());
  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [pageDataCache, setPageDataCache] = useState<Map<number, IAkunpusat[]>>(
    new Map()
  );
  const [isFetching, setIsFetching] = useState(false);
  const [pendingPages, setPendingPages] = useState<Set<number>>(new Set());
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAfterMutation, setIsAfterMutation] = useState(false);
  const scrollPositionRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null); // TAMBAHAN BARU
  const prevRowsLengthRef = useRef<number>(0);
  const prevMinPageRef = useRef<number>(1);
  const [columnsWidth, setColumnsWidth] = useState<{ [key: string]: number }>(
    {}
  );
  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: 30,
    search: '',
    sortBy: 'type_nama',
    sortDirection: 'asc',
    filters: filterAkunpusat
  });
  const [prevFilters, setPrevFilters] = useState<Filter>(filters);

  const {
    data: allAkunpusat,
    isLoading: isLoadingAkunpusat,
    refetch
  } = useGetAkunpusat(
    { ...filters, page: currentPage },
    abortControllerRef.current?.signal
  );
  //

  const { mutateAsync: createAkunpusat, isLoading: isLoadingCreate } =
    useCreateAkunpusat();
  const { mutateAsync: updateAkunpusat, isLoading: isLoadingUpdate } =
    useUpdateAkunpusat();
  const { mutateAsync: deleteAkunpusat, isLoading: isLoadingDelete } =
    useDeleteAkunpusat();

  const forms = useForm<AkunpusatInput>({
    resolver:
      mode === 'delete'
        ? undefined // Tidak pakai resolver saat delete
        : zodResolver(AkunpusatSchema),
    mode: 'onSubmit',
    defaultValues: {
      type_id: undefined,
      level: undefined,
      coa: '',
      keterangancoa: null,
      parent: '',
      cabang_id: undefined,
      statusaktif: undefined
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
      setSelectedRow(0);
      setVisiblePages([1, 2, 3, 4, 5]);
      setPageDataCache(new Map());
      // setIsFirstLoad(true); // TAMBAHKAN INI
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
    debouncedFilterUpdate.cancel();
    setFilters((prev) => ({
      ...prev,
      filters: { ...prev.filters, [colKey]: '' },
      page: 1
    }));
    setCheckedRows(new Set());
    setIsAllSelected(false);
    setRows([]);
    setCurrentPage(1);
    setVisiblePages([1, 2, 3, 4, 5]);
    setPageDataCache(new Map());
    // setIsFirstLoad(true); // TAMBAHKAN INI
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelPreviousRequest(abortControllerRef);
    const searchValue = e.target.value;
    setInputValue(searchValue);
    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      filters: filterAkunpusat,
      search: searchValue,
      page: 1
    }));
    setCheckedRows(new Set());
    setIsAllSelected(false);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 200);

    setSelectedRow(0);
    setCurrentPage(1);
    setRows([]);
    setVisiblePages([1, 2, 3, 4, 5]);
    setPageDataCache(new Map());
    // setIsFirstLoad(true); // TAMBAHKAN INI
  };

  const handleClearInput = () => {
    cancelPreviousRequest(abortControllerRef);
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
  function highlightText(
    text: string | number | null | undefined,
    search: string,
    columnFilter: string = ''
  ) {
    const textValue = text != null ? String(text) : '';
    if (!textValue) return '';

    // Priority: columnFilter over search
    const searchTerm = columnFilter?.trim() || search?.trim() || '';

    if (!searchTerm) {
      return textValue;
    }

    const escapeRegExp = (s: string) =>
      s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    // Create regex for continuous string match
    const escapedTerm = escapeRegExp(searchTerm);
    const regex = new RegExp(`(${escapedTerm})`, 'gi');

    // Replace all occurrences
    const highlighted = textValue.replace(
      regex,
      (match) =>
        `<span style="background-color: yellow; font-size: 13px; font-weight: 500">${match}</span>`
    );

    return (
      <span
        className="text-sm"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  }

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
    setRows([]);
    setVisiblePages([1, 2, 3, 4, 5]);
    setPageDataCache(new Map());
    // setIsFirstLoad(true); // TAMBAHKAN INI - trigger fetch pages 2-5
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

  // const handleContextMenu = (event: React.MouseEvent) => {
  //   event.preventDefault();
  //   setContextMenu({ x: event.clientX, y: event.clientY });
  // };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(event.target as Node)
    ) {
      setContextMenu(null);
    }
  };

  const columns = useMemo((): Column<IAkunpusat>[] => {
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
                  filters: filterAkunpusat
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
          return (
            <div className="flex h-full w-full cursor-pointer items-center justify-center text-sm">
              {props.row.nomor}
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
        renderCell: ({ row }: { row: IAkunpusat }) => (
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
        name: 'Nama Type Akuntansi',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('type_nama')}
              // onContextMenu={handleContextMenu}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'type_nama' ? 'font-bold' : 'font-normal'
                }`}
              >
                Nama Type Akuntansi
              </p>
              <div className="ml-2">
                {filters.sortBy === 'type_nama' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'type_nama' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="type_nama"
                value={filters.filters.type_nama || ''}
                onChange={(value) =>
                  handleFilterInputChange('type_nama', value)
                }
                onClear={() => handleClearFilter('type_nama')}
                inputRef={(el) => {
                  inputColRefs.current['type_nama'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.type_nama || '';
          const cellValue = props.row.type_nama || '';
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
        key: 'level',
        name: 'LEVEL',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-header',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('level')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'level' ? 'font-bold' : 'font-normal'
                }`}
              >
                LEVEL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'level' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'level' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="level"
                value={filters.filters.level || ''}
                onChange={(value) => handleFilterInputChange('level', value)}
                onClear={() => handleClearFilter('level')}
                inputRef={(el) => {
                  inputColRefs.current['level'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.level || '';
          const cellValue = props.row.level || '';
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
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
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
                colKey="coa"
                value={filters.filters.coa || ''}
                onChange={(value) => handleFilterInputChange('coa', value)}
                onClear={() => handleClearFilter('coa')}
                inputRef={(el) => {
                  inputColRefs.current['coa'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.coa || '';
          const cellValue = props.row.coa || '';
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
        key: 'parent',
        name: 'PARENT',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-header',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('parent')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'parent' ? 'font-bold' : 'font-normal'
                }`}
              >
                PARENT
              </p>
              <div className="ml-2">
                {filters.sortBy === 'parent' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'parent' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="parent"
                value={filters.filters.parent || ''}
                onChange={(value) => handleFilterInputChange('parent', value)}
                onClear={() => handleClearFilter('parent')}
                inputRef={(el) => {
                  inputColRefs.current['parent'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.parent || '';
          const cellValue = props.row.parent || '';
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
                colKey="keterangancoa"
                value={filters.filters.keterangancoa || ''}
                onChange={(value) =>
                  handleFilterInputChange('keterangancoa', value)
                }
                onClear={() => handleClearFilter('keterangancoa')}
                inputRef={(el) => {
                  inputColRefs.current['keterangancoa'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.keterangancoa || '';
          const cellValue = props.row.keterangancoa || '';
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
        key: 'cabang_id',
        name: 'Cabang',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('cabang_id')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'keterangan' ? 'font-bold' : 'font-normal'
                }`}
              >
                Cabang
              </p>
              <div className="ml-2">
                {filters.sortBy === 'cabang_id' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'cabang_id' &&
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
                endpoint="cabang"
                value="id"
                label="nama"
                onChange={(value) =>
                  handleFilterInputChange('cabang_id', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.cabang_nama || '';
          const cellValue = props.row.cabang_nama || '';
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
        name: 'STATUS AKTIF',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
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
    rows,
    checkedRows,
    filters.sortBy,
    filters.sortDirection,
    filters.filters
  ]);

  const handleAdd = async () => {
    setPopOver(true);
    setMode('add');
    forms.reset();
  };

  const handleEdit = async () => {
    if (selectedRow !== null) {
      const rowData = rows[selectedRow];
      const result = await checkValidationTypeAkuntansiFn({
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
      // Hapus data satu per satu
      for (const id of idsToDelete) {
        await deleteAkunpusat(id as unknown as string);
      }

      // Update state setelah semua data berhasil dihapus
      setRows((prevRows) =>
        prevRows.filter((row) => !idsToDelete.includes(row.id))
      );

      // Reset checked rows
      setCheckedRows(new Set());
      setIsAllSelected(false);

      // Update selected row
      if (selectedRow >= rows.length - idsToDelete.length) {
        setSelectedRow(Math.max(0, rows.length - idsToDelete.length - 1));
      }

      // Focus grid
      setTimeout(() => {
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

          const result = await checkValidationTypeAkuntansiFn({
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
            const response = await checkValidationTypeAkuntansiFn({
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
            cancelText: 'TIDAK',
            catchOnCancel: true
          });

          await handleMultipleDelete(checkedRowsArray);

          setIsAfterMutation(true);
          // Reset isAfterMutation setelah 1 detik
          setTimeout(() => {
            setIsAfterMutation(false);
          }, 1000);

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

  const onSuccess = async (
    indexOnPage: any,
    fetchedPages: any,
    pagedData: any,
    keepOpenModal: any = false
  ) => {
    dispatch(setClearLookup(true));
    clearError();
    setIsAfterMutation(true);
    try {
      if (keepOpenModal) {
        forms.reset();
        setPopOver(true);
      } else {
        forms.reset();
        setPopOver(false);

        // setRows([]);
        if (mode !== 'delete') {
          const response = await api2.get(`/redis/get/akunpusat-allItems`);
          // Set the rows only if the data has changed
          if (JSON.stringify(response.data) !== JSON.stringify(rows)) {
            setRows([]);
            console.log('response', response);
            setRows(response.data);
            setIsDataUpdated(true);
            // setCurrentPage(pageNumber);
            setVisiblePages(fetchedPages);
            console.log(fetchedPages, 'fetchedPages');
            setSelectedRow(indexOnPage);
            setPageDataCache(
              new Map(
                Object.entries(pagedData).map(([key, value]) => [
                  Number(key),
                  value as IAkunpusat[]
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
      }
    } catch (error) {
      console.error('Error during onSuccess:', error);
      setIsDataUpdated(false);
    } finally {
      // dispatch(setClearLookup(false));
      setIsDataUpdated(false);
      // Reset isAfterMutation setelah 1 detik untuk mengaktifkan kembali scroll handler
      setTimeout(() => {
        setIsAfterMutation(false);
      }, 1000);
    }
  };

  const onSubmit = async (values: AkunpusatInput, keepOpenModal = false) => {
    const selectedRowId = rows[selectedRow]?.id;
    try {
      dispatch(setProcessing());
      if (mode === 'delete') {
        if (selectedRowId) {
          await deleteAkunpusat(selectedRowId as unknown as string, {
            onSuccess: () => {
              setPopOver(false);
              setRows((prevRows) =>
                prevRows.filter((row) => row.id !== selectedRowId)
              );
              setIsAfterMutation(true);
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
              // Reset isAfterMutation setelah 1 detik
              setTimeout(() => {
                setIsAfterMutation(false);
              }, 1000);
            }
          });
        }
        return;
      }
      if (mode === 'add') {
        const newOrder = await createAkunpusat(
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
                keepOpenModal
              )
          }
        );

        if (newOrder !== undefined && newOrder !== null) {
        }
        return;
      }

      if (selectedRowId && mode === 'edit') {
        await updateAkunpusat(
          {
            id: selectedRowId as unknown as string,
            fields: { ...values, ...filters }
          },
          {
            onSuccess: (data) =>
              onSuccess(data.itemIndex, data.fetchedPages, data.pagedData)
          }
        );
        queryClient.invalidateQueries('akunpusat');
      }
    } catch (error) {
      console.error(error);
    } finally {
      dispatch(setProcessed());
    }
  };

  // const loadGridConfig = async (userId: string, gridName: string) => {
  //   try {
  //     const response = await fetch(
  //       `/api/loadgrid?userId=${userId}&gridName=${gridName}`
  //     );
  //     if (!response.ok) {
  //       throw new Error('Failed to load grid configuration');
  //     }

  //     const { columnsOrder, columnsWidth }: GridConfig = await response.json();

  //     setColumnsOrder(
  //       columnsOrder && columnsOrder.length
  //         ? columnsOrder
  //         : columns.map((_, index) => index)
  //     );
  //     setColumnsWidth(
  //       columnsWidth && Object.keys(columnsWidth).length
  //         ? columnsWidth
  //         : columns.reduce(
  //             (acc, column) => ({
  //               ...acc,
  //               [column.key]: columnsWidth[column.key] || column.width // Use width from columnsWidth or fallback to default column width
  //             }),
  //             {}
  //           )
  //     );
  //   } catch (error) {
  //     console.error('Failed to load grid configuration:', error);

  //     // If configuration is not available or error occurs, fallback to original column widths
  //     setColumnsOrder(columns.map((_, index) => index));

  //     setColumnsWidth(
  //       columns.reduce(
  //         (acc, column) => {
  //           // Use the original column width instead of '1fr' when configuration is missing or error occurs
  //           acc[column.key] =
  //             typeof column.width === 'number' ? column.width : 0; // Ensure width is a number or default to 0
  //           return acc;
  //         },
  //         {} as { [key: string]: number }
  //       )
  //     );
  //   }
  // };

  // const saveGridConfig = async (
  //   userId: string, // userId sebagai identifier
  //   gridName: string,
  //   columnsOrder: number[],
  //   columnsWidth: { [key: string]: number }
  // ) => {
  //   try {
  //     const response = await fetch('/api/savegrid', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json'
  //       },
  //       body: JSON.stringify({
  //         userId,
  //         gridName,
  //         config: { columnsOrder, columnsWidth }
  //       })
  //     });

  //     if (!response.ok) {
  //       throw new Error('Failed to save grid configuration');
  //     }
  //   } catch (error) {
  //     console.error('Failed to save grid configuration:', error);
  //   }
  // };

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
      saveGridConfig(user.id, 'GridAkunPusat', [...columnsOrder], newWidthMap);
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

      saveGridConfig(user.id, 'GridAkunPusat', [...newOrder], columnsWidth);
      return newOrder;
    });
  };

  // const resetGridConfig = () => {
  //   // Nilai default untuk columnsOrder dan columnsWidth
  //   const defaultColumnsOrder = columns.map((_, index) => index);
  //   const defaultColumnsWidth = columns.reduce(
  //     (acc, column) => {
  //       acc[column.key] = typeof column.width === 'number' ? column.width : 0;
  //       return acc;
  //     },
  //     {} as { [key: string]: number }
  //   );

  //   // Set state kembali ke nilai default
  //   setColumnsOrder(defaultColumnsOrder);
  //   setColumnsWidth(defaultColumnsWidth);
  //   setContextMenu(null);
  //   setDataGridKey((prevKey) => prevKey + 1);

  //   gridRef?.current?.selectCell({ rowIdx: 0, idx: 0 });

  //   // Simpan konfigurasi reset ke server (atau backend)
  //   if (user.id) {
  //     saveGridConfig(
  //       user.id,
  //       'GridAkunPusat',
  //       defaultColumnsOrder,
  //       defaultColumnsWidth
  //     );
  //   }
  // };

  document.querySelectorAll('.column-headers').forEach((element) => {
    element.classList.remove('c1kqdw7y7-0-0-beta-47');
  });

  function handleCellClick(args: { row: IAkunpusat }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
    }
  }

  function getRowClass(row: IAkunpusat) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: IAkunpusat) {
    return row.id;
  }
  // Ubah fungsi handleScroll untuk menyimpan referensi scroll container
  async function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (
      isLoadingAkunpusat ||
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

    scrollPositionRef.current = scrollTop;
    scrollContainerRef.current = currentTarget;

    // Threshold untuk trigger fetch - lebih konservatif
    const topThreshold = scrollHeight * 0.2;
    const bottomThreshold = scrollHeight * 0.5;

    // Scroll ke bawah
    if (scrollTop + clientHeight >= bottomThreshold) {
      const maxPage = Math.max(...visiblePages);
      const nextPage = maxPage + 1;

      if (
        nextPage <= totalPages &&
        !pageDataCache.has(nextPage) &&
        !isFetching
      ) {
        setIsFetching(true);
        setIsTransitioning(true);
        setCurrentPage(nextPage);
      }
    }

    // Scroll ke atas
    if (scrollTop <= topThreshold) {
      const minPage = Math.min(...visiblePages);
      const prevPage = minPage - 1;

      if (prevPage >= 1 && !pageDataCache.has(prevPage) && !isFetching) {
        setIsFetching(true);
        setIsTransitioning(true);
        setCurrentPage(prevPage);
      }
    }
  }

  async function handleKeyDown(
    args: CellKeyDownArgs<IAkunpusat>,
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

  const orderedColumns = useMemo(() => {
    if (Array.isArray(columnsOrder) && columnsOrder.length > 0) {
      // Mapping dan filter untuk menghindari undefined
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

      const response = await getAkunpusatFn(filtersWithoutLimit);
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
        judullaporan: 'Laporan Akun Pusat',
        usercetak: user.username,
        tglcetak: tglcetak,

        judul: 'PT.TRANSPORINDO AGUNG SEJAHTERA'
      }));

      sessionStorage.setItem(
        'filtersWithoutLimit',
        JSON.stringify(filtersWithoutLimit)
      );
      // Dynamically import Stimulsoft and generate the PDF report
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
          report.loadFile('/reports/LaporanAkunPusat.mrt');
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
              window.open('/reports/akunpusat', '_blank');
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

  useEffect(() => {
    // loadGridConfig(user.id, 'GridAkunPusat');
    loadGridConfig(
      user.id,
      'GridAkunPusat',
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
      setIsFirstLoad(false);
    }
  }, [isFirstLoad, rows]);

  useEffect(() => {
    if (!allAkunpusat || isDataUpdated || isAfterMutation) return;

    const newRows = allAkunpusat.data || [];

    // Cache data halaman
    setPageDataCache((prevCache) => {
      const newCache = new Map(prevCache);
      newCache.set(currentPage, newRows);
      return newCache;
    });

    setVisiblePages((prevVisible) => {
      const maxVisible = Math.max(...prevVisible);
      const minVisible = Math.min(...prevVisible);

      // Scroll ke bawah - jaga 5 pages, buang page pertama
      if (currentPage > maxVisible) {
        const newPages = [...prevVisible.slice(1), currentPage];

        // Hapus page yang sudah tidak visible dari cache
        const removedPage = prevVisible[0];
        setPageDataCache((prev) => {
          const updated = new Map(prev);
          updated.delete(removedPage);
          return updated;
        });

        return newPages;
      }

      // Scroll ke atas - jaga 5 pages, buang page terakhir
      if (currentPage < minVisible) {
        const newPages = [currentPage, ...prevVisible.slice(0, 4)];

        // Hapus page yang sudah tidak visible dari cache
        const removedPage = prevVisible[4];
        setPageDataCache((prev) => {
          const updated = new Map(prev);
          updated.delete(removedPage);
          return updated;
        });

        return newPages;
      }

      return prevVisible;
    });

    if (allAkunpusat.pagination.totalPages) {
      setTotalPages(allAkunpusat.pagination.totalPages);
    }

    setHasMore(newRows.length === filters.limit);
    setPrevFilters(filters);

    // Reset flags setelah fetch selesai
    setTimeout(() => {
      setIsTransitioning(false);
      setIsFetching(false);
    }, 100);
  }, [allAkunpusat, currentPage, filters, isDataUpdated]);

  useEffect(() => {
    const combinedRows: IAkunpusat[] = [];
    const scrollContainer = scrollContainerRef.current;

    // Ambil nilai dari ref (nilai sebelumnya yang tersimpan)
    const prevMinPage = prevMinPageRef.current;
    const prevRowsLength = prevRowsLengthRef.current; // GUNAKAN REF, BUKAN rows.length

    visiblePages?.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (pageData) {
        combinedRows.push(...pageData);
      }
    });

    if (combinedRows.length > 0) {
      const newMinPage = Math.min(...visiblePages);
      const isScrollingUp = newMinPage < prevMinPage;

      // Jika scrolling up dan rows bertambah di awal
      if (
        isScrollingUp &&
        combinedRows.length > prevRowsLength &&
        scrollContainer
      ) {
        requestAnimationFrame(() => {
          // Hitung berapa banyak rows yang ditambahkan
          const addedRowsCount = combinedRows.length - prevRowsLength;
          const rowHeight = 30; // sesuai dengan rowHeight di DataGrid
          const scrollOffset = addedRowsCount * rowHeight;
          scrollContainer.scrollTop = scrollPositionRef.current + scrollOffset;
        });
      }

      // Update rows state
      setRows(combinedRows);

      // Simpan nilai untuk perbandingan di render berikutnya
      prevMinPageRef.current = newMinPage;
      prevRowsLengthRef.current = combinedRows.length; // SIMPAN LENGTH BARU
    }
  }, [visiblePages, pageDataCache]);
  useEffect(() => {
    const fetchInitialPages = async () => {
      // Kondisi: jalankan saat isFirstLoad true dan page 1 sudah ada data
      if (
        isFirstLoad &&
        currentPage === 1 &&
        rows.length > 0 &&
        pageDataCache.has(1) &&
        !isFetching
      ) {
        setIsFetching(true);

        // Fetch pages 2-5 secara berurutan
        for (let page = 2; page <= 5; page++) {
          if (page <= totalPages && !pageDataCache.has(page)) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            setCurrentPage(page);
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }

        setIsFirstLoad(false);
        setIsFetching(false);
      }
    };

    // Trigger hanya jika isFirstLoad true dan tidak sedang loading
    if (isFirstLoad && !isLoadingAkunpusat && pageDataCache.has(1)) {
      fetchInitialPages();
    }
  }, [
    isFirstLoad,
    rows.length,
    currentPage,
    isLoadingAkunpusat,
    totalPages,
    pageDataCache,
    isFetching
  ]);
  console.log('pageDataCache', pageDataCache);
  console.log('visiblePages', visiblePages);
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
    const rowData = rows[selectedRow];

    if (selectedRow !== null && rows.length > 0 && mode !== 'add') {
      forms.setValue('id', rowData?.id ?? null);
      forms.setValue('coa', rowData?.coa);
      forms.setValue('parent', rowData?.parent);
      forms.setValue('keterangancoa', rowData?.keterangancoa);
      forms.setValue('level', rowData?.level);
      forms.setValue('statusaktif', rowData?.statusaktif);
      forms.setValue('cabang_id', rowData?.cabang_id);
      forms.setValue('type_id', rowData?.type_id);
      forms.setValue('type_nama', rowData?.type_nama);
      forms.setValue('cabang_nama', rowData?.cabang_nama);
      forms.setValue('statusaktif_nama', rowData?.statusaktif_nama);
    } else if (selectedRow !== null && rows.length > 0 && mode === 'add') {
      forms.setValue('id', null);
      // If in addMode, ensure the form values are cleared
      // forms.setValue('statusaktif_text', rowData?.statusaktif_text || '');
      // forms.setValue('akuntansi_nama', '');
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
      requestAnimationFrame(() => setFocus('coa'));
    }
  }, [isSubmitSuccessful, setFocus]);

  useEffect(() => {
    return () => {
      debouncedFilterUpdate.cancel();
    };
  }, []);

  return (
    <div className={`flex h-[100%] w-full justify-center`}>
      <div className="flex h-[100%]  w-full flex-col rounded-sm border border-blue-500 bg-white">
        <div
          className="flex h-[38px] w-full flex-row items-center rounded-t-sm border-b border-blue-500 px-2"
          style={{
            background: 'linear-gradient(to bottom, #eff5ff 0%, #e0ecff 100%)'
          }}
        >
          <label htmlFor="" className="text-xs text-zinc-600">
            SEARCH :
          </label>
          <div className="relative flex w-[200px] flex-row items-center">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                handleInputChange(e);
              }}
              className="m-2 h-[28px] w-[200px] rounded-sm bg-white text-black"
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

        <DataGrid
          ref={gridRef}
          columns={finalColumns}
          rows={rows}
          rowKeyGetter={rowKeyGetter}
          rowClass={getRowClass}
          onCellClick={handleCellClick}
          headerRowHeight={70}
          rowHeight={30}
          className="rdg-light fill-grid"
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
          enableVirtualization={false}
        />
        <div
          className="flex flex-row justify-between border border-x-0 border-b-0 border-blue-500 p-2"
          style={{
            background: 'linear-gradient(to bottom, #eff5ff 0%, #e0ecff 100%)'
          }}
        >
          <ActionButton
            module="Type-Akuntansi"
            onAdd={handleAdd}
            checkedRows={checkedRows}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            customActions={[
              {
                label: 'Print',
                icon: <FaPrint />,
                onClick: () => handleReport(),
                className: 'bg-cyan-500 hover:bg-cyan-700'
              }
            ]}
          />
          {isLoadingAkunpusat ? <LoadRowsRenderer /> : null}
          {contextMenu && (
            <div
              ref={contextMenuRef}
              style={{
                position: 'fixed', // Fixed agar koordinat sesuai dengan viewport
                top: contextMenu.y, // Pastikan contextMenu.y berasal dari event.clientY
                left: contextMenu.x, // Pastikan contextMenu.x berasal dari event.clientX
                backgroundColor: 'white',
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
                    'GridAkunPusat',
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
      <FormAkunPusat
        mode={mode}
        forms={forms}
        popOver={popOver}
        setPopOver={setPopOver}
        handleClose={handleClose}
        onSubmit={forms.handleSubmit(onSubmit as any)}
        isLoadingCreate={isLoadingCreate}
        isLoadingUpdate={isLoadingUpdate}
        isLoadingDelete={isLoadingDelete}
      />
    </div>
  );
};

export default GridAkunPusat;
