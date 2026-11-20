'use client';

import Image from 'next/image';
import { debounce } from 'lodash';
import 'react-data-grid/lib/styles.scss';
import { useSelector } from 'react-redux';
import IcClose from '@/public/image/x.svg';
import { ImSpinner2 } from 'react-icons/im';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import FilterInput from '@/components/custom-ui/FilterInput';
import { FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  cancelPreviousRequest,
  formatCurrency,
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
import {
  BiayaExtraBongkaranDetail,
  filterBiayaExtraBongkaranDetail
} from '@/lib/types/biayaextraheader.type';
import { useGetBiayaExtraBongkaranDetail } from '@/lib/server/useBiayaExtraHeader';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { useTheme } from 'next-themes';

interface Filter {
  page: number;
  limit: number;
  search: string;
  filters: typeof filterBiayaExtraBongkaranDetail;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridBiayaExtraBongkaranDetail = () => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const { user } = useSelector((state: RootState) => state.auth);
  const headerData = useSelector((state: RootState) => state.header.headerData);
  const gridRef = useRef<DataGridHandle>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [dataGridKey, setDataGridKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<BiayaExtraBongkaranDetail[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
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
    filters: filterBiayaExtraBongkaranDetail,
    sortBy: 'id',
    sortDirection: 'asc'
  });

  const {
    data: allDataDetail,
    isLoading,
    refetch
  } = useGetBiayaExtraBongkaranDetail(headerData?.id ?? 0, {
    ...filters,
    page: 1
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelPreviousRequest(abortControllerRef);
    const searchValue = e.target.value;
    setInputValue(searchValue);
    setFilters((prev) => ({
      ...prev,
      filters: filterBiayaExtraBongkaranDetail,
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
      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, [colKey]: value },
        page: 1,
        search: ''
      }));
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

  const columns = useMemo((): Column<BiayaExtraBongkaranDetail>[] => {
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
                  filters: filterBiayaExtraBongkaranDetail
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
      //   {
      //     key: 'orderanmuatan_nobukti',
      //     name: 'orderanmuatan_nobukti',
      //     headerCellClass: 'column-headers',
      //     resizable: true,
      //     draggable: true,
      //     width: 200,
      //     renderHeaderCell: (column: any) => (
      //       <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //         <div
      //           className="headers-cell h-[50%] px-8"
      //           onClick={() => handleSort('orderanmuatan_nobukti')}
      //           onContextMenu={(event) =>
      //             setContextMenu(handleContextMenu(event))
      //           }
      //         >
      //           <p
      //             className={`text-sm ${
      //               filters.sortBy === 'orderanmuatan_nobukti' ? 'font-bold' : 'font-normal'
      //             }`}
      //           >
      //             NO BUKTI ORDERAN
      //           </p>
      //           <div className="ml-2">
      //             {filters.sortBy === 'orderanmuatan_nobukti' &&
      //             filters.sortDirection === 'asc' ? (
      //               <FaSortUp className="font-bold" />
      //             ) : filters.sortBy === 'orderanmuatan_nobukti' &&
      //               filters.sortDirection === 'desc' ? (
      //               <FaSortDown className="font-bold" />
      //             ) : (
      //               <FaSort className="text-zinc-400" />
      //             )}
      //           </div>
      //         </div>

      //         <div className="relative h-[50%] w-full px-1">
      //           <FilterInput
      //             colKey="orderanmuatan_nobukti"
      //             value={filters.filters.orderanmuatan_nobukti || ''}
      //             onChange={(value) => handleFilterInputChange('orderanmuatan_nobukti', value)}
      //             onClear={() => handleClearFilter('orderanmuatan_nobukti')}
      //             inputRef={(el) => {
      //               inputColRefs.current['orderanmuatan_nobukti'] = el;
      //             }}
      //           />
      //         </div>
      //       </div>
      //     ),
      //     renderCell: (props: any) => {
      //       const columnFilter = filters.filters.orderanmuatan_nobukti || '';
      //       const cellValue = props.row.orderanmuatan_nobukti || '';
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
      //                 {highlightText(cellValue, filters.search, columnFilter)}
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{cellValue}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }
      //   },
      //   {
      //     key: 'estimasi',
      //     name: 'estimasi',
      //     headerCellClass: 'column-headers',
      //     resizable: true,
      //     draggable: true,
      //     width: 200,
      //     renderHeaderCell: (column: any) => (
      //       <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //         <div
      //           className="headers-cell h-[50%] px-8"
      //           onClick={() => handleSort('estimasi')}
      //           onContextMenu={(event) =>
      //             setContextMenu(handleContextMenu(event))
      //           }
      //         >
      //           <p
      //             className={`text-sm ${
      //               filters.sortBy === 'estimasi' ? 'font-bold' : 'font-normal'
      //             }`}
      //           >
      //             ESTIMASI
      //           </p>
      //           <div className="ml-2">
      //             {filters.sortBy === 'estimasi' &&
      //             filters.sortDirection === 'asc' ? (
      //               <FaSortUp className="font-bold" />
      //             ) : filters.sortBy === 'estimasi' &&
      //               filters.sortDirection === 'desc' ? (
      //               <FaSortDown className="font-bold" />
      //             ) : (
      //               <FaSort className="text-zinc-400" />
      //             )}
      //           </div>
      //         </div>

      //         <div className="relative h-[50%] w-full px-1">
      //           <FilterInput
      //             colKey="estimasi"
      //             value={filters.filters.estimasi || ''}
      //             onChange={(value) => handleFilterInputChange('estimasi', value)}
      //             onClear={() => handleClearFilter('estimasi')}
      //             inputRef={(el) => {
      //               inputColRefs.current['estimasi'] = el;
      //             }}
      //           />
      //         </div>
      //       </div>
      //     ),
      //     renderCell: (props: any) => {
      //       const columnFilter = filters.filters.estimasi || '';
      //       const cellValue =
      //         props.row.estimasi != null &&
      //         props.row.estimasi !== ''
      //         ? formatCurrency(props.row.estimasi)
      //         : '';
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
      //                 {highlightText(cellValue, filters.search, columnFilter)}
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{cellValue}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }
      //   },
      //   {
      //     key: 'nominal',
      //     name: 'nominal',
      //     headerCellClass: 'column-headers',
      //     resizable: true,
      //     draggable: true,
      //     width: 200,
      //     renderHeaderCell: (column: any) => (
      //       <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //         <div
      //           className="headers-cell h-[50%] px-8"
      //           onClick={() => handleSort('nominal')}
      //           onContextMenu={(event) =>
      //             setContextMenu(handleContextMenu(event))
      //           }
      //         >
      //           <p
      //             className={`text-sm ${
      //               filters.sortBy === 'nominal' ? 'font-bold' : 'font-normal'
      //             }`}
      //           >
      //             nominal
      //           </p>
      //           <div className="ml-2">
      //             {filters.sortBy === 'nominal' &&
      //             filters.sortDirection === 'asc' ? (
      //               <FaSortUp className="font-bold" />
      //             ) : filters.sortBy === 'nominal' &&
      //               filters.sortDirection === 'desc' ? (
      //               <FaSortDown className="font-bold" />
      //             ) : (
      //               <FaSort className="text-zinc-400" />
      //             )}
      //           </div>
      //         </div>

      //         <div className="relative h-[50%] w-full px-1">
      //           <FilterInput
      //             colKey="nominal"
      //             value={filters.filters.nominal || ''}
      //             onChange={(value) => handleFilterInputChange('nominal', value)}
      //             onClear={() => handleClearFilter('nominal')}
      //             inputRef={(el) => {
      //               inputColRefs.current['nominal'] = el;
      //             }}
      //           />
      //         </div>
      //       </div>
      //     ),
      //     renderCell: (props: any) => {
      //       const columnFilter = filters.filters.nominal || '';
      //       const cellValue =
      //         props.row.nominal != null &&
      //         props.row.nominal !== ''
      //         ? formatCurrency(props.row.nominal)
      //         : '';
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
      //                 {highlightText(cellValue, filters.search, columnFilter)}
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{cellValue}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }
      //   },
      //   {
      //     key: 'statustagih',
      //     name: 'statustagih',
      //     resizable: true,
      //     draggable: true,
      //     width: 150,
      //     headerCellClass: 'column-headers',
      //     renderHeaderCell: (column: any) => (
      //       <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //         <div
      //           className="headers-cell h-[50%]"
      //           onClick={() => handleSort('statustagih_text')}
      //           onContextMenu={(event) =>
      //             setContextMenu(handleContextMenu(event))
      //           }
      //         >
      //           <p
      //             className={`text-sm ${
      //               filters.sortBy === 'statustagih_text'
      //                 ? 'font-bold'
      //                 : 'font-normal'
      //             }`}
      //           >
      //             Status Tagih
      //           </p>
      //           <div className="ml-2">
      //             {filters.sortBy === 'statustagih_text' &&
      //             filters.sortDirection === 'asc' ? (
      //               <FaSortUp className="font-bold" />
      //             ) : filters.sortBy === 'statustagih_text' &&
      //               filters.sortDirection === 'desc' ? (
      //               <FaSortDown className="font-bold" />
      //             ) : (
      //               <FaSort className="text-zinc-400" />
      //             )}
      //           </div>
      //         </div>
      //         <div className="relative h-[50%] w-full px-1">
      //           <FilterOptions
      //            columnKey={column.column.key}
      //             endpoint="parameter"
      //             value="id"
      //             label="text"
      //             filterBy={{ grp: 'STATUS NILAI', subgrp: 'STATUS NILAI' }}
      //             onChange={(value) =>
      //               handleFilterInputChange('statustagih_text', value)
      //             } // Menangani perubahan nilai di parent
      //           />
      //         </div>
      //       </div>
      //     ),
      //     renderCell: (props: any) => {
      //       const memoData = props.row.statustagih_memo
      //         ? JSON.parse(props.row.statustagih_memo)
      //         : null;
      //       if (memoData) {
      //         return (
      //           <div className="flex h-full w-full items-center justify-center py-1">
      //             <div
      //               className="m-0 flex h-full w-fit cursor-pointer items-center justify-center p-0"
      //               style={{
      //                 backgroundColor: memoData.WARNA,
      //                 color: memoData.WARNATULISAN,
      //                 padding: '2px 6px',
      //                 borderRadius: '2px',
      //                 textAlign: 'left',
      //                 fontWeight: '600'
      //               }}
      //             >
      //               <p style={{ fontSize: '13px' }}>{memoData.SINGKATAN}</p>
      //             </div>
      //           </div>
      //         );
      //       }
      //       return <div className="text-xs text-gray-500"></div>; // Tampilkan 'N/A' jika memo tidak tersedia
      //     }
      //   },
      //   {
      //     key: 'nominaltagih',
      //     name: 'nominaltagih',
      //     headerCellClass: 'column-headers',
      //     resizable: true,
      //     draggable: true,
      //     width: 200,
      //     renderHeaderCell: (column: any) => (
      //       <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //         <div
      //           className="headers-cell h-[50%] px-8"
      //           onClick={() => handleSort('nominaltagih')}
      //           onContextMenu={(event) =>
      //             setContextMenu(handleContextMenu(event))
      //           }
      //         >
      //           <p
      //             className={`text-sm ${
      //               filters.sortBy === 'nominaltagih' ? 'font-bold' : 'font-normal'
      //             }`}
      //           >
      //             nominal tagih
      //           </p>
      //           <div className="ml-2">
      //             {filters.sortBy === 'nominaltagih' &&
      //             filters.sortDirection === 'asc' ? (
      //               <FaSortUp className="font-bold" />
      //             ) : filters.sortBy === 'nominaltagih' &&
      //               filters.sortDirection === 'desc' ? (
      //               <FaSortDown className="font-bold" />
      //             ) : (
      //               <FaSort className="text-zinc-400" />
      //             )}
      //           </div>
      //         </div>

      //         <div className="relative h-[50%] w-full px-1">
      //           <FilterInput
      //             colKey="nominaltagih"
      //             value={filters.filters.nominaltagih || ''}
      //             onChange={(value) => handleFilterInputChange('nominaltagih', value)}
      //             onClear={() => handleClearFilter('nominaltagih')}
      //             inputRef={(el) => {
      //               inputColRefs.current['nominaltagih'] = el;
      //             }}
      //           />
      //         </div>
      //       </div>
      //     ),
      //     renderCell: (props: any) => {
      //       const columnFilter = filters.filters.nominaltagih || '';
      //       const cellValue =
      //         props.row.nominaltagih != null &&
      //         props.row.nominaltagih !== ''
      //         ? formatCurrency(props.row.nominaltagih)
      //         : '';
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
      //                 {highlightText(cellValue, filters.search, columnFilter)}
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{cellValue}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }
      //   },
      {
        key: 'keterangan',
        name: 'keterangan',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
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
      }
      //   {
      //     key: 'groupbiayaextra_nama',
      //     name: 'groupbiayaextra_nama',
      //     headerCellClass: 'column-headers',
      //     resizable: true,
      //     draggable: true,
      //     width: 200,
      //     renderHeaderCell: (column: any) => (
      //       <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //         <div
      //           className="headers-cell h-[50%] px-8"
      //           onClick={() => handleSort('groupbiayaextra_text')}
      //           onContextMenu={(event) =>
      //             setContextMenu(handleContextMenu(event))
      //           }
      //         >
      //           <p
      //             className={`text-sm ${
      //               filters.sortBy === 'groupbiayaextra_text'
      //                 ? 'font-bold'
      //                 : 'font-normal'
      //             }`}
      //           >
      //             GROUP BIAYA EXTRA
      //           </p>
      //           <div className="ml-2">
      //             {filters.sortBy === 'groupbiayaextra_text' &&
      //             filters.sortDirection === 'asc' ? (
      //               <FaSortUp className="font-bold" />
      //             ) : filters.sortBy === 'groupbiayaextra_text' &&
      //               filters.sortDirection === 'desc' ? (
      //               <FaSortDown className="font-bold" />
      //             ) : (
      //               <FaSort className="text-zinc-400" />
      //             )}
      //           </div>
      //         </div>

      //         <div className="relative h-[50%] w-full px-1">
      //           <FilterInput
      //             colKey="groupbiayaextra_nama"
      //             value={filters.filters.groupbiayaextra_text || ''}
      //             onChange={(value) =>
      //               handleFilterInputChange('groupbiayaextra_text', value)
      //             }
      //             onClear={() => handleClearFilter('groupbiayaextra_text')}
      //             inputRef={(el) => {
      //               inputColRefs.current['groupbiayaextra_nama'] = el;
      //             }}
      //           />
      //         </div>
      //       </div>
      //     ),
      //     renderCell: (props: any) => {
      //       const columnFilter = filters.filters.groupbiayaextra_text || '';
      //       const cellValue = props.row.groupbiayaextra_nama || '';
      //       return (
      //         <TooltipProvider delayDuration={0}>
      //           <Tooltip>
      //             <TooltipTrigger asChild>
      //               <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
      //                 {highlightText(cellValue, filters.search, columnFilter)}
      //               </div>
      //             </TooltipTrigger>
      //             <TooltipContent
      //               side="right"
      //               className="rounded-none border border-zinc-400 bg-white text-sm text-zinc-900"
      //             >
      //               <p>{cellValue}</p>
      //             </TooltipContent>
      //           </Tooltip>
      //         </TooltipProvider>
      //       );
      //     }
      //   },
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
      saveGridConfig(
        user.id,
        'GridBiayaExtraBongkaranDetail',
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
        'GridBiayaExtraBongkaranDetail',
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
    args: CellKeyDownArgs<BiayaExtraBongkaranDetail>,
    event: React.KeyboardEvent
  ) {
    if (event.key === 'ArrowUp' && args.rowIdx === 0) {
      event.preventDefault();
    }
  }

  function handleCellClick(args: { row: BiayaExtraBongkaranDetail }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
    }
  }

  function getRowClass(row: BiayaExtraBongkaranDetail) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: BiayaExtraBongkaranDetail) {
    return row.id;
  }

  useEffect(() => {
    // useEffect untuk trigger grid yg kesipan di config kalo ada
    loadGridConfig(
      user.id,
      'GridBiayaExtraBongkaranDetail',
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
        id: item.id,
        nobukti: item.nobukti,
        biayaextra_id: item.biayaextra_id,
        orderanmuatan_id: item.orderanmuatan_id,
        orderanmuatan_nobukti: item.orderanmuatan_nobukti,
        estimasi: item.estimasi,
        nominal: item.nominal,
        statustagih: item.statustagih,
        statustagih_nama: item.statustagih_nama,
        statustagih_memo: item.statustagih_memo,
        nominaltagih: item.nominaltagih,
        keterangan: item.keterangan,
        groupbiayaextra_id: item.groupbiayaextra_id,
        groupbiayaextra_nama: item.groupbiayaextra_nama
      }));

      setRows(formattedRows);
    } else if (!headerData?.id) {
      setRows([]);
    }
  }, [allDataDetail, headerData?.id]);

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
              gridName="GridBiayaExtraBongkaranDetail"
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
                    'GridBiayaExtraBongkaranDetail',
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

export default GridBiayaExtraBongkaranDetail;
