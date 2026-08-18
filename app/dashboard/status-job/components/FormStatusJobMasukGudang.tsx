import { useTheme } from 'next-themes';
import { IoMdClose } from 'react-icons/io';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { FaRegSquarePlus } from 'react-icons/fa6';
import LookUp from '@/components/custom-ui/LookUp';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { useAlert } from '@/lib/store/client/useAlert';
import { useSelector, useDispatch } from 'react-redux';
import { FaTimes, FaTrashAlt } from 'react-icons/fa';
import { useEffect, useMemo, useRef, useState } from 'react';
import LookUpModal from '@/components/custom-ui/LookUpModal';
import DataGrid, { Column, DataGridHandle } from 'react-data-grid';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import { setSubmitClicked } from '@/lib/store/lookupSlice/lookupSlice';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { JENISORDERMUATAN, statusJobMasukGudang } from '@/constants/statusjob';
import { useGetAllStatusJobMasukGudangByTglStatus } from '@/lib/server/useStatusJob';
import {
  filterStatusJobMasukGudang,
  StatusJobMasukGudang
} from '@/lib/types/statusJob.type';
import FormLabel, {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/components/ui/form';
import FilterInput from '@/components/custom-ui/FilterInput';
import { getAllOrderanMuatanFn } from '@/lib/apis/orderanHeader.api';
import { cancelPreviousRequest } from '@/lib/utils';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { useShiftHorizontalScroll } from '@/hooks/use-shift-horizontal-scroll';

interface Filter {
  page: number;
  limit: number;
  search: string;
  filters: typeof filterStatusJobMasukGudang;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}
interface ApiResponse {
  type: string;
  data: any; // Define a more specific type for data if possible
}

const FormStatusJobMasukGudang = ({
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
  const { alert } = useAlert();
  const todayDate = new Date();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  // Shift + scroll = geser horizontal. Grid ini lebih lebar dari modal dan
  // react-remove-scroll bawaan Radix Dialog membatalkan wheel-nya.
  useShiftHorizontalScroll();

  const [dataGridKey, setDataGridKey] = useState(0);
  // const [endpointLookup, setEndpointLookup] = useState('');
  // const [enabledNoSeal, setEnabledNoSeal] = useState(false);
  // const [noContainerValue, setNoContainerValue] = useState('');
  // const [editingRowId, setEditingRowId] = useState<number | null>(null); // Menyimpan ID baris yang sedang diedit
  const [editableValues, setEditableValues] = useState<Map<number, string>>(
    new Map()
  ); // Nilai yang sedang diedit untuk setiap baris
  const [rows, setRows] = useState<
    (
      | StatusJobMasukGudang
      | (Partial<StatusJobMasukGudang> & { isNew: boolean })
    )[]
  >([]);
  const [addedRow, setAddedRow] = useState<any[]>([]);

  const dispatch = useDispatch();
  const gridRef = useRef<DataGridHandle>(null);
  const formRef = useRef<HTMLFormElement | null>(null); // Ref untuk form
  const abortControllerRef = useRef<AbortController | null>(null); // AbortController untuk cancel request
  const openName = useSelector((state: RootState) => state.lookup.openName);
  const headerData = useSelector((state: RootState) => state.header.headerData);
  const { selectedJenisOrderan, selectedJenisStatusJob } = useSelector(
    (state: RootState) => state.filter
  );
  const fmt = (date: Date) =>
    `${String(date.getDate()).padStart(2, '0')}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${date.getFullYear()}`;

  const [filters, setFilters] = useState<Filter>({
    page: 1,
    limit: 30,
    filters: {
      ...filterStatusJobMasukGudang,
      jenisOrderan: String(selectedJenisOrderan),
      jenisStatusJob: String(selectedJenisStatusJob)
    },
    search: '',
    sortBy: 'tglstatus',
    sortDirection: 'asc'
  });

  const {
    data: allDataDetail,
    isLoading: isLoading,
    refetch
  } = useGetAllStatusJobMasukGudangByTglStatus(
    headerData?.tglstatus ?? '',
    { ...filters, page: 1 },
    abortControllerRef.current?.signal
  );

  const lookupOrderan = [
    {
      columns: [
        { key: 'nobukti', name: 'NO BUKTI' },
        { key: 'tglbukti', name: 'TANGGAL JOB' },
        { key: 'shipper_nama', name: 'SHIPPER' },
        { key: 'nocontainer', name: 'NO CONTAINER' },
        { key: 'noseal', name: 'NO SEAL' },
        { key: 'lokasistuffing_nama', name: 'LOKASI STUFFING' },
        { key: 'gandengan', name: 'GANDENGAN' }
      ],
      labelLookup: 'ORDERAN LOOKUP',
      required: true,
      selectedRequired: false,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      endpoint: `orderanheader?jenisOrderan=${selectedJenisOrderan}`,
      singleColumn: false,
      pageSize: 20,
      postData: 'nobukti',
      dataToPost: 'id'
    }
  ];

  const lookupOrderanNoContainer = [
    {
      columns: [{ key: 'nocontainer', name: 'NO CONTAINER' }],
      // labelLookup: 'ORDERAN LOOKUP',
      required: true,
      selectedRequired: false,
      showOnButton: false,
      clearDisabled: true,
      autoSearch: false,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      // endpoint: `orderanheader?jenisOrderan=${selectedJenisOrderan}`,
      singleColumn: false,
      pageSize: 20,
      postData: 'nocontainer',
      dataToPost: 'nocontainer'
    }
  ];

  const lookupJenisOrder = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'JENIS ORDERAN LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'JenisOrderan',
      label: 'JENIS ORDER LOOKUP',
      singleColumn: true,
      pageSize: 20,
      disabled: true,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupJenisStatusJob = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'JENIS STATUS JOB LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: `parameter?grp=data+status+job&subgrp=orderanmuatan`,
      label: 'JENIS STATUS JOB LOOKUP',
      singleColumn: true,
      pageSize: 20,
      disabled: true,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const addRow = () => {
    const newRow: Partial<StatusJobMasukGudang> & { isNew: boolean } = {
      id: 0, // Placeholder ID
      job: 0,
      job_nama: '',
      tglorder: '',
      nocontainer: '',
      noseal: '',
      shipper_id: 0,
      shipper_nama: '',
      lokasistuffing_id: 0,
      lokasistuffing_nama: '',
      keterangan: '',
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

  // const handleInputNoContainer = (e: any) => {
  //   setNoContainerValue('');
  //   if (e.key === 'Enter') {
  //     setNoContainerValue(e.target.value);
  //   }
  // };

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
  const handleMultipleInputChange = (
    updates: Array<{ index: number; field: string; value: string | number }>
  ) => {
    setRows((prevRows) => {
      // Buat copy dari prevRows
      let updatedData = [...prevRows];

      // Filter out row "Add Row" dulu
      const addRowIndex = updatedData.findIndex((row) => row.isAddRow);
      const addRow = addRowIndex !== -1 ? updatedData[addRowIndex] : null;
      if (addRowIndex !== -1) {
        updatedData = updatedData.filter((_, i) => i !== addRowIndex);
      }

      // Cari index maksimal yang dibutuhkan
      const maxIndex = Math.max(...updates.map((u) => u.index));

      // Pastikan array cukup panjang
      while (updatedData.length <= maxIndex) {
        updatedData.push({
          id: 0,
          job: 0,
          job_nama: '',
          tglorder: '',
          nocontainer: '',
          noseal: '',
          shipper_id: 0,
          shipper_nama: '',
          lokasistuffing_id: 0,
          lokasistuffing_nama: '',
          keterangan: '',
          isNew: true
        });
      }

      // Apply semua updates
      updates.forEach(({ index, field, value }) => {
        if (updatedData[index]) {
          updatedData[index][field] = value;

          // Check jika row sudah lengkap
          if (
            updatedData[index].isNew &&
            Object.values(updatedData[index]).every((val) => val !== '')
          ) {
            updatedData[index].isNew = false;
          }
        }
      });

      // Tambahkan kembali "Add Row" di akhir
      if (addRow) {
        updatedData.push(addRow);
      }

      return updatedData;
    });
  };

  const columns = useMemo((): Column<StatusJobMasukGudang>[] => {
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
            return 9; // Spanning the "Add Row" button across 3 columns (adjust as needed)
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
        key: 'job',
        name: 'job',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>NO JOB</p>
          </div>
        ),
        renderCell: (props: any) => (
          <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
            {props.row.isAddRow
              ? ''
              : lookupOrderan.map((lookupOrderan, index) => (
                  <LookUpModal
                    key={index}
                    {...lookupOrderan}
                    label={`NO JOB ${props.rowIdx}`}
                    autoSearch={false}
                    enableMultiSelect={true}
                    onSelectMultipleRows={(selectedRows) => {
                      // Kumpulkan semua updates dulu
                      const allUpdates: Array<{
                        index: number;
                        field: string;
                        value: string | number;
                      }> = [];

                      selectedRows.forEach((val, idx) => {
                        const targetRowIdx = props.rowIdx + idx;

                        // Kumpulkan semua field updates untuk row ini
                        allUpdates.push(
                          {
                            index: targetRowIdx,
                            field: 'job',
                            value: Number(val.id)
                          },
                          {
                            index: targetRowIdx,
                            field: 'job_nama',
                            value: val?.nobukti || ''
                          },
                          {
                            index: targetRowIdx,
                            field: 'tglorder',
                            value: val?.tglbukti || ''
                          },
                          {
                            index: targetRowIdx,
                            field: 'nocontainer',
                            value: val?.nocontainer || ''
                          },
                          {
                            index: targetRowIdx,
                            field: 'noseal',
                            value: val?.noseal || ''
                          },
                          {
                            index: targetRowIdx,
                            field: 'shipper_id',
                            value: Number(val?.shipper_id) || 0
                          },
                          {
                            index: targetRowIdx,
                            field: 'shipper_nama',
                            value: val?.shipper_nama || ''
                          },
                          {
                            index: targetRowIdx,
                            field: 'lokasistuffing',
                            value: Number(val?.lokasistuffing) || 0
                          },
                          {
                            index: targetRowIdx,
                            field: 'lokasistuffing_nama',
                            value: val?.lokasistuffing_nama || ''
                          }
                        );
                      });

                      // Update semua sekaligus dalam satu call
                      handleMultipleInputChange(allUpdates);
                    }}
                    lookupValue={(id) => {
                      handleInputChange(props.rowIdx, 'job', id);
                    }}
                    notIn={{
                      nobukti: [
                        // Data dari rows yang sedang di-input (exclude row saat ini)
                        ...rows
                          .filter((row, idx) => {
                            return (
                              row?.job_nama &&
                              row?.job_nama !== '' &&
                              idx !== props.rowIdx && // Exclude row saat ini
                              !row.isAddRow // Exclude tombol "Add Row"
                            );
                          })
                          .map((row) => row?.job_nama),

                        // Data dari addedRow yang sudah pernah disimpan
                        ...addedRow
                          .filter(
                            (row) => row?.job_nama && row?.job_nama !== ''
                          )
                          .map((row) => row?.job_nama)
                      ]
                    }}
                    onSelectRow={(val) => {
                      handleInputChange(props.rowIdx, 'job_nama', val?.nobukti);
                      handleInputChange(
                        props.rowIdx,
                        'tglorder',
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
                        'shipper_id',
                        Number(val?.shipper_id)
                      );
                      handleInputChange(
                        props.rowIdx,
                        'shipper_nama',
                        val?.shipper_nama
                      );
                      handleInputChange(
                        props.rowIdx,
                        'lokasistuffing',
                        Number(val?.lokasistuffing)
                      );
                      handleInputChange(
                        props.rowIdx,
                        'lokasistuffing_nama',
                        val?.lokasistuffing_nama
                      );
                    }}
                    onClear={() => {
                      handleInputChange(props.rowIdx, 'job_nama', '');
                      handleInputChange(props.rowIdx, 'tglorder', '');
                      handleInputChange(props.rowIdx, 'nocontainer', '');
                      handleInputChange(props.rowIdx, 'noseal', '');
                      handleInputChange(props.rowIdx, 'shipper_id', 0);
                      handleInputChange(props.rowIdx, 'shipper_nama', '');
                      handleInputChange(props.rowIdx, 'lokasistuffing', 0);
                      handleInputChange(
                        props.rowIdx,
                        'lokasistuffing_nama',
                        ''
                      );
                    }}
                    lookupNama={
                      props.row.job_nama ? String(props.row.job_nama) : ''
                    }
                    inputLookupValue={Number(props.row.job_id)}
                  />
                ))}
          </div>
        )
      },
      {
        key: 'tglorder',
        name: 'tglorder',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>TGL ORDER</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                ''
              ) : (
                <div className="flex flex-col lg:w-full">
                  <FormControl>
                    <InputDatePicker
                      value={props.row.tglorder}
                      showCalendar
                      disabled
                    />
                  </FormControl>
                  <FormMessage />
                </div>
              )}
            </div>
          );
        }
      },
      {
        key: 'nocontainer',
        name: 'NO CONTAINER',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>NO CONTAINER</p>
          </div>
        ),
        renderCell: (props: any) => {
          const nobukti = [
            // Data dari rows yang sedang di-input (exclude row saat ini)
            ...rows
              .filter((row, idx) => {
                return (
                  row?.job_nama &&
                  row?.job_nama !== '' &&
                  idx !== props.row.idx && // Exclude row saat ini
                  !row.isAddRow // Exclude tombol "Add Row"
                );
              })
              .map((row) => row?.job_nama),

            // Data dari addedRow yang sudah pernah disimpan
            ...addedRow
              .filter((row) => row?.job_nama && row?.job_nama !== '')
              .map((row) => row?.job_nama)
          ];
          const jsonString = JSON.stringify({ nobukti });
          const endpoint = `orderanheader?jenisOrderan=${selectedJenisOrderan}&notIn=${jsonString}`;

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {/* {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  type="text"
                  value={props.row.nocontainer}
                  onKeyDown={(e) => {
                    inputStopPropagation;
                    handleInputNoContainer(e);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    handleInputChange(
                      props.rowIdx,
                      'nocontainer',
                      e.target.value
                    );
                    setEditingRowId(props.rowIdx);
                  }}
                  readOnly={mode === 'delete' && mode === 'view'}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )} */}

              {props.row.isAddRow
                ? ''
                : lookupOrderanNoContainer.map((lookupProps, index) => (
                    <LookUp
                      key={index}
                      {...lookupProps}
                      isExactMatch={false}
                      showClearButton={false}
                      endpoint={endpoint}
                      label={`ORDERAN_CONTAINER_${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                      lookupValue={(id) => {
                        handleInputChange(
                          props.rowIdx,
                          'nocontainer',
                          String(id)
                        ); // Use props.rowIdx to get the correct index
                      }}
                      onSelectRow={(val) => {
                        handleInputChange(
                          props.rowIdx,
                          'job_nama',
                          val?.nobukti
                        );
                        handleInputChange(
                          props.rowIdx,
                          'tglorder',
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
                          'shipper_id',
                          Number(val?.shipper_id)
                        );
                        handleInputChange(
                          props.rowIdx,
                          'shipper_nama',
                          val?.shipper_nama
                        );
                        handleInputChange(
                          props.rowIdx,
                          'lokasistuffing',
                          Number(val?.lokasistuffing)
                        );
                        handleInputChange(
                          props.rowIdx,
                          'lokasistuffing_nama',
                          val?.lokasistuffing_nama
                        );
                      }}
                      onClear={() => {
                        handleInputChange(props.rowIdx, 'job_nama', '');
                        handleInputChange(props.rowIdx, 'tglorder', '');
                        // handleInputChange(props.rowIdx, 'nocontainer', '');
                        handleInputChange(props.rowIdx, 'noseal', '');
                        handleInputChange(props.rowIdx, 'shipper_id', 0);
                        handleInputChange(props.rowIdx, 'shipper_nama', '');
                        handleInputChange(props.rowIdx, 'lokasistuffing', 0);
                        handleInputChange(
                          props.rowIdx,
                          'lokasistuffing_nama',
                          ''
                        );
                      }}
                      lookupNama={
                        props.row.nocontainer
                          ? String(props.row.nocontainer)
                          : ''
                      }
                    />
                  ))}
            </div>
          );
        }
      },
      {
        key: 'noseal',
        name: 'NO SEAL',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>NO SEAL</p>
          </div>
        ),
        renderCell: (props: any) => {
          const isDisabledByCondition =
            (props.row.job_nama === '' && props.row.nocontainer === '') ||
            (props.row.nocontainer !== '' && props.row.job_nama !== '');
          const nobukti = [
            // Data dari rows yang sedang di-input (exclude row saat ini)
            ...rows
              .filter((row, idx) => {
                return (
                  row?.job_nama &&
                  row?.job_nama !== '' &&
                  idx !== props.row.idx && // Exclude row saat ini
                  !row.isAddRow // Exclude tombol "Add Row"
                );
              })
              .map((row) => row?.job_nama),

            // Data dari addedRow yang sudah pernah disimpan
            ...addedRow
              .filter((row) => row?.job_nama && row?.job_nama !== '')
              .map((row) => row?.job_nama)
          ];
          const jsonString = JSON.stringify({ nobukti });
          const endpoint = `orderanheader?jenisOrderan=${selectedJenisOrderan}&notIn=${jsonString}`;

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {/* {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  type="text"
                  value={props.row.noseal}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  readOnly
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )} */}
              {props.row.isAddRow
                ? ''
                : lookupOrderan.map((lookupProps, index) => (
                    <LookUp
                      key={index}
                      {...lookupProps}
                      // disabled={!enabledNoSeal}
                      disabled={isDisabledByCondition}
                      endpoint={endpoint}
                      dataSortBy="nobukti"
                      filterby={{
                        nocontainer: props.row.nocontainer
                      }}
                      postData="noseal"
                      dataSortDirection="desc"
                      label={`ORDERAN ${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                      lookupValue={(id) => {
                        handleInputChange(props.rowIdx, 'job', id); // Use props.rowIdx to get the correct index
                      }}
                      onSelectRow={(val) => {
                        handleInputChange(
                          props.rowIdx,
                          'job_nama',
                          val?.nobukti
                        );
                        handleInputChange(
                          props.rowIdx,
                          'tglorder',
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
                          'shipper_id',
                          Number(val?.shipper_id)
                        );
                        handleInputChange(
                          props.rowIdx,
                          'shipper_nama',
                          val?.shipper_nama
                        );
                        handleInputChange(
                          props.rowIdx,
                          'lokasistuffing',
                          Number(val?.lokasistuffing)
                        );
                        handleInputChange(
                          props.rowIdx,
                          'lokasistuffing_nama',
                          val?.lokasistuffing_nama
                        );
                      }}
                      onClear={() => {
                        handleInputChange(props.rowIdx, 'job_nama', '');
                        handleInputChange(props.rowIdx, 'tglorder', '');
                        handleInputChange(props.rowIdx, 'nocontainer', '');
                        handleInputChange(props.rowIdx, 'noseal', '');
                        handleInputChange(props.rowIdx, 'shipper_id', 0);
                        handleInputChange(props.rowIdx, 'shipper_nama', '');
                        handleInputChange(props.rowIdx, 'lokasistuffing', 0);
                        handleInputChange(
                          props.rowIdx,
                          'lokasistuffing_nama',
                          ''
                        );
                      }}
                      lookupNama={
                        props.row.noseal ? String(props.row.noseal) : ''
                      }
                    />
                  ))}
            </div>
          );
        }
      },
      {
        key: 'shipper',
        name: 'SHIPPER',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>SHIPPER</p>
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
                  value={props.row.shipper_nama}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  readOnly
                  className="h-2 min-h-9 w-full rounded border border-input-border"
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
            <p className={`text-sm`}>LOKASI STUFFING</p>
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
                  value={props.row.lokasistuffing_nama}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  readOnly
                  className="h-2 min-h-9 w-full rounded border border-input-border"
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
            <div>
              {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  type="text"
                  value={props.row.keterangan}
                  readOnly={mode == 'delete' || mode == 'view'}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    handleInputChange(
                      props.rowIdx,
                      'keterangan',
                      e.target.value
                    )
                  }
                  className="h-2 min-h-9 w-full rounded border border-input-border"
                />
                // <FormField
                //   name="keterangan"
                //   control={forms.control}
                //   render={({ field }) => (
                //     <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                //       <div className="flex flex-col lg:w-full">
                //         <FormControl>
                //             <Input
                //               type="text"
                //               value={props.row.keterangan}
                //               onKeyDown={inputStopPropagation}
                //               onClick={(e) => e.stopPropagation()}
                //               onChange={(e) =>
                //                 handleInputChange(
                //                   props.rowIdx,
                //                   'keterangan',
                //                   e.target.value
                //                 )
                //               }
                //               className="h-2 min-h-9 w-full rounded border border-gray-300"
                //             />
                //         </FormControl>
                //         <FormMessage />
                //       </div>
                //     </FormItem>
                //   )}
                // />
              )}
            </div>
          );
        }
      }
    ];
  }, [rows, editableValues]);

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

  // useEffect(() => {
  //   // cancelPreviousRequest(abortControllerRef);
  //   if (noContainerValue && noContainerValue !== '') {
  //     const nobukti = [
  //       // Data dari rows yang sedang di-input (exclude row saat ini)
  //       ...rows
  //         .filter((row, idx) => {
  //           return (
  //             row?.job_nama &&
  //             row?.job_nama !== '' &&
  //             idx !== editingRowId && // Exclude row saat ini
  //             !row.isAddRow // Exclude tombol "Add Row"
  //           );
  //         })
  //         .map((row) => row?.job_nama),

  //       // Data dari addedRow yang sudah pernah disimpan
  //       ...addedRow
  //         .filter((row) => row?.job_nama && row?.job_nama !== '')
  //         .map((row) => row?.job_nama)
  //     ];
  //     const jsonString = JSON.stringify({ nobukti });

  //     const fetchData = async () => {
  //       try {
  //         const [jenisOrderLookup] = await Promise.all<ApiResponse>([
  //           getAllOrderanMuatanFn({
  //             filters: {
  //               jenisOrderan: selectedJenisOrderan
  //                 ? String(selectedJenisOrderan)
  //                 : String(JENISORDERMUATAN),
  //               nocontainer: noContainerValue,
  //               notIn: jsonString
  //             }
  //             // notIn: { nobukti }
  //           })
  //         ]);

  //         if (jenisOrderLookup.data && jenisOrderLookup.data.length == 1) {
  //           // setEnabledNoSeal(false);
  //           // setEndpointLookup('');
  //           handleInputChange(
  //             Number(editingRowId),
  //             'job',
  //             Number(jenisOrderLookup.data[0].id)
  //           );
  //           handleInputChange(
  //             Number(editingRowId),
  //             'job_nama',
  //             jenisOrderLookup.data[0].nobukti
  //           );
  //           handleInputChange(
  //             Number(editingRowId),
  //             'tglorder',
  //             jenisOrderLookup.data[0].tglbukti
  //           );
  //           // handleInputChange(editingRowId, 'nocontainer', val?.nocontainer);
  //           handleInputChange(
  //             Number(editingRowId),
  //             'noseal',
  //             jenisOrderLookup.data[0].noseal
  //           );
  //           handleInputChange(
  //             Number(editingRowId),
  //             'shipper_id',
  //             Number(jenisOrderLookup.data[0].shipper_id)
  //           );
  //           handleInputChange(
  //             Number(editingRowId),
  //             'shipper_nama',
  //             jenisOrderLookup.data[0].shipper_nama
  //           );
  //           handleInputChange(
  //             Number(editingRowId),
  //             'lokasistuffing',
  //             Number(jenisOrderLookup.data[0].lokasistuffing)
  //           );
  //           handleInputChange(
  //             Number(editingRowId),
  //             'lokasistuffing_nama',
  //             jenisOrderLookup.data[0].lokasistuffing_nama
  //           );
  //         } else if (
  //           jenisOrderLookup.data &&
  //           jenisOrderLookup.data.length > 1
  //         ) {
  //           // setEnabledNoSeal(true);
  //           // setEndpointLookup(
  //           //   `orderanheader?jenisOrderan=${selectedJenisOrderan}&notIn=${jsonString}`
  //           // );
  //           handleInputChange(Number(editingRowId), 'job', 0);
  //           handleInputChange(Number(editingRowId), 'job_nama', '');
  //           handleInputChange(Number(editingRowId), 'tglorder', '');
  //           // handleInputChange(editingRowId, 'nocontainer', val?.nocontainer);
  //           handleInputChange(Number(editingRowId), 'noseal', '');
  //           handleInputChange(Number(editingRowId), 'shipper_id', 0);
  //           handleInputChange(Number(editingRowId), 'shipper_nama', '');
  //           handleInputChange(Number(editingRowId), 'lokasistuffing', 0);
  //           handleInputChange(Number(editingRowId), 'lokasistuffing_nama', '');
  //         } else {
  //           // setEnabledNoSeal(false);
  //           // setEndpointLookup('');
  //           handleInputChange(Number(editingRowId), 'job', 0);
  //           handleInputChange(Number(editingRowId), 'job_nama', '');
  //           handleInputChange(Number(editingRowId), 'tglorder', '');
  //           // handleInputChange(editingRowId, 'nocontainer', val?.nocontainer);
  //           handleInputChange(Number(editingRowId), 'noseal', '');
  //           handleInputChange(Number(editingRowId), 'shipper_id', 0);
  //           handleInputChange(Number(editingRowId), 'shipper_nama', '');
  //           handleInputChange(Number(editingRowId), 'lokasistuffing', 0);
  //           handleInputChange(Number(editingRowId), 'lokasistuffing_nama', '');
  //           alert({
  //             title: `DATA ORDERAN DENGAN NO CONTAINER ${noContainerValue} TIDAK DITEMUKAN`,
  //             variant: 'danger',
  //             submitText: 'OK'
  //           });
  //         }
  //       } catch (err) {
  //         console.error('Error fetching data:', err);
  //       }
  //     };

  //     fetchData();
  //   }
  // }, [noContainerValue]);

  useEffect(() => {
    if (allDataDetail && popOver) {
      if (allDataDetail?.data?.length > 0 && mode !== 'add') {
        // If there is data, add the data rows and the "Add Row" button row at the end
        const formattedRows = allDataDetail.data.map((item: any) => ({
          id: Number(item.id),
          job: Number(item.job) ?? '',
          job_nama: item.job_nama ?? '',
          tglorder: item.tglorder ?? '',
          nocontainer: item.nocontainer ?? '',
          noseal: item.noseal ?? '',
          shipper_id: Number(item.shipper_id) ?? '',
          shipper_nama: item.shipper_nama ?? '',
          lokasistuffing: Number(item.lokasistuffing) ?? '',
          lokasistuffing_nama: item.lokasistuffing_nama ?? '',
          keterangan: item.keterangan ?? '',
          isNew: false
        }));

        setRows([
          // Always add the "Add Row" button row at the end
          ...formattedRows,
          { isAddRow: true, id: 'add_row', isNew: false }
        ]);
      } else {
        const formattedRows = allDataDetail.data.map((item: any) => ({
          job_nama: item.job_nama ?? ''
        }));
        setRows([
          // If no data, add one editable row and the "Add Row" button row at the end
          {
            id: 0, // Placeholder ID
            job: 0,
            job_nama: '',
            tglorder: '',
            nocontainer: '',
            noseal: '',
            shipper_id: 0,
            shipper_nama: '',
            lokasistuffing: 0,
            lokasistuffing_nama: '',
            keterangan: '',
            isNew: true
          },
          { isAddRow: true, id: 'add_row', isNew: false } // Row for the "Add Row" button
        ]);
        setAddedRow(formattedRows);
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
    // setEnabledNoSeal(false);
    // setNoContainerValue('');
    if (popOver) {
      refetch();
    }
  }, [popOver]);

  useEffect(() => {
    if (mode === 'add') {
      forms.setValue('tglstatus', fmt(todayDate));
    }
  }, [popOver, mode]);

  useEffect(() => {
    if (forms.getValues()?.details?.length === 0) {
      setRows([
        {
          id: 0, // Placeholder ID
          job: 0,
          job_nama: '',
          tglorder: '',
          nocontainer: '',
          noseal: '',
          shipper_id: 0,
          shipper_nama: '',
          lokasistuffing_id: 0,
          lokasistuffing_nama: '',
          keterangan: '',
          isNew: true
        },
        { isAddRow: true, id: 'add_row', isNew: false } // Row for the "Add Row" button
      ]);
    }
  }, [forms, forms.getValues().details]);
  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Add Status Job'
              : mode === 'edit'
              ? 'Edit Status Job'
              : mode === 'delete'
              ? 'Delete Status Job'
              : 'View Status Job'}
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
          <div className="min-h-full bg-background-card px-5 py-3">
            <Form {...forms}>
              <form
                ref={formRef}
                onSubmit={onSubmit}
                className="flex h-full flex-col gap-6"
              >
                <div className="flex h-[100%] flex-col gap-2 lg:gap-3">
                  <FormField
                    name="tglstatus"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          TANGGAL
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <InputDatePicker
                              value={field.value}
                              onChange={field.onChange}
                              showCalendar={true}
                              disabled={mode !== 'add'}
                              onSelect={(date) =>
                                forms.setValue('tglstatus', date)
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
                          JENIS ORDERAN
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookupJenisOrder.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupNama={forms.getValues('jenisorder_nama')}
                              // lookupValue={(value: any) => {
                              //   forms.setValue('stuffingdepo', Number(value));
                              // }}
                              // onSelectRow={(val) => {
                              //   forms.setValue('stuffingdepo_nama', val?.text);
                              // }}
                              // onClear={() => {
                              //   forms.setValue('stuffingdepo_nama', '');
                              // }}
                              name="jenisorder_id"
                              forms={forms}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="statusjob"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          JENIS STATUS JOB
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookupJenisStatusJob.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupNama={forms.getValues('statusjob_nama')}
                              name="statusjob"
                              forms={forms}
                            />
                          ))}
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
                        headerRowHeight={35}
                        rowHeight={55}
                        renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
                        className={`${
                          isDark ? 'rdg-dark' : 'rdg-light'
                        } fill-grid text-sm`}
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

export default FormStatusJobMasukGudang;
