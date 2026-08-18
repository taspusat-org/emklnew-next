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
import { FaTimes, FaTrashAlt } from 'react-icons/fa';
import { formatCurrency, parseCurrency } from '@/lib/utils';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import { KASBANK } from '@/constants/pengeluaranemkl';
import { useTheme } from 'next-themes';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { useShiftHorizontalScroll } from '@/hooks/use-shift-horizontal-scroll';

const FormPinjamanEmkl = ({ forms, mode, popOver }: any) => {
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
  const {
    data: allData,
    isLoading: isLoadingData,
    refetch
  } = useGetPengeluaranEmklDetail({
    filters: { nobukti: headerData?.nobukti ?? '' }
  });

  const gridRef = useRef<DataGridHandle>(null);
  const addRow = () => {
    const newRow: Partial<PengeluaranEmklDetail> & { isNew: boolean } = {
      id: 0, // Placeholder ID
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
  const lookUpPropsKaryawan = [
    {
      columns: [{ key: 'nama', name: 'KARYAWAN' }],
      labelLookup: 'KARYAWAN LOOKUP',
      selectedRequired: false,
      label: 'KARYAWAN',
      endpoint: 'karyawan',
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
    // const formatted = formatWithCommas(rawInput);
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
              <p className={`text-sm font-normal`}>Nominal</p>
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

  useEffect(() => {
    if (allData || popOver) {
      if (allData && (allData.data?.length ?? 0) > 0 && mode !== 'add') {
        const formattedRows = allData.data.map((item: any) => ({
          id: Number(item.id),
          nobukti: item.nobukti ?? '',
          nominal: item.nominal ?? '',
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
            nobukti: '',
            nominal: '',
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
      <FormField
        name="tgljatuhtempo"
        control={forms.control}
        render={({ field }) => (
          <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
            <FormLabel required={true} className="font-semibold lg:w-[15%]">
              TGL JATUH TEMPO
            </FormLabel>
            <div className="flex flex-col lg:w-[85%]">
              <FormControl>
                <InputDatePicker
                  value={field.value}
                  onChange={field.onChange}
                  disabled={mode === 'view' || mode === 'delete'}
                  showCalendar
                  onSelect={(date) => forms.setValue('tgljatuhtempo', date)}
                />
              </FormControl>
              <FormMessage />
            </div>
          </FormItem>
        )}
      />
      <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
        <div className="w-full lg:w-[15%]">
          <FormLabel className="text-sm font-semibold">KARYAWAN</FormLabel>
        </div>
        <div className="w-full lg:w-[85%]">
          {lookUpPropsKaryawan.map((props, index) => (
            <LookUp
              key={index}
              {...props}
              labelLookup="LOOKUP KARYAWAN"
              disabled={mode === 'view' || mode === 'delete'}
              // onClear={forms.setValue('relasi_id', null)}
              lookupValue={(id) => forms.setValue('karyawan_id', id)}
              // inputLookupValue={forms.getValues('relasi_id')}
              lookupNama={forms.getValues('karyawan_nama')}
            />
          ))}
        </div>
      </div>
      <FormField
        name="nowarkat"
        control={forms.control}
        render={({ field }) => (
          <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
            <FormLabel className="font-semibold lg:w-[15%]">NOWARKAT</FormLabel>
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
                    KAS/BANK
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
          <div className="flex h-[38px] w-full flex-row items-center rounded-t-sm border-b border-border bg-background-grid-header px-2"></div>

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
    </div>
  );
};

export default FormPinjamanEmkl;
