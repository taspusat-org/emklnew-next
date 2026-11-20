'use client';

import Image from 'next/image';
import { debounce } from 'lodash';
import 'react-data-grid/lib/styles.scss';
import { useForm } from 'react-hook-form';
import IcClose from '@/public/image/x.svg';
import { useQueryClient } from 'react-query';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import { api2 } from '@/lib/utils/AxiosInstance';
import { Checkbox } from '@/components/ui/checkbox';
import { zodResolver } from '@hookform/resolvers/zod';
import { getPermissionFn } from '@/lib/apis/menu.api';
import { useAlert } from '@/lib/store/client/useAlert';
import { useSelector, useDispatch } from 'react-redux';
import { LoadRowsRenderer } from '@/components/LoadRows';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { useFormError } from '@/lib/hooks/formErrorContext';
import FilterInput from '@/components/custom-ui/FilterInput';
import ActionButton from '@/components/custom-ui/ActionButton';
import { getParameterApprovalFn } from '@/lib/apis/parameter.api';
import FormStatusJobMasukGudang from './FormStatusJobMasukGudang';
import { setHeaderData } from '@/lib/store/headerSlice/headerSlice';
import { filterStatusJob, statusJob } from '@/lib/types/statusJob.type';
import { FaPrint, FaSort, FaSortDown, FaSortUp, FaTimes } from 'react-icons/fa';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import {
  clearOpenName,
  setClearLookup
} from '@/lib/store/lookupSlice/lookupSlice';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  statusJobHeaderInput,
  statusJobHeaderSchema
} from '@/lib/validations/statusjob.validation';
import {
  cancelPreviousRequest,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import DataGrid, {
  CellClickArgs,
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import {
  useCreateStatusJob,
  useDeleteStatusJob,
  useGetAllStatusJob,
  useUpdateStatusJob
} from '@/lib/server/useStatusJob';
import {
  JENISORDERMUATAN,
  JENISORDERMUATANNAMA,
  statusJobMasukGudang,
  STATUSJOBMASUKGUDANGNAMA
} from '@/constants/statusjob';
import {
  checkValidationStatusJobFn,
  getStatusJobMasukGudangByTglStatusFn
} from '@/lib/apis/statusjob.api';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { useTheme } from 'next-themes';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface Filter {
  page: number;
  limit: number;
  search: string;
  filters: typeof filterStatusJob;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const GridStatusJob = () => {
  const { alert } = useAlert();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { clearError } = useFormError();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const { user, id } = useSelector((state: RootState) => state.auth);
  const {
    selectedDate,
    selectedDate2,
    selectedJenisOrderan,
    selectedJenisOrderanNama,
    selectedJenisStatusJob,
    selectedJenisStatusJobNama,
    onReload
  } = useSelector((state: RootState) => state.filter);

  const gridRef = useRef<DataGridHandle>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize
  const inputColRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const abortControllerRef = useRef<AbortController | null>(null); // AbortController untuk cancel request
  const colTimersRef = useRef<
    Map<keyof Filter['filters'], ReturnType<typeof setTimeout>>
  >(new Map());

  const [mode, setMode] = useState<string>('');
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [moduleValue, setModuleValue] = useState('');
  const [columnTitle, setcolumnTitle] = useState('MASUK GUDANG');
  const [dataGridKey, setDataGridKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<statusJob[]>([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [popOver, setPopOver] = useState<boolean>(false);
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [reloadForm, setReloadForm] = useState<boolean>(false);
  const [isFilteringRows, setIsFilteringRows] = useState(false);
  const [isFetchingManually, setIsFetchingManually] = useState(false);
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
  const [fetchedPages, setFetchedPages] = useState<Set<number>>(new Set([1]));
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [columnsWidth, setColumnsWidth] = useState<{ [key: string]: number }>(
    {}
  );
  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: 30,
    filters: {
      ...filterStatusJob,
      tglDari: selectedDate,
      tglSampai: selectedDate2,
      jenisOrderan: String(selectedJenisOrderan),
      jenisStatusJob: String(selectedJenisStatusJob)
    },
    search: '',
    sortBy: 'tglstatus',
    sortDirection: 'asc'
  });
  const [prevFilters, setPrevFilters] = useState<Filter>(filters);

  const {
    data: allDataStatusJob,
    isLoading: isLoadingStatusJob,
    refetch
  } = useGetAllStatusJob(
    { ...filters, page: currentPage },
    abortControllerRef.current?.signal
  );

  const { mutateAsync: createStatusJob, isLoading: isLoadingCreate } =
    useCreateStatusJob();
  const { mutateAsync: updateStatusJob, isLoading: isLoadingUpdate } =
    useUpdateStatusJob();
  const { mutateAsync: deleteStatusJob, isLoading: isLoadingDelete } =
    useDeleteStatusJob();

  const forms = useForm<statusJobHeaderInput>({
    resolver: zodResolver(statusJobHeaderSchema),
    mode: 'onSubmit'
  });

  const {
    setFocus,
    reset,
    formState: { isSubmitSuccessful }
  } = forms;

  const debouncedFilterUpdate = useRef(
    debounce((colKey: string, value: string) => {
      setFilters((prev) => ({
        ...prev,
        filters: { ...prev.filters, [colKey]: value },
        page: 1,
        search: ''
      }));
      setCheckedRows(new Set());
      setIsAllSelected(false);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelPreviousRequest(abortControllerRef);
    const searchValue = e.target.value; // Langsung update input value tanpa debounce
    setInputValue(searchValue);

    // Menunggu beberapa waktu sebelum update filter
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      // Mengupdate filter setelah debounce
      setCurrentPage(1);
      setFilters((prev) => ({
        ...prev,
        filters: filterStatusJob, // Gunakan filter yang relevan
        tglDari: selectedDate,
        tglSampai: selectedDate2,
        jenisOrderan: String(selectedJenisOrderan),
        jenisStatusJob: String(selectedJenisStatusJob),
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

  const handleClearFilter = useCallback((colKey: string) => {
    cancelPreviousRequest(abortControllerRef);
    debouncedFilterUpdate.cancel(); // Cancel pending updates

    setFilters((prev) => ({
      ...prev,
      filters: { ...prev.filters, [colKey]: '' },
      page: 1
    }));
    setCheckedRows(new Set());
    setIsAllSelected(false);
    setRows([]);
    setCurrentPage(1);
  }, []);

  const handleClearInput = () => {
    setFilters((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        tglDari: selectedDate,
        tglSampai: selectedDate2,
        jenisOrderan: String(selectedJenisOrderan),
        jenisStatusJob: String(selectedJenisStatusJob)
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
      const allIds = rows.map((row) => Number(row.tglstatus));
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

  const columns = useMemo((): Column<statusJob>[] => {
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
                  filters: filterStatusJob
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
          const rowIndex = rows.findIndex(
            (row) => row.tglstatus === props.row.tglstatus
          );
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
        renderCell: ({ row }: { row: statusJob }) => (
          <div className="flex h-full items-center justify-center">
            <Checkbox
              checked={checkedRows.has(Number(row.tglstatus))}
              onCheckedChange={() => handleRowSelect(Number(row.tglstatus))}
              id={`row-checkbox-${row.tglstatus}`}
            />
          </div>
        )
      },
      {
        key: 'tglstatus',
        name: 'tgl status',
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onClick={() => handleSort('tglstatus')}
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'tglstatus' ? 'font-bold' : 'font-normal'
                }`}
              >
                {columnTitle
                  ? `TANGGAL ${columnTitle}`
                  : `TANGGAL ${STATUSJOBMASUKGUDANGNAMA}`}
              </p>
              <div className="ml-2">
                {filters.sortBy === 'tglstatus' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'tglstatus' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>

            <div className="relative h-[50%] w-full px-1">
              <FilterInput
                colKey="tglstatus"
                value={filters.filters.tglstatus || ''}
                onChange={(value) =>
                  handleFilterInputChange('tglstatus', value)
                }
                onClear={() => handleClearFilter('tglstatus')}
                inputRef={(el) => {
                  inputColRefs.current['tglstatus'] = el;
                }}
              />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.tglstatus || '';
          const cellValue = props.row.tglstatus || '';
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
    ];
  }, [filters, rows, checkedRows, columnTitle]);

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

  const handleAdd = async () => {
    setMode('add');
    setPopOver(true);
    forms.reset();
  };

  const handleEdit = async () => {
    if (selectedRow === null || checkedRows.size > 0) {
      alert({
        title: 'PILIH DATA YANG INGIN DI EDIT!',
        variant: 'danger',
        submitText: 'OK'
      });
      return;
    }
    if (selectedRow !== null) {
      const rowData = rows[selectedRow];

      const result = await checkValidationStatusJobFn({
        aksi: 'EDIT',
        value: rowData.tglstatus,
        jenisOrderan: selectedJenisOrderan,
        jenisStatusJob: selectedJenisStatusJob
          ? String(selectedJenisStatusJob)
          : String(statusJobMasukGudang)
      });
      if (result.data.status == 'failed') {
        alert({
          title: result.data.message,
          variant: 'danger',
          submitText: 'OK'
        });
      } else {
        setPopOver(true);
        setMode('edit');
      }
    }
  };

  // const handleMultipleDelete = async (idsToDelete: number[]) => {
  //   try {
  //

  //     for (const id of idsToDelete) {
  //       // Hapus data satu per satu
  //       await deleteStatusJob({
  //         tglstatus: id as unknown as string,
  //         // tglstatus: selectedRowTglStatus as unknown as string,
  //         jenisorder_id: String(selectedJenisOrderan),
  //         text: selectedJenisStatusJobNama
  //       });
  //     }

  //     // setRows((prevRows) => prevRows.filter((row) => !idsToDelete.includes(row.tglstatus)));
  //     setCheckedRows(new Set()); // Reset checked rows
  //     setIsAllSelected(false);

  //     // Update selected row
  //     if (selectedRow >= rows.length - idsToDelete.length) {
  //       setSelectedRow(Math.max(0, rows.length - idsToDelete.length - 1));
  //     }

  //     setTimeout(() => {
  //       // Focus grid
  //       gridRef?.current?.selectCell({
  //         rowIdx: Math.max(0, selectedRow - 1),
  //         idx: 1
  //       });
  //     }, 100);

  //     alert({
  //       title: 'Berhasil!',
  //       variant: 'success',
  //       submitText: 'OK'
  //     });
  //   } catch (error) {
  //     console.error('Error in handleMultipleDelete:', error);
  //     alert({
  //       title: 'Error!',
  //       variant: 'danger',
  //       submitText: 'OK'
  //     });
  //   }
  // };

  const handleDelete = async () => {
    try {
      dispatch(setProcessing());

      if (checkedRows.size === 0) {
        if (selectedRow !== null) {
          const rowData = rows[selectedRow];

          const result = await checkValidationStatusJobFn({
            aksi: 'DELETE',
            value: rowData.tglstatus,
            jenisOrderan: selectedJenisOrderan,
            jenisStatusJob: selectedJenisStatusJob
              ? String(selectedJenisStatusJob)
              : String(statusJobMasukGudang)
          });

          if (result.data.status == 'failed') {
            alert({
              title: result.data.message,
              variant: 'danger',
              submitText: 'OK'
            });
          } else {
            setMode('delete');
            setPopOver(true);
          }
        }
      } else {
        const checkedRowsArray = Array.from(checkedRows);
        const validationPromises = checkedRowsArray.map(async (id) => {
          try {
            const response = await checkValidationStatusJobFn({
              aksi: 'DELETE',
              value: id,
              jenisOrderan: selectedJenisOrderan,
              jenisStatusJob: selectedJenisStatusJob
                ? String(selectedJenisStatusJob)
                : String(statusJobMasukGudang)
            });
            return {
              id,
              canDelete: response.data.status === 'success',
              message: response.data?.message
            };
          } catch (error) {
            return { id, canDelete: false, message: 'Error validating data' };
          }
        });

        const validationResults = await Promise.all(validationPromises);
        const cannotDeleteItems = validationResults.filter(
          (result) => !result.canDelete
        );

        if (cannotDeleteItems.length > 0) {
          const cannotDeleteIds = cannotDeleteItems
            .map((item) => item.id)
            .join(', ');

          alert({
            title: 'Beberapa data tidak dapat dihapus!',
            variant: 'danger',
            submitText: 'OK'
          });
          return;
        }

        try {
          await alert({
            title: 'Apakah anda yakin ingin menghapus data ini ?',
            variant: 'danger',
            submitText: 'YA',
            catchOnCancel: true,
            cancelText: 'TIDAK'
          });

          // await handleMultipleDelete(checkedRowsArray);
          dispatch(setProcessed());
        } catch (alertError) {
          dispatch(setProcessed());
          return;
        }
      }
    } catch (error) {
      console.error('Error in handleDelete:', error);
      alert({
        title: 'Error!',
        variant: 'danger',
        submitText: 'OK'
      });
    } finally {
      dispatch(setProcessed());
    }
  };

  const handleView = () => {
    if (selectedRow !== null) {
      setMode('view');
      setPopOver(true);
    }
  };

  const handleClose = () => {
    setPopOver(false);
    setMode('');
    clearError();
    forms.reset();
    setReloadForm(false);
  };

  const handleReport = async () => {
    if (selectedRow < 0) {
      alert({
        title: 'PILIH DATA YANG INGIN DI CETAK!',
        variant: 'danger',
        submitText: 'OK'
      });
      return;
    }

    try {
      dispatch(setProcessing());
      //TANGGAL
      let response = null;
      const now = new Date();
      const pad = (n: any) => n.toString().padStart(2, '0');
      const tglcetak = `${pad(now.getDate())}-${pad(
        now.getMonth() + 1
      )}-${now.getFullYear()} ${pad(now.getHours())}:${pad(
        now.getMinutes()
      )}:${pad(now.getSeconds())}`;

      const { page, limit, ...filtersWithoutLimit } = filters;
      const selectedRowTglStatus = rows[selectedRow]?.tglstatus;
      const { tglstatus, tglDari, tglSampai, ...filteredFilters } =
        filtersWithoutLimit.filters;
      const cleanedFilters = {
        ...filtersWithoutLimit,
        filters: filteredFilters
      };

      if (selectedJenisStatusJob === statusJobMasukGudang) {
        response = await getStatusJobMasukGudangByTglStatusFn(
          selectedRowTglStatus,
          cleanedFilters
        );
        if (!response.data?.length || response?.data.length === 0) {
          alert({
            title: 'DATA TIDAK ADA!',
            variant: 'danger',
            submitText: 'OK'
          });
          return;
        }
      }
      // const response = await getStatusJobMasukGudangByTglStatusFn(selectedRowTglStatus);

      if (response === null || response?.data === null) {
        alert({
          // title: 'TERJADI KESALAHAN SAAT MEMBUAT LAPORAN!',
          title: 'JENIS STATUS WAJIB DIPILIH!',
          variant: 'danger',
          submitText: 'OK'
        });
        return;
      }

      const reportRows = response.data.map((row: any) => ({
        ...row,
        judullaporan: 'Laporan Status Job',
        usercetak: user.username,
        tglcetak,
        judul: `PT. TRANSPORINDO AGUNG SEJAHTERA`
      }));

      sessionStorage.setItem(
        'filtersWithoutLimit',
        JSON.stringify(cleanedFilters)
      );
      sessionStorage.setItem('tglstatus', JSON.stringify(selectedRowTglStatus));

      // Dynamically import Stimulsoft and generate the PDF report
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
          report.loadFile('/reports/LaporanStatusJob.mrt');
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
              window.open('/reports/statusjob', '_blank');
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

  // const handleReport = async () => {
  //   if (selectedRow < 0) {
  //     alert({
  //       title: 'PILIH DATA YANG INGIN DI CETAK!',
  //       variant: 'danger',
  //       submitText: 'OK'
  //     });
  //     return;
  //   }

  //   const rowId = Array.from(checkedRows)[0];
  //   const now = new Date();
  //   const pad = (n: any) => n.toString().padStart(2, '0');
  //   const tglcetak = `${pad(now.getDate())}-${pad(
  //     now.getMonth() + 1
  //   )}-${now.getFullYear()} ${pad(now.getHours())}:${pad(
  //     now.getMinutes()
  //   )}:${pad(now.getSeconds())}`;

  //   const { page, limit, ...filtersWithoutLimit } = filters;
  //   const selectedRowTglStatus = rows[selectedRow]?.tglstatus;

  //   dispatch(setProcessing()); // Show loading overlay when the request starts

  //   try {
  //     const response = await getStatusJobMasukGudangByTglStatusFn(selectedRowTglStatus);

  //     if (response.data === null || response.data.length === 0) {
  //       alert({
  //         title: 'DATA TIDAK TERSEDIA!',
  //         variant: 'danger',
  //         submitText: 'OK'
  //       });
  //     } else {
  //       const reportRows = response.data.map((row: any) => ({
  //         ...row,
  //         judullaporan: 'PT. TRANSPORINDO AGUNG SEJAHTERA',
  //         usercetak: user.username,
  //         tglcetak,
  //         judul: `Laporan Status Job`
  //       }));
  //
  //       dispatch(setReportData(reportRows));
  //       window.open('/reports/designer', '_blank');
  //     }
  //   } catch (error) {
  //     console.error('Error generating report:', error);
  //     alert({
  //       title: 'Terjadi kesalahan saat memuat data!',
  //       variant: 'danger',
  //       submitText: 'OK'
  //     });
  //   } finally {
  //     dispatch(setProcessed()); // Hide loading overlay when the request is finished
  //   }
  // };

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

        // setRows([]);
        if (mode !== 'delete') {
          const response = await api2.get(`/redis/get/statusjob-allItems`);
          const selectedRowData = rows[selectedRow];
          dispatch(setHeaderData(selectedRowData));

          if (JSON.stringify(response.data) !== JSON.stringify(rows)) {
            setRows(response.data);
            setIsDataUpdated(true);
            setCurrentPage(pageNumber);
            setFetchedPages(new Set([pageNumber]));
            setSelectedRow(indexOnPage);
            // const selectedRowData = rows[selectedRow];
            // dispatch(setHeaderData(selectedRowData));
            setTimeout(() => {
              gridRef?.current?.selectCell({
                rowIdx: indexOnPage,
                idx: 1
              });
            }, 200);
          }
        }

        setIsDataUpdated(false);
      }
    } catch (error) {
      console.error('Error during onSuccess:', error);
      setIsDataUpdated(false);
    } finally {
      // dispatch(setClearLookup(false));
      setIsDataUpdated(false);
    }
  };

  const onSubmit = async (
    values: statusJobHeaderInput,
    keepOpenModal = false
  ) => {
    clearError();
    const selectedRowTglStatus = rows[selectedRow]?.tglstatus;
    try {
      dispatch(setProcessing());
      if (mode === 'delete') {
        if (selectedRowTglStatus) {
          await deleteStatusJob(
            {
              tglstatus: selectedRowTglStatus as unknown as string,
              jenisorder_id: String(selectedJenisOrderan),
              // jenisStatusJob: String(selectedJenisStatusJob),
              text: selectedJenisStatusJobNama
            },
            {
              onSuccess: () => {
                setPopOver(false);
                setRows((prevRows) =>
                  prevRows.filter(
                    (row) => row.tglstatus !== selectedRowTglStatus
                  )
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
            }
          );
        }
        return;
      }
      if (mode === 'add') {
        const newOrder = await createStatusJob(
          {
            ...values,
            ...filters // Kirim filter ke body/payload
          },
          {
            onSuccess: (data) =>
              onSuccess(data.dataIndex, data.pageNumber, keepOpenModal)
          }
        );

        if (newOrder !== undefined && newOrder !== null) {
        }
        return;
      }

      if (selectedRowTglStatus && mode === 'edit') {
        await updateStatusJob(
          {
            id: selectedRowTglStatus as unknown as string,
            fields: { ...values, ...filters }
          },
          { onSuccess: (data) => onSuccess(data.dataIndex, data.pageNumber) }
        );
        queryClient.invalidateQueries('statusjob');
      }
    } catch (error: any) {
      if (error?.response?.status !== 400) {
        console.error(error);
      }
    } finally {
      dispatch(setProcessed());
    }
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
      saveGridConfig(user.id, 'GridStatusJob', [...columnsOrder], newWidthMap);
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

      saveGridConfig(user.id, 'GridStatusJob', [...newOrder], columnsWidth);
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

  document.querySelectorAll('.column-headers').forEach((element) => {
    element.classList.remove('c1kqdw7y7-0-0-beta-47');
  });

  function handleCellClick(args: CellClickArgs<statusJob>) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex(
      (r) => r.tglstatus === clickedRow.tglstatus
    );
    const foundRow = rows.find((r) => r.tglstatus === clickedRow?.tglstatus);
    if (rowIndex !== -1 && foundRow) {
      setSelectedRow(rowIndex);
      dispatch(setHeaderData(foundRow));
    }
  }

  function getRowClass(row: statusJob) {
    const rowIndex = rows.findIndex((r) => r.tglstatus === row.tglstatus);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: statusJob) {
    return row.tglstatus;
  }

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
    if (isLoadingStatusJob || !hasMore || rows.length === 0) return;

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

  async function handleKeyDown(
    args: CellKeyDownArgs<statusJob>,
    event: React.KeyboardEvent
  ) {
    const visibleRowCount = 10;
    const firstDataRowIndex = 0;
    const selectedRowId = rows[selectedRow]?.tglstatus;

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
        handleRowSelect(Number(selectedRowId)); // Toggling the selection of the row
      }
    }
  }

  const fetchPermission = async () => {
    const res = await getPermissionFn(String(id)); // GET ACOS
    const data = await getParameterApprovalFn({
      // GET DATA PARAMETER WITH ROLE
      filters: {
        grp: 'DATA STATUS JOB',
        subgrp: `ORDERAN${selectedJenisOrderanNama}`
      }
    });

    const relevantPermissions = res.abilities.filter((permission: any) => {
      // FILTERED ACOS BY SUBJECT EQUAL TO selectedOrderanNama Value
      const formattedSubject = permission.subject?.replace(/-/g, ' ');
      return (
        formattedSubject?.toUpperCase() ===
        `ORDERAN${selectedJenisOrderanNama?.toUpperCase()}`
      );
    });

    if (selectedJenisOrderan && selectedJenisStatusJob) {
      const filteredPermission = data.data.filter(
        (item: any) =>
          item.text === selectedJenisStatusJobNama &&
          relevantPermissions.some(
            (p: any) =>
              p.action.includes(`${selectedJenisStatusJobNama} -> YA`) &&
              Number(p.id) === Number(item.role_ya)
          )
      );

      if (filteredPermission && filteredPermission.length > 0) {
        setModuleValue('STATUS-JOB');
      } else {
        setModuleValue('');
      }
    } else {
      setModuleValue('');
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      colTimersRef.current.forEach((t) => clearTimeout(t));
      colTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    setIsFirstLoad(true);
    loadGridConfig(
      user.id,
      'GridStatusJob',
      columns,
      setColumnsOrder,
      setColumnsWidth
    );
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
      fetchPermission();
      if (
        selectedDate !== filters.filters.tglDari ||
        selectedDate2 !== filters.filters.tglSampai ||
        String(selectedJenisOrderan) !== filters.filters.jenisOrderan ||
        String(selectedJenisOrderan) !== filters.filters.jenisStatusJob
      ) {
        setFilters((prevFilters) => ({
          ...prevFilters,
          filters: {
            ...prevFilters.filters,
            tglDari: selectedDate,
            tglSampai: selectedDate2,
            jenisOrderan: selectedJenisOrderan
              ? String(selectedJenisOrderan)
              : String(JENISORDERMUATAN),
            jenisStatusJob: selectedJenisStatusJob
              ? String(selectedJenisStatusJob)
              : String(statusJobMasukGudang)
          }
        }));
      }
    } else if (onReload) {
      // Jika onReload diklik, update filter tanggal
      if (
        selectedDate !== filters.filters.tglDari ||
        selectedDate2 !== filters.filters.tglSampai ||
        String(selectedJenisOrderan) !== filters.filters.jenisOrderan ||
        String(selectedJenisStatusJob) !== filters.filters.jenisStatusJob
      ) {
        setFilters((prevFilters) => ({
          ...prevFilters,
          filters: {
            ...prevFilters.filters,
            tglDari: selectedDate,
            tglSampai: selectedDate2,
            jenisOrderan: String(selectedJenisOrderan),
            jenisStatusJob: String(selectedJenisStatusJob)
          }
        }));
      }
    }
  }, [
    selectedDate,
    selectedDate2,
    onReload,
    isFirstLoad,
    selectedJenisStatusJob,
    selectedJenisOrderan
  ]);

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
    if (selectedRow !== null && rows.length > 0 && mode !== 'add') {
      forms.setValue('tglstatus', rowData?.tglstatus);
      forms.setValue('jenisorder_id', Number(selectedJenisOrderan));
      forms.setValue('jenisorder_nama', selectedJenisOrderanNama);
      forms.setValue('statusjob', Number(selectedJenisStatusJob));
      forms.setValue('statusjob_nama', selectedJenisStatusJobNama);
    } else {
      forms.setValue('jenisorder_id', Number(selectedJenisOrderan));
      forms.setValue('jenisorder_nama', selectedJenisOrderanNama);
      forms.setValue('statusjob', Number(selectedJenisStatusJob));
      forms.setValue('statusjob_nama', selectedJenisStatusJobNama);
    }
  }, [forms, selectedRow, rows, mode, popOver]);

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
        clearError();
        setPopOver(false);
        dispatch(clearOpenName());
        setReloadForm(false);
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
  }, [filters]); // Dependency array termasuk filters dan refetch
  useEffect(() => {
    // Memastikan refetch dilakukan saat filters berubah
    if (onReload) {
      refetch(); // Memanggil ulang API untuk mendapatkan data terbaru
      setPrevFilters(filters); // Simpan filters terbaru
      setcolumnTitle(selectedJenisStatusJobNama);
      fetchPermission();
    }
  }, [onReload]); // Dependency array termasuk filters dan ref

  useEffect(() => {
    if (isSubmitSuccessful) {
      // reset();
      // Pastikan fokus terjadi setelah repaint
      requestAnimationFrame(() => setFocus('tglstatus'));
    }
  }, [isSubmitSuccessful, setFocus]);
  useEffect(() => {
    if (!allDataStatusJob || isDataUpdated) return;

    const newRows = allDataStatusJob.data || [];

    setRows((prevRows) => {
      if (currentPage === 1 || filters !== prevFilters) {
        // Reset data jika filter berubah (halaman pertama)
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

    if (allDataStatusJob.pagination.totalPages) {
      setTotalPages(allDataStatusJob.pagination.totalPages);
    }

    setHasMore(newRows.length === filters.limit);
    setFetchedPages((prev) => new Set(prev).add(currentPage));
    setIsFirstLoad(false);
    setPrevFilters(filters);
  }, [allDataStatusJob, currentPage, filters, isDataUpdated]);

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
              gridName="GridStatusJob"
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
            // module="STATUS-JOB"
            module={moduleValue}
            onAdd={handleAdd}
            checkedRows={checkedRows}
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
            rowsLength={rows.length}
            totalItems={
              allDataStatusJob ? allDataStatusJob.pagination.totalItems : 0
            }
            customActions={[
              {
                label: 'Print',
                icon: <FaPrint />,
                onClick: () => handleReport(),
                className: 'bg-cyan-500 hover:bg-cyan-700'
              }
            ]}
          />
          {isLoadingStatusJob ? <LoadRowsRenderer /> : null}
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
                    'GridStatusJob',
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
      <FormStatusJobMasukGudang
        popOver={popOver}
        handleClose={handleClose}
        setPopOver={setPopOver}
        isLoadingCreate={isLoadingCreate}
        isLoadingUpdate={isLoadingUpdate}
        isLoadingDelete={isLoadingDelete}
        forms={forms}
        mode={mode}
        onSubmit={forms.handleSubmit(onSubmit as any)}
      />
    </div>
  );
};

export default GridStatusJob;
