import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useGetKasGantungDetail } from '@/lib/server/useKasGantung';
import { useGetPengeluaranEmklDetail } from '@/lib/server/usePengeluaranEmklHeader';
import { KasGantungDetail } from '@/lib/types/kasgantungheader.type';
import { PengeluaranEmklDetail } from '@/lib/types/pengeluaranemklheader.type';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import LookUp from '@/components/custom-ui/LookUp';
import DataGrid, {
  CellKeyDownArgs,
  Column,
  DataGridHandle
} from 'react-data-grid';
import { FaRegSquarePlus } from 'react-icons/fa6';
import { FaSave, FaTimes, FaTrashAlt } from 'react-icons/fa';
import { MdAddBox } from 'react-icons/md';
import { formatCurrency, parseCurrency } from '@/lib/utils';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import { KASBANK } from '@/constants/pengeluaranemkl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/lib/store/client/useAlert';
import { IoMdClose } from 'react-icons/io';
import { useTheme } from 'next-themes';
import { useShiftHorizontalScroll } from '@/hooks/use-shift-horizontal-scroll';

const FormPenerimaanSeal = ({ forms, mode, popOver }: any) => {
  const { alert } = useAlert();
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const headerData = useSelector((state: RootState) => state.header.headerData);
  // Shift + scroll = geser horizontal. Grid ini lebih lebar dari modal dan
  // react-remove-scroll bawaan Radix Dialog membatalkan wheel-nya.
  useShiftHorizontalScroll();

  const [rows, setRows] = useState<
    (
      | PengeluaranEmklDetail
      | (Partial<PengeluaranEmklDetail> & { isNew: boolean })
    )[]
  >([]);

  // States for Entry Banyak Modal
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryData, setEntryData] = useState({
    kode: '',
    nominal: '',
    dari: '',
    sampai: '',
    keterangan: ''
  });

  // Refs untuk Tab navigation di modal Entry Banyak
  const entryModalRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const {
    data: allData,
    isLoading: isLoadingData,
    refetch
  } = useGetPengeluaranEmklDetail({
    filters: { nobukti: headerData?.nobukti ?? '' }
  });

  const gridRef = useRef<DataGridHandle>(null);
  const stopWheelPropagation = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  const handleEntryModalTab = (
    e: React.KeyboardEvent,
    currentField: string
  ) => {
    if (e.key === 'Tab') {
      e.preventDefault();

      const fieldOrder = ['kode', 'nominal', 'dari', 'sampai', 'keterangan'];
      const currentIdx = fieldOrder.indexOf(currentField);
      const nextIdx = e.shiftKey ? currentIdx - 1 : currentIdx + 1;

      if (e.shiftKey && e.key === 'Tab' && currentField === 'kode') {
        return;
      }

      if (nextIdx >= 0 && nextIdx < fieldOrder.length) {
        const nextField = fieldOrder[nextIdx];

        if (nextField === 'nominal') {
          const nominalWrapper = document.querySelector(
            '#nominal-wrapper input'
          );
          if (nominalWrapper instanceof HTMLInputElement) {
            nominalWrapper.focus();
          }
        } else {
          entryModalRefs.current[nextField]?.focus();
        }
      }
    }
  };

  const addRow = () => {
    const newRow: Partial<PengeluaranEmklDetail> & { isNew: boolean } = {
      nobukti: '',
      keterangan: '',
      nominal: '',
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

  // Function to handle Entry Banyak submission
  const handleEntryBanyakSubmit = () => {
    const { kode, nominal, dari, sampai, keterangan } = entryData;

    // Validation
    if (!kode || !nominal || !dari || !sampai) {
      alert({
        title: 'Isi semua field terlebih dahulu !!!',
        variant: 'danger',
        submitText: 'OK'
      });
      return;
    }

    const dariNum = parseInt(dari);
    const sampaiNum = parseInt(sampai);

    if (dariNum > sampaiNum) {
      alert({
        title: 'Nilai "Dari" harus lebih kecil atau sama dengan "Sampai !!!',
        variant: 'danger',
        submitText: 'OK'
      });
      return;
    }

    // Calculate padding for numbers
    const totalRows = sampaiNum - dariNum + 1;
    const maxDigits = sampaiNum.toString().length;

    // Generate new rows
    const newRows: (Partial<PengeluaranEmklDetail> & { isNew: boolean })[] = [];

    for (let i = dariNum; i <= sampaiNum; i++) {
      // Pad the number with zeros
      const paddedNumber = i.toString().padStart(maxDigits, '0');
      const noseal = `${kode}${paddedNumber}`;

      newRows.push({
        id: Date.now() + i, // Unique ID
        nobukti: '',
        noseal: noseal,
        keterangan: keterangan || '',
        nominal: nominal,
        isNew: true
      });
    }
    setRows((prevRows) => {
      const dataRows = prevRows.filter((row) => !row.isAddRow);
      const addRowButton = prevRows.find((row) => row.isAddRow);

      return [...dataRows, ...newRows, ...(addRowButton ? [addRowButton] : [])];
    });

    // Reset modal state
    setEntryData({
      kode: '',
      nominal: '',
      dari: '',
      sampai: '',
      keterangan: ''
    });
    setShowEntryModal(false);
  };

  const lookUpPropsJenisseal = [
    {
      columns: [{ key: 'nama', name: 'JENIS SEAL' }],
      labelLookup: 'JENIS SEAL LOOKUP',
      selectedRequired: false,
      label: 'JENIS SEAL',
      endpoint: 'jenisseal',
      dataToPost: 'id',
      singleColumn: true,
      pageSize: 20,
      showOnButton: true,
      postData: 'nama'
    }
  ];

  const lookUpPropsJenisPosting = [
    {
      columns: [{ key: 'text', name: 'JENIS' }],
      selectedRequired: false,
      label: 'JENIS POSTING',
      labelLookup: 'JENIS POSTING LOOKUP',
      endpoint: 'parameter',
      filterby: { grp: 'jenis posting' },
      dataToPost: 'id',
      singleColumn: true,
      pageSize: 20,
      showOnButton: true,
      postData: 'text'
    }
  ];

  const lookUpPropsBank = [
    {
      columns: [{ key: 'nama', name: 'BANK' }],
      labelLookup: 'BANK LOOKUP',
      selectedRequired: false,
      endpoint: 'bank',
      label: 'BANK',
      singleColumn: true,
      dataToPost: 'id',
      pageSize: 20,
      showOnButton: true,
      postData: 'nama'
    }
  ];

  const lookUpPropsAlatbayar = [
    {
      columns: [{ key: 'nama', name: 'ALAT BAYAR' }],
      labelLookup: 'ALAT BAYAR LOOKUP',
      selectedRequired: false,
      endpoint: 'alatbayar',
      label: 'ALAT BAYAR',
      singleColumn: true,
      dataToPost: 'id',
      pageSize: 20,
      showOnButton: true,
      postData: 'nama'
    }
  ];

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

  const inputStopPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const handleCurrencyChange = (rowIdx: number, rawInput: string) => {
    handleInputChange(rowIdx, 'nominal', rawInput);
  };

  const totalNominal = rows.reduce(
    (acc, row) => acc + (row.nominal ? parseCurrency(row.nominal) : 0),
    0
  );

  const columns = useMemo((): Column<PengeluaranEmklDetail>[] => {
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
        key: 'noseal',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 500,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div className="headers-cell h-[50%] px-8">
              <p className={`text-sm font-normal`}>No Seal</p>
            </div>
            <div className="relative h-[50%] w-full px-1"></div>
          </div>
        ),
        name: 'noseal',
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  type="text"
                  disabled={mode === 'view' || mode === 'delete'}
                  value={props.row.noseal}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    handleInputChange(props.rowIdx, 'noseal', e.target.value)
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
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 500,
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
                  disabled={mode === 'view' || mode === 'delete'}
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
      },
      {
        key: 'nominal',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div className="headers-cell h-[50%] px-8">
              <p className={`text-sm font-normal`}>NOMINAL</p>
            </div>
            <div className="relative h-[50%] w-full px-1"></div>
          </div>
        ),
        name: 'nominal',
        renderCell: (props: any) => {
          const rowIdx = props.rowIdx;
          let raw = props.row.nominal ?? ''; // Nilai nominal awal

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-bold">
                  {formatCurrency(totalNominal)}
                </div>
              ) : (
                <InputCurrency
                  value={String(raw)}
                  disabled={mode === 'view' || mode === 'delete'}
                  onValueChange={(value) => handleCurrencyChange(rowIdx, value)}
                />
              )}
            </div>
          );
        }
      }
    ];
  }, [rows]);

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
          nobukti: item.nobukti ?? '',
          nominal: item.nominal ?? '',
          keterangan: item.keterangan ?? '',
          noseal: item.noseal ?? '',
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
            nobukti: '',
            nominal: '',
            keterangan: '',
            noseal: '',
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
        .map(({ isNew, nominal, ...rest }) => ({
          ...rest,
          nominal: nominal ? String(nominal) : '' // Convert nominal to string (empty string if null or undefined)
        }));

      forms.setValue('details', filteredRows);
    }
  }, [rows]);

  return (
    <div className="flex h-[100%] flex-col gap-2 lg:gap-3">
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
                  disabled={mode === 'view' || mode === 'delete'}
                />
              </FormControl>
              <FormMessage />
            </div>
          </FormItem>
        )}
      />

      <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
        <div className="w-full lg:w-[15%]">
          <FormLabel className="text-sm font-semibold">JENIS SEAL</FormLabel>
        </div>
        <div className="w-full lg:w-[85%]">
          {lookUpPropsJenisseal.map((props, index) => (
            <LookUp
              key={index}
              {...props}
              disabled={mode === 'view' || mode === 'delete'}
              // onClear={forms.setValue('relasi_id', null)}
              lookupValue={(id) => forms.setValue('jenisseal_id', id)}
              // inputLookupValue={forms.getValues('relasi_id')}
              lookupNama={forms.getValues('jenisseal_text')}
            />
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
        <div className="w-full lg:w-[15%]">
          <FormLabel className="text-sm font-semibold">JENIS POSTING</FormLabel>
        </div>
        <div className="w-full lg:w-[85%]">
          {lookUpPropsJenisPosting.map((props, index) => (
            <LookUp
              key={index}
              {...props}
              labelLookup="LOOKUP JENIS POSTING"
              disabled={mode === 'view' || mode === 'delete' || mode === 'edit'}
              // onClear={forms.setValue('relasi_id', null)}
              lookupValue={(id) => forms.setValue('jenisposting', id)}
              // inputLookupValue={forms.getValues('relasi_id')}
              lookupNama={forms.getValues('jenisposting_nama')}
            />
          ))}
        </div>
      </div>
      <div className="border-gray flex w-full flex-col gap-4 border border-gray-300 px-2 py-3">
        <p className="text-sm">
          {forms.getValues('jenisposting') === KASBANK
            ? 'POSTING PENGELUARAN'
            : 'POSTING HUTANG'}
        </p>

        <div className="flex flex-row lg:gap-3">
          {forms.getValues('jenisposting') === KASBANK ? (
            <div className="flex w-full flex-col gap-3">
              <div className="flex w-full flex-col lg:flex-row lg:items-center">
                <div className="w-full lg:w-[15%]">
                  <FormLabel className="text-sm font-semibold">
                    KAS / BANK
                  </FormLabel>
                </div>
                <div className="w-full lg:w-[35%]">
                  {lookUpPropsBank.map((props, index) => (
                    <LookUp
                      key={index}
                      {...props}
                      labelLookup="LOOKUP BANK"
                      disabled={
                        mode === 'view' || mode === 'delete' || mode === 'edit'
                      }
                      lookupValue={(id) => forms.setValue('bank_id', id)}
                      inputLookupValue={forms.getValues('bank_id')}
                      lookupNama={forms.getValues('bank_nama')}
                    />
                  ))}
                </div>
              </div>
              <div>
                <FormField
                  name="nobukti"
                  control={forms.control}
                  render={({ field }) => (
                    <FormItem className="flex w-full flex-col lg:flex-row lg:items-center">
                      <FormLabel className="font-semibold lg:w-[15%]">
                        NO BUKTI KAS/BANK KELUAR
                      </FormLabel>
                      <div className="flex flex-col lg:w-[35%]">
                        <FormControl>
                          <Input
                            disabled
                            value={forms.getValues('pengeluaran_nobukti')}
                            type="text"
                            readOnly={mode === 'view' || mode === 'delete'}
                          />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  name="tgljatuhtempo"
                  control={forms.control}
                  render={({ field }) => (
                    <FormItem className="flex w-full flex-col lg:flex-row lg:items-center">
                      <FormLabel
                        required={true}
                        className="font-semibold lg:w-[15%]"
                      >
                        TANGGAL JATUH TEMPO
                      </FormLabel>
                      <div className="flex flex-col lg:w-[35%]">
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
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex w-full flex-col lg:flex-row lg:items-center">
                <div className="w-full lg:w-[15%]">
                  <FormLabel className="text-sm font-semibold">
                    Alat Bayar
                  </FormLabel>
                </div>
                <div className="w-full lg:w-[35%]">
                  {lookUpPropsAlatbayar.map((props, index) => (
                    <LookUp
                      key={index}
                      {...props}
                      disabled={
                        mode === 'view' || mode === 'delete' || mode === 'edit'
                      }
                      lookupValue={(id) =>
                        forms.setValue('alatbayar_id', String(id ?? ''))
                      }
                      inputLookupValue={forms.getValues('alatbayar_id')}
                      lookupNama={forms.getValues('alatbayar_text')}
                    />
                  ))}
                </div>
              </div>
              <div>
                <FormField
                  name="nowarkat"
                  control={forms.control}
                  render={({ field }) => (
                    <FormItem className="flex w-full flex-col lg:flex-row lg:items-center">
                      <FormLabel className="font-semibold lg:w-[15%]">
                        NOMOR WARKAT
                      </FormLabel>
                      <div className="flex flex-col lg:w-[35%]">
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            type="text"
                            disabled={mode === 'view' || mode === 'delete'}
                          />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ) : (
            <div className="w-full">
              <FormField
                name="nobukti"
                control={forms.control}
                render={({ field }) => (
                  <FormItem className="flex w-full flex-col lg:flex-row lg:items-center">
                    <FormLabel className="font-semibold lg:w-[15%]">
                      NO BUKTI HUTANG
                    </FormLabel>
                    <div className="flex flex-col lg:w-[35%]">
                      <FormControl>
                        <Input
                          disabled
                          value={forms.getValues('hutang_nobukti')}
                          type="text"
                          readOnly={mode === 'view' || mode === 'delete'}
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
      </div>
      <div className="h-[400px] min-h-[400px]">
        <div className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background">
          <div className="flex h-[38px] w-full flex-row items-center justify-between rounded-t-sm border-b border-border bg-background-grid-header px-2">
            {mode !== 'view' && mode !== 'delete' && (
              <Button
                type="button"
                onClick={() => setShowEntryModal(true)}
                className="mr-auto flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                size="sm"
              >
                <MdAddBox className="text-lg" />
                Entry Banyak
              </Button>
            )}
          </div>

          <DataGrid
            ref={gridRef}
            columns={columns as any[]}
            rows={rows}
            headerRowHeight={70}
            rowHeight={40}
            renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
            className={`${isDark ? 'rdg-dark' : 'rdg-light'} fill-grid text-sm`}
            enableVirtualization={false}
          />
          <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2"></div>
        </div>
      </div>

      <Dialog open={showEntryModal} onOpenChange={setShowEntryModal}>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-50 ${
            showEntryModal ? 'visible bg-black/30' : 'invisible bg-transparent'
          }`}
          style={{ pointerEvents: showEntryModal ? 'auto' : 'none' }}
          onClick={() => setShowEntryModal(false)}
          aria-hidden={!showEntryModal}
        />

        {/* Dialog Container */}
        <div
          className={`fixed inset-0 z-[0] flex items-center justify-center p-4 ${
            showEntryModal ? 'visible' : 'invisible'
          }`}
          style={{ pointerEvents: showEntryModal ? 'auto' : 'none' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          <DialogContent
            className={`fixed left-[50%] top-[50%] z-50 flex w-full max-w-lg 
              -translate-x-1/2 -translate-y-1/2 flex-col rounded-sm 
              border border-border  shadow-2xl duration-200
              ${showEntryModal ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
            `}
            style={{
              // background: 'linear-gradient(to bottom, #eff5ff 0%, #e0ecff 10%)',
              overflowY: 'hidden',
              isolation: 'isolate',
              pointerEvents: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-background-grid-header px-2 py-2">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                ENTRY BANYAK
              </h2>
              <div
                className="cursor-pointer rounded-md border border-zinc-200 bg-red-500 p-0 hover:bg-red-400"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setShowEntryModal(false)}
              >
                <IoMdClose className="h-5 w-5 font-bold text-white" />
              </div>
            </div>

            {/* Dialog Content */}
            <div className="flex flex-col border border-border bg-background px-2 py-4">
              <div className="grid gap-4 ">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="kode" className="text-left text-sm ">
                    Kode
                  </label>
                  <Input
                    id="kode"
                    autoFocus
                    ref={(el) => {
                      entryModalRefs.current['kode'] = el;
                    }}
                    onKeyDown={(e) => handleEntryModalTab(e, 'kode')}
                    value={entryData.kode}
                    onChange={(e) =>
                      setEntryData({ ...entryData, kode: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="nominal" className="text-left text-sm ">
                    Nominal
                  </label>
                  <div
                    className="col-span-3"
                    id="nominal-wrapper"
                    onKeyDown={(e) => handleEntryModalTab(e, 'nominal')}
                  >
                    <InputCurrency
                      value={entryData.nominal}
                      onValueChange={(value) =>
                        setEntryData({ ...entryData, nominal: value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="dari" className="text-left text-sm ">
                    Dari
                  </label>
                  <Input
                    id="dari"
                    type="number"
                    ref={(el) => {
                      entryModalRefs.current['dari'] = el;
                    }}
                    onKeyDown={(e) => handleEntryModalTab(e, 'dari')}
                    value={entryData.dari}
                    onChange={(e) =>
                      setEntryData({ ...entryData, dari: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="sampai" className="text-left text-sm ">
                    Sampai
                  </label>
                  <Input
                    id="sampai"
                    type="number"
                    ref={(el) => {
                      entryModalRefs.current['sampai'] = el;
                    }}
                    onKeyDown={(e) => handleEntryModalTab(e, 'sampai')}
                    value={entryData.sampai}
                    onChange={(e) =>
                      setEntryData({ ...entryData, sampai: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="keterangan" className="text-left text-sm ">
                    Keterangan
                  </label>
                  <Input
                    id="keterangan"
                    ref={(el) => {
                      entryModalRefs.current['keterangan'] = el;
                    }}
                    onKeyDown={(e) => handleEntryModalTab(e, 'keterangan')}
                    value={entryData.keterangan}
                    onChange={(e) =>
                      setEntryData({ ...entryData, keterangan: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="flex flex-col-reverse items-center justify-start gap-4 border-x border-b border-border border-t-[#dddddd] bg-background-grid-header px-2 py-2 sm:flex-row">
              <Button
                type="button"
                className="flex w-fit items-center gap-1 text-sm"
                onClick={handleEntryBanyakSubmit}
              >
                <FaSave />
                SAVE
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex w-fit items-center gap-1 bg-zinc-500 text-sm text-white hover:bg-zinc-400"
                onClick={() => {
                  setShowEntryModal(false);
                  setEntryData({
                    kode: '',
                    nominal: '',
                    dari: '',
                    sampai: '',
                    keterangan: ''
                  });
                }}
              >
                <IoMdClose /> <p className="text-center text-white">Cancel</p>
              </Button>
            </div>
          </DialogContent>
        </div>
      </Dialog>
    </div>
  );
};

export default FormPenerimaanSeal;
