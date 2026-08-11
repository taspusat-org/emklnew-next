'use client';

import Image from 'next/image';
import { debounce } from 'lodash';
import 'react-data-grid/lib/styles.scss';
import IcClose from '@/public/image/x.svg';
import { RootState } from '@/lib/store/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useSelector, useDispatch } from 'react-redux';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { useGetBlDetail } from '@/lib/server/useBlHeader';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import FilterInput from '@/components/custom-ui/FilterInput';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import { setDetailData } from '@/lib/store/headerSlice/headerSlice';
import { BLDetail, filterBlDetail } from '@/lib/types/blheader.type';
import { FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cancelPreviousRequest,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import DataGrid, {
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { useTheme } from 'next-themes';

interface Filter {
  page: number;
  limit: number;
  search: string;
  filters: typeof filterBlDetail;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridBlDetail = () => {
  const dispatch = useDispatch();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const { user } = useSelector((state: RootState) => state.auth);
  const headerData = useSelector((state: RootState) => state.header.headerData);

  const gridRef = useRef<DataGridHandle>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // AbortController untuk cancel request
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const [dataGridKey, setDataGridKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [rows, setRows] = useState<BLDetail[]>([]);
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
    filters: filterBlDetail,
    sortBy: 'bl_nobukti',
    sortDirection: 'asc'
  });

  const {
    data: allDataDetail,
    isLoading,
    refetch
  } = useGetBlDetail(headerData?.id ?? 0, {
    ...filters,
    page: 1
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelPreviousRequest(abortControllerRef);
    const searchValue = e.target.value;
    setInputValue(searchValue);

    // Menunggu beberapa waktu sebelum update filter
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      // Mengupdate filter setelah debounce
      setCurrentPage(1);
      setFilters((prev) => ({
        ...prev,
        filters: filterBlDetail,
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
      setCurrentPage(1);
      setRows([]);
    }, 300); // Mengatur debounce hanya untuk update filter
  };

  const debouncedFilterUpdate = useRef(
    debounce((colKey: string, value: string) => {
      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, [colKey]: value },
        page: 1
      }));
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

  const handleClearFilter = useCallback((colKey: string) => {
    cancelPreviousRequest(abortControllerRef);
    debouncedFilterUpdate.cancel(); // Cancel pending updates

    setFilters((prev) => ({
      ...prev,
      filters: { ...prev.filters, [colKey]: '' },
      page: 1
    }));
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
    setRows([]);
  };

  const columns = useMemo((): Column<BLDetail>[] => {
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
                  filters: filterBlDetail
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
        key: 'nobukti',
        name: 'no bukti',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="NO BUKTI"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
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
                NO BUKTI
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
              <FilterInput
                colKey="nobukti"
                value={filters.filters.nobukti || ''}
                onChange={(value) => handleFilterInputChange('nobukti', value)}
                onClear={() => handleClearFilter('nobukti')}
                inputRef={(el) => {
                  inputColRefs.current['nobukti'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nobukti || '';
          const cellValue = props.row.nobukti || '';
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
        key: 'bl_nobukti',
        name: 'bl no bukti',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="NOMOR BL"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('bl_nobukti')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'bl_nobukti' ? 'font-bold' : 'font-normal'
                }`}
              >
                NOMOR BL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'bl_nobukti' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'bl_nobukti' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="bl_nobukti"
                value={filters.filters.bl_nobukti || ''}
                onChange={(value) =>
                  handleFilterInputChange('bl_nobukti', value)
                }
                onClear={() => handleClearFilter('bl_nobukti')}
                inputRef={(el) => {
                  inputColRefs.current['bl_nobukti'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.bl_nobukti || '';
          const cellValue = props.row.bl_nobukti || '';
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
        key: 'shippinginstructiondetail_nobukti',
        name: 'shipping instruction detail nobukti',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 300,
        renderHeaderCell: (column: any) => (
          <div
            title="NOMOR SHIPPING"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('shippinginstructiondetail_nobukti')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'shippinginstructiondetail_nobukti'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                NOMOR SHIPPING
              </p>
              <div className="ml-2">
                {filters.sortBy === 'shippinginstructiondetail_nobukti' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'shippinginstructiondetail_nobukti' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="shippinginstructiondetail_nobukti"
                value={filters.filters.shippinginstructiondetail_nobukti || ''}
                onChange={(value) =>
                  handleFilterInputChange(
                    'shippinginstructiondetail_nobukti',
                    value
                  )
                }
                onClear={() =>
                  handleClearFilter('shippinginstructiondetail_nobukti')
                }
                inputRef={(el) => {
                  inputColRefs.current['shippinginstructiondetail_nobukti'] =
                    el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter =
            filters.filters.shippinginstructiondetail_nobukti || '';
          const cellValue = props.row.shippinginstructiondetail_nobukti || '';
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
        key: 'asalpelabuhan',
        name: 'asal pelabuhan',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="PELABUHAN ASAL"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('asalpelabuhan')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'asalpelabuhan'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                PELABUHAN ASAL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'asalpelabuhan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'asalpelabuhan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="asalpelabuhan"
                value={filters.filters.asalpelabuhan || ''}
                onChange={(value) =>
                  handleFilterInputChange('asalpelabuhan', value)
                }
                onClear={() => handleClearFilter('asalpelabuhan')}
                inputRef={(el) => {
                  inputColRefs.current['asalpelabuhan'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.asalpelabuhan || '';
          const cellValue = props.row.asalpelabuhan || '';
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
        key: 'keterangan',
        name: 'keterangan',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="KETERANGAN"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
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
        key: 'consignee',
        name: 'consignee',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="CONSIGNEE"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('consignee')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'consignee' ? 'font-bold' : 'font-normal'
                }`}
              >
                CONSIGNEE
              </p>
              <div className="ml-2">
                {filters.sortBy === 'consignee' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'consignee' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="consignee"
                value={filters.filters.consignee || ''}
                onChange={(value) =>
                  handleFilterInputChange('consignee', value)
                }
                onClear={() => handleClearFilter('consignee')}
                inputRef={(el) => {
                  inputColRefs.current['consignee'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.consignee || '';
          const cellValue = props.row.consignee || '';
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
        key: 'shipper',
        name: 'shipper',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="SHIPPER"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('shipper')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'shipper' ? 'font-bold' : 'font-normal'
                }`}
              >
                SHIPPER
              </p>
              <div className="ml-2">
                {filters.sortBy === 'shipper' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'shipper' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="shipper"
                value={filters.filters.shipper || ''}
                onChange={(value) => handleFilterInputChange('shipper', value)}
                onClear={() => handleClearFilter('shipper')}
                inputRef={(el) => {
                  inputColRefs.current['shipper'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.shipper || '';
          const cellValue = props.row.shipper || '';
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
        key: 'comodity',
        name: 'comodity',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="COMODITY"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
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
                COMODITY
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
        key: 'notifyparty',
        name: 'notify party',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="NOTIFY PARTY"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('notifyparty')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'notifyparty' ? 'font-bold' : 'font-normal'
                }`}
              >
                NOTIFY PARTY
              </p>
              <div className="ml-2">
                {filters.sortBy === 'notifyparty' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'notifyparty' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="notifyparty"
                value={filters.filters.notifyparty || ''}
                onChange={(value) =>
                  handleFilterInputChange('notifyparty', value)
                }
                onClear={() => handleClearFilter('notifyparty')}
                inputRef={(el) => {
                  inputColRefs.current['notifyparty'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.notifyparty || '';
          const cellValue = props.row.notifyparty || '';
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
        key: 'statuspisahbl',
        name: 'status pisah bl',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 100,
        renderHeaderCell: (column: any) => (
          <div
            title="STATUS PISAH BL"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('statuspisahbl_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statuspisahbl_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                STATUS PISAH BL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statuspisahbl_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statuspisahbl_text' &&
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
                onChange={(value) =>
                  handleFilterInputChange('statuspisahbl_text', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.statuspisahbl_memo
            ? JSON.parse(props.row.statuspisahbl_memo)
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
          return <div className="text-xs text-gray-500"></div>; // Tampilkan 'N/A' jika memo tidak tersedia
        }
      },
      {
        key: 'emkllain_nama',
        name: 'emkl lain',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="NAMA EMKL"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('emkllain_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'emkllain_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                NAMA EMKL
              </p>
              <div className="ml-2">
                {filters.sortBy === 'emkllain_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'emkllain_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="emkllain_nama"
                value={filters.filters.emkllain_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('emkllain_text', value)
                }
                onClear={() => handleClearFilter('emkllain_text')}
                inputRef={(el) => {
                  inputColRefs.current['emkllain_nama'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.emkllain_text || '';
          const cellValue = props.row.emkllain_nama || '';
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
        key: 'pelayaran_nama',
        name: 'pelayaran',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="NAMA PELAYARAN"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('pelayaran_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'pelayaran_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                NAMA PELAYARAN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'pelayaran_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'pelayaran_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="pelayaran_nama"
                value={filters.filters.pelayaran_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('pelayaran_text', value)
                }
                onClear={() => handleClearFilter('pelayaran_text')}
                inputRef={(el) => {
                  inputColRefs.current['pelayaran_nama'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.pelayaran_text || '';
          const cellValue = props.row.pelayaran_nama || '';
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
  }, [rows, rows, filters.filters]);

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
      saveGridConfig(user.id, 'GridBlDetail', [...columnsOrder], newWidthMap);
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

      saveGridConfig(user.id, 'GridBlDetail', [...newOrder], columnsWidth);
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

  function handleCellClick(args: { row: BLDetail }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    const foundRow = rows.find((r) => r.id === clickedRow?.id);
    if (rowIndex !== -1 && foundRow) {
      setSelectedRow(rowIndex);
      dispatch(setDetailData(foundRow));
    }
  }

  async function handleKeyDown(
    args: CellKeyDownArgs<BLDetail>,
    event: React.KeyboardEvent
  ) {
    if (event.key === 'ArrowUp' && args.rowIdx === 0) {
      event.preventDefault();
    }
  }

  function getRowClass(row: BLDetail) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: BLDetail) {
    return row.id;
  }

  useEffect(() => {
    loadGridConfig(
      user.id,
      'GridBlDetail',
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
    if (allDataDetail) {
      const formattedRows = allDataDetail?.data?.map((item: any) => ({
        id: Number(item?.id),
        nobukti: item?.nobukti,
        bl_id: item?.bl_id,
        bl_nobukti: item?.bl_nobukti,
        shippinginstructiondetail_nobukti:
          item?.shippinginstructiondetail_nobukti,
        asalpelabuhan: item?.asalpelabuhan,
        keterangan: item?.keterangan,
        consignee: item?.consignee,
        shipper: item?.shipper,
        comodity: item?.comodity,
        notifyparty: item?.notifyparty,
        emkl_id: item?.emkl_id,
        emkllain_nama: item?.emkllain_nama,
        pelayaran_nama: item?.pelayaran_nama,
        statuspisahbl_nama: item?.statuspisahbl_nama,
        statuspisahbl_memo: item?.statuspisahbl_memo
      }));

      setRows(formattedRows);
    } else if (!headerData?.id) {
      setRows([]);
    }
  }, [allDataDetail, headerData?.id]);

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
              gridName="GridBlDetail"
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
          {isLoading ? <LoadRowsRenderer /> : null}

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
                    'GridBlDetail',
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

export default GridBlDetail;
