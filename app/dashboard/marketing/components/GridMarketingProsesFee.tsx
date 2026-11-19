'use client';

import Image from 'next/image';
import { debounce } from 'lodash';
import 'react-data-grid/lib/styles.scss';
import { useForm } from 'react-hook-form';
import { FaPencil } from 'react-icons/fa6';
import IcClose from '@/public/image/x.svg';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSelector, useDispatch } from 'react-redux';
import { useAlert } from '@/lib/store/client/useAlert';
import FormMarketingDetail from './FormMarketingDetail';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { useFormError } from '@/lib/hooks/formErrorContext';
import FilterInput from '@/components/custom-ui/FilterInput';
import ActionButton from '@/components/custom-ui/ActionButton';
import { CellClickArgs, CellKeyDownArgs } from 'react-data-grid';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import DataGrid, { Column, DataGridHandle } from 'react-data-grid';
import { clearOpenName } from '@/lib/store/lookupSlice/lookupSlice';
import { setDetailData } from '@/lib/store/headerSlice/headerSlice';
import { FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { checkValidationEditmarketingDetailFn } from '@/lib/apis/marketingheader.api';
import {
  filterMarketingProsesFee,
  MarketingProsesFee
} from '@/lib/types/marketingheader.type';
import {
  useCreateMarketingDetail,
  useGetMarketingProsesFee
} from '@/lib/server/useMarketingHeader';
import {
  MarketingDetailInput,
  marketingdetailSchema
} from '@/lib/validations/marketing.validation';
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
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { useTheme } from 'next-themes';

interface GridProps {
  activeTab: string; // Menerima props activeTab
}

interface Filter {
  page: number;
  limit: number;
  search: string;
  filters: typeof filterMarketingProsesFee;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridMarketingProsesFee = ({ activeTab }: GridProps) => {
  const { alert } = useAlert();
  const dispatch = useDispatch();
  const { clearError } = useFormError();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const { user } = useSelector((state: RootState) => state.auth);
  const headerData = useSelector((state: RootState) => state.header.headerData);
  const gridRef = useRef<DataGridHandle>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [dataGridKey, setDataGridKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [popOver, setPopOver] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [rows, setRows] = useState<MarketingProsesFee[]>([]);
  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
  const [fetchedPages, setFetchedPages] = useState<Set<number>>(new Set([1]));
  const [columnsWidth, setColumnsWidth] = useState<{ [key: string]: number }>(
    {}
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: 30,
    search: '',
    filters: filterMarketingProsesFee,
    sortBy: 'marketing_nama',
    sortDirection: 'asc'
  });
  const [prevFilters, setPrevFilters] = useState<Filter>(filters);

  const forms = useForm<MarketingDetailInput>({
    resolver: zodResolver(marketingdetailSchema),
    mode: 'onSubmit',
    defaultValues: {
      // marketing_id: null,
      marketing_nama: '',
      // jenisprosesfee_id: null,
      // statuspotongbiayakantor: 0,
      statuspotongbiayakantor_nama: '',
      statusaktif_nama: '',
      marketingdetail: []
    }
  });

  const {
    data: allDatamarketingProsesFee,
    isLoading: isLoadingMarketingProsesFee,
    refetch
  } = useGetMarketingProsesFee(headerData?.id ?? 0, activeTab, '', {
    ...filters,
    page: 1
  });

  const {
    mutateAsync: createMarketingDetail,
    isLoading: isLoadingCreateMarketingDetail
  } = useCreateMarketingDetail();

  const debouncedFilterUpdate = useRef(
    debounce((colKey: string, value: string) => {
      setInputValue('');
      setFilters((prev) => ({
        ...prev,
        search: '',
        filters: { ...prev.filters, [colKey]: value },
        page: 1
      }));
      setRows([]);
    }, 300) // Bisa dikurangi jadi 250-300ms
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
    debouncedFilterUpdate.cancel(); // Cancel pending updates
    setFilters((prev) => ({
      ...prev,
      filters: { ...prev.filters, [colKey]: '' },
      page: 1
    }));
    setRows([]);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelPreviousRequest(abortControllerRef);
    const searchValue = e.target.value;
    setInputValue(searchValue);
    setFilters((prev) => ({
      ...prev,
      filters: filterMarketingProsesFee,
      search: searchValue,
      page: 1
    }));

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
    setFetchedPages(new Set([1]));
    setRows([]);
  };

  const columns = useMemo((): Column<MarketingProsesFee>[] => {
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
                  filters: {
                    marketing_nama: '',
                    jenisprosesfee_nama: '',
                    statuspotongbiayakantor_nama: '',
                    statusaktif_nama: ''
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
        key: 'marketing',
        name: 'marketing',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('marketing_nama')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'marketing_nama'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                nama marketing
              </p>
              <div className="ml-2">
                {filters.sortBy === 'marketing_nama' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'marketing_nama' &&
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
                value={filters.filters.marketing_nama || ''}
                onChange={(value) =>
                  handleFilterInputChange('marketing_nama', value)
                }
                onClear={() => handleClearFilter('marketing_nama')}
                inputRef={(el) => {
                  inputColRefs.current['marketing'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.marketing_nama || '';
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
        key: 'jenisprosesfee',
        name: 'jenis proses fee',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('jenisprosesfee_nama')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'jenisprosesfee_nama'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Jenis Proses Fee
              </p>
              <div className="ml-2">
                {filters.sortBy === 'jenisprosesfee_nama' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'jenisprosesfee_nama' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="jenisprosesfee"
                value={filters.filters.jenisprosesfee_nama || ''}
                onChange={(value) =>
                  handleFilterInputChange('jenisprosesfee_nama', value)
                }
                onClear={() => handleClearFilter('jenisprosesfee_nama')}
                inputRef={(el) => {
                  inputColRefs.current['jenisprosesfee'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.jenisprosesfee_nama || '';
          const cellValue = props.row.jenisprosesfee_nama || '';
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
        key: 'statuspotongbiayakantor',
        name: 'status potong biaya kantor',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('statuspotongbiayakantor_nama')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statuspotongbiayakantor_nama'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                status potong biaya kantor
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statuspotongbiayakantor_nama' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statuspotongbiayakantor_nama' &&
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
                selectedValue={filters.filters.statuspotongbiayakantor_nama}
                onChange={(value) =>
                  handleFilterInputChange('statuspotongbiayakantor_nama', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.statuspotongbiayakantor_memo
            ? JSON.parse(props.row.statuspotongbiayakantor_memo)
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
        key: 'statusaktif',
        name: 'status aktif',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
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
      }
    ];
  }, [filters, rows, filters.filters]);

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

  const handleEditMarketingDetail = async () => {
    try {
      if (selectedRow !== null) {
        const rowData = rows[selectedRow];

        const result = await checkValidationEditmarketingDetailFn({
          aksi: 'EDIT',
          value: Number(rowData.id)
        });

        if (result.data.status == 'failed') {
          alert({
            title: result.data.message,
            variant: 'danger',
            submitText: 'OK'
          });
        } else {
          setPopOver(true);
        }
      }
    } catch (error) {
      console.error('Error syncing ACOS:', error);
    }
  };

  const handleClose = () => {
    setPopOver(false);
    forms.reset();
  };

  const onSubmit = async (values: MarketingDetailInput) => {
    const newOrder = await createMarketingDetail(
      {
        ...values,
        marketingdetail: values.marketingdetail.map((detail: any) => ({
          ...detail,
          id: 0
        })),
        ...filters
      },
      {
        onSuccess: (data) => {
          if (data?.id) {
            clearError();
            forms.reset();
            setPopOver(false);
          }
        }
      }
    );

    if (newOrder !== undefined && newOrder !== null) {
    }
    return;
  };

  const onColumnResize = (index: number, width: number) => {
    const columnKey = columns[columnsOrder[index]].key; // 1) Dapatkan key kolom yang di-resize
    const newWidthMap = { ...columnsWidth, [columnKey]: width }; // 2) Update state width seketika (biar kolom langsung responsif)
    setColumnsWidth(newWidthMap);

    if (resizeDebounceTimeout.current) {
      // 3) Bersihkan timeout sebelumnya agar tidak menumpuk
      clearTimeout(resizeDebounceTimeout.current);
    }
    // 4) Set ulang timer: hanya ketika 300ms sejak resize terakhir berlalu, saveGridConfig akan dipanggil
    resizeDebounceTimeout.current = setTimeout(() => {
      saveGridConfig(
        user.id,
        'GridMarketingProsesFee',
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
        'GridMarketingProsesFee',
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

  async function handleKeyDown(
    args: CellKeyDownArgs<MarketingProsesFee>,
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
      // } else if (event.key === 'ArrowRight') {
      //   setSelectedCol((prev) => {
      //     return Math.min(prev + 1, columns.length - 1);
      //   });
      // } else if (event.key === 'ArrowLeft') {
      //   setSelectedCol((prev) => {
      //     return Math.max(prev - 1, 0);
      //   });
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
    }
  }

  function rowKeyGetter(row: MarketingProsesFee) {
    return Number(row.id);
  }

  function getRowClass(row: MarketingProsesFee) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function handleCellClick(args: CellClickArgs<MarketingProsesFee>) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    const foundRow = rows.find((r) => r.id === clickedRow?.id);
    if (rowIndex !== -1 && foundRow) {
      setSelectedRow(rowIndex);
      dispatch(setDetailData(foundRow));
    }
  }

  useEffect(() => {
    loadGridConfig(
      user.id,
      'GridMarketingProsesFee',
      columns,
      setColumnsOrder,
      setColumnsWidth
    ); // useEffect untuk trigger grid yg kesipan di config kalo ada
  }, []);

  useEffect(() => {
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (allDatamarketingProsesFee) {
      const formattedRows = allDatamarketingProsesFee?.data?.map(
        (item: any) => ({
          id: item.id,
          marketing_id: item.marketing_id,
          marketing_nama: item.marketing_nama,
          jenisprosesfee_id: item.jenisprosesfee_id,
          jenisprosesfee_nama: item.jenisprosesfee_nama,
          statuspotongbiayakantor: item.statuspotongbiayakantor,
          statuspotongbiayakantor_nama: item.statuspotongbiayakantor_nama,
          statusaktif: item.statusaktif,
          statusaktif_nama: item.statusaktif_nama,
          memo: item.memo
        })
      );

      setRows(formattedRows);
    } else if (!headerData?.id) {
      setRows([]);
    }
  }, [allDatamarketingProsesFee, headerData?.id]);

  useEffect(() => {
    if (gridRef.current && rows.length > 0) {
      setSelectedRow(0);

      gridRef.current.selectCell({ rowIdx: 0, idx: 1 });
      dispatch(setDetailData(rows[0]));
    }
  }, [rows]);

  useEffect(() => {
    if (rows.length > 0 && selectedRow !== null) {
      const selectedRowData = rows[selectedRow];
      dispatch(setDetailData(selectedRowData)); // Pastikan data sudah benar
    } else {
      dispatch(setDetailData({}));
    }
  }, [rows, selectedRow, dispatch]);

  useEffect(() => {
    const headerCells = document.querySelectorAll('.rdg-header-row .rdg-cell');
    headerCells.forEach((cell) => {
      cell.setAttribute('tabindex', '-1');
    });
  }, []);

  useEffect(() => {
    if (headerData) {
      refetch();
    }
  }, [headerData]);

  useEffect(() => {
    if (activeTab === 'marketingprosesfee') {
      refetch();
    }
  }, [activeTab, refetch]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // forms.reset(); // Reset the form when the Escape key is pressed
        // setMode(''); // Reset the mode to empty
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
    if (selectedRow !== null && rows.length > 0) {
      const row = rows[selectedRow];

      forms.setValue(
        'marketing_id',
        row?.marketing_id ? Number(row.marketing_id) : 0
      );
      forms.setValue(
        'marketing_nama',
        row?.marketing_nama ? row.marketing_nama : ''
      );
      forms.setValue('marketingprosesfee_id', row?.id ? Number(row.id) : 0);
      forms.setValue('jenisprosesfee_nama', row?.jenisprosesfee_nama || '');
      forms.setValue(
        'statuspotongbiayakantor_nama',
        row?.statuspotongbiayakantor_nama || ''
      );
      forms.setValue('statusaktif_nama', row?.statusaktif_nama || '');
      forms.setValue('marketingdetail', []);
    }
  }, [popOver, forms, selectedRow, rows]);

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
            <DraggableColumn
              defaultColumns={columns}
              saveColumns={finalColumns}
              userId={user.id}
              gridName="GridMarketingProsesFee"
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
          renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
        />

        <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2">
          <ActionButton
            customActions={[
              {
                label: 'EDIT MARKETING DETAIL',
                icon: <FaPencil />,
                className: 'bg-cyan-500 hover:bg-cyan-700',
                onClick: () => handleEditMarketingDetail()
              }
            ]}
          />
          {isLoadingMarketingProsesFee ? <LoadRowsRenderer /> : null}
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
                    'GridMarketingProsesFee',
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
      <FormMarketingDetail
        forms={forms}
        popOver={popOver}
        setPopOver={setPopOver}
        handleClose={handleClose}
        onSubmit={forms.handleSubmit(onSubmit)}
      />
    </div>
  );
};

export default GridMarketingProsesFee;
