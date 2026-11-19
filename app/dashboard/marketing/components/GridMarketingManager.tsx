'use client';

import Image from 'next/image';
import { debounce } from 'lodash';
import 'react-data-grid/lib/styles.scss';
import { useSelector } from 'react-redux';
import IcClose from '@/public/image/x.svg';
import { RootState } from '@/lib/store/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CellKeyDownArgs } from 'react-data-grid';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import FilterInput from '@/components/custom-ui/FilterInput';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import DataGrid, { Column, DataGridHandle } from 'react-data-grid';
import { FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import { useGetMarketingManager } from '@/lib/server/useMarketingHeader';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  filterMarketingManager,
  MarketingManager
} from '@/lib/types/marketingheader.type';
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
  filters: typeof filterMarketingManager;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridMarketingManager = ({ activeTab }: GridProps) => {
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
  const [inputValue, setInputValue] = useState<string>('');
  const [rows, setRows] = useState<MarketingManager[]>([]);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
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
    filters: filterMarketingManager,
    sortBy: 'managermarketing',
    sortDirection: 'asc'
  });

  const {
    data: allDatamarketingManager,
    isLoading: isLoadingMarketingManager,
    refetch
  } = useGetMarketingManager(headerData?.id ?? 0, activeTab, '', {
    ...filters,
    page: 1
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelPreviousRequest(abortControllerRef);
    const searchValue = e.target.value;
    setInputValue(searchValue);
    setFilters((prev) => ({
      ...prev,
      filters: filterMarketingManager,
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
    setRows([]);
  };

  const columns = useMemo((): Column<MarketingManager>[] => {
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
                    managermarketing_nama: '',
                    tglapproval: '',
                    statusapproval_nama: '',
                    userapproval: '',
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
        width: 200,
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
        key: 'managermarketing',
        name: 'manager marketing',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('managermarketing')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'managermarketing'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Manager Marketing
              </p>
              <div className="ml-2">
                {filters.sortBy === 'managermarketing' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'managermarketing' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="managermarketing"
                value={filters.filters.managermarketing_nama || ''}
                onChange={(value) =>
                  handleFilterInputChange('managermarketing_nama', value)
                }
                onClear={() => handleClearFilter('managermarketing_nama')}
                inputRef={(el) => {
                  inputColRefs.current['managermarketing'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.managermarketing_nama || '';
          const cellValue = props.row.managermarketing_nama || '';
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
        key: 'tglapproval',
        name: 'tgl approval',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('tglapproval')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tglapproval' ? 'font-bold' : 'font-normal'
                }`}
              >
                tgl approval
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tglapproval' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tglapproval' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tglapproval"
                value={filters.filters.tglapproval || ''}
                onChange={(value) =>
                  handleFilterInputChange('tglapproval', value)
                }
                onClear={() => handleClearFilter('tglapproval')}
                inputRef={(el) => {
                  inputColRefs.current['tglapproval'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tglapproval || '';
          const cellValue = props.row.tglapproval || '';
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
        key: 'statusapproval',
        name: 'status approval',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
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
                status approval
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
                selectedValue={filters.filters.statusapproval_nama}
                onChange={(value) =>
                  handleFilterInputChange('statusapproval_nama', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const approvalmemo = props.row.approvalmemo
            ? JSON.parse(props.row.approvalmemo)
            : null;
          if (approvalmemo) {
            return (
              <div className="flex h-full w-full items-center justify-center py-1">
                <div
                  className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
                  style={{
                    backgroundColor: approvalmemo.WARNA,
                    color: approvalmemo.WARNATULISAN,
                    padding: '2px 6px',
                    borderRadius: '2px',
                    textAlign: 'left',
                    fontWeight: '600'
                  }}
                >
                  <p style={{ fontSize: '13px' }}>{approvalmemo.SINGKATAN}</p>
                </div>
              </div>
            );
          }
          return <div className="text-xs text-gray-500"></div>;
        }
      },
      {
        key: 'userapproval',
        name: 'user approval',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('userapproval')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'userapproval'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                User Approval
              </p>
              <div className="ml-2">
                {filters.sortBy === 'userapproval' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'userapproval' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="userapproval"
                value={filters.filters.userapproval || ''}
                onChange={(value) =>
                  handleFilterInputChange('userapproval', value)
                }
                onClear={() => handleClearFilter('userapproval')}
                inputRef={(el) => {
                  inputColRefs.current['userapproval'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.userapproval || '';
          const cellValue = props.row.userapproval || '';
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
                STATUS AKTIF
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
        'GridMarketingManager',
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
        'GridMarketingManager',
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

  function handleCellClick(args: { row: MarketingManager }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
    }
  }

  async function handleKeyDown(
    args: CellKeyDownArgs<MarketingManager>,
    event: React.KeyboardEvent
  ) {
    if (event.key === 'ArrowUp' && args.rowIdx === 0) {
      event.preventDefault();
    }
  }

  function getRowClass(row: MarketingManager) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: MarketingManager) {
    return row.id;
  }

  useEffect(() => {
    loadGridConfig(
      user.id,
      'GridMarketingManager',
      columns,
      setColumnsOrder,
      setColumnsWidth
    );
  }, []);

  useEffect(() => {
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (allDatamarketingManager) {
      const formattedRows = allDatamarketingManager?.data?.map((item: any) => ({
        id: item.id,
        marketing_id: item.marketing_id,
        marketing_nama: item.marketing_nama,
        managermarketing_id: item.managermarketing_id,
        managermarketing_nama: item.managermarketing_nama,
        tglapproval: item.tglapproval,
        statusapproval: item.statusapproval,
        statusapproval_nama: item.statusapproval_nama,
        userapproval: item.userapproval,
        statusaktif: item.statusaktif,
        statusaktifManager_nama: item.statusaktif_nama,
        memo: item.memo,
        approvalmemo: item.approvalmemo
      }));

      setRows(formattedRows);
    } else if (!headerData?.id) {
      setRows([]);
    }
  }, [allDatamarketingManager, headerData?.id]);

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
    if (activeTab === 'marketingmanager') {
      refetch();
    }
  }, [activeTab, refetch]);

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
              gridName="GridMarketingManager"
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
          onColumnResize={onColumnResize}
          onColumnsReorder={onColumnsReorder}
          rows={rows}
          headerRowHeight={70}
          onCellKeyDown={handleKeyDown}
          rowHeight={30}
          renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
          className={`${isDark ? 'rdg-dark' : 'rdg-light'} fill-grid`}
          enableVirtualization={false}
          rowKeyGetter={rowKeyGetter}
          rowClass={getRowClass}
          onCellClick={handleCellClick}
          onSelectedCellChange={(args) => {
            handleCellClick({ row: args.row });
          }}
        />

        <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2">
          {isLoadingMarketingManager ? <LoadRowsRenderer /> : null}

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
                    'GridMarketingManager',
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

export default GridMarketingManager;
