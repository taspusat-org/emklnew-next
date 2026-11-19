'use client';

import Image from 'next/image';
import { debounce } from 'lodash';
import 'react-data-grid/lib/styles.scss';
import { useForm } from 'react-hook-form';
import IcClose from '@/public/image/x.svg';
import FormMarketing from './FormMarketing';
import { useQueryClient } from 'react-query';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import { api2 } from '@/lib/utils/AxiosInstance';
import { Checkbox } from '@/components/ui/checkbox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { useAlert } from '@/lib/store/client/useAlert';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { useFormError } from '@/lib/hooks/formErrorContext';
import FilterInput from '@/components/custom-ui/FilterInput';
import ActionButton from '@/components/custom-ui/ActionButton';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import { setHeaderData } from '@/lib/store/headerSlice/headerSlice';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearOpenName,
  setClearLookup
} from '@/lib/store/lookupSlice/lookupSlice';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  cancelPreviousRequest,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import {
  useCreateMarketing,
  useDeleteMarketing,
  useGetMarketingHeader,
  useUpdateMarketing
} from '@/lib/server/useMarketingHeader';
import {
  filterMarketing,
  MarketingHeader
} from '@/lib/types/marketingheader.type';
import {
  MarketingInput,
  marketingSchema
} from '@/lib/validations/marketing.validation';
import DataGrid, {
  CellClickArgs,
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import { FaPrint, FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import {
  checkValidationMarketingFn,
  getMarketingBiayaFn,
  getMarketingHeaderFn,
  getMarketingManagerFn,
  getMarketingOrderanFn,
  getMarketingProsesFeeFn
} from '@/lib/apis/marketingheader.api';
import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
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
  filters: typeof filterMarketing;
}

const GridMarketing = () => {
  const { alert } = useAlert();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { clearError } = useFormError();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const { user } = useSelector((state: RootState) => state.auth);
  const gridRef = useRef<DataGridHandle>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // AbortController untuk cancel request
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [mode, setMode] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [dataGridKey, setDataGridKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [popOver, setPopOver] = useState<boolean>(false);
  const [rows, setRows] = useState<MarketingHeader[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const [isFilteringRows, setIsFilteringRows] = useState(false);
  const [isFetchingManually, setIsFetchingManually] = useState(false);
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
  const [fetchedPages, setFetchedPages] = useState<Set<number>>(new Set([1]));
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [columnsWidth, setColumnsWidth] = useState<{ [key: string]: number }>(
    {}
  );
  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: 30,
    search: '',
    sortBy: 'nama',
    sortDirection: 'asc',
    filters: {
      ...filterMarketing
    }
  });
  const [prevFilters, setPrevFilters] = useState<Filter>(filters);

  const { data: allDataMarketing, isLoading: isLoadingDataMarketing } =
    useGetMarketingHeader({ ...filters, page: currentPage });
  const { mutateAsync: createMarketing, isLoading: isLoadingCreate } =
    useCreateMarketing();
  const { mutateAsync: updateMarketing, isLoading: isLoadingUpdate } =
    useUpdateMarketing();
  const { mutateAsync: deleteMarketing, isLoading: isLoadingDelete } =
    useDeleteMarketing();

  const forms = useForm<MarketingInput>({
    // Saat DELETE tak perlu resolver: yang dikirim hanya id baris, sedangkan
    // aturan "wajib diisi" justru memunculkan pesan merah di seluruh field dan
    // menahan tombol DELETE. Pola sama dengan GridAkunPusat/GridManagerMarketing.
    resolver: mode === 'delete' ? undefined : zodResolver(marketingSchema),
    mode: 'onSubmit',
    defaultValues: {
      nama: '',
      keterangan: '',
      marketingorderan: [],
      marketingbiaya: [],
      marketingmanager: [],
      marketingprosesfee: []
    }
  });

  const {
    setFocus,
    reset,
    formState: { isSubmitSuccessful }
  } = forms;

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
    setFetchedPages(new Set([1]));
    setRows([]);
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

  const handleFilterRows = (val: string) => {
    setIsFilteringRows(true);
    // setLocalSelectedValue(val);
    // onChange?.(val);
    setTimeout(() => {
      setIsFilteringRows(false);
    }, 1000);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelPreviousRequest(abortControllerRef);
    const searchValue = e.target.value;
    setInputValue(searchValue);
    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      filters: filterMarketing,
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
  };

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

  const columns = useMemo((): Column<MarketingHeader>[] => {
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
                  filters: filterMarketing
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
        renderCell: ({ row }: { row: MarketingHeader }) => (
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
        name: 'NAMA',
        resizable: true,
        draggable: true,
        width: 200,
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
                NAMA
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
        key: 'kode',
        name: 'kode',
        resizable: true,
        draggable: true,
        width: 100,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('kode')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kode' ? 'font-bold' : 'font-normal'
                }`}
              >
                kode
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kode' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kode' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kode"
                value={filters.filters.kode || ''}
                onChange={(value) => handleFilterInputChange('kode', value)}
                onClear={() => handleClearFilter('kode')}
                inputRef={(el) => {
                  inputColRefs.current['kode'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kode || '';
          const cellValue = props.row.kode || '';
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
        width: 250,
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
        key: 'statusaktif',
        name: 'STATUS AKTIF',
        resizable: true,
        draggable: true,
        width: 120,
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
                selectedValue={filters.filters.statusaktif_nama}
                onChange={(value) =>
                  handleFilterInputChange('statusaktif_nama', value)
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
          return <div className="text-xs text-gray-500">N/A</div>; // Tampilkan 'N/A' jika memo tidak tersedia
        }
      },
      {
        key: 'email',
        name: 'Email',
        resizable: true,
        draggable: true,
        width: 250,
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
                EMAIL
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
        key: 'karyawan',
        name: 'Karyawan',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('karyawan')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'karyawan' ? 'font-bold' : 'font-normal'
                }`}
              >
                KARYAWAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'karyawan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'karyawan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="karyawan"
                value={filters.filters.karyawan_nama || ''}
                onChange={(value) =>
                  handleFilterInputChange('karyawan_nama', value)
                }
                onClear={() => handleClearFilter('karyawan_nama')}
                inputRef={(el) => {
                  inputColRefs.current['karyawan'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.karyawan_nama || '';
          const cellValue = props.row.karyawan_nama || '';
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
        key: 'tglmasuk',
        name: 'tgl masuk',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('tglmasuk')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tglmasuk' ? 'font-bold' : 'font-normal'
                }`}
              >
                TGL MASUK
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tglmasuk' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tglmasuk' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tglmasuk"
                value={filters.filters.tglmasuk || ''}
                onChange={(value) => handleFilterInputChange('tglmasuk', value)}
                onClear={() => handleClearFilter('tglmasuk')}
                inputRef={(el) => {
                  inputColRefs.current['tglmasuk'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tglmasuk || '';
          const cellValue = props.row.tglmasuk || '';
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
        key: 'cabang',
        name: 'cabang',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('cabang')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'cabang' ? 'font-bold' : 'font-normal'
                }`}
              >
                CABANG
              </p>
              <div className="ml-2">
                {filters.sortBy === 'cabang' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'cabang' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="cabang"
                value={filters.filters.cabang_nama || ''}
                onChange={(value) =>
                  handleFilterInputChange('cabang_nama', value)
                }
                onClear={() => handleClearFilter('cabang_nama')}
                inputRef={(el) => {
                  inputColRefs.current['cabang'] = el;
                }}
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
        key: 'statustarget',
        name: 'status target',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statustarget')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statustarget'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                STATUS TARGET
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statustarget' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statustarget' &&
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
                selectedValue={filters.filters.statustarget_nama}
                onChange={(value) =>
                  handleFilterInputChange('statustarget_nama', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.statustarget_memo
            ? JSON.parse(props.row.statustarget_memo)
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
        }
      },
      {
        key: 'statusbagifee',
        name: 'status bagi fee',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statusbagifee')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statusbagifee'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                STATUS BAGI FEE
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statusbagifee' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statusbagifee' &&
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
                selectedValue={filters.filters.statusbagifee_nama}
                onChange={(value) =>
                  handleFilterInputChange('statusbagifee_nama', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.statusbagifee_memo
            ? JSON.parse(props.row.statusbagifee_memo)
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
        }
      },
      {
        key: 'statusfeemanager',
        name: 'status fee manager',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statusfeemanager')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statusfeemanager'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                STATUS FEE MANAGER
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statusfeemanager' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statusfeemanager' &&
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
                selectedValue={filters.filters.statusfeemanager_nama}
                onChange={(value) =>
                  handleFilterInputChange('statusfeemanager_nama', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.statusfeemanager_memo
            ? JSON.parse(props.row.statusfeemanager_memo)
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
        }
      },
      // {
      //   key: 'marketingmanager',
      //   name: 'marketingmanager',
      //   resizable: true,
      //   draggable: true,
      //   headerCellClass: 'column-headers',
      //   width: 250,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div
      //         className="headers-cell h-[50%]"
      //         onClick={() => handleSort('marketingmanager')}
      //         onContextMenu={(event) => setContextMenu(handleContextMenu(event))}
      //       >
      //         <p className={`text-sm ${filters.sortBy === 'marketingmanager' ? 'font-bold' : 'font-normal' }`}>
      //           MARKETING MANAGER
      //         </p>
      //         <div className="ml-2">
      //           {filters.sortBy === 'marketingmanager' && filters.sortDirection === 'asc' ? (
      //             <FaSortUp className="font-bold" />
      //           ) : filters.sortBy === 'marketingmanager' && filters.sortDirection === 'desc' ? (
      //             <FaSortDown className="font-bold" />
      //           ) : (
      //             <FaSort className="text-zinc-400" />
      //           )}
      //         </div>
      //       </div>

      //       <div className="relative h-[50%] w-full px-1">
      //         <Input
      //           ref={(el) => {
      //             inputColRefs.current['marketingmanager'] = el;
      //           }}
      //           className="filter-input z-[999999] h-8 rounded-none"
      //           value={filters.filters.marketingmanager_nama.toUpperCase() || ''}
      //           onChange={(e) => {
      //             const value = e.target.value.toUpperCase();
      //             handleColumnFilterChange('marketingmanager_nama', value);
      //           }}
      //         />
      //         {filters.filters.marketingmanager_nama && (
      //           <button
      //             className="absolute right-2 top-2 text-xs text-gray-500"
      //             onClick={() => handleColumnFilterChange('marketingmanager_nama', '')}
      //             type="button"
      //           >
      //             <FaTimes />
      //           </button>
      //         )}
      //       </div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const columnFilter = filters.filters.marketingmanager_nama || '';
      //     return (
      //       <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-sm">
      //         {highlightText(
      //           props.row.marketingmanager_nama !== null &&
      //             props.row.marketingmanager_nama !== undefined
      //             ? props.row.marketingmanager_nama
      //             : '',
      //           filters.search,
      //           columnFilter
      //         )}
      //       </div>
      //     );
      //   }
      // },

      {
        key: 'marketinggroup',
        name: 'marketing group',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('marketinggroup')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'marketinggroup'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                MARKETING GROUP
              </p>
              <div className="ml-2">
                {filters.sortBy === 'marketinggroup' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'marketinggroup' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="marketinggroup"
                value={filters.filters.marketinggroup_nama || ''}
                onChange={(value) =>
                  handleFilterInputChange('marketinggroup_nama', value)
                }
                onClear={() => handleClearFilter('marketinggroup_nama')}
                inputRef={(el) => {
                  inputColRefs.current['marketinggroup'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.marketinggroup_nama || '';
          const cellValue = props.row.marketinggroup_nama || '';
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
        key: 'statusprafee',
        name: 'status pra fee',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('statusprafee')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statusprafee'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                STATUS PRA FEE
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statusprafee' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statusprafee' &&
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
                selectedValue={filters.filters.statusprafee_nama}
                onChange={(value) =>
                  handleFilterInputChange('statusprafee_nama', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.statusprafee_memo
            ? JSON.parse(props.row.statusprafee_memo)
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
    if (selectedRow !== null) {
      const rowData = rows[selectedRow];
      const result = await checkValidationMarketingFn({
        aksi: 'EDIT',
        value: Number(rowData.id)
      });

      if (result.data.result == 'failed') {
        alert({
          title: result.data.message,
          variant: 'danger',
          submitText: 'OK'
          // isForceEdit: true,
          // valueForceEdit: rowData.id,
          // tableNameForceEdit: 'marketing',
          // clickableText: 'LANJUT EDIT'
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
        await deleteMarketing(id as unknown as string);
      }

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

          const result = await checkValidationMarketingFn({
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
            const response = await checkValidationMarketingFn({
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
    pageNumber: any,
    keepOpenModal: any = false
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

        setIsFetchingManually(true);
        setRows([]);
        if (mode !== 'delete') {
          const response = await api2.get(`/redis/get/marketing-allItems`);
          if (JSON.stringify(response.data) !== JSON.stringify(rows)) {
            // Set the rows only if the data has changed
            setRows(response.data);
            setIsDataUpdated(true);
            setCurrentPage(pageNumber);
            setFetchedPages(new Set([pageNumber]));
            setSelectedRow(indexOnPage);
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
      setIsFetchingManually(false);
      setIsDataUpdated(false);
    }
  };

  const onSubmit = async (values: MarketingInput, keepOpenModal = false) => {
    const selectedRowId = rows[selectedRow]?.id;

    if (mode === 'delete') {
      if (selectedRowId) {
        await deleteMarketing(selectedRowId as unknown as string, {
          onSuccess: () => {
            setPopOver(false);
            setRows((prevRows) =>
              prevRows.filter((row) => row.id !== selectedRowId)
            );
            if (selectedRow === 0) {
              setSelectedRow(selectedRow);
              gridRef?.current?.selectCell({ rowIdx: selectedRow, idx: 1 });
            } else if (selectedRow === rows.length - 1) {
              setSelectedRow(selectedRow - 1);
              gridRef?.current?.selectCell({ rowIdx: selectedRow - 1, idx: 1 });
            } else {
              setSelectedRow(selectedRow);
              gridRef?.current?.selectCell({ rowIdx: selectedRow, idx: 1 });
            }
          }
        });
      }
      return;
    }

    if (mode === 'add') {
      const newOrder = await createMarketing(
        {
          ...values,
          marketingorderan: values.marketingorderan.map((detail: any) => ({
            ...detail,
            id: 0 // Ubah id setiap detail menjadi 0
          })),
          marketingbiaya: values.marketingbiaya.map((detail: any) => ({
            ...detail,
            id: 0
          })),
          marketingmanager: values.marketingmanager.map((detail: any) => ({
            ...detail,
            id: 0
          })),
          marketingprosesfee: values.marketingprosesfee.map((detail: any) => ({
            ...detail,
            id: 0
          })),
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
      await updateMarketing(
        {
          id: selectedRowId as unknown as string,
          fields: { ...values, ...filters }
        },
        { onSuccess: (data) => onSuccess(data.dataIndex, data.pageNumber) }
      );
      queryClient.invalidateQueries('marketing');
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

      const master = await getMarketingHeaderFn(filtersWithoutLimit);

      // const formatted = await Promise.all(
      //   master.data.map(async (data: any) => {
      //     const detailItems = await getMarketingOrderanFn(data.id);

      //     return {
      //       detail: detailItems.data.map((d: any) => ({
      //         nama: data.nama,
      //         keterangan: data.keterangan,
      //         singkatan: data.singkatan,
      //         statusaktif_nama: data.statusaktif_nama,
      //       }))
      //     };
      //   })
      // );

      const marketingWithOrderan = await Promise.all(
        master.data.map(async (data: any) => {
          const marketingorderan = await getMarketingOrderanFn(data.id);

          return {
            marketingorderan: marketingorderan.data.map((details: any) => ({
              nama: data.nama,
              kode: data.kode,
              keterangan: data.keterangan,
              statusaktif_nama: data.statusaktif_nama,
              email: data.email,
              karyawan_nama: data.karyawan_nama,
              tglmasuk: data.tglmasuk,
              cabang_nama: data.cabang_nama,
              statustarget_nama: data.statustarget_nama,
              statusbagifee_nama: data.statusbagifee_nama,
              statusfeemanager_nama: data.statusfeemanager_nama,
              marketinggroup_nama: data.marketinggroup_nama,
              statusprafee_nama: data.statusprafee_nama,
              namadetailorderan: details.nama,
              keterangandetailorderan: details.keterangan,
              singkatandetailorderan: details.singkatan,
              statusaktifdetailorderan: details.statusaktif_nama
            }))
          };
        })
      );

      const reportMarketingOrderanData = marketingWithOrderan.map((row) => ({
        ...row,
        judullaporan: 'Laporan Marketing',
        usercetak: user.username,
        tglcetak: tglcetak,
        judul: 'PT.TRANSPORINDO AGUNG SEJAHTERA'
      }));

      const marketingWithBiaya = await Promise.all(
        master.data.map(async (data: any) => {
          const marketingbiaya = await getMarketingBiayaFn(data.id);

          return {
            marketingbiaya: marketingbiaya.data.map((details: any) => ({
              nama: data.nama,
              kode: data.kode,
              keterangan: data.keterangan,
              statusaktif_nama: data.statusaktif_nama,
              email: data.email,
              karyawan_nama: data.karyawan_nama,
              tglmasuk: data.tglmasuk,
              cabang_nama: data.cabang_nama,
              statustarget_nama: data.statustarget_nama,
              statusbagifee_nama: data.statusbagifee_nama,
              statusfeemanager_nama: data.statusfeemanager_nama,
              marketinggroup_nama: data.marketinggroup_nama,
              statusprafee_nama: data.statusprafee_nama,
              jenisbiayamarketing_namadetailbiaya:
                details.jenisbiayamarketing_nama,
              nominaldetailbiaya: details.nominal,
              statusaktifdetailbiaya: details.statusaktif_nama
            }))
          };
        })
      );

      const reportMarketingBiayaData = marketingWithBiaya.map((row) => ({
        ...row,
        judullaporan: 'Laporan Marketing',
        usercetak: user.username,
        tglcetak: tglcetak,
        judul: 'PT.TRANSPORINDO AGUNG SEJAHTERA'
      }));

      const marketingWithManager = await Promise.all(
        master.data.map(async (data: any) => {
          const marketingmanager = await getMarketingManagerFn(data.id);

          return {
            marketingmanager: marketingmanager.data.map((details: any) => ({
              nama: data.nama,
              kode: data.kode,
              keterangan: data.keterangan,
              statusaktif_nama: data.statusaktif_nama,
              email: data.email,
              karyawan_nama: data.karyawan_nama,
              tglmasuk: data.tglmasuk,
              cabang_nama: data.cabang_nama,
              statustarget_nama: data.statustarget_nama,
              statusbagifee_nama: data.statusbagifee_nama,
              statusfeemanager_nama: data.statusfeemanager_nama,
              marketinggroup_nama: data.marketinggroup_nama,
              statusprafee_nama: data.statusprafee_nama,
              managermarketing_namadetailmanager: details.managermarketing_nama,
              tglapprovaldetailmanager: details.tglapproval,
              statusapprovaldetailmanager: details.statusapproval_nama,
              userapprovaldetailmanager: details.userapproval,
              statusaktifdetailmanager: details.statusaktif_nama
            }))
          };
        })
      );

      const reportMarketingManagerData = marketingWithManager.map((row) => ({
        ...row,
        judullaporan: 'Laporan Marketing',
        usercetak: user.username,
        tglcetak: tglcetak,
        judul: 'PT.TRANSPORINDO AGUNG SEJAHTERA'
      }));

      const marketingWithProsesFee = await Promise.all(
        master.data.map(async (data: any) => {
          const marketinprosesfee = await getMarketingProsesFeeFn(data.id);

          return {
            marketinprosesfee: marketinprosesfee.data.map((details: any) => ({
              nama: data.nama,
              kode: data.kode,
              keterangan: data.keterangan,
              statusaktif_nama: data.statusaktif_nama,
              email: data.email,
              karyawan_nama: data.karyawan_nama,
              tglmasuk: data.tglmasuk,
              cabang_nama: data.cabang_nama,
              statustarget_nama: data.statustarget_nama,
              statusbagifee_nama: data.statusbagifee_nama,
              statusfeemanager_nama: data.statusfeemanager_nama,
              marketinggroup_nama: data.marketinggroup_nama,
              statusprafee_nama: data.statusprafee_nama,
              namadetailorderan: details.nama,
              jenisprosesfee_namadetailprosesfee: details.jenisprosesfee_nama,
              statuspotongbiayakantor_namadetailprosesfee:
                details.statuspotongbiayakantor_nama,
              statusaktifdetailprosesfee: details.statusaktif_nama
            }))
          };
        })
      );

      const reportMarketingBProsesFeeData = marketingWithProsesFee.map(
        (row) => ({
          ...row,
          judullaporan: 'Laporan Marketing',
          usercetak: user.username,
          tglcetak: tglcetak,
          judul: 'PT.TRANSPORINDO AGUNG SEJAHTERA'
        })
      );

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
          report.loadFile('/reports/LaporanMarketing.mrt');
          report.dictionary.dataSources.clear();
          dataSet.readJson({ data: reportMarketingOrderanData });
          dataSet.readJson({ mbiaya: reportMarketingBiayaData });
          dataSet.readJson({ mManager: reportMarketingManagerData });
          dataSet.readJson({ mProsesFee: reportMarketingBProsesFeeData });
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
              window.open('/reports/marketing', '_blank');
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
        'GridMarketingHeader',
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
        'GridMarketingHeader',
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
    if (isLoadingDataMarketing || !hasMore || rows.length === 0) return;

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
        setIsAllSelected(false);
      }
    }

    if (isAtTop(event)) {
      const prevPage = findUnfetchedPage(-1);
      if (prevPage && !fetchedPages.has(prevPage)) {
        setCurrentPage(prevPage);
      }
    }
  }

  async function handleKeyDown(
    args: CellKeyDownArgs<MarketingHeader>,
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

  function handleCellClick(args: CellClickArgs<MarketingHeader>) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    const foundRow = rows.find((r) => r.id === clickedRow?.id);
    if (rowIndex !== -1 && foundRow) {
      setSelectedRow(rowIndex);
      dispatch(setHeaderData(foundRow));
    }
  }

  function getRowClass(row: MarketingHeader) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: MarketingHeader) {
    return row.id;
  }

  useEffect(() => {
    loadGridConfig(
      user.id,
      'GridMarketingHeader',
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
    if (!allDataMarketing || isDataUpdated) return;

    const newRows = allDataMarketing.data || [];

    setRows((prevRows) => {
      // Reset data if filter changes (first page)
      if (currentPage === 1 || filters !== prevFilters) {
        setCurrentPage(1); // Reset currentPage to 1
        setFetchedPages(new Set([1])); // Reset fetchedPages to [1]
        return newRows; // Use the fetched new rows directly
      }

      // Add new data to the bottom for infinite scroll
      if (!fetchedPages.has(currentPage)) {
        return [...prevRows, ...newRows];
      }

      return prevRows;
    });

    if (allDataMarketing.pagination.totalPages) {
      setTotalPages(allDataMarketing.pagination.totalPages);
    }

    setHasMore(newRows.length === filters.limit);
    setFetchedPages((prev) => new Set(prev).add(currentPage));
    setPrevFilters(filters);
  }, [
    allDataMarketing,
    currentPage,
    filters,
    isFetchingManually,
    isDataUpdated
  ]);

  useEffect(() => {
    if (rows.length > 0 && selectedRow !== null) {
      const selectedRowData = rows[selectedRow];
      dispatch(setHeaderData(selectedRowData)); // Pastikan data sudah benar
    } else {
      dispatch(setHeaderData({}));
    }
  }, [rows, selectedRow, dispatch]);

  useEffect(() => {
    const headerCells = document.querySelectorAll('.rdg-header-row .rdg-cell');
    headerCells.forEach((cell) => {
      cell.setAttribute('tabindex', '-1');
    });
  }, []);

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

    return () => {
      // Menghapus event listener saat komponen di-unmount
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
      const row = rows[selectedRow];
      //

      forms.setValue('nama', row?.nama);
      forms.setValue('kode', row?.kode ?? '');
      forms.setValue('keterangan', row?.keterangan ?? '');
      forms.setValue('statusaktif', row?.statusaktif ?? 0);
      forms.setValue('statusaktif_nama', row?.statusaktif_nama ?? null);
      forms.setValue('email', row?.email ?? '');
      forms.setValue('karyawan_id', row?.karyawan_id ?? '');
      forms.setValue('karyawan_nama', row?.karyawan_nama ?? null);
      forms.setValue('tglmasuk', row?.tglmasuk ?? '');
      forms.setValue('statustarget', row?.statustarget);
      forms.setValue('statustarget_nama', row?.statustarget_nama);
      forms.setValue('statusbagifee', row?.statusbagifee);
      forms.setValue('statusbagifee_nama', row?.statusbagifee_nama);
      forms.setValue('statusfeemanager', row?.statusfeemanager);
      forms.setValue('statusfeemanager_nama', row?.statusfeemanager_nama);
      // kolomnya TEXT & DTO backend z.string() — Number() mengirim number dan
      // ditolak 400 saat edit; kosong dibiarkan '' karena field ini opsional
      forms.setValue('marketinggroup_id', String(row?.marketinggroup_id ?? ''));
      forms.setValue('marketinggroup_nama', row?.marketinggroup_nama);
      forms.setValue('statusprafee', row?.statusprafee);
      forms.setValue('statusprafee_nama', row?.statusprafee_nama);
      forms.setValue('marketingorderan', []); // Menyiapkan details sebagai array kosong jika belum ada
    } else {
      // Clear or set defaults when adding a new record
      forms.setValue('statusaktif_nama', '');
      forms.setValue('karyawan_nama', '');
      forms.setValue('statustarget_nama', '');
      forms.setValue('statusbagifee_nama', '');
      forms.setValue('statusfeemanager_nama', '');
      forms.setValue('marketinggroup_nama', '');
      forms.setValue('statusprafee_nama', '');
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
        forms.reset();
        setMode('');
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
      reset();
      requestAnimationFrame(() => setFocus('nama')); // Pastikan fokus terjadi setelah repaint
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
              gridName="GridMarketingHeader"
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
            module="MARKETING"
            onAdd={handleAdd}
            checkedRows={checkedRows}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            rowsLength={rows.length}
            totalItems={
              allDataMarketing ? allDataMarketing.pagination.totalItems : 0
            }
            customActions={[
              {
                label: 'Print',
                icon: <FaPrint />,
                onClick: () => handleReport(),
                className: 'bg-cyan-500 hover:bg-cyan-700'
              }
            ]}
          />
          {isLoadingDataMarketing ? <LoadRowsRenderer /> : null}
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
                    'GridMarketingHeader',
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
      <FormMarketing
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

export default GridMarketing;
