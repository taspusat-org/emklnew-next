import { FormTabs } from './FormTabs';
import { useTheme } from 'next-themes';
import { IoMdClose } from 'react-icons/io';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import { FaRegSquarePlus } from 'react-icons/fa6';
import LookUp from '@/components/custom-ui/LookUp';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { useSelector, useDispatch } from 'react-redux';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { formatCurrency, parseCurrency } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaSave, FaTimes, FaTrashAlt } from 'react-icons/fa';
import { JENISORDERMUATAN } from '@/constants/biayaextraheader';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import DataGrid, { Column, DataGridHandle } from 'react-data-grid';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import { setSubmitClicked } from '@/lib/store/lookupSlice/lookupSlice';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useShiftHorizontalScroll } from '@/hooks/use-shift-horizontal-scroll';
import {
  EstimasiBiayaDetailBiaya,
  EstimasiBiayaDetailInvoice
} from '@/lib/types/estimasibiayaheader.type';
import {
  useGetEstimasiBiayaDetailBiaya,
  useGetEstimasiBiayaDetailInvoice
} from '@/lib/server/useEstimasiBiayaHeader';
import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import FormLabel, {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/components/ui/form';

const FormEstimasiBiayaHeader = ({
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
  const todayDate = new Date();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  // Shift + scroll = geser horizontal. Grid ini lebih lebar dari modal dan
  // react-remove-scroll bawaan Radix Dialog membatalkan wheel-nya.
  useShiftHorizontalScroll();

  const [dataGridKey, setDataGridKey] = useState(0);
  const [editingRowId, setEditingRowId] = useState(0); // Menyimpan ID baris yang sedang diedit
  const [editableValues, setEditableValues] = useState<Map<number, string>>(
    new Map()
  ); // Nilai yang sedang diedit untuk setiap baris
  const [rows, setRows] = useState<
    (
      | EstimasiBiayaDetailBiaya
      | (Partial<EstimasiBiayaDetailBiaya> & { isNew: boolean })
    )[]
  >([]);

  const [rowsDetailInvoice, setRowsDetailInvoice] = useState<
    (
      | EstimasiBiayaDetailInvoice
      | (Partial<EstimasiBiayaDetailInvoice> & { isNew: boolean })
    )[]
  >([]);

  const dispatch = useDispatch();
  const gridRef = useRef<DataGridHandle>(null);
  const formRef = useRef<HTMLFormElement | null>(null); // Ref untuk form
  const openName = useSelector((state: RootState) => state.lookup.openName);
  const headerData = useSelector((state: RootState) => state.header.headerData);
  const tabFormValues = useSelector((state: RootState) => state.tab.tab);
  const { selectedJenisOrderan } = useSelector(
    (state: RootState) => state.filter
  );

  const {
    data: allDataDetail,
    isLoading: isLoadingData,
    refetch: refetchDetailBiaya
  } = useGetEstimasiBiayaDetailBiaya(headerData?.id ?? 0, '', tabFormValues);

  const {
    data: allDataDetailInvoice,
    isLoading: isLoadingDataDetailInvoice,
    refetch: refetchDetailInvoice
  } = useGetEstimasiBiayaDetailInvoice(headerData?.id ?? 0, '', tabFormValues);

  const fmt = (date: Date) =>
    `${String(date.getDate()).padStart(2, '0')}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${date.getFullYear()}`;

  const lookUpJenisOrderan = [
    {
      columns: [{ key: 'nama', name: 'JENIS ORDERAN' }],
      labelLookup: 'JENIS ORDERAN LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'JenisOrderan',
      label: 'JENIS ORDERAN',
      singleColumn: true,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      pageSize: 20,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupOrderan = [
    {
      columns: [{ key: 'nobukti', name: 'NO BUKTI' }],
      labelLookup: 'ORDERAN LOOKUP',
      required: true,
      selectedRequired: false,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      endpoint: `orderanheader`,
      label: 'ORDERAN LOOKUP',
      singleColumn: true,
      pageSize: 20,
      postData: 'nobukti',
      dataToPost: 'id'
    }
  ];

  const lookupShipper = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'SHIPPER LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'shipper',
      label: 'SHIPPER',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupStatusPpn = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS PPN LOOKUP',
      selectedRequired: false,
      required: true,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS PPN',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupAsuransiTapiPakeTypeAkuntansiDulu = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'ASURANSI LOOKUP',
      selectedRequired: false,
      required: true,
      endpoint: 'type-akuntansi',
      label: 'ASURANSI',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupComodity = [
    {
      columns: [{ key: 'keterangan', name: 'NAMA' }],
      labelLookup: 'COMODITY LOOKUP',
      selectedRequired: false,
      endpoint: 'comodity',
      label: 'COMODITY',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'keterangan',
      dataToPost: 'id'
    }
  ];

  const lookupConsignee = [
    {
      columns: [{ key: 'namaconsignee', name: 'NAMA' }],
      labelLookup: 'CONSIGNEE LOOKUP',
      selectedRequired: false,
      endpoint: 'consignee',
      label: 'CONSIGNEE',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupBiayaEmklDetailBiaya = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'BIAYA EMKL DETAIL BIAYA',
      selectedRequired: false,
      endpoint: `biayaemkl?jenisorder_id=1`,
      label: 'BIAYA EMKL DETAIL BIAYA',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupBiayaEmklDetailInvoice = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'BIAYA EMKL DETAIL INVOICE',
      selectedRequired: false,
      endpoint: `biayaemkl?jenisorder_id=1&statustagih=14`,
      label: 'BIAYA EMKL DETAIL INVOICE',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupHargaTruckingDetailBiaya = [
    {
      columns: [{ key: 'keterangan', name: 'NAMA' }],
      labelLookup: 'HARGA TRUCKING DETAIL BIAYA',
      selectedRequired: false,
      endpoint: `hargatrucking`,
      label: 'HARGA TRUCKING DETAIL BIAYA',
      singleColumn: true,
      pageSize: 20,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupHargaTruckingDetailInvoice = [
    {
      columns: [{ key: 'keterangan', name: 'NAMA' }],
      labelLookup: 'HARGA TRUCKING DETAIL INVOICE',
      selectedRequired: false,
      endpoint: `hargatrucking`,
      label: 'HARGA TRUCKING DETAIL INVOICE',
      singleColumn: true,
      pageSize: 20,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const addRow = () => {
    const newRow: Partial<EstimasiBiayaDetailBiaya> & { isNew: boolean } = {
      id: 0,
      nobukti: '',
      estimasibiaya_id: 0,
      link_id: 0,
      link_nama: '',
      biayaemkl_id: 0,
      biayaemkl_nama: '',
      nominal: '',
      nilaiasuransi: '',
      nominaldisc: '',
      nominalsebelumdisc: '',
      nominaltradoluar: '',
      isNew: true
    };

    setRows((prevRows) => [
      ...prevRows.slice(0, prevRows.length - 1),
      newRow,
      prevRows[prevRows.length - 1]
    ]);
  };

  const addRowDetailInvoice = () => {
    const newRow: Partial<EstimasiBiayaDetailInvoice> & { isNew: boolean } = {
      id: 0,
      nobukti: '',
      estimasibiaya_id: 0,
      link_id: 0,
      linkdetailinvoice_nama: '',
      biayaemkl_id: 0,
      biayaemkldetailinvoice_nama: '',
      nominal: '',
      isNew: true
    };

    setRowsDetailInvoice((prevRows) => [
      ...prevRows.slice(0, prevRows.length - 1),
      newRow,
      prevRows[prevRows.length - 1]
    ]);
  };

  const deleteRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const deleteRowDetailInvoice = (index: number) => {
    setRowsDetailInvoice(rowsDetailInvoice.filter((_, i) => i !== index));
  };

  const inputStopPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const totalNominal = rows.reduce(
    (acc, row) => acc + (row.nominal ? parseCurrency(String(row.nominal)) : 0),
    0
  );

  const handleInputChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setRows((prevRows) => {
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

  const handleInputChangeDetailInvoice = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setRowsDetailInvoice((prevRows) => {
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

  const columns = useMemo((): Column<EstimasiBiayaDetailBiaya>[] => {
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
                  onClick={addRow}
                >
                  <FaRegSquarePlus className="text-2xl" />
                </button>
              </div>
            );
          }

          // Otherwise, render the delete button for rows with data
          const rowIndex = rows.findIndex(
            (row) => Number(row.id) === Number(props.row.id)
          );
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
              <button
                type="button"
                className="rounded bg-transparent text-xs text-red-500"
                onClick={() => deleteRow(props.rowIdx)}
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
            return 8; // Spanning the "Add Row" button across 3 columns (adjust as needed)
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
        key: 'biayaemkl_id',
        name: 'biayaemkl_id',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 300,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>BIAYA EMKL</p>
          </div>
        ),
        renderCell: (props: any) => (
          <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
            {props.row.isAddRow
              ? ''
              : lookupBiayaEmklDetailBiaya.map((orderan, index) => (
                  <LookUp
                    key={index}
                    {...orderan}
                    label={`BIAYAEMKL_${props.rowIdx}_LOOKUP`} // Ensure you use row.id or rowIdx for unique labeling
                    lookupValue={(id) => {
                      handleInputChange(props.rowIdx, 'biayaemkl_id', id); // Use props.rowIdx to get the correct index
                    }}
                    onSelectRow={(val) => {
                      handleInputChange(
                        props.rowIdx,
                        'biayaemkl_nama',
                        val?.nama
                      );
                      if (val.id != 2) {
                        handleInputChange(props.rowIdx, 'link_id', 0);
                        handleInputChange(props.rowIdx, 'link_nama', '');
                      }
                    }}
                    onClear={() => {
                      handleInputChange(props.rowIdx, 'link_id', 0);
                      handleInputChange(props.rowIdx, 'link_nama', '');
                    }}
                    lookupNama={
                      props.row.biayaemkl_nama
                        ? String(props.row.biayaemkl_nama)
                        : ''
                    }
                  />
                ))}
          </div>
        )
      },
      {
        key: 'link_id',
        name: 'link_id',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 300,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>LINK</p>
          </div>
        ),
        renderCell: (props: any) => (
          <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
            {props.row.isAddRow
              ? ''
              : lookupHargaTruckingDetailBiaya.map((orderan, index) => (
                  <LookUp
                    key={index}
                    {...orderan}
                    disabled={props.row.biayaemkl_id !== 2}
                    label={`link_${props.rowIdx}_LOOKUP`} // Ensure you use row.id or rowIdx for unique labeling
                    lookupValue={(id) => {
                      handleInputChange(props.rowIdx, 'link_id', id); // Use props.rowIdx to get the correct index
                    }}
                    onSelectRow={(val) =>
                      handleInputChange(
                        props.rowIdx,
                        'link_nama',
                        val?.keterangan
                      )
                    }
                    lookupNama={
                      props.row.link_nama ? String(props.row.link_nama) : ''
                    }
                  />
                ))}
          </div>
        )
      },
      {
        key: 'nominal',
        name: 'nominal',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>nominal</p>
          </div>
        ),
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.nominal ?? '';

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
                  {formatCurrency(raw)}
                </div>
              ) : (
                <InputCurrency
                  value={String(raw)}
                  onValueChange={(value) =>
                    handleInputChange(rowIdx, 'nominal', value)
                  }
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'nilaiasuransi',
        name: 'nilaiasuransi',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>nilai asuransi</p>
          </div>
        ),
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.nilaiasuransi ?? '';

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
                  {formatCurrency(raw)}
                </div>
              ) : (
                <InputCurrency
                  value={String(raw)}
                  onValueChange={(value) =>
                    handleInputChange(rowIdx, 'nilaiasuransi', value)
                  }
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'nominaldisc',
        name: 'nominaldisc',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>nominal disc</p>
          </div>
        ),
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.nominaldisc ?? '';

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
                  {formatCurrency(raw)}
                </div>
              ) : (
                <InputCurrency
                  value={String(raw)}
                  onValueChange={(value) =>
                    handleInputChange(rowIdx, 'nominaldisc', value)
                  }
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'nominalsebelumdisc',
        name: 'nominalsebelumdisc',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>nominal sebelum disc</p>
          </div>
        ),
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.nominalsebelumdisc ?? '';

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
                  {formatCurrency(raw)}
                </div>
              ) : (
                <InputCurrency
                  value={String(raw)}
                  onValueChange={(value) =>
                    handleInputChange(rowIdx, 'nominalsebelumdisc', value)
                  }
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'nominaltradoluar',
        name: 'nominaltradoluar',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>nominal trado luar</p>
          </div>
        ),
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.nominaltradoluar ?? '';

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
                  {formatCurrency(raw)}
                </div>
              ) : (
                <InputCurrency
                  value={String(raw)}
                  onValueChange={(value) =>
                    handleInputChange(rowIdx, 'nominaltradoluar', value)
                  }
                />
              )}
            </div>
          );
        }
      }

      // {
      //   key: 'nominal',
      //   name: 'nominal',
      //   headerCellClass: 'column-headers',
      //   resizable: true,
      //   draggable: true,
      //   cellClass: 'form-input',
      //   width: 150,
      //   renderHeaderCell: (column: any) => (
      //     <div className="flex h-full cursor-pointer flex-col items-center gap-1">
      //       <div className="headers-cell h-[50%] px-8">
      //         {/* <p className={`text-sm font-normal`}>nominal</p> */}
      //         <p className={`text-sm`}>nominal</p>
      //       </div>
      //       <div className="relative h-[50%] w-full px-1"></div>
      //     </div>
      //   ),
      //   renderCell: (props: any) => {
      //     const rowIdx = props.rowIdx;
      //     let raw = props.row.nominal ?? ''; // Nilai nominal awal

      //     // if (typeof raw === 'number') {
      //     //   // Cek jika raw belum diformat dengan tanda koma, kemudian format
      //     //   raw = raw.toString(); // Mengonversi nominal menjadi string
      //     // }
      //     // if (!raw.includes(',')) {
      //     //   // Jika raw tidak mengandung tanda koma, format sebagai currency
      //     //   raw = formatCurrency(parseFloat(raw)); // Gunakan formatCurrency jika belum ada koma
      //     // }

      //     return (
      //       <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
      //         {props.row.isAddRow ? (
      //           <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
      //             {formatCurrency(totalNominal)}
      //           </div>
      //         ) : (
      //           <InputCurrency
      //             value={String(raw)}
      //             onValueChange={(value) =>
      //               handleInputChange(rowIdx, 'nominal', value)
      //             }
      //           />
      //         )}
      //       </div>
      //     );
      //   }
      // },
    ];
  }, [rows]);

  const columnsDetailInvoice =
    useMemo((): Column<EstimasiBiayaDetailInvoice>[] => {
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
                    onClick={addRowDetailInvoice}
                  >
                    <FaRegSquarePlus className="text-2xl" />
                  </button>
                </div>
              );
            }

            // Otherwise, render the delete button for rows with data
            const rowIndex = rowsDetailInvoice.findIndex(
              (row) => Number(row.id) === Number(props.row.id)
            );
            return (
              <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
                <button
                  type="button"
                  className="rounded bg-transparent text-xs text-red-500"
                  onClick={() => deleteRowDetailInvoice(props.rowIdx)}
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
          key: 'biayaemkl_id',
          name: 'biayaemkl_id',
          headerCellClass: 'column-headers',
          resizable: true,
          draggable: true,
          cellClass: 'form-input',
          width: 300,
          renderHeaderCell: (column: any) => (
            <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
              <p className={`text-sm`}>BIAYA EMKL</p>
            </div>
          ),
          renderCell: (props: any) => {
            return (
              <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
                {props.row.isAddRow
                  ? ''
                  : lookupBiayaEmklDetailInvoice.map((orderan, index) => (
                      <LookUp
                        key={index}
                        {...orderan}
                        label={`BiayaEmklDetailInvoice_${props.rowIdx}_LOOKUP`} // Ensure you use row.id or rowIdx for unique labeling
                        lookupValue={(id) => {
                          handleInputChangeDetailInvoice(
                            props.rowIdx,
                            'biayaemkl_id',
                            id
                          ); // Use props.rowIdx to get the correct index
                        }}
                        onSelectRow={(val) => {
                          handleInputChangeDetailInvoice(
                            props.rowIdx,
                            'biayaemkldetailinvoice_nama',
                            val?.nama
                          );
                          if (val.id != 2) {
                            handleInputChangeDetailInvoice(
                              props.rowIdx,
                              'link_id',
                              0
                            );
                            handleInputChangeDetailInvoice(
                              props.rowIdx,
                              'link_nama',
                              ''
                            );
                          }
                        }}
                        onClear={() => {
                          handleInputChangeDetailInvoice(
                            props.rowIdx,
                            'link_id',
                            0
                          );
                          handleInputChangeDetailInvoice(
                            props.rowIdx,
                            'link_nama',
                            ''
                          );
                        }}
                        lookupNama={
                          props.row.biayaemkldetailinvoice_nama
                            ? String(props.row.biayaemkldetailinvoice_nama)
                            : ''
                        }
                      />
                    ))}
              </div>
            );
          }
        },
        {
          key: 'link_id',
          name: 'link_id',
          headerCellClass: 'column-headers',
          resizable: true,
          draggable: true,
          cellClass: 'form-input',
          width: 300,
          renderHeaderCell: (column: any) => (
            <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
              <p className={`text-sm`}>LINK</p>
            </div>
          ),
          renderCell: (props: any) => (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow
                ? ''
                : lookupHargaTruckingDetailInvoice.map((orderan, index) => (
                    <LookUp
                      key={index}
                      {...orderan}
                      disabled={props.row.biayaemkl_id !== 2}
                      label={`linkDetailInvoice_${props.rowIdx}_LOOKUP`} // Ensure you use row.id or rowIdx for unique labeling
                      lookupValue={(id) => {
                        handleInputChangeDetailInvoice(
                          props.rowIdx,
                          'link_id',
                          id
                        ); // Use props.rowIdx to get the correct index
                      }}
                      onSelectRow={(val) =>
                        handleInputChangeDetailInvoice(
                          props.rowIdx,
                          'linkdetailinvoice_nama',
                          val?.keterangan
                        )
                      }
                      lookupNama={
                        props.row.linkdetailinvoice_nama
                          ? String(props.row.linkdetailinvoice_nama)
                          : ''
                      }
                    />
                  ))}
            </div>
          )
        },
        {
          key: 'nominal',
          name: 'nominal',
          headerCellClass: 'column-headers',
          resizable: true,
          draggable: true,
          cellClass: 'form-input',
          width: 200,
          renderHeaderCell: (column: any) => (
            <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
              <p className={`text-sm`}>nominal</p>
            </div>
          ),
          renderCell: (props: any) => {
            const rowIdx = props.rowIdx;
            let raw = props.row.nominal ?? '';

            return (
              <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
                {props.row.isAddRow ? (
                  <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
                    {formatCurrency(raw)}
                  </div>
                ) : (
                  <InputCurrency
                    value={String(raw)}
                    onValueChange={(value) =>
                      handleInputChangeDetailInvoice(rowIdx, 'nominal', value)
                    }
                  />
                )}
              </div>
            );
          }
        }
      ];
    }, [rowsDetailInvoice]);

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

  useEffect(() => {
    if (allDataDetail) {
      if (allDataDetail?.data?.length > 0 && mode !== 'add') {
        const formattedRows = allDataDetail.data.map((item: any) => ({
          id: Number(item.id),
          nobukti: item.nobukti ?? '',
          estimasibiaya_id: Number(item.estimasibiaya_id),
          link_id: Number(item.link_id),
          link_nama: item.link_nama ?? '',
          biayaemkl_id: Number(item.biayaemkl_id) ?? 0,
          biayaemkl_nama: item.biayaemkl_nama ?? '',
          nominal: String(item.nominal) ?? '',
          nilaiasuransi: String(item.nilaiasuransi) ?? '',
          nominaldisc: String(item.nominaldisc) ?? '',
          nominalsebelumdisc: String(item.nominalsebelumdisc) ?? '',
          nominaltradoluar: String(item.nominaltradoluar) ?? '',
          isNew: false
        }));

        setRows([
          ...formattedRows,
          { isAddRow: true, id: 'add_row', isNew: false } // Always add the "Add Row" button row at the end
        ]);
      } else {
        setRows([
          {
            id: 0,
            nobukti: '',
            estimasibiaya_id: 0,
            link_id: 0,
            link_nama: '',
            biayaemkl_id: 0,
            biayaemkl_nama: '',
            nominal: '',
            nilaiasuransi: '',
            nominaldisc: '',
            nominalsebelumdisc: '',
            nominaltradoluar: '',
            isNew: true
          },
          { isAddRow: true, id: 'add_row', isNew: false } // Row for the "Add Row" button
        ]);
      }
    }
  }, [allDataDetail, headerData?.id, mode, popOver]);

  useEffect(() => {
    if (allDataDetailInvoice) {
      if (allDataDetailInvoice?.data?.length > 0 && mode !== 'add') {
        const formattedRows = allDataDetailInvoice.data.map((item: any) => ({
          id: Number(item.id),
          nobukti: item.nobukti ?? '',
          estimasibiaya_id: Number(item.estimasibiaya_id),
          link_id: Number(item.link_id),
          linkdetailinvoice_nama: item.link_nama ?? '',
          biayaemkl_id: Number(item.biayaemkl_id) ?? 0,
          biayaemkldetailinvoice_nama: item.biayaemkl_nama ?? '',
          nominal: String(item.nominal) ?? undefined,
          isNew: false
        }));

        setRowsDetailInvoice([
          ...formattedRows,
          { isAddRow: true, id: 'add_row', isNew: false } // Always add the "Add Row" button row at the end
        ]);
      } else {
        setRowsDetailInvoice([
          {
            id: 0,
            nobukti: '',
            estimasibiaya_id: 0,
            link_id: 0,
            linkdetailinvoice_nama: '',
            biayaemkl_id: 0,
            biayaemkldetailinvoice_nama: '',
            nominal: '',
            isNew: true
          },
          { isAddRow: true, id: 'add_row', isNew: false } // Row for the "Add Row" button
        ]);
      }
    }
  }, [allDataDetailInvoice, headerData?.id, mode, popOver]);

  useEffect(() => {
    if (rows) {
      // Filter out the `isNew` field and any object with `id: "add_row"`
      const filteredRows = rows
        .filter((row) => row.id !== 'add_row') // Exclude rows with id "add_row"
        .map(({ isNew, ...rest }) => ({
          ...rest
        }));

      forms.setValue('detailsbiaya', filteredRows);
    }
  }, [rows]);

  useEffect(() => {
    if (rowsDetailInvoice) {
      // Filter out the `isNew` field and any object with `id: "add_row"`
      const filteredRows = rowsDetailInvoice
        .filter((row) => row.id !== 'add_row') // Exclude rows with id "add_row"
        .map(({ isNew, ...rest }) => ({
          ...rest
        }));

      forms.setValue('detailsinvoice', filteredRows);
    }
  }, [rowsDetailInvoice]);

  useEffect(() => {
    if (tabFormValues == 'detailbiaya') {
      refetchDetailBiaya();
    }
  }, [headerData?.id, refetchDetailBiaya, popOver]);

  useEffect(() => {
    if (tabFormValues == 'detailinvoice') {
      refetchDetailInvoice();
    }
  }, [headerData?.id, refetchDetailInvoice, popOver]);

  useEffect(() => {
    if (mode === 'add') {
      forms.setValue('tglbukti', fmt(todayDate));
    }
  }, [popOver, mode]);

  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Add Estimasi Biaya'
              : mode === 'edit'
              ? 'Edit Estimasi Biaya'
              : mode === 'delete'
              ? 'Delete Estimasi Biaya'
              : 'View Estimasi Biaya'}
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
                    name="nobukti"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          NO BUKTI
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <Input
                              {...field}
                              disabled
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
                    name="tglbukti"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          TGL BUKTI
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <InputDatePicker
                              value={field.value}
                              onChange={field.onChange}
                              showCalendar={true}
                              disabled={mode == 'delete' || mode == 'view'}
                              onSelect={(date) =>
                                forms.setValue('tglbukti', date)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="jenisorder_id"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          JENIS ORDER
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookUpJenisOrderan.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupValue={(value: any) => {
                                forms.setValue('jenisorder_id', Number(value));
                              }}
                              onSelectRow={(val) => {
                                forms.setValue('jenisorder_nama', val?.nama);
                              }}
                              name="jenisorder_id"
                              forms={forms}
                              lookupNama={forms.getValues('jenisorder_nama')}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="orderan_id"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          NO BUKTI ORDERAN
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookupOrderan.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupValue={(value: any) => {
                                forms.setValue('orderan_id', Number(value));
                              }}
                              onSelectRow={(val) => {
                                forms.setValue('orderan_nobukti', val?.nobukti);
                              }}
                              onClear={() => {
                                forms.setValue('orderan_nobukti', '');
                              }}
                              name="orderan_id"
                              forms={forms}
                              lookupNama={forms.getValues('orderan_nobukti')}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="nominal"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          NOMINAL
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <InputCurrency
                              value={field.value}
                              onValueChange={(val) => {
                                field.onChange(val);
                              }}
                              readOnly={mode === 'view' || mode === 'delete'}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="shipper_id"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          SHIPPER
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookupShipper.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupValue={(value: any) => {
                                forms.setValue('shipper_id', Number(value));
                              }}
                              onSelectRow={(val) => {
                                forms.setValue('shipper_nama', val?.nama);
                              }}
                              name="shipper_id"
                              forms={forms}
                              lookupNama={forms.getValues('shipper_nama')}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="statusppn"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          STATUS PPN
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookupStatusPpn.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupValue={(value: any) => {
                                forms.setValue('statusppn', Number(value));
                              }}
                              onSelectRow={(val) => {
                                forms.setValue('statusppn_nama', val?.nama);
                              }}
                              name="statusppn"
                              forms={forms}
                              lookupNama={forms.getValues('statusppn_nama')}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="asuransi_id"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          ASURANSI
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookupAsuransiTapiPakeTypeAkuntansiDulu.map(
                            (props, index) => (
                              <LookUp
                                key={index}
                                {...props}
                                lookupValue={(value: any) => {
                                  forms.setValue('asuransi_id', Number(value));
                                }}
                                onSelectRow={(val) => {
                                  forms.setValue('asuransi_nama', val?.nama);
                                }}
                                name="asuransi_id"
                                forms={forms}
                                lookupNama={forms.getValues('asuransi_nama')}
                              />
                            )
                          )}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="comodity_id"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          COMODITY
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookupComodity.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupValue={(value: any) => {
                                forms.setValue('comodity_id', Number(value));
                              }}
                              onSelectRow={(val) => {
                                forms.setValue(
                                  'comodity_nama',
                                  val?.keterangan
                                );
                              }}
                              name="comodity_id"
                              forms={forms}
                              lookupNama={forms.getValues('comodity_nama')}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="consignee_id"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          CONSIGNEE
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookupConsignee.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupValue={(value: any) => {
                                forms.setValue('consignee_id', Number(value));
                              }}
                              onSelectRow={(val) => {
                                forms.setValue(
                                  'consignee_nama',
                                  val?.namaconsignee
                                );
                              }}
                              name="consignee_id"
                              forms={forms}
                              lookupNama={forms.getValues('consignee_nama')}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="h-[500px] min-h-[500px]">
                    <div className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background">
                      <FormTabs mode={mode} forms={forms} />

                      {tabFormValues === 'detailbiaya' && (
                        <DataGrid
                          // key={dataGridKey}
                          ref={gridRef}
                          columns={columns as any[]}
                          defaultColumnOptions={{
                            sortable: true,
                            resizable: true
                          }}
                          rows={rows}
                          headerRowHeight={40}
                          rowHeight={55}
                          renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
                          className={`${
                            isDark ? 'rdg-dark' : 'rdg-light'
                          } fill-grid`}
                          enableVirtualization={false}
                        />
                      )}

                      {tabFormValues === 'detailinvoice' && (
                        <DataGrid
                          // key={dataGridKey}
                          ref={gridRef}
                          columns={columnsDetailInvoice as any[]}
                          defaultColumnOptions={{
                            sortable: true,
                            resizable: true
                          }}
                          rows={rowsDetailInvoice}
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
        />
      </DialogContent>
    </Dialog>
  );
};

export default FormEstimasiBiayaHeader;
