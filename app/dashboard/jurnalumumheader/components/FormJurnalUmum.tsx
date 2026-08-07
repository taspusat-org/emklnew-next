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
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import LookUp from '@/components/custom-ui/LookUp';
import { Input } from '@/components/ui/input';
import { IoMdClose, IoMdRefresh } from 'react-icons/io';
import { FaTimes, FaTrashAlt } from 'react-icons/fa';
import InputMask from '@mona-health/react-input-mask';
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
import { KasGantungDetail } from '@/lib/types/kasgantungheader.type';
import { FaRegSquarePlus } from 'react-icons/fa6';
import { Textarea } from '@/components/ui/textarea';
import { useGetKasGantungDetail } from '@/lib/server/useKasGantung';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import LookUpModal from '@/components/custom-ui/LookUpModal';
import { useGetJurnalUmumDetail } from '@/lib/server/useJurnalUmum';
import { JurnalUmumDetail } from '@/lib/types/jurnalumumheader.type';
import { useTheme } from 'next-themes';

const FormKasGantung = ({
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

  const headerData = useSelector((state: RootState) => state.header.headerData);
  const gridRef = useRef<DataGridHandle>(null);
  const {
    data: allData,
    isLoading: isLoadingData,
    refetch
  } = useGetJurnalUmumDetail({
    filters: { nobukti: headerData?.nobukti ?? '' }
  });

  const [rows, setRows] = useState<
    (JurnalUmumDetail | (Partial<JurnalUmumDetail> & { isNew: boolean }))[]
  >([]);
  function handleCellClick(args: { row: JurnalUmumDetail }) {
    const clickedRow = args.row;
    const rowIndex = rows.findIndex((r) => r.id === clickedRow.id);
    if (rowIndex !== -1) {
      setSelectedRow(rowIndex);
    }
  }
  const addRow = () => {
    const newRow: Partial<JurnalUmumDetail> & { isNew: boolean } = {
      id: 0, // Placeholder ID
      nobukti: '',
      coa_nama: '',
      keterangan: '',
      nominaldebet: '',
      coa: '',
      nominalkredit: '',
      isNew: true
    };

    setRows((prevRows) => [
      ...prevRows.slice(0, prevRows.length - 1),
      newRow,
      prevRows[prevRows.length - 1]
    ]);
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
  // 2) onChangeRaw: simpan string yang sudah diformat ke state
  const formatWithCommas = (val: string): string => {
    // ambil cuma digit
    const digits = val.replace(/\D/g, '');
    // sisipkan koma setiap 3 digit dari kanan
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 2) handler onChange: format langsung & simpan ke state
  const handleCurrencyChangeKredit = (rowIdx: number, rawInput: string) => {
    // const formatted = formatWithCommas(rawInput);
    handleInputChange(rowIdx, 'nominalkredit', rawInput);
  };
  const handleCurrencyChangeDebet = (rowIdx: number, rawInput: string) => {
    // const formatted = formatWithCommas(rawInput);
    handleInputChange(rowIdx, 'nominaldebet', rawInput);
  };

  const totalNominalDebet = rows.reduce(
    (acc, row) =>
      acc + (row.nominaldebet ? parseCurrency(row.nominaldebet) : 0),
    0
  );
  const totalNominalKredit = rows.reduce(
    (acc, row) =>
      acc + (row.nominalkredit ? parseCurrency(row.nominalkredit) : 0),
    0
  );
  const lookupPropsCoaMasuk = [
    {
      columns: [
        { key: 'coa', name: 'coa', width: 100 },
        { key: 'keterangancoa', name: 'keterangancoa' }
      ],
      extendSize: '200',
      selectedRequired: false,
      endpoint: 'akunpusat',
      dataToPost: 'coa',
      singleColumn: false,
      pageSize: 20,
      showOnButton: true,
      postData: 'keterangancoa'
    }
  ];
  const columns = useMemo((): Column<JurnalUmumDetail>[] => {
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
            return 2; // Spanning the "Add Row" button across 3 columns (adjust as needed)
          }
          return undefined; // For other rows, no column spanning
        },
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full flex-col items-center gap-1">
            <div className="headers-cell h-[50%] items-center justify-center text-center font-normal">
              <p className="text-sm">No.</p>
            </div>

            <div className="flex h-[50%] w-full cursor-pointer items-center justify-center">
              <FaTimes className="bg-red-500 text-white" />
            </div>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-normal">
              {props.row.isAddRow ? 'TOTAL :' : props.rowIdx + 1}
            </div>
          );
        }
      },
      {
        key: 'coa',
        headerCellClass: 'column-headers',
        resizable: true,
        cellClass: 'form-input',
        draggable: true,

        width: 300,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div className="headers-cell h-[50%] px-8">
              <p className={`text-sm font-normal`}>COA</p>
            </div>
            <div className="relative h-[50%] w-full px-1"></div>
          </div>
        ),
        name: 'COA',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow
                ? ''
                : lookupPropsCoaMasuk.map((propsLookupCoaMasuk, index) => (
                    <LookUp
                      key={index}
                      {...propsLookupCoaMasuk}
                      labelLookup="LOOKUP COA KAS MASUK"
                      label={`COA KAS MASUK ${rowIdx}`}
                      disabled={mode === 'view' || mode === 'delete'}
                      lookupValue={(id) =>
                        handleInputChange(rowIdx, 'coa', String(id))
                      }
                      inputLookupValue={props.row.coa}
                      lookupNama={props.row.coa_nama}
                    />
                  ))}
            </div>
          );
        }
      },
      {
        key: 'nominaldebet',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div className="headers-cell h-[50%] px-8">
              <p className={`text-sm font-normal`}>Nominal (DEBET)</p>
            </div>
            <div className="relative h-[50%] w-full px-1"></div>
          </div>
        ),
        name: 'nominaldebet',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.nominaldebet ?? ''; // Nilai nominal awal

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
                  {formatCurrency(totalNominalDebet)}
                </div>
              ) : (
                <InputCurrency
                  value={String(raw)}
                  disabled={
                    mode === 'view' ||
                    mode === 'delete' ||
                    Number(parseCurrency(props.row.nominalkredit)) > 0 // Disable if kredit has a value
                  }
                  onValueChange={(value) =>
                    handleCurrencyChangeDebet(rowIdx, value)
                  }
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'nominalkredit',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div className="headers-cell h-[50%] px-8">
              <p className={`text-sm font-normal`}>Nominal (KREDIT)</p>
            </div>
            <div className="relative h-[50%] w-full px-1"></div>
          </div>
        ),
        name: 'nominalkredit',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.nominalkredit ?? '';

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
                  {formatCurrency(totalNominalKredit)}
                </div>
              ) : (
                <InputCurrency
                  value={String(raw)}
                  disabled={
                    mode === 'view' ||
                    mode === 'delete' ||
                    Number(parseCurrency(props.row.nominaldebet)) > 0 // Disable if debet has a value
                  }
                  onValueChange={(value) =>
                    handleCurrencyChangeKredit(rowIdx, value)
                  }
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'keterangan',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div className="headers-cell h-[50%] px-8">
              <p className={`text-sm font-normal`}>Keterangan</p>
            </div>
            <div className="relative h-[50%] w-full px-1"></div>
          </div>
        ),
        name: 'KETERANGAN',
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
          );
        }
      }
    ];
  }, [rows, checkedRows, editingRowId, editableValues]);
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
    if (allData || popOver) {
      if (allData && (allData.data?.length ?? 0) > 0 && mode !== 'add') {
        const formattedRows = allData.data.map((item: any) => ({
          id: Number(item.id),
          coa: item.coa ?? '',
          coa_nama: item.coa_nama ?? '',
          nobukti: item.nobukti ?? '',
          nominaldebet: item.nominaldebet ?? '',
          nominalkredit: item.nominalkredit ?? '',
          keterangan: item.keterangan ?? '',
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
            coa: '',
            nobukti: '',
            nominaldebet: '',
            nominalkredit: '',
            keterangan: '',
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
        .map(({ isNew, nominaldebet, nominalkredit, ...rest }) => ({
          ...rest,
          nominaldebet: nominaldebet ? String(nominaldebet) : '',
          nominalkredit: nominalkredit ? String(nominalkredit) : '' // Convert nominal to string (empty string if null or undefined)
        }));
      forms.setValue('details', filteredRows);
    }
  }, [rows]);
  useEffect(() => {
    if (rows) {
      // Filter out the `isNew` field and any object with `id: "add_row"`
      const filteredRows = rows
        .filter((row) => row.id !== 'add_row') // Exclude rows with id "add_row"
        .map(({ isNew, nominaldebet, nominalkredit, ...rest }) => ({
          ...rest,
          nominaldebet: nominaldebet ? String(nominaldebet) : '',
          nominalkredit: nominalkredit ? String(nominalkredit) : '' // Convert nominal to string (empty string if null or undefined)
        }));

      forms.setValue('details', filteredRows);
    }
  }, [rows]);
  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Tambah Jurnal Umum'
              : mode === 'edit'
              ? 'Edit Jurnal Umum'
              : mode === 'delete'
              ? 'Delete Jurnal Umum'
              : 'View Jurnal Umum'}
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
                // `onSubmit` adalah handler MENTAH dari grid, jadi pembungkusan
                // handleSubmit dilakukan di sini. Submit native (mis. ENTER di
                // sebuah field) diperlakukan sama dengan tombol SAVE:
                // keepOpenModal = false, dialog menutup.
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
                          <FormLabel className="font-semibold lg:w-[30%]">
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
                  <div className="h-[400px] min-h-[400px]">
                    <div className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background">
                      <div className="flex h-[38px] w-full flex-row items-center rounded-t-sm border-b border-border bg-background-grid-header px-2"></div>

                      <DataGrid
                        key={dataGridKey}
                        ref={gridRef}
                        columns={columns as any[]}
                        rows={rows}
                        enableVirtualization={false}
                        headerRowHeight={70}
                        rowHeight={40}
                        renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
                        className={`${
                          isDark ? 'rdg-dark' : 'rdg-light'
                        } fill-grid`}
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
            forms.handleSubmit((values: any) => onSubmit(values, false))();
          }}
          onCancel={handleClose}
          isLoadingCreate={isLoadingCreate}
          isLoadingUpdate={isLoadingUpdate}
          isLoadingDelete={isLoadingDelete}
          hideSaveAndAdd
        />
      </DialogContent>
    </Dialog>
  );
};

export default FormKasGantung;
