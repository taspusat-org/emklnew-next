'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useQueryClient } from 'react-query';
import { MenuInput, menuSchema } from '@/lib/validations/menu.validation';
import { useDeleteMenu, useUpdateMenu } from '@/lib/server/useMenu';
import { syncAcosFn } from '@/lib/apis/acos.api';
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
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  exportMenuBySelectFn,
  exportMenuFn,
  getMenuFn,
  reportMenuBySelectFn
} from '@/lib/apis/menu.api';
import { HiDocument } from 'react-icons/hi2';
import {
  setDetailDataReport,
  setReportData
} from '@/lib/store/reportSlice/reportSlice';
import { useDispatch } from 'react-redux';
import { Checkbox } from '@/components/ui/checkbox';
import { useAlert } from '@/lib/store/client/useAlert';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import IcClose from '@/public/image/x.svg';
import ReportDesignerMenu from '@/app/reports/menu/page';
import {
  useCreatePengembalianKasGantung,
  useGetPengembalianKasGantung
} from '@/lib/server/usePengembalianKasGantung';
import {
  PengembalianKasGantungHeaderInput,
  pengembalianKasGantungHeaderSchema
} from '@/lib/validations/pengembaliankasgantung.validation';
import { getPengembalianKasGantungHeaderFn } from '@/lib/apis/pengembaliankasgantung.api';
import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import { setHeaderData } from '@/lib/store/headerSlice/headerSlice';
import {
  KasGantungHeaderInput,
  kasgantungHeaderSchema
} from '@/lib/validations/kasgantung.validation';
import {
  useCreateKasGantung,
  useDeleteKasGantung,
  useGetKasGantungHeader,
  useUpdatePengembalianKasGantung
} from '@/lib/server/useKasGantung';
import { clearOpenName } from '@/lib/store/lookupSlice/lookupSlice';
import { checkBeforeDeleteFn } from '@/lib/apis/global.api';
import {
  checkValidationKasGantungFn,
  getKasGantungDetailFn,
  getKasGantungHeaderFn
} from '@/lib/apis/kasgantungheader.api';
import {
  formatDateToDDMMYYYY,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import {
  useCreatePenerimaan,
  useDeletePenerimaan,
  useGetPenerimaanHeader,
  useUpdatePenerimaan
} from '@/lib/server/usePenerimaan';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import {
  PenerimaanHeaderInput,
  penerimaanHeaderSchema
} from '@/lib/validations/penerimaan.validation';
import {
  getPenerimaanDetailFn,
  getPenerimaanHeaderByIdFn
} from '@/lib/apis/penerimaan.api';
import { numberToTerbilang } from '@/lib/utils/terbilang';
import Link from 'next/link';
import JsxParser from 'react-jsx-parser';
import {
  useCreatePengeluaranEmklHeader,
  useGetPengeluaranEmklHeader,
  useUpdatePengeluaranEmklHeader
} from '@/lib/server/usePengeluaranEmklHeader';
import {
  filterPengeluaranEmklHeader,
  PengeluaranEmklHeader
} from '@/lib/types/pengeluaranemklheader.type';
import FormPengeluaranEmkl from './FormPengeluaranEmkl';
import {
  PengeluaranemklheaderHeaderInput,
  pengeluaranemklheaderHeaderSchema
} from '@/lib/validations/pengeluaranemklheader.validation';
import {
  getPengeluaranEmklDetailFn,
  getPengeluaranEmklHeaderByIdFn
} from '@/lib/apis/pengeluaranemklheader.api';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { useTheme } from 'next-themes';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { LoadRowsRenderer } from '@/components/LoadRows';

interface Filter {
  page: number;
  limit: number;
  search: string;
  filters: typeof filterPengeluaranEmklHeader;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridPengeluaranEmklHeader = () => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const [isFilteringRows, setIsFilteringRows] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const searchParams = useSearchParams();

  const [totalPages, setTotalPages] = useState(1);
  const [popOver, setPopOver] = useState<boolean>(false);
  const {
    mutateAsync: createPengeluaranEmklHeader,
    isLoading: isLoadingCreate
  } = useCreatePengeluaranEmklHeader();
  const {
    mutateAsync: updaetPengeluaranEmklHeader,
    isLoading: isLoadingUpdate
  } = useUpdatePengeluaranEmklHeader();
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { mutateAsync: deletePenerimaan, isLoading: isLoadingDelete } =
    useDeletePenerimaan();
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
  const [rows, setRows] = useState<PengeluaranEmklHeader[]>([]);
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const prevPageRef = useRef(currentPage);
  const dispatch = useDispatch();
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const { alert } = useAlert();
  const { user, cabang_id, token } = useSelector(
    (state: RootState) => state.auth
  );
  const forms = useForm<PengeluaranemklheaderHeaderInput>({
    resolver: zodResolver(pengeluaranemklheaderHeaderSchema),
    mode: 'onSubmit',
    defaultValues: {
      nobukti: '',
      tglbukti: '',
      tgljatuhtempo: '',
      keterangan: '',
      karyawan_id: null,
      karyawan_nama: '',
      jenisposting: null,
      bank_id: null,
      bank_nama: '',
      nowarkat: '',
      format: null,
      details: []
    }
  });
  const gridRef = useRef<DataGridHandle>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const colTimersRef = useRef<
    Map<keyof Filter['filters'], ReturnType<typeof setTimeout>>
  >(new Map());
  const router = useRouter();
  const { selectedDate, selectedDate2, onReload, selectedPengeluaranEmkl } =
    useSelector((state: RootState) => state.filter);
  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: 30,
    filters: {
      ...filterPengeluaranEmklHeader,
      tglDari: selectedDate,
      tglSampai: selectedDate2
    },
    search: '',
    sortBy: 'nobukti',
    sortDirection: 'asc'
  });

  const [prevFilters, setPrevFilters] = useState<Filter>(filters);

  const {
    data: allData,
    isLoading: isLoadingData,
    refetch
  } = useGetPengeluaranEmklHeader({
    ...filters,
    page: currentPage
  });
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleColumnFilterChange = (
    colKey: keyof Filter['filters'],
    value: string
  ) => {
    // Logika yang ada pada handleColumnFilterChange sebelumnya
    const originalIndex = columns.findIndex((col) => col.key === colKey);
    const displayIndex =
      columnsOrder.length > 0
        ? columnsOrder.findIndex((idx) => idx === originalIndex)
        : originalIndex;

    setInputValue('');
    setSelectedRow(0);

    setTimeout(() => {
      gridRef?.current?.selectCell({ rowIdx: 0, idx: displayIndex });
    }, 100);

    setTimeout(() => {
      const ref = inputColRefs.current[colKey];
      ref?.focus();
    }, 200);

    setFilters((prev) => ({
      ...prev,
      filters: { ...prev.filters, [colKey]: value },
      search: '',
      page: 1
    }));
    setCheckedRows(new Set());
    setIsAllSelected(false);
    setRows([]);
    setCurrentPage(1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        filters: filterPengeluaranEmklHeader, // Gunakan filter yang relevan
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

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      colTimersRef.current.forEach((t) => clearTimeout(t));
      colTimersRef.current.clear();
    };
  }, []);
  const handleSort = (column: string) => {
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
      gridRef?.current?.selectCell({ rowIdx: 0, idx: 1 });
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

  const columns = useMemo((): Column<PengeluaranEmklHeader>[] => {
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
                  filters: filterPengeluaranEmklHeader
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
        renderCell: ({ row }: { row: PengeluaranEmklHeader }) => (
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
        name: 'Nomor Bukti',
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
                Nomor Bukti
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
              <Input
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
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nobukti || '';
          const value = props.row.nobukti; // atau dari props.row
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.nobukti || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'tglbukti',
        name: 'Tanggal Bukti',
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
                Tanggal Bukti
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
              <Input
                ref={(el) => {
                  inputColRefs.current['tglbukti'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.tglbukti.toUpperCase() || ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('tglbukti', value);
                }}
              />
              {filters.filters.tglbukti && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('tglbukti', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tglbukti || '';
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.tglbukti || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'bank_nama',
        name: 'Nama Bank',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('bank_id')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'bank_id' ? 'font-bold' : 'font-normal'
                }`}
              >
                Nama Bank
              </p>
              <div className="ml-2">
                {filters.sortBy === 'bank_id' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'bank_id' &&
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
                endpoint="bank"
                value="id"
                label="nama"
                onChange={(value) => handleColumnFilterChange('bank_id', value)} // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.bank_nama !== null &&
                  props.row.bank_nama !== undefined
                  ? props.row.bank_nama
                  : '',
                filters.search
              )}
            </div>
          );
        }
      },
      {
        key: 'tgljatuhtempo',
        name: 'TGL JATUH TEMPO',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('tgljatuhtempo')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tgljatuhtempo'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                TGL JATUH TEMPO
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tgljatuhtempo' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tgljatuhtempo' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['tgljatuhtempo'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.tgljatuhtempo
                    ? filters.filters.tgljatuhtempo?.toUpperCase()
                    : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase(); // Menjadikan input menjadi uppercase
                  handleColumnFilterChange('tgljatuhtempo', value);
                }}
              />
              {filters.filters.tgljatuhtempo && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('tgljatuhtempo', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tgljatuhtempo || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.tgljatuhtempo || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'jenisseal_id',
        name: 'jenis seal',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('jenisseal_id')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'jenisseal_id'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                JENIS SEAL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'jenisseal_id' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'jenisseal_id' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['jenisseal_text'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.jenisseal_text
                    ? filters.filters.jenisseal_text?.toUpperCase()
                    : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase(); // Menjadikan input menjadi uppercase
                  handleColumnFilterChange('jenisseal_text', value);
                }}
              />
              {filters.filters.jenisseal_text && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('jenisseal_text', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.jenisseal_text || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.jenisseal_text || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'pengeluaran_nobukti',
        name: 'No.BUKTI PENGELUARAN',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('pengeluaran_nobukti')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'pengeluaran_nobukti'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                No.BUKTI PENGELUARAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'pengeluaran_nobukti' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'pengeluaran_nobukti' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['pengeluaran_nobukti'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.pengeluaran_nobukti
                    ? filters.filters.pengeluaran_nobukti.toUpperCase()
                    : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase(); // Menjadikan input menjadi uppercase
                  handleColumnFilterChange('pengeluaran_nobukti', value);
                }}
              />
              {filters.filters.pengeluaran_nobukti && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() =>
                    handleColumnFilterChange('pengeluaran_nobukti', '')
                  }
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.pengeluaran_nobukti || '';
          const value = props.row.pengeluaran_nobukti; // atau dari props.row
          // Buat component wrapper untuk highlightText
          const HighlightWrapper = () => {
            return highlightText(value, filters.search, columnFilter);
          };
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              <JsxParser
                components={{ HighlightWrapper }}
                jsx={props.row.link}
                renderInWrapper={false}
              />
            </div>
          );
        }
      },
      {
        key: 'karyawan_nama',
        name: 'Karyawan',
        resizable: true,
        draggable: true,
        width: 300,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('karyawan_nama')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'karyawan_nama'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Karyawan
              </p>
              <div className="ml-2">
                {filters.sortBy === 'karyawan_nama' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'karyawan_nama' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['karyawan_nama'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.karyawan_nama
                    ? filters.filters.karyawan_nama?.toUpperCase()
                    : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase(); // Menjadikan input menjadi uppercase
                  handleColumnFilterChange('karyawan_nama', value);
                }}
              />
              {filters.filters.karyawan_nama && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('karyawan_nama', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.karyawan_nama || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.karyawan_nama || '',
                filters.search,
                columnFilter
              )}
            </div>
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
              <Input
                ref={(el) => {
                  inputColRefs.current['keterangan'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.keterangan
                    ? filters.filters.keterangan?.toUpperCase()
                    : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase(); // Menjadikan input menjadi uppercase
                  handleColumnFilterChange('keterangan', value);
                }}
              />
              {filters.filters.keterangan && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('keterangan', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.keterangan || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.keterangan || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'jenisposting',
        name: 'Jenis Posting',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('jenisposting')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'jenisposting'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Jenis Posting
              </p>
              <div className="ml-2">
                {filters.sortBy === 'jenisposting' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'jenisposting' &&
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
                filterBy={{ grp: 'JENIS POSTING', subgrp: 'JENIS POSTING' }}
                value="id"
                label="text"
                onChange={(value) =>
                  handleColumnFilterChange('jenisposting', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(props.row.jenisposting_nama || '', filters.search)}
            </div>
          );
        }
      },
      {
        key: 'hutang_nobukti',
        name: 'NO.BUKTI HUTANG',
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
              onClick={() => handleSort('hutang_nobukti')}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'hutang_nobukti'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                NO.BUKTI HUTANG
              </p>
              <div className="ml-2">
                {filters.sortBy === 'hutang_nobukti' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'hutang_nobukti' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['hutang_nobukti'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.hutang_nobukti || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleColumnFilterChange('hutang_nobukti', value);
                }}
              />
              {filters.filters.hutang_nobukti && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('hutang_nobukti', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.hutang_nobukti || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.hutang_nobukti || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'nowarkat',
        name: 'NO WARKAT',
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
              onClick={() => handleSort('nowarkat')}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nowarkat' ? 'font-bold' : 'font-normal'
                }`}
              >
                NOWARKAT
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nowarkat' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nowarkat' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['nowarkat'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.nowarkat || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleColumnFilterChange('nowarkat', value);
                }}
              />
              {filters.filters.nowarkat && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('nowarkat', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nowarkat || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.nowarkat || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
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
              <Input
                ref={(el) => {
                  inputColRefs.current['modifiedby'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.modifiedby || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleColumnFilterChange('modifiedby', value);
                }}
              />
              {filters.filters.modifiedby && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('modifiedby', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.modifiedby || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.modifiedby || '',
                filters.search,
                columnFilter
              )}
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
              <Input
                ref={(el) => {
                  inputColRefs.current['created_at'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.created_at.toUpperCase() || ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('created_at', value);
                }}
              />
              {filters.filters.created_at && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('created_at', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.created_at || '';
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.created_at || '',
                filters.search,
                columnFilter
              )}
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
              <Input
                ref={(el) => {
                  inputColRefs.current['created_at'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.updated_at.toUpperCase() || ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('updated_at', value);
                }}
              />
              {filters.filters.updated_at && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('updated_at', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.updated_at || '';
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.updated_at || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      }
    ];
  }, [filters, rows, checkedRows]);

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
        'GridPengeluaranEmklHeader',
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
        'GridPengeluaranEmklHeader',
        [...newOrder],
        columnsWidth
      );
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
    if (isLoadingData || !hasMore || rows.length === 0) return;

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

  function handleCellClick(args: CellClickArgs<PengeluaranEmklHeader>) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    const foundRow = rows.find((r) => r.id === clickedRow?.id);
    if (rowIndex !== -1 && foundRow) {
      setSelectedRow(rowIndex);
      dispatch(setHeaderData(foundRow));
    }
  }
  async function handleKeyDown(
    args: CellKeyDownArgs<PengeluaranEmklHeader>,
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
  const onSuccess = async (indexOnPage: any, pageNumber: any) => {
    try {
      forms.reset();
      setPopOver(false);
      setIsFetchingManually(true);
      setRows([]);
      if (mode !== 'delete') {
        const response = await api2.get(
          `/redis/get/pengeluaranemklheader-allItems`
        );
        // Set the rows only if the data has changed
        if (JSON.stringify(response.data) !== JSON.stringify(rows)) {
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

      setIsFetchingManually(false);
      setIsDataUpdated(false);
    } catch (error) {
      console.error('Error during onSuccess:', error);
      setIsFetchingManually(false);
      setIsDataUpdated(false);
    }
  };
  const onSubmit = async (values: PengeluaranemklheaderHeaderInput) => {
    const selectedRowId = rows[selectedRow]?.id;
    try {
      dispatch(setProcessing());
      if (mode === 'delete') {
        if (selectedRowId) {
          await deletePenerimaan(selectedRowId as unknown as string, {
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
                gridRef?.current?.selectCell({
                  rowIdx: selectedRow - 1,
                  idx: 1
                });
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
        const newOrder = await createPengeluaranEmklHeader(
          {
            ...values,
            details: values.details.map((detail: any) => ({
              ...detail,
              id: 0 // Ubah id setiap detail menjadi 0
            })),
            ...filters // Kirim filter ke body/payload
          },
          {
            onSuccess: (data) => onSuccess(data.itemIndex, data.pageNumber)
          }
        );

        if (newOrder !== undefined && newOrder !== null) {
        }
        return;
      }

      if (selectedRowId && mode === 'edit') {
        await updaetPengeluaranEmklHeader(
          {
            id: selectedRowId as unknown as string,
            fields: { ...values, ...filters }
          },
          { onSuccess: (data) => onSuccess(data.itemIndex, data.pageNumber) }
        );
        queryClient.invalidateQueries('penerimaan');
      }
    } catch (error) {
      console.error('Error during onSuccess:', error);
      setIsFetchingManually(false);
      setIsDataUpdated(false);
    } finally {
      dispatch(setProcessed());
    }
  };

  const handleEdit = async () => {
    if (selectedRow === null && checkedRows.size > 0) {
      alert({
        title: 'PILIH DATA YANG INGIN DI EDIT!',
        variant: 'danger',
        submitText: 'OK'
      });
      return;
    }
    if (selectedRow !== null) {
      const rowData = rows[selectedRow];
      const result = await checkValidationKasGantungFn({
        aksi: 'EDIT',
        value: rowData.id
      });
      if (result.status == 'failed') {
        alert({
          title: result.message,
          variant: 'danger',
          submitText: 'OK'
        });
      } else {
        setPopOver(true);
        setMode('edit');
      }
    }
  };
  const handleDelete = async () => {
    if (selectedRow !== null) {
      const rowData = rows[selectedRow];

      try {
        // Mengirim request untuk validasi beberapa kombinasi
        const result = await checkValidationKasGantungFn({
          aksi: 'DELETE',
          value: rowData.nobukti
        });

        if (result.status == 'failed') {
          // Menampilkan alert jika ada yang gagal
          alert({
            title: result.message,
            variant: 'danger',
            submitText: 'OK'
          });
        } else {
          // Jika semua validasi berhasil, lanjutkan proses penghapusan atau operasi lain
          setMode('delete');
          setPopOver(true);
        }
      } catch (error) {
        console.error('Error during delete validation:', error);
      }
    }
  };

  const handleView = () => {
    if (selectedRow !== null) {
      setMode('view');
      setPopOver(true);
    }
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

      const response = await getPengeluaranEmklHeaderByIdFn(rowId);
      const responseDetail = await getPengeluaranEmklDetailFn({
        filters: { nobukti: selectedRowNobukti }
      });
      const totalNominal = responseDetail.data.reduce(
        (sum: number, i: any) => sum + Number(i.nominal || 0),
        0
      );

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
        judullaporan: 'Laporan Pengeluaran',
        usercetak: user.username,
        tglcetak: new Date().toLocaleDateString(),
        terbilang: numberToTerbilang(totalNominal),
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
          dataSet.readJson({ detail: responseDetail.data });
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

  //   const response = await getPengeluaranEmklHeaderByIdFn(rowId);
  //   const responseDetail = await getPengeluaranEmklDetailFn({
  //     filters: { nobukti: selectedRowNobukti }
  //   });
  //
  //   const totalNominal = responseDetail.data.reduce(
  //     (sum: number, i: any) => sum + Number(i.nominal || 0),
  //     0
  //   );

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
  //       terbilang: numberToTerbilang(totalNominal),
  //       judul: 'PT.TRANSPORINDO AGUNG SEJAHTERA'
  //     }));
  //     dispatch(setReportData(reportRows));
  //     dispatch(setDetailDataReport(responseDetail.data));
  //     window.open('/reports/designer', '_blank');
  //   }
  // };

  document.querySelectorAll('.column-headers').forEach((element) => {
    element.classList.remove('c1kqdw7y7-0-0-beta-47');
  });
  function getRowClass(row: PengeluaranEmklHeader) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: PengeluaranEmklHeader) {
    return row.id;
  }

  const handleClose = () => {
    setPopOver(false);
    setMode('');

    forms.reset();
  };
  const handleAdd = async () => {
    try {
      // Jalankan API sinkronisasi
      setMode('add');

      setPopOver(true);

      forms.reset();
    } catch (error) {
      console.error('Error syncing ACOS:', error);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(event.target as Node)
    ) {
      setContextMenu(null);
    }
  };

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
    setIsFirstLoad(true);
    loadGridConfig(
      user.id,
      'GridPengeluaranEmklHeader',
      columns,
      setColumnsOrder,
      setColumnsWidth
    );

    const rawNobukti = searchParams.get('penerimaan_nobukti');

    // Set filters
    setFilters((prevFilters: Filter) => ({
      ...prevFilters,
      filters: {
        ...prevFilters.filters,
        nobukti: rawNobukti ?? ''
      }
    }));

    // Menambahkan timeout 1 detik sebelum menghapus parameter dari URL
    setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete('penerimaan_nobukti');
      window.history.replaceState({}, '', url.toString());
    }, 1000); // Delay 1 detik (1000 ms)
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
    if (isFirstLoad) {
      if (
        selectedDate !== filters.filters.tglDari ||
        selectedDate2 !== filters.filters.tglSampai
      ) {
        setFilters((prevFilters) => ({
          ...prevFilters,
          filters: {
            ...prevFilters.filters,
            tglDari: selectedDate,
            tglSampai: selectedDate2
          }
        }));
      }
    } else if (onReload) {
      // Jika onReload diklik, update filter tanggal
      if (
        selectedDate !== filters.filters.tglDari ||
        selectedDate2 !== filters.filters.tglSampai
      ) {
        setFilters((prevFilters) => ({
          ...prevFilters,
          filters: {
            ...prevFilters.filters,
            tglDari: selectedDate,
            tglSampai: selectedDate2
          }
        }));
      }
    }
  }, [selectedDate, selectedDate2, filters, onReload, isFirstLoad]);

  useEffect(() => {
    if (!allData || isDataUpdated) return;

    const newRows = allData.data || [];

    setRows((prevRows) => {
      // Reset data jika filter berubah (halaman pertama)
      if (currentPage === 1 || filters !== prevFilters) {
        setCurrentPage(1); // Reset currentPage ke 1
        setFetchedPages(new Set([1])); // Reset fetchedPages ke [1]
        return newRows; // Pakai data baru langsung
      }

      // Tambah data baru di bawah untuk infinite scroll
      if (!fetchedPages.has(currentPage)) {
        return [...prevRows, ...newRows];
      }

      return prevRows;
    });

    if (allData.pagination.totalPages) {
      setTotalPages(allData.pagination.totalPages);
    }

    setHasMore(newRows.length === filters.limit);
    setFetchedPages((prev) => new Set(prev).add(currentPage));
    setIsFirstLoad(false);
    setPrevFilters(filters);
  }, [allData, currentPage, filters, isDataUpdated]);
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
  // useEffect(() => {
  //   if (gridRef.current && dataGridKey) {
  //     setTimeout(() => {
  //       gridRef.current?.selectCell({ rowIdx: 0, idx: 1 });
  //       setIsFirstLoad(false);
  //     }, 0);
  //   }
  // }, [dataGridKey]);
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
    if (selectedRow !== null && rows.length > 0 && mode !== 'add') {
      const row = rows[selectedRow];

      forms.setValue('nobukti', row?.nobukti);
      forms.setValue('tglbukti', row?.tglbukti);
      forms.setValue('tgljatuhtempo', row?.tgljatuhtempo);
      forms.setValue('keterangan', row?.keterangan ?? '');
      forms.setValue('bank_id', row?.bank_id ?? null);
      forms.setValue('nowarkat', row?.nowarkat ?? '');
      forms.setValue('bank_nama', row?.bank_nama);
      forms.setValue('karyawan_id', row?.karyawan_id ?? null);
      forms.setValue('karyawan_nama', row?.karyawan_nama);
      forms.setValue('jenisposting', Number(row?.jenisposting) ?? null);
      forms.setValue('format', row?.statusformat ?? null);
      forms.setValue('jenisposting_nama', row?.jenisposting_nama ?? null);
      forms.setValue('pengeluaran_nobukti', row?.pengeluaran_nobukti ?? null);
      forms.setValue('hutang_nobukti', row?.hutang_nobukti ?? null);
      forms.setValue('statusformat_nama', row?.statusformat_nama ?? null);

      // Saat form pertama kali di-render
      forms.setValue('details', []); // Menyiapkan details sebagai array kosong jika belum ada
    } else {
      // Clear or set defaults when adding a new record
      const currentDate = new Date(); // Dapatkan tanggal sekarang
      forms.setValue('bank_nama', '');
      forms.setValue('tglbukti', formatDateToDDMMYYYY(currentDate));
      forms.setValue('tgljatuhtempo', formatDateToDDMMYYYY(currentDate));
      forms.setValue('format', selectedPengeluaranEmkl);
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
    // Memastikan refetch dilakukan saat filters berubah
    if (onReload) {
      refetch(); // Memanggil ulang API untuk mendapatkan data terbaru
      setPrevFilters(filters); // Simpan filters terbaru
    }
  }, [onReload, refetch]); // Dependency array termasuk filters dan refetch

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
              gridName="GridPengeluaranEmklHeader"
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
            module="KAS-GANTUNG"
            onAdd={handleAdd}
            checkedRows={checkedRows}
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
            rowsLength={rows.length}
            totalItems={allData ? allData.pagination.totalItems : 0}
            customActions={[
              {
                label: 'Print',
                icon: <FaPrint />,
                onClick: () => handleReport(),
                className: 'bg-cyan-500 hover:bg-cyan-700'
              }
            ]}
          />
          {isLoadingData ? <LoadRowsRenderer /> : null}
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
                    'GridPengeluaranEmklHeader',
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
      <FormPengeluaranEmkl
        popOver={popOver}
        handleClose={handleClose}
        setPopOver={setPopOver}
        isLoadingUpdate={isLoadingUpdate}
        isLoadingDelete={isLoadingDelete}
        forms={forms}
        mode={mode}
        onSubmit={forms.handleSubmit(onSubmit)}
        isLoadingCreate={isLoadingCreate}
      />
    </div>
  );
};

export default GridPengeluaranEmklHeader;
