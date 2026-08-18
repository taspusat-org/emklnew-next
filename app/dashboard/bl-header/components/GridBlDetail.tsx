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
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
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
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import {
  getBlDetailFn,
  getBlDetailRincianFn,
  getBlRincianBiayaFn
} from '@/lib/apis/blheader.api';

const JUMLAH_KOLOM_TREE = 13;
const JUMLAH_KOLOM_TREE_RINCIAN = 5;

const WINDOW_SIZE = 5;
const STREAM_BUFFER_SIZE = 5;

const TINGGI_BARIS_DETAIL = 30;
// Boilerplate (GridShippingInstruction) memicu load berikutnya saat jarak ke
// ujung tinggal 50 baris — bukan saat mentok di dasar grid. Di sini tinggi
// baris tidak seragam (baris tree bisa mengembang), jadi ambangnya dihitung
// dalam piksel senilai 50 baris detail.
const THRESHOLD_ROWS = 50;
const THRESHOLD_PX = THRESHOLD_ROWS * TINGGI_BARIS_DETAIL;
const TINGGI_TAB_RINCIAN = 30;
const TINGGI_HEADER_RINCIAN = 26;
const TINGGI_BARIS_RINCIAN = 30;
const TINGGI_BORDER_GRID_RINCIAN = 2;
const TINGGI_PEMBUNGKUS_RINCIAN = 12;

const TINGGI_TAB_BIAYA = 26;
const TINGGI_HEADER_BIAYA = 24;
const TINGGI_BARIS_BIAYA = 28;
const TINGGI_PEMBUNGKUS_BIAYA = 10;

const tinggiBlokBiaya = (jumlahBaris: number) =>
  TINGGI_TAB_BIAYA +
  TINGGI_HEADER_BIAYA +
  Math.max(1, jumlahBaris) * TINGGI_BARIS_BIAYA +
  TINGGI_BORDER_GRID_RINCIAN +
  TINGGI_PEMBUNGKUS_BIAYA;

const MemuatRowsRenderer = ({ label }: { label: string }) => (
  <div
    className="flex h-fit w-full items-center justify-center border border-l-0 border-t-0 border-border py-1"
    style={{ textAlign: 'center', gridColumn: '1/-1' }}
  >
    <p className="text-xs italic text-gray-400">{label}</p>
  </div>
);

const headerCellTree = (label: string) => (
  <div
    className="flex h-full flex-col items-center justify-center gap-1"
    title={label.toUpperCase()}
  >
    <p className="text-xs">{label}</p>
  </div>
);

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

  const [rincianById, setRincianById] = useState<Record<string, any[]>>({});
  const [biayaByKey, setBiayaByKey] = useState<Record<string, any[]>>({});
  const [expandedDetailId, setExpandedDetailId] = useState<Set<string>>(
    new Set()
  );
  const [expandedRincianKey, setExpandedRincianKey] = useState<Set<string>>(
    new Set()
  );
  const [memuatDetailId, setMemuatDetailId] = useState<Set<string>>(new Set());
  const [memuatRincianKey, setMemuatRincianKey] = useState<Set<string>>(
    new Set()
  );

  const biayaKey = (detailId: string, rincianIdx: number) =>
    `${detailId}-${rincianIdx}`;

  const resetTreeState = useCallback(() => {
    setRincianById({});
    setBiayaByKey({});
    setExpandedDetailId(new Set());
    setExpandedRincianKey(new Set());
    setMemuatDetailId(new Set());
    setMemuatRincianKey(new Set());
  }, []);

  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: 50,
    search: '',
    filters: filterBlDetail,
    sortBy: 'bl_nobukti',
    sortDirection: 'asc'
  });

  const [shouldBulkFetch, setShouldBulkFetch] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5]);
  const [pageDataCache, setPageDataCache] = useState<Map<number, BLDetail[]>>(
    new Map()
  );
  const [isFetching, setIsFetching] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const streamBufferRef = useRef<Map<number, BLDetail[]>>(new Map());
  const prefetchingPagesRef = useRef<Set<number>>(new Set());
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTopRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<number>(0);
  const pendingScrollAdjustment = useRef<number>(0);
  const hasAdjustedScrollRef = useRef<boolean>(false);
  const isPageTransitionRef = useRef(false);
  const pendingSelectIdxRef = useRef<number>(1);
  const selectedRowRef = useRef<number>(0);
  const lastDispatchedId = useRef<string | number | null>(null);
  const pendingInitialFocusRef = useRef(true);
  // Jangkar pilihan user (lihat GridBlHeader): rincian yang tampil mengikuti
  // baris yang benar-benar dipilih, bukan rows[selectedRow] yang index-nya
  // ikut bergeser tiap window pindah saat scroll.
  const selectedRowIdRef = useRef<string | null>(null);
  const selectedRowDataRef = useRef<BLDetail | null>(null);
  const detailClearedRef = useRef(false);

  const anchorSelection = (row?: BLDetail | null) => {
    if (!row) return;
    selectedRowIdRef.current = String(row.id);
    selectedRowDataRef.current = row;
  };

  const clearSelectionAnchor = () => {
    selectedRowIdRef.current = null;
    selectedRowDataRef.current = null;
  };

  useEffect(() => {
    selectedRowRef.current = selectedRow;
  }, [selectedRow]);

  // Saat window pagination bergeser, index tiap baris di `rows` ikut bergeser
  // sebanyak jumlah baris halaman yang keluar/masuk. Geser juga selectedRowRef
  // supaya baris DATA yang sama tetap ter-highlight; commit ke state ditunda ke
  // Row Combiner agar selectedRow & rows berubah di render yang sama.
  const shiftSelectionForWindow = (deltaRows: number) => {
    selectedRowRef.current = Math.max(0, selectedRowRef.current + deltaRows);
  };

  const minVisiblePage = useMemo(
    () => (visiblePages.length > 0 ? Math.min(...visiblePages) : 1),
    [visiblePages]
  );
  const startRow = (minVisiblePage - 1) * filters.limit + 1;

  const resetBufferingCache = useCallback(() => {
    setShouldBulkFetch(true);
    setCurrentPage(1);
    setPageDataCache(new Map());
    setVisiblePages([1, 2, 3, 4, 5]);
    setIsFetching(false);
    setIsTransitioning(false);
    streamBufferRef.current = new Map();
    prefetchingPagesRef.current = new Set();
    // Window dibangun ulang dari awal: fokus balik ke baris pertama SEKALI,
    // bukan tiap kali `rows` berubah (itu yang bikin scroll meloncat ke atas).
    isPageTransitionRef.current = false;
    pendingInitialFocusRef.current = true;
    pendingScrollAdjustment.current = 0;
    selectedRowRef.current = 0;
    lastScrollTopRef.current = 0;
    clearSelectionAnchor();
  }, []);

  const effectiveLimit = shouldBulkFetch
    ? filters.limit * WINDOW_SIZE
    : filters.limit;

  const queryParams = useMemo(
    () => ({
      ...filters,
      page: shouldBulkFetch ? 1 : currentPage,
      limit: effectiveLimit
    }),
    [filters, shouldBulkFetch, currentPage, effectiveLimit]
  );

  const {
    data: allDataDetail,
    isLoading,
    refetch
  } = useGetBlDetail(headerData?.id ?? 0, queryParams);

  const toggleDetailRow = useCallback(
    async (detailId: string) => {
      const sedangTerbuka = expandedDetailId.has(detailId);

      setExpandedDetailId((prev) => {
        const next = new Set(prev);
        if (sedangTerbuka) next.delete(detailId);
        else next.add(detailId);
        return next;
      });

      if (sedangTerbuka || rincianById[detailId] || !detailId) return;

      setMemuatDetailId((prev) => new Set(prev).add(detailId));
      try {
        const res = await getBlDetailRincianFn(String(detailId), {
          search: ''
        });
        setRincianById((prev) => ({
          ...prev,
          [detailId]: res?.data ?? []
        }));
      } catch (err) {
        console.error('Gagal ambil rincian BL detail', detailId, err);
        setRincianById((prev) => ({ ...prev, [detailId]: [] }));
      } finally {
        setMemuatDetailId((prev) => {
          const next = new Set(prev);
          next.delete(detailId);
          return next;
        });
      }
    },
    [expandedDetailId, rincianById]
  );

  const toggleRincianRow = useCallback(
    async (
      rincianIdx: number,
      detailId: string,
      orderanmuatanNobukti: string
    ) => {
      const key = biayaKey(detailId, rincianIdx);
      const sedangTerbuka = expandedRincianKey.has(key);

      setExpandedRincianKey((prev) => {
        const next = new Set(prev);
        if (sedangTerbuka) next.delete(key);
        else next.add(key);
        return next;
      });

      if (sedangTerbuka || biayaByKey[key] || !detailId) return;

      setMemuatRincianKey((prev) => new Set(prev).add(key));
      try {
        const res = await getBlRincianBiayaFn(String(detailId), {
          filters: { orderanmuatan_nobukti: orderanmuatanNobukti }
        });
        setBiayaByKey((prev) => ({ ...prev, [key]: res?.data ?? [] }));
      } catch (err) {
        console.error('Gagal ambil rincian biaya BL', detailId, err);
        setBiayaByKey((prev) => ({ ...prev, [key]: [] }));
      } finally {
        setMemuatRincianKey((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [expandedRincianKey, biayaByKey]
  );

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

  const treeRows = useMemo(() => {
    const flattened: any[] = [];

    rows.forEach((row: any, idx: number) => {
      const detailId = String(row.id ?? '');

      flattened.push({
        ...row,
        isTreeType: 'detail',
        detailId,
        nomor: startRow + idx
      });

      if (!expandedDetailId.has(detailId)) return;

      const rincianFlat: any[] = [];
      (rincianById[detailId] ?? []).forEach((r: any, rincianIdx: number) => {
        rincianFlat.push({
          ...r,
          isTreeType: 'rincian',
          detailId,
          rincianIdx,
          nomor: rincianIdx + 1
        });

        const key = biayaKey(detailId, rincianIdx);
        if (!expandedRincianKey.has(key)) return;

        rincianFlat.push({
          isTreeType: 'biayaBlock',
          detailId,
          rincianIdx,
          memuat: memuatRincianKey.has(key),
          biayaRows: (biayaByKey[key] ?? []).map(
            (b: any, biayaIdx: number) => ({
              ...b,
              detailId,
              rincianIdx,
              biayaIdx,
              nomor: biayaIdx + 1
            })
          )
        });
      });

      flattened.push({
        isTreeType: 'rincianBlock',
        detailId,
        memuat: memuatDetailId.has(detailId),
        rincianRows: rincianFlat
      });
    });

    return flattened;
  }, [
    rows,
    startRow,
    rincianById,
    biayaByKey,
    expandedDetailId,
    expandedRincianKey,
    memuatDetailId,
    memuatRincianKey
  ]);

  const tinggiBarisRincian = (row: any) =>
    row.isTreeType === 'biayaBlock'
      ? tinggiBlokBiaya((row.biayaRows ?? []).length)
      : TINGGI_BARIS_RINCIAN;

  const tinggiBlokRincian = (row: any) => {
    const rincianRows: any[] = row.rincianRows ?? [];
    const tinggiIsi = rincianRows.length
      ? rincianRows.reduce(
          (total: number, r: any) => total + tinggiBarisRincian(r),
          0
        )
      : TINGGI_BARIS_RINCIAN;

    return (
      TINGGI_TAB_RINCIAN +
      TINGGI_HEADER_RINCIAN +
      tinggiIsi +
      TINGGI_BORDER_GRID_RINCIAN +
      TINGGI_PEMBUNGKUS_RINCIAN
    );
  };

  const biayaColumns = useMemo((): Column<any>[] => {
    const teks = (value: any) => (
      <div className="flex h-full w-full items-center px-1 text-xs">
        <p className="truncate" title={String(value ?? '')}>
          {String(value ?? '')}
        </p>
      </div>
    );

    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 45,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => headerCellTree('No.'),
        renderCell: (props: any) => (
          <div className="flex h-full w-full items-center justify-center text-xs">
            {props.row.nomor}
          </div>
        )
      },
      {
        key: 'biayaemkl_nama',
        name: 'biaya emkl',
        headerCellClass: 'column-headers',
        resizable: true,
        width: '1fr',
        minWidth: 200,
        renderHeaderCell: () => headerCellTree('biaya emkl'),
        renderCell: (props: any) => teks(props.row.biayaemkl_nama)
      },
      {
        key: 'nominal',
        name: 'nominal',
        headerCellClass: 'column-headers',
        resizable: true,
        width: '1fr',
        minWidth: 150,
        renderHeaderCell: () => headerCellTree('nominal'),
        renderCell: (props: any) => (
          <div className="flex h-full w-full items-center justify-end px-1 text-xs">
            {props.row.nominal ?? ''}
          </div>
        )
      },
      {
        key: 'keterangan',
        name: 'keterangan',
        headerCellClass: 'column-headers',
        resizable: true,
        width: '1fr',
        minWidth: 200,
        renderHeaderCell: () => headerCellTree('keterangan'),
        renderCell: (props: any) => teks(props.row.keterangan)
      }
    ];
  }, []);

  const rincianColumns = useMemo((): Column<any>[] => {
    const teks = (value: any) => (
      <div className="flex h-full w-full items-center px-1 text-xs">
        <p className="truncate" title={String(value ?? '')}>
          {String(value ?? '')}
        </p>
      </div>
    );

    const biayaBlock = (row: any) => {
      const biayaRows: any[] = row.biayaRows ?? [];
      const jumlahBaris = Math.max(1, biayaRows.length);

      return (
        <div className="w-full bg-background py-1 pl-8 pr-2 text-foreground">
          <div className="overflow-hidden rounded-sm border border-border">
            <div className="flex w-full flex-row justify-start border-b border-border bg-background-grid-header px-1 pt-1">
              <div className="rounded-t-sm border border-b-0 border-border bg-background px-3 py-[1px] text-[10px] font-bold uppercase text-primary">
                Rincian Biaya
              </div>
            </div>

            <div
              className="overflow-hidden bg-background text-foreground"
              style={{
                height: TINGGI_HEADER_BIAYA + jumlahBaris * TINGGI_BARIS_BIAYA
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <DataGrid
                columns={biayaColumns as any[]}
                defaultColumnOptions={{ sortable: false, resizable: true }}
                rows={biayaRows}
                rowKeyGetter={(b: any) =>
                  `${b.detailId}-${b.rincianIdx}-${b.biayaIdx}`
                }
                rowHeight={TINGGI_BARIS_BIAYA}
                headerRowHeight={TINGGI_HEADER_BIAYA}
                renderers={{
                  noRowsFallback: row.memuat ? (
                    <MemuatRowsRenderer label="Memuat rincian biaya…" />
                  ) : (
                    <EmptyRowsRenderer />
                  )
                }}
                className={`${
                  isDark ? 'rdg-dark' : 'rdg-light'
                } fill-grid text-xs`}
                enableVirtualization={false}
              />
            </div>
          </div>
        </div>
      );
    };

    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 45,
        cellClass: (row: any) =>
          row?.isTreeType === 'biayaBlock' ? 'rincian-block-cell' : undefined,
        colSpan: (args: any) =>
          args.type === 'ROW' && args.row?.isTreeType === 'biayaBlock'
            ? JUMLAH_KOLOM_TREE_RINCIAN
            : undefined,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => headerCellTree('No.'),
        renderCell: (props: any) => {
          if (props.row.isTreeType === 'biayaBlock')
            return biayaBlock(props.row);
          return (
            <div className="flex h-full w-full items-center justify-center text-xs">
              {props.row.nomor}
            </div>
          );
        }
      },
      {
        key: 'orderanmuatan_nobukti',
        name: 'job',
        headerCellClass: 'column-headers',
        resizable: true,
        width: '1fr',
        minWidth: 200,
        renderHeaderCell: () => headerCellTree('job'),
        renderCell: (props: any) => {
          const key = biayaKey(props.row.detailId, props.row.rincianIdx);
          const isExpanded = expandedRincianKey.has(key);
          const value = String(props.row.orderanmuatan_nobukti ?? '');

          return (
            <div className="flex h-full w-full items-center gap-2">
              <button
                type="button"
                aria-label={
                  isExpanded ? 'Tutup rincian biaya' : 'Buka rincian biaya'
                }
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRincianRow(
                    props.row.rincianIdx,
                    props.row.detailId,
                    value
                  );
                }}
                className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 transition-colors hover:bg-blue-200"
              >
                {isExpanded ? (
                  <FaChevronDown size={8} />
                ) : (
                  <FaChevronRight size={8} />
                )}
              </button>
              <p className="truncate text-xs" title={value}>
                {value}
              </p>
            </div>
          );
        }
      },
      {
        key: 'nocontainer',
        name: 'no container',
        headerCellClass: 'column-headers',
        resizable: true,
        width: '1fr',
        minWidth: 180,
        renderHeaderCell: () => headerCellTree('no container'),
        renderCell: (props: any) => teks(props.row.nocontainer)
      },
      {
        key: 'noseal',
        name: 'no seal',
        headerCellClass: 'column-headers',
        resizable: true,
        width: '1fr',
        minWidth: 160,
        renderHeaderCell: () => headerCellTree('no seal'),
        renderCell: (props: any) => teks(props.row.noseal)
      },
      {
        key: 'keterangan',
        name: 'keterangan',
        headerCellClass: 'column-headers',
        resizable: true,
        width: '1fr',
        minWidth: 200,
        renderHeaderCell: () => headerCellTree('keterangan'),
        renderCell: (props: any) => teks(props.row.keterangan)
      }
    ];
  }, [biayaColumns, expandedRincianKey, toggleRincianRow, isDark]);
  const columns = useMemo((): Column<BLDetail>[] => {
    const rincianBlock = (row: any) => {
      const rincianRows: any[] = row.rincianRows ?? [];
      const tinggiIsi = rincianRows.length
        ? rincianRows.reduce(
            (total: number, r: any) => total + tinggiBarisRincian(r),
            0
          )
        : TINGGI_BARIS_RINCIAN;

      return (
        <div className="w-full bg-background py-1 pl-8 pr-2 text-foreground">
          <div className="overflow-hidden rounded-sm border border-border">
            <div className="flex w-full flex-row justify-start border-b border-border bg-background-grid-header px-1 pt-1">
              <div className="rounded-t-sm border border-b-0 border-border bg-background px-3 py-[1px] text-[10px] font-bold uppercase text-primary">
                Rincian
              </div>
            </div>

            <div
              className="overflow-hidden bg-background text-foreground"
              style={{ height: TINGGI_HEADER_RINCIAN + tinggiIsi }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <DataGrid
                columns={rincianColumns as any[]}
                defaultColumnOptions={{ sortable: false, resizable: true }}
                rows={rincianRows}
                rowKeyGetter={(r: any) =>
                  r.isTreeType === 'biayaBlock'
                    ? `BB-${r.detailId}-${r.rincianIdx}`
                    : `R-${r.detailId}-${r.rincianIdx}`
                }
                rowHeight={tinggiBarisRincian}
                headerRowHeight={TINGGI_HEADER_RINCIAN}
                renderers={{
                  noRowsFallback: row.memuat ? (
                    <MemuatRowsRenderer label="Memuat rincian…" />
                  ) : (
                    <EmptyRowsRenderer />
                  )
                }}
                className={`${
                  isDark ? 'rdg-dark' : 'rdg-light'
                } fill-grid text-xs`}
                enableVirtualization={false}
              />
            </div>
          </div>
        </div>
      );
    };

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
        cellClass: (row: any) =>
          row?.isTreeType === 'rincianBlock' ? 'rincian-block-cell' : undefined,
        colSpan: (args: any) =>
          args.type === 'ROW' && args.row?.isTreeType === 'rincianBlock'
            ? JUMLAH_KOLOM_TREE
            : undefined,
        renderCell: (props: any) => {
          if (props.row.isTreeType === 'rincianBlock') {
            return rincianBlock(props.row);
          }
          return (
            <div className="flex h-full w-full cursor-pointer items-center justify-center text-sm">
              {props.row.nomor}
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
          const isExpanded = expandedDetailId.has(props.row.detailId);

          return (
            <div
              title={cellValue}
              className="m-0 flex h-full cursor-pointer items-center gap-2 p-0 text-sm"
            >
              <button
                type="button"
                aria-label={isExpanded ? 'Tutup rincian' : 'Buka rincian'}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDetailRow(props.row.detailId);
                }}
                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 transition-colors hover:bg-blue-200"
              >
                {isExpanded ? (
                  <FaChevronDown size={9} />
                ) : (
                  <FaChevronRight size={9} />
                )}
              </button>
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
  }, [
    rows,
    filters.filters,
    filters.search,
    rincianColumns,
    expandedDetailId,
    toggleDetailRow,
    isDark
  ]);

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
    // args.row bisa undefined saat grid re-render di tengah pergeseran window.
    if (!clickedRow) return;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    const foundRow = rows.find((r) => r.id === clickedRow?.id);
    if (rowIndex !== -1 && foundRow) {
      setSelectedRow(rowIndex);
      anchorSelection(foundRow);
      dispatch(setDetailData(foundRow));
      lastDispatchedId.current = foundRow.id;
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

  const tinggiHalaman = useCallback(
    (pageRows: BLDetail[] | undefined) =>
      (pageRows ?? []).reduce((total: number, row: any) => {
        const detailId = String(row?.id ?? '');
        if (!expandedDetailId.has(detailId)) return total + TINGGI_BARIS_DETAIL;

        const rincianFlat: any[] = [];
        (rincianById[detailId] ?? []).forEach((r: any, rincianIdx: number) => {
          rincianFlat.push({ isTreeType: 'rincian' });
          const key = biayaKey(detailId, rincianIdx);
          if (!expandedRincianKey.has(key)) return;
          rincianFlat.push({
            isTreeType: 'biayaBlock',
            biayaRows: biayaByKey[key] ?? []
          });
        });

        return (
          total +
          TINGGI_BARIS_DETAIL +
          tinggiBlokRincian({ rincianRows: rincianFlat })
        );
      }, 0),
    [expandedDetailId, expandedRincianKey, rincianById, biayaByKey]
  );

  const mapDetailRows = useCallback(
    (data: any[]): BLDetail[] =>
      (data ?? []).map((item: any) => ({
        id: item?.id,
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
      })) as BLDetail[],
    []
  );

  const prefetchPages = useCallback(
    async (
      pagesToFetch: number[],
      existingCache?: Map<number, BLDetail[]>,
      knownTotalPages?: number
    ) => {
      if (!headerData?.id) return;

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
            const data = await getBlDetailFn(String(headerData.id), {
              ...queryParams,
              page: pageNum,
              limit: filters.limit
            });

            if (data?.data && data.data.length > 0) {
              streamBufferRef.current = new Map(streamBufferRef.current);
              streamBufferRef.current.set(
                pageNum,
                mapDetailRows(data.data).slice(0, filters.limit)
              );
            }
          } catch (err) {
            console.warn(
              `[StreamBuffer] Prefetch detail ${pageNum} gagal:`,
              err
            );
          } finally {
            prefetchingPagesRef.current.delete(pageNum);
          }
        })
      );
    },
    [
      headerData?.id,
      queryParams,
      filters.limit,
      totalPages,
      pageDataCache,
      mapDetailRows
    ]
  );

  useEffect(() => {
    if (!shouldBulkFetch || !allDataDetail) return;

    const bulkData = mapDetailRows(allDataDetail.data);

    const newCache = new Map<number, BLDetail[]>();
    for (let i = 0; i < WINDOW_SIZE; i++) {
      const pageData = bulkData.slice(
        i * filters.limit,
        i * filters.limit + filters.limit
      );
      if (pageData.length > 0) newCache.set(i + 1, pageData);
    }

    setPageDataCache(newCache);
    setVisiblePages(Array.from({ length: WINDOW_SIZE }, (_, i) => i + 1));

    const totalItems = allDataDetail.pagination?.totalItems ?? bulkData.length;
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
  }, [allDataDetail, shouldBulkFetch, filters.limit]);

  useEffect(() => {
    if (shouldBulkFetch || !allDataDetail) return;
    if (currentPage < 1) return;

    const newRows = mapDetailRows(allDataDetail.data).slice(0, filters.limit);

    setPageDataCache((prevCache) => {
      const newCache = new Map(prevCache);
      newCache.set(currentPage, newRows);
      return newCache;
    });

    const maxVisible = Math.max(...visiblePages);
    const minVisible = Math.min(...visiblePages);

    if (currentPage > maxVisible && currentPage <= maxVisible + 1) {
      const removedPage = visiblePages[0];
      const removedRows = pageDataCache.get(removedPage);
      isPageTransitionRef.current = true;
      pendingScrollAdjustment.current = -tinggiHalaman(removedRows);
      shiftSelectionForWindow(-(removedRows?.length ?? 0));

      setPageDataCache((prev) => {
        const updated = new Map(prev);
        updated.delete(removedPage);
        return updated;
      });
      setVisiblePages((prevVisible) => [...prevVisible.slice(1), currentPage]);
    } else if (currentPage < minVisible && currentPage >= minVisible - 1) {
      const removedPage = visiblePages[visiblePages.length - 1];
      isPageTransitionRef.current = true;
      pendingScrollAdjustment.current = tinggiHalaman(newRows);
      shiftSelectionForWindow(newRows.length);

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

    if (allDataDetail.pagination?.totalPages) {
      setTotalPages(allDataDetail.pagination.totalPages);
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
  }, [allDataDetail, currentPage, shouldBulkFetch]);

  // Row Combiner — gabungkan halaman yang sedang terlihat jadi `rows`.
  useEffect(() => {
    const combinedRows: BLDetail[] = [];
    visiblePages?.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (pageData) combinedRows.push(...pageData);
    });

    if (combinedRows.length === 0) return;
    setRows(combinedRows);

    if (isPageTransitionRef.current) {
      // Window bergeser: JANGAN sentuh scroll (selectCell akan menyeret grid
      // ke baris 0). Cukup kunci ulang index ke baris jangkar (kalau masih di
      // window) dan commit bersamaan dengan setRows supaya highlight tidak
      // berkedip. Kalau jangkar sudah di luar window, rincian tetap ikut
      // jangkar — tidak ikut berubah karena scroll.
      isPageTransitionRef.current = false;
      const anchoredIdx =
        selectedRowIdRef.current != null
          ? combinedRows.findIndex(
              (r) => String(r.id) === selectedRowIdRef.current
            )
          : -1;

      const targetRow =
        anchoredIdx >= 0
          ? anchoredIdx
          : Math.min(
              Math.max(selectedRowRef.current, 0),
              combinedRows.length - 1
            );

      selectedRowRef.current = targetRow;
      setSelectedRow(targetRow);

      if (selectedRowIdRef.current == null) {
        anchorSelection(combinedRows[targetRow]);
      }
    } else if (pendingInitialFocusRef.current) {
      pendingInitialFocusRef.current = false;
      selectedRowRef.current = 0;
      setSelectedRow(0);
      anchorSelection(combinedRows[0]);
      setTimeout(() => {
        gridRef.current?.scrollToCell?.({
          rowIdx: 0,
          idx: pendingSelectIdxRef.current
        });
        gridRef.current?.selectCell?.({
          rowIdx: 0,
          idx: pendingSelectIdxRef.current
        });
      }, 50);
    }
  }, [visiblePages, pageDataCache]);

  // Kompensasi scrollTop setelah window bergeser, supaya baris yang sedang
  // dilihat user tetap di posisi visual yang sama (tidak meloncat).
  useLayoutEffect(() => {
    if (pendingScrollAdjustment.current !== 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop += pendingScrollAdjustment.current;
      scrollPositionRef.current = container.scrollTop;
      lastScrollTopRef.current = container.scrollTop;
      hasAdjustedScrollRef.current = true;
      pendingScrollAdjustment.current = 0;
    }
  }, [rows]);

  const handleGridScroll = (event: React.UIEvent<HTMLDivElement>) => {
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

    const scrollHeight = currentTarget.scrollHeight;
    const sisaKeBawah = scrollHeight - (scrollTop + clientHeight);

    if (sisaKeBawah <= THRESHOLD_PX) {
      const nextPage = Math.max(...visiblePages) + 1;

      if (nextPage <= totalPages && !isFetching && isScrollingRef.current) {
        if (streamBufferRef.current.has(nextPage)) {
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;

          const bufferedData = streamBufferRef.current.get(nextPage)!;
          setPageDataCache((prev) => new Map(prev).set(nextPage, bufferedData));

          streamBufferRef.current = new Map(streamBufferRef.current);
          streamBufferRef.current.delete(nextPage);

          const removedRows = pageDataCache.get(visiblePages[0]);
          isPageTransitionRef.current = true;
          pendingScrollAdjustment.current = -tinggiHalaman(removedRows);
          shiftSelectionForWindow(-(removedRows?.length ?? 0));

          setVisiblePages((prevVisible) => {
            const removedPage = prevVisible[0];
            setPageDataCache((prev) => {
              const updated = new Map(prev);
              updated.delete(removedPage);
              return updated;
            });
            return [...prevVisible.slice(1), nextPage];
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
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;
          setCurrentPage(nextPage);
        }
      }
    }

    if (scrollTop <= THRESHOLD_PX) {
      const prevPage = Math.min(...visiblePages) - 1;

      if (prevPage >= 1 && !isFetching && isScrollingRef.current) {
        if (streamBufferRef.current.has(prevPage)) {
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;

          const bufferedData = streamBufferRef.current.get(prevPage)!;
          setPageDataCache((prev) => new Map(prev).set(prevPage, bufferedData));

          streamBufferRef.current = new Map(streamBufferRef.current);
          streamBufferRef.current.delete(prevPage);

          isPageTransitionRef.current = true;
          pendingScrollAdjustment.current = tinggiHalaman(bufferedData);
          shiftSelectionForWindow(bufferedData.length);

          setVisiblePages((prevVisible) => {
            const removedPage = prevVisible[prevVisible.length - 1];
            setPageDataCache((prev) => {
              const updated = new Map(prev);
              updated.delete(removedPage);
              return updated;
            });
            return [prevPage, ...prevVisible.slice(0, WINDOW_SIZE - 1)];
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
          // Reset dulu supaya setCurrentPage(prevPage) pasti memicu refetch
          // walau nilainya sama dengan currentPage saat ini.
          setCurrentPage(0);
          setTimeout(() => setCurrentPage(prevPage), 0);
        }
      }
    }
  };

  useEffect(() => {
    resetTreeState();
    resetBufferingCache();
    setRows([]);
  }, [headerData?.id, filters, resetTreeState, resetBufferingCache]);

  // Fokus awal (baris 0) ditangani Row Combiner lewat pendingInitialFocusRef.
  // Dulu di sini ada effect [rows] yang selalu memanggil selectCell(rowIdx: 0):
  // tiap window bergeser, grid ikut ter-scroll balik ke atas.
  useEffect(() => {
    if (rows.length > 0 && selectedRow !== null) {
      detailClearedRef.current = false;
      let selectedRowData = selectedRowDataRef.current;
      if (!selectedRowData) {
        selectedRowData = rows[selectedRow] ?? null;
        anchorSelection(selectedRowData);
      }
      if (!selectedRowData) return;

      if (selectedRowData.id !== lastDispatchedId.current) {
        dispatch(setDetailData(selectedRowData)); // Pastikan data sudah benar
        lastDispatchedId.current = selectedRowData.id;
      }
      return;
    }

    // Rincian hanya dikosongkan kalau detail memang kosong, bukan saat window
    // sedang dimuat ulang.
    const sedangMuat = isLoading || isFetching || isTransitioning;
    if (rows.length === 0 && !sedangMuat && !detailClearedRef.current) {
      detailClearedRef.current = true;
      lastDispatchedId.current = null;
      clearSelectionAnchor();
      dispatch(setDetailData({}));
    }
  }, [rows, selectedRow, dispatch, isLoading, isFetching, isTransitioning]);

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
          rows={treeRows}
          headerRowHeight={70}
          onScroll={handleGridScroll}
          onCellKeyDown={handleKeyDown}
          rowHeight={(row: any) =>
            row.isTreeType === 'rincianBlock'
              ? tinggiBlokRincian(row)
              : TINGGI_BARIS_DETAIL
          }
          renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
          className={`${isDark ? 'rdg-dark' : 'rdg-light'} fill-grid`}
          enableVirtualization={false}
          rowKeyGetter={(row: any) =>
            row.isTreeType === 'rincianBlock'
              ? `RB-${row.detailId}`
              : `D-${row.detailId}`
          }
          rowClass={getRowClass}
          onCellClick={handleCellClick}
          onSelectedCellChange={(args) => {
            handleCellClick({ row: args.row });
          }}
        />
        <div className="flex flex-row items-center justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2">
          <span className="text-xs">
            {rows.length > 0
              ? `Menampilkan ${startRow} - ${startRow + rows.length - 1} dari ${
                  allDataDetail?.pagination?.totalItems ?? rows.length
                } data`
              : ''}
          </span>
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
