import { useEffect, useMemo, useRef, useState } from 'react';
import { FormTabs } from './FormTabs';
import { useTheme } from 'next-themes';
import { IoMdClose } from 'react-icons/io';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import LookUp from '@/components/custom-ui/LookUp';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { FaSave, FaTimes, FaTrashAlt } from 'react-icons/fa';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store/store';
import DataGrid, { Column, DataGridHandle } from 'react-data-grid';
import {
  MarketingBiaya,
  MarketingManager,
  MarketingOrderan,
  MarketingProsesFee
} from '@/lib/types/marketingheader.type';
import { FaRegSquarePlus } from 'react-icons/fa6';
import {
  useGetMarketingBiaya,
  useGetMarketingManager,
  useGetMarketingOrderan,
  useGetMarketingProsesFee
} from '@/lib/server/useMarketingHeader';
import { formatCurrency, parseCurrency } from '@/lib/utils';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import { setSubmitClicked } from '@/lib/store/lookupSlice/lookupSlice';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { useShiftHorizontalScroll } from '@/hooks/use-shift-horizontal-scroll';

const FormMarketing = ({
  popOver,
  setPopOver,
  forms,
  onSubmit,
  mode,
  handleClose,
  isLoadingCreate,
  isLoadingUpdate,
  isLoadingDelete
}: any) => {
  let hasValueMarketingOrderan: any;
  let hasValueMarketingBiaya: any;
  let hasValueMarketingManager: any;
  let hasValueMarketingProsesFee: any;

  const dispatch = useDispatch();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const gridRef = useRef<DataGridHandle>(null);
  const formRef = useRef<HTMLFormElement | null>(null); // Ref untuk form
  const headerData = useSelector((state: RootState) => state.header.headerData);
  const tabFormValues = useSelector((state: RootState) => state.tab.tab);
  const openName = useSelector((state: RootState) => state.lookup.openName);
  // Shift + scroll = geser horizontal. Grid ini lebih lebar dari modal dan
  // react-remove-scroll bawaan Radix Dialog membatalkan wheel-nya.
  useShiftHorizontalScroll();

  const [dataGridKey, setDataGridKey] = useState(0);
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [rowsMarketingOrderan, setRowsMarketingOrderan] = useState<
    (MarketingOrderan | (Partial<MarketingOrderan> & { isNew: boolean }))[]
  >([]);

  const [rowsMarketingBiaya, setRowsMarketingBiaya] = useState<
    (MarketingBiaya | (Partial<MarketingBiaya> & { isNew: boolean }))[]
  >([]);

  const [rowsMarketingManager, setRowsMarketingManager] = useState<
    (MarketingManager | (Partial<MarketingManager> & { isNew: boolean }))[]
  >([]);

  const [rowsMarketingProsesFee, setRowsMarketingProsesFee] = useState<
    (MarketingProsesFee | (Partial<MarketingProsesFee> & { isNew: boolean }))[]
  >([]);

  const {
    data: allDatamarketingOrderan,
    isLoading: isLoadingMarketingOrderan,
    refetch: refetchMarketingOrderan
  } = useGetMarketingOrderan(headerData?.id ?? 0, '', tabFormValues);
  const {
    data: allDatamarketingBiaya,
    isLoading: isLoadingMarketingBiaya,
    refetch: refetchMarketingBiaya
  } = useGetMarketingBiaya(headerData?.id ?? 0, '', tabFormValues);
  const {
    data: allDatamarketingManager,
    isLoading: isLoadingMarketingManager,
    refetch: refetchMarketingManager
  } = useGetMarketingManager(headerData?.id ?? 0, '', tabFormValues);
  const {
    data: allDatamarketingProsesFee,
    isLoading: isLoadingMarketingProsesFee,
    refetch: refetchMarketingProsesFee
  } = useGetMarketingProsesFee(headerData?.id ?? 0, '', tabFormValues);

  const lookupPropsStatusAktif = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS AKTIF LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+aktif',
      label: 'STATUS AKTIF',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusAktifOrderan = [
    {
      // side 'bottom' WAJIB untuk LookUp di dalam grid: tanpa prop ini
      // avoidCollisions aktif dan popover membalik ke ATAS saat ruang di bawah
      // kurang, sehingga daftarnya menutupi header kolom grid.
      side: 'bottom' as const,
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS AKTIF LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+aktif',
      // label: 'STATUS AKTIF',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusAktifBiaya = [
    {
      // side 'bottom' WAJIB untuk LookUp di dalam grid: tanpa prop ini
      // avoidCollisions aktif dan popover membalik ke ATAS saat ruang di bawah
      // kurang, sehingga daftarnya menutupi header kolom grid.
      side: 'bottom' as const,
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS AKTIF LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+aktif',
      // label: 'STATUS AKTIF',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusAktifManager = [
    {
      // side 'bottom' WAJIB untuk LookUp di dalam grid: tanpa prop ini
      // avoidCollisions aktif dan popover membalik ke ATAS saat ruang di bawah
      // kurang, sehingga daftarnya menutupi header kolom grid.
      side: 'bottom' as const,
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS AKTIF LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+aktif',
      // label: 'STATUS AKTIF',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusAktifProsesFee = [
    {
      // side 'bottom' WAJIB untuk LookUp di dalam grid: tanpa prop ini
      // avoidCollisions aktif dan popover membalik ke ATAS saat ruang di bawah
      // kurang, sehingga daftarnya menutupi header kolom grid.
      side: 'bottom' as const,
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS AKTIF LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+aktif',
      // label: 'STATUS AKTIF',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsKaryawan = [
    {
      columns: [{ key: 'namakaryawan', name: 'NAMA KARYAWAN' }],
      labelLookup: 'KARYAWAN LOOKUP',
      // boleh kosong — `required: true` yang memunculkan "KARYAWAN WAJIB DIISI"
      required: false,
      selectedRequired: false,
      endpoint: 'marketing/getLookupKaryawan',
      label: 'KARYAWAN',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'namakaryawan',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusTarget = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS TARGET LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS TARGET',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusBagiFee = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS BAGI FEE LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS BAGI FEE',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusFeeManager = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS FEE MANAGER LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS FEE MANAGER',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsMarketingGroup = [
    {
      columns: [{ key: 'marketing_nama', name: 'NAMA' }],
      labelLookup: 'MARKETING GROUP LOOKUP',
      // boleh kosong
      required: false,
      selectedRequired: false,
      endpoint: 'marketinggroup',
      label: 'MARKETING GROUP',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'marketing_nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusPraFee = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS PRA FEE LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS PRA FEE',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsJenisBiayaMarketing = [
    {
      // side 'bottom' WAJIB untuk LookUp di dalam grid: tanpa prop ini
      // avoidCollisions aktif dan popover membalik ke ATAS saat ruang di bawah
      // kurang, sehingga daftarnya menutupi header kolom grid.
      side: 'bottom' as const,
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'JENIS BIAYA MARKETING LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'jenisbiayamarketing',
      // label: 'JENIS BIAYA MARKETING',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsManageraMarketing = [
    {
      // side 'bottom' WAJIB untuk LookUp di dalam grid: tanpa prop ini
      // avoidCollisions aktif dan popover membalik ke ATAS saat ruang di bawah
      // kurang, sehingga daftarnya menutupi header kolom grid.
      side: 'bottom' as const,
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'MANAGER MARKETING LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'managermarketing',
      // label: 'MANAGER MARKETING',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusPotongBiayaKantor = [
    {
      // side 'bottom' WAJIB untuk LookUp di dalam grid: tanpa prop ini
      // avoidCollisions aktif dan popover membalik ke ATAS saat ruang di bawah
      // kurang, sehingga daftarnya menutupi header kolom grid.
      side: 'bottom' as const,
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS POTONG BIAYA KANTOR LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS POTONG',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsJenisProsesFee = [
    {
      // side 'bottom' WAJIB untuk LookUp di dalam grid: tanpa prop ini
      // avoidCollisions aktif dan popover membalik ke ATAS saat ruang di bawah
      // kurang, sehingga daftarnya menutupi header kolom grid.
      side: 'bottom' as const,
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'JENIS PROSES FEE LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'jenisprosesfee',
      label: 'JENIS PROSES FEE',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const addRowMarketingOrderan = () => {
    const newRow: Partial<MarketingOrderan> & { isNew: boolean } = {
      id: 0, // Placeholder ID
      marketing_id: 0,
      marketing_nama: '',
      nama: '',
      keterangan: '',
      singkatan: '',
      statusaktif: 0,
      statusaktifOrderan_nama: '',
      isNew: true
    };

    setRowsMarketingOrderan((prevRows) => [
      ...prevRows.slice(0, prevRows.length - 1),
      newRow,
      prevRows[prevRows.length - 1]
    ]);
  };

  const addRowMarketingBiaya = () => {
    const newRow: Partial<MarketingBiaya> & { isNew: boolean } = {
      id: 0, // Placeholder ID
      marketing_id: 0,
      marketing_nama: '',
      jenisbiayamarketing_id: 0,
      jenisbiayamarketing_nama: '',
      nominal: '',
      statusaktif: 0,
      statusaktifBiaya_nama: '',
      isNew: true
    };

    setRowsMarketingBiaya((prevRows) => [
      ...prevRows.slice(0, prevRows.length - 1),
      newRow,
      prevRows[prevRows.length - 1]
    ]);
  };

  const addRowMarketingManager = () => {
    const newRow: Partial<MarketingManager> & { isNew: boolean } = {
      id: 0, // Placeholder ID
      marketing_id: 0,
      marketing_nama: '',
      managermarketing_id: 0,
      managermarketing_nama: '',
      statusaktif: 0,
      statusaktifManager_nama: '',
      isNew: true
    };

    setRowsMarketingManager((prevRows) => [
      ...prevRows.slice(0, prevRows.length - 1),
      newRow,
      prevRows[prevRows.length - 1]
    ]);
  };

  const addRowMarketingProsesFee = () => {
    const newRow: Partial<MarketingProsesFee> & { isNew: boolean } = {
      id: 0, // Placeholder ID
      marketing_id: 0,
      marketing_nama: '',
      jenisprosesfee_id: 0,
      jenisprosesfee_nama: '',
      statuspotongbiayakantor: 0,
      statuspotongbiayakantor_nama: '',
      statusaktif: 0,
      statusaktif_nama: '',
      isNew: true
    };

    setRowsMarketingProsesFee((prevRows) => [
      ...prevRows.slice(0, prevRows.length - 1),
      newRow,
      prevRows[prevRows.length - 1]
    ]);
  };

  const deleteRowMarketingOrderan = (index: number) => {
    // if (tabFormValues === 'formMarketingOrderan') {
    setRowsMarketingOrderan(rowsMarketingOrderan.filter((_, i) => i !== index));
    // }
  };

  const deleteRowMarketingBiaya = (index: number) => {
    setRowsMarketingBiaya(rowsMarketingBiaya.filter((_, i) => i !== index));
  };

  const deleteRowMarketingManager = (index: number) => {
    setRowsMarketingManager(rowsMarketingManager.filter((_, i) => i !== index));
  };

  const deleteRowMarketingProsesFee = (index: number) => {
    setRowsMarketingProsesFee(
      rowsMarketingProsesFee.filter((_, i) => i !== index)
    );
  };

  const inputStopPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const handleInputChangeMarketingOrderan = (
    index: number,
    field: string,
    value: string | number
  ) => {
    // if (tabFormValues === 'formMarketingOrderan') {
    setRowsMarketingOrderan((prevRows) => {
      const updatedData = [...prevRows];

      updatedData[index][field] = value;

      if (
        updatedData[index].isNew &&
        Object.values(updatedData[index]).every((val) => val !== '')
      ) {
        updatedData[index].isNew = false;
      }

      return updatedData;
    });
    // }
  };

  const handleInputChangeMarketingBiaya = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setRowsMarketingBiaya((prevRows) => {
      const updatedData = [...prevRows];

      updatedData[index][field] = value;

      if (
        updatedData[index].isNew &&
        Object.values(updatedData[index]).every((val) => val !== '')
      ) {
        updatedData[index].isNew = false;
      }

      return updatedData;
    });
  };

  const handleInputChangeMarketingManager = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setRowsMarketingManager((prevRows) => {
      const updatedData = [...prevRows];

      updatedData[index][field] = value;

      if (
        updatedData[index].isNew &&
        Object.values(updatedData[index]).every((val) => val !== '')
      ) {
        updatedData[index].isNew = false;
      }

      return updatedData;
    });
  };

  const handleInputChangeMarketingProsesFee = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setRowsMarketingProsesFee((prevRows) => {
      const updatedData = [...prevRows];

      updatedData[index][field] = value;

      if (
        updatedData[index].isNew &&
        Object.values(updatedData[index]).every((val) => val !== '')
      ) {
        updatedData[index].isNew = false;
      }

      return updatedData;
    });
  };

  const handleCurrencyChange = (rowIdx: number, rawInput: string) => {
    handleInputChangeMarketingBiaya(rowIdx, 'nominal', rawInput);
  };

  const totalNominal = rowsMarketingBiaya.reduce(
    (acc, row) => acc + (row.nominal ? parseCurrency(row.nominal) : 0),
    0
  );

  const columnsMarketingOrderan = useMemo((): Column<MarketingOrderan>[] => {
    return [
      {
        key: 'aksi',
        name: 'aksi',
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        width: 65,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full w-full cursor-pointer flex-col justify-center px-1">
            <p className="text-sm font-normal">aksi</p>
          </div>
        ),
        renderCell: (props: any) => {
          if (props.row.isAddRow) {
            // If this row is the "Add Row" row, display the Add Row button
            return (
              <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
                <button
                  type="button"
                  className="items-center justify-center rounded bg-transparent text-[#076fde]"
                  onClick={addRowMarketingOrderan}
                >
                  <FaRegSquarePlus className="text-2xl" />
                </button>
              </div>
            );
          }

          // Otherwise, render the delete button for rows with data
          const rowIndex = rowsMarketingOrderan.findIndex(
            (row) => row.id === props.row.id
          );
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
              <button
                type="button"
                className="rounded bg-transparent text-xs text-red-500"
                onClick={() => deleteRowMarketingOrderan(rowIndex)}
              >
                <FaTrashAlt className="text-2xl" />
              </button>
            </div>
          );
        }
      },
      {
        key: 'nomor',
        name: 'NO',
        width: 50,
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        colSpan: (args) => {
          if (args.type === 'ROW' && args.row.isAddRow) {
            // If it's the "Add Row" row, span across multiple columns
            return 5; // Spanning the "Add Row" button across 3 columns (adjust as needed)
          }
          return undefined; // For other rows, no column spanning
        },
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full flex-col items-center justify-center gap-1">
            <p className="text-sm">No.</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="flex h-full w-full cursor-pointer items-center justify-center text-sm">
              {props.row.isAddRow ? '' : props.rowIdx + 1}
            </div>
          );
        }
      },
      {
        key: 'nama',
        name: 'NAMA',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>NAMA</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  type="text"
                  value={props.row.nama}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    handleInputChangeMarketingOrderan(
                      props.rowIdx,
                      'nama',
                      e.target.value
                    )
                  }
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'keterangan',
        name: 'KETERANGAN',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>KETERANGAN</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  type="text"
                  value={props.row.keterangan}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    handleInputChangeMarketingOrderan(
                      props.rowIdx,
                      'keterangan',
                      e.target.value
                    )
                  }
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'singkatan',
        name: 'SINGKATAN',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>SINGKATAN</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  type="text"
                  value={props.row.singkatan}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    handleInputChangeMarketingOrderan(
                      props.rowIdx,
                      'singkatan',
                      e.target.value
                    )
                  }
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'statusaktif',
        name: 'STATUSAKTIF',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>STATUS AKTIF</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow
                ? ''
                : lookupPropsStatusAktifOrderan.map(
                    (statusaktifLookup, index) => (
                      <LookUp
                        key={index}
                        {...statusaktifLookup}
                        label={`STATUSAKTIF_ORDERAN ${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                        lookupValue={(id) => {
                          handleInputChangeMarketingOrderan(
                            props.rowIdx,
                            'statusaktif',
                            id
                          ); // Use props.rowIdx to get the correct index
                        }}
                        onSelectRow={(val) =>
                          handleInputChangeMarketingOrderan(
                            props.rowIdx,
                            'statusaktifOrderan_nama',
                            val?.text
                          )
                        }
                        lookupNama={
                          props.row.statusaktifOrderan_nama
                            ? String(props.row.statusaktifOrderan_nama)
                            : ''
                        }
                        inputLookupValue={Number(props.row.statusaktif)}
                      />
                    )
                  )}
            </div>
          );
        }
      }
    ];
  }, [rowsMarketingOrderan, checkedRows]);

  const columnsMarketingBiaya = useMemo((): Column<MarketingBiaya>[] => {
    return [
      {
        key: 'aksi',
        name: 'aksi',
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        width: 65,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full w-full cursor-pointer flex-col justify-center px-1">
            <p className="text-sm font-normal">aksi</p>
          </div>
        ),
        renderCell: (props: any) => {
          if (props.row.isAddRow) {
            // If this row is the "Add Row" row, display the Add Row button
            return (
              <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
                <button
                  type="button"
                  className="items-center justify-center rounded bg-transparent text-[#076fde]"
                  onClick={addRowMarketingBiaya}
                >
                  <FaRegSquarePlus className="text-2xl" />
                </button>
              </div>
            );
          }

          // Otherwise, render the delete button for rows with data
          const rowIndex = rowsMarketingBiaya.findIndex(
            (row) => row.id === props.row.id
          );
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
              <button
                type="button"
                className="rounded bg-transparent text-xs text-red-500"
                onClick={() => deleteRowMarketingBiaya(rowIndex)}
              >
                <FaTrashAlt className="text-2xl" />
              </button>
            </div>
          );
        }
      },
      {
        key: 'nomor',
        name: 'NO',
        width: 50,
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        colSpan: (args) => {
          if (args.type === 'ROW' && args.row.isAddRow) {
            // If it's the "Add Row" row, span across multiple columns
            return 4; // Spanning the "Add Row" button across 3 columns (adjust as needed)
          }
          return undefined; // For other rows, no column spanning
        },
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full flex-col items-center justify-center gap-1">
            <p className="text-sm">No.</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="flex h-full w-full cursor-pointer items-center justify-center text-sm">
              {props.row.isAddRow ? '' : props.rowIdx + 1}
            </div>
          );
        }
      },
      {
        key: 'jenisbiayamarketing',
        name: 'JENISBIAYAMARKETING',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>JENIS BIAYA MARKETING</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow
                ? ''
                : lookupPropsJenisBiayaMarketing.map(
                    (jenisbiayamarketingLookup, index) => (
                      <LookUp
                        key={index}
                        {...jenisbiayamarketingLookup}
                        label={`JENISBIAYAMARKETING ${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                        lookupValue={(id) => {
                          handleInputChangeMarketingBiaya(
                            props.rowIdx,
                            'jenisbiayamarketing_id',
                            id
                          ); // Use props.rowIdx to get the correct index
                        }}
                        onSelectRow={(val) =>
                          handleInputChangeMarketingBiaya(
                            props.rowIdx,
                            'jenisbiayamarketing_nama',
                            val?.nama
                          )
                        }
                        lookupNama={
                          props.row.jenisbiayamarketing_nama
                            ? String(props.row.jenisbiayamarketing_nama)
                            : ''
                        }
                        inputLookupValue={Number(
                          props.row.jenisbiayamarketing_id
                        )}
                      />
                    )
                  )}
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
        cellClass: 'form-input',
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>Nominal</p>
          </div>
        ),
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.nominal ?? ''; // Nilai nominal awal

          // if (typeof raw === 'number') {
          //   // Cek jika raw belum diformat dengan tanda koma, kemudian format
          //   raw = raw.toString(); // Mengonversi nominal menjadi string
          // }
          // if (!raw.includes(',')) {
          //   // Jika raw tidak mengandung tanda koma, format sebagai currency
          //   raw = formatCurrency(parseFloat(raw)); // Gunakan formatCurrency jika belum ada koma
          // }

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
                  {formatCurrency(totalNominal)}
                </div>
              ) : (
                <InputCurrency
                  value={String(raw)}
                  onValueChange={(value) => handleCurrencyChange(rowIdx, value)}
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'statusaktif',
        name: 'STATUSAKTIF',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>STATUS AKTIF</p>
          </div>
        ),
        renderCell: (props: any) => (
          <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
            {props.row.isAddRow
              ? ''
              : lookupPropsStatusAktifBiaya.map((statusaktifLookup, index) => (
                  <LookUp
                    key={index}
                    {...statusaktifLookup}
                    label={`STATUSAKTIF_BIAYA ${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                    lookupValue={(id) => {
                      handleInputChangeMarketingBiaya(
                        props.rowIdx,
                        'statusaktif',
                        id
                      ); // Use props.rowIdx to get the correct index
                    }}
                    onSelectRow={(val) =>
                      handleInputChangeMarketingBiaya(
                        props.rowIdx,
                        'statusaktifBiaya_nama',
                        val?.text
                      )
                    }
                    lookupNama={
                      props.row.statusaktifBiaya_nama
                        ? String(props.row.statusaktifBiaya_nama)
                        : ''
                    }
                    inputLookupValue={Number(props.row.statusaktif)}
                  />
                ))}
          </div>
        )
      }
    ];
  }, [rowsMarketingBiaya, checkedRows]);

  const columnsMarketingManager = useMemo((): Column<MarketingManager>[] => {
    return [
      {
        key: 'aksi',
        name: 'aksi',
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        width: 65,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full w-full cursor-pointer flex-col justify-center px-1">
            <p className="text-sm font-normal">aksi</p>
          </div>
        ),
        renderCell: (props: any) => {
          if (props.row.isAddRow) {
            // If this row is the "Add Row" row, display the Add Row button
            return (
              <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
                <button
                  type="button"
                  className="items-center justify-center rounded bg-transparent text-[#076fde]"
                  onClick={addRowMarketingManager}
                >
                  <FaRegSquarePlus className="text-2xl" />
                </button>
              </div>
            );
          }

          // Otherwise, render the delete button for rows with data
          const rowIndex = rowsMarketingManager.findIndex(
            (row) => row.id === props.row.id
          );
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
              <button
                type="button"
                className="rounded bg-transparent text-xs text-red-500"
                onClick={() => deleteRowMarketingManager(rowIndex)}
              >
                <FaTrashAlt className="text-2xl" />
              </button>
            </div>
          );
        }
      },
      {
        key: 'nomor',
        name: 'NO',
        width: 50,
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        colSpan: (args) => {
          if (args.type === 'ROW' && args.row.isAddRow) {
            // If it's the "Add Row" row, span across multiple columns
            return 3; // Spanning the "Add Row" button across 3 columns (adjust as needed)
          }
          return undefined; // For other rows, no column spanning
        },
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full flex-col items-center justify-center gap-1">
            <p className="text-sm">No.</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="flex h-full w-full cursor-pointer items-center justify-center text-sm">
              {props.row.isAddRow ? '' : props.rowIdx + 1}
            </div>
          );
        }
      },
      {
        key: 'managermarketing',
        name: 'managermarketing',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>MANAGER MARKETING</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow
                ? ''
                : lookupPropsManageraMarketing.map(
                    (managerMarketingLookup, index) => (
                      <LookUp
                        key={index}
                        {...managerMarketingLookup}
                        label={`MANAGER MARKETING ${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                        lookupValue={(id) => {
                          handleInputChangeMarketingManager(
                            props.rowIdx,
                            'managermarketing_id',
                            id
                          ); // Use props.rowIdx to get the correct index
                        }}
                        onSelectRow={(val) =>
                          handleInputChangeMarketingManager(
                            props.rowIdx,
                            'managermarketing_nama',
                            val?.nama
                          )
                        }
                        lookupNama={
                          props.row.managermarketing_nama
                            ? String(props.row.managermarketing_nama)
                            : ''
                        }
                        inputLookupValue={Number(props.row.managermarketing_id)}
                      />
                    )
                  )}
            </div>
          );
        }
      },
      {
        key: 'statusaktif',
        name: 'STATUSAKTIF',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>STATUS AKTIF</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow
                ? ''
                : lookupPropsStatusAktifManager.map(
                    (statusaktifLookup, index) => (
                      <LookUp
                        key={index}
                        {...statusaktifLookup}
                        label={`STATUSAKTIF_MANAGER ${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                        lookupValue={(id) => {
                          handleInputChangeMarketingManager(
                            props.rowIdx,
                            'statusaktif',
                            id
                          ); // Use props.rowIdx to get the correct index
                        }}
                        onSelectRow={(val) =>
                          handleInputChangeMarketingManager(
                            props.rowIdx,
                            'statusaktifManager_nama',
                            val?.text
                          )
                        }
                        lookupNama={
                          props.row.statusaktifManager_nama
                            ? String(props.row.statusaktifManager_nama)
                            : ''
                        }
                        inputLookupValue={Number(props.row.statusaktif)}
                      />
                    )
                  )}
            </div>
          );
        }
      }
    ];
  }, [rowsMarketingManager, checkedRows]);

  const columnsMarketingProsesFee =
    useMemo((): Column<MarketingProsesFee>[] => {
      return [
        {
          key: 'aksi',
          name: 'aksi',
          headerCellClass: 'column-headers',
          cellClass: 'form-input',
          width: 65,
          renderHeaderCell: (column: any) => (
            <div className="flex h-full w-full cursor-pointer flex-col justify-center px-1">
              <p className="text-sm font-normal">aksi</p>
            </div>
          ),
          renderCell: (props: any) => {
            if (props.row.isAddRow) {
              // If this row is the "Add Row" row, display the Add Row button
              return (
                <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
                  <button
                    type="button"
                    className="items-center justify-center rounded bg-transparent text-[#076fde]"
                    onClick={addRowMarketingProsesFee}
                  >
                    <FaRegSquarePlus className="text-2xl" />
                  </button>
                </div>
              );
            }

            // Otherwise, render the delete button for rows with data
            const rowIndex = rowsMarketingProsesFee.findIndex(
              (row) => row.id === props.row.id
            );
            return (
              <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
                <button
                  type="button"
                  className="rounded bg-transparent text-xs text-red-500"
                  onClick={() => deleteRowMarketingProsesFee(rowIndex)}
                >
                  <FaTrashAlt className="text-2xl" />
                </button>
              </div>
            );
          }
        },
        {
          key: 'nomor',
          name: 'NO',
          width: 50,
          resizable: true,
          draggable: true,
          headerCellClass: 'column-headers',
          cellClass: 'form-input',
          colSpan: (args) => {
            if (args.type === 'ROW' && args.row.isAddRow) {
              // If it's the "Add Row" row, span across multiple columns
              return 4; // Spanning the "Add Row" button across 3 columns (adjust as needed)
            }
            return undefined; // For other rows, no column spanning
          },
          renderHeaderCell: (column: any) => (
            <div className="flex h-full flex-col items-center justify-center gap-1">
              <p className="text-sm">No.</p>
            </div>
          ),
          renderCell: (props: any) => {
            return (
              <div className="flex h-full w-full cursor-pointer items-center justify-center text-sm">
                {props.row.isAddRow ? '' : props.rowIdx + 1}
              </div>
            );
          }
        },
        {
          key: 'jenisprosesfee',
          name: 'jenisprosesfee',
          headerCellClass: 'column-headers',
          resizable: true,
          draggable: true,
          cellClass: 'form-input',
          width: 200,
          renderHeaderCell: (column: any) => (
            <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
              <p className={`text-sm`}>JENIS PROSES FEE</p>
            </div>
          ),
          renderCell: (props: any) => {
            return (
              <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
                {props.row.isAddRow
                  ? ''
                  : lookupPropsJenisProsesFee.map(
                      (jenisprosesfeeLookup, index) => (
                        <LookUp
                          key={index}
                          {...jenisprosesfeeLookup}
                          label={`JENISPROSESFEE ${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                          lookupValue={(id) => {
                            handleInputChangeMarketingProsesFee(
                              props.rowIdx,
                              'jenisprosesfee_id',
                              id
                            ); // Use props.rowIdx to get the correct index
                          }}
                          onSelectRow={(val) =>
                            handleInputChangeMarketingProsesFee(
                              props.rowIdx,
                              'jenisprosesfee_nama',
                              val?.nama
                            )
                          }
                          lookupNama={
                            props.row.jenisprosesfee_nama
                              ? String(props.row.jenisprosesfee_nama)
                              : ''
                          }
                          inputLookupValue={Number(props.row.jenisprosesfee_id)}
                        />
                      )
                    )}
              </div>
            );
          }
        },
        {
          key: 'statuspotongbiayakantor',
          name: 'statuspotongbiayakantor',
          headerCellClass: 'column-headers',
          resizable: true,
          draggable: true,
          cellClass: 'form-input',
          width: 250,
          renderHeaderCell: (column: any) => (
            <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
              <p className={`text-sm`}>STATUS POTONG BIAYA KANTOR</p>
            </div>
          ),
          renderCell: (props: any) => {
            return (
              <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
                {props.row.isAddRow
                  ? ''
                  : lookupPropsStatusPotongBiayaKantor.map(
                      (statuspotongLookup, index) => (
                        <LookUp
                          key={index}
                          {...statuspotongLookup}
                          label={`STATUS POTONG ${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                          lookupValue={(id) => {
                            handleInputChangeMarketingProsesFee(
                              props.rowIdx,
                              'statuspotongbiayakantor',
                              id
                            ); // Use props.rowIdx to get the correct index
                          }}
                          onSelectRow={(val) =>
                            handleInputChangeMarketingProsesFee(
                              props.rowIdx,
                              'statuspotongbiayakantor_nama',
                              val?.text
                            )
                          }
                          lookupNama={
                            props.row.statuspotongbiayakantor_nama
                              ? String(props.row.statuspotongbiayakantor_nama)
                              : ''
                          }
                          inputLookupValue={Number(
                            props.row.statuspotongbiayakantor
                          )}
                        />
                      )
                    )}
              </div>
            );
          }
        },
        {
          key: 'statusaktif',
          name: 'STATUSAKTIF',
          headerCellClass: 'column-headers',
          resizable: true,
          draggable: true,
          cellClass: 'form-input',
          width: 200,
          renderHeaderCell: (column: any) => (
            <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
              <p className={`text-sm`}>STATUS AKTIF</p>
            </div>
          ),
          renderCell: (props: any) => {
            return (
              <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
                {props.row.isAddRow
                  ? ''
                  : lookupPropsStatusAktifProsesFee.map(
                      (statusaktifLookup, index) => (
                        <LookUp
                          key={index}
                          {...statusaktifLookup}
                          label={`STATUSAKTIF_PROSESFEE ${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                          lookupValue={(id) => {
                            handleInputChangeMarketingProsesFee(
                              props.rowIdx,
                              'statusaktif',
                              id
                            ); // Use props.rowIdx to get the correct index
                          }}
                          onSelectRow={(val) =>
                            handleInputChangeMarketingProsesFee(
                              props.rowIdx,
                              'statusaktif_nama',
                              val?.text
                            )
                          }
                          lookupNama={
                            props.row.statusaktif_nama
                              ? String(props.row.statusaktif_nama)
                              : ''
                          }
                          inputLookupValue={Number(props.row.statusaktif)}
                        />
                      )
                    )}
              </div>
            );
          }
        }
      ];
    }, [rowsMarketingProsesFee, checkedRows]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Fungsi untuk menangani pergerakan fokus berdasarkan tombol
      if (openName) {
        // Jika popOverDate ada nilainya, jangan lakukan apa-apa
        return;
      }

      const form = formRef.current;
      if (!form) return;

      const inputs = Array.from(
        form.querySelectorAll('input, select, textarea, button')
      ).filter(
        (element) =>
          element.id !== 'image-dropzone' &&
          element.tagName !== 'BUTTON' &&
          !element.hasAttribute('readonly') // Pengecualian jika input readonly
      ) as HTMLElement[]; // Ambil semua input dalam form kecuali button dan readonly inputs

      const focusedElement = document.activeElement as HTMLElement;
      const isImageDropzone =
        document.querySelector('input#image-dropzone') === focusedElement; // Cek apakah elemen yang difokuskan adalah dropzone
      const isFileInput =
        document.querySelector('input#file-input') === focusedElement;

      if (isImageDropzone || isFileInput) return; // Jangan pindah fokus jika elemen fokus adalah dropzone atau input file

      let nextElement: HTMLElement | null = null;

      if (event.key === 'ArrowDown' || event.key === 'Tab') {
        nextElement = getNextFocusableElement(inputs, focusedElement, 'down');
        if (event.key === 'Tab') {
          event.preventDefault(); // Cegah default tab behavior jika ingin mengontrol pergerakan fokus
        }
      } else if (
        event.key === 'ArrowUp' ||
        (event.shiftKey && event.key === 'Tab')
      ) {
        nextElement = getNextFocusableElement(inputs, focusedElement, 'up');
      }
      // Jika ditemukan input selanjutnya, pindahkan fokus
      if (nextElement) {
        nextElement.focus();
      }
    };

    const getNextFocusableElement = (
      // Fungsi untuk mendapatkan elemen input selanjutnya berdasarkan arah (down atau up)
      inputs: HTMLElement[],
      currentElement: HTMLElement,
      direction: 'up' | 'down'
    ): HTMLElement | null => {
      const index = Array.from(inputs).indexOf(currentElement as any);

      if (direction === 'down') {
        if (index === inputs.length - 1) {
          // Jika sudah di input terakhir, tidak perlu pindah fokus
          return null; // Tidak ada elemen selanjutnya
        }
        return inputs[index + 1]; // Fokus pindah ke input setelahnya
      } else {
        return inputs[index - 1]; // Fokus pindah ke input sebelumnya
      }
    };

    document.addEventListener('keydown', handleKeyDown); // Menambahkan event listener untuk keydown

    return () => {
      // Membersihkan event listener ketika komponen tidak lagi digunakan
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openName]); // Tambahkan popOverDate sebagai dependen

  const firstRowMarketingOrderan = rowsMarketingOrderan[0];
  const firstRowMarketingBiaya = rowsMarketingBiaya[0];
  const firstRowMarketingManager = rowsMarketingManager[0];
  const firstRowMarketingProsesFee = rowsMarketingProsesFee[0];

  if (firstRowMarketingOrderan) {
    const { isNew, ...cekRows } = firstRowMarketingOrderan;
    hasValueMarketingOrderan = Object.values(cekRows).some(
      (v) => v !== '' && v !== 0 && v !== null && v !== undefined
    );
  }

  if (firstRowMarketingBiaya) {
    const { isNew, ...cekRows } = firstRowMarketingBiaya;
    hasValueMarketingBiaya = Object.values(cekRows).some(
      (v) => v !== '' && v !== 0 && v !== null && v !== undefined
    );
  }

  if (firstRowMarketingManager) {
    const { isNew, ...cekRows } = firstRowMarketingManager;
    hasValueMarketingManager = Object.values(cekRows).some(
      (v) => v !== '' && v !== 0 && v !== null && v !== undefined
    );
  }

  if (firstRowMarketingProsesFee) {
    const { isNew, ...cekRows } = firstRowMarketingProsesFee;
    hasValueMarketingProsesFee = Object.values(cekRows).some(
      (v) => v !== '' && v !== 0 && v !== null && v !== undefined
    );
  }

  useEffect(() => {
    // if (allDatamarketingOrderan && tabFormValues == 'formMarketingOrderan') {
    //   if (allDatamarketingOrderan?.data?.length > 0 && mode !== 'add' && mode != '') {
    if (allDatamarketingOrderan) {
      if (allDatamarketingOrderan?.data?.length > 0 && mode !== 'add') {
        const formattedRows = allDatamarketingOrderan.data.map((item: any) => ({
          id: Number(item.id),
          marketing_id: Number(item.marketing_id) ?? '',
          marketing_nama: item.marketing_nama ?? '',
          nama: item.nama ?? '',
          keterangan: item.keterangan ?? '',
          singkatan: item.singkatan ?? '',
          statusaktif: Number(item.statusaktif) ?? '',
          statusaktifOrderan_nama: item.statusaktif_nama ?? '',
          isNew: false
        }));

        setRowsMarketingOrderan([
          ...formattedRows,
          { isAddRow: true, id: 'add_row', isNew: false }
        ]);
      } else {
        // if (!hasValueMarketingOrderan) {
        setRowsMarketingOrderan([
          {
            id: 0,
            marketing_id: 0,
            marketing_nama: '',
            nama: '',
            keterangan: '',
            singkatan: '',
            statusaktif: 0,
            statusaktifOrderan_nama: '',
            isNew: true
          },
          { isAddRow: true, id: 'add_row', isNew: false }
        ]);
        // } else {
        //
        // }
      }
    }
  }, [allDatamarketingOrderan, headerData?.id, mode]);
  // }, [allDatamarketingOrderan, headerData?.id, mode, tabFormValues, hasValueMarketingOrderan]);

  useEffect(() => {
    // if (allDatamarketingBiaya && tabFormValues == 'formMarketingBiaya') {
    //   if (allDatamarketingBiaya?.data?.length > 0 && mode !== 'add' && mode != '') {
    if (allDatamarketingBiaya) {
      if (allDatamarketingBiaya?.data?.length > 0 && mode !== 'add') {
        const formattedRows = allDatamarketingBiaya.data.map((item: any) => ({
          id: Number(item.id),
          marketing_id: Number(item.marketing_id) ?? '',
          marketing_nama: item.marketing_nama ?? '',
          jenisbiayamarketing_id: Number(item.jenisbiayamarketing_id) ?? '',
          jenisbiayamarketing_nama: item.jenisbiayamarketing_nama ?? '',
          nominal: String(item.nominal) ?? '',
          statusaktif: Number(item.statusaktif) ?? '',
          statusaktifBiaya_nama: item.statusaktif_nama ?? '',
          isNew: false
        }));

        setRowsMarketingBiaya([
          ...formattedRows,
          { isAddRow: true, id: 'add_row', isNew: false }
        ]);
      } else {
        // if (!hasValueMarketingBiaya) {
        setRowsMarketingBiaya([
          {
            id: 0,
            marketing_id: 0,
            marketing_nama: '',
            jenisbiayamarketing_id: 0,
            jenisbiayamarketing_nama: '',
            nominal: '',
            statusaktif: 0,
            statusaktifBiaya_nama: '',
            isNew: true
          },
          { isAddRow: true, id: 'add_row', isNew: false }
        ]);
        // }
      }
    }
    // }, [allDatamarketingBiaya, headerData?.id, mode, tabFormValues, hasValueMarketingBiaya]);
  }, [allDatamarketingBiaya, headerData?.id, mode]);

  useEffect(() => {
    // if (allDatamarketingManager && tabFormValues == 'formMarketingManager') {
    //   if (allDatamarketingManager?.data?.length > 0 && mode !== 'add' && mode != '') {
    if (allDatamarketingManager) {
      if (allDatamarketingManager?.data?.length > 0 && mode !== 'add') {
        const formattedRows = allDatamarketingManager.data.map((item: any) => ({
          id: Number(item.id),
          marketing_id: Number(item.marketing_id) ?? '',
          marketing_nama: item.marketing_nama ?? '',
          managermarketing_id: Number(item.managermarketing_id) ?? '',
          managermarketing_nama: item.managermarketing_nama ?? '',
          statusaktif: Number(item.statusaktif) ?? '',
          statusaktifManager_nama: item.statusaktif_nama ?? '',
          isNew: false
        }));

        setRowsMarketingManager([
          ...formattedRows,
          { isAddRow: true, id: 'add_row', isNew: false }
        ]);
      } else {
        // if (!hasValueMarketingManager) {
        setRowsMarketingManager([
          {
            id: 0,
            marketing_id: 0,
            marketing_nama: '',
            managermarketing_id: 0,
            managermarketing_nama: '',
            statusaktif: 0,
            statusaktifManager_nama: '',
            isNew: true
          },
          { isAddRow: true, id: 'add_row', isNew: false }
        ]);
        // }
      }
    }
  }, [allDatamarketingManager, headerData?.id, mode]);
  // }, [allDatamarketingManager, headerData?.id, mode, tabFormValues, hasValueMarketingManager]);

  useEffect(() => {
    // if (allDatamarketingProsesFee && tabFormValues == 'formMarketingProsesFee') {
    //   if (allDatamarketingProsesFee?.data?.length > 0 && mode !== 'add' && mode != '') {
    if (allDatamarketingProsesFee) {
      if (allDatamarketingProsesFee?.data?.length > 0 && mode !== 'add') {
        const formattedRows = allDatamarketingProsesFee.data.map(
          (item: any) => ({
            id: Number(item.id),
            marketing_id: Number(item.marketing_id) ?? '',
            marketing_nama: item.marketing_nama ?? '',
            jenisprosesfee_id: Number(item.jenisprosesfee_id) ?? 0,
            jenisprosesfee_nama: item.jenisprosesfee_nama ?? '',
            statuspotongbiayakantor: Number(item.statuspotongbiayakantor) ?? '',
            statuspotongbiayakantor_nama:
              item.statuspotongbiayakantor_nama ?? '',
            statusaktif: Number(item.statusaktif) ?? '',
            statusaktif_nama: item.statusaktif_nama ?? '',
            isNew: false
          })
        );

        setRowsMarketingProsesFee([
          ...formattedRows,
          { isAddRow: true, id: 'add_row', isNew: false }
        ]);
      } else {
        // if (!hasValueMarketingProsesFee) {
        setRowsMarketingProsesFee([
          {
            id: 0,
            marketing_id: 0,
            marketing_nama: '',
            jenisprosesfee_id: 0,
            jenisprosesfee_nama: '',
            statuspotongbiayakantor: 0,
            statuspotongbiayakantor_nama: '',
            statusaktif: 0,
            statusaktif_nama: '',
            isNew: true
          },
          { isAddRow: true, id: 'add_row', isNew: false }
        ]);
        // }
      }
    }
    // }, [allDatamarketingProsesFee, headerData?.id, mode, tabFormValues, hasValueMarketingProsesFee]);
  }, [allDatamarketingProsesFee, headerData?.id, mode]);

  useEffect(() => {
    if (rowsMarketingOrderan) {
      // Filter out the `isNew` field and any object with `id: "add_row"`
      const filteredRows = rowsMarketingOrderan
        .filter((row) => row.id !== 'add_row') // Exclude rows with id "add_row"
        .map(({ isNew, ...rest }) => ({
          ...rest
        }));

      forms.setValue('marketingorderan', filteredRows);
    }
  }, [rowsMarketingOrderan]);

  useEffect(() => {
    if (rowsMarketingBiaya) {
      // Filter out the `isNew` field and any object with `id: "add_row"`
      const filteredRows = rowsMarketingBiaya
        .filter((row) => row.id !== 'add_row') // Exclude rows with id "add_row"
        .map(({ isNew, ...rest }) => ({
          ...rest
        }));

      forms.setValue('marketingbiaya', filteredRows);
    }
  }, [rowsMarketingBiaya]);

  useEffect(() => {
    if (rowsMarketingManager) {
      // Filter out the `isNew` field and any object with `id: "add_row"`
      const filteredRows = rowsMarketingManager
        .filter((row) => row.id !== 'add_row') // Exclude rows with id "add_row"
        .map(({ isNew, ...rest }) => ({
          ...rest
        }));

      forms.setValue('marketingmanager', filteredRows);
    }
  }, [rowsMarketingManager]);

  useEffect(() => {
    if (rowsMarketingProsesFee) {
      const filteredRows = rowsMarketingProsesFee
        .filter((row) => row.id !== 'add_row')
        .map(({ isNew, ...rest }) => ({
          ...rest
        }));

      forms.setValue('marketingprosesfee', filteredRows);
    }
  }, [rowsMarketingProsesFee]);

  // console.log(
  //   'rowsMarketingOrderan', rowsMarketingOrderan,
  //   'rowsMarketingBiaya', rowsMarketingBiaya,
  //   'rowsMarketingManager', rowsMarketingManager,
  //   'rowsMarketingProsesFee', rowsMarketingProsesFee
  // );

  useEffect(() => {
    if (tabFormValues == 'formMarketingOrderan') {
      refetchMarketingOrderan();
    }
  }, [headerData?.id, refetchMarketingOrderan]);

  useEffect(() => {
    if (tabFormValues == 'formMarketingBiaya') {
      refetchMarketingBiaya();
    }
  }, [headerData?.id, refetchMarketingBiaya]);

  useEffect(() => {
    if (tabFormValues == 'formMarketingManager') {
      refetchMarketingManager();
    }
  }, [headerData?.id, refetchMarketingManager]);

  useEffect(() => {
    if (tabFormValues == 'formMarketingProsesFee') {
      refetchMarketingProsesFee();
    }
  }, [headerData?.id, refetchMarketingProsesFee]);

  useEffect(() => {
    if (forms.getValues()?.marketingorderan?.length === 0) {
      setRowsMarketingOrderan([
        {
          id: 0,
          marketing_id: 0,
          marketing_nama: '',
          nama: '',
          keterangan: '',
          singkatan: '',
          statusaktif: 0,
          statusaktifOrderan_nama: '',
          isNew: true
        },
        { isAddRow: true, id: 'add_row', isNew: false }
      ]);
    }

    if (forms.getValues()?.marketingbiaya?.length === 0) {
      setRowsMarketingBiaya([
        {
          id: 0,
          marketing_id: 0,
          marketing_nama: '',
          jenisbiayamarketing_id: 0,
          jenisbiayamarketing_nama: '',
          nominal: '',
          statusaktif: 0,
          statusaktifBiaya_nama: '',
          isNew: true
        },
        { isAddRow: true, id: 'add_row', isNew: false }
      ]);
    }

    if (forms.getValues()?.marketingmanager?.length === 0) {
      setRowsMarketingManager([
        {
          id: 0,
          marketing_id: 0,
          marketing_nama: '',
          managermarketing_id: 0,
          managermarketing_nama: '',
          statusaktif: 0,
          statusaktifManager_nama: '',
          isNew: true
        },
        { isAddRow: true, id: 'add_row', isNew: false }
      ]);
    }

    if (forms.getValues()?.marketingprosesfee?.length === 0) {
      setRowsMarketingProsesFee([
        {
          id: 0,
          marketing_id: 0,
          marketing_nama: '',
          jenisprosesfee_id: 0,
          jenisprosesfee_nama: '',
          statuspotongbiayakantor: 0,
          statuspotongbiayakantor_nama: '',
          statusaktif: 0,
          statusaktif_nama: '',
          isNew: true
        },
        { isAddRow: true, id: 'add_row', isNew: false }
      ]);
    }
  }, [forms, forms.getValues()]);

  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Add Marketing'
              : mode === 'edit'
              ? 'Edit Marketing'
              : mode === 'delete'
              ? 'Delete Marketing'
              : 'View Marketing'}
          </h2>
          <div
            className="cursor-pointer rounded-md border border-zinc-200 bg-red-500 p-0 hover:bg-red-400"
            onClick={() => {
              setPopOver(false);
              handleClose();
            }}
          >
            <IoMdClose className="h-5 w-5 font-bold text-white" />
          </div>
        </div>
        <div className="h-full flex-1 overflow-y-auto bg-background-card pl-1 pr-2">
          <div className="h-full bg-background-card px-5 py-3">
            <Form {...forms}>
              <form
                ref={formRef}
                onSubmit={onSubmit}
                className="flex h-full flex-col gap-6"
              >
                <div className="flex h-[100%] flex-col gap-2 lg:gap-3">
                  <FormField
                    name="nama"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          NAMA
                        </FormLabel>
                        <div className="fle x flex-col lg:w-[85%]">
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ''}
                              type="text"
                              readOnly={mode === 'view' || mode === 'delete'}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="kode"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          KODE MARKETING
                        </FormLabel>
                        <div className="fle x flex-col lg:w-[85%]">
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ''}
                              type="text"
                              readOnly={mode === 'view' || mode === 'delete'}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="keterangan"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          KETERANGAN
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ''}
                              type="text"
                              readOnly={mode === 'view' || mode === 'delete'}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={true}
                        className="text-sm font-semibold"
                      >
                        Status Aktif
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookupPropsStatusAktif.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(id) => {
                            forms.setValue('statusaktif', id);
                            // forms.setValues('statusaktif_nama', id.)
                          }}
                          onSelectRow={(val) => {
                            forms.setValue('statusaktif_nama', val?.text);
                          }}
                          inputLookupValue={forms.getValues('statusaktif')}
                          lookupNama={forms.getValues('statusaktif_nama')}
                        />
                      ))}
                    </div>
                  </div>

                  <FormField
                    name="email"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          EMAIL
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ''}
                              type="text"
                              readOnly={mode === 'view' || mode === 'delete'}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel className="text-sm font-semibold">
                        Karyawan
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookupPropsKaryawan.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(id) =>
                            forms.setValue('karyawan_id', id)
                          }
                          onSelectRow={(val) => {
                            forms.setValue('karyawan_nama', val?.namakaryawan);
                          }}
                          inputLookupValue={forms.getValues('karyawan_id')}
                          lookupNama={forms.getValues('karyawan_nama')}
                        />
                      ))}
                    </div>
                  </div>

                  <FormField
                    name="tglmasuk"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          TGL MASUK
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <InputDatePicker
                              value={field.value}
                              onChange={field.onChange}
                              showCalendar={mode == 'add' || mode == 'edit'}
                              disabled={mode == 'delete' || mode == 'view'}
                              onSelect={(date) =>
                                forms.setValue('tglmasuk', date)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={true}
                        className="text-sm font-semibold"
                      >
                        Status Target
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookupPropsStatusTarget.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(id) =>
                            forms.setValue('statustarget', id)
                          }
                          onSelectRow={(val) => {
                            forms.setValue('statustarget_nama', val?.text);
                          }}
                          inputLookupValue={forms.getValues('statustarget')}
                          lookupNama={forms.getValues('statustarget_nama')}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={true}
                        className="text-sm font-semibold"
                      >
                        Status Bagi Fee
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookupPropsStatusBagiFee.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(id) =>
                            forms.setValue('statusbagifee', id)
                          }
                          onSelectRow={(val) => {
                            forms.setValue('statusbagifee_nama', val?.text);
                          }}
                          inputLookupValue={forms.getValues('statusbagifee')}
                          lookupNama={forms.getValues('statusbagifee_nama')}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={true}
                        className="text-sm font-semibold"
                      >
                        Status Fee Manager
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookupPropsStatusFeeManager.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(id) =>
                            forms.setValue('statusfeemanager', id)
                          }
                          onSelectRow={(val) => {
                            forms.setValue('statusfeemanager_nama', val?.text);
                          }}
                          inputLookupValue={forms.getValues('statusfeemanager')}
                          lookupNama={forms.getValues('statusfeemanager_nama')}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel className="text-sm font-semibold">
                        Marketing Group
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookupPropsMarketingGroup.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(id) =>
                            forms.setValue('marketinggroup_id', id)
                          }
                          onSelectRow={(val) => {
                            forms.setValue(
                              'marketinggroup_nama',
                              val?.marketing_nama
                            );
                          }}
                          inputLookupValue={forms.getValues(
                            'marketinggroup_id'
                          )}
                          lookupNama={forms.getValues('marketinggroup_nama')}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={true}
                        className="text-sm font-semibold"
                      >
                        Status Pra Fee
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookupPropsStatusPraFee.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(id) =>
                            forms.setValue('statusprafee', id)
                          }
                          onSelectRow={(val) => {
                            forms.setValue('statusprafee_nama', val?.text);
                          }}
                          inputLookupValue={forms.getValues('statusprafee')}
                          lookupNama={forms.getValues('statusprafee_nama')}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="h-[500px] min-h-[500px]">
                    <div className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background">
                      <FormTabs mode={mode} forms={forms} />

                      {tabFormValues === 'formMarketingOrderan' && (
                        <DataGrid
                          ref={gridRef}
                          columns={columnsMarketingOrderan as any[]}
                          defaultColumnOptions={{
                            sortable: true,
                            resizable: true
                          }}
                          rows={rowsMarketingOrderan}
                          headerRowHeight={40}
                          rowHeight={55}
                          renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
                          className={`${
                            isDark ? 'rdg-dark' : 'rdg-light'
                          } fill-grid`}
                          enableVirtualization={false}
                        />
                      )}

                      {tabFormValues === 'formMarketingBiaya' && (
                        <>
                          <DataGrid
                            ref={gridRef}
                            columns={columnsMarketingBiaya as any[]}
                            defaultColumnOptions={{
                              sortable: true,
                              resizable: true
                            }}
                            rows={rowsMarketingBiaya}
                            headerRowHeight={40}
                            rowHeight={55}
                            renderers={{
                              noRowsFallback: <EmptyRowsRenderer />
                            }}
                            className={`${
                              isDark ? 'rdg-dark' : 'rdg-light'
                            } fill-grid`}
                            enableVirtualization={false}
                          />
                          {/* <div
                            className="flex flex-row border border-b-0 border-l-0 border-blue-500 p-2"
                            style={{ gridColumn: '1/3' }}
                          >
                            <div className="flex w-full flex-row items-center justify-between">
                              <p className="text-sm font-semibold">Total</p>
                              <div className="flex flex-row gap-3">
                                <p className="text-sm font-semibold">
                                  {formatCurrency(totalSisa)}
                                </p>
                                <p className="text-sm font-semibold">
                                  {formatCurrency(totalNominal)}
                                </p>
                              </div>
                            </div>
                          </div> */}
                        </>
                      )}

                      {tabFormValues === 'formMarketingManager' && (
                        <DataGrid
                          ref={gridRef}
                          columns={columnsMarketingManager as any[]}
                          defaultColumnOptions={{
                            sortable: true,
                            resizable: true
                          }}
                          rows={rowsMarketingManager}
                          headerRowHeight={40}
                          rowHeight={55}
                          renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
                          className={`${
                            isDark ? 'rdg-dark' : 'rdg-light'
                          } fill-grid`}
                          enableVirtualization={false}
                        />
                      )}

                      {tabFormValues === 'formMarketingProsesFee' && (
                        <DataGrid
                          ref={gridRef}
                          columns={columnsMarketingProsesFee as any[]}
                          defaultColumnOptions={{
                            sortable: true,
                            resizable: true
                          }}
                          rows={rowsMarketingProsesFee}
                          headerRowHeight={40}
                          rowHeight={55}
                          renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
                          className={`${
                            isDark ? 'rdg-dark' : 'rdg-light'
                          } fill-grid`}
                          enableVirtualization={false}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </div>
        <FormFooterButtons
          mode={mode}
          onSave={() => {
            onSubmit(false);
            dispatch(setSubmitClicked(true));
          }}
          onSaveAndAdd={() => {
            onSubmit(true);
            dispatch(setSubmitClicked(true));
          }}
          onCancel={handleClose}
          isLoadingCreate={isLoadingCreate}
          isLoadingUpdate={isLoadingUpdate}
          isLoadingDelete={isLoadingDelete}
          deleteMode={mode === 'delete'}
        />
      </DialogContent>
    </Dialog>
  );
};

export default FormMarketing;
