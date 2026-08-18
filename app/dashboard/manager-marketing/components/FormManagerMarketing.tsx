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
import { useTheme } from 'next-themes';
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
import { ManagerMarketingDetail } from '@/lib/types/managermarketingheader.type';
import { FaRegSquarePlus } from 'react-icons/fa6';
import { Textarea } from '@/components/ui/textarea';
import { useGetManagerMarketingDetail } from '@/lib/server/useManagermarketing';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import { setSubmitClicked } from '@/lib/store/lookupSlice/lookupSlice';
import { useShiftHorizontalScroll } from '@/hooks/use-shift-horizontal-scroll';
const FormManagerMarketing = ({
  popOver,
  setPopOver,
  forms,
  onSubmit,
  mode,
  submitSuccessful,
  handleClose,
  isLoadingCreate,
  isLoadingUpdate,
  isLoadingDelete
}: any) => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  // Shift + scroll = geser horizontal. Grid ini lebih lebar dari modal dan
  // react-remove-scroll bawaan Radix Dialog membatalkan wheel-nya.
  useShiftHorizontalScroll();

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
  } = useGetManagerMarketingDetail(headerData?.id ?? 0);

  const [rows, setRows] = useState<
    (
      | ManagerMarketingDetail
      | (Partial<ManagerMarketingDetail> & { isNew: boolean })
    )[]
  >([]);
  function handleCellClick(args: { row: ManagerMarketingDetail }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
    }
  }
  const addRow = () => {
    const newRow: Partial<ManagerMarketingDetail> & { isNew: boolean } = {
      id: 0, // Placeholder ID
      nominalawal: '',
      nominalakhir: '',
      persentase: '',
      statusaktif: null,
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
        nominalawal: '',
        nominalakhir: '',
        persentase: '',
        statusaktif: null,
        text: '',
        isNew: true
      },
      { isAddRow: true, id: 'add_row', isNew: false }
    ]);

    forms.setValue('details', [
      {
        id: 0,
        nominalawal: '',
        nominalakhir: '',
        persentase: '',
        statusaktif: '',
        text: ''
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
    handleInputChange(rowIdx, 'nominalawal', rawInput);
  };

  const handleCurrencyChange2 = (rowIdx: number, rawInput: string) => {
    handleInputChange(rowIdx, 'nominalakhir', rawInput);
  };
  const handleCurrencyChange3 = (rowIdx: number, rawInput: string) => {
    handleInputChange(rowIdx, 'persentase', rawInput);
  };

  const handleCurrencyChange4 = (rowIdx: number, rawInput: string) => {
    handleInputChange(rowIdx, 'statusaktif', rawInput);
  };

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

  const columns = useMemo((): Column<ManagerMarketingDetail>[] => {
    return [
      {
        key: 'aksi',
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        width: 65,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full w-full cursor-pointer flex-col justify-center px-1">
            <p className="text-sm font-normal">aksi</p>
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
            return 5; // Spanning the "Add Row" button across 3 columns (adjust as needed)
          }
          return undefined; // For other rows, no column spanning
        },
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full flex-col items-center justify-center gap-1">
            <p className="text-sm">No.</p>
          </div>
        )
      },

      {
        key: 'nominalawal',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm font-normal`}>Nominal Awal</p>
          </div>
        ),
        name: 'nominalawal',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;

          let raw = props.row.nominalawal ?? '';
          if (typeof raw === 'number') raw = raw.toString();
          if (!raw.includes(',')) raw = formatCurrency(parseFloat(raw));

          return (
            <FormField
              name={`details.${rowIdx}.nominalawal`}
              control={forms.control}
              render={({ field }) => (
                <FormItem className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
                  <div className="flex w-full flex-col">
                    <FormControl>
                      <InputCurrency
                        {...field}
                        readOnly={mode === 'view' || mode === 'delete'}
                        value={String(props.row.nominalawal ?? '')}
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleCurrencyChange(rowIdx, value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          );
        }
      },
      {
        key: 'nominalakhir',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm font-normal`}>Nominal Akhir</p>
          </div>
        ),
        name: 'nominal',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.nominalakhir ?? ''; // Nilai nominal awal

          // Cek jika raw belum diformat dengan tanda koma, kemudian format
          if (typeof raw === 'number') {
            raw = raw.toString(); // Mengonversi nominal menjadi string
          }

          // Jika raw tidak mengandung tanda koma, format sebagai currency
          if (!raw.includes(',')) {
            raw = formatCurrency(parseFloat(raw)); // Gunakan formatCurrency jika belum ada koma
          }

          return (
            <FormField
              name={`details.${rowIdx}.nominalakhir`}
              control={forms.control}
              render={({ field }) => (
                <FormItem className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
                  <div className="flex w-full flex-col">
                    <FormControl>
                      <InputCurrency
                        {...field}
                        readOnly={mode === 'view' || mode === 'delete'}
                        value={String(props.row.nominalakhir ?? '')}
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleCurrencyChange2(rowIdx, value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          );
        }
      },
      {
        key: 'persentase',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 180,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm font-normal`}>Persentase</p>
          </div>
        ),
        name: 'persentase',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.persentase ?? ''; // Nilai nominal awal

          // Cek jika raw belum diformat dengan tanda koma, kemudian format
          if (typeof raw === 'number') {
            raw = raw.toString(); // Mengonversi nominal menjadi string
          }

          // Jika raw tidak mengandung tanda koma, format sebagai currency
          if (!raw.includes(',')) {
            raw = formatCurrency(parseFloat(raw)); // Gunakan formatCurrency jika belum ada koma
          }

          return (
            <FormField
              name={`details.${rowIdx}.persentase`}
              control={forms.control}
              render={({ field }) => (
                <FormItem className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
                  <div className="flex flex-col">
                    <FormControl>
                      <InputCurrency
                        {...field}
                        readOnly={mode === 'view' || mode === 'delete'}
                        value={String(props.row.persentase ?? '')}
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleCurrencyChange3(rowIdx, value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          );
        }
      },
      {
        key: 'statusaktif',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm font-normal`}>Status Aktif</p>
          </div>
        ),
        name: 'statusaktif',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          return (
            <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
              <div className="w-full lg:w-[100%]">
                {lookUpPropsStatusAktifDetail.map((props, index) => (
                  <LookUp
                    label={`STATUS AKTIF ${rowIdx + 1}`}
                    key={index}
                    {...props}
                    lookupValue={(id) =>
                      handleCurrencyChange4(rowIdx, String(id))
                    }
                    lookupNama={forms.getValues(`details[${rowIdx + 1}].text`)}
                    disabled={mode === 'view' || mode === 'delete'}
                  />
                ))}
              </div>
            </div>
          );
        }
      }
    ];
  }, [rows, checkedRows, editingRowId, editableValues, dispatch]);

  const lookUpPropsStatusMentor = [
    {
      columns: [{ key: 'text', name: 'STATUS MENTOR' }],
      labelLookup: 'STATUS MENTOR LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS MENTOR',
      singleColumn: true,
      pageSize: 20,
      showOnButton: true,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookUpPropsStatusLeader = [
    {
      columns: [{ key: 'text', name: 'STATUS LEADER' }],
      labelLookup: 'STATUS LEADER LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS NILAI',
      singleColumn: true,
      pageSize: 20,
      showOnButton: true,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookUpPropsStatusAktif = [
    {
      columns: [{ key: 'text', name: 'STATUS' }],
      labelLookup: 'STATUS AKTIF LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+aktif',
      label: 'STATUS AKTIF',
      singleColumn: true,
      pageSize: 20,
      showOnButton: true,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookUpPropsStatusAktifDetail = [
    {
      columns: [{ key: 'text', name: 'STATUS', width: 250 }],
      labelLookup: 'STATUS AKTIF DETAIL LOOKUP',
      required: true,
      selectedRequired: true,
      endpoint: 'parameter?grp=status+aktif',
      singleColumn: true,
      pageSize: 20,
      showOnButton: true,
      postData: 'text',
      dataToPost: 'id'
    }
  ];
  const formRef = useRef<HTMLFormElement | null>(null); // Ref untuk form
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
          !element.hasAttribute('readonly') // Pengecualian jika input readonly
      ) as HTMLElement[]; // Ambil semua input dalam form kecuali button dan readonly inputs

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
    if (allData && popOver) {
      // If there is data, add the data rows and the "Add Row" button row at the end
      if (allData?.data?.length > 0 && mode !== 'add') {
        const formattedRows = allData.data.map((item: any) => ({
          id: item.id,
          nominalawal: item.nominalawal ?? '',
          nominalakhir: item.nominalakhir ?? '',
          persentase: item.persentase ?? '',
          statusaktif: item.statusaktif ?? '',
          text: item.text ?? '',
          isNew: false
        }));

        // Always add the "Add Row" button row at the end
        setRows([
          ...formattedRows,
          { isAddRow: true, id: 'add_row', isNew: false }
        ]);
      } else {
        // If no data, add one editable row and the "Add Row" button row at the end
        setRows([
          {
            id: 0,
            nominalawal: '',
            nominalakhir: '',
            persentase: '',
            statusaktif: null,
            text: '',
            isNew: true
          },
          { isAddRow: true, id: 'add_row', isNew: false } // Row for the "Add Row" button
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
            nominalawal,
            nominalakhir,
            persentase,
            statusaktif,
            text,
            ...rest
          }) => ({
            ...rest,
            nominalawal: nominalawal ? String(nominalawal) : '',
            nominalakhir: nominalakhir ? String(nominalakhir) : '',
            persentase: persentase ? String(persentase) : '',
            statusaktif: statusaktif ? String(statusaktif) : '',
            text: text ? String(text) : ''
          })
        );

      forms.setValue('details', filteredRows);
    }
  }, [rows]);
  useEffect(() => {
    if (submitSuccessful) {
      resetDetailAndAddNewRow();
    }
  }, [submitSuccessful]);
  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Add Manager Marketing'
              : mode === 'edit'
              ? 'Edit Manager Marketing'
              : mode === 'delete'
              ? 'Delete Manager Marketing'
              : 'View Manager Marketing'}
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
                  <FormField
                    name="minimalprofit"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          MINIMAL PROFIT
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
                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={true}
                        className="text-sm font-semibold"
                      >
                        STATUS MENTOR
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsStatusMentor.map((props, index) => (
                        <LookUp
                          disabled={mode === 'view' || mode === 'delete'}
                          key={index}
                          {...props}
                          lookupValue={(id) =>
                            forms.setValue('statusmentor', id)
                          }
                          lookupNama={forms.getValues('statusmentor_text')}
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
                        STATUS LEADER
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsStatusLeader.map((props, index) => (
                        <LookUp
                          disabled={mode === 'view' || mode === 'delete'}
                          key={index}
                          {...props}
                          lookupValue={(id) =>
                            forms.setValue('statusleader', id)
                          }
                          lookupNama={forms.getValues('statusleader_text')}
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
                        Status Aktif
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsStatusAktif.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(id) => {
                            forms.setValue('statusaktif', id);
                          }}
                          lookupNama={forms.getValues('text')}
                          disabled={mode === 'view' || mode === 'delete'}
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
                        headerRowHeight={40}
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

export default FormManagerMarketing;
