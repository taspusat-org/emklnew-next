/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import 'react-data-grid/lib/styles.scss';

import DataGrid, {
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import {
  formatCurrency,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import {
  filterJurnalUmumDetail,
  JurnalUmumDetail
} from '@/lib/types/jurnalumumheader.type';
import { useGetJurnalUmumDetail } from '@/lib/server/useJurnalUmum';
import { getJurnalUmumDetailFn } from '@/lib/apis/jurnalumumheader.api';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import IcClose from '@/public/image/x.svg';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import JsxParser from 'react-jsx-parser';
import { debounce } from 'lodash';
import FilterInput from '@/components/custom-ui/FilterInput';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { useTheme } from 'next-themes';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { useSession } from 'next-auth/react';
import { HEADER_ROW_HEIGHT, LIMIT, ROW_HEIGHT } from '@/constants/constant';

// filterJurnalUmumDetail dipakai bersama grid lain (consignee, packinglist) dan
// tidak punya key nobukti; di sini nobukti adalah filter utamanya.
const emptyDetailFilters = { ...filterJurnalUmumDetail, nobukti: '' };

interface Filter {
  page: number;
  limit: number;
  search: string;
  filters: typeof emptyDetailFilters;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridJurnalUmumDetail = ({
  activeTab,
  nobukti,
  hyperlink = true
}: {
  activeTab: string;
  nobukti?: string;
  hyperlink?: boolean;
}) => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const headerData = useSelector((state: RootState) => state.header.headerData);
  const { data: session } = useSession();

  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: LIMIT,
    filters: {
      ...emptyDetailFilters,
      nobukti: nobukti ?? headerData?.nobukti ?? ''
    },
    search: '',
    sortBy: 'nobukti',
    sortDirection: 'asc'
  });

  // ── Lazy loading + caching (pola GridPengeluaranDetail) ───────────────────
  // Grid hanya menyimpan WINDOW_SIZE halaman di memori (`visiblePages`), isinya
  // di `pageDataCache`. Halaman di luar window dibuang; halaman berikutnya
  // di-prefetch diam-diam ke `streamBufferRef` supaya saat user scroll sampai
  // ambang batas, data sudah ada dan window bergeser tanpa spinner.
  const WINDOW_SIZE = 5;
  const STREAM_BUFFER_SIZE = 5;

  const [shouldBulkFetch, setShouldBulkFetch] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5]);
  const minVisiblePage = useMemo(
    () => (visiblePages.length > 0 ? Math.min(...visiblePages) : 1),
    [visiblePages]
  );
  // Nomor baris pertama yang sedang ada di window (bukan di layar).
  const startRow = (minVisiblePage - 1) * filters.limit + 1;
  const [pageDataCache, setPageDataCache] = useState<
    Map<number, JurnalUmumDetail[]>
  >(new Map());
  const streamBufferRef = useRef<Map<number, JurnalUmumDetail[]>>(new Map());
  const prefetchingPagesRef = useRef<Set<number>>(new Set());

  const [isFetching, setIsFetching] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const scrollPositionRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollAdjustment = useRef<number>(0);
  const hasAdjustedScrollRef = useRef<boolean>(false);
  const isPageTransitionRef = useRef(false);
  const selectedRowRef = useRef<number>(0);

  // Menggeser index baris terpilih saat window bergeser, supaya baris DATA yang
  // sama tetap ter-highlight. Posisi visual dijaga oleh kompensasi scrollTop
  // (pendingScrollAdjustment), jadi jangan panggil selectCell di sini.
  const shiftSelectionForWindow = (deltaRows: number) => {
    selectedRowRef.current = Math.max(0, selectedRowRef.current + deltaRows);
  };

  const resetBufferingCache = useCallback(() => {
    setShouldBulkFetch(true);
    setCurrentPage(1);
    setPageDataCache(new Map());
    setVisiblePages([1, 2, 3, 4, 5]);
    setIsFetching(false);
    setIsTransitioning(false);
    streamBufferRef.current = new Map();
    prefetchingPagesRef.current = new Set();
    selectedRowRef.current = 0;
  }, []);

  // Bulk fetch pertama menarik WINDOW_SIZE halaman sekaligus (1 request) lalu
  // dipecah di memori; setelah itu tiap pergeseran window cuma 1 halaman.
  const effectiveLimit = shouldBulkFetch
    ? filters.limit * WINDOW_SIZE
    : filters.limit;

  const queryParams = useMemo(() => {
    const base =
      activeTab === 'jurnalumumdetail'
        ? filters
        : {
            ...filters,
            search: '',
            filters: {
              ...emptyDetailFilters,
              nobukti: nobukti ?? headerData?.nobukti ?? ''
            }
          };

    return {
      ...base,
      page: shouldBulkFetch ? 1 : currentPage,
      limit: effectiveLimit
    };
  }, [
    activeTab,
    filters,
    nobukti,
    headerData?.nobukti,
    shouldBulkFetch,
    currentPage,
    effectiveLimit
  ]);

  const { data: detail, isLoading } = useGetJurnalUmumDetail(queryParams);

  const [rows, setRows] = useState<JurnalUmumDetail[]>([]);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>('');

  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
  const [columnsWidth, setColumnsWidth] = useState<{ [key: string]: number }>(
    {}
  );
  const gridRef = useRef<DataGridHandle>(null);

  const [dataGridKey, setDataGridKey] = useState(0);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setInputValue(searchValue);
    setFilters((prev) => ({
      ...prev,
      filters: {
        ...emptyDetailFilters,
        nobukti: nobukti ?? headerData?.nobukti ?? ''
      },
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
    // Hasil pencarian = himpunan baris yang berbeda, jadi window & buffer lama
    // tidak lagi valid. Tanpa reset, halaman 2..5 hasil query LAMA masih
    // menempel di cache dan ikut tergabung ke `rows`.
    resetBufferingCache();
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
      resetBufferingCache();
    }, 300) // Bisa dikurangi jadi 250-300ms
  ).current;

  const handleFilterInputChange = useCallback(
    (colKey: string, value: string) => {
      debouncedFilterUpdate(colKey, value);
      setTimeout(() => {
        setSelectedRow(0);
        gridRef?.current?.selectCell({ rowIdx: 0, idx: 1 });
      }, 400);
    },
    []
  );

  const handleClearFilter = useCallback((colKey: string) => {
    debouncedFilterUpdate.cancel(); // Cancel pending updates

    setFilters((prev) => ({
      ...prev,
      filters: { ...prev.filters, [colKey]: '' },
      page: 1
    }));
    setRows([]);
    resetBufferingCache();
  }, []);

  const handleSort = (column: string) => {
    const originalIndex = columns.findIndex((col) => col.key === column);

    // index tampilan berdasar columnsOrder; jika belum ada reorder
    // (columnsOrder kosong), fallback ke originalIndex
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

    setRows([]);
    // Sort berubah -> urutan seluruh hasil berubah, halaman lama tidak valid.
    resetBufferingCache();
  };

  const columns = useMemo((): Column<JurnalUmumDetail>[] => {
    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 50,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
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
                  page: 1,
                  filters: {
                    ...emptyDetailFilters,
                    nobukti: nobukti ?? headerData?.nobukti ?? ''
                  }
                }),
                  setInputValue('');
                resetBufferingCache();
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
          // Nomor ABSOLUT, bukan index dalam window. `rows` hanya memuat
          // WINDOW_SIZE halaman yang sedang terlihat, jadi index lokal akan
          // mengulang dari 1 tiap kali window bergeser.
          const localIndex = rows.findIndex((row) => row.id === props.row.id);
          const absoluteNumber =
            localIndex === -1
              ? '—'
              : (minVisiblePage - 1) * filters.limit + localIndex + 1;
          return (
            <div className="flex h-full w-full cursor-pointer items-center justify-center text-sm">
              {absoluteNumber}
            </div>
          );
        }
      },
      {
        key: 'nobukti',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        name: 'NO BUKTI',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[48%] px-8"
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
          </div>
        ),
        renderCell: (props: any) => {
          const value = props.row.nobukti;
          const HighlightWrapper = () => {
            return highlightText(value, filters.search);
          };
          return (
            <div
              title={value}
              className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs"
            >
              {hyperlink ? (
                <JsxParser
                  components={{ HighlightWrapper }}
                  jsx={props.row.link}
                  renderInWrapper={false}
                />
              ) : (
                value
              )}
            </div>
          );
        }
      },
      {
        key: 'tglbukti',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        name: 'TGL BUKTI',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
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
                TANGGAL BUKTI
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
              <FilterInput
                colKey="tglbukti"
                value={filters.filters.tglbukti || ''}
                onChange={(value) => handleFilterInputChange('tglbukti', value)}
                onClear={() => handleClearFilter('tglbukti')}
                inputRef={(el) => {
                  inputColRefs.current['tglbukti'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tglbukti || '';
          const cellValue = props.row.tglbukti || '';
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
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        name: 'keterangan',
        renderHeaderCell: () => (
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
        key: 'coa_nama',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        name: 'coa',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('coa_nama')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'coa_nama' ? 'font-bold' : 'font-normal'
                }`}
              >
                Coa
              </p>
              <div className="ml-2">
                {filters.sortBy === 'coa_nama' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'coa_nama' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="coa_nama"
                value={filters.filters.coa_nama || ''}
                onChange={(value) => handleFilterInputChange('coa_nama', value)}
                onClear={() => handleClearFilter('coa_nama')}
                inputRef={(el) => {
                  inputColRefs.current['coa_nama'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.coa_nama || '';
          const cellValue = props.row.coa_nama || '';
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
        key: 'nominaldebet',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        name: 'nominal debet',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nominaldebet')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nominaldebet'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Nominal Debet
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nominaldebet' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nominaldebet' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nominaldebet"
                value={filters.filters.nominaldebet || ''}
                onChange={(value) =>
                  handleFilterInputChange('nominaldebet', value)
                }
                onClear={() => handleClearFilter('nominaldebet')}
                inputRef={(el) => {
                  inputColRefs.current['nominaldebet'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nominaldebet || '';
          const cellValue =
            props.row.nominaldebet != null
              ? formatCurrency(props.row.nominaldebet)
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
        key: 'nominalkredit',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        name: 'nominal kredit',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nominalkredit')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nominalkredit'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Nominal Kredit
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nominalkredit' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nominalkredit' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nominalkredit"
                value={filters.filters.nominalkredit || ''}
                onChange={(value) =>
                  handleFilterInputChange('nominalkredit', value)
                }
                onClear={() => handleClearFilter('nominalkredit')}
                inputRef={(el) => {
                  inputColRefs.current['nominalkredit'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nominalkredit || '';
          const cellValue =
            props.row.nominalkredit != null
              ? formatCurrency(props.row.nominalkredit)
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
        key: 'modifiedby',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        name: 'modified by',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
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
        key: 'created_at',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        name: 'Created At',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
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
        key: 'updated_at',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        name: 'Updated At',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
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
  }, [rows, filters, minVisiblePage]);

  function getRowClass(row: JurnalUmumDetail) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }
  function rowKeyGetter(row: JurnalUmumDetail) {
    return row.id;
  }

  function handleCellClick(args: { row: JurnalUmumDetail }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
      // Ref ikut disinkronkan: dia yang jadi acuan saat window bergeser.
      selectedRowRef.current = rowIndex;
    }
  }

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
        String(session?.user?.id),
        'GridJurnalUmumDetail',
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
        String(session?.user?.id),
        'GridJurnalUmumDetail',
        [...newOrder],
        columnsWidth
      );
      return newOrder;
    });
  };

  const handleClearInput = () => {
    setFilters((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        nobukti: nobukti ?? headerData?.nobukti ?? ''
      },
      search: '',
      page: 1
    }));
    setInputValue('');
    resetBufferingCache();
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(event.target as Node)
    ) {
      setContextMenu(null);
    }
  };

  const mapDetailRows = useCallback(
    (data: any[] | undefined | null): JurnalUmumDetail[] =>
      (data ?? []).map((item: any) => ({
        id: item.id,
        jurnalumum_id: item.jurnalumum_id,
        nobukti: item.nobukti,
        tglbukti: item.tglbukti,
        coa: item.coa,
        coa_nama: item.coa_nama,
        keterangan: item.keterangan,
        keterangancoa: item.keterangancoa,
        nominal: item.nominal,
        nominaldebet: item.nominaldebet,
        nominalkredit: item.nominalkredit,
        info: item.info,
        modifiedby: item.modifiedby,
        created_at: item.created_at,
        updated_at: item.updated_at,
        link: item.link,
        keteranganapproval: item.keteranganapproval ?? '',
        tglapproval: item.tglapproval ?? '',
        statusapproval: item.statusapproval ?? '',
        keterangancetak: item.keterangancetak ?? '',
        createdby: item.createdby ?? '',
        updatedby: item.updatedby ?? '',
        tglcetak: item.tglcetak ?? '',
        statuscetak: item.statuscetak ?? ''
      })),
    []
  );

  // Tarik halaman-halaman berikutnya diam-diam ke streamBuffer. Saat window
  // nanti bergeser ke salah satunya, datanya sudah ada -> tidak ada spinner &
  // tidak ada network latency di jalur scroll.
  const prefetchPages = useCallback(
    async (
      pagesToFetch: number[],
      existingCache?: Map<number, JurnalUmumDetail[]>,
      knownTotalPages?: number
    ) => {
      const cacheToCheck = existingCache ?? pageDataCache;
      const effectiveTotalPages = knownTotalPages ?? totalPages;

      const validPages = pagesToFetch.filter(
        (p) =>
          p >= 1 &&
          p <= effectiveTotalPages &&
          !streamBufferRef.current.has(p) &&
          !cacheToCheck.has(p) &&
          !prefetchingPagesRef.current.has(p)
      );

      if (validPages.length === 0) return;

      validPages.forEach((p) => prefetchingPagesRef.current.add(p));

      await Promise.allSettled(
        validPages.map(async (pageNum) => {
          try {
            const data = await getJurnalUmumDetailFn({
              ...queryParams,
              page: pageNum,
              limit: filters.limit
            });

            if (data?.data && data.data.length > 0) {
              streamBufferRef.current = new Map(streamBufferRef.current);
              streamBufferRef.current.set(pageNum, mapDetailRows(data.data));
            }
          } catch (err) {
            // Silent fail — prefetch gagal bukan error yang perlu dilihat user;
            // window tetap bisa bergeser lewat jalur fetch normal.
            console.warn(
              `[StreamBuffer] Prefetch detail page ${pageNum} gagal:`,
              err
            );
          } finally {
            prefetchingPagesRef.current.delete(pageNum);
          }
        })
      );
    },
    [queryParams, filters.limit, totalPages, pageDataCache, mapDetailRows]
  );

  async function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (isLoading || rows.length === 0 || isTransitioning || isFetching) return;

    const { currentTarget } = event;
    const scrollTop = currentTarget.scrollTop;
    const clientHeight = currentTarget.clientHeight;

    const hasScrolled = Math.abs(scrollTop - lastScrollTopRef.current) > 5;
    if (!hasScrolled) return;

    lastScrollTopRef.current = scrollTop;
    isScrollingRef.current = true;

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 150);

    scrollPositionRef.current = scrollTop;
    scrollContainerRef.current = currentTarget;

    const firstVisibleRow = Math.floor(scrollTop / ROW_HEIGHT);
    const lastVisibleRow = Math.floor((scrollTop + clientHeight) / ROW_HEIGHT);

    const THRESHOLD_ROWS = 50;

    // SCROLL KE BAWAH
    if (rows.length - lastVisibleRow <= THRESHOLD_ROWS) {
      const nextPage = Math.max(...visiblePages) + 1;

      if (nextPage <= totalPages && !isFetching && isScrollingRef.current) {
        if (streamBufferRef.current.has(nextPage)) {
          // Buffer hit — geser window langsung tanpa request.
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;

          const bufferedData = streamBufferRef.current.get(nextPage)!;

          setPageDataCache((prev) => {
            const updated = new Map(prev);
            updated.set(nextPage, bufferedData);
            return updated;
          });

          streamBufferRef.current = new Map(streamBufferRef.current);
          streamBufferRef.current.delete(nextPage);

          isPageTransitionRef.current = true;
          pendingScrollAdjustment.current = -(filters.limit * ROW_HEIGHT);
          shiftSelectionForWindow(-filters.limit);
          setVisiblePages((prevVisible) => {
            const removedPage = prevVisible[0];
            const newPages = [...prevVisible.slice(1), nextPage];

            setPageDataCache((prev) => {
              const updated = new Map(prev);
              updated.delete(removedPage);
              return updated;
            });

            return newPages;
          });

          setTimeout(() => {
            setIsTransitioning(false);
            setIsFetching(false);
          }, 50);

          prefetchPages(
            Array.from(
              { length: STREAM_BUFFER_SIZE },
              (_, i) => nextPage + 1 + i
            )
          );
        } else if (!pageDataCache.has(nextPage)) {
          // Buffer miss — fallback ke fetch normal (effect #2 yang merakit).
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;
          setCurrentPage(nextPage);
        }
      }
    }

    // SCROLL KE ATAS
    if (firstVisibleRow <= THRESHOLD_ROWS) {
      const prevPage = Math.min(...visiblePages) - 1;

      if (prevPage >= 1 && !isFetching && isScrollingRef.current) {
        if (streamBufferRef.current.has(prevPage)) {
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;

          const bufferedData = streamBufferRef.current.get(prevPage)!;

          setPageDataCache((prev) => {
            const updated = new Map(prev);
            updated.set(prevPage, bufferedData);
            return updated;
          });

          streamBufferRef.current = new Map(streamBufferRef.current);
          streamBufferRef.current.delete(prevPage);

          isPageTransitionRef.current = true;
          pendingScrollAdjustment.current = filters.limit * ROW_HEIGHT;
          shiftSelectionForWindow(filters.limit);
          setVisiblePages((prevVisible) => {
            const removedPage = prevVisible[prevVisible.length - 1];
            const newPages = [
              prevPage,
              ...prevVisible.slice(0, WINDOW_SIZE - 1)
            ];

            setPageDataCache((prev) => {
              const updated = new Map(prev);
              updated.delete(removedPage);
              return updated;
            });

            return newPages;
          });

          setTimeout(() => {
            setIsTransitioning(false);
            setIsFetching(false);
          }, 50);

          prefetchPages(
            Array.from(
              { length: STREAM_BUFFER_SIZE },
              (_, i) => prevPage - 1 - i
            ).filter((p) => p >= 1)
          );
        } else if (!pageDataCache.has(prevPage)) {
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;
          // Reset ke 0 dulu supaya setCurrentPage(prevPage) tetap memicu effect
          // walau prevPage kebetulan sama dengan currentPage yang basi.
          setCurrentPage(0);
          setTimeout(() => setCurrentPage(prevPage), 0);
        }
      }
    }
  }

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
    if (!session?.user?.id) return;
    loadGridConfig(
      String(session?.user?.id),
      'GridJurnalUmumDetail',
      columns,
      setColumnsOrder,
      setColumnsWidth
    );
  }, [session]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      filters: {
        ...emptyDetailFilters,
        nobukti: nobukti ?? headerData?.nobukti ?? ''
      }
    }));
  }, [headerData?.nobukti, nobukti]);

  useEffect(() => {
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ── 1. Bulk fetch awal ────────────────────────────────────────────────────
  // Request pertama menarik WINDOW_SIZE halaman sekaligus lalu dipecah di
  // memori jadi cache per-halaman. Satu round-trip untuk mengisi seluruh window.
  useEffect(() => {
    if (!shouldBulkFetch || !detail) return;

    const bulkData = mapDetailRows(detail.data);

    const newCache = new Map<number, JurnalUmumDetail[]>();
    for (let i = 0; i < WINDOW_SIZE; i++) {
      const pageNum = i + 1;
      const pageData = bulkData.slice(
        i * filters.limit,
        i * filters.limit + filters.limit
      );
      if (pageData.length > 0) newCache.set(pageNum, pageData);
    }

    setPageDataCache(newCache);
    setVisiblePages(Array.from({ length: WINDOW_SIZE }, (_, i) => i + 1));

    const totalItems = detail.pagination?.totalItems ?? bulkData.length;
    // pagination.totalPages dari backend dihitung memakai limit bulk
    // (limit * WINDOW_SIZE), jadi TIDAK bisa dipakai langsung — hitung ulang
    // dengan limit per-halaman yang sebenarnya.
    const totalPgs = Math.max(1, Math.ceil(totalItems / filters.limit));

    setTotalPages(totalPgs);
    setShouldBulkFetch(false);
    setIsFetching(false);

    if (bulkData.length === 0) {
      setRows([]);
      return;
    }

    const initialPrefetch = Array.from(
      { length: STREAM_BUFFER_SIZE },
      (_, i) => WINDOW_SIZE + 1 + i
    ).filter((p) => p <= totalPgs);

    if (initialPrefetch.length > 0) {
      prefetchPages(initialPrefetch, newCache, totalPgs);
    }
  }, [detail, shouldBulkFetch, filters.limit]);

  // ── 2. Fetch per-halaman saat window bergeser (buffer miss) ───────────────
  useEffect(() => {
    if (shouldBulkFetch || !detail) return;
    // currentPage 0 = fase antara dari trik setCurrentPage(0) di handleScroll
    // (memaksa effect jalan ulang walau halaman tujuan == halaman sekarang).
    // Query untuk page 0 tidak pernah dijalankan (guard di useGetJurnalUmumDetail),
    // jadi `detail` di sini masih milik halaman lama.
    if (currentPage < 1) return;

    const newRows = mapDetailRows(detail.data);

    setPageDataCache((prevCache) => {
      const newCache = new Map(prevCache);
      newCache.set(currentPage, newRows);
      return newCache;
    });

    isPageTransitionRef.current = true;
    const maxVisible = Math.max(...visiblePages);
    const minVisible = Math.min(...visiblePages);

    if (currentPage > maxVisible && currentPage <= maxVisible + 1) {
      // SCROLL KE BAWAH: buang halaman teratas, sisipkan halaman baru di bawah.
      const removedPage = visiblePages[0];
      pendingScrollAdjustment.current = -(filters.limit * ROW_HEIGHT);
      shiftSelectionForWindow(-filters.limit);

      setPageDataCache((prev) => {
        const updated = new Map(prev);
        updated.delete(removedPage);
        return updated;
      });
      setVisiblePages((prevVisible) => [...prevVisible.slice(1), currentPage]);
    } else if (currentPage < minVisible && currentPage >= minVisible - 1) {
      // SCROLL KE ATAS: kebalikannya.
      const removedPage = visiblePages[visiblePages.length - 1];
      pendingScrollAdjustment.current = filters.limit * ROW_HEIGHT;
      shiftSelectionForWindow(filters.limit);

      setPageDataCache((prev) => {
        const updated = new Map(prev);
        updated.delete(removedPage);
        return updated;
      });
      setVisiblePages((prevVisible) => [
        currentPage,
        ...prevVisible.slice(0, WINDOW_SIZE - 1)
      ]);
    }

    if (detail.pagination?.totalPages) {
      setTotalPages(detail.pagination.totalPages);
    }

    setTimeout(() => {
      setIsTransitioning(false);
      setIsFetching(false);

      const isScrollDown = currentPage >= Math.max(...visiblePages);
      const pagesToPrefetch = isScrollDown
        ? Array.from(
            { length: STREAM_BUFFER_SIZE },
            (_, i) => currentPage + 1 + i
          ).filter((p) => p <= totalPages)
        : Array.from(
            { length: STREAM_BUFFER_SIZE },
            (_, i) => currentPage - 1 - i
          ).filter((p) => p >= 1);

      if (pagesToPrefetch.length > 0) {
        setTimeout(() => prefetchPages(pagesToPrefetch), 200);
      }
    }, 100);
  }, [detail, currentPage, shouldBulkFetch]);

  // ── 3. Row combiner: gabungkan halaman-halaman window jadi `rows` ─────────
  useEffect(() => {
    const combinedRows: JurnalUmumDetail[] = [];
    visiblePages?.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (pageData) combinedRows.push(...pageData);
    });

    if (combinedRows.length === 0) return;

    setRows(combinedRows);

    if (isPageTransitionRef.current) {
      isPageTransitionRef.current = false;
      // Commit selectedRow yang sudah digeser BERSAMAAN dengan setRows, supaya
      // highlight (getRowClass) tidak berkedip di frame antara.
      const targetRow = Math.min(
        Math.max(selectedRowRef.current, 0),
        combinedRows.length - 1
      );
      selectedRowRef.current = targetRow;
      setSelectedRow(targetRow);
    }
  }, [visiblePages, pageDataCache]);

  // ── 4. Kompensasi scroll setelah window bergeser ──────────────────────────
  // Window geser 1 halaman = `rows` bertambah/berkurang filters.limit baris di
  // salah satu ujung. Tanpa menggeser scrollTop sebesar tinggi halaman itu,
  // konten akan melompat di bawah kursor user.
  useLayoutEffect(() => {
    if (pendingScrollAdjustment.current !== 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;

      container.scrollTop += pendingScrollAdjustment.current;

      // Sinkronkan referensi supaya handleScroll tidak mengira ini scroll manual.
      scrollPositionRef.current = container.scrollTop;
      lastScrollTopRef.current = container.scrollTop;
      hasAdjustedScrollRef.current = true;

      pendingScrollAdjustment.current = 0;
    }
  }, [rows]);

  // nobukti berganti (user pindah baris header) = dataset benar-benar lain.
  // Buang seluruh window + buffer, jangan sampai detail bukti sebelumnya ikut
  // tergabung ke grid.
  useEffect(() => {
    setRows([]);
    setSelectedRow(0);
    resetBufferingCache();
  }, [filters.filters.nobukti, resetBufferingCache]);

  async function handleKeyDown(
    args: CellKeyDownArgs<JurnalUmumDetail>,
    event: React.KeyboardEvent
  ) {
    if (event.key === 'ArrowUp' && args.rowIdx === 0) {
      event.preventDefault();
    }
  }

  useEffect(() => {
    const headerCells = document.querySelectorAll('.rdg-header-row .rdg-cell');
    headerCells.forEach((cell) => {
      cell.setAttribute('tabindex', '-1');
    });
  }, []);

  useEffect(() => {
    return () => {
      debouncedFilterUpdate.cancel();
    };
  }, []);

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
              userId={String(session?.user?.id)}
              gridName="GridJurnalUmumDetail"
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
          rows={rows ?? []}
          rowClass={getRowClass}
          onSelectedCellChange={(args) => {
            handleCellClick({ row: args.row });
          }}
          rowKeyGetter={rowKeyGetter}
          headerRowHeight={HEADER_ROW_HEIGHT}
          onCellKeyDown={handleKeyDown}
          rowHeight={ROW_HEIGHT}
          onScroll={handleScroll}
          renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
          className={`${isDark ? 'rdg-dark' : 'rdg-light'} fill-grid`}
          enableVirtualization={false}
        />
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
                  String(session?.user?.id),
                  'GridJurnalUmumDetail',
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
        <div className="flex flex-row items-center justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2">
          <span className="text-xs">
            {rows.length > 0
              ? `Menampilkan ${startRow} - ${startRow + rows.length - 1} dari ${
                  detail?.pagination?.totalItems ?? rows.length
                } data`
              : ''}
          </span>
          {isLoading ? <LoadRowsRenderer /> : null}
        </div>
      </div>
    </div>
  );
};

export default GridJurnalUmumDetail;
