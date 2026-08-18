import { useTheme } from 'next-themes';
import { FaSave, FaTrashAlt } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import LookUp from '@/components/custom-ui/LookUp';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { useSelector, useDispatch } from 'react-redux';
import { IoMdClose } from 'react-icons/io';
import { formatCurrency, parseCurrency } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import DataGrid, { Column, DataGridHandle } from 'react-data-grid';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import { setSubmitClicked } from '@/lib/store/lookupSlice/lookupSlice';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { JENISORDERMUATAN } from '@/constants/biayaextraheader';
import { FaRegSquarePlus } from 'react-icons/fa6';
import { BiayaExtraMuatanDetail } from '@/lib/types/biayaextraheader.type';
import { useGetBiayaExtraMuatanDetail } from '@/lib/server/useBiayaExtraHeader';
import { useShiftHorizontalScroll } from '@/hooks/use-shift-horizontal-scroll';

const FormBiayaExtraHeader = ({
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
      | BiayaExtraMuatanDetail
      | (Partial<BiayaExtraMuatanDetail> & { isNew: boolean })
    )[]
  >([]);

  const dispatch = useDispatch();
  const gridRef = useRef<DataGridHandle>(null);
  const formRef = useRef<HTMLFormElement | null>(null); // Ref untuk form
  const openName = useSelector((state: RootState) => state.lookup.openName);
  const headerData = useSelector((state: RootState) => state.header.headerData);
  const { selectedJenisOrderan, selectedJenisOrderanNama } = useSelector(
    (state: RootState) => state.filter
  );

  const {
    data: allDataDetail,
    isLoading: isLoadingData,
    refetch
  } = useGetBiayaExtraMuatanDetail(headerData?.id ?? 0);

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
      disabled: true,
      pageSize: 20,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsBiayaEmkl = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'BIAYA EMKL LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: `biayaemkl`,
      label: 'BIAYA EMKL',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const jenisOrderan = selectedJenisOrderan
    ? selectedJenisOrderan
    : JENISORDERMUATAN;
  const lookupOrderan = [
    {
      columns: [{ key: 'nobukti', name: 'NO BUKTI' }],
      labelLookup: 'ORDERAN LOOKUP',
      required: true,
      selectedRequired: false,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      endpoint: `orderanheader?jenisOrderan=${jenisOrderan}`,
      singleColumn: true,
      pageSize: 20,
      postData: 'nobukti',
      dataToPost: 'id'
    }
  ];

  const lookupStatusTagih = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS TAGIH LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupGroupBiayaExtra = [
    {
      columns: [{ key: 'keterangan', name: 'NAMA' }],
      labelLookup: 'GROUP BIAYA EXTRA',
      required: true,
      selectedRequired: false,
      endpoint: 'groupbiayaextra',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const addRow = () => {
    const newRow: Partial<BiayaExtraMuatanDetail> & { isNew: boolean } = {
      id: '',
      nobukti: '',
      biayaextra_id: '',
      orderanmuatan_id: '',
      orderanmuatan_nobukti: '',
      estimasi: '',
      // nominal: '',
      statustagih: '',
      statustagih_nama: '',
      nominaltagih: '',
      keterangan: '',
      groupbiayaextra_id: '',
      groupbiayaextra_nama: '',
      isNew: true
    };

    setRows((prevRows) => [
      ...prevRows.slice(0, prevRows.length - 1),
      newRow,
      prevRows[prevRows.length - 1]
    ]);
  };

  const deleteRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
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

  const columns = useMemo((): Column<BiayaExtraMuatanDetail>[] => {
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
            (row) => String(row.id) === String(props.row.id)
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
        key: 'orderanmuatan_nobukti',
        name: 'orderanmuatan_nobukti',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>NO BUKTI ORDERAN</p>
          </div>
        ),
        renderCell: (props: any) => (
          <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
            {props.row.isAddRow
              ? ''
              : lookupOrderan.map((orderan, index) => (
                  <LookUp
                    key={index}
                    {...orderan}
                    label={`ORDERAN_${props.rowIdx}_LOOKUP`} // Ensure you use row.id or rowIdx for unique labeling
                    lookupValue={(id) => {
                      handleInputChange(props.rowIdx, 'orderanmuatan_id', id); // Use props.rowIdx to get the correct index
                    }}
                    onSelectRow={(val) =>
                      handleInputChange(
                        props.rowIdx,
                        'orderanmuatan_nobukti',
                        val?.nobukti
                      )
                    }
                    lookupNama={
                      props.row.orderanmuatan_nobukti
                        ? String(props.row.orderanmuatan_nobukti)
                        : undefined
                    }
                  />
                ))}
          </div>
        )
      },
      {
        key: 'estimasi',
        name: 'estimasi',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>estimasi</p>
          </div>
        ),
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.estimasi ?? ''; // Nilai estimasi awal

          // if (typeof raw === 'number') {
          //   // Cek jika raw belum diformat dengan tanda koma, kemudian format
          //   raw = raw.toString(); // Mengonversi estimasi menjadi string
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
                  onValueChange={(value) =>
                    handleInputChange(rowIdx, 'estimasi', value)
                  }
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'statustagih',
        name: 'statustagih',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>status tagih</p>
          </div>
        ),
        renderCell: (props: any) => (
          <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
            {props.row.isAddRow
              ? ''
              : lookupStatusTagih.map((statustagih, index) => (
                  <LookUp
                    key={index}
                    {...statustagih}
                    label={`STATUSTAGIH_${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                    lookupValue={(id) =>
                      handleInputChange(props.rowIdx, 'statustagih', id)
                    }
                    onSelectRow={(val) =>
                      handleInputChange(
                        props.rowIdx,
                        'statustagih_nama',
                        val?.text
                      )
                    }
                    lookupNama={
                      props.row.statustagih_nama
                        ? String(props.row.statustagih_nama)
                        : undefined
                    }
                  />
                ))}
          </div>
        )
      },
      {
        key: 'nominaltagih',
        name: 'nominaltagih',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>nominal tagih</p>
          </div>
        ),
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.nominaltagih ?? ''; // Nilai nominaltagih awal

          // if (typeof raw === 'number') {
          //   // Cek jika raw belum diformat dengan tanda koma, kemudian format
          //   raw = raw.toString(); // Mengonversi nominaltagih menjadi string
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
                  onValueChange={(value) =>
                    handleInputChange(rowIdx, 'nominaltagih', value)
                  }
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
            <p className={`text-sm`}>Keterangan</p>
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
                    handleInputChange(
                      props.rowIdx,
                      'keterangan',
                      e.target.value
                    )
                  }
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
            // <div>
            //   {props.row.isAddRow ? (
            //     ''
            //   ) : (
            //     <FormField
            //       name="keterangan"
            //       control={forms.control}
            //       render={({ field }) => (
            //         <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
            //           <div className="flex flex-col lg:w-full">
            //             <FormControl>

            //                 <Input
            //                   type="text"
            //                   value={props.row.keterangan}
            //                   onKeyDown={inputStopPropagation}
            //                   onClick={(e) => e.stopPropagation()}
            //                   onChange={(e) =>
            //                     handleInputChange(
            //                       props.rowIdx,
            //                       'keterangan',
            //                       e.target.value
            //                     )
            //                   }
            //                   className="h-2 min-h-9 w-full rounded border border-gray-300"
            //                 />
            //             </FormControl>
            //             <FormMessage />
            //           </div>
            //         </FormItem>
            //       )}
            //     />
            //   )}
            // </div>
          );
        }
      },
      {
        key: 'groupbiayaextra',
        name: 'groupbiayaextra',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>GROUP BIAYA EXTRA</p>
          </div>
        ),
        renderCell: (props: any) => (
          <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
            {props.row.isAddRow
              ? ''
              : lookupGroupBiayaExtra.map((groupbiayaextra, index) => (
                  <LookUp
                    key={index}
                    {...groupbiayaextra}
                    label={`GROUPBIAYAEXTRA_${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                    lookupValue={
                      (id) =>
                        handleInputChange(
                          props.rowIdx,
                          'groupbiayaextra_id',
                          id
                        ) // Use props.rowIdx to get the correct index
                    }
                    onSelectRow={(val) =>
                      handleInputChange(
                        props.rowIdx,
                        'groupbiayaextra_nama',
                        val?.keterangan
                      )
                    }
                    lookupNama={
                      props.row.groupbiayaextra_nama
                        ? String(props.row.groupbiayaextra_nama)
                        : undefined
                    }
                    inputLookupValue={props.row.groupbiayaextra_id}
                  />
                ))}
          </div>
        )
      }
    ];
  }, [rows, editingRowId, editableValues]);

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
    if (allDataDetail && popOver) {
      if (allDataDetail?.data?.length > 0 && mode !== 'add') {
        // Format data detail utama (tanpa rincian)
        const formattedRows = allDataDetail.data.map((item: any) => ({
          id: item.id,
          nobukti: item.nobukti ?? '',
          biayaextra_id: item.biayaextra_id,
          orderanmuatan_id: item.orderanmuatan_id ?? '',
          orderanmuatan_nobukti: item.orderanmuatan_nobukti ?? '',
          estimasi: formatCurrency(item.estimasi) ?? '',
          // nominal: formatCurrency(item.nominal) ?? '',
          statustagih: item.statustagih ?? '',
          statustagih_nama: item.statustagih_nama ?? '',
          nominaltagih: formatCurrency(item.nominaltagih) ?? '',
          keterangan: item.keterangan ?? '',
          groupbiayaextra_id: item.groupbiayaextra_id ?? '',
          groupbiayaextra_nama: item.groupbiayaextra_nama ?? '',
          isNew: false
        }));

        setRows([
          ...formattedRows,
          { isAddRow: true, id: 'add_row', isNew: false } // Always add the "Add Row" button row at the end
        ]);
      } else {
        setRows([
          // If no data, add one editable row and the "Add Row" button row at the end
          {
            id: '',
            nobukti: '',
            biayaextra_id: '',
            orderanmuatan_id: '',
            orderanmuatan_nobukti: '',
            estimasi: '',
            // nominal: '',
            statustagih: '',
            statustagih_nama: '',
            nominaltagih: '',
            keterangan: '',
            groupbiayaextra_id: '',
            groupbiayaextra_nama: '',
            isNew: true
          },
          { isAddRow: true, id: 'add_row', isNew: false } // Row for the "Add Row" button
        ]);
      }
    }
  }, [allDataDetail, headerData?.id, popOver, mode]);

  useEffect(() => {
    if (rows) {
      // Filter out the `isNew` field and any object with `id: "add_row"`
      const filteredRows = rows
        .filter((row) => row.id !== 'add_row') // Exclude rows with id "add_row"
        .map(({ isNew, ...rest }) => ({
          ...rest
        }));

      forms.setValue('details', filteredRows);
    }
  }, [rows]);

  useEffect(() => {
    if (mode === 'add') {
      forms.setValue('tglbukti', fmt(todayDate));
      // Field JENIS ORDER di form ini disabled (read-only) — nilainya
      // mengikuti lookup Jenis Orderan yang sedang dipilih di FilterGrid,
      // bukan dipilih ulang di sini.
      forms.setValue('jenisorder_id', selectedJenisOrderan ?? '');
      forms.setValue('jenisorder_nama', selectedJenisOrderanNama ?? '');
    }
  }, [popOver, mode, selectedJenisOrderan, selectedJenisOrderanNama]);
  console.log('forms.getValues()', forms.getValues());
  console.log('forms.errors', forms.formState.errors);
  console.log('selectedJenisOrderanNama', selectedJenisOrderanNama);
  console.log('selectedJenisOrderan', selectedJenisOrderan);
  // useEffect(() => {
  //   if (forms.getValues()?.details?.length === 0) {
  //     setRows([
  //       {
  //         id: '',
  //         nobukti: '',
  //         biayaextra_id: '',
  //         orderanmnuatan_id: '',
  //         orderanmuatan_nobukti: '',
  //         estimasi: '',
  //         nominal: '',
  //         statustagih: '',
  //         statustagih_nama: '',
  //         nominaltagih: '',
  //         keterangan: '',
  //         groupbiayaextra_id: '',
  //         groupbiayaextra_nama: '',
  //         isNew: true
  //       },
  //       { isAddRow: true, id: 'add_row', isNew: false } // Row for the "Add Row" button
  //     ]);
  //   }
  // }, [forms, forms.getValues().details]);

  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Add Biaya Extra Muatan'
              : mode === 'edit'
              ? 'Edit Biaya Extra Muatan'
              : mode === 'delete'
              ? 'Delete Biaya Extra Muatan'
              : 'View Biaya Extra Muatan'}
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
                // `onSubmit` dari grid adalah handler MENTAH bertanda tangan
                // (values, keepOpenModal), jadi pembungkusan handleSubmit
                // dilakukan di sini. Tanpa ini, submit native mengirim objek
                // EVENT sebagai `values` -> payload ke backend kosong.
                onSubmit={forms.handleSubmit((values: any) =>
                  onSubmit(values, false)
                )}
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
                          className="text-sm font-semibold"
                        >
                          JENIS ORDER
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookUpJenisOrderan.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupValue={(value: any) => {
                                forms.setValue('jenisorder_id', value);
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
                    name="biayaemkl_id"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="text-sm font-semibold"
                        >
                          BIAYA EMKL
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookupPropsBiayaEmkl.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              disabled={mode == 'delete' || mode == 'view'}
                              lookupValue={(value: any) => {
                                forms.setValue('biayaemkl_id', value);
                              }}
                              onSelectRow={(val) => {
                                forms.setValue('biayaemkl_nama', val?.nama);
                              }}
                              name="biayaemkl_id"
                              forms={forms}
                              lookupNama={forms.getValues('biayaemkl_nama')}
                            />
                          ))}
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
                          className="font-semibold  lg:w-[15%]"
                        >
                          KETERANGAN
                        </FormLabel>
                        <div className="mt-2 flex flex-col lg:w-[85%]">
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

                  <div className="h-[400px] min-h-[400px]">
                    <div className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background">
                      <div className="flex h-[38px] w-full flex-row items-center rounded-t-sm border-b border-border bg-background-grid-header px-2"></div>

                      <DataGrid
                        key={dataGridKey}
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
                      <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2"></div>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </div>
        <FormFooterButtons
          mode={mode}
          // WAJIB lewat forms.handleSubmit: `onSubmit` grid menerima
          // (values, keepOpenModal). Versi sebelumnya memanggil
          // onSubmit(false)/onSubmit(true) sehingga boolean itu masuk sebagai
          // `values` -> `...values` menyebar boolean (tidak menghasilkan apa
          // pun) dan `values?.details` undefined, jadi body yang terkirim ke
          // backend cuma berisi spread `filters`. Sekaligus mengaktifkan
          // kembali validasi zod yang sebelumnya ikut terlewat.
          onSave={() => {
            void forms.handleSubmit((values: any) => onSubmit(values, false))();
            dispatch(setSubmitClicked(true));
          }}
          onSaveAndAdd={() => {
            void forms.handleSubmit((values: any) => onSubmit(values, true))();
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

export default FormBiayaExtraHeader;
