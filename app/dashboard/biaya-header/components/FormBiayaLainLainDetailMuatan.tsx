import { useTheme } from 'next-themes';
import { FaSave, FaTimes, FaTrashAlt } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import LookUp from '@/components/custom-ui/LookUp';
import { useSelector, useDispatch } from 'react-redux';
import { IoMdClose } from 'react-icons/io';
import { formatCurrency, parseCurrency } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import DataGrid, { Column, DataGridHandle } from 'react-data-grid';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import {
  setOpenNameModal,
  setSubmitClicked
} from '@/lib/store/lookupSlice/lookupSlice';
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
import { setSelectedBiayaEmklNama } from '@/lib/store/filterSlice/filterSlice';
import { BIAYAEMKLDEFAULT } from '@/constants/biayaheader';
import LookUpModalBiayaExtra from '@/components/custom-ui/LookupModalBiayaExtra';
import { useGetBiayaMuatanDetail } from '@/lib/server/useBiayaHeader';
import { useShiftHorizontalScroll } from '@/hooks/use-shift-horizontal-scroll';

const FormBiayaLainLainDetailMuatan = ({
  popOver,
  forms,
  mode,
  rows,
  setRows,
  isDisableDetail,
  errorNominal,
  setErrorNominal
}: any) => {
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
  const [addedRow, setAddedRow] = useState<any[]>([]);
  const [dataForJson, setDataForJson] = useState<
    Record<string | number, any[]>
  >({});
  const dispatch = useDispatch();
  const gridRef = useRef<DataGridHandle>(null);
  const [notIn, setNotIn] = useState('');
  const formRef = useRef<HTMLFormElement | null>(null); // Ref untuk form
  const openName = useSelector((state: RootState) => state.lookup.openName);
  const headerData = useSelector((state: RootState) => state.header.headerData);
  const {
    selectedJenisOrderan,
    selectedJenisOrderanNama,
    selectedBiayaEmklNama
  } = useSelector((state: RootState) => state.filter);

  const {
    data: allDataDetail,
    isLoading: isLoadingData,
    refetch
  } = useGetBiayaMuatanDetail(headerData?.id ?? 0);

  // const jenisOrderan = selectedJenisOrderan ? selectedJenisOrderan : forms.getValues('biayaextra_nobukti');
  const jenisOrderan = forms.getValues('jenisorder_id')
    ? Number(forms.getValues('jenisorder_id'))
    : selectedJenisOrderan
    ? Number(selectedJenisOrderan)
    : null;
  const biayaEmkl = forms.getValues('biayaemkl_id');
  const lookupOrderan = [
    {
      columns: [{ key: 'nobukti', name: 'NO BUKTI' }],
      labelLookup: 'ORDERAN LOOKUP',
      required: true,
      selectedRequired: false,
      disabled:
        mode === 'view' || mode === 'delete' || isDisableDetail ? true : false,
      // endpoint: `orderanheader?jenisOrderan=${jenisOrderan}`,
      singleColumn: true,
      pageSize: 20,
      postData: 'nobukti',
      dataToPost: 'id'
    }
  ];

  const biayaExtraLookup = [
    {
      columns: [{ key: 'nobukti', name: 'NO BUKTI' }],
      labelLookup: 'BIAYA EXTRA LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: `biayaextraheader?jenisOrderan=${jenisOrderan}`,
      label: 'BIAYA EXTRA',
      singleColumn: true,
      pageSize: 20,
      // disabled: mode === 'view' || mode === 'delete' || isDisableDetail ? true : false,
      postData: 'nobukti',
      dataToPost: 'id'
    }
  ];

  const normalizeNumber = (val: any) => {
    if (!val) return 0;
    return Number(val.toString().replace(/,/g, ''));
  };

  const addRow = () => {
    const newRow: Partial<BiayaExtraMuatanDetail> & { isNew: boolean } = {
      id: 0,
      nobukti: '',
      orderanmuatan_id: 0,
      orderanmuatan_nobukti: '',
      tgljob: '',
      nocontainer: '',
      noseal: '',
      lokasistuffing_nama: '',
      shipper_nama: '',
      container_nama: '',
      estimasi: '',
      nominal: '',
      keterangan: '',
      biayaextra_id: 0,
      biayaextra_nobukti: '',
      isNew: true
    };

    setRows((prevRows: any) => [
      ...prevRows.slice(0, prevRows.length - 1),
      newRow,
      prevRows[prevRows.length - 1]
    ]);
  };

  const deleteRow = (index: number) => {
    setRows(rows.filter((_: any, i: any) => i !== index));
  };

  const inputStopPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const handleInputChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setRows((prevRows: any) => {
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
          const rowIdx = props.rowIdx;
          if (props.row.isAddRow) {
            // If this row is the "Add Row" row, display the Add Row button
            return (
              <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
                <button
                  type="button"
                  className="items-center justify-center rounded bg-transparent text-[#076fde]"
                  disabled={isDisableDetail}
                  onClick={addRow}
                >
                  <FaRegSquarePlus className="text-2xl" />
                </button>
              </div>
            );
          }

          // Otherwise, render the delete button for rows with data
          const rowIndex = rows.findIndex(
            (row: any) => Number(row.id) === Number(props.row.id)
          );
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
              <button
                type="button"
                className="rounded bg-transparent text-xs text-red-500"
                onClick={() => {
                  deleteRow(props.rowIdx);
                }}
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
        renderCell: (props: any) => {
          const nobukti = [
            // Data dari rows yang sedang di-input (exclude row saat ini)
            ...rows
              .filter((row: any, idx: number) => {
                return (
                  row?.orderanmuatan_nobukti &&
                  row?.orderanmuatan_nobukti !== '' &&
                  idx !== props.row.idx && // Exclude row saat ini
                  !row.isAddRow // Exclude tombol "Add Row"
                );
              })
              .map((row: any) => row?.orderanmuatan_nobukti),

            // Data dari addedRow yang sudah pernah disimpan
            ...addedRow
              .filter(
                (row) =>
                  row?.orderanmuatan_nobukti &&
                  row?.orderanmuatan_nobukti !== ''
              )
              .map((row) => row?.orderanmuatan_nobukti)
          ];
          const jsonString = JSON.stringify({ nobukti });
          const endpoint = `orderanheader?jenisOrderan=${jenisOrderan}&notIn=${jsonString}`;

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow
                ? ''
                : lookupOrderan.map((orderan, index) => (
                    <LookUp
                      key={index}
                      {...orderan}
                      label={`ORDERAN_${props.rowIdx}_LOOKUP`} // Ensure you use row.id or rowIdx for unique labeling
                      endpoint={endpoint}
                      lookupValue={(id) => {
                        handleInputChange(props.rowIdx, 'orderanmuatan_id', id); // Use props.rowIdx to get the correct index
                      }}
                      onSelectRow={(val) => {
                        handleInputChange(
                          props.rowIdx,
                          'orderanmuatan_nobukti',
                          val?.nobukti
                        );
                        handleInputChange(
                          props.rowIdx,
                          'tgljob',
                          val?.tglbukti
                        );
                        handleInputChange(
                          props.rowIdx,
                          'nocontainer',
                          val?.nocontainer
                        );
                        handleInputChange(props.rowIdx, 'noseal', val?.noseal);
                        handleInputChange(
                          props.rowIdx,
                          'lokasistuffing_nama',
                          val?.lokasistuffing_nama
                        );
                        handleInputChange(
                          props.rowIdx,
                          'shipper_nama',
                          val?.shipper_nama
                        );
                        handleInputChange(
                          props.rowIdx,
                          'container_nama',
                          val?.container_nama
                        );
                        handleInputChange(
                          props.rowIdx,
                          'biayaextra_nobukti',
                          ''
                        );
                        setDataForJson((prev) => {
                          const next = { ...prev };
                          delete next[props.rowIdx];
                          return next;
                        });
                      }}
                      onClear={() => {
                        handleInputChange(
                          props.rowIdx,
                          'orderanmuatan_nobukti',
                          ''
                        );
                        handleInputChange(props.rowIdx, 'tgljob', '');
                        handleInputChange(props.rowIdx, 'nocontainer', '');
                        handleInputChange(props.rowIdx, 'noseal', '');
                        handleInputChange(
                          props.rowIdx,
                          'lokasistuffing_nama',
                          ''
                        );
                        handleInputChange(props.rowIdx, 'shipper_nama', '');
                        handleInputChange(props.rowIdx, 'container_nama', '');
                        handleInputChange(props.rowIdx, 'estimasi', '');
                        handleInputChange(props.rowIdx, 'nominal', '');
                        handleInputChange(
                          props.rowIdx,
                          'biayaextra_nobukti',
                          ''
                        );
                        handleInputChange(
                          props.rowIdx,
                          'biayaextra_nobuktijson',
                          ''
                        );
                        setDataForJson((prev) => {
                          const next = { ...prev };
                          delete next[props.rowIdx];
                          return next;
                        });
                      }}
                      lookupNama={
                        props.row.orderanmuatan_nobukti
                          ? String(props.row.orderanmuatan_nobukti)
                          : undefined
                      }
                    />
                  ))}
            </div>
          );
        }
      },

      {
        key: 'tgljob',
        name: 'tgljob',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>tgljob</p>
          </div>
        ),
        renderCell: (props: any) => (
          <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
            {props.row.isAddRow ? (
              ''
            ) : (
              <div className="flex flex-col lg:w-full">
                <FormControl>
                  <InputDatePicker
                    value={props.row.tgljob ?? ''}
                    disabled={true}
                    showCalendar
                    // onChange={field.onChange}
                    // onChange={(e) =>
                    //   handleInputChange(props.rowIdx,'tgljob',e.target.value)
                    // }
                  />
                </FormControl>
                <FormMessage />
              </div>
            )}
          </div>
        )
      },
      {
        key: 'nocontainer',
        name: 'nocontainer',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>no container</p>
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
                  readOnly={true}
                  value={props.row.nocontainer ?? ''}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'noseal',
        name: 'noseal',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>no seal</p>
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
                  readOnly={true}
                  value={props.row.noseal ?? ''}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'lokasistuffing',
        name: 'lokasistuffing',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>lokasi stuffing</p>
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
                  readOnly={true}
                  value={props.row.lokasistuffing_nama ?? ''}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
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
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>shipper</p>
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
                  readOnly={true}
                  value={props.row.shipper_nama ?? ''}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'container',
        name: 'container',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>ukuran container</p>
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
                  readOnly={true}
                  value={props.row.container_nama ?? ''}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },

      {
        key: 'estimasi',
        name: 'estimasi',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>estimasi</p>
          </div>
        ),
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.estimasi ?? '';

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
                  {formatCurrency(raw)}
                </div>
              ) : (
                <InputCurrency
                  value={String(raw)}
                  readOnly={true}
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
          let raw = props.row.nominal ?? ''; // Nilai nominal awal

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
                  {formatCurrency(raw)}
                </div>
              ) : (
                <div className="flex w-full flex-col">
                  <InputCurrency
                    value={String(raw)}
                    readOnly={!isDisableDetail}
                    onValueChange={(value) => {
                      handleInputChange(rowIdx, 'nominal', value);
                      const valueNominal = normalizeNumber(value);
                      const valueEstimasi = normalizeNumber(props.row.estimasi);

                      setErrorNominal((prev: any) => ({
                        ...prev,
                        [rowIdx]: valueNominal > valueEstimasi
                      }));
                    }}
                  />
                  {errorNominal[rowIdx] && (
                    // <p className="mt-1 max-w-[140px] text-[0.75rem] text-destructive break-words leading-snug">
                    <p className="text-[0.8rem] text-destructive">
                      {`NOMINAL HARUS <= ESTIMASI`}
                    </p>
                  )}
                </div>
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
        key: 'biayaextra_nobukti',
        name: 'biayaextra_nobukti',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 220,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>NO BUKTI BIAYA EXTRA</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <>
              <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
                {props.row.isAddRow ? (
                  ''
                ) : isDisableDetail || !props.row.orderanmuatan_nobukti ? (
                  biayaExtraLookup.map((orderan, index) => (
                    <LookUp
                      key={index}
                      {...orderan}
                      label={`BIAYA_EXTRA_${props.rowIdx}_LOOKUP`} // Ensure you use row.id or rowIdx for unique labeling
                      disabled={
                        mode === 'view' ||
                        mode === 'delete' ||
                        isDisableDetail ||
                        !props.row.orderanmuatan_nobukti
                          ? true
                          : false
                      }
                      lookupValue={(id) => {
                        handleInputChange(props.rowIdx, 'biayaextra_id', id); // Use props.rowIdx to get the correct index
                      }}
                      onSelectRow={(val) =>
                        handleInputChange(
                          props.rowIdx,
                          'biayaextra_nobukti',
                          val?.nobukti
                        )
                      }
                      lookupNama={
                        props.row.biayaextra_nobukti
                          ? String(props.row.biayaextra_nobukti)
                          : undefined
                      }
                    />
                  ))
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={() => {
                        dispatch(
                          setOpenNameModal(`BIAYA EXTRA${props.rowIdx}`)
                        );
                      }}
                      className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                      size="sm"
                    >
                      DETAIL BIAYA EXTRA
                    </Button>
                    <LookUpModalBiayaExtra
                      filterby={{
                        jenisOrderan: jenisOrderan,
                        biayaemkl_id: biayaEmkl,
                        job: props.row.orderanmuatan_nobukti
                      }}
                      mode={mode}
                      rowIdx={props.rowIdx}
                      existData={JSON.stringify(
                        (dataForJson[props.rowIdx] ?? []).map((obj: any) =>
                          Object.fromEntries(
                            Object.entries(obj).map(([k, v]) => [
                              k.toLowerCase(),
                              v
                            ])
                          )
                        )
                      )}
                      onSelectRow={(val) => {
                        console.log('onselect', val, val.length);
                        const { totalEstimasi, totalNominal } = val.reduce(
                          (acc: any, item: any) => {
                            acc.totalEstimasi += item.estimasi
                              ? parseCurrency(item.estimasi)
                              : 0;
                            acc.totalNominal += item.nominal
                              ? parseCurrency(item.nominal)
                              : 0;
                            return acc;
                          },
                          { totalEstimasi: 0, totalNominal: 0 }
                        );

                        console.log(JSON.stringify(val));

                        setDataForJson((prev) => ({
                          ...prev,
                          [props.rowIdx]: val
                        }));
                        handleInputChange(
                          props.rowIdx,
                          'biayaextra_nobuktijson',
                          JSON.stringify(val)
                        );
                        handleInputChange(
                          props.rowIdx,
                          'estimasi',
                          String(totalEstimasi)
                        );
                        handleInputChange(
                          props.rowIdx,
                          'nominal',
                          String(totalNominal)
                        );
                      }}
                      labelLookup={'BIAYA EXTRA LOOKUP'}
                      endpoint={'biayaextraheader/detailByJob'}
                      label={`BIAYA EXTRA${props.rowIdx}`}
                      postData={'nobukti'}
                    />
                  </>
                )}
              </div>
            </>
          );
        }
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
        // 🔹 STATE JSON per row
        const tempDataForJson: Record<number, any[]> = {};

        const formattedRows = allDataDetail.data.map(
          (item: any, index: number) => {
            if (item.biayaextra_nobuktijson) {
              tempDataForJson[index] =
                typeof item.biayaextra_nobuktijson === 'string'
                  ? JSON.parse(item.biayaextra_nobuktijson)
                  : [];
            }

            return {
              id: Number(item.id),
              biaya_id: Number(item.biaya_id),
              nobukti: item.nobukti ?? '',
              orderanmuatan_id: Number(item.orderanmuatan_id) ?? 0,
              orderanmuatan_nobukti: item.orderanmuatan_nobukti ?? '',
              tgljob: item.tgljob ?? '',
              nocontainer: item.nocontainer ?? '',
              noseal: item.noseal ?? '',
              lokasistuffing_nama: item.lokasistuffing_nama ?? '',
              shipper_nama: item.shipper_nama ?? '',
              container_nama: item.container_nama ?? '',
              estimasi: formatCurrency(item.estimasi) ?? '',
              nominal: formatCurrency(item.nominal) ?? '',
              keterangan: item.keterangan ?? '',
              biayaextra_id: Number(item.biayaextra_id),
              biayaextra_nobukti: item.biayaextra_nobukti ?? '',
              biayaextra_nobuktijson: item.biayaextra_nobuktijson ?? '',
              isNew: false
            };
          }
        );

        setRows([
          ...formattedRows,
          { isAddRow: true, id: 'add_row', isNew: false } // Always add the "Add Row" button row at the end
        ]);

        setDataForJson(tempDataForJson);
      } else {
        const formattedRows = allDataDetail.data.map((item: any) => ({
          job_nama: item.job_nama ?? ''
        }));
        setRows([
          // If no data, add one editable row and the "Add Row" button row at the end
          {
            id: 0,
            biaya_id: 0,
            nobukti: '',
            orderanmuatan_id: 0,
            orderanmuatan_nobukti: '',
            tgljob: '',
            nocontainer: '',
            noseal: '',
            lokasistuffing_nama: '',
            shipper_nama: '',
            container_nama: '',
            estimasi: '',
            nominal: '',
            keterangan: '',
            biayaextra_id: 0,
            biayaextra_nobukti: '',
            biayaextra_nobuktijson: '',
            isNew: true
          },
          { isAddRow: true, id: 'add_row', isNew: false } // Row for the "Add Row" button
        ]);
        setAddedRow(formattedRows);
      }
    }
  }, [allDataDetail, headerData?.id, popOver, mode]);

  return (
    <div className="flex h-[100%] flex-col gap-2 lg:gap-3">
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
            className={`${isDark ? 'rdg-dark' : 'rdg-light'} fill-grid`}
            enableVirtualization={false}
          />
          <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2"></div>
        </div>
      </div>
    </div>
  );
};

export default FormBiayaLainLainDetailMuatan;
