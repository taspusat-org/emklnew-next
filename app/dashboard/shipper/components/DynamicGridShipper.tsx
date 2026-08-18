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
import FormShipper from './FormShipper';
import { useQueryClient } from 'react-query';
import { getAkunpusatFn } from '@/lib/apis/akunpusat.api';

import {
  useCreateShipper,
  useDeleteShipper,
  useGetShipper,
  useUpdateShipper
} from '@/lib/server/useShipper';
import { getColumnShipperFn } from '@/lib/apis/shipper.api';
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
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { HiDocument } from 'react-icons/hi2';
import { setReportData } from '@/lib/store/reportSlice/reportSlice';
import { useDispatch } from 'react-redux';
import { Checkbox } from '@/components/ui/checkbox';
import { useAlert } from '@/lib/store/client/useAlert';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import IcClose from '@/public/image/x.svg';
import ReportDesignerMenu from '@/app/reports/menu/page';
import { IShipper, filterShipper } from '@/lib/types/shipper.type';
import { number } from 'zod';
import {
  clearOpenName,
  setClearLookup
} from '@/lib/store/lookupSlice/lookupSlice';
import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import { exportBankFn, getBankFn } from '@/lib/apis/bank.api';
import { useFormError } from '@/lib/hooks/formErrorContext';
import FilterOptions from '@/components/custom-ui/FilterOptions';
import {
  ShipperInput,
  ShipperSchema
} from '@/lib/validations/shipper.validation';
import { formatCurrency } from '@/lib/utils';
import { getShipperFn } from '@/lib/apis/shipper.api';
import { generateStatusColumns } from '@/components/custom-ui/GridDynamic';

interface Filter {
  page: number;
  limit: number;
  search: string;

  filters: typeof filterShipper;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

interface GridConfig {
  columnsOrder: number[];
  columnsWidth: { [key: string]: number };
}

const GridShipper = () => {
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const [totalPages, setTotalPages] = useState(1);
  const [popOver, setPopOver] = useState<boolean>(false);
  const { mutateAsync: createShipper, isLoading: isLoadingCreate } =
    useCreateShipper();
  const { mutateAsync: updateShipper, isLoading: isLoadingUpdate } =
    useUpdateShipper();
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { mutateAsync: deleteBank, isLoading: isLoadingDelete } =
    useDeleteShipper();
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
  const [rows, setRows] = useState<IShipper[]>([]);
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const prevPageRef = useRef(currentPage);
  const dispatch = useDispatch();
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const { alert } = useAlert();
  const { user, cabang_id } = useSelector((state: RootState) => state.auth);
  const getCoa = useSelector((state: RootState) => state.lookup.data);
  const forms = useForm<ShipperInput>({
    resolver: mode === 'delete' ? undefined : zodResolver(ShipperSchema),
    mode: 'onSubmit',
    defaultValues: {
      nama: '',
      keterangan: '',
      contactperson: '',
      alamat: '',
      coa: '',
      coa_text: '',
      coapiutang: '',
      coapiutang_text: '',
      coahutang: '',
      coahutang_text: '',
      kota: '',
      kodepos: '',
      telp: '',
      email: '',
      fax: '',
      web: '',
      creditlimit: undefined,
      creditterm: undefined,
      credittermplus: undefined,
      npwp: '',
      coagiro: '',
      coagiro_text: '',
      ppn: undefined,
      titipke: '',
      ppnbatalmuat: undefined,
      grup: '',
      formatdeliveryreport: undefined,
      comodity: '',
      namashippercetak: '',
      formatcetak: undefined,
      marketing_id: 1,
      marketing_text: '',
      blok: '',
      nomor: '',
      rt: '',
      rw: '',
      kelurahan: '',
      kabupaten: '',
      kecamatan: '',
      propinsi: '',
      isdpp10psn: undefined,
      usertracing: '',
      passwordtracing: '',
      kodeprospek: '',
      namashipperprospek: '',
      emaildelay: '',
      keterangan1barisinvoice: '',
      nik: '',
      namaparaf: '',
      saldopiutang: undefined,
      keteranganshipperjobminus: '',
      tglemailshipperjobminus: '',
      tgllahir: '',
      idshipperasal: null,
      shipperasal_text: '',
      initial: '',
      tipe: '',
      idtipe: null,
      idinitial: null,
      nshipperprospek: '',
      parentshipper_id: null,
      parentshipper_text: '',
      npwpnik: '',
      nitku: '',
      kodepajak: '',
      statusaktif: 1,
      text: ''
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
    limit: 30,
    search: '',
    filters: filterShipper,
    sortBy: 'nama',
    sortDirection: 'asc'
  });
  const gridRef = useRef<DataGridHandle>(null);
  const [prevFilters, setPrevFilters] = useState<Filter>(filters);
  const { data: allShipper, isLoading: isLoadingShipper } = useGetShipper({
    ...filters,
    page: currentPage
  });
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const { clearError } = useFormError();
  const handleColumnFilterChange = (
    colKey: keyof Filter['filters'] | string,
    value: string
  ) => {
    // 1. cari index di array columns asli
    const originalIndex = columns.findIndex((col) => col.key === colKey);

    // 2. hitung index tampilan berdasar columnsOrder
    //    jika belum ada reorder (columnsOrder kosong), fallback ke originalIndex
    const displayIndex =
      columnsOrder.length > 0
        ? columnsOrder.findIndex((idx) => idx === originalIndex)
        : originalIndex;

    // update filter seperti biasa…
    setFilters((prev) => ({
      ...prev,
      filters: { ...prev.filters, [colKey]: value },
      search: '',
      page: 1
    }));
    setInputValue('');
    setCheckedRows(new Set());
    setIsAllSelected(false);

    // 3. focus sel di grid pakai displayIndex
    setTimeout(() => {
      gridRef?.current?.selectCell({ rowIdx: 0, idx: displayIndex });
    }, 100);

    // 4. focus input filter
    setTimeout(() => {
      const ref = inputColRefs.current[colKey];
      ref?.focus();
    }, 200);

    setSelectedRow(0);
  };
  const handleDropdownFilterChange = (
    colKey: keyof Filter['filters'],
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      filters: { ...prev.filters, [colKey]: value },
      search: '',
      page: 1
    }));
    setInputValue('');
    setCheckedRows(new Set());
    setIsAllSelected(false);
    setSelectedRow(0);
  };
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  };
  const handleClickOutside = (event: MouseEvent) => {
    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(event.target as Node)
    ) {
      setContextMenu(null);
    }
  };
  function highlightText(
    text: string | number | null | undefined,
    search: string,
    columnFilter: string = ''
  ) {
    const textValue = text != null ? String(text) : '';
    if (!textValue) return '';

    // Priority: columnFilter over search
    const searchTerm = columnFilter?.trim() || search?.trim() || '';

    if (!searchTerm) {
      return textValue;
    }

    const escapeRegExp = (s: string) =>
      s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    // Create regex for continuous string match
    const escapedTerm = escapeRegExp(searchTerm);
    const regex = new RegExp(`(${escapedTerm})`, 'gi');

    // Replace all occurrences
    const highlighted = textValue.replace(
      regex,
      (match) =>
        `<span style="background-color: yellow; font-size: 13px; font-weight: 500">${match}</span>`
    );

    return (
      <span
        className="text-sm"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  }
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setInputValue(searchValue);
    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      filters: filterShipper
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

  // const [pvtFields, setPvtFields] = useState<string[]>([]);

  // useEffect(() => {
  //   const fetchFields = async () => {
  //     try {
  //       const res = await getColumnShipperFn();

  //       if (res?.data) {
  //         setPvtFields((prev) => Array.from(new Set([...prev, ...res.data])));
  //       }
  //     } catch (err) {
  //       console.error('Failed to load shipper columns:', err);
  //     }
  //   };

  //   fetchFields();
  // }, []);

  const pvtFields = [
    'statustidakasuransi',
    'asuransi_tas',
    'top_field',
    'open_field',
    'bongkaran',
    'delivery_report',
    'final_asuransi_bulan',
    'job_banyak_invoice',
    'job_pajak',
    'cetak_keterangan_shipper',
    'fumigasi',
    'adjust_tagih_warkat',
    'job_non_ppn',
    'approval_pajakp_pisah_ongkos',
    'decimal_invoice',
    'reimbursement',
    'not_invoice_tambahan',
    'invoice_jasa_pengurusan_transportasi',
    'not_ucase_shipper',
    'shipper_sttb',
    'shipper_cabang',
    'spk',
    'ppn_warkat_eksport',
    'ppn_11',
    'non_prospek',
    'info_delay',
    'job_minus',
    'shipper_sendiri',
    'wajib_invoice_sebelum_biaya',
    'tanpa_nik_npwp',
    'pusat',
    'app_saldo_piutang',
    'nama_paraf',
    'not_order_trucking',
    'passport',
    'ppn_kunci',
    'approval_shipper_job_minus',
    'approval_top',
    'blacklist_shipper',
    'non_lapor_pajak',
    'shipper_potongan',
    'shipper_tidak_tagih_invoice_utama',
    'not_tampil_web',
    'not_free_admin',
    'non_reimbursement',
    'app_cetak_invoice_lain',
    'lewat_hitung_ulang_ppn',
    'online',
    'keterangan_buruh',
    'edit_keterangan_invoice_utama',
    'tampil_keterangan_tambahan_sttb',
    'update_ppn_shiper_khusus',
    'shipper_rincian',
    'national_id',
    'refdesc_po'
  ];

  const statusColumns = generateStatusColumns({
    fields: pvtFields,
    filters,
    handleSort,
    handleContextMenu,
    handleColumnFilterChange
  });

  const columns = useMemo((): Column<IShipper>[] => {
    return [
      {
        key: 'no',
        name: 'NO',
        width: 50,
        minWidth: 10,
        resizable: true,
        draggable: true,
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
                  filters: filterShipper
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
        renderHeaderCell: () => (
          <div className="flex h-full flex-col items-center gap-1">
            <div className="headers-cell h-[50%]"></div>
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
        renderCell: ({ row }: { row: IShipper }) => (
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
        name: 'Nama',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('nama')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nama' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Nama
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nama' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'nama' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['nama'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.nama ? filters.filters.nama.toUpperCase() : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('nama', value);
                }}
              />
              {filters.filters.nama && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('nama', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nama || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.nama || '',
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
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('keterangan')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'keterangan'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                Keterangan
              </p>
              <div className="ml-2">
                {filters.sortBy === 'keterangan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'keterangan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
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
                    ? filters.filters.keterangan.toUpperCase()
                    : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
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
        key: 'contactperson',
        name: 'contactperson',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('contactperson')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'contactperson'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                contactperson
              </p>
              <div className="ml-2">
                {filters.sortBy === 'contactperson' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'contactperson' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['contactperson'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.contactperson
                    ? filters.filters.contactperson.toUpperCase()
                    : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('contactperson', value);
                }}
              />
              {filters.filters.contactperson && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('contactperson', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.contactperson || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.contactperson || '',
                filters.search,
                columnFilter
              )}
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
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('alamat')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'alamat' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Alamat
              </p>
              <div className="ml-2">
                {filters.sortBy === 'alamat' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'alamat' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['alamat'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.alamat
                    ? filters.filters.alamat.toUpperCase()
                    : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('alamat', value);
                }}
              />
              {filters.filters.alamat && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('alamat', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.alamat || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.alamat || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'coa',
        name: 'COA',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('coa')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'coa' ? 'text-red-500' : 'font-normal'
                }`}
              >
                COA
              </p>
              <div className="ml-2">
                {filters.sortBy === 'coa' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'coa' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['coa_text'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.coa_text.toUpperCase() || ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('coa_text', value);
                }}
              />
              {filters.filters.coa_text && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('coa_text', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.coa_text || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.coa_text || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'coapiutang',
        name: 'coapiutang',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('coapiutang')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'coapiutang'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                COA PIUTANG
              </p>
              <div className="ml-2">
                {filters.sortBy === 'coapiutang' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'coapiutang' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['coapiutang_text'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.coapiutang_text.toUpperCase() || ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('coapiutang_text', value);
                }}
              />
              {filters.filters.coapiutang_text && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() =>
                    handleColumnFilterChange('coapiutang_text', '')
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
          const columnFilter = filters.filters.coapiutang_text || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.coapiutang_text || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },

      {
        key: 'coahutang',
        name: 'coahutang',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('coahutang')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'coahutang'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                COA HUTANG
              </p>
              <div className="ml-2">
                {filters.sortBy === 'coahutang' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'coahutang' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['coahutang_text'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.coahutang_text.toUpperCase() || ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('coahutang_text', value);
                }}
              />
              {filters.filters.coahutang_text && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('coahutang_text', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.coahutang_text || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.coahutang_text || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'kota',
        name: 'Kota',
        resizable: true,
        draggable: true,
        width: 120,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('kota')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kota' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Kota
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kota' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'kota' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['kota'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.kota ? filters.filters.kota.toUpperCase() : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('kota', value);
                }}
              />
              {filters.filters.kota && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('kota', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kota || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.kota || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'kodepos',
        name: 'Kode Pos',
        resizable: true,
        draggable: true,
        width: 120,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('kodepos')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kodepos' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Kode Pos
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kodepos' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'kodepos' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['kodepos'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.kodepos
                    ? filters.filters.kodepos.toUpperCase()
                    : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('kodepos', value);
                }}
              />
              {filters.filters.kodepos && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('kodepos', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kodepos || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.kodepos || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'telp',
        name: 'Telp',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('telp')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'telp' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Telp
              </p>
              <div className="ml-2">
                {filters.sortBy === 'telp' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'telp' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['telp'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.telp ? filters.filters.telp.toUpperCase() : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('telp', value);
                }}
              />
              {filters.filters.telp && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('telp', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.telp || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.telp || '',
                filters.search,
                columnFilter
              )}
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
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('email')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'email' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Email
              </p>
              <div className="ml-2">
                {filters.sortBy === 'email' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'email' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['email'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.email
                    ? filters.filters.email.toUpperCase()
                    : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('email', value);
                }}
              />
              {filters.filters.email && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('email', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.email || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.email || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'fax',
        name: 'Fax',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('fax')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'fax' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Fax
              </p>
              <div className="ml-2">
                {filters.sortBy === 'fax' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'fax' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['fax'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.fax ? filters.filters.fax.toUpperCase() : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('fax', value);
                }}
              />
              {filters.filters.fax && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('fax', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.fax || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(props.row.fax || '', filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'web',
        name: 'Website',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('web')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'web' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Website
              </p>
              <div className="ml-2">
                {filters.sortBy === 'web' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'web' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['web'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.web ? filters.filters.web.toUpperCase() : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('web', value);
                }}
              />
              {filters.filters.web && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('web', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.web || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(props.row.web || '', filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'creditlimit',
        name: 'Credit Limit',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('creditlimit')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'creditlimit'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                Credit Limit
              </p>
              <div className="ml-2">
                {filters.sortBy === 'creditlimit' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'creditlimit' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['creditlimit'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.creditlimit
                    ? filters.filters.creditlimit.toUpperCase()
                    : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('creditlimit', value);
                }}
              />
              {filters.filters.creditlimit && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('creditlimit', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.creditlimit || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
              {props.row.creditlimit != null && props.row.creditlimit !== ''
                ? formatCurrency(props.row.creditlimit)
                : ''}
            </div>
          );
        }
      },
      {
        key: 'creditterm',
        name: 'Credit Term',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('creditterm')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'creditterm'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                Credit Term
              </p>
              <div className="ml-2">
                {filters.sortBy === 'creditterm' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'creditterm' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['creditterm'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.creditterm
                    ? filters.filters.creditterm.toUpperCase()
                    : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('creditterm', value);
                }}
              />
              {filters.filters.creditterm && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('creditterm', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.creditterm || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
              {highlightText(
                props.row.creditterm || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'credittermplus',
        name: 'Credit Term Plus',
        resizable: true,
        draggable: true,
        width: 160,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('credittermplus')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'credittermplus'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                Credit Term Plus
              </p>
              <div className="ml-2">
                {filters.sortBy === 'credittermplus' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'credittermplus' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['credittermplus'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={
                  filters.filters.credittermplus
                    ? filters.filters.credittermplus.toUpperCase()
                    : ''
                }
                type="text"
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('credittermplus', value);
                }}
              />
              {filters.filters.credittermplus && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('credittermplus', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.credittermplus || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
              {highlightText(
                props.row.credittermplus || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'npwp',
        name: 'NPWP',
        resizable: true,
        draggable: true,
        width: 180,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('npwp')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'npwp' ? 'text-red-500' : 'font-normal'
                }`}
              >
                NPWP
              </p>
              <div className="ml-2">
                {filters.sortBy === 'npwp' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'npwp' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.npwp || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange('npwp', e.target.value)
                }
              />
              {filters.filters.npwp && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('npwp', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.npwp || '';
          return (
            <div className="m-0 flex h-full items-center p-0 text-sm">
              {highlightText(
                props.row.npwp || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'coagiro',
        name: 'COA Giro',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('coagiro')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'coagiro' ? 'text-red-500' : 'font-normal'
                }`}
              >
                COA Giro
              </p>
              <div className="ml-2">
                {filters.sortBy === 'coagiro' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'coagiro' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['coagiro_text'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.coagiro_text.toUpperCase() || ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('coagiro_text', value);
                }}
              />
              {filters.filters.coagiro_text && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('coagiro_text', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.coagiro_text || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.coagiro_text || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'ppn',
        name: 'PPN',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('ppn')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'ppn' ? 'text-red-500' : 'font-normal'
                }`}
              >
                PPN
              </p>
              <div className="ml-2">
                {filters.sortBy === 'ppn' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'ppn' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['ppn'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.ppn ?? ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange('ppn', e.target.value)
                }
              />
              {filters.filters.ppn && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('ppn', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.ppn || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
              {props.row.ppn != null && props.row.ppn !== ''
                ? formatCurrency(props.row.ppn)
                : ''}
            </div>
          );
        }
      },
      {
        key: 'titipke',
        name: 'Titip Ke',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('titipke')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'titipke' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Titip Ke
              </p>
              <div className="ml-2">
                {filters.sortBy === 'titipke' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'titipke' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['titipke'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.titipke ?? ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange('titipke', e.target.value)
                }
              />
              {filters.filters.titipke && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('titipke', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.titipke || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.titipke || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'ppnbatalmuat',
        name: 'PPN Batal Muat',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('ppnbatalmuat')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'ppnbatalmuat'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                PPN Batal Muat
              </p>
              <div className="ml-2">
                {filters.sortBy === 'ppnbatalmuat' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'ppnbatalmuat' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['ppnbatalmuat'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.ppnbatalmuat ?? ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange('ppnbatalmuat', e.target.value)
                }
              />
              {filters.filters.ppnbatalmuat && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('ppnbatalmuat', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.ppnbatalmuat || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
              {props.row.ppnbatalmuat != null && props.row.ppnbatalmuat !== ''
                ? formatCurrency(props.row.ppnbatalmuat)
                : ''}
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
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('grup')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'grup' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Grup
              </p>
              <div className="ml-2">
                {filters.sortBy === 'grup' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'grup' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['grup'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.grup ?? ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange('grup', e.target.value)
                }
              />
              {filters.filters.grup && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('grup', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.grup || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.grup || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'formatdeliveryreport',
        name: 'Format Delivery Report',
        resizable: true,
        draggable: true,
        width: 210,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('formatdeliveryreport')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'formatdeliveryreport'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                Format Delivery Report
              </p>
              <div className="ml-2">
                {filters.sortBy === 'formatdeliveryreport' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'formatdeliveryreport' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['formatdeliveryreport'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.formatdeliveryreport ?? ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'formatdeliveryreport',
                    e.target.value
                  )
                }
              />
              {filters.filters.formatdeliveryreport && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() =>
                    handleColumnFilterChange('formatdeliveryreport', '')
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
          const columnFilter = filters.filters.formatdeliveryreport || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
              {highlightText(
                props.row.formatdeliveryreport || '',
                filters.search,
                columnFilter
              )}
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
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('comodity')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'comodity' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Comodity
              </p>
              <div className="ml-2">
                {filters.sortBy === 'comodity' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'comodity' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['comodity'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.comodity ?? ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange('comodity', e.target.value)
                }
              />
              {filters.filters.comodity && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('comodity', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.comodity || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.comodity || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'namashippercetak',
        name: 'Nama Shipper Cetak',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('namashippercetak')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'namashippercetak'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                Nama Shipper Cetak
              </p>
              <div className="ml-2">
                {filters.sortBy === 'namashippercetak' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'namashippercetak' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['namashippercetak'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.namashippercetak ?? ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange('namashippercetak', e.target.value)
                }
              />
              {filters.filters.namashippercetak && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() =>
                    handleColumnFilterChange('namashippercetak', '')
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
          const columnFilter = filters.filters.namashippercetak || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.namashippercetak || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'formatcetak',
        name: 'Format Cetak',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('formatcetak')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'formatcetak'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                Format Cetak
              </p>
              <div className="ml-2">
                {filters.sortBy === 'formatcetak' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'formatcetak' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['formatcetak'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.formatcetak ?? ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange('formatcetak', e.target.value)
                }
              />
              {filters.filters.formatcetak && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('formatcetak', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.formatcetak || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
              {highlightText(
                props.row.formatcetak || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'marketing_id',
        name: 'Marketing',
        resizable: true,
        draggable: true,
        width: 180,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('marketing_id')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'marketing_id'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                Marketing
              </p>
              <div className="ml-2">
                {filters.sortBy === 'marketing_id' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'marketing_id' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['marketing_text'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.marketing_text.toUpperCase() || ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('marketing_text', value);
                }}
              />
              {filters.filters.marketing_text && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('marketing_text', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.marketing_text || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.marketing_text || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'blok',
        name: 'Blok',
        resizable: true,
        draggable: true,
        width: 120,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('blok')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'blok' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Blok
              </p>
              <div className="ml-2">
                {filters.sortBy === 'blok' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'blok' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['blok'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.blok || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange('blok', e.target.value.toUpperCase())
                }
              />
              {filters.filters.blok && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('blok', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.blok || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.blok || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'nomor',
        name: 'Nomor',
        resizable: true,
        draggable: true,
        width: 120,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('nomor')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nomor' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Nomor
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nomor' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'nomor' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['nomor'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.nomor || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'nomor',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.nomor && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('nomor', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nomor || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.nomor || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'rt',
        name: 'RT',
        resizable: true,
        draggable: true,
        width: 80,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('rt')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'rt' ? 'text-red-500' : 'font-normal'
                }`}
              >
                RT
              </p>
              <div className="ml-2">
                {filters.sortBy === 'rt' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'rt' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['rt'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.rt || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange('rt', e.target.value.toUpperCase())
                }
              />
              {filters.filters.rt && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('rt', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.rt || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(props.row.rt || '', filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'rw',
        name: 'RW',
        resizable: true,
        draggable: true,
        width: 80,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('rw')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'rw' ? 'text-red-500' : 'font-normal'
                }`}
              >
                RW
              </p>
              <div className="ml-2">
                {filters.sortBy === 'rw' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'rw' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['rw'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.rw || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange('rw', e.target.value.toUpperCase())
                }
              />
              {filters.filters.rw && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('rw', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.rw || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(props.row.rw || '', filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'kelurahan',
        name: 'kelurahan',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('kelurahan')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kelurahan'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                kelurahan
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kelurahan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'kelurahan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['kelurahan'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.kelurahan || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'kelurahan',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.kelurahan && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('kelurahan', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kelurahan || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.kelurahan || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'kabupaten',
        name: 'kabupaten',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('kabupaten')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kabupaten'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                kabupaten
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kabupaten' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'kabupaten' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['kabupaten'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.kabupaten || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'kabupaten',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.kabupaten && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('kabupaten', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kabupaten || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.kabupaten || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'kecamatan',
        name: 'kecamatan',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('kecamatan')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kecamatan'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                kecamatan
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kecamatan' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'kecamatan' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['kecamatan'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.kecamatan || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'kecamatan',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.kecamatan && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('kecamatan', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kecamatan || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.kecamatan || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'propinsi',
        name: 'propinsi',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('propinsi')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'propinsi' ? 'text-red-500' : 'font-normal'
                }`}
              >
                propinsi
              </p>
              <div className="ml-2">
                {filters.sortBy === 'propinsi' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'propinsi' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['propinsi'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.propinsi || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'propinsi',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.propinsi && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('propinsi', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.propinsi || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.propinsi || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'isdpp10psn',
        name: 'isdpp10psn',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('isdpp10psn')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'isdpp10psn'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                isdpp10psn
              </p>
              <div className="ml-2">
                {filters.sortBy === 'isdpp10psn' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'isdpp10psn' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['isdpp10psn'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.isdpp10psn || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'isdpp10psn',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.isdpp10psn && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('isdpp10psn', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.isdpp10psn || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {props.row.isdpp10psn != null && props.row.isdpp10psn !== ''
                ? formatCurrency(props.row.isdpp10psn)
                : ''}
            </div>
          );
        }
      },
      {
        key: 'usertracing',
        name: 'usertracing',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('usertracing')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'usertracing'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                usert racing
              </p>
              <div className="ml-2">
                {filters.sortBy === 'usertracing' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'usertracing' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['usertracing'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.usertracing || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'usertracing',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.usertracing && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('usertracing', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.usertracing || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.usertracing || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'passwordtracing',
        name: 'passwordtracing',
        resizable: true,
        draggable: true,
        width: 170,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('passwordtracing')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'passwordtracing'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                password tracing
              </p>
              <div className="ml-2">
                {filters.sortBy === 'passwordtracing' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'passwordtracing' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['passwordtracing'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.passwordtracing || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'passwordtracing',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.passwordtracing && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() =>
                    handleColumnFilterChange('passwordtracing', '')
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
          const columnFilter = filters.filters.passwordtracing || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.passwordtracing || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'kodeprospek',
        name: 'kodeprospek',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('kodeprospek')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kodeprospek'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                kode prospek
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kodeprospek' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'kodeprospek' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['kodeprospek'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.kodeprospek || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'kodeprospek',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.kodeprospek && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('kodeprospek', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kodeprospek || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.kodeprospek || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'namashipperprospek',
        name: 'namashipperprospek',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('namashipperprospek')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'namashipperprospek'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                nama shipper prospek
              </p>
              <div className="ml-2">
                {filters.sortBy === 'namashipperprospek' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'namashipperprospek' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['namashipperprospek'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.namashipperprospek || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'namashipperprospek',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.namashipperprospek && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() =>
                    handleColumnFilterChange('namashipperprospek', '')
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
          const columnFilter = filters.filters.namashipperprospek || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.namashipperprospek || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'emaildelay',
        name: 'emaildelay',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('emaildelay')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'emaildelay'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                email delay
              </p>
              <div className="ml-2">
                {filters.sortBy === 'emaildelay' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'emaildelay' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['emaildelay'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.emaildelay || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'emaildelay',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.emaildelay && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('emaildelay', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.emaildelay || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.emaildelay || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'keterangan1barisinvoice',
        name: 'keterangan1barisinvoice',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('keterangan1barisinvoice')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'keterangan1barisinvoice'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                KETERANGAN 1 BARIS INVOICE
              </p>
              <div className="ml-2">
                {filters.sortBy === 'keterangan1barisinvoice' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'keterangan1barisinvoice' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['keterangan1barisinvoice'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.keterangan1barisinvoice || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'keterangan1barisinvoice',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.keterangan1barisinvoice && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() =>
                    handleColumnFilterChange('keterangan1barisinvoice', '')
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
          const columnFilter = filters.filters.keterangan1barisinvoice || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.keterangan1barisinvoice || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'nik',
        name: 'nik',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('nik')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nik' ? 'text-red-500' : 'font-normal'
                }`}
              >
                nik
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nik' && filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'nik' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['nik'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.nik || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange('nik', e.target.value.toUpperCase())
                }
              />
              {filters.filters.nik && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('nik', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nik || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(props.row.nik || '', filters.search, columnFilter)}
            </div>
          );
        }
      },
      {
        key: 'namaparaf',
        name: 'namaparaf',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('namaparaf')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'namaparaf'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                NAMA PARAF
              </p>
              <div className="ml-2">
                {filters.sortBy === 'namaparaf' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'namaparaf' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['namaparaf'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.namaparaf || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'namaparaf',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.namaparaf && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('namaparaf', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.namaparaf || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.namaparaf || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'saldopiutang',
        name: 'saldopiutang',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('saldopiutang')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'saldopiutang'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                saldo piutang
              </p>
              <div className="ml-2">
                {filters.sortBy === 'saldopiutang' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'saldopiutang' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['saldopiutang'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.saldopiutang || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'saldopiutang',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.saldopiutang && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('saldopiutang', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.saldopiutang || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
              {props.row.saldopiutang != null && props.row.saldopiutang !== ''
                ? formatCurrency(props.row.saldopiutang)
                : ''}
            </div>
          );
        }
      },
      {
        key: 'keteranganshipperjobminus',
        name: 'keteranganshipperjobminus',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('keteranganshipperjobminus')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'keteranganshipperjobminus'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                keteranganshipperjobminus
              </p>
              <div className="ml-2">
                {filters.sortBy === 'keteranganshipperjobminus' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'keteranganshipperjobminus' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['keteranganshipperjobminus'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.keteranganshipperjobminus || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'keteranganshipperjobminus',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.keteranganshipperjobminus && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() =>
                    handleColumnFilterChange('keteranganshipperjobminus', '')
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
          const columnFilter = filters.filters.keteranganshipperjobminus || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.keteranganshipperjobminus || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'tglemailshipperjobminus',
        name: 'tglemailshipperjobminus',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 300,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('tglemailshipperjobminus')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tglemailshipperjobminus'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                TANGGAL EMAIL SHIPPER JOB MINUS
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tglemailshipperjobminus' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'tglemailshipperjobminus' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['tglemailshipperjobminus'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={
                  filters.filters.tglemailshipperjobminus.toUpperCase() || ''
                }
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('tglemailshipperjobminus', value);
                }}
              />
              {filters.filters.tglemailshipperjobminus && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() =>
                    handleColumnFilterChange('tglemailshipperjobminus', '')
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
          const columnFilter = filters.filters.tglemailshipperjobminus || '';
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.tglemailshipperjobminus || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'tgllahir',
        name: 'tgllahir',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 200,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('tgllahir')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tgllahir' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Tanggal Lahir
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tgllahir' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'tgllahir' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['tgllahir'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.tgllahir.toUpperCase() || ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('tgllahir', value);
                }}
              />
              {filters.filters.tgllahir && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('tgllahir', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tgllahir || '';
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.tgllahir || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'idshipperasal',
        name: 'idshipperasal',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('idshipperasal')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'idshipperasal'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                shipper asal
              </p>
              <div className="ml-2">
                {filters.sortBy === 'idshipperasal' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'idshipperasal' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['shipperasal_text'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.shipperasal_text.toUpperCase() || ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('shipperasal_text', value);
                }}
              />
              {filters.filters.shipperasal_text && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() =>
                    handleColumnFilterChange('shipperasal_text', '')
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
          const columnFilter = filters.filters.shipperasal_text || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.shipperasal_text || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'initial',
        name: 'initial',
        resizable: true,
        draggable: true,
        width: 100,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('initial')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'initial' ? 'text-red-500' : 'font-normal'
                }`}
              >
                initial
              </p>
              <div className="ml-2">
                {filters.sortBy === 'initial' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'initial' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['initial'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.initial || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'initial',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.initial && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('initial', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.initial || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
              {highlightText(
                props.row.initial || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'tipe',
        name: 'tipe',
        resizable: true,
        draggable: true,
        width: 100,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('tipe')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tipe' ? 'text-red-500' : 'font-normal'
                }`}
              >
                Tipe
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tipe' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'tipe' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['tipe'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.tipe || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange('tipe', e.target.value.toUpperCase())
                }
              />
              {filters.filters.tipe && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('tipe', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tipe || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.tipe || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'idtipe',
        name: 'idtipe',
        resizable: true,
        draggable: true,
        width: 120,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('idtipe')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'idtipe' ? 'text-red-500' : 'font-normal'
                }`}
              >
                id tipe
              </p>
              <div className="ml-2">
                {filters.sortBy === 'idtipe' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'idtipe' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['idtipe'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.idtipe || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'idtipe',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.idtipe && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('idtipe', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.idtipe || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
              {highlightText(
                props.row.idtipe || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'idinitial',
        name: 'idinitial',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('idinitial')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'idinitial'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                ID Initial
              </p>
              <div className="ml-2">
                {filters.sortBy === 'idinitial' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'idinitial' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['idinitial'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.idinitial || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'idinitial',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.idinitial && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('idinitial', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.idinitial || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center justify-end p-0 text-sm">
              {highlightText(
                props.row.idinitial || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'nshipperprospek',
        name: 'nshipperprospek',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('nshipperprospek')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nshipperprospek'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                Nama Shipper Prospek
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nshipperprospek' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'nshipperprospek' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['nshipperprospek'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.nshipperprospek || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'nshipperprospek',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.nshipperprospek && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() =>
                    handleColumnFilterChange('nshipperprospek', '')
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
          const columnFilter = filters.filters.nshipperprospek || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.nshipperprospek || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'parentshipper_id',
        name: 'parentshipper_id',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('parentshipper_id')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'parentshipper_id'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                Parent Shipper
              </p>
              <div className="ml-2">
                {filters.sortBy === 'parentshipper_id' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'parentshipper_id' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['parentshipper_text'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.parentshipper_text.toUpperCase() || ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleColumnFilterChange('parentshipper_text', value);
                }}
              />
              {filters.filters.parentshipper_text && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() =>
                    handleColumnFilterChange('parentshipper_text', '')
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
          const columnFilter = filters.filters.parentshipper_text || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.parentshipper_text || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'npwpnik',
        name: 'npwpnik',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('npwpnik')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'npwpnik' ? 'text-red-500' : 'font-normal'
                }`}
              >
                npwpnik
              </p>
              <div className="ml-2">
                {filters.sortBy === 'npwpnik' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'npwpnik' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['npwpnik'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.npwpnik || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'npwpnik',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.npwpnik && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('npwpnik', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.npwpnik || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.npwpnik || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'nitku',
        name: 'nitku',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('nitku')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'nitku' ? 'text-red-500' : 'font-normal'
                }`}
              >
                nitku
              </p>
              <div className="ml-2">
                {filters.sortBy === 'nitku' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'nitku' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['nitku'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.nitku || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'nitku',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.nitku && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('nitku', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.nitku || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.nitku || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'kodepajak',
        name: 'kodepajak',
        resizable: true,
        draggable: true,
        width: 200,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-4"
              onClick={() => handleSort('kodepajak')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'kodepajak'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                kode pajak
              </p>
              <div className="ml-2">
                {filters.sortBy === 'kodepajak' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'kodepajak' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={(el) => {
                  inputColRefs.current['kodepajak'] = el;
                }}
                className="filter-input z-[999999] h-8 rounded-none text-sm"
                value={filters.filters.kodepajak || ''}
                type="text"
                onChange={(e) =>
                  handleColumnFilterChange(
                    'kodepajak',
                    e.target.value.toUpperCase()
                  )
                }
              />
              {filters.filters.kodepajak && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('kodepajak', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.kodepajak || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.kodepajak || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'statusaktif',
        name: 'Status Aktif',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%] px-8"
              onClick={() => handleSort('statusaktif')}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'statusaktif'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                Status Aktif
              </p>
              <div className="ml-2">
                {filters.sortBy === 'statusaktif' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'statusaktif' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterOptions
                endpoint="parameter"
                value="id"
                label="text"
                filterBy={{ grp: 'STATUS AKTIF', subgrp: 'STATUS AKTIF' }}
                onChange={(value) =>
                  handleColumnFilterChange('statusaktif', value)
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
        key: 'modifiedby',
        name: 'modifiedby',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('modifiedby')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'modifiedby'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                Modified By
              </p>
              <div className="ml-2">
                {filters.sortBy === 'modifiedby' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'modifiedby' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
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
                value={filters.filters.modifiedby.toUpperCase() || ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
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
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-sm">
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
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('created_at')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'created_at'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                Created At
              </p>
              <div className="ml-2">
                {filters.sortBy === 'created_at' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'created_at' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
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
        renderHeaderCell: () => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('updated_at')}
              onContextMenu={handleContextMenu}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'updated_at'
                    ? 'text-red-500'
                    : 'font-normal'
                }`}
              >
                Updated At
              </p>
              <div className="ml-2">
                {filters.sortBy === 'updated_at' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="text-red-500" />
                ) : filters.sortBy === 'updated_at' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="text-red-500" />
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
  }, [
    filters,
    checkedRows,
    isAllSelected,
    rows,
    getCoa,
    statusColumns,
    pvtFields
  ]);

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
      saveGridConfig(user.id, 'GridShipper', [...columnsOrder], newWidthMap);
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

      saveGridConfig(user.id, 'GridShipper', [...newOrder], columnsWidth);
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
    if (isLoadingShipper || !hasMore || rows.length === 0) return;

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

  function handleCellClick(args: { row: IShipper }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
    }
  }
  async function handleKeyDown(
    args: CellKeyDownArgs<IShipper>,
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
          const response = await api2.get(`/redis/get/bank-allItems`);
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
      }
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
          await deleteBank(selectedRowId as unknown as string, {
            onSuccess: () => {
              setPopOver(false);
              setRows((prevRows) =>
                prevRows.filter((row) => row.id !== selectedRowId)
              );
              if (selectedRow === 0) {
                setSelectedRow(selectedRow);
                gridRef?.current?.selectCell({ rowIdx: selectedRow, idx: 1 });
              } else {
                setSelectedRow(selectedRow - 1);
                gridRef?.current?.selectCell({
                  rowIdx: selectedRow - 1,
                  idx: 1
                });
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
              onSuccess(data.itemIndex, data.pageNumber, keepOpenModal)
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
            onSuccess: (data: any) => onSuccess(data.itemIndex, data.pageNumber)
          }
        );
        queryClient.invalidateQueries('bank');
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

  const handleExport = async () => {
    try {
      const { page, limit, ...filtersWithoutLimit } = filters;

      const response = await exportBankFn(filtersWithoutLimit); // Kirim data tanpa pagination

      // Buat link untuk mendownload file
      const link = document.createElement('a');
      const url = window.URL.createObjectURL(response);
      link.href = url;
      link.download = `laporan_bank${Date.now()}.xlsx`; // Nama file yang diunduh
      link.click(); // Trigger download

      // Revoke URL setelah download
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting bank data:', error);
    }
  };

  // const handleExportBySelect = async () => {
  //   if (checkedRows.size === 0) {
  //     alert({
  //       title: 'PILIH DATA YANG INGIN DI CETAK!',
  //       variant: 'danger',
  //       submitText: 'OK'
  //     });
  //     return; // Stop execution if no rows are selected
  //   }

  //   // Mengubah checkedRows menjadi format JSON
  //   const jsonCheckedRows = Array.from(checkedRows).map((id) => ({ id }));
  //   try {
  //     const response = await exportMenuBySelectFn(jsonCheckedRows);

  //     // Buat link untuk mendownload file
  //     const link = document.createElement('a');
  //     const url = window.URL.createObjectURL(response);
  //     link.href = url;
  //     link.download = `laporan_menu${Date.now()}.xlsx`; // Nama file yang diunduh
  //     link.click(); // Trigger download

  //     // Revoke URL setelah download
  //     window.URL.revokeObjectURL(url);
  //   } catch (error) {
  //     console.error('Error exporting menu data:', error);
  //     alert({
  //       title: 'Failed to generate the export. Please try again.',
  //       variant: 'danger',
  //       submitText: 'OK'
  //     });
  //   }
  // };

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
      const response = await getShipperFn(filtersWithoutLimit);
      const reportRows = response.data.map((row) => ({
        ...row,
        judullaporan: 'Laporan Shipper',
        usercetak: user.username,
        tglcetak: tglcetak,
        judul: 'PT.TRANSPORINDO AGUNG SEJAHTERA'
      }));

      sessionStorage.setItem(
        'filtersWithoutLimit',
        JSON.stringify(filtersWithoutLimit)
      );

      import('stimulsoft-reports-js/Scripts/stimulsoft.blockly.editor')
        .then((module) => {
          const { Stimulsoft } = module;
          Stimulsoft.Base.StiFontCollection.addOpentypeFontFile(
            '/fonts/tahoma.ttf',
            'Tahoma'
          ); // Regular
          Stimulsoft.Base.StiFontCollection.addOpentypeFontFile(
            '/fonts/tahomabd.ttf',
            'Tahoma'
          ); // Bold
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
          report.loadFile('/reports/LaporanShipper.mrt');
          report.dictionary.dataSources.clear();
          dataSet.readJson({ data: reportRows });
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
              window.open('/reports/shipper', '_blank');
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

  // const handleReportBySelect = async () => {
  //   if (checkedRows.size === 0) {
  //     alert({
  //       title: 'PILIH DATA YANG INGIN DI CETAK!',
  //       variant: 'danger',
  //       submitText: 'OK'
  //     });
  //     return; // Stop execution if no rows are selected
  //   }

  //   const jsonCheckedRows = Array.from(checkedRows).map((id) => ({ id }));
  //   try {
  //     const response = await reportMenuBySelectFn(jsonCheckedRows);
  //     const reportRows = response.map((row: any) => ({
  //       ...row,
  //       judullaporan: 'Laporan Menu',
  //       usercetak: user.username,
  //       tglcetak: new Date().toLocaleDateString(),
  //       judul: 'PT.TRANSPORINDO AGUNG SEJAHTERA'
  //     }));
  //     dispatch(setReportData(reportRows));
  //     window.open('/reports/menu', '_blank');
  //   } catch (error) {
  //     console.error('Error generating report:', error);
  //     alert({
  //       title: 'Failed to generate the report. Please try again.',
  //       variant: 'danger',
  //       submitText: 'OK'
  //     });
  //   }
  // };

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
      // Jalankan API sinkronisasi
      setMode('add');

      setPopOver(true);

      // forms.reset();
    } catch (error) {
      console.error('Error syncing ACOS:', error);
    }
  };
  const saveGridConfig = async (
    userId: string, // userId sebagai identifier
    gridName: string,
    columnsOrder: number[],
    columnsWidth: { [key: string]: number }
  ) => {
    try {
      const response = await fetch('/api/savegrid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          gridName,
          config: { columnsOrder, columnsWidth }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save grid configuration');
      }
    } catch (error) {
      console.error('Failed to save grid configuration:', error);
    }
  };
  const resetGridConfig = () => {
    // Nilai default untuk columnsOrder dan columnsWidth
    const defaultColumnsOrder = columns.map((_, index) => index);
    const defaultColumnsWidth = columns.reduce(
      (acc, column) => {
        acc[column.key] = typeof column.width === 'number' ? column.width : 0;
        return acc;
      },
      {} as { [key: string]: number }
    );

    // Set state kembali ke nilai default
    setColumnsOrder(defaultColumnsOrder);
    setColumnsWidth(defaultColumnsWidth);
    setContextMenu(null);
    setDataGridKey((prevKey) => prevKey + 1);

    gridRef?.current?.selectCell({ rowIdx: 0, idx: 0 });

    // Simpan konfigurasi reset ke server (atau backend)
    if (user.id) {
      saveGridConfig(
        user.id,
        'GridShipper',
        defaultColumnsOrder,
        defaultColumnsWidth
      );
    }
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        forms.reset(); // Reset the form when the Escape key is pressed
        setMode(''); // Reset the mode to empty
        setPopOver(false);
        clearError();
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

  const loadGridConfig = async (userId: string, gridName: string) => {
    try {
      const response = await fetch(
        `/api/loadgrid?userId=${userId}&gridName=${gridName}`
      );
      if (!response.ok) {
        throw new Error('Failed to load grid configuration');
      }

      const { columnsOrder, columnsWidth }: GridConfig = await response.json();

      setColumnsOrder(
        columnsOrder && columnsOrder.length
          ? columnsOrder
          : columns.map((_, index) => index)
      );
      setColumnsWidth(
        columnsWidth && Object.keys(columnsWidth).length
          ? columnsWidth
          : columns.reduce(
              (acc, column) => ({
                ...acc,
                [column.key]: columnsWidth[column.key] || column.width // Use width from columnsWidth or fallback to default column width
              }),
              {}
            )
      );
    } catch (error) {
      console.error('Failed to load grid configuration:', error);

      // If configuration is not available or error occurs, fallback to original column widths
      setColumnsOrder(columns.map((_, index) => index));

      setColumnsWidth(
        columns.reduce(
          (acc, column) => {
            // Use the original column width instead of '1fr' when configuration is missing or error occurs
            acc[column.key] =
              typeof column.width === 'number' ? column.width : 0; // Ensure width is a number or default to 0
            return acc;
          },
          {} as { [key: string]: number }
        )
      );
    }
  };

  const orderedColumns = useMemo(() => {
    if (Array.isArray(columnsOrder) && columnsOrder.length > 0) {
      // Mapping dan filter untuk menghindari undefined
      return columnsOrder
        .map((orderIndex) => columns[orderIndex])
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
    loadGridConfig(user.id, 'GridShipper');
  }, []);
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
    if (!allShipper || isFetchingManually || isDataUpdated) return;

    const newRows = allShipper.data || [];

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

    if (allShipper.pagination.totalPages) {
      setTotalPages(allShipper.pagination.totalPages);
    }

    setHasMore(newRows.length === filters.limit);
    setFetchedPages((prev) => new Set(prev).add(currentPage));
    setPrevFilters(filters);
  }, [allShipper, currentPage, filters, isFetchingManually, isDataUpdated]);

  useEffect(() => {
    const headerCells = document.querySelectorAll('.rdg-header-row .rdg-cell');
    headerCells.forEach((cell) => {
      cell.setAttribute('tabindex', '-1');
    });
  }, []);
  useEffect(() => {
    if (gridRef.current && dataGridKey) {
      setTimeout(() => {
        gridRef.current?.selectCell({ rowIdx: 0, idx: 1 });
        setIsFirstLoad(false);
      }, 0);
    }
  }, [dataGridKey]);
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
    const rowData = rows[selectedRow];
    if (
      selectedRow !== null &&
      rows.length > 0 &&
      mode !== 'add' &&
      mode !== ''
    ) {
      forms.setValue('nama', rowData.nama);
      forms.setValue('keterangan', rowData.keterangan);
      forms.setValue('contactperson', rowData.contactperson);
      forms.setValue('alamat', rowData.alamat);
      forms.setValue('kota', rowData.kota);
      forms.setValue('kodepos', rowData.kodepos);
      forms.setValue('telp', rowData.telp);
      forms.setValue('email', rowData.email);
      forms.setValue('fax', rowData.fax);
      forms.setValue('web', rowData.web);
      forms.setValue('npwp', rowData.npwp);
      forms.setValue('titipke', rowData.titipke);
      forms.setValue('comodity', rowData.comodity);
      forms.setValue('namashippercetak', rowData.namashippercetak);
      forms.setValue('blok', rowData.blok);
      forms.setValue('nomor', rowData.nomor);
      forms.setValue('rt', rowData.rt);
      forms.setValue('rw', rowData.rw);
      forms.setValue('kelurahan', rowData.kelurahan);
      forms.setValue('kabupaten', rowData.kabupaten);
      forms.setValue('kecamatan', rowData.kecamatan);
      forms.setValue('propinsi', rowData.propinsi);
      forms.setValue('usertracing', rowData.usertracing);
      forms.setValue('passwordtracing', rowData.passwordtracing);
      forms.setValue('kodeprospek', rowData.kodeprospek);
      forms.setValue('namashipperprospek', rowData.namashipperprospek);
      forms.setValue('emaildelay', rowData.emaildelay);
      forms.setValue(
        'keterangan1barisinvoice',
        rowData.keterangan1barisinvoice
      );
      forms.setValue('nik', rowData.nik);
      forms.setValue('namaparaf', rowData.namaparaf);
      forms.setValue(
        'keteranganshipperjobminus',
        rowData.keteranganshipperjobminus
      );
      forms.setValue('initial', rowData.initial);
      forms.setValue('tipe', rowData.tipe);
      forms.setValue('nshipperprospek', rowData.nshipperprospek);
      forms.setValue('npwpnik', rowData.npwpnik);
      forms.setValue('nitku', rowData.nitku);
      forms.setValue('kodepajak', rowData.kodepajak);

      forms.setValue(
        'tglemailshipperjobminus',
        rowData.tglemailshipperjobminus
      );
      forms.setValue('tgllahir', rowData.tgllahir);

      forms.setValue('coa', rowData.coa);
      forms.setValue('coapiutang', rowData.coapiutang);
      forms.setValue('coahutang', rowData.coahutang);
      forms.setValue('creditlimit', formatCurrency(rowData.creditlimit));
      forms.setValue('creditterm', rowData.creditterm);
      forms.setValue('credittermplus', rowData.credittermplus);
      forms.setValue('coagiro', rowData.coagiro);
      forms.setValue(
        'ppn',
        rowData.ppn == null ? undefined : formatCurrency(rowData.ppn)
      );

      forms.setValue(
        'ppnbatalmuat',
        rowData.ppnbatalmuat == null
          ? undefined
          : formatCurrency(rowData.ppnbatalmuat)
      );

      forms.setValue('grup', rowData.grup);
      forms.setValue(
        'formatdeliveryreport',
        rowData?.formatdeliveryreport != null
          ? Number(rowData.formatdeliveryreport)
          : undefined
      );

      forms.setValue(
        'formatcetak',
        rowData?.formatcetak != null ? Number(rowData.formatcetak) : undefined
      );

      forms.setValue('marketing_id', Number(rowData.marketing_id));
      forms.setValue(
        'isdpp10psn',
        rowData.isdpp10psn == null
          ? undefined
          : formatCurrency(rowData.isdpp10psn)
      );
      forms.setValue(
        'saldopiutang',
        rowData.saldopiutang == null
          ? undefined
          : formatCurrency(rowData.saldopiutang)
      );
      forms.setValue('idshipperasal', Number(rowData.idshipperasal));
      forms.setValue(
        'idtipe',
        rowData?.idtipe != null ? Number(rowData.idtipe) : undefined
      );

      forms.setValue(
        'idinitial',
        rowData?.idinitial != null ? Number(rowData.idinitial) : undefined
      );
      forms.setValue('parentshipper_id', Number(rowData.parentshipper_id));
      forms.setValue('statusaktif', Number(rowData.statusaktif));

      // Join / text reference
      forms.setValue('coa_text', rowData.coa_text);
      forms.setValue('coapiutang_text', rowData.coapiutang_text);
      forms.setValue('coahutang_text', rowData.coahutang_text);
      forms.setValue('coagiro_text', rowData.coagiro_text);
      forms.setValue('shipperasal_text', rowData.shipperasal_text);
      forms.setValue('parentshipper_text', rowData.parentshipper_text);
      forms.setValue('marketing_text', rowData.marketing_text);

      forms.setValue('text', rowData.text);
    } else if (selectedRow !== null && rows.length > 0 && mode === 'add') {
      // If in addMode, ensure the form values are cleared
      forms.reset();
      forms.setValue('text', rowData?.text || '');
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
    if (isSubmitSuccessful) {
      // reset();
      // Pastikan fokus terjadi setelah repaint
      requestAnimationFrame(() => setFocus('nama'));
    }
  }, [isSubmitSuccessful, setFocus]);

  const modifiedByIndex = finalColumns.findIndex(
    (col) => col.key === 'statusaktif'
  );

  let combinedColumns: any[] = [];

  if (modifiedByIndex !== -1) {
    combinedColumns = [
      ...finalColumns.slice(0, modifiedByIndex + 1),
      ...statusColumns,
      ...finalColumns.slice(modifiedByIndex + 1)
    ];
  } else {
    combinedColumns = [...finalColumns, ...statusColumns];
  }
  return (
    <div className={`flex h-[100%] w-full justify-center`}>
      <div className="flex h-[100%]  w-full flex-col rounded-sm border border-blue-500 bg-white">
        <div
          className="flex h-[38px] w-full flex-row items-center rounded-t-sm border-b border-blue-500 px-2"
          style={{
            background: 'linear-gradient(to bottom, #eff5ff 0%, #e0ecff 100%)'
          }}
        >
          <label htmlFor="" className="text-xs text-zinc-600">
            SEARCH :
          </label>
          <div className="relative flex w-[200px] flex-row items-center">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                handleInputChange(e);
              }}
              className="m-2 h-[28px] w-[200px] rounded-sm bg-white text-black"
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

        <DataGrid
          ref={gridRef}
          // columns={finalColumns}
          columns={combinedColumns}
          rows={rows}
          rowKeyGetter={rowKeyGetter}
          rowClass={getRowClass}
          onCellClick={handleCellClick}
          headerRowHeight={70}
          rowHeight={30}
          className="rdg-light fill-grid"
          onColumnResize={onColumnResize}
          onColumnsReorder={onColumnsReorder}
          onScroll={handleScroll}
          onSelectedCellChange={(args) => {
            handleCellClick({ row: args.row });
          }}
          renderers={{
            noRowsFallback: <EmptyRowsRenderer />
          }}
        />
        <div
          className="flex flex-row justify-between border border-x-0 border-b-0 border-blue-500 p-2"
          style={{
            background: 'linear-gradient(to bottom, #eff5ff 0%, #e0ecff 100%)'
          }}
        >
          <ActionButton
            module="SHIPPER"
            onAdd={handleAdd}
            checkedRows={checkedRows}
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
            customActions={[
              {
                label: 'Print',
                icon: <FaPrint />,
                onClick: () => handleReport(),
                className: 'bg-cyan-500 hover:bg-cyan-700'
              }
            ]}
            // customActions={[
            //   {
            //     label: 'Resequence',
            //     icon: <FaPlus />, // Custom icon
            //     onClick: () => handleResequence(),
            //     variant: 'success', // Optional styling variant
            //     className: 'bg-purple-700 hover:bg-purple-800' // Additional styling
            //   }
            // ]}
            // dropdownMenus={[
            //   {
            //     label: 'Report',
            //     icon: <FaPrint />,
            //     className: 'bg-cyan-500 hover:bg-cyan-700',
            //     actions: [
            //       {
            //         label: 'REPORT ALL',
            //         onClick: () => handleReport(),
            //         className: 'bg-cyan-500 hover:bg-cyan-700'
            //       }
            //       // ,
            //       // {
            //       //   label: 'REPORT BY SELECT',
            //       //   onClick: () => handleReportBySelect(),
            //       //   className: 'bg-cyan-500 hover:bg-cyan-700'
            //       // }
            //     ]
            //   },
            //   {
            //     label: 'Export',
            //     icon: <FaFileExport />,
            //     className: 'bg-green-600 hover:bg-green-700',
            //     actions: [
            //       {
            //         label: 'EXPORT ALL',
            //         onClick: () => handleExport(),
            //         className: 'bg-green-600 hover:bg-green-700'
            //       }
            //       // ,
            //       // {
            //       //   label: 'EXPORT BY SELECT',
            //       //   // onClick: () => handleExportBySelect(),
            //       //   className: 'bg-green-600 hover:bg-green-700'
            //       // }
            //     ]
            //   }
            // ]}
          />
          {isLoadingShipper ? <LoadRowsRenderer /> : null}
          {contextMenu && (
            <div
              ref={contextMenuRef}
              style={{
                position: 'fixed', // Fixed agar koordinat sesuai dengan viewport
                top: contextMenu.y, // Pastikan contextMenu.y berasal dari event.clientY
                left: contextMenu.x, // Pastikan contextMenu.x berasal dari event.clientX
                backgroundColor: 'white',
                boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
                padding: '8px',
                borderRadius: '4px',
                zIndex: 1000
              }}
            >
              <Button variant="default" onClick={resetGridConfig}>
                Reset
              </Button>
            </div>
          )}
        </div>
      </div>
      <FormShipper
        popOver={popOver}
        handleClose={handleClose}
        setPopOver={setPopOver}
        isLoadingUpdate={isLoadingUpdate}
        isLoadingDelete={isLoadingDelete}
        forms={forms}
        mode={mode as any}
        onSubmit={forms.handleSubmit(onSubmit as any)}
        isLoadingCreate={isLoadingCreate}
      />
    </div>
  );
};

export default GridShipper;
