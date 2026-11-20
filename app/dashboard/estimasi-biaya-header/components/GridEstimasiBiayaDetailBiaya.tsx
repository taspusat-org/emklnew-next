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
import DataGrid, { Column, DataGridHandle } from 'react-data-grid';
import { FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cancelPreviousRequest,
  formatCurrency,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import {
  EstimasiBiayaDetailBiaya,
  filterEstimasiBiayaDetailBiaya
} from '@/lib/types/estimasibiayaheader.type';
import { useGetEstimasiBiayaDetailBiaya } from '@/lib/server/useEstimasiBiayaHeader';
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
  filters: typeof filterEstimasiBiayaDetailBiaya;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridEstimasiBiayaDetailBiaya = ({ activeTab }: GridProps) => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const [isFilteringRows, setIsFilteringRows] = useState(false);
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
  const [rows, setRows] = useState<EstimasiBiayaDetailBiaya[]>([]);
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
    filters: filterEstimasiBiayaDetailBiaya,
    sortBy: 'nama',
    sortDirection: 'asc'
  });
  // const [prevFilters, setPrevFilters] = useState<Filter>(filters);

  const {
    data: allDataEstimasiBiayaDetailBiaya,
    isLoading: isLoadingEstimasiBiayaDetailBiaya,
    refetch
  } = useGetEstimasiBiayaDetailBiaya(headerData?.id ?? 0, activeTab, '', {
    ...filters,
    page: 1
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelPreviousRequest(abortControllerRef);
    const searchValue = e.target.value;
    setInputValue(searchValue);
    setFilters((prev) => ({
      ...prev,
      filters: filterEstimasiBiayaDetailBiaya,
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
      setTimeout(() => {
        setSelectedRow(0);
        gridRef?.current?.selectCell({ rowIdx: 0, idx: 1 });
      }, 400);
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

  const columns = useMemo((): Column<EstimasiBiayaDetailBiaya>[] => {
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
                  filters: filterEstimasiBiayaDetailBiaya
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
                no bukti
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
        key: 'link',
        name: 'link',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="LINK HARGA TRUCKING"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              // className="flex h-full w-full cursor-pointer flex-col justify-center px-2"
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('link_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'link_text' ? 'font-bold' : 'font-normal'
                }`}
              >
                LINK HARGA TRUCKING
              </p>
              <div className="ml-2">
                {filters.sortBy === 'link_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'link_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="link"
                value={filters.filters.link_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('link_text', value)
                }
                onClear={() => handleClearFilter('link_text')}
                inputRef={(el) => {
                  inputColRefs.current['link'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.link_text || '';
          const cellValue = props.row.link_nama || '';
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
        key: 'biayaemkl',
        name: 'biaya emkl',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="NAMA BIAYAEMKL"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('biayaemkl_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'biayaemkl_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                nama biayaemkl
              </p>
              <div className="ml-2">
                {filters.sortBy === 'biayaemkl_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'biayaemkl_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="biayaemkl"
                value={filters.filters.biayaemkl_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('biayaemkl_text', value)
                }
                onClear={() => handleClearFilter('biayaemkl_text')}
                inputRef={(el) => {
                  inputColRefs.current['biayaemkl'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.biayaemkl_text || '';
          const cellValue = props.row.biayaemkl_nama || '';
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
        key: 'nominal',
        name: 'nominal',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="NOMINAL"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nominal')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nominal' ? 'font-bold' : 'font-normal'
                }`}
              >
                nominal
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nominal' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nominal' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nominal"
                value={filters.filters.nominal || ''}
                onChange={(value) => handleFilterInputChange('nominal', value)}
                onClear={() => handleClearFilter('nominal')}
                inputRef={(el) => {
                  inputColRefs.current['nominal'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nominal || '';
          const cellValue =
            props.row.nominal != null && props.row.nominal !== ''
              ? formatCurrency(props.row.nominal)
              : '';

          return (
            <div
              title={cellValue}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'nilaiasuransi',
        name: 'nilai asuransi',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="NILAI ASURANSI"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nilaiasuransi')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nilaiasuransi'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                nilai asuransi
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nilaiasuransi' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nilaiasuransi' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nilaiasuransi"
                value={filters.filters.nilaiasuransi || ''}
                onChange={(value) =>
                  handleFilterInputChange('nilaiasuransi', value)
                }
                onClear={() => handleClearFilter('nilaiasuransi')}
                inputRef={(el) => {
                  inputColRefs.current['nilaiasuransi'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nilaiasuransi || '';
          const cellValue =
            props.row.nilaiasuransi != null && props.row.nilaiasuransi !== ''
              ? formatCurrency(props.row.nilaiasuransi)
              : '';
          return (
            <div
              title={cellValue}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'nominaldisc',
        name: 'nominal disc',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="NOMINAL DISC"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nominaldisc')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nominaldisc' ? 'font-bold' : 'font-normal'
                }`}
              >
                nominal disc
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nominaldisc' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nominaldisc' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nominaldisc"
                value={filters.filters.nominaldisc || ''}
                onChange={(value) =>
                  handleFilterInputChange('nominaldisc', value)
                }
                onClear={() => handleClearFilter('nominaldisc')}
                inputRef={(el) => {
                  inputColRefs.current['nominaldisc'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nominaldisc || '';
          const cellValue =
            props.row.nominaldisc != null && props.row.nominaldisc !== ''
              ? formatCurrency(props.row.nominaldisc)
              : '';
          return (
            <div
              title={cellValue}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'nominalsebelumdisc',
        name: 'nominal sebelum disc',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="NOMINAL SEBELUM DISC"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nominalsebelumdisc')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nominalsebelumdisc'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                nominal sebelum disc
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nominalsebelumdisc' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nominalsebelumdisc' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nominalsebelumdisc"
                value={filters.filters.nominalsebelumdisc || ''}
                onChange={(value) =>
                  handleFilterInputChange('nominalsebelumdisc', value)
                }
                onClear={() => handleClearFilter('nominalsebelumdisc')}
                inputRef={(el) => {
                  inputColRefs.current['nominalsebelumdisc'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nominalsebelumdisc || '';
          const cellValue =
            props.row.nominalsebelumdisc != null &&
            props.row.nominalsebelumdisc !== ''
              ? formatCurrency(props.row.nominalsebelumdisc)
              : '';

          return (
            <div
              title={cellValue}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'nominaltradoluar',
        name: 'nominal trado luar',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div
            title="NOMINAL TRADO LUAR"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nominaltradoluar')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nominaltradoluar'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                nominal trado luar
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nominaltradoluar' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nominaltradoluar' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nominaltradoluar"
                value={filters.filters.nominaltradoluar || ''}
                onChange={(value) =>
                  handleFilterInputChange('nominaltradoluar', value)
                }
                onClear={() => handleClearFilter('nominaltradoluar')}
                inputRef={(el) => {
                  inputColRefs.current['nominaltradoluar'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nominaltradoluar || '';
          const cellValue =
            props.row.nominaltradoluar != null &&
            props.row.nominaltradoluar !== ''
              ? formatCurrency(props.row.nominaltradoluar)
              : '';

          return (
            <div
              title={cellValue}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
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
        'GridEstimasiBiayaDetailBiaya',
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
        'GridEstimasiBiayaDetailBiaya',
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

  function handleCellClick(args: { row: EstimasiBiayaDetailBiaya }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
    }
  }

  async function handleKeyDown(
    args: CellKeyDownArgs<EstimasiBiayaDetailBiaya>,
    event: React.KeyboardEvent
  ) {
    if (event.key === 'ArrowUp' && args.rowIdx === 0) {
      event.preventDefault();
    }
  }

  function getRowClass(row: EstimasiBiayaDetailBiaya) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: EstimasiBiayaDetailBiaya) {
    return row.id;
  }

  useEffect(() => {
    loadGridConfig(
      // useEffect untuk trigger grid yg kesipan di config kalo ada
      user.id,
      'GridEstimasiBiayaDetailBiaya',
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
    if (allDataEstimasiBiayaDetailBiaya) {
      const formattedRows = allDataEstimasiBiayaDetailBiaya?.data?.map(
        (item: any) => ({
          id: item.id,
          nobukti: item.nobukti,
          estimasibiaya_id: item.estimasibiaya_id,
          link_id: item.link_id,
          link_nama: item.link_nama,
          biayaemkl_id: item.biayaemkl_id,
          biayaemkl_nama: item.biayaemkl_nama,
          nominal: item.nominal,
          nilaiasuransi: item.nilaiasuransi,
          nominaldisc: item.nominaldisc,
          nominalsebelumdisc: item.nominalsebelumdisc,
          nominaltradoluar: item.nominaltradoluar

          // statusaktif: item.statusaktif, // Updated to match the field name
          // statusaktifOrderan_nama: item.statusaktif_nama, // Updated to match the field name
        })
      );

      setRows(formattedRows);
    } else if (!headerData?.id) {
      setRows([]);
    }
  }, [allDataEstimasiBiayaDetailBiaya, headerData?.id]);

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
    if (activeTab === 'detailbiaya') {
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
              gridName="GridEstimasiBiayaDetailBiaya"
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
          rows={rows}
          columns={finalColumns}
          onColumnResize={onColumnResize}
          onColumnsReorder={onColumnsReorder}
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
          {isLoadingEstimasiBiayaDetailBiaya ? <LoadRowsRenderer /> : null}

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
                    'GridEstimasiBiayaDetailBiaya',
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

export default GridEstimasiBiayaDetailBiaya;
