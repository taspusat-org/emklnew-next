/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useGetMenu } from '@/lib/server/useMenu';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store/store';
import LookUp from '@/components/custom-ui/LookUp';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { Input } from '@/components/ui/input';
import { IoMdClose, IoMdRefresh } from 'react-icons/io';
import { FaSave, FaTimes, FaTrashAlt } from 'react-icons/fa';
import InputMask from '@mona-health/react-input-mask';
import { useFormContext } from 'react-hook-form';
import DataGrid, {
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import {
  formatCurrency,
  formatDateCalendar,
  formatDateToDDMMYYYY,
  isLeapYear,
  parseCurrency,
  parseDateFromDDMMYYYY
} from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { parse } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import { HutangDetail } from '@/lib/types/hutang.type';
import { FaRegSquarePlus } from 'react-icons/fa6';
import { Textarea } from '@/components/ui/textarea';
import { useGetHutangDetail } from '@/lib/server/useHutang';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import { setSubmitClicked } from '@/lib/store/lookupSlice/lookupSlice';
import { useTheme } from 'next-themes';

const FormHutang = ({
  popOver,
  setPopOver,
  forms,
  onSubmit,
  mode,
  handleClose,
  isLoadingCreate,
  isLoadingUpdate,
  isSubmitSuccessful,
  isLoadingDelete
}: any) => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [popOverTglSampai, setPopOverTglSampai] = useState<boolean>(false);
  const [editingRowId, setEditingRowId] = useState<number | null>(null); // Menyimpan ID baris yang sedang diedit
  const [editableValues, setEditableValues] = useState<Map<number, string>>(
    new Map()
  ); // Nilai yang sedang diedit untuk setiap baris

  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);

  const [dataGridKey, setDataGridKey] = useState(0);
  const dispatch = useDispatch();
  const [filters, setFilters] = useState({
    nobukti: '',
    keterangan: '',
    sisa: '',
    nominal: ''
  });
  const headerData = useSelector((state: RootState) => state.header.headerData);
  const gridRef = useRef<DataGridHandle>(null);
  const {
    data: allData,
    isLoading: isLoadingData,
    refetch
  } = useGetHutangDetail({
    filters: { nobukti: headerData?.nobukti ?? '' }
  });
  const [rows, setRows] = useState<
    (HutangDetail | (Partial<HutangDetail> & { isNew: boolean }))[]
  >([]);
  function handleCellClick(args: { row: HutangDetail }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
    }
  }
  const addRow = () => {
    const newRow: Partial<HutangDetail> & { isNew: boolean } = {
      id: 0, // Placeholder ID
      coa: '',
      coa_text: '',
      keterangan: '',
      nominal: '0',
      dpp: '0',
      noinvoiceemkl: '',
      tglinvoiceemkl: '',
      nofakturpajakemkl: '',
      disableNominal: false,
      disableDpp: false,
      isNew: true
    };

    setRows((prevRows) => [
      ...prevRows.slice(0, prevRows.length - 1),
      newRow,
      prevRows[prevRows.length - 1]
    ]);
  };

  const resetDetailAndAddNewRow = () => {
    setRows([
      {
        id: 0,
        coa: '',
        coa_text: '',
        keterangan: '',
        nominal: '0',
        dpp: '0',
        noinvoiceemkl: '',
        tglinvoiceemkl: '',
        nofakturpajakemkl: '',
        isNew: true
      },
      { isAddRow: true, id: 'add_row', isNew: false }
    ]);

    forms.setValue('details', [
      {
        id: 0,
        coa: '',
        coa_text: '',
        keterangan: '',
        nominal: '0',
        dpp: '0',
        noinvoiceemkl: '',
        tglinvoiceemkl: '',
        nofakturpajakemkl: ''
      }
    ]);

    setDataGridKey((prev) => prev + 1);
  };

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
  const deleteRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };
  const inputStopPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };
  const formatThousands = (raw: string): string => {
    // ambil cuma digit
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    // parse integer, lalu format otomatis dengan koma (en-US)
    return parseInt(digits, 10).toLocaleString('en-US');
  };
  const beforeMaskedStateChange = ({
    previousState,
    currentState,
    nextState
  }: {
    previousState: { value: string; selection: any };
    currentState: { value: string; selection: any };
    nextState: { value: string; selection: any };
  }) => {
    const nextVal = nextState.value || '';
    // a) ambil hanya digit & titik
    const raw = nextVal.replace(/[^0-9.]/g, '');
    // b) split integer & decimal (hanya 1 dot pertama)
    const [intPart, ...rest] = raw.split('.');
    const decPart = rest.join(''); // kalau user ngetik lebih dari 1 dot, kita gabung sisanya

    // c) format integer part dengan koma sebagai ribuan
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // d) kalau ada decimal part, re‐attach
    const formatted =
      decPart.length > 0 ? `${formattedInt}.${decPart}` : formattedInt;

    // e) cursor selalu di akhir
    const pos = formatted.length;
    return {
      value: formatted,
      selection: { start: pos, end: pos }
    };
  };

  // 2) onChangeRaw: simpan string yang sudah diformat ke state
  const formatWithCommas = (val: string): string => {
    // ambil cuma digit
    const digits = val.replace(/\D/g, '');
    // sisipkan koma setiap 3 digit dari kanan
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 2) handler onChange: format langsung & simpan ke state
  const handleCurrencyChange = (rowIdx: number, rawInput: string) => {
    handleInputChange(rowIdx, 'dpp', rawInput);
  };

  const handleCurrencyChange2 = (rowIdx: number, rawInput: string) => {
    handleInputChange(rowIdx, 'nominal', rawInput);
  };

  const totalNominal = rows.reduce(
    (acc, row) => acc + (row.nominal ? parseCurrency(row.nominal) : 0),
    0
  );

  const totalDpp = rows.reduce(
    (acc, row) => acc + (row.dpp ? parseCurrency(row.dpp) : 0),
    0
  );

  const handleCurrencyBlur = (formattedStr: string, rowIdx: number) => {
    if (!String(formattedStr).includes(',')) {
      return;
    }

    if (!String(formattedStr).includes('.')) {
      const finalValue = String(formattedStr) + '.00';
      setRows((rs) =>
        rs.map((r, idx) =>
          idx === rowIdx ? { ...r, nominalawal: finalValue } : r
        )
      );
    } else {
      setRows((rs) =>
        rs.map((r, idx) =>
          idx === rowIdx ? { ...r, nominalawal: formattedStr } : r
        )
      );
    }
  };
  const handleFocus = (rowIdx: number, raw: any) => {
    setRows((prevRows) => {
      return prevRows.map((row, idx) => {
        if (idx === rowIdx) {
          // Pengecekan apakah nominal berformat dengan desimal '.00'
          // Menampilkan raw value yang dikirim

          const updatedNominal =
            raw && String(raw).includes('.00')
              ? raw.toString().slice(0, -3) // Menghapus '.00' jika ada
              : raw; // Jika tidak ada '.00', tetap seperti semula

          return {
            ...row,
            nominal: updatedNominal, // Update nilai nominal
            isNew: row.isNew === true ? true : false // Memastikan isNew adalah boolean
          };
        }
        return row;
      });
    });
  };

  const PERSENTASE = 2 / 100;

  const handleNominalChange = (rowIdx: number, value: string) => {
    setRows((prev) => {
      const updated = [...prev];
      const current = updated[rowIdx];

      if (!value || value.trim() === '' || value.trim() === '0') {
        current.nominal = '0';
        current.dpp = '0';
        current.disableNominal = false;
        current.disableDpp = false;
        return updated;
      }

      const parsedValue = parseCurrency(value);
      current.nominal = value;
      current.dpp = '0';
      if (Number(value) > 0 || Number(value) < 0) {
        current.disableDpp = true;
        current.disableNominal = false;
      }

      return updated;
    });
  };

  const handleDppChange = (rowIdx: number, value: string) => {
    setRows((prev) => {
      const updated = [...prev];
      const current = updated[rowIdx];
      const parsedDpp = parseCurrency(value);

      if (!value || value.trim() === '' || value.trim() === '0') {
        current.dpp = '0';
        current.nominal = '0';
        current.disableNominal = false;
        current.disableDpp = false;
        return updated;
      }

      current.dpp = value;

      const nominalValue = parsedDpp * PERSENTASE;
      current.nominal = formatCurrency(nominalValue);

      if (Number(value) > 0 || Number(value) < 0) {
        current.disableNominal = true;
        current.disableDpp = false;
      }

      return updated;
    });
  };

  const columns = useMemo((): Column<HutangDetail>[] => {
    return [
      {
        key: 'aksi',
        cellClass: 'form-input',
        width: 65,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full w-full flex-col justify-center px-1">
            <p className="text-center text-sm font-normal">aksi</p>
          </div>
        ),
        name: 'aksi',

        renderCell: (props: any) => {
          // If this row is the "Add Row" row, display the Add Row button

          if (props.row.isAddRow) {
            return (
              <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
                <button
                  disabled={mode === 'view' || mode === 'delete'}
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
          const rowIndex = rows.findIndex((row) => row.id === props.row.id);
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center justify-center p-0 text-xs">
              <button
                disabled={
                  mode === 'view' || mode === 'delete' || rows.length <= 2
                }
                type="button"
                className="rounded bg-transparent text-xs text-red-500"
                onClick={() => deleteRow(rowIndex)}
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
          // If it's the "Add Row" row, span across multiple columns
          if (args.type === 'ROW' && args.row.isAddRow) {
            return 3; // Spanning the "Add Row" button across 3 columns (adjust as needed)
          }
          return undefined; // For other rows, no column spanning
        },
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>No.</p>
          </div>
        ),
        renderCell: (props: any) => {
          const justifyClass = 'justify-end';

          return (
            <div
              className={`flex h-full w-full cursor-pointer items-center ${justifyClass} text-sm font-normal`}
            >
              {props.row.isAddRow ? 'TOTAL :' : props.rowIdx + 1}
            </div>
          );
        }
      },
      {
        key: 'coa',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 350,
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>Coa</p>
          </div>
        ),
        name: 'coa',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          return (
            <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
              <div className="w-full lg:w-[100%]">
                {lookUpPropscoaDetail.map((props, index) => (
                  <LookUp
                    label={`COA ${rowIdx + 1}`}
                    key={index}
                    {...props}
                    lookupValue={(value: any) =>
                      handleInputChange(rowIdx, 'coa', value)
                    }
                    lookupNama={forms.getValues(`details[${rowIdx}].coa_text`)}
                    onSelectRow={(value) => {
                      handleInputChange(
                        rowIdx,
                        'coa_text',
                        value.keterangancoa
                      );
                    }}
                    disabled={mode === 'view' || mode === 'delete'}
                  />
                ))}
              </div>
            </div>
          );
        }
      },
      {
        key: 'keterangan',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>Keterangan</p>
          </div>
        ),
        name: 'keterangan',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                ''
              ) : (
                <FormField
                  name={`details.${rowIdx}.keterangan`}
                  control={forms.control}
                  render={({ field }) => (
                    <FormItem className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
                      <div className="flex w-full flex-col">
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            readOnly={mode === 'view' || mode === 'delete'}
                            value={field.value ?? ''}
                            onKeyDown={inputStopPropagation}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              handleInputChange(
                                rowIdx,
                                'keterangan',
                                e.target.value
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'nominal',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>nominal</p>
          </div>
        ),
        name: 'nominal',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.nominal ?? '0'; // Nilai nominal awal

          // Cek jika raw belum diformat dengan tanda koma, kemudian format
          if (typeof raw === 'number') {
            raw = raw.toString(); // Mengonversi nominal menjadi string
          }

          // Jika raw tidak mengandung tanda koma, format sebagai currency
          if (!raw.includes(',')) {
            raw = formatCurrency(parseFloat(raw)); // Gunakan formatCurrency jika belum ada koma
          }

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
                  {formatCurrency(totalNominal)}
                </div>
              ) : (
                <FormField
                  name={`details.${rowIdx}.nominal`}
                  control={forms.control}
                  render={({ field }) => (
                    <FormItem className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
                      <div className="flex w-full flex-col">
                        <FormControl>
                          <InputCurrency
                            {...field}
                            disabled={
                              mode === 'view' ||
                              mode === 'delete' ||
                              props.row.disableNominal ||
                              (Number(parseCurrency(props.row.dpp)) > 0 &&
                                mode === 'edit')
                            }
                            value={String(props.row.nominal ?? '0')}
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleNominalChange(rowIdx, value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'dpp',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>dpp</p>
          </div>
        ),
        name: 'dpp',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.dpp ?? '0'; // Nilai dpp awal

          // Cek jika raw belum diformat dengan tanda koma, kemudian format
          if (typeof raw === 'number') {
            raw = raw.toString(); // Mengonversi dpp menjadi string
          }

          // Jika raw tidak mengandung tanda koma, format sebagai currency
          if (!raw.includes(',')) {
            raw = formatCurrency(parseFloat(raw)); // Gunakan formatCurrency jika belum ada koma
          }

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
                  {formatCurrency(totalDpp)}
                </div>
              ) : (
                <FormField
                  name={`details.${rowIdx}.dpp`}
                  control={forms.control}
                  render={({ field }) => (
                    <FormItem className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
                      <div className="flex w-full flex-col">
                        <FormControl>
                          <InputCurrency
                            {...field}
                            disabled={
                              mode === 'view' ||
                              mode === 'delete' ||
                              props.row.disableDpp ||
                              (Number(parseCurrency(props.row.nominal)) > 0 &&
                                mode === 'edit' &&
                                props.row.dpp <= 0)
                            }
                            value={String(props.row.dpp ?? '0')}
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleDppChange(rowIdx, value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'noinvoiceemkl',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 160,
        colSpan: (args) => {
          // If it's the "Add Row" row, span across multiple columns
          if (args.type === 'ROW' && args.row.isAddRow) {
            return 3; // Spanning the "Add Row" button across 3 columns (adjust as needed)
          }
          return undefined; // For other rows, no column spanning
        },
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>no invoice emkl</p>
          </div>
        ),
        name: 'noinvoiceemkl',
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  type="text"
                  disabled={mode === 'view' || mode === 'delete'}
                  value={props.row.noinvoiceemkl}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    handleInputChange(
                      props.rowIdx,
                      'noinvoiceemkl',
                      e.target.value
                    )
                  }
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'tglinvoiceemkl',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 170,
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>tgl invoice emkl</p>
          </div>
        ),
        name: 'tglinvoiceemkl',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                ''
              ) : (
                <FormField
                  name={`details.${rowIdx}.tglinvoiceemkl`}
                  control={forms.control}
                  render={({ field }) => (
                    <FormItem className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
                      <div className="flex flex-col">
                        <FormControl>
                          <InputDatePicker
                            value={field.value}
                            onChange={field.onChange}
                            disabled={mode === 'view' || mode === 'delete'}
                            showCalendar
                            onSelect={(date) =>
                              handleInputChange(
                                props.rowIdx,
                                'tglinvoiceemkl',
                                String(date)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'nofakturpajakemkl',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-[100%] w-full flex-col justify-center">
            <p className={`text-left text-sm font-normal`}>
              no faktur pajak emkl
            </p>
          </div>
        ),
        name: 'nofakturpajakemkl',
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  type="text"
                  readOnly={mode === 'view' || mode === 'delete'}
                  value={props.row.nofakturpajakemkl}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    handleInputChange(
                      props.rowIdx,
                      'nofakturpajakemkl',
                      e.target.value
                    )
                  }
                />
              )}
            </div>
          );
        }
      }
    ];
  }, [rows, checkedRows, editingRowId, editableValues, dispatch]);

  const lookUpPropsRelasi = [
    {
      columns: [{ key: 'nama', name: 'RELASI' }],
      labelLookup: 'RELASI LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'relasi',
      label: 'RELASI',
      singleColumn: true,
      pageSize: 20,
      showOnButton: true,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookUpPropscoaDetail = [
    {
      columns: [
        { key: 'coa', name: 'COA', width: 100 },
        { key: 'keterangancoa', name: 'KETERANGANCOA' }
      ],
      labelLookup: 'COA LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'akunpusat',
      singleColumn: false,
      pageSize: 20,
      showOnButton: true,
      postData: 'keterangancoa',
      dataToPost: 'coa'
    }
  ];

  const formRef = useRef<HTMLFormElement | null>(null);
  const openName = useSelector((state: RootState) => state.lookup.openName);

  useEffect(() => {
    // Fungsi untuk menangani pergerakan fokus berdasarkan tombol
    const handleKeyDown = (event: KeyboardEvent) => {
      // Jika popOverDate ada nilainya, jangan lakukan apa-apa
      if (openName) {
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
          !element.hasAttribute('readonly')
      ) as HTMLElement[];

      const focusedElement = document.activeElement as HTMLElement;

      // Cek apakah elemen yang difokuskan adalah dropzone
      const isImageDropzone =
        document.querySelector('input#image-dropzone') === focusedElement;
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

    // Fungsi untuk mendapatkan elemen input selanjutnya berdasarkan arah (down atau up)
    const getNextFocusableElement = (
      inputs: HTMLElement[],
      currentElement: HTMLElement,
      direction: 'up' | 'down'
    ): HTMLElement | null => {
      const index = Array.from(inputs).indexOf(currentElement as any);

      if (direction === 'down') {
        // Jika sudah di input terakhir, tidak perlu pindah fokus
        if (index === inputs.length - 1) {
          return null; // Tidak ada elemen selanjutnya
        }
        return inputs[index + 1]; // Fokus pindah ke input setelahnya
      } else {
        return inputs[index - 1]; // Fokus pindah ke input sebelumnya
      }
    };

    // Menambahkan event listener untuk keydown
    document.addEventListener('keydown', handleKeyDown);

    // Membersihkan event listener ketika komponen tidak lagi digunakan
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openName]); // Tambahkan popOverDate sebagai dependen
  function EmptyRowsRenderer() {
    return (
      <div
        className="flex h-fit w-full items-center justify-center border border-l-0 border-t-0 border-blue-500 py-1"
        style={{ textAlign: 'center', gridColumn: '1/-1' }}
      >
        <p className="text-gray-400">NO ROWS DATA FOUND</p>
      </div>
    );
  }

  useEffect(() => {
    if (allData || popOver) {
      if (allData && (allData.data?.length ?? 0) > 0 && mode !== 'add') {
        const formattedRows = allData.data.map((item: any) => ({
          id: item.id,
          coa: item.coa ?? '',
          coa_text: item.coa_text ?? '',
          keterangan: item.keterangan ?? '',
          nominal: item.nominal ?? '0',
          dpp: item.dpp ?? '0',
          noinvoiceemkl: item.noinvoiceemkl ?? '',
          tglinvoiceemkl: item.tglinvoiceemkl ?? '',
          nofakturpajakemkl: item.nofakturpajakemkl ?? '',
          perioderefund: item.perioderefund ?? '',
          isNew: false
        }));

        setRows([
          ...formattedRows,
          { isAddRow: true, id: 'add_row', isNew: false }
        ]);
      } else {
        setRows([
          {
            id: 0,
            coa: '',
            coa_text: '',
            keterangan: '',
            nominal: '0',
            dpp: '0',
            noinvoiceemkl: '',
            tglinvoiceemkl: '',
            nofakturpajakemkl: '',
            perioderefund: '',
            isNew: true
          },
          { isAddRow: true, id: 'add_row', isNew: false }
        ]);
      }
    }
  }, [allData, headerData?.id, popOver, mode]);

  useEffect(() => {
    if (rows) {
      // Filter out the `isNew` field and any object with `id: "add_row"`
      const filteredRows = rows
        .filter((row) => row.id !== 'add_row') // Exclude rows with id "add_row"
        .map(
          ({
            isNew,
            coa,
            coa_text,
            keterangan,
            nominal,
            dpp,
            noinvoiceemkl,
            tglinvoiceemkl,
            nofakturpajakemkl,
            ...rest
          }) => ({
            ...rest,
            coa: coa ? String(coa) : '',
            coa_text: coa_text ? String(coa_text) : '',
            keterangan: keterangan ? String(keterangan) : '',
            nominal: nominal ? String(nominal) : '0',
            dpp: dpp ? String(dpp) : '0',
            noinvoiceemkl: noinvoiceemkl ? String(noinvoiceemkl) : '',
            tglinvoiceemkl: tglinvoiceemkl ? String(tglinvoiceemkl) : '',
            nofakturpajakemkl: nofakturpajakemkl
              ? String(nofakturpajakemkl)
              : ''
          })
        );

      forms.setValue('details', filteredRows);
    }
  }, [rows]);

  useEffect(() => {
    if (isSubmitSuccessful) {
      resetDetailAndAddNewRow();
    }
  }, [isSubmitSuccessful]);

  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Add Hutang'
              : mode === 'edit'
              ? 'Edit Hutang'
              : mode === 'delete'
              ? 'Delete Hutang'
              : 'View Hutang'}
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
                // `onSubmit` kini handler MENTAH dari grid, jadi pembungkusan
                // handleSubmit dilakukan di sini. Submit native (mis. ENTER di
                // sebuah field) diperlakukan sama dengan tombol SAVE:
                // keepOpenModal = false, dialog menutup. Sebelumnya grid
                // mengirim handler yang SUDAH dibungkus dan tombol memanggil
                // onSubmit(false)/onSubmit(true); boolean itu mendarat di slot
                // `event` milik handleSubmit sehingga ENTER ikut terbaca
                // sebagai "SAVE & ADD" — dialog tetap terbuka dan fokus
                // terjebak di dalamnya.
                onSubmit={forms.handleSubmit((values: any) =>
                  onSubmit(values, false)
                )}
                className="flex h-full flex-col gap-6"
              >
                <div className="flex h-[100%] flex-col gap-2 lg:gap-3">
                  <div className="flex flex-row">
                    <FormField
                      name="nobukti"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                          <FormLabel
                            required={true}
                            className="font-semibold lg:w-[30%]"
                          >
                            NO BUKTI
                          </FormLabel>
                          <div className="flex flex-col lg:w-[70%]">
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
                        <FormItem className="flex w-full flex-col justify-between lg:ml-4 lg:flex-row lg:items-center">
                          <FormLabel
                            required={true}
                            className="font-semibold lg:w-[30%]"
                          >
                            TGL BUKTI
                          </FormLabel>
                          <div className="flex flex-col lg:w-[70%]">
                            <FormControl>
                              <InputDatePicker
                                value={field.value}
                                onChange={field.onChange}
                                disabled={mode === 'view' || mode === 'delete'}
                                showCalendar
                                onSelect={(date) =>
                                  forms.setValue('tglbukti', date)
                                }
                              />
                              {/* <InputDateTimePicker
                                value={field.value} // '' saat kosong
                                onChange={field.onChange} // string keluar (mis. "16-08-2025 09:25 AM")
                                showCalendar
                                showTime // aktifkan 12h + AM/PM
                                minuteStep={1}
                                fromYear={1960}
                                toYear={2035}
                                // outputFormat="dd-MM-yyyy hh:mm a" // default sudah begini saat showTime
                              /> */}
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    name="tgljatuhtempo"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          TANGGAL JATUH TEMPO
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <InputDatePicker
                              value={field.value}
                              onChange={field.onChange}
                              disabled={mode === 'view' || mode === 'delete'}
                              showCalendar
                              onSelect={(date) =>
                                forms.setValue('tgljatuhtempo', date)
                              }
                            />
                            {/* <InputDateTimePicker
                                value={field.value} // '' saat kosong
                                onChange={field.onChange} // string keluar (mis. "16-08-2025 09:25 AM")
                                showCalendar
                                showTime // aktifkan 12h + AM/PM
                                minuteStep={1}
                                fromYear={1960}
                                toYear={2035}
                                // outputFormat="dd-MM-yyyy hh:mm a" // default sudah begini saat showTime
                              /> */}
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
                        <FormLabel className="font-semibold lg:w-[15%]">
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
                        RELASI
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsRelasi.map((props, index) => (
                        <LookUp
                          disabled={
                            mode === 'view' ||
                            mode === 'delete' ||
                            mode === 'edit'
                          }
                          key={index}
                          {...props}
                          lookupValue={(id) => forms.setValue('relasi_id', id)}
                          lookupNama={forms.getValues('relasi_text')}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="h-[400px] min-h-[400px]">
                    <div className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background">
                      <div className="flex h-[38px] w-full flex-row items-center rounded-t-sm border-b border-border bg-background-grid-header px-2"></div>

                      <DataGrid
                        key={dataGridKey}
                        ref={gridRef}
                        columns={columns as any[]}
                        rows={rows}
                        headerRowHeight={30}
                        rowHeight={60}
                        renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
                        className={`${
                          isDark ? 'rdg-dark' : 'rdg-light'
                        } fill-grid`}
                        enableVirtualization={false}
                      />
                      {/* <div
                        className="flex flex-row border border-b-0 border-l-0 border-blue-500 p-2"
                        style={{ gridColumn: '1/-1' }}
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
            forms.handleSubmit((values: any) => {
              onSubmit(values, false);
              dispatch(setSubmitClicked(true));
            })();
          }}
          onSaveAndAdd={() => {
            forms.handleSubmit((values: any) => {
              onSubmit(values, true);
              dispatch(setSubmitClicked(true));
            })();
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

export default FormHutang;
