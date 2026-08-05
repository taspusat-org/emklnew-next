'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'react-data-grid/lib/styles.scss';
import DataGrid, {
  CellClickArgs,
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import {
  useCreateMenu,
  useDeleteMenu,
  useUpdateMenu
} from '@/lib/server/useMenu';
import { ImSpinner2 } from 'react-icons/im';
import ActionButton from '@/components/custom-ui/ActionButton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MenuInput, menuSchema } from '@/lib/validations/menu.validation';
import FormRole from './FormRole';
import { useQueryClient } from 'react-query';
import { useDispatch } from 'react-redux';
import {
  setRoleacl,
  setTriggerSelectRow
} from '@/lib/store/roleaclSlice/roleaclSlice';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import {
  useCreateRole,
  useDeleteRole,
  useGetRole,
  useUpdateRole
} from '@/lib/server/useRole';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { RoleInput, roleSchema } from '@/lib/validations/role.validation';
import { IRole, IRoleAcl } from '@/lib/types/role.type';
import {
  formatDateTime,
  handleContextMenu,
  loadGridConfig,
  resetGridConfig,
  saveGridConfig
} from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  FaFileExport,
  FaPrint,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaTimes
} from 'react-icons/fa';
import { api, api2 } from '@/lib/utils/AxiosInstance';
import {
  checkRoleFn,
  exportRoleBySelectFn,
  exportRoleFn,
  getRoleFn,
  reportRoleBySelectFn
} from '@/lib/apis/role.api';
import { useAlert } from '@/lib/store/client/useAlert';
import { setReportData } from '@/lib/store/reportSlice/reportSlice';
import { HiDocument } from 'react-icons/hi2';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import IcClose from '@/public/image/x.svg';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';
import { highlightText } from '@/components/custom-ui/HighlightText';
import { useTheme } from 'next-themes';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { LoadRowsRenderer } from '@/components/LoadRows';
import FilterOptions from '@/components/custom-ui/FilterOptions';

interface Row {
  id: string;
  rolename: string;
  modifiedby: string;
  statusaktif: string;
  text: string;
  created_at: string;
  updated_at: string;
  acos: IRoleAcl[];
}
interface Filter {
  page: number;
  limit: number;
  search: string;
  filters: {
    rolename: string; // Filter berdasarkan class
    modifiedby: string; // Filter berdasarkan nama
    text: string;
    created_at: string; // Filter berdasarkan method
    updated_at: string; // Filter berdasarkan method
  };
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}
interface GridConfig {
  columnsOrder: number[];
  columnsWidth: { [key: string]: number };
}
const GridRole = () => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const [isFilteringRows, setIsFilteringRows] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [selectedCol, setSelectedCol] = useState<number>(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [popOver, setPopOver] = useState<boolean>(false);
  const { mutate: createRole, isLoading: isLoadingCreate } = useCreateRole();
  const { triggerSelectRow } = useSelector((state: RootState) => state.roleacl);
  const { user } = useSelector((state: RootState) => state.auth);
  const { mutate: updateRole, isLoading: isLoadingUpdate } = useUpdateRole();
  const [isFetchingManually, setIsFetchingManually] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { mutateAsync: deleteRole, isLoading: isLoadingDelete } =
    useDeleteRole();
  const [columnsOrder, setColumnsOrder] = useState<readonly number[]>([]);
  const [columnsWidth, setColumnsWidth] = useState<{ [key: string]: number }>(
    {}
  );
  const [dataGridKey, setDataGridKey] = useState(0);
  const resizeDebounceTimeout = useRef<NodeJS.Timeout | null>(null); // Timer debounce untuk resize

  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  // Satu state `mode` menggantikan 4 flag boolean (viewMode/editMode/addMode/
  // deleteMode) agar seragam dengan GridAlatbayar. Selain menghilangkan
  // kombinasi mustahil (dulu handleView terpaksa menyalakan deleteMode=true
  // supaya form read-only), ini juga membuat label tombol footer benar:
  // FormFooterButtons memilih "DELETE" dari `mode === 'delete'`.
  type RoleFormMode = '' | 'add' | 'edit' | 'delete' | 'view';
  const [mode, setMode] = useState<RoleFormMode>('');
  const [totalPages, setTotalPages] = useState(1);
  const [fetchedPages, setFetchedPages] = useState<Set<number>>(new Set([1]));
  // Dinaikkan setiap "Save & Add" untuk me-remount form agar LookUp re-init
  // dari nilai hasil resetAddForm -> STATUS AKTIF kembali ke "AKTIF".
  const [addFormKey, setAddFormKey] = useState<number>(0);
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [rows, setRows] = useState<Row[]>([]);
  const dispatch = useDispatch();
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const { alert } = useAlert();
  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: 20,
    filters: {
      rolename: '',
      modifiedby: '',
      text: '',
      created_at: '',
      updated_at: ''
    },
    sortBy: 'rolename',
    sortDirection: 'asc',
    search: ''
  });
  const [prevFilters, setPrevFilters] = useState<Filter>(filters);
  const { data: role, isLoading: isLoadingRole } = useGetRole({
    ...filters,
    page: currentPage
  });

  const inputColRefs = {
    rolename: useRef<HTMLInputElement>(null),
    modifiedby: useRef<HTMLInputElement>(null),
    text: useRef<HTMLInputElement>(null),
    created_at: useRef<HTMLInputElement>(null),
    updated_at: useRef<HTMLInputElement>(null)
  };
  const defaultValues = {
    rolename: '',
    statusaktif: '',
    // Teks yang ditampilkan LookUp STATUS AKTIF. Wajib ada di defaultValues,
    // kalau tidak forms.reset() meninggalkannya undefined dan LookUp tampil
    // kosong walau id-nya sudah benar.
    statusaktif_text: ''
  };
  const forms = useForm<RoleInput>({
    resolver: zodResolver(roleSchema),
    mode: 'onSubmit',
    defaultValues
  });

  const handleColumnFilterChange = (
    colKey: keyof Filter['filters'],
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        [colKey]: value
      },
      search: '',
      page: 1
    }));
    setInputValue('');
    setCheckedRows(new Set());
    setIsAllSelected(false);
    setTimeout(() => {
      gridRef?.current?.selectCell({ rowIdx: 0, idx: 1 });
    }, 100);
    setTimeout(() => {
      const ref = inputColRefs[colKey]?.current;
      if (ref) {
        ref.focus();
      }
    }, 200);
    setSelectedRow(0);
  };

  const gridRef = useRef<DataGridHandle>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setInputValue(searchValue);
    setCurrentPage(1);
    setFilters((prev) => ({
      ...prev,
      filters: {
        rolename: '',
        modifiedby: '',
        text: '',
        created_at: '',
        updated_at: ''
      },
      search: searchValue,
      page: 1
    }));
    setCheckedRows(new Set());
    setIsAllSelected(false);
    setTimeout(() => {
      gridRef?.current?.selectCell({ rowIdx: 0, idx: 0 });
    }, 100);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 200);

    setSelectedRow(0);
    setCurrentPage(1); // Reset halaman
    setRows([]); // Kosongkan data sebelumnya
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

  const handleFilterRows = (val: string) => {
    setIsFilteringRows(true);
    // setLocalSelectedValue(val);
    // onChange?.(val);
    setTimeout(() => {
      setIsFilteringRows(false);
    }, 1000);
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
  const columns = useMemo((): Column<Row>[] => {
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
                    rolename: '',
                    modifiedby: '',
                    created_at: '',
                    text: '',
                    updated_at: ''
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
        renderCell: ({ row }: { row: Row }) => (
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
        key: 'rolename',
        name: 'Nama Role',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
              onClick={() => handleSort('rolename')}
            >
              <p
                className={`text-sm ${
                  filters.sortBy === 'rolename' ? 'font-bold' : 'font-normal'
                }`}
              >
                Nama Role
              </p>
              <div className="ml-2">
                {filters.sortBy === 'rolename' &&
                filters.sortDirection === 'asc' ? (
                  <FaSortUp className="font-bold" />
                ) : filters.sortBy === 'rolename' &&
                  filters.sortDirection === 'desc' ? (
                  <FaSortDown className="font-bold" />
                ) : (
                  <FaSort className="text-zinc-400" />
                )}
              </div>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <Input
                ref={inputColRefs.rolename}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.rolename || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleColumnFilterChange('rolename', value);
                }}
              />
              {filters.filters.rolename && (
                <button
                  className="absolute right-2 top-2 text-xs text-gray-500"
                  onClick={() => handleColumnFilterChange('rolename', '')}
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          const columnFilter = filters.filters.rolename || '';
          return (
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
              {highlightText(
                props.row.rolename || '',
                filters.search,
                columnFilter
              )}
            </div>
          );
        }
      },
      {
        key: 'statusaktif',
        name: 'STATUS AKTIF',
        resizable: true,
        draggable: true,
        width: 150,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div
              className="headers-cell h-[50%]"
              onContextMenu={(event) =>
                setContextMenu(handleContextMenu(event))
              }
            >
              <p className="text-sm font-normal">Status Aktif</p>
            </div>
            <div className="relative h-[50%] w-full px-1">
              <FilterOptions
                columnKey={column.column.key}
                endpoint="parameter"
                value="id"
                label="text"
                filterBy={{ grp: 'STATUS AKTIF', subgrp: 'STATUS AKTIF' }}
                onChange={(value) => handleColumnFilterChange('text', value)} // Menangani perubahan nilai di parent
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
                  className="m-0 flex h-fit w-fit cursor-pointer items-center justify-center p-0"
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
        name: 'Modified By',
        resizable: true,
        draggable: true,
        width: 250,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
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
              <Input
                ref={inputColRefs.modifiedby}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.modifiedby || ''}
                onChange={(e) => {
                  const value = e.target.value;
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
            <div className="m-0 flex h-full cursor-pointer items-center p-0 text-sm">
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
        width: 250,
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
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
              <Input
                ref={inputColRefs.created_at}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.created_at || ''}
                onChange={(e) => {
                  const value = e.target.value;
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
        width: 250,
        resizable: true,
        draggable: true,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
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
              <Input
                ref={inputColRefs.updated_at}
                className="filter-input z-[999999] h-8 rounded-none"
                value={filters.filters.updated_at || ''}
                onChange={(e) => {
                  const value = e.target.value;
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
  }, [filters, rows, checkedRows]);
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
      saveGridConfig(user.id, 'GridRole', [...columnsOrder], newWidthMap);
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

      saveGridConfig(user.id, 'GridRole', [...newOrder], columnsWidth);
      return newOrder;
    });
  };
  function isAtBottom(event: React.UIEvent<HTMLDivElement>): boolean {
    const { currentTarget } = event;
    if (!currentTarget) return false;

    return (
      currentTarget.scrollTop + currentTarget.clientHeight >=
      currentTarget.scrollHeight - 2
    );
  }
  function isAtTop({ currentTarget }: React.UIEvent<HTMLDivElement>): boolean {
    return currentTarget.scrollTop <= 10;
  }
  async function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (isLoadingRole || !hasMore || rows.length === 0) return;

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
  document.querySelectorAll('.column-headers').forEach((element) => {
    element.classList.remove('c1kqdw7y7-0-0-beta-47');
  });
  function handleCellClick(args: CellClickArgs<Row>) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    const foundRow = rows.find((r) => r.id === clickedRow?.id);

    if (rowIndex !== -1 && foundRow) {
      setSelectedRow(rowIndex);
      dispatch(setRoleacl(foundRow as unknown as IRole));
    }
  }

  async function handleKeyDown(
    args: CellKeyDownArgs<Row>,
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

        const nextRow = Math.min(prev + visibleRowCount - 1, rows.length - 1);
        return nextRow;
      });
    } else if (event.key === 'PageUp') {
      setSelectedRow((prev) => {
        if (prev === null) return firstDataRowIndex;

        const newRow = Math.max(prev - visibleRowCount + 1, firstDataRowIndex);
        return newRow;
      });
    } else if (event.key === ' ') {
      // Handle spacebar keydown to toggle row selection
      if (selectedRowId !== undefined) {
        handleRowSelect(selectedRowId); // Toggling the selection of the row
      }
    }
  }

  // Id baris yang harus difokuskan setelah simpan. Fokus di grid ini TIDAK bisa
  // diselesaikan sekali jalan di onSuccess: invalidateQueries memicu refetch,
  // lalu effect data me-return newRows dan MENIMPA rows -- urutannya bisa
  // berbeda dari data redis sehingga index hasil onSuccess meleset. Ref ini
  // dibaca ulang setiap `rows` berubah sampai baris-nya ketemu.
  const pendingFocusIdRef = useRef<string | null>(null);

  // Cache default STATUS AKTIF ("AKTIF") supaya tidak fetch berulang.
  const statusAktifDefaultRef = useRef<{ id: string; text: string } | null>(
    null
  );

  // Reset form mode "add" sekaligus set default STATUS AKTIF = "AKTIF".
  // LookUp tidak punya auto-default untuk field ini, jadi di-set eksplisit dari
  // tabel parameter (grp='status aktif'). `statusaktif` menyimpan id (varchar
  // "02-DBCF9E01-...", bukan angka) dan `statusaktif_text` teks tampilannya.
  const resetAddForm = async () => {
    let aktif = statusAktifDefaultRef.current;
    if (!aktif) {
      try {
        const res = await api2.get('/parameter', {
          params: { grp: 'status aktif' }
        });
        const params: any[] = res?.data?.data ?? res?.data ?? [];
        const row =
          params.find((p) => p?.default === 'YA') ??
          params.find((p) => String(p?.text).toUpperCase() === 'AKTIF');
        aktif = row
          ? { id: String(row.id), text: row.text ?? 'AKTIF' }
          : { id: '', text: '' };
        statusAktifDefaultRef.current = aktif;
      } catch (e) {
        console.error('Gagal mengambil default STATUS AKTIF:', e);
        aktif = { id: '', text: '' };
      }
    }
    forms.reset({
      rolename: '',
      statusaktif: aktif.id,
      statusaktif_text: aktif.text
    });
  };

  // Isi form dari satu baris grid. Dipanggil eksplisit SEBELUM modal edit/view/
  // delete dibuka: LookUp membaca inputLookupValue/lookupNama lewat getValues()
  // sekali saat mount, sedangkan effect pengisi baru jalan SETELAH render --
  // kalau hanya mengandalkan effect, LookUp terlanjur mount dengan nilai kosong.
  const fillFormFromRow = (rowData: any) => {
    if (!rowData) return;
    forms.setValue('rolename', rowData.rolename);
    forms.setValue('statusaktif', rowData.statusaktif || '');
    forms.setValue('statusaktif_text', rowData.text ?? '');
  };

  const onSuccess = async (
    indexOnPage: any,
    pageNumber: any,
    keepOpenModal = false,
    focusId: string | null = null
  ) => {
    try {
      setIsFetchingManually(true);
      // Tandai baris tersimpan; effect di bawah yang memfokuskannya begitu rows
      // final (termasuk setelah refetch akibat invalidateQueries) tersedia.
      pendingFocusIdRef.current = focusId ?? null;
      if (focusId != null) {
        // Batas jendela settle: setelah ini fokus tidak lagi di-assert ulang,
        // supaya navigasi manual user (klik/panah) tidak ditarik balik. Dicek
        // dulu masih id yang sama agar tidak menghapus fokus milik simpan lain.
        setTimeout(() => {
          if (String(pendingFocusIdRef.current) === String(focusId)) {
            pendingFocusIdRef.current = null;
          }
        }, 1200);
      }
      if (keepOpenModal) {
        // SAVE & ADD: form kembali ke default (STATUS AKTIF = "AKTIF") lalu
        // remount modal via addFormKey supaya LookUp membaca nilai yang baru.
        await resetAddForm();
        setAddFormKey((k) => k + 1);
        setPopOver(true);
      } else {
        forms.reset();
        setPopOver(false);
      }
      if (mode !== 'delete') {
        const response = await api2.get(`/redis/get/role-allItems`);
        const loadedRows: Row[] = Array.isArray(response.data)
          ? response.data
          : [];

        if (JSON.stringify(loadedRows) !== JSON.stringify(rows)) {
          // Pakai loadedRows (dijamin array), BUKAN response.data mentah:
          // /redis/get/:key membalas HTTP 200 dengan body { error: 'Key not
          // found' } saat key tidak ada, dan menaruh objek itu ke state `rows`
          // membuat grid kosong tanpa error apa pun.
          setRows(loadedRows);
          setIsDataUpdated(true);
          setCurrentPage(pageNumber);
          setFetchedPages(new Set([pageNumber]));

          // Fokus by-id ditangani SEPENUHNYA oleh effect [rows] di atas, yang
          // menghitung ulang index pada setiap versi rows (redis lalu refetch).
          // Di sini cukup fallback by-index untuk kasus focusId tidak ada
          // (mis. backend tak mengembalikan newItem). Kalau fallback ini ikut
          // jalan saat focusId ada, selectCell-nya (150ms) mendarat setelah
          // fokus by-id (50ms) memakai index dari dataset redis yang panjangnya
          // beda dengan hasil refetch -> fokus meleset.
          if (focusId == null) {
            setSelectedRow(indexOnPage);
            setTimeout(() => {
              gridRef?.current?.selectCell({
                rowIdx: indexOnPage,
                idx: 1
              });
            }, 150);
          }
        }
      }
      setIsFetchingManually(false);
      setIsDataUpdated(false);
    } catch (error) {
      console.error('Error during onSuccess:', error);
      setIsFetchingManually(false);
      setIsDataUpdated(false);
    }
  };
  const onSubmit = async (
    values: RoleInput,
    keepOpenModalArg: unknown = false
  ) => {
    // react-hook-form memanggil callback-nya dengan (values, event). Kalau form
    // di-submit natively (ENTER di sebuah field), argumen kedua adalah objek
    // EVENT yang truthy -- bukan boolean. Tanpa penyempitan ke `=== true`,
    // Enter akan diperlakukan seperti "SAVE & ADD" dan modal tidak pernah
    // menutup. Hanya tombol SAVE & ADD yang boleh mengirim true.
    const keepOpenModal = keepOpenModalArg === true;
    // `statusaktif_text` HANYA teks tampilan LookUp, bukan kolom tabel `role`.
    // role.service.ts create() meneruskan seluruh field sisa langsung ke
    // .insert(), jadi mengirimnya menghasilkan:
    //   column "statusaktif_text" of relation "role" does not exist
    // (update() di service itu sudah membuangnya secara eksplisit, create belum;
    // alatbayar aman karena memakai buildInsertData yang memilih kolom).
    // Dibuang di sini supaya payload hanya berisi kolom nyata.
    const { statusaktif_text: _statusaktifText, ...payload } = values;
    const selectedRowId = rows[selectedRow]?.id;
    if (mode === 'delete') {
      await deleteRole(selectedRowId as unknown as string, {
        onSuccess: () => {
          setPopOver(false); // Close popover
          if (selectedRow === rows.length - 1) {
            setSelectedRow(selectedRow - 1);
            gridRef?.current?.selectCell({
              rowIdx: selectedRow - 1,
              idx: 1
            });
          } else {
            setSelectedRow(selectedRow);
            gridRef?.current?.selectCell({ rowIdx: selectedRow, idx: 1 });
          }
          setRows((prevRows) =>
            prevRows.filter((row) => row.id !== selectedRowId)
          );
        }
      });
      return; // Pastikan untuk keluar setelah delete
    }
    if (mode === 'add') {
      await createRole(
        {
          ...payload,
          ...filters // Kirim filter ke body/payload
        },
        {
          // Backend role mengembalikan `newItem` baik untuk create MAUPUN
          // update (lihat role.service.ts), jadi keduanya memakai kunci sama.
          onSuccess: (data) =>
            onSuccess(
              data.itemIndex,
              data.pageNumber,
              keepOpenModal,
              data.newItem?.id ?? null
            )
        }
      );
      return;
    }

    if (selectedRowId && mode === 'edit') {
      await updateRole(
        {
          id: selectedRowId as unknown as string,
          fields: { ...payload, ...filters }
        },
        {
          onSuccess: (data) =>
            onSuccess(
              data.itemIndex,
              data.pageNumber,
              false,
              data.newItem?.id ?? null
            )
        }
      );
    }
  };

  // Isi form SEBELUM setPopOver(true) pada edit/view/delete (lihat
  // fillFormFromRow), supaya LookUp sudah melihat nilainya saat mount.
  const handleEdit = () => {
    if (selectedRow !== null) {
      fillFormFromRow(rows[selectedRow]);
      setMode('edit');
      setPopOver(true);
    }
  };

  const handleDelete = async () => {
    try {
      if (selectedRow !== null) {
        const rowData = rows[selectedRow];
        const checkRole = await checkRoleFn(rowData.id);
        if (checkRole === true) {
          alert({
            title: 'DATA INI TIDAK DIIZINKAN UNTUK DIHAPUS!',
            variant: 'danger',
            submitText: 'ok'
          });
        } else {
          fillFormFromRow(rowData);
          setMode('delete');
          setPopOver(true);
        }
      }
    } catch (error) {}
  };

  const handleReport = async () => {
    const { page, limit, ...filtersWithoutLimit } = filters;
    const response = await getRoleFn(filtersWithoutLimit);
    const reportRows = response.data.map((row) => ({
      ...row,
      judullaporan: 'Laporan Role',
      usercetak: user.username,
      tglcetak: new Date().toLocaleDateString(),
      judul: 'PT.TRANSPORINDO AGUNG SEJAHTERA'
    }));
    dispatch(setReportData(reportRows));
    window.open('/reports/role', '_blank');
  };
  const handleReportBySelect = async () => {
    if (checkedRows.size === 0) {
      alert({
        title: 'PILIH DATA YANG INGIN DI CETAK!',
        variant: 'danger',
        submitText: 'OK'
      });
      return; // Stop execution if no rows are selected
    }

    const jsonCheckedRows = Array.from(checkedRows).map((id) => ({ id }));
    try {
      const response = await reportRoleBySelectFn(jsonCheckedRows);
      const reportRows = response.map((row: any) => ({
        ...row,
        judullaporan: 'Laporan Role',
        usercetak: user.username,
        tglcetak: new Date().toLocaleDateString(),
        judul: 'PT.TRANSPORINDO AGUNG SEJAHTERA'
      }));
      dispatch(setReportData(reportRows));
      window.open('/reports/role', '_blank');
    } catch (error) {
      console.error('Error generating report:', error);
      alert({
        title: 'Failed to generate the report. Please try again.',
        variant: 'danger',
        submitText: 'OK'
      });
    }
  };
  const handleExport = async () => {
    try {
      const { page, limit, ...filtersWithoutLimit } = filters;

      const response = await exportRoleFn(filtersWithoutLimit); // Kirim data tanpa pagination

      // Buat link untuk mendownload file
      const link = document.createElement('a');
      const url = window.URL.createObjectURL(response);
      link.href = url;
      link.download = `laporan_role${Date.now()}.xlsx`; // Nama file yang diunduh
      link.click(); // Trigger download

      // Revoke URL setelah download
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting user data:', error);
    }
  };

  const handleExportBySelect = async () => {
    if (checkedRows.size === 0) {
      alert({
        title: 'PILIH DATA YANG INGIN DI CETAK!',
        variant: 'danger',
        submitText: 'OK'
      });
      return; // Stop execution if no rows are selected
    }

    // Mengubah checkedRows menjadi format JSON
    const jsonCheckedRows = Array.from(checkedRows).map((id) => ({ id }));
    try {
      const response = await exportRoleBySelectFn(jsonCheckedRows);

      // Buat link untuk mendownload file
      const link = document.createElement('a');
      const url = window.URL.createObjectURL(response);
      link.href = url;
      link.download = `laporan_role${Date.now()}.xlsx`; // Nama file yang diunduh
      link.click(); // Trigger download

      // Revoke URL setelah download
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting user data:', error);
      alert({
        title: 'Failed to generate the export. Please try again.',
        variant: 'danger',
        submitText: 'ok'
      });
    }
  };

  const handleView = () => {
    if (selectedRow !== null) {
      // Dulu view terpaksa menyalakan deleteMode=true agar form read-only.
      // Dengan `mode` string, FormRole menentukan read-only dari mode itu
      // sendiri sehingga tidak ada lagi kombinasi mustahil view+delete.
      fillFormFromRow(rows[selectedRow]);
      setMode('view');
      setPopOver(true);
    }
  };
  const handleClose = () => {
    setPopOver(false);
    setMode('');
    forms.reset();
  };
  function getRowClass(row: Row) {
    const rowIndex = rows.findIndex((r) => r.id === row.id);
    return rowIndex === selectedRow ? 'selected-row' : '';
  }

  function rowKeyGetter(row: Row) {
    return row.id;
  }

  const handleAdd = async () => {
    try {
      setMode('add');
      // Ambil default AKTIF lalu reset SEBELUM modal dibuka: LookUp membaca
      // inputLookupValue/lookupNama lewat getValues() sekali saat mount, jadi
      // nilainya harus sudah ada sebelum Dialog dirender.
      await resetAddForm();
      setPopOver(true);
    } catch (error) {
      console.error('Error add role:', error);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(event.target as Node)
    ) {
      setContextMenu(null);
    }
  };

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
    loadGridConfig(
      user.id,
      'GridRole',
      columns,
      setColumnsOrder,
      setColumnsWidth
    );
  }, []);
  useEffect(() => {
    setIsFirstLoad(true);
  }, []);
  useEffect(() => {
    if (isFirstLoad && gridRef.current && rows.length > 0) {
      setSelectedRow(0);
      gridRef.current.selectCell({ rowIdx: 0, idx: 1 });
      setIsFirstLoad(false);

      dispatch(setRoleacl(rows[0] as unknown as IRole));
    }
  }, [rows, isFirstLoad]);

  useEffect(() => {
    if (triggerSelectRow && rows.length > 0) {
      // Pastikan baris yang dipilih masih valid
      if (selectedRow !== null && selectedRow < rows.length) {
        gridRef.current?.selectCell({ rowIdx: selectedRow, idx: 0 }); // Pilih kembali baris yang sudah dipilih sebelumnya
      }
      dispatch(setTriggerSelectRow(false)); // Reset trigger setelah seleksi ulang
    }
  }, [triggerSelectRow, rows, selectedRow, dispatch]);
  useEffect(() => {
    if (
      selectedRow !== null &&
      rows.length > 0 &&
      selectedRow >= 0 && // Pastikan selectedRow adalah indeks yang valid
      selectedRow < rows.length && // Pastikan selectedRow berada dalam rentang indeks yang valid
      mode !== 'add'
    ) {
      fillFormFromRow(rows[selectedRow]);
    }
    // JANGAN forms.reset() saat mode 'add' di sini. Effect ini ikut ter-trigger
    // setiap kali `rows` di-update (mis. refetch background) selama modal Add
    // terbuka, sehingga me-reset nilai yang sudah diisi user KE kosong --
    // termasuk menghapus STATUS AKTIF = "AKTIF" hasil resetAddForm(). Karena
    // `statusaktif` wajib (z.string().min(1)), akibatnya validasi gagal dan SAVE
    // seolah "tidak terjadi apa-apa". Reset add-mode ditangani handleAdd()/
    // onSuccess() lewat resetAddForm().
  }, [forms, selectedRow, rows, mode]);
  useEffect(() => {
    if (rows.length > 0 && selectedRow !== null) {
      const selectedRowData = rows[selectedRow];
      dispatch(setRoleacl(selectedRowData as unknown as IRole)); // Pastikan data sudah benar
    }
  }, [rows, selectedRow, dispatch]);

  // Fokus baris yang baru disimpan BERDASARKAN ID. Dijalankan tiap `rows`
  // berubah supaya tetap benar setelah effect data menimpa rows dengan hasil
  // refetch. Ref dibersihkan begitu barisnya ketemu, jadi navigasi normal
  // (klik/panah) tidak terganggu.
  useEffect(() => {
    const fid = pendingFocusIdRef.current;
    if (!fid || rows.length === 0) return;
    const idx = rows.findIndex((r) => String(r.id) === String(fid));
    if (idx < 0) return;
    // JANGAN bersihkan ref di sini. `rows` berubah DUA kali setelah simpan:
    // pertama dari data redis (slice(0, pageNumber*limit) = semua item sampai
    // halaman baris baru), lalu dari refetch invalidateQueries (hanya 20 item
    // halaman currentPage). Kedua dataset itu beda panjang/offset, jadi index
    // hasil pass pertama meleset begitu pass kedua mendarat. Ref sengaja
    // dibiarkan hidup selama jendela settle agar SETIAP perubahan rows
    // memfokuskan ulang by-id; pembersihannya lewat timeout di onSuccess.
    setSelectedRow(idx);
    setTimeout(() => {
      gridRef?.current?.selectCell({ rowIdx: idx, idx: 1 });
    }, 50);
  }, [rows]);

  useEffect(() => {
    if (!role || isDataUpdated) return;

    const newRows = role.data || [];

    setRows((prevRows) => {
      // Reset rows if any filter changes (including pagination to page 1)
      if (currentPage === 1 || filters !== prevFilters) {
        setCurrentPage(1); // Reset currentPage to 1
        setFetchedPages(new Set([1])); // Reset fetchedPages to [1]
        return newRows; // Use the fetched new rows directly
      }

      // Add new rows at the bottom for infinite scroll if the current page wasn't fetched before
      if (!fetchedPages.has(currentPage)) {
        return [...prevRows, ...newRows];
      }

      return prevRows;
    });

    if (role.pagination.totalPages) {
      setTotalPages(role.pagination.totalPages);
    }

    setHasMore(newRows.length === filters.limit);
    setFetchedPages((prev) => new Set(prev).add(currentPage));
    setPrevFilters(filters);
  }, [role, currentPage, filters, isFetchingManually, isDataUpdated]);

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
              gridName="GridRole"
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
          columns={columns}
          rows={rows}
          rowKeyGetter={rowKeyGetter}
          rowClass={getRowClass}
          onCellClick={handleCellClick}
          headerRowHeight={70}
          onScroll={handleScroll}
          rowHeight={27}
          className={`${isDark ? 'rdg-dark' : 'rdg-light'} fill-grid`}
          enableVirtualization={false}
          onColumnResize={onColumnResize}
          onColumnsReorder={onColumnsReorder}
          onCellKeyDown={handleKeyDown}
          renderers={{
            noRowsFallback: <EmptyRowsRenderer />
          }}
        />
        <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2">
          <ActionButton
            module="role"
            onAdd={handleAdd}
            checkedRows={checkedRows}
            onDelete={handleDelete}
            onView={handleView}
            onEdit={handleEdit}
            rowsLength={rows.length}
            totalItems={role ? role.pagination.totalItems : 0}
            dropdownMenus={[
              {
                label: 'Report',
                icon: <FaPrint />,
                className: 'bg-cyan-500 hover:bg-cyan-700',
                actions: [
                  {
                    label: 'REPORT ALL',
                    onClick: () => handleReport(),
                    className: 'bg-cyan-500 hover:bg-cyan-700'
                  },
                  {
                    label: 'REPORT BY SELECT',
                    onClick: () => handleReportBySelect(),
                    className: 'bg-cyan-500 hover:bg-cyan-700'
                  }
                ]
              },
              {
                label: 'Export',
                icon: <FaFileExport />,
                className: 'bg-green-600 hover:bg-green-700',
                actions: [
                  {
                    label: 'EXPORT ALL',
                    onClick: () => handleExport(),
                    className: 'bg-green-600 hover:bg-green-700'
                  },
                  {
                    label: 'EXPORT BY SELECT',
                    onClick: () => handleExportBySelect(),
                    className: 'bg-green-600 hover:bg-green-700'
                  }
                ]
              }
            ]}
          />
          {isLoadingRole ? <LoadRowsRenderer /> : null}
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
                    'GridRole',
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
      <FormRole
        key={addFormKey}
        popOver={popOver}
        setPopOver={setPopOver}
        forms={forms}
        handleClose={handleClose}
        // Pola GridAlatbayar: grid yang membungkus handleSubmit SEKALI sambil
        // meneruskan keepOpenModal secara eksplisit. FormRole cukup memanggil
        // onSubmit(false)/onSubmit(true). Ini menghindari double-wrap (yang
        // membuat objek `values` bocor ke slot keepOpenModal sehingga modal tak
        // pernah menutup) tanpa bergantung pada perilaku internal RHF.
        onSubmit={(keepOpenModal: boolean) =>
          forms.handleSubmit((values) => onSubmit(values, keepOpenModal))()
        }
        isLoadingDelete={isLoadingDelete}
        mode={mode}
        isLoadingCreate={isLoadingCreate}
        isLoadingUpdate={isLoadingUpdate}
      />
    </div>
  );
};

export default GridRole;
