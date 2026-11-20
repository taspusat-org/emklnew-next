'use client';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
  memo
} from 'react';
import 'react-data-grid/lib/styles.scss';

import DataGrid, {
  CellClickArgs,
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
// Untuk types, import langsung (types tidak affect runtime)

import { ImSpinner2 } from 'react-icons/im';
import ActionButton from '@/components/custom-ui/ActionButton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormShipper from './FormShipper';
import { useQueryClient } from 'react-query';
import {
  ShipperInput,
  ShipperSchema
} from '@/lib/validations/shipper.validation';

import {
  useCreateShipper,
  useDeleteShipper,
  useGetShipper,
  useUpdateShipper
} from '@/lib/server/useShipper';

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
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { useTheme } from 'next-themes';
import { useDispatch } from 'react-redux';
import { Checkbox } from '@/components/ui/checkbox';
import { useAlert } from '@/lib/store/client/useAlert';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import IcClose from '@/public/image/x.svg';
import { setHeaderData } from '@/lib/store/headerSlice/headerSlice';
import { IShipper } from '@/lib/types/shipper.type';
import {
  clearOpenName,
  setClearLookup
} from '@/lib/store/lookupSlice/lookupSlice';
import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import { useFormError } from '@/lib/hooks/formErrorContext';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import { NOMOR_CELL_BOX } from '@/constants/constant';
import { debounce } from 'lodash';
import FilterInput from '@/components/custom-ui/FilterInput';
import {
  cancelPreviousRequest,
  formatCurrency,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';

import { getShipperFn } from '@/lib/apis/shipper.api';
import { useReportPdfContext } from '@/hooks/ReportPdfProvider';
import {
  generateShipperExportFn,
  generateShipperReportFn
} from '@/lib/apis/report.api';

interface Filter {
  page: number;
  limit: number;
  search: string;

  filters: {
    statusrelasi_text: string;
    relasi_id_text: string;
    nama: string;
    keterangan: string;
    contactperson: string;
    alamat: string;
    coa: string;
    coapiutang: string;
    coahutang: string;
    kota: string;
    kodepos: string;
    telp: string;
    email: string;
    fax: string;
    web: string;
    creditlimit: string;
    creditterm: string;
    credittermplus: string;
    npwp: string;
    coagiro: string;
    ppn: string;
    titipke: string;
    ppnbatalmuat: string;
    grup: string;
    formatdeliveryreport: string;
    comodity: string;
    namashippercetak: string;
    formatcetak: string;
    marketing_id_text: string;
    blok: string;
    nomor: string;
    rt: string;
    rw: string;
    kelurahan: string;
    kabupaten: string;
    kecamatan: string;
    propinsi: string;
    isdpp10psn: string;
    usertracing: string;
    passwordtracing: string;
    kodeprospek: string;
    namashipperprospek: string;
    emaildelay: string;
    keterangan1barisinvoice: string;
    nik: string;
    namaparaf: string;
    saldopiutang: string;
    keteranganshipperjobminus: string;
    tglemailshipperjobminus: string;
    tgllahir: string;
    idshipperasal_text: string;
    initial: string;
    tipe: string;
    idtipe: string;
    idinitial: string;
    nshipperprospek: string;
    parentshipper_id_text: string;
    npwpnik: string;
    nitku: string;
    kodepajak: string;
    created_at: string;
    updated_at: string;

    statusaktif?: string;
    modifiedby?: string;
  };
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridShipper = () => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const [totalPages, setTotalPages] = useState(1);
  const [popOver, setPopOver] = useState<boolean>(false);
  // Dinaikkan setiap "Save & Add" untuk me-remount form (Dialog) agar semua
  // LookUp re-init dari nilai form hasil resetAddForm -> status default kembali
  // terisi dan field lain kosong. Tanpa ini, modal yang tetap terbuka
  // membuat LookUp memakai state lama (tampilan status kosong).
  const [addFormKey, setAddFormKey] = useState<number>(0);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAfterMutation, setIsAfterMutation] = useState(false);
  const [shouldBulkFetch, setShouldBulkFetch] = useState(true);
  const scrollPositionRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prevRowsLengthRef = useRef<number>(0);
  const prevMinPageRef = useRef<number>(1);
  const hasAdjustedScrollRef = useRef<boolean>(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  // Versi ref dari isScrolling: di-set sinkron agar pengecekan di dalam
  // handleScroll yang sama langsung melihat nilai terbaru. State `isScrolling`
  // bersifat async, sehingga pada navigasi keyboard (hanya 1 event scroll per
  // tekan PageUp/PageDown) closure-nya masih `false` dan pemicu fetch halaman
  // berikutnya tidak pernah jalan. Ref ini mencegah masalah tsb.
  const isScrollingRef = useRef(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(
    null
  );
  // Tambah ref baru di dekat ref lainnya
  const pendingSelectIdxRef = useRef<number>(1); // default ke idx 1 (skip kolom nomor+ceklis)
  const suppressScrollRef = useRef(false);
  const isPageTransitionRef = useRef(false);
  const { generateReport, generateExport } = useReportPdfContext();

  const lastScrollTopRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingScrollAdjustment = useRef<number>(0);
  const [visiblePages, setVisiblePages] = useState<number[]>([1, 2, 3, 4, 5]);
  const minVisiblePage = useMemo(
    () => Math.min(...visiblePages),
    [visiblePages]
  );
  const [pageDataCache, setPageDataCache] = useState<Map<number, IShipper[]>>(
    new Map()
  );

  const { mutateAsync: createShipper, isLoading: isLoadingCreate } =
    useCreateShipper();
  const { mutateAsync: updateShipper, isLoading: isLoadingUpdate } =
    useUpdateShipper();
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastDispatchedId = useRef<string | null>(null);
  const { mutateAsync: deleteShipper, isLoading: isLoadingDelete } =
    useDeleteShipper();
  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
  const [columnsWidth, setColumnsWidth] = useState<{ [key: string]: number }>(
    {}
  );
  const [mode, setMode] = useState<string>('');
  const [isFilteringRows, setIsFilteringRows] = useState(false);
  const [dataGridKey, setDataGridKey] = useState(0);

  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [fetchedPages, setFetchedPages] = useState<Set<number>>(new Set([1]));
  const queryClient = useQueryClient();
  const [bulkStartPage, setBulkStartPage] = useState(1);

  const [isFetchingManually, setIsFetchingManually] = useState(false);
  const [rows, setRows] = useState<IShipper[]>([]);
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const prevPageRef = useRef(currentPage);
  const dispatch = useDispatch();
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const { alert } = useAlert();
  const { user, cabang_id } = useSelector((state: RootState) => state.auth);
  const getLookup = useSelector((state: RootState) => state.lookup.data);
  const selectedRowRef = useRef<number>(0);
  useEffect(() => {
    selectedRowRef.current = selectedRow;
  }, [selectedRow]);
  // ID baris yang baru disimpan (add/edit). Dipakai Row Combiner untuk
  // memfokuskan baris itu BERDASARKAN ID (bukan index) setelah data window
  // settle -- index bisa meleset karena window pagination ikut bergeser saat
  // re-render. Selama ref ini ter-set, Combiner TIDAK menjalankan scroll-ke-
  // row-0 (cabang else) yang memicu handleScroll menggeser window.
  const pendingFocusIdRef = useRef<string | null>(null);
  // Diset true selama window settle pasca-mutasi (add/edit) untuk memblokir
  // data-effect memproses ulang hasil refetch (yang menimpa fokus ke baris 0).
  // Ref (bukan state) supaya reset-nya TIDAK memicu ulang effect.
  const suppressRefetchRef = useRef(false);
  const activeFilterInputRef = useRef<HTMLElement | null>(null);
  const [selectedCellKey, setSelectedCellKey] =
    useState<string>('statusrelasi_text');
  const streamBufferRef = useRef<Map<number, IShipper[]>>(new Map());
  const prefetchingPagesRef = useRef<Set<number>>(new Set());
  const STREAM_BUFFER_SIZE = 5;
  const WINDOW_SIZE = 5;
  const ROW_HEIGHT = 27;
  const jumpToLastRef = useRef(false);
  const jumpToFirstRef = useRef(false);
  // Modalitas input terakhir: 'keyboard' (Arrow/Page) atau 'pointer' (wheel/drag
  // scrollbar). Dipakai utk menentukan apakah selectCell harus di-re-anchor
  // ke baris data yg sama setelah window-shift.
  const interactionModeRef = useRef<'keyboard' | 'pointer'>('pointer');
  // Diset saat window benar-benar bergeser (shiftSelectionForWindow). Menandai
  // apakah pergeseran itu dari keyboard, sehingga useLayoutEffect tahu apakah
  // perlu re-anchor selectCell. Mouse scroll TIDAK boleh memindahkan sel aktif.
  const reanchorFromKeyboardRef = useRef(false);

  // Saat window pagination bergeser (halaman atas/bawah keluar dari window),
  // index setiap baris di array `rows` ikut bergeser sebanyak filters.limit.
  // Fungsi ini menjaga agar baris DATA yang sama tetap ter-select dengan HANYA
  // menggeser index (selectedRowRef) -- highlight digambar via getRowClass.
  // Posisi visual dijaga oleh kompensasi scrollTop (pendingScrollAdjustment),
  // jadi kita TIDAK memanggil selectCell/scrollToCell di sini agar grid tidak
  // dipaksa scroll ke baris tsb.
  // CATATAN: setSelectedRow TIDAK dipanggil di sini -- ditunda ke Row Combiner
  // agar commit bersamaan dengan setRows. Jika selectedRow di-update sekarang,
  // akan ada 1 frame di mana selectedRow sudah bergeser tapi `rows` belum
  // -> highlight kuning "berkedip".
  const shiftSelectionForWindow = (deltaRows: number) => {
    const next = Math.max(0, selectedRowRef.current + deltaRows);
    selectedRowRef.current = next;
    reanchorFromKeyboardRef.current = interactionModeRef.current === 'keyboard';
  };

  const forms = useForm<ShipperInput>({
    resolver: mode === 'delete' ? undefined : zodResolver(ShipperSchema),
    mode: 'onSubmit',
    defaultValues: {
      statusrelasi: '',
      statusrelasi_text: '',

      relasi_id: '',
      relasi_id_text: '',

      nama: '',

      keterangan: '',

      contactperson: '',

      alamat: '',

      coa: '',

      coapiutang: '',

      coahutang: '',

      kota: '',

      kodepos: '',

      telp: '',

      email: '',

      fax: '',

      web: '',

      creditlimit: '',

      creditterm: '',

      credittermplus: '',

      npwp: '',

      coagiro: '',

      ppn: '',

      titipke: '',

      ppnbatalmuat: '',

      grup: '',

      formatdeliveryreport: '',

      comodity: '',

      namashippercetak: '',

      formatcetak: '',

      marketing_id: '',
      marketing_id_text: '',

      blok: '',

      nomor: '',

      rt: '',

      rw: '',

      kelurahan: '',

      kabupaten: '',

      kecamatan: '',

      propinsi: '',

      isdpp10psn: '',

      usertracing: '',

      passwordtracing: '',

      kodeprospek: '',

      namashipperprospek: '',

      emaildelay: '',

      keterangan1barisinvoice: '',

      nik: '',

      namaparaf: '',

      saldopiutang: '',

      keteranganshipperjobminus: '',

      tglemailshipperjobminus: '',

      tgllahir: '',

      idshipperasal: '',
      idshipperasal_text: '',

      initial: '',

      tipe: '',

      idtipe: '',

      idinitial: '',

      nshipperprospek: '',

      parentshipper_id: '',
      parentshipper_id_text: '',

      npwpnik: '',

      nitku: '',

      kodepajak: '',

      statusaktif: '',
      statusaktif_text: ''
    }
  });
  const {
    setFocus,
    reset,
    formState: { isSubmitSuccessful }
  } = forms;
  const router = useRouter();
  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: 50,
    search: '',
    filters: {
      statusrelasi_text: '',
      relasi_id_text: '',
      nama: '',
      keterangan: '',
      contactperson: '',
      alamat: '',
      coa: '',
      coapiutang: '',
      coahutang: '',
      kota: '',
      kodepos: '',
      telp: '',
      email: '',
      fax: '',
      web: '',
      creditlimit: '',
      creditterm: '',
      credittermplus: '',
      npwp: '',
      coagiro: '',
      ppn: '',
      titipke: '',
      ppnbatalmuat: '',
      grup: '',
      formatdeliveryreport: '',
      comodity: '',
      namashippercetak: '',
      formatcetak: '',
      marketing_id_text: '',
      blok: '',
      nomor: '',
      rt: '',
      rw: '',
      kelurahan: '',
      kabupaten: '',
      kecamatan: '',
      propinsi: '',
      isdpp10psn: '',
      usertracing: '',
      passwordtracing: '',
      kodeprospek: '',
      namashipperprospek: '',
      emaildelay: '',
      keterangan1barisinvoice: '',
      nik: '',
      namaparaf: '',
      saldopiutang: '',
      keteranganshipperjobminus: '',
      tglemailshipperjobminus: '',
      tgllahir: '',
      idshipperasal_text: '',
      initial: '',
      tipe: '',
      idtipe: '',
      idinitial: '',
      nshipperprospek: '',
      parentshipper_id_text: '',
      npwpnik: '',
      nitku: '',
      kodepajak: '',
      created_at: '',
      updated_at: '',
      statusaktif: '',
      modifiedby: ''
    },
    sortBy: 'nama',
    sortDirection: 'asc'
  });
  const gridRef = useRef<DataGridHandle>(null);
  const [prevFilters, setPrevFilters] = useState<Filter>(filters);
  const effectiveLimit = shouldBulkFetch ? filters.limit * 5 : filters.limit;
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const { data: allShipper, isLoading: isLoadingShipper } = useGetShipper(
    {
      ...filters,
      page: shouldBulkFetch ? bulkStartPage : currentPage,
      limit: effectiveLimit
    },
    abortControllerRef.current?.signal
  );

  const currentMinPage =
    visiblePages.length > 0 ? Math.min(...visiblePages) : 1;
  const startRow = (currentMinPage - 1) * filters.limit + 1;

  const resetBufferingCache = () => {
    setShouldBulkFetch(true);
    setBulkStartPage(1);
    setPageDataCache(new Map());
    setVisiblePages([1, 2, 3, 4, 5]);
    setIsFetching(false);
    streamBufferRef.current = new Map();
    prefetchingPagesRef.current = new Set();
  };
  const columns = useMemo((): Column<IShipper>[] => {
    return [
      {
        // Kolom nomor + ceklis menyatu dalam satu kolom (pola GridAsuransi).
        // Bukan 'nomor': bentrok dengan field alamat `nomor`, width ikut 200 saat reset.
        key: 'no',
        name: 'NO',
        width: 40,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full w-full flex-col gap-1">
            <div
              className="headers-cell h-[50%] w-full"
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p className="w-full text-center text-sm font-normal">No.</p>
            </div>

            <div className={`h-[50%] w-[calc(100%+2px)] ${NOMOR_CELL_BOX}`}>
              <div className="flex justify-center">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={() => handleSelectAll()}
                  id="header-checkbox"
                />
              </div>
              <div
                className="flex cursor-pointer items-center justify-center"
                onClick={() => {
                  discardPendingFilterUpdates();
                  setFilters({
                    ...filters,
                    search: '',
                    filters: {
                      statusrelasi_text: '',
                      relasi_id_text: '',
                      nama: '',
                      keterangan: '',
                      contactperson: '',
                      alamat: '',
                      coa: '',
                      coapiutang: '',
                      coahutang: '',
                      kota: '',
                      kodepos: '',
                      telp: '',
                      email: '',
                      fax: '',
                      web: '',
                      creditlimit: '',
                      creditterm: '',
                      credittermplus: '',
                      npwp: '',
                      coagiro: '',
                      ppn: '',
                      titipke: '',
                      ppnbatalmuat: '',
                      grup: '',
                      formatdeliveryreport: '',
                      comodity: '',
                      namashippercetak: '',
                      formatcetak: '',
                      marketing_id_text: '',
                      blok: '',
                      nomor: '',
                      rt: '',
                      rw: '',
                      kelurahan: '',
                      kabupaten: '',
                      kecamatan: '',
                      propinsi: '',
                      isdpp10psn: '',
                      usertracing: '',
                      passwordtracing: '',
                      kodeprospek: '',
                      namashipperprospek: '',
                      emaildelay: '',
                      keterangan1barisinvoice: '',
                      nik: '',
                      namaparaf: '',
                      saldopiutang: '',
                      keteranganshipperjobminus: '',
                      tglemailshipperjobminus: '',
                      tgllahir: '',
                      idshipperasal_text: '',
                      initial: '',
                      tipe: '',
                      idtipe: '',
                      idinitial: '',
                      nshipperprospek: '',
                      parentshipper_id_text: '',
                      npwpnik: '',
                      nitku: '',
                      kodepajak: '',
                      created_at: '',
                      updated_at: '',
                      statusaktif: '',
                      modifiedby: ''
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
          </div>
        ),
        renderCell: (props: any) => {
          const rowId = props.row.id;
          const localIndex = rows.findIndex((row) => row.id === rowId);
          const absoluteNumber =
            localIndex === -1
              ? '—'
              : (minVisiblePage - 1) * filters.limit + localIndex + 1;
          return (
            <div
              className={`-ml-[5px] h-full w-[calc(100%+9px)] cursor-pointer ${NOMOR_CELL_BOX}`}
            >
              <div className="flex justify-center">
                <Checkbox
                  checked={checkedRows.has(rowId)}
                  onCheckedChange={() => handleRowSelect(rowId)}
                  id={`row-checkbox-${rowId}`}
                />
              </div>
              <div className="flex justify-center text-sm">
                {absoluteNumber}
              </div>
            </div>
          );
        }
      },
      {
        key: 'statusrelasi_text',
        name: 'Statusrelasi',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="STATUSRELASI"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('statusrelasi_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statusrelasi_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Statusrelasi
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statusrelasi_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'statusrelasi_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="statusrelasi_text"
                value={filters.filters.statusrelasi_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('statusrelasi_text', value)
                }
                onClear={() => handleClearFilter('statusrelasi_text')}
                inputRef={(el) => {
                  inputColRefs.current['statusrelasi_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.statusrelasi_text || '';
          const cellValue = props.row.statusrelasi_text || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'relasi_id_text',
        name: 'Relasi',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="RELASI"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('relasi_id_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'relasi_id_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Relasi
              </p>
              <div className="ml-2">
                {filters.sortBy === 'relasi_id_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'relasi_id_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="relasi_id_text"
                value={filters.filters.relasi_id_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('relasi_id_text', value)
                }
                onClear={() => handleClearFilter('relasi_id_text')}
                inputRef={(el) => {
                  inputColRefs.current['relasi_id_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.relasi_id_text || '';
          const cellValue = props.row.relasi_id_text || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'nama',
        name: 'Nama',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NAMA"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
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
                Nama
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
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'keterangan',
        name: 'Keterangan',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
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
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'contactperson',
        name: 'Contactperson',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="CONTACTPERSON"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('contactperson')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'contactperson'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Contactperson
              </p>
              <div className="ml-2">
                {filters.sortBy === 'contactperson' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'contactperson' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="contactperson"
                value={filters.filters.contactperson || ''}
                onChange={(value) =>
                  handleFilterInputChange('contactperson', value)
                }
                onClear={() => handleClearFilter('contactperson')}
                inputRef={(el) => {
                  inputColRefs.current['contactperson'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.contactperson || '';
          const cellValue = props.row.contactperson || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'alamat',
        name: 'Alamat',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="ALAMAT"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('alamat')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'alamat' ? 'font-bold' : 'font-normal'
                }`}
              >
                Alamat
              </p>
              <div className="ml-2">
                {filters.sortBy === 'alamat' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'alamat' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="alamat"
                value={filters.filters.alamat || ''}
                onChange={(value) => handleFilterInputChange('alamat', value)}
                onClear={() => handleClearFilter('alamat')}
                inputRef={(el) => {
                  inputColRefs.current['alamat'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.alamat || '';
          const cellValue = props.row.alamat || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'coa',
        name: 'Coa',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="COA"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
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
                Coa
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
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'coapiutang',
        name: 'Coapiutang',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="COAPIUTANG"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('coapiutang')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'coapiutang' ? 'font-bold' : 'font-normal'
                }`}
              >
                Coapiutang
              </p>
              <div className="ml-2">
                {filters.sortBy === 'coapiutang' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'coapiutang' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="coapiutang"
                value={filters.filters.coapiutang || ''}
                onChange={(value) =>
                  handleFilterInputChange('coapiutang', value)
                }
                onClear={() => handleClearFilter('coapiutang')}
                inputRef={(el) => {
                  inputColRefs.current['coapiutang'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.coapiutang || '';
          const cellValue = props.row.coapiutang || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'coahutang',
        name: 'Coahutang',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="COAHUTANG"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('coahutang')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'coahutang' ? 'font-bold' : 'font-normal'
                }`}
              >
                Coahutang
              </p>
              <div className="ml-2">
                {filters.sortBy === 'coahutang' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'coahutang' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="coahutang"
                value={filters.filters.coahutang || ''}
                onChange={(value) =>
                  handleFilterInputChange('coahutang', value)
                }
                onClear={() => handleClearFilter('coahutang')}
                inputRef={(el) => {
                  inputColRefs.current['coahutang'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.coahutang || '';
          const cellValue = props.row.coahutang || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'kota',
        name: 'Kota',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="KOTA"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('kota')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kota' ? 'font-bold' : 'font-normal'
                }`}
              >
                Kota
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kota' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kota' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kota"
                value={filters.filters.kota || ''}
                onChange={(value) => handleFilterInputChange('kota', value)}
                onClear={() => handleClearFilter('kota')}
                inputRef={(el) => {
                  inputColRefs.current['kota'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kota || '';
          const cellValue = props.row.kota || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'kodepos',
        name: 'Kodepos',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="KODEPOS"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('kodepos')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kodepos' ? 'font-bold' : 'font-normal'
                }`}
              >
                Kodepos
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kodepos' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kodepos' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kodepos"
                value={filters.filters.kodepos || ''}
                onChange={(value) => handleFilterInputChange('kodepos', value)}
                onClear={() => handleClearFilter('kodepos')}
                inputRef={(el) => {
                  inputColRefs.current['kodepos'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kodepos || '';
          const cellValue = props.row.kodepos || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'telp',
        name: 'Telp',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="TELP"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('telp')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'telp' ? 'font-bold' : 'font-normal'
                }`}
              >
                Telp
              </p>
              <div className="ml-2">
                {filters.sortBy === 'telp' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'telp' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="telp"
                value={filters.filters.telp || ''}
                onChange={(value) => handleFilterInputChange('telp', value)}
                onClear={() => handleClearFilter('telp')}
                inputRef={(el) => {
                  inputColRefs.current['telp'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.telp || '';
          const cellValue = props.row.telp || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'email',
        name: 'Email',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="EMAIL"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
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
                Email
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
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'fax',
        name: 'Fax',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="FAX"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('fax')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'fax' ? 'font-bold' : 'font-normal'
                }`}
              >
                Fax
              </p>
              <div className="ml-2">
                {filters.sortBy === 'fax' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'fax' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="fax"
                value={filters.filters.fax || ''}
                onChange={(value) => handleFilterInputChange('fax', value)}
                onClear={() => handleClearFilter('fax')}
                inputRef={(el) => {
                  inputColRefs.current['fax'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.fax || '';
          const cellValue = props.row.fax || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'web',
        name: 'Web',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="WEB"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('web')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'web' ? 'font-bold' : 'font-normal'
                }`}
              >
                Web
              </p>
              <div className="ml-2">
                {filters.sortBy === 'web' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'web' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="web"
                value={filters.filters.web || ''}
                onChange={(value) => handleFilterInputChange('web', value)}
                onClear={() => handleClearFilter('web')}
                inputRef={(el) => {
                  inputColRefs.current['web'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.web || '';
          const cellValue = props.row.web || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'creditlimit',
        name: 'Creditlimit',
        resizable: true,
        draggable: true,
        width: 130,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="CREDITLIMIT"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('creditlimit')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'creditlimit' ? 'font-bold' : 'font-normal'
                }`}
              >
                Creditlimit
              </p>
              <div className="ml-2">
                {filters.sortBy === 'creditlimit' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'creditlimit' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="creditlimit"
                value={filters.filters.creditlimit || ''}
                onChange={(value) =>
                  handleFilterInputChange('creditlimit', value)
                }
                onClear={() => handleClearFilter('creditlimit')}
                inputRef={(el) => {
                  inputColRefs.current['creditlimit'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.creditlimit || '';
          const cellValue =
            props.row.creditlimit === null ||
            props.row.creditlimit === undefined ||
            props.row.creditlimit === ''
              ? ''
              : formatCurrency(props.row.creditlimit);
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'creditterm',
        name: 'Creditterm',
        resizable: true,
        draggable: true,
        width: 130,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="CREDITTERM"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('creditterm')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'creditterm' ? 'font-bold' : 'font-normal'
                }`}
              >
                Creditterm
              </p>
              <div className="ml-2">
                {filters.sortBy === 'creditterm' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'creditterm' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="creditterm"
                value={filters.filters.creditterm || ''}
                onChange={(value) =>
                  handleFilterInputChange('creditterm', value)
                }
                onClear={() => handleClearFilter('creditterm')}
                inputRef={(el) => {
                  inputColRefs.current['creditterm'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.creditterm || '';
          const cellValue =
            props.row.creditterm === null || props.row.creditterm === undefined
              ? ''
              : String(props.row.creditterm);
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'credittermplus',
        name: 'Credittermplus',
        resizable: true,
        draggable: true,
        width: 130,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="CREDITTERMPLUS"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('credittermplus')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'credittermplus'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Credittermplus
              </p>
              <div className="ml-2">
                {filters.sortBy === 'credittermplus' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'credittermplus' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="credittermplus"
                value={filters.filters.credittermplus || ''}
                onChange={(value) =>
                  handleFilterInputChange('credittermplus', value)
                }
                onClear={() => handleClearFilter('credittermplus')}
                inputRef={(el) => {
                  inputColRefs.current['credittermplus'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.credittermplus || '';
          const cellValue =
            props.row.credittermplus === null ||
            props.row.credittermplus === undefined
              ? ''
              : String(props.row.credittermplus);
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'npwp',
        name: 'Npwp',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NPWP"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('npwp')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'npwp' ? 'font-bold' : 'font-normal'
                }`}
              >
                Npwp
              </p>
              <div className="ml-2">
                {filters.sortBy === 'npwp' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'npwp' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="npwp"
                value={filters.filters.npwp || ''}
                onChange={(value) => handleFilterInputChange('npwp', value)}
                onClear={() => handleClearFilter('npwp')}
                inputRef={(el) => {
                  inputColRefs.current['npwp'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.npwp || '';
          const cellValue = props.row.npwp || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'coagiro',
        name: 'Coagiro',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="COAGIRO"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('coagiro')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'coagiro' ? 'font-bold' : 'font-normal'
                }`}
              >
                Coagiro
              </p>
              <div className="ml-2">
                {filters.sortBy === 'coagiro' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'coagiro' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="coagiro"
                value={filters.filters.coagiro || ''}
                onChange={(value) => handleFilterInputChange('coagiro', value)}
                onClear={() => handleClearFilter('coagiro')}
                inputRef={(el) => {
                  inputColRefs.current['coagiro'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.coagiro || '';
          const cellValue = props.row.coagiro || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'ppn',
        name: 'Ppn',
        resizable: true,
        draggable: true,
        width: 130,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="PPN"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('ppn')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'ppn' ? 'font-bold' : 'font-normal'
                }`}
              >
                Ppn
              </p>
              <div className="ml-2">
                {filters.sortBy === 'ppn' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'ppn' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="ppn"
                value={filters.filters.ppn || ''}
                onChange={(value) => handleFilterInputChange('ppn', value)}
                onClear={() => handleClearFilter('ppn')}
                inputRef={(el) => {
                  inputColRefs.current['ppn'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.ppn || '';
          const cellValue =
            props.row.ppn === null ||
            props.row.ppn === undefined ||
            props.row.ppn === ''
              ? ''
              : formatCurrency(props.row.ppn);
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'titipke',
        name: 'Titipke',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="TITIPKE"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('titipke')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'titipke' ? 'font-bold' : 'font-normal'
                }`}
              >
                Titipke
              </p>
              <div className="ml-2">
                {filters.sortBy === 'titipke' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'titipke' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="titipke"
                value={filters.filters.titipke || ''}
                onChange={(value) => handleFilterInputChange('titipke', value)}
                onClear={() => handleClearFilter('titipke')}
                inputRef={(el) => {
                  inputColRefs.current['titipke'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.titipke || '';
          const cellValue = props.row.titipke || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'ppnbatalmuat',
        name: 'Ppnbatalmuat',
        resizable: true,
        draggable: true,
        width: 130,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="PPNBATALMUAT"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('ppnbatalmuat')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'ppnbatalmuat'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Ppnbatalmuat
              </p>
              <div className="ml-2">
                {filters.sortBy === 'ppnbatalmuat' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'ppnbatalmuat' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="ppnbatalmuat"
                value={filters.filters.ppnbatalmuat || ''}
                onChange={(value) =>
                  handleFilterInputChange('ppnbatalmuat', value)
                }
                onClear={() => handleClearFilter('ppnbatalmuat')}
                inputRef={(el) => {
                  inputColRefs.current['ppnbatalmuat'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.ppnbatalmuat || '';
          const cellValue =
            props.row.ppnbatalmuat === null ||
            props.row.ppnbatalmuat === undefined ||
            props.row.ppnbatalmuat === ''
              ? ''
              : formatCurrency(props.row.ppnbatalmuat);
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'grup',
        name: 'Grup',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="GRUP"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('grup')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'grup' ? 'font-bold' : 'font-normal'
                }`}
              >
                Grup
              </p>
              <div className="ml-2">
                {filters.sortBy === 'grup' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'grup' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="grup"
                value={filters.filters.grup || ''}
                onChange={(value) => handleFilterInputChange('grup', value)}
                onClear={() => handleClearFilter('grup')}
                inputRef={(el) => {
                  inputColRefs.current['grup'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.grup || '';
          const cellValue = props.row.grup || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'formatdeliveryreport',
        name: 'Formatdeliveryreport',
        resizable: true,
        draggable: true,
        width: 130,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="FORMATDELIVERYREPORT"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('formatdeliveryreport')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'formatdeliveryreport'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Formatdeliveryreport
              </p>
              <div className="ml-2">
                {filters.sortBy === 'formatdeliveryreport' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'formatdeliveryreport' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="formatdeliveryreport"
                value={filters.filters.formatdeliveryreport || ''}
                onChange={(value) =>
                  handleFilterInputChange('formatdeliveryreport', value)
                }
                onClear={() => handleClearFilter('formatdeliveryreport')}
                inputRef={(el) => {
                  inputColRefs.current['formatdeliveryreport'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.formatdeliveryreport || '';
          const cellValue =
            props.row.formatdeliveryreport === null ||
            props.row.formatdeliveryreport === undefined
              ? ''
              : String(props.row.formatdeliveryreport);
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'comodity',
        name: 'Comodity',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
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
                Comodity
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
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'namashippercetak',
        name: 'Namashippercetak',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NAMASHIPPERCETAK"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('namashippercetak')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'namashippercetak'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Namashippercetak
              </p>
              <div className="ml-2">
                {filters.sortBy === 'namashippercetak' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'namashippercetak' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="namashippercetak"
                value={filters.filters.namashippercetak || ''}
                onChange={(value) =>
                  handleFilterInputChange('namashippercetak', value)
                }
                onClear={() => handleClearFilter('namashippercetak')}
                inputRef={(el) => {
                  inputColRefs.current['namashippercetak'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.namashippercetak || '';
          const cellValue = props.row.namashippercetak || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'formatcetak',
        name: 'Formatcetak',
        resizable: true,
        draggable: true,
        width: 130,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="FORMATCETAK"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('formatcetak')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'formatcetak' ? 'font-bold' : 'font-normal'
                }`}
              >
                Formatcetak
              </p>
              <div className="ml-2">
                {filters.sortBy === 'formatcetak' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'formatcetak' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="formatcetak"
                value={filters.filters.formatcetak || ''}
                onChange={(value) =>
                  handleFilterInputChange('formatcetak', value)
                }
                onClear={() => handleClearFilter('formatcetak')}
                inputRef={(el) => {
                  inputColRefs.current['formatcetak'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.formatcetak || '';
          const cellValue =
            props.row.formatcetak === null ||
            props.row.formatcetak === undefined
              ? ''
              : String(props.row.formatcetak);
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'marketing_id_text',
        name: 'Marketing',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="MARKETING"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('marketing_id_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'marketing_id_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Marketing
              </p>
              <div className="ml-2">
                {filters.sortBy === 'marketing_id_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'marketing_id_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="marketing_id_text"
                value={filters.filters.marketing_id_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('marketing_id_text', value)
                }
                onClear={() => handleClearFilter('marketing_id_text')}
                inputRef={(el) => {
                  inputColRefs.current['marketing_id_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.marketing_id_text || '';
          const cellValue = props.row.marketing_id_text || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'blok',
        name: 'Blok',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="BLOK"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('blok')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'blok' ? 'font-bold' : 'font-normal'
                }`}
              >
                Blok
              </p>
              <div className="ml-2">
                {filters.sortBy === 'blok' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'blok' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="blok"
                value={filters.filters.blok || ''}
                onChange={(value) => handleFilterInputChange('blok', value)}
                onClear={() => handleClearFilter('blok')}
                inputRef={(el) => {
                  inputColRefs.current['blok'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.blok || '';
          const cellValue = props.row.blok || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'nomor',
        name: 'Nomor',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NOMOR"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nomor')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nomor' ? 'font-bold' : 'font-normal'
                }`}
              >
                Nomor
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nomor' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nomor' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nomor"
                value={filters.filters.nomor || ''}
                onChange={(value) => handleFilterInputChange('nomor', value)}
                onClear={() => handleClearFilter('nomor')}
                inputRef={(el) => {
                  inputColRefs.current['nomor'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nomor || '';
          const cellValue = props.row.nomor || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'rt',
        name: 'Rt',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="RT"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('rt')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'rt' ? 'font-bold' : 'font-normal'
                }`}
              >
                Rt
              </p>
              <div className="ml-2">
                {filters.sortBy === 'rt' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'rt' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="rt"
                value={filters.filters.rt || ''}
                onChange={(value) => handleFilterInputChange('rt', value)}
                onClear={() => handleClearFilter('rt')}
                inputRef={(el) => {
                  inputColRefs.current['rt'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.rt || '';
          const cellValue = props.row.rt || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'rw',
        name: 'Rw',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="RW"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('rw')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'rw' ? 'font-bold' : 'font-normal'
                }`}
              >
                Rw
              </p>
              <div className="ml-2">
                {filters.sortBy === 'rw' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'rw' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="rw"
                value={filters.filters.rw || ''}
                onChange={(value) => handleFilterInputChange('rw', value)}
                onClear={() => handleClearFilter('rw')}
                inputRef={(el) => {
                  inputColRefs.current['rw'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.rw || '';
          const cellValue = props.row.rw || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'kelurahan',
        name: 'Kelurahan',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="KELURAHAN"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('kelurahan')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kelurahan' ? 'font-bold' : 'font-normal'
                }`}
              >
                Kelurahan
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kelurahan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kelurahan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kelurahan"
                value={filters.filters.kelurahan || ''}
                onChange={(value) =>
                  handleFilterInputChange('kelurahan', value)
                }
                onClear={() => handleClearFilter('kelurahan')}
                inputRef={(el) => {
                  inputColRefs.current['kelurahan'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kelurahan || '';
          const cellValue = props.row.kelurahan || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'kabupaten',
        name: 'Kabupaten',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="KABUPATEN"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('kabupaten')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kabupaten' ? 'font-bold' : 'font-normal'
                }`}
              >
                Kabupaten
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kabupaten' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kabupaten' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kabupaten"
                value={filters.filters.kabupaten || ''}
                onChange={(value) =>
                  handleFilterInputChange('kabupaten', value)
                }
                onClear={() => handleClearFilter('kabupaten')}
                inputRef={(el) => {
                  inputColRefs.current['kabupaten'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kabupaten || '';
          const cellValue = props.row.kabupaten || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'kecamatan',
        name: 'Kecamatan',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="KECAMATAN"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('kecamatan')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kecamatan' ? 'font-bold' : 'font-normal'
                }`}
              >
                Kecamatan
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kecamatan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kecamatan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kecamatan"
                value={filters.filters.kecamatan || ''}
                onChange={(value) =>
                  handleFilterInputChange('kecamatan', value)
                }
                onClear={() => handleClearFilter('kecamatan')}
                inputRef={(el) => {
                  inputColRefs.current['kecamatan'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kecamatan || '';
          const cellValue = props.row.kecamatan || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'propinsi',
        name: 'Propinsi',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="PROPINSI"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('propinsi')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'propinsi' ? 'font-bold' : 'font-normal'
                }`}
              >
                Propinsi
              </p>
              <div className="ml-2">
                {filters.sortBy === 'propinsi' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'propinsi' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="propinsi"
                value={filters.filters.propinsi || ''}
                onChange={(value) => handleFilterInputChange('propinsi', value)}
                onClear={() => handleClearFilter('propinsi')}
                inputRef={(el) => {
                  inputColRefs.current['propinsi'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.propinsi || '';
          const cellValue = props.row.propinsi || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'isdpp10psn',
        name: 'Isdpp10psn',
        resizable: true,
        draggable: true,
        width: 130,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="ISDPP10PSN"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('isdpp10psn')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'isdpp10psn' ? 'font-bold' : 'font-normal'
                }`}
              >
                Isdpp10psn
              </p>
              <div className="ml-2">
                {filters.sortBy === 'isdpp10psn' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'isdpp10psn' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="isdpp10psn"
                value={filters.filters.isdpp10psn || ''}
                onChange={(value) =>
                  handleFilterInputChange('isdpp10psn', value)
                }
                onClear={() => handleClearFilter('isdpp10psn')}
                inputRef={(el) => {
                  inputColRefs.current['isdpp10psn'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.isdpp10psn || '';
          const cellValue =
            props.row.isdpp10psn === null ||
            props.row.isdpp10psn === undefined ||
            props.row.isdpp10psn === ''
              ? ''
              : formatCurrency(props.row.isdpp10psn);
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'usertracing',
        name: 'Usertracing',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="USERTRACING"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('usertracing')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'usertracing' ? 'font-bold' : 'font-normal'
                }`}
              >
                Usertracing
              </p>
              <div className="ml-2">
                {filters.sortBy === 'usertracing' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'usertracing' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="usertracing"
                value={filters.filters.usertracing || ''}
                onChange={(value) =>
                  handleFilterInputChange('usertracing', value)
                }
                onClear={() => handleClearFilter('usertracing')}
                inputRef={(el) => {
                  inputColRefs.current['usertracing'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.usertracing || '';
          const cellValue = props.row.usertracing || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'passwordtracing',
        name: 'Passwordtracing',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="PASSWORDTRACING"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('passwordtracing')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'passwordtracing'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Passwordtracing
              </p>
              <div className="ml-2">
                {filters.sortBy === 'passwordtracing' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'passwordtracing' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="passwordtracing"
                value={filters.filters.passwordtracing || ''}
                onChange={(value) =>
                  handleFilterInputChange('passwordtracing', value)
                }
                onClear={() => handleClearFilter('passwordtracing')}
                inputRef={(el) => {
                  inputColRefs.current['passwordtracing'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.passwordtracing || '';
          const cellValue = props.row.passwordtracing || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'kodeprospek',
        name: 'Kodeprospek',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="KODEPROSPEK"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('kodeprospek')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kodeprospek' ? 'font-bold' : 'font-normal'
                }`}
              >
                Kodeprospek
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kodeprospek' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kodeprospek' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kodeprospek"
                value={filters.filters.kodeprospek || ''}
                onChange={(value) =>
                  handleFilterInputChange('kodeprospek', value)
                }
                onClear={() => handleClearFilter('kodeprospek')}
                inputRef={(el) => {
                  inputColRefs.current['kodeprospek'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kodeprospek || '';
          const cellValue = props.row.kodeprospek || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'namashipperprospek',
        name: 'Namashipperprospek',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NAMASHIPPERPROSPEK"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('namashipperprospek')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'namashipperprospek'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Namashipperprospek
              </p>
              <div className="ml-2">
                {filters.sortBy === 'namashipperprospek' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'namashipperprospek' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="namashipperprospek"
                value={filters.filters.namashipperprospek || ''}
                onChange={(value) =>
                  handleFilterInputChange('namashipperprospek', value)
                }
                onClear={() => handleClearFilter('namashipperprospek')}
                inputRef={(el) => {
                  inputColRefs.current['namashipperprospek'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.namashipperprospek || '';
          const cellValue = props.row.namashipperprospek || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'emaildelay',
        name: 'Emaildelay',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="EMAILDELAY"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('emaildelay')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'emaildelay' ? 'font-bold' : 'font-normal'
                }`}
              >
                Emaildelay
              </p>
              <div className="ml-2">
                {filters.sortBy === 'emaildelay' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'emaildelay' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="emaildelay"
                value={filters.filters.emaildelay || ''}
                onChange={(value) =>
                  handleFilterInputChange('emaildelay', value)
                }
                onClear={() => handleClearFilter('emaildelay')}
                inputRef={(el) => {
                  inputColRefs.current['emaildelay'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.emaildelay || '';
          const cellValue = props.row.emaildelay || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'keterangan1barisinvoice',
        name: 'Keterangan1barisinvoice',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="KETERANGAN1BARISINVOICE"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('keterangan1barisinvoice')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'keterangan1barisinvoice'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Keterangan1barisinvoice
              </p>
              <div className="ml-2">
                {filters.sortBy === 'keterangan1barisinvoice' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'keterangan1barisinvoice' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="keterangan1barisinvoice"
                value={filters.filters.keterangan1barisinvoice || ''}
                onChange={(value) =>
                  handleFilterInputChange('keterangan1barisinvoice', value)
                }
                onClear={() => handleClearFilter('keterangan1barisinvoice')}
                inputRef={(el) => {
                  inputColRefs.current['keterangan1barisinvoice'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.keterangan1barisinvoice || '';
          const cellValue = props.row.keterangan1barisinvoice || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'nik',
        name: 'Nik',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NIK"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nik')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nik' ? 'font-bold' : 'font-normal'
                }`}
              >
                Nik
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nik' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nik' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nik"
                value={filters.filters.nik || ''}
                onChange={(value) => handleFilterInputChange('nik', value)}
                onClear={() => handleClearFilter('nik')}
                inputRef={(el) => {
                  inputColRefs.current['nik'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nik || '';
          const cellValue = props.row.nik || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'namaparaf',
        name: 'Namaparaf',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NAMAPARAF"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('namaparaf')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'namaparaf' ? 'font-bold' : 'font-normal'
                }`}
              >
                Namaparaf
              </p>
              <div className="ml-2">
                {filters.sortBy === 'namaparaf' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'namaparaf' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="namaparaf"
                value={filters.filters.namaparaf || ''}
                onChange={(value) =>
                  handleFilterInputChange('namaparaf', value)
                }
                onClear={() => handleClearFilter('namaparaf')}
                inputRef={(el) => {
                  inputColRefs.current['namaparaf'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.namaparaf || '';
          const cellValue = props.row.namaparaf || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'saldopiutang',
        name: 'Saldopiutang',
        resizable: true,
        draggable: true,
        width: 130,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="SALDOPIUTANG"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('saldopiutang')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'saldopiutang'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Saldopiutang
              </p>
              <div className="ml-2">
                {filters.sortBy === 'saldopiutang' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'saldopiutang' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="saldopiutang"
                value={filters.filters.saldopiutang || ''}
                onChange={(value) =>
                  handleFilterInputChange('saldopiutang', value)
                }
                onClear={() => handleClearFilter('saldopiutang')}
                inputRef={(el) => {
                  inputColRefs.current['saldopiutang'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.saldopiutang || '';
          const cellValue =
            props.row.saldopiutang === null ||
            props.row.saldopiutang === undefined ||
            props.row.saldopiutang === ''
              ? ''
              : formatCurrency(props.row.saldopiutang);
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'keteranganshipperjobminus',
        name: 'Keteranganshipperjobminus',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="KETERANGANSHIPPERJOBMINUS"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('keteranganshipperjobminus')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'keteranganshipperjobminus'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Keteranganshipperjobminus
              </p>
              <div className="ml-2">
                {filters.sortBy === 'keteranganshipperjobminus' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'keteranganshipperjobminus' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="keteranganshipperjobminus"
                value={filters.filters.keteranganshipperjobminus || ''}
                onChange={(value) =>
                  handleFilterInputChange('keteranganshipperjobminus', value)
                }
                onClear={() => handleClearFilter('keteranganshipperjobminus')}
                inputRef={(el) => {
                  inputColRefs.current['keteranganshipperjobminus'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.keteranganshipperjobminus || '';
          const cellValue = props.row.keteranganshipperjobminus || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'tglemailshipperjobminus',
        name: 'Tglemailshipperjobminus',
        resizable: true,
        draggable: true,
        width: 130,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="TGLEMAILSHIPPERJOBMINUS"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('tglemailshipperjobminus')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tglemailshipperjobminus'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Tglemailshipperjobminus
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tglemailshipperjobminus' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tglemailshipperjobminus' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tglemailshipperjobminus"
                value={filters.filters.tglemailshipperjobminus || ''}
                onChange={(value) =>
                  handleFilterInputChange('tglemailshipperjobminus', value)
                }
                onClear={() => handleClearFilter('tglemailshipperjobminus')}
                inputRef={(el) => {
                  inputColRefs.current['tglemailshipperjobminus'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tglemailshipperjobminus || '';
          const cellValue = props.row.tglemailshipperjobminus || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'tgllahir',
        name: 'Tgllahir',
        resizable: true,
        draggable: true,
        width: 130,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="TGLLAHIR"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('tgllahir')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tgllahir' ? 'font-bold' : 'font-normal'
                }`}
              >
                Tgllahir
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tgllahir' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tgllahir' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tgllahir"
                value={filters.filters.tgllahir || ''}
                onChange={(value) => handleFilterInputChange('tgllahir', value)}
                onClear={() => handleClearFilter('tgllahir')}
                inputRef={(el) => {
                  inputColRefs.current['tgllahir'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tgllahir || '';
          const cellValue = props.row.tgllahir || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'idshipperasal_text',
        name: 'Idshipperasal',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="IDSHIPPERASAL"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('idshipperasal_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'idshipperasal_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Idshipperasal
              </p>
              <div className="ml-2">
                {filters.sortBy === 'idshipperasal_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'idshipperasal_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="idshipperasal_text"
                value={filters.filters.idshipperasal_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('idshipperasal_text', value)
                }
                onClear={() => handleClearFilter('idshipperasal_text')}
                inputRef={(el) => {
                  inputColRefs.current['idshipperasal_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.idshipperasal_text || '';
          const cellValue = props.row.idshipperasal_text || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'initial',
        name: 'Initial',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="INITIAL"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('initial')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'initial' ? 'font-bold' : 'font-normal'
                }`}
              >
                Initial
              </p>
              <div className="ml-2">
                {filters.sortBy === 'initial' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'initial' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="initial"
                value={filters.filters.initial || ''}
                onChange={(value) => handleFilterInputChange('initial', value)}
                onClear={() => handleClearFilter('initial')}
                inputRef={(el) => {
                  inputColRefs.current['initial'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.initial || '';
          const cellValue = props.row.initial || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'tipe',
        name: 'Tipe',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="TIPE"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('tipe')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tipe' ? 'font-bold' : 'font-normal'
                }`}
              >
                Tipe
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tipe' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tipe' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tipe"
                value={filters.filters.tipe || ''}
                onChange={(value) => handleFilterInputChange('tipe', value)}
                onClear={() => handleClearFilter('tipe')}
                inputRef={(el) => {
                  inputColRefs.current['tipe'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tipe || '';
          const cellValue = props.row.tipe || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'idtipe',
        name: 'Idtipe',
        resizable: true,
        draggable: true,
        width: 130,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="IDTIPE"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('idtipe')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'idtipe' ? 'font-bold' : 'font-normal'
                }`}
              >
                Idtipe
              </p>
              <div className="ml-2">
                {filters.sortBy === 'idtipe' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'idtipe' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="idtipe"
                value={filters.filters.idtipe || ''}
                onChange={(value) => handleFilterInputChange('idtipe', value)}
                onClear={() => handleClearFilter('idtipe')}
                inputRef={(el) => {
                  inputColRefs.current['idtipe'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.idtipe || '';
          const cellValue =
            props.row.idtipe === null || props.row.idtipe === undefined
              ? ''
              : String(props.row.idtipe);
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'idinitial',
        name: 'Idinitial',
        resizable: true,
        draggable: true,
        width: 130,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="IDINITIAL"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('idinitial')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'idinitial' ? 'font-bold' : 'font-normal'
                }`}
              >
                Idinitial
              </p>
              <div className="ml-2">
                {filters.sortBy === 'idinitial' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'idinitial' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="idinitial"
                value={filters.filters.idinitial || ''}
                onChange={(value) =>
                  handleFilterInputChange('idinitial', value)
                }
                onClear={() => handleClearFilter('idinitial')}
                inputRef={(el) => {
                  inputColRefs.current['idinitial'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.idinitial || '';
          const cellValue =
            props.row.idinitial === null || props.row.idinitial === undefined
              ? ''
              : String(props.row.idinitial);
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'nshipperprospek',
        name: 'Nshipperprospek',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NSHIPPERPROSPEK"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nshipperprospek')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nshipperprospek'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Nshipperprospek
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nshipperprospek' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nshipperprospek' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nshipperprospek"
                value={filters.filters.nshipperprospek || ''}
                onChange={(value) =>
                  handleFilterInputChange('nshipperprospek', value)
                }
                onClear={() => handleClearFilter('nshipperprospek')}
                inputRef={(el) => {
                  inputColRefs.current['nshipperprospek'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nshipperprospek || '';
          const cellValue = props.row.nshipperprospek || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'parentshipper_id_text',
        name: 'Parentshipper',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="PARENTSHIPPER"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('parentshipper_id_text')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'parentshipper_id_text'
                    ? 'font-bold'
                    : 'font-normal'
                }`}
              >
                Parentshipper
              </p>
              <div className="ml-2">
                {filters.sortBy === 'parentshipper_id_text' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'parentshipper_id_text' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="parentshipper_id_text"
                value={filters.filters.parentshipper_id_text || ''}
                onChange={(value) =>
                  handleFilterInputChange('parentshipper_id_text', value)
                }
                onClear={() => handleClearFilter('parentshipper_id_text')}
                inputRef={(el) => {
                  inputColRefs.current['parentshipper_id_text'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.parentshipper_id_text || '';
          const cellValue = props.row.parentshipper_id_text || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'npwpnik',
        name: 'Npwpnik',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NPWPNIK"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('npwpnik')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'npwpnik' ? 'font-bold' : 'font-normal'
                }`}
              >
                Npwpnik
              </p>
              <div className="ml-2">
                {filters.sortBy === 'npwpnik' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'npwpnik' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="npwpnik"
                value={filters.filters.npwpnik || ''}
                onChange={(value) => handleFilterInputChange('npwpnik', value)}
                onClear={() => handleClearFilter('npwpnik')}
                inputRef={(el) => {
                  inputColRefs.current['npwpnik'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.npwpnik || '';
          const cellValue = props.row.npwpnik || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'nitku',
        name: 'Nitku',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="NITKU"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nitku')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nitku' ? 'font-bold' : 'font-normal'
                }`}
              >
                Nitku
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nitku' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'nitku' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="nitku"
                value={filters.filters.nitku || ''}
                onChange={(value) => handleFilterInputChange('nitku', value)}
                onClear={() => handleClearFilter('nitku')}
                inputRef={(el) => {
                  inputColRefs.current['nitku'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nitku || '';
          const cellValue = props.row.nitku || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'kodepajak',
        name: 'Kodepajak',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="KODEPAJAK"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('kodepajak')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kodepajak' ? 'font-bold' : 'font-normal'
                }`}
              >
                Kodepajak
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kodepajak' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'kodepajak' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="kodepajak"
                value={filters.filters.kodepajak || ''}
                onChange={(value) =>
                  handleFilterInputChange('kodepajak', value)
                }
                onClear={() => handleClearFilter('kodepajak')}
                inputRef={(el) => {
                  inputColRefs.current['kodepajak'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kodepajak || '';
          const cellValue = props.row.kodepajak || '';
          return (
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'statusaktif',
        name: 'Statusaktif',
        resizable: true,
        draggable: true,
        width: 90,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div
            title="STATUSAKTIF"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
            <div
              className="headers-cell h-[50%] px-8"
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
                Statusaktif
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
                selectedValue={filters.filters.statusaktif}
                onChange={(value) =>
                  handleFilterInputChange('statusaktif', value)
                } // Menangani perubahan nilai di parent
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const memoData = props.row.statusaktif_memo
            ? JSON.parse(props.row.statusaktif_memo)
            : null;
          if (memoData) {
            return (
              <div
                title={String(memoData.MEMO ?? '').toUpperCase()}
                className="flex h-full w-full items-center justify-center py-1"
              >
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
                  <p style={{ fontSize: '13px', color: memoData.WARNATULISAN }}>
                    {memoData.SINGKATAN}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div title="N/A" className="text-xs text-gray-500">
              N/A
            </div>
          ); // Tampilkan 'N/A' jika memo tidak tersedia
        }
      },

      {
        key: 'modifiedby',
        name: 'Modified By',
        resizable: true,
        draggable: true,

        headerCellClass: 'column-headers',

        width: 100,
        renderHeaderCell: (column: any) => (
          <div
            title="MODIFIED BY"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
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
                MODIFIED BY
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
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
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
        width: 170,
        renderHeaderCell: (column: any) => (
          <div
            title="CREATED AT"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
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
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
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

        width: 170,
        renderHeaderCell: (column: any) => (
          <div
            title="UPDATED AT"
            className="flex h-full cursor-pointer flex-col items-center gap-1"
          >
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
            <div
              title={String(cellValue).toUpperCase()}
              className="m-0 flex h-full cursor-pointer items-center p-0 text-sm"
            >
              {highlightText(cellValue, filters.search, columnFilter)}
            </div>
          );
        }
      }
    ];
  }, [filters, checkedRows, isAllSelected, rows, minVisiblePage]);

  const pendingUpdates = useRef<Record<string, string>>({});

  const debouncedFilterUpdate = useRef(
    debounce((updates: Record<string, string>) => {
      // buffer hanya berisi update yang belum di-flush
      pendingUpdates.current = {};
      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, ...updates },
        search: '',
        page: 1
      }));
      setCheckedRows(new Set());
      setIsAllSelected(false);
      setRows([]);
      setCurrentPage(1);
      setSelectedRow(0);
      resetBufferingCache();
      // gridRef?.current?.scrollToCell?.({ rowIdx: 0, idx: 0 });
    }, 300)
  ).current;

  const discardPendingFilterUpdates = () => {
    debouncedFilterUpdate.cancel();
    pendingUpdates.current = {};
  };

  const handleFilterInputChange = useCallback(
    (colKey: string, value: string) => {
      setInputValue(''); // Reset global search input saat filter kolom diubah
      cancelPreviousRequest(abortControllerRef);
      pendingUpdates.current[colKey] = value;

      // ✅ Hanya track jika activeElement memang filter input kolom ini
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.classList.contains('filter-input') ||
          active.tagName === 'INPUT') &&
        active !== inputRef.current // bukan global search
      ) {
        activeFilterInputRef.current = active;
      }

      const originalIndex = columns.findIndex((col) => col.key === colKey);
      const displayIndex =
        columnsOrder.length > 0
          ? columnsOrder.findIndex((idx) => idx === originalIndex)
          : originalIndex;
      pendingSelectIdxRef.current = displayIndex >= 0 ? displayIndex : 1;

      debouncedFilterUpdate(pendingUpdates.current);
    },
    [columns, columnsOrder]
  );
  const handleClearFilter = useCallback((colKey: string) => {
    cancelPreviousRequest(abortControllerRef);
    debouncedFilterUpdate.flush();

    // ✅ Arahkan ke kolom yang di-clear
    const originalIndex = columns.findIndex((col) => col.key === colKey);
    const displayIndex =
      columnsOrder.length > 0
        ? columnsOrder.findIndex((idx) => idx === originalIndex)
        : originalIndex;
    pendingSelectIdxRef.current = displayIndex >= 0 ? displayIndex : 1;

    setFilters((prev) => ({
      ...prev,
      filters: { ...prev.filters, [colKey]: '' },
      page: 1
    }));
    setCheckedRows(new Set());
    setIsAllSelected(false);
    setRows([]);
    setCurrentPage(1);
    resetBufferingCache();
  }, []);

  const { clearError } = useFormError();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelPreviousRequest(abortControllerRef);
    discardPendingFilterUpdates();
    const searchValue = e.target.value;

    // ✅ Track global search input agar focus bisa di-restore
    activeFilterInputRef.current = inputRef.current;
    pendingSelectIdxRef.current = 1;

    setInputValue(searchValue);
    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      filters: {
        statusrelasi_text: '',
        relasi_id_text: '',
        nama: '',
        keterangan: '',
        contactperson: '',
        alamat: '',
        coa: '',
        coapiutang: '',
        coahutang: '',
        kota: '',
        kodepos: '',
        telp: '',
        email: '',
        fax: '',
        web: '',
        creditlimit: '',
        creditterm: '',
        credittermplus: '',
        npwp: '',
        coagiro: '',
        ppn: '',
        titipke: '',
        ppnbatalmuat: '',
        grup: '',
        formatdeliveryreport: '',
        comodity: '',
        namashippercetak: '',
        formatcetak: '',
        marketing_id_text: '',
        blok: '',
        nomor: '',
        rt: '',
        rw: '',
        kelurahan: '',
        kabupaten: '',
        kecamatan: '',
        propinsi: '',
        isdpp10psn: '',
        usertracing: '',
        passwordtracing: '',
        kodeprospek: '',
        namashipperprospek: '',
        emaildelay: '',
        keterangan1barisinvoice: '',
        nik: '',
        namaparaf: '',
        saldopiutang: '',
        keteranganshipperjobminus: '',
        tglemailshipperjobminus: '',
        tgllahir: '',
        idshipperasal_text: '',
        initial: '',
        tipe: '',
        idtipe: '',
        idinitial: '',
        nshipperprospek: '',
        parentshipper_id_text: '',
        npwpnik: '',
        nitku: '',
        kodepajak: '',
        created_at: '',
        updated_at: '',
        statusaktif: '',
        modifiedby: ''
      },
      search: searchValue,
      page: 1
    }));

    setCheckedRows(new Set());
    setIsAllSelected(false);
    resetBufferingCache();
    setSelectedRow(0);
    setCurrentPage(1);
    setRows([]);
  };

  const handleSort = (column: string) => {
    const originalIndex = columns.findIndex((col) => col.key === column);

    const displayIndex =
      columnsOrder.length > 0
        ? columnsOrder.findIndex((idx) => idx === originalIndex)
        : originalIndex;

    activeFilterInputRef.current = null; // ✅ Sort bukan dari input, tidak perlu restore focus
    pendingSelectIdxRef.current = displayIndex >= 0 ? displayIndex : 1;

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
    resetBufferingCache();
    setTimeout(() => {
      gridRef?.current?.scrollToCell({ rowIdx: 0, idx: displayIndex });
    }, 200);
    setSelectedRow(0);
    setCurrentPage(1);
    setFetchedPages(new Set([1]));
    setRows([]);
  };

  const handleRowSelect = (rowId: string) => {
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
    cancelPreviousRequest(abortControllerRef);
    discardPendingFilterUpdates();
    activeFilterInputRef.current = null;
    pendingSelectIdxRef.current = 1; // ✅ Reset ke default idx 1
    setFilters((prev) => ({
      ...prev,
      filters: {
        ...prev.filters
      },
      search: '',
      page: 1
    }));
    setCheckedRows(new Set());
    setIsAllSelected(false);
    setRows([]);
    setCurrentPage(1);
    resetBufferingCache();
    gridRef?.current?.scrollToCell?.({ rowIdx: 0, idx: 0 });
    setInputValue('');
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
        String(user?.id),
        'GridShipper',
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
        String(user?.id),
        'GridShipper',
        [...newOrder],
        columnsWidth
      );
      return newOrder;
    });
  };

  async function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (isLoadingShipper || rows.length === 0 || isTransitioning || isFetching)
      return;

    const { currentTarget } = event;
    const scrollTop = currentTarget.scrollTop;
    const scrollHeight = currentTarget.scrollHeight;
    const clientHeight = currentTarget.clientHeight;

    const hasScrolled = Math.abs(scrollTop - lastScrollTopRef.current) > 5;
    if (!hasScrolled) {
      return;
    }

    lastScrollTopRef.current = scrollTop;
    isScrollingRef.current = true;
    setIsScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      setIsScrolling(false);
    }, 150);

    scrollPositionRef.current = scrollTop;
    scrollContainerRef.current = currentTarget;

    const rowHeight = 27; // Mengikuti rowHeight grid prospek
    const firstVisibleRow = Math.floor(scrollTop / rowHeight);
    const lastVisibleRow = Math.floor((scrollTop + clientHeight) / rowHeight);

    const THRESHOLD_ROWS = 50;

    // SCROLL KE BAWAH
    const rowsRemainingBelow = rows.length - lastVisibleRow;

    if (rowsRemainingBelow <= THRESHOLD_ROWS) {
      const maxPage = Math.max(...visiblePages);
      const nextPage = maxPage + 1;

      if (nextPage <= totalPages && !isFetching && isScrollingRef.current) {
        if (streamBufferRef.current.has(nextPage)) {
          // ✅ DATA ADA DI BUFFER — langsung masuk tanpa loading!
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;

          const bufferedData = streamBufferRef.current.get(nextPage)!;

          // Pindahkan dari buffer ke pageDataCache
          setPageDataCache((prev) => {
            const updated = new Map(prev);
            updated.set(nextPage, bufferedData);
            return updated;
          });

          // Hapus dari buffer (sudah masuk ke visible cache)
          streamBufferRef.current = new Map(streamBufferRef.current);
          streamBufferRef.current.delete(nextPage);

          // Update visiblePages (geser window)
          isPageTransitionRef.current = true;
          pendingScrollAdjustment.current = -(filters.limit * ROW_HEIGHT);
          shiftSelectionForWindow(-filters.limit);
          setVisiblePages((prevVisible) => {
            const removedPage = prevVisible[0];
            const newPages = [...prevVisible.slice(1), nextPage];

            setPageDataCache((prev) => {
              const updated = new Map(prev);
              updated.delete(removedPage); // Langsung hapus total dari memori
              return updated;
            });

            return newPages;
          });

          // Update totalPages jika perlu (dari cache tidak ada pagination data,
          // jadi kita biarkan dari fetch terakhir)

          setTimeout(() => {
            setIsTransitioning(false);
            setIsFetching(false);
          }, 50); // Lebih cepat karena tidak ada network latency

          // Prefetch page berikutnya di background
          const pagesToPrefetch = Array.from(
            { length: STREAM_BUFFER_SIZE },
            (_, i) => nextPage + 1 + i
          );
          prefetchPages(pagesToPrefetch);
        } else if (!pageDataCache.has(nextPage)) {
          // ⚠️ Buffer miss — fallback ke fetch normal
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;
          setCurrentPage(nextPage);
        }
      }
    }

    // SCROLL KE ATAS
    if (firstVisibleRow <= THRESHOLD_ROWS) {
      const minPage = Math.min(...visiblePages);
      const prevPage = minPage - 1;

      if (prevPage >= 1 && !isFetching && isScrollingRef.current) {
        if (streamBufferRef.current.has(prevPage)) {
          // ✅ DATA ADA DI BUFFER — langsung masuk tanpa loading!
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
            const removedPage = prevVisible[4];
            const newPages = [prevPage, ...prevVisible.slice(0, 4)];

            setPageDataCache((prev) => {
              const updated = new Map(prev);
              updated.delete(removedPage); // Langsung hapus total dari memori
              return updated;
            });

            return newPages;
          });

          setTimeout(() => {
            setIsTransitioning(false);
            setIsFetching(false);
          }, 50);

          // Prefetch page sebelumnya di background
          const pagesToPrefetch = Array.from(
            { length: STREAM_BUFFER_SIZE },
            (_, i) => prevPage - 1 - i
          ).filter((p) => p >= 1);
          prefetchPages(pagesToPrefetch);
        } else if (!pageDataCache.has(prevPage)) {
          // ⚠️ Buffer miss — fallback ke fetch normal
          setIsFetching(true);
          setIsTransitioning(true);
          hasAdjustedScrollRef.current = false;
          // Reset ke 0 dulu agar setCurrentPage(prevPage) pasti trigger re-fetch
          // even jika prevPage == currentPage (stale value)
          setCurrentPage(0);
          setTimeout(() => setCurrentPage(prevPage), 0);
        }
      }
    }
  }

  function handleCellClick(args: { row: IShipper }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
    }
  }
  const orderedColumns = useMemo(() => {
    if (Array.isArray(columnsOrder) && columnsOrder.length > 0) {
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
  const moveSelectionBy = useCallback(
    (delta: number, focusBackTo?: HTMLElement | null) => {
      if (rows.length === 0) return;

      // Navigasi via input filter/search = modalitas keyboard.
      interactionModeRef.current = 'keyboard';

      const nextRow = Math.min(
        Math.max(selectedRowRef.current + delta, 0),
        rows.length - 1
      );
      selectedRowRef.current = nextRow;

      const idxFromKey = finalColumns.findIndex(
        (c) => c.key === selectedCellKey
      );
      const idx = idxFromKey >= 0 ? idxFromKey : 0;

      // Pindahkan selected cell bawaan grid (untuk ArrowLeft/ArrowRight) + tetap jaga input tetap fokus
      gridRef.current?.scrollToCell?.({ rowIdx: nextRow, idx });
      gridRef.current?.selectCell?.({ rowIdx: nextRow, idx });

      if (focusBackTo && typeof window !== 'undefined') {
        const start =
          focusBackTo instanceof HTMLInputElement
            ? focusBackTo.selectionStart
            : null;
        const end =
          focusBackTo instanceof HTMLInputElement
            ? focusBackTo.selectionEnd
            : null;

        window.requestAnimationFrame(() => {
          if (!document.contains(focusBackTo)) return;
          focusBackTo.focus({ preventScroll: true });
          if (
            focusBackTo instanceof HTMLInputElement &&
            start !== null &&
            end !== null
          ) {
            focusBackTo.setSelectionRange(start, end);
          }
        });
      }
    },
    [rows.length, finalColumns, selectedCellKey]
  );

  const moveSelectionColumnBy = useCallback(
    (delta: number, focusBackTo?: HTMLElement | null) => {
      if (rows.length === 0) return;
      if (finalColumns.length === 0) return;

      const currentIdxFromKey = finalColumns.findIndex(
        (c) => c.key === selectedCellKey
      );
      const currentIdx = currentIdxFromKey >= 0 ? currentIdxFromKey : 0;

      const nextIdx = Math.min(
        Math.max(currentIdx + delta, 0),
        finalColumns.length - 1
      );

      const nextKey = finalColumns[nextIdx]?.key;
      if (nextKey) setSelectedCellKey(String(nextKey));

      const rowIdx = Math.min(
        Math.max(selectedRowRef.current, 0),
        rows.length - 1
      );

      gridRef.current?.scrollToCell?.({ rowIdx, idx: nextIdx });
      gridRef.current?.selectCell?.({ rowIdx, idx: nextIdx });

      if (focusBackTo && typeof window !== 'undefined') {
        const start =
          focusBackTo instanceof HTMLInputElement
            ? focusBackTo.selectionStart
            : null;
        const end =
          focusBackTo instanceof HTMLInputElement
            ? focusBackTo.selectionEnd
            : null;

        window.requestAnimationFrame(() => {
          if (!document.contains(focusBackTo)) return;
          focusBackTo.focus({ preventScroll: true });
          if (
            focusBackTo instanceof HTMLInputElement &&
            start !== null &&
            end !== null
          ) {
            focusBackTo.setSelectionRange(start, end);
          }
        });
      }
    },
    [rows.length, finalColumns, selectedCellKey]
  );
  const selectColumnEdge = useCallback(
    (edge: 'first' | 'last', focusBackTo?: HTMLElement | null) => {
      if (rows.length === 0) return;
      if (finalColumns.length === 0) return;

      const nextIdx = edge === 'first' ? 0 : finalColumns.length - 1;
      const nextKey = finalColumns[nextIdx]?.key;
      if (nextKey) setSelectedCellKey(String(nextKey));

      const rowIdx = Math.min(
        Math.max(selectedRowRef.current, 0),
        rows.length - 1
      );

      gridRef.current?.scrollToCell?.({ rowIdx, idx: nextIdx });
      gridRef.current?.selectCell?.({ rowIdx, idx: nextIdx });

      if (focusBackTo && typeof window !== 'undefined') {
        const start =
          focusBackTo instanceof HTMLInputElement
            ? focusBackTo.selectionStart
            : null;
        const end =
          focusBackTo instanceof HTMLInputElement
            ? focusBackTo.selectionEnd
            : null;

        window.requestAnimationFrame(() => {
          if (!document.contains(focusBackTo)) return;
          focusBackTo.focus({ preventScroll: true });
          if (
            focusBackTo instanceof HTMLInputElement &&
            start !== null &&
            end !== null
          ) {
            focusBackTo.setSelectionRange(start, end);
          }
        });
      }
    },
    [rows.length, finalColumns]
  );
  const handleGoToFirstPage = useCallback(() => {
    jumpToFirstRef.current = true;
    setRows([]);
    setCurrentPage(1);
    resetBufferingCache();
  }, []);

  const handleGoToLastPage = useCallback(async () => {
    if (totalPages < 1) return;

    jumpToLastRef.current = true;
    setRows([]);

    // Jika total halaman <= WINDOW_SIZE, semua halaman muat di satu bulk window
    // pertama — pakai bulk-fetch normal (lebih efisien: 1 request).
    if (totalPages <= WINDOW_SIZE) {
      resetBufferingCache();
      return;
    }

    // Kasus umum: WINDOW_SIZE halaman terakhir TIDAK selalu sejajar dengan
    // batas bulk block (mis. totalPages=23, WINDOW_SIZE=5 -> butuh halaman
    // 19..23, sementara bulk block hanya {1-5,6-10,11-15,16-20,21-25}). Jadi
    // fetch tiap halaman terakhir secara langsung lalu rakit cache & window.
    setIsFetching(true);
    setShouldBulkFetch(false);
    setBulkStartPage(1);
    setPageDataCache(new Map());
    streamBufferRef.current = new Map();
    prefetchingPagesRef.current = new Set();

    const startPage = totalPages - WINDOW_SIZE + 1;
    const pagesToFetch = Array.from(
      { length: WINDOW_SIZE },
      (_, i) => startPage + i
    );

    try {
      const results = await Promise.all(
        pagesToFetch.map((p) =>
          getShipperFn({ ...filters, page: p, limit: filters.limit })
        )
      );

      const newCache = new Map<number, IShipper[]>();
      results.forEach((res, i) => {
        if (res?.data && res.data.length > 0) {
          newCache.set(pagesToFetch[i], res.data);
        }
      });

      setPageDataCache(newCache);
      setVisiblePages(pagesToFetch);
      setCurrentPage(totalPages);
    } catch (err) {
      console.error('Failed to load last pages:', err);
    } finally {
      setIsFetching(false);
    }
  }, [totalPages, filters]);

  const handleGridInputNavigationKeyDownCapture = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      const target = event.target as HTMLElement | null;

      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'PageDown' ||
        event.key === 'PageUp'
      ) {
        interactionModeRef.current = 'keyboard';
      }

      if (event.ctrlKey && event.key === 'Home') {
        event.preventDefault();
        event.stopPropagation();
        handleGoToFirstPage();
        return;
      }

      if (event.ctrlKey && event.key === 'End') {
        event.preventDefault();
        event.stopPropagation();
        handleGoToLastPage();
        return;
      }

      const isFilterInput =
        target instanceof HTMLElement &&
        target.classList.contains('filter-input');
      const isGlobalSearchInput =
        !!inputRef.current && target === inputRef.current;

      // Hanya handle key navigation dari input filter column & input search global
      if (!isFilterInput && !isGlobalSearchInput) return;

      const visibleRowCount = 8;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionBy(1, target);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionBy(-1, target);
      } else if (event.key === 'PageDown') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionBy(visibleRowCount, target);
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionBy(-visibleRowCount, target);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionColumnBy(1, target);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionColumnBy(-1, target);
      } else if (event.key === 'Home') {
        event.preventDefault();
        event.stopPropagation();
        selectColumnEdge('first', target);
      } else if (event.key === 'End') {
        event.preventDefault();
        event.stopPropagation();
        selectColumnEdge('last', target);
      }
    },
    [
      moveSelectionBy,
      moveSelectionColumnBy,
      selectColumnEdge,
      handleGoToFirstPage,
      handleGoToLastPage
    ]
  );

  // Reset form mode "add" ke nilai kosong.
  const resetAddForm = async () => {
    forms.reset({
      statusrelasi: '',
      statusrelasi_text: '',
      relasi_id: '',
      relasi_id_text: '',
      nama: '',
      keterangan: '',
      contactperson: '',
      alamat: '',
      coa: '',
      coapiutang: '',
      coahutang: '',
      kota: '',
      kodepos: '',
      telp: '',
      email: '',
      fax: '',
      web: '',
      creditlimit: '',
      creditterm: '',
      credittermplus: '',
      npwp: '',
      coagiro: '',
      ppn: '',
      titipke: '',
      ppnbatalmuat: '',
      grup: '',
      formatdeliveryreport: '',
      comodity: '',
      namashippercetak: '',
      formatcetak: '',
      marketing_id: '',
      marketing_id_text: '',
      blok: '',
      nomor: '',
      rt: '',
      rw: '',
      kelurahan: '',
      kabupaten: '',
      kecamatan: '',
      propinsi: '',
      isdpp10psn: '',
      usertracing: '',
      passwordtracing: '',
      kodeprospek: '',
      namashipperprospek: '',
      emaildelay: '',
      keterangan1barisinvoice: '',
      nik: '',
      namaparaf: '',
      saldopiutang: '',
      keteranganshipperjobminus: '',
      tglemailshipperjobminus: '',
      tgllahir: '',
      idshipperasal: '',
      idshipperasal_text: '',
      initial: '',
      tipe: '',
      idtipe: '',
      idinitial: '',
      nshipperprospek: '',
      parentshipper_id: '',
      parentshipper_id_text: '',
      npwpnik: '',
      nitku: '',
      kodepajak: '',
      statusaktif: '',
      statusaktif_text: ''
    });
  };

  const onSuccess = async (
    indexOnPage: number,
    fetchedPages: number[],
    pagedData: Record<string, IShipper[]>,
    pageNumber: number,
    keepOpenModal = false,
    focusId: string | null = null
  ) => {
    clearError();
    setIsFetchingManually(true);
    // Tandai baris baru agar Row Combiner memfokuskannya by-id setelah data
    // window settle (lihat pendingFocusIdRef). Lebih andal daripada selectCell
    // by-index yang bisa meleset saat window bergeser.
    pendingFocusIdRef.current = focusId ?? null;
    try {
      if (keepOpenModal) {
        // SAVE & ADD: reset form (isi ulang nilai default) lalu
        // remount modal via addFormKey agar semua LookUp re-init dari nilai
        // form. JANGAN dispatch setClearLookup di sini: pada mount, effect
        // clearLookup berjalan SETELAH init sehingga malah mengosongkan
        // tampilan status yang baru di-set.
        await resetAddForm();
        setAddFormKey((k) => k + 1);
        setPopOver(true);
      } else {
        dispatch(setClearLookup(true));
        forms.reset();
        setPopOver(false);
      }
      if (mode !== 'delete') {
        // Blokir data-effect memproses ulang hasil refetch pasca-mutasi selama
        // window settle, agar fokus by-id tidak tertimpa (fokus "lompat ke
        // baris 1"). Dibuka lagi via setTimeout di bawah.
        suppressRefetchRef.current = true;
        const response = await api2.get(
          `/redis/get/shipper-page-${pageNumber}`
        );
        setRows([]);
        setRows(response.data);
        // Fokus BERDASARKAN ID baris, bukan indexOnPage dari backend. Setelah
        // edit, posisi baris di data window yang dimuat bisa berbeda dari
        // hitungan index backend (mis. tie-break urutan nama) sehingga fokus
        // meleset. Cari index baris (add: newItem.id, edit: updatedItem.id)
        // langsung di data yang dimuat -> selalu tepat. Fallback ke indexOnPage
        // bila id tak ketemu.
        const loadedRows: IShipper[] = Array.isArray(response.data)
          ? response.data
          : [];
        const focusIdx =
          focusId != null
            ? loadedRows.findIndex((r) => String(r.id) === String(focusId))
            : -1;
        const targetIndex = focusIdx >= 0 ? focusIdx : indexOnPage;
        setIsDataUpdated(true);
        setVisiblePages(fetchedPages);
        setSelectedRow(targetIndex);
        setPageDataCache(
          new Map(
            Object.entries(pagedData).map(([key, value]) => [
              Number(key),
              value as IShipper[]
            ])
          )
        );
        setCurrentPage(pageNumber);

        const updatedBuffer = new Map(streamBufferRef.current);
        Object.entries(pagedData).forEach(([key, value]) => {
          updatedBuffer.set(Number(key), value as IShipper[]);
        });
        streamBufferRef.current = updatedBuffer;

        setTimeout(() => {
          gridRef?.current?.selectCell({
            rowIdx: targetIndex,
            idx: 1
          });
        }, 200);

        // Penahan fokus pasca-mutasi. setCurrentPage(pageNumber) memicu refetch
        // yang menjalankan Row Combiner lagi; karena pendingFocusIdRef sudah
        // dikonsumsi pada run pertama, cabang else-nya men-scroll ke baris 0
        // (gejala "edit selalu ke baris 1"). Re-assert id fokus beberapa kali
        // selama window settle agar SETIAP run Row Combiner (termasuk akibat
        // refetch) memfokuskan ulang baris yang benar by-id, lalu bersihkan
        // supaya tidak mengganggu navigasi berikutnya.
        if (focusId != null) {
          [120, 320, 620].forEach((d) =>
            setTimeout(() => {
              pendingFocusIdRef.current = String(focusId);
            }, d)
          );
          setTimeout(() => {
            if (String(pendingFocusIdRef.current) === String(focusId)) {
              pendingFocusIdRef.current = null;
            }
          }, 950);
        }

        // Buka blokir refetch setelah window settle. Karena ref, reset ini TIDAK
        // memicu ulang data-effect -> tidak ada clobber saat dibuka.
        setTimeout(() => {
          suppressRefetchRef.current = false;
        }, 1000);
      }

      setIsDataUpdated(false);
    } catch (error) {
      console.error('Error during onSuccess:', error);
      setIsFetchingManually(false);
      setIsDataUpdated(false);
    }
  };
  const onSubmit = async (values: ShipperInput, keepOpenModal = false) => {
    clearError();
    const selectedRowId = rows[selectedRow]?.id;
    try {
      dispatch(setProcessing());
      if (mode === 'delete') {
        if (selectedRowId) {
          await deleteShipper(selectedRowId as unknown as string, {
            onSuccess: () => {
              setPopOver(false);

              // 1. Remove from visible rows
              setRows((prevRows) =>
                prevRows.filter((row) => row.id !== selectedRowId)
              );

              // 2. Remove from pageDataCache (all pages)
              setPageDataCache((prevCache) => {
                const updated = new Map(prevCache);
                updated.forEach((pageRows, pageNum) => {
                  const filtered = pageRows.filter(
                    (row) => row.id !== selectedRowId
                  );
                  if (filtered.length !== pageRows.length) {
                    updated.set(pageNum, filtered);
                  }
                });
                return updated;
              });

              // 3. Remove from streamBuffer
              const newBuffer = new Map(streamBufferRef.current);
              newBuffer.forEach((pageRows, pageNum) => {
                const filtered = pageRows.filter(
                  (row) => row.id !== selectedRowId
                );
                if (filtered.length !== pageRows.length) {
                  newBuffer.set(pageNum, filtered);
                }
              });
              streamBufferRef.current = newBuffer;

              // 4. Fokus baris BERIKUTNYA (by-id). Setelah baris dihapus,
              // baris tepat di bawahnya naik mengisi slot yang sama -> itulah
              // yang difokuskan. Jika yang dihapus baris paling bawah window,
              // jatuh ke baris di atasnya. Pemfokusan dilakukan via
              // pendingFocusIdRef (BY-ID), bukan selectCell by-index: Row
              // Combiner jalan ulang setelah cache di-update, dan tanpa
              // pendingFocusIdRef cabang else-nya men-scroll & men-select balik
              // ke row 0 (lihat onSuccess add/edit yang memakai pola sama).
              const nextFocusRow =
                rows[selectedRow + 1] ?? rows[selectedRow - 1];
              if (nextFocusRow) {
                pendingFocusIdRef.current = String(nextFocusRow.id);
              } else {
                // Tidak ada baris tersisa pada window ini.
                setSelectedRow(0);
                selectedRowRef.current = 0;
              }
            }
          });
        }
        return;
      }
      if (mode === 'add') {
        const newOrder = await createShipper(
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
                data.pageNumber,
                keepOpenModal,
                data.newItem?.id ?? null
              )
          }
        );

        if (newOrder !== undefined && newOrder !== null) {
        }
        return;
      }
      if (selectedRowId && mode === 'edit') {
        await updateShipper(
          {
            id: selectedRowId as unknown as string,
            fields: { ...values, ...filters }
          },
          {
            onSuccess: (data: any) =>
              onSuccess(
                data.itemIndex,
                data.fetchedPages,
                data.pagedData,
                data.pageNumber,
                false,
                data.updatedItem?.id ?? null
              )
          }
        );
      }
    } catch (error: any) {
      if (error?.response?.status !== 400) {
        console.error(error);
      }
    } finally {
      dispatch(setProcessed());
    }
  };

  const handleEdit = () => {
    if (selectedRow !== null) {
      const rowData = rows[selectedRow];
      setPopOver(true);
      setMode('edit');
    }
  };
  const handleDelete = () => {
    if (selectedRow !== null) {
      setMode('delete');
      setPopOver(true);
    }
  };
  const handleView = () => {
    if (selectedRow !== null) {
      setMode('view');
      setPopOver(true);
    }
  };

  /**
   * Export Excel dijalankan di BACKEND (background job + socket), sama seperti
   * alur cetak laporan. Frontend hanya mengirim filter yang sedang aktif di
   * grid — filter kolom, search global, dan sort — lalu progresnya muncul di
   * toast. Setelah selesai, toast menampilkan tombol Download untuk menyimpan
   * file xlsx-nya.
   */
  const handleExportExcel = async () => {
    const { page, limit, ...filtersWithoutLimit } = filters;

    await generateExport({
      label: 'Export Shipper ',
      payload: {
        search: filtersWithoutLimit.search,
        filters: filtersWithoutLimit.filters,
        sortBy: filtersWithoutLimit.sortBy,
        sortDirection: filtersWithoutLimit.sortDirection
      },
      apiFn: generateShipperExportFn
    });
  };

  // Cetak juga di backend: progres di toast, PDF dibuka di modal viewer.
  const handleReport = async () => {
    await generateReport({
      label: 'Shipper ',
      payload: {
        mrtName: 'LaporanShipper.mrt',
        search: filters.search,
        filters: filters.filters,
        sortBy: filters.sortBy,
        sortDirection: filters.sortDirection,
        judullaporan: 'Laporan Shipper '
      },
      apiFn: generateShipperReportFn,
      // Tombol Export di viewer memakai filter grid yang sama.
      onExport: () => handleExportExcel()
    });
  };

  document.querySelectorAll('.column-headers').forEach((element) => {
    element.classList.remove('c1kqdw7y7-0-0-beta-47');
  });
  function getRowClass(row: IShipper) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: IShipper) {
    return row.id;
  }

  function EmptyRowsRenderer() {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ textAlign: 'center', gridColumn: '1/-1' }}
      >
        NO ROWS DATA FOUND
      </div>
    );
  }
  const handleResequence = () => {
    router.push('/dashboard/resequence');
  };
  function LoadRowsRenderer() {
    return (
      <div>
        <ImSpinner2 className="animate-spin text-3xl text-primary" />
      </div>
    );
  }
  const handleClose = () => {
    setPopOver(false);
    setMode('');
    clearError();
    forms.reset();
  };
  const handleAdd = async () => {
    try {
      setMode('add');
      // Fetch nilai default lalu reset SEBELUM buka modal, supaya lookupNama
      // (non-reaktif) sudah terisi saat LookUp pertama kali mount.
      await resetAddForm();
      setPopOver(true);
    } catch (error) {
      console.error('Error add shipper :', error);
    }
  };

  const prefetchPages = useCallback(
    async (
      pagesToFetch: number[],
      existingCache?: Map<number, IShipper[]>,
      knownTotalPages?: number
    ) => {
      const cacheToCheck = existingCache ?? pageDataCache;
      const effectiveTotalPages = knownTotalPages ?? totalPages; // ← pakai nilai fresh jika dikirim

      const validPages = pagesToFetch.filter(
        (p) =>
          p >= 1 &&
          p <= effectiveTotalPages &&
          !streamBufferRef.current.has(p) &&
          !cacheToCheck.has(p) &&
          !prefetchingPagesRef.current.has(p)
      );

      if (validPages.length === 0) return;

      // Tandai semua sebagai sedang di-fetch agar tidak dobel
      validPages.forEach((p) => prefetchingPagesRef.current.add(p));

      // Fetch semua secara paralel
      await Promise.allSettled(
        validPages.map(async (pageNum) => {
          try {
            const data = await getShipperFn({
              ...filters,
              page: pageNum,
              limit: filters.limit
            });

            if (data?.data && data.data.length > 0) {
              streamBufferRef.current = new Map(streamBufferRef.current);
              streamBufferRef.current.set(pageNum, data.data);
            }
          } catch (err) {
            // Silent fail — user tidak perlu tahu jika prefetch gagal
            console.warn(
              `[StreamBuffer] Prefetch page ${pageNum} failed:`,
              err
            );
          } finally {
            prefetchingPagesRef.current.delete(pageNum);
          }
        })
      );
    },
    [filters, totalPages, pageDataCache]
  );
  useEffect(() => {
    setIsFirstLoad(true);
  }, []);

  useEffect(() => {
    if (isFirstLoad && gridRef.current && rows.length > 0) {
      setSelectedRow(0);
      gridRef.current.selectCell({ rowIdx: 0, idx: 1 });
      setIsFirstLoad(false);
    }
  }, [rows, isFirstLoad]);
  useEffect(() => {
    if (user?.id) {
      loadGridConfig(
        String(user?.id),
        'GridShipper',
        columns,
        setColumnsOrder,
        setColumnsWidth
      );
    }
  }, [user]);

  useEffect(() => {
    if (isSubmitSuccessful) {
      // reset();
      // Pastikan fokus terjadi setelah repaint
      requestAnimationFrame(() => setFocus('nama'));
    }
  }, [isSubmitSuccessful, setFocus]);

  // 1. Bulk Fetch Initialization
  useEffect(() => {
    const handleBulkFetch = async () => {
      if (
        !shouldBulkFetch ||
        !allShipper ||
        isDataUpdated ||
        isAfterMutation ||
        // Selama settle pasca-mutasi (add/edit), jangan biarkan hasil refetch
        // membangun ulang cache — kalau tidak, Row Combiner jalan lagi setelah
        // pendingFocusIdRef dikonsumsi & fokus loncat ke baris 1. Effect #2
        // (Pagination Fetch) sudah punya guard yang sama.
        suppressRefetchRef.current
      ) {
        return;
      }

      const bulkData = allShipper.data || [];
      if (bulkData.length === 0) return;

      const pageSize = filters.limit;
      const newCache = new Map<number, IShipper[]>();
      const wasJumpingToLast = jumpToLastRef.current;

      const logicalStartPage = (bulkStartPage - 1) * WINDOW_SIZE + 1;
      for (let i = 0; i < WINDOW_SIZE; i++) {
        const pageNum = logicalStartPage + i;
        const startIdx = i * pageSize;
        const endIdx = startIdx + pageSize;
        const pageData = bulkData.slice(startIdx, endIdx);

        if (pageData.length > 0) {
          newCache.set(pageNum, pageData);
        }
      }

      setPageDataCache(newCache);
      setVisiblePages(
        Array.from({ length: WINDOW_SIZE }, (_, i) => logicalStartPage + i)
      );

      const totalItems = allShipper.pagination?.totalItems || 0;
      const totalPgs = Math.ceil(totalItems / filters.limit) || 1;

      setTotalPages(totalPgs);
      setHasMore(bulkData.length === filters.limit * WINDOW_SIZE);
      setShouldBulkFetch(false);
      setIsFirstLoad(false);
      setIsFetching(false);

      const lastLogicalPage = Math.min(
        logicalStartPage + WINDOW_SIZE - 1,
        totalPgs
      );
      const initialPrefetch = Array.from(
        { length: STREAM_BUFFER_SIZE },
        (_, i) => lastLogicalPage + 1 + i
      ).filter((p) => p <= totalPgs);

      if (initialPrefetch.length > 0) {
        prefetchPages(initialPrefetch, newCache, totalPgs);
      }

      if (wasJumpingToLast) {
        setCurrentPage(lastLogicalPage);
      }
    };
    handleBulkFetch();
  }, [
    allShipper,
    shouldBulkFetch,
    isDataUpdated,
    isAfterMutation,
    filters.limit,
    bulkStartPage
  ]);

  // 2. Pagination Fetch & Scroll Adjustment
  useEffect(() => {
    if (
      shouldBulkFetch ||
      isDataUpdated ||
      isAfterMutation ||
      suppressRefetchRef.current
    ) {
      return;
    }

    if (!allShipper) return;

    const newRows = allShipper.data || [];

    const scrollContainer = scrollContainerRef.current;
    const scrollBeforeUpdate = scrollContainer
      ? {
          scrollTop: scrollContainer.scrollTop,
          scrollHeight: scrollContainer.scrollHeight,
          clientHeight: scrollContainer.clientHeight
        }
      : null;

    setPageDataCache((prevCache) => {
      const newCache = new Map(prevCache);
      newCache.set(currentPage, newRows);
      return newCache;
    });

    isPageTransitionRef.current = true;
    const maxVisible = Math.max(...visiblePages);
    const minVisible = Math.min(...visiblePages);

    // --- SCROLL KE BAWAH ---
    if (currentPage > maxVisible && currentPage <= maxVisible + 1) {
      const removedPage = visiblePages[0];
      pendingScrollAdjustment.current = -(filters.limit * ROW_HEIGHT);
      // --- TAMBAHAN: Geser index selected ke atas agar data tetap menunjuk ke item yg sama ---
      shiftSelectionForWindow(-filters.limit);

      setPageDataCache((prev) => {
        const updated = new Map(prev);
        updated.delete(removedPage);
        return updated;
      });
      setVisiblePages((prevVisible) => [...prevVisible.slice(1), currentPage]);
    } else if (currentPage < minVisible && currentPage >= minVisible - 1) {
      // --- SCROLL KE ATAS ---
      const removedPage = visiblePages[visiblePages.length - 1];
      pendingScrollAdjustment.current = filters.limit * ROW_HEIGHT;
      // --- TAMBAHAN: Geser index selected ke bawah ---
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

    if (allShipper.pagination?.totalPages) {
      setTotalPages(allShipper.pagination.totalPages);
    }

    setHasMore(newRows.length === filters.limit);
    setPrevFilters(filters);

    setTimeout(() => {
      setIsTransitioning(false);
      setIsFetching(false);
      const maxVis = Math.max(...visiblePages);
      const minVis = Math.min(...visiblePages);

      // Tentukan arah: jika currentPage > maxVisible sebelumnya = scroll down, sebaliknya up
      const isScrollDown = currentPage >= maxVis;
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
  }, [
    allShipper,
    currentPage,
    filters,
    isDataUpdated,
    shouldBulkFetch,
    isAfterMutation
  ]);

  // 3. Row Combiner (Mapping cache to rows state)
  useEffect(() => {
    const combinedRows: IShipper[] = [];
    visiblePages?.forEach((page) => {
      const pageData = pageDataCache.get(page);
      if (pageData) combinedRows.push(...pageData);
    });

    if (combinedRows.length > 0) {
      const newMinPage = Math.min(...visiblePages);
      setRows(combinedRows);
      prevMinPageRef.current = newMinPage;
      prevRowsLengthRef.current = combinedRows.length;

      // --- Fokus baris yang baru disimpan (add/edit) BERDASARKAN ID ---
      // Backend mengembalikan window yang memuat baris baru; cari index-nya di
      // sini lalu scroll+select. Pakai posisi tengah window (idx 1 = kolom data
      // pertama) sehingga TIDAK kena THRESHOLD_ROWS handleScroll -> window tidak
      // bergeser -> fokus tidak meleset. `return` mencegah cabang else
      // men-scroll ke row 0 (yang memicu pergeseran window).
      if (pendingFocusIdRef.current != null) {
        const fid = pendingFocusIdRef.current;
        pendingFocusIdRef.current = null;
        const fidx = combinedRows.findIndex(
          (r) => String(r.id) === String(fid)
        );
        if (fidx >= 0) {
          selectedRowRef.current = fidx;
          setSelectedRow(fidx);
          setTimeout(() => {
            gridRef.current?.scrollToCell?.({ rowIdx: fidx, idx: 1 });
            gridRef.current?.selectCell?.({ rowIdx: fidx, idx: 1 });
          }, 50);
        }
        return;
      }

      if (jumpToFirstRef.current) {
        // Ctrl+Home — selalu idx 0
        jumpToFirstRef.current = false;
        setSelectedRow(0);
        setTimeout(() => {
          gridRef.current?.scrollToCell?.({ rowIdx: 0, idx: 0 });
          gridRef.current?.selectCell?.({ rowIdx: 0, idx: 0 });
        }, 50);
      } else if (jumpToLastRef.current) {
        jumpToLastRef.current = false;
        const lastIdx = combinedRows.length - 1;
        setSelectedRow(lastIdx);
        setTimeout(() => {
          gridRef.current?.scrollToCell?.({ rowIdx: lastIdx, idx: 0 });
          gridRef.current?.selectCell?.({ rowIdx: lastIdx, idx: 0 });
        }, 50);
      } else if (isPageTransitionRef.current) {
        isPageTransitionRef.current = false;
        // Commit selectedRow yang sudah digeser BERSAMAAN dengan setRows di atas,
        // sehingga highlight (getRowClass) selalu menunjuk baris data yang sama
        // di satu render -> tidak ada frame inkonsisten -> highlight tidak berkedip.
        const targetRow = Math.min(
          Math.max(selectedRowRef.current, 0),
          combinedRows.length - 1
        );
        selectedRowRef.current = targetRow;
        setSelectedRow(targetRow);
      } else {
        const targetIdx = pendingSelectIdxRef.current;
        const inputToRestore = activeFilterInputRef.current;

        setTimeout(() => {
          if (
            inputToRestore &&
            document.contains(inputToRestore) &&
            (inputToRestore.classList.contains('filter-input') ||
              inputToRestore.tagName === 'INPUT')
          ) {
            inputToRestore.focus({ preventScroll: true });
            requestAnimationFrame(() => {
              gridRef.current?.scrollToCell?.({ rowIdx: 0, idx: targetIdx });
              gridRef.current?.selectCell?.({ rowIdx: 0, idx: targetIdx });
              requestAnimationFrame(() => {
                if (inputToRestore && document.contains(inputToRestore)) {
                  inputToRestore.focus({ preventScroll: true });
                }
              });
            });
          } else {
            gridRef.current?.scrollToCell?.({ rowIdx: 0, idx: targetIdx });
            gridRef.current?.selectCell?.({ rowIdx: 0, idx: targetIdx });
          }
        }, 50);
      }
    }
  }, [visiblePages, pageDataCache]);

  useLayoutEffect(() => {
    if (pendingScrollAdjustment.current !== 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;

      // Geser scroll seketika (Sync)
      container.scrollTop += pendingScrollAdjustment.current;

      // Update referensi agar sistem tidak mengira user scroll manual
      scrollPositionRef.current = container.scrollTop;
      lastScrollTopRef.current = container.scrollTop;
      hasAdjustedScrollRef.current = true;

      // Reset
      pendingScrollAdjustment.current = 0;

      // Re-anchor selected cell react-data-grid ke index baris yang sudah
      // digeser -- HANYA jika window-shift dipicu navigasi keyboard. Saat mouse
      // scroll, user tidak sedang menavigasi sel, jadi sel aktif tidak boleh
      // ikut pindah. Karena scrollTop sudah dikompensasi di atas, baris target
      // berada di posisi visual yang sama -> selectCell TIDAK memicu scroll
      // tambahan (cell sudah di viewport), jadi tampilan tidak loncat.
      if (reanchorFromKeyboardRef.current) {
        const targetRow = selectedRowRef.current;
        const idxFromKey = finalColumns.findIndex(
          (c) => c.key === selectedCellKey
        );
        const idx = idxFromKey >= 0 ? idxFromKey : 1;
        gridRef.current?.selectCell?.({ rowIdx: targetRow, idx });
      }
      reanchorFromKeyboardRef.current = false;
    }
  }, [rows]);

  useEffect(() => {
    if (rows.length > 0 && selectedRow !== null) {
      const selectedRowData = rows[selectedRow];
      // dispatch(setHeaderData(selectedRowData));
      if (selectedRowData?.id !== lastDispatchedId.current) {
        dispatch(setHeaderData(selectedRowData));
        lastDispatchedId.current = selectedRowData?.id;
      }
    }
  }, [rows, selectedRow, dispatch]);
  useEffect(() => {
    const preventScrollOnSpace = (event: KeyboardEvent) => {
      if (
        event.key === ' ' &&
        !(
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement
        )
      ) {
        event.preventDefault();
      }
    };
    document.addEventListener('keydown', preventScrollOnSpace);
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

  const handleClickOutside = (event: MouseEvent) => {
    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(event.target as Node)
    ) {
      setContextMenu(null);
    }
  };

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

  // --- Reset Flag Transisi saat selesai
  useEffect(() => {
    if (!isTransitioning && !isFetching) {
      setTimeout(() => {
        hasAdjustedScrollRef.current = false;
      }, 200);
    }
  }, [isTransitioning, isFetching]);

  useEffect(() => {
    const rowData = rows[selectedRow];
    if (selectedRow !== null && rows.length > 0 && mode !== 'add') {
      forms.setValue('id', rowData?.id ?? '');

      forms.setValue('statusrelasi', String(rowData?.statusrelasi ?? ''));
      forms.setValue('statusrelasi_text', rowData?.statusrelasi_text);

      forms.setValue('relasi_id', String(rowData?.relasi_id ?? ''));
      forms.setValue('relasi_id_text', rowData?.relasi_id_text);
      forms.setValue('nama', rowData?.nama);
      forms.setValue('keterangan', rowData?.keterangan);
      forms.setValue('contactperson', rowData?.contactperson);
      forms.setValue('alamat', rowData?.alamat);
      forms.setValue('coa', rowData?.coa);
      forms.setValue('coapiutang', rowData?.coapiutang);
      forms.setValue('coahutang', rowData?.coahutang);
      forms.setValue('kota', rowData?.kota);
      forms.setValue('kodepos', rowData?.kodepos);
      forms.setValue('telp', rowData?.telp);
      forms.setValue('email', rowData?.email);
      forms.setValue('fax', rowData?.fax);
      forms.setValue('web', rowData?.web);
      forms.setValue('creditlimit', rowData?.creditlimit ?? '');
      forms.setValue('creditterm', rowData?.creditterm ?? '');
      forms.setValue('credittermplus', rowData?.credittermplus ?? '');
      forms.setValue('npwp', rowData?.npwp);
      forms.setValue('coagiro', rowData?.coagiro);
      forms.setValue('ppn', rowData?.ppn ?? '');
      forms.setValue('titipke', rowData?.titipke);
      forms.setValue('ppnbatalmuat', rowData?.ppnbatalmuat ?? '');
      forms.setValue('grup', rowData?.grup);
      forms.setValue(
        'formatdeliveryreport',
        rowData?.formatdeliveryreport ?? ''
      );
      forms.setValue('comodity', rowData?.comodity);
      forms.setValue('namashippercetak', rowData?.namashippercetak);
      forms.setValue('formatcetak', rowData?.formatcetak ?? '');

      forms.setValue('marketing_id', String(rowData?.marketing_id ?? ''));
      forms.setValue('marketing_id_text', rowData?.marketing_id_text);
      forms.setValue('blok', rowData?.blok);
      forms.setValue('nomor', rowData?.nomor);
      forms.setValue('rt', rowData?.rt);
      forms.setValue('rw', rowData?.rw);
      forms.setValue('kelurahan', rowData?.kelurahan);
      forms.setValue('kabupaten', rowData?.kabupaten);
      forms.setValue('kecamatan', rowData?.kecamatan);
      forms.setValue('propinsi', rowData?.propinsi);
      forms.setValue('isdpp10psn', rowData?.isdpp10psn ?? '');
      forms.setValue('usertracing', rowData?.usertracing);
      forms.setValue('passwordtracing', rowData?.passwordtracing);
      forms.setValue('kodeprospek', rowData?.kodeprospek);
      forms.setValue('namashipperprospek', rowData?.namashipperprospek);
      forms.setValue('emaildelay', rowData?.emaildelay);
      forms.setValue(
        'keterangan1barisinvoice',
        rowData?.keterangan1barisinvoice
      );
      forms.setValue('nik', rowData?.nik);
      forms.setValue('namaparaf', rowData?.namaparaf);
      forms.setValue('saldopiutang', rowData?.saldopiutang ?? '');
      forms.setValue(
        'keteranganshipperjobminus',
        rowData?.keteranganshipperjobminus
      );
      forms.setValue(
        'tglemailshipperjobminus',
        rowData?.tglemailshipperjobminus ?? ''
      );
      forms.setValue('tgllahir', rowData?.tgllahir ?? '');

      forms.setValue('idshipperasal', String(rowData?.idshipperasal ?? ''));
      forms.setValue('idshipperasal_text', rowData?.idshipperasal_text);
      forms.setValue('initial', rowData?.initial);
      forms.setValue('tipe', rowData?.tipe);
      forms.setValue('idtipe', rowData?.idtipe ?? '');
      forms.setValue('idinitial', rowData?.idinitial ?? '');
      forms.setValue('nshipperprospek', rowData?.nshipperprospek);

      forms.setValue(
        'parentshipper_id',
        String(rowData?.parentshipper_id ?? '')
      );
      forms.setValue('parentshipper_id_text', rowData?.parentshipper_id_text);
      forms.setValue('npwpnik', rowData?.npwpnik);
      forms.setValue('nitku', rowData?.nitku);
      forms.setValue('kodepajak', rowData?.kodepajak);

      forms.setValue('statusaktif', String(rowData?.statusaktif ?? ''));
      forms.setValue('statusaktif_text', rowData?.statusaktif_text);
    }
    // JANGAN forms.reset() saat mode 'add' di sini. Effect ini ikut ter-trigger
    // setiap kali `rows` di-update background fetch (bulk/prefetch) selama modal
    // Add terbuka, sehingga me-reset nilai yang baru diisi user ke default
    // kosong (''). Default '' membuat validasi relasi (z.string().min(1))
    // gagal diam-diam → Save/Save & Add "tidak terjadi apa-apa" padahal LookUp
    // masih menampilkan teks. Reset form add-mode sudah ditangani
    // handleAdd()/onSuccess() lewat resetAddForm().
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
        clearError();
        forms.reset(); // Reset the form when the Escape key is pressed
        setMode(''); // Reset the mode to empty
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
    return () => {
      debouncedFilterUpdate.cancel();
    };
  }, []);

  return (
    <div className={`flex h-[100%] w-full justify-center`}>
      <div
        onKeyDownCapture={handleGridInputNavigationKeyDownCapture}
        onWheelCapture={() => {
          interactionModeRef.current = 'pointer';
        }}
        onPointerDownCapture={() => {
          interactionModeRef.current = 'pointer';
        }}
        className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background"
      >
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
              userId={String(user?.id)}
              gridName="GridShipper"
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
          rowClass={getRowClass}
          rowKeyGetter={rowKeyGetter}
          onCellClick={handleCellClick}
          onSelectedCellChange={(args) => {
            setSelectedCellKey(args.column.key);
            handleCellClick({ row: args.row });
          }}
          headerRowHeight={70}
          rowHeight={27}
          className={`${isDark ? 'rdg-dark' : 'rdg-light'} fill-grid`}
          enableVirtualization={true}
          onColumnResize={onColumnResize}
          onColumnsReorder={onColumnsReorder}
          onScroll={suppressScrollRef.current ? undefined : handleScroll}
          renderers={{
            noRowsFallback: <EmptyRowsRenderer />
          }}
        />
        <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2">
          <ActionButton
            module="SHIPPER"
            checkedRows={checkedRows}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
            rowsLength={rows.length}
            totalItems={allShipper ? allShipper.pagination.totalItems : 0}
            startRow={startRow}
            customActions={[
              {
                label: 'Print',
                icon: <FaPrint />,
                shortcut: 'P',
                onClick: () => handleReport(),
                className: 'bg-cyan-500 hover:bg-cyan-700'
              },
              {
                label: 'Export',
                icon: <FaFileExport />,
                onClick: () => handleExportExcel(),
                className: 'bg-green-600 hover:bg-green-700'
              }
            ]}
          />
          {isLoadingShipper ? <LoadRowsRenderer /> : null}
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
                    String(user?.id),
                    'GridShipper',

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
      <FormShipper
        key={addFormKey}
        popOver={popOver}
        handleClose={handleClose}
        setPopOver={setPopOver}
        isLoadingUpdate={isLoadingUpdate}
        isLoadingDelete={isLoadingDelete}
        forms={forms}
        mode={mode as any}
        onSubmit={(keepOpenModal: boolean) =>
          forms.handleSubmit((values) => onSubmit(values, keepOpenModal))()
        }
        isLoadingCreate={isLoadingCreate}
      />
    </div>
  );
};

export default GridShipper;
