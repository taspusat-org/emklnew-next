import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  useGetKasGantungDetail,
  useGetKasGantungHeaderList
} from '@/lib/server/useKasGantung';
import {
  useGetPengeluaranEmklDetail,
  useGetPengeluaranEmklHeaderList,
  useGetPengeluaranEmklHeaderPengembalian
} from '@/lib/server/usePengeluaranEmklHeader';
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
import {
  formatCurrency,
  formatDateToDDMMYYYY,
  parseCurrency
} from '@/lib/utils';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import { KASBANK } from '@/constants/pengeluaranemkl';
import { Button } from '@/components/ui/button';
import { IoMdRefresh } from 'react-icons/io';
import { Checkbox } from '@/components/ui/checkbox';
import { useAlert } from '@/lib/store/client/useAlert';
import { useGetPenerimaanEmklDetail } from '@/lib/server/usePenerimaanEmklHeader';
import { useTheme } from 'next-themes';
import { useShiftHorizontalScroll } from '@/hooks/use-shift-horizontal-scroll';
const FormPengembalianPinjamanEmkl = ({ forms, mode, popOver }: any) => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const headerData = useSelector((state: RootState) => state.header.headerData);
  const {
    data: detail,
    isLoading,
    refetch: refetchDetail
  } = useGetPenerimaanEmklDetail({
    filters: { nobukti: headerData?.nobukti ?? '' }
  });
  // Shift + scroll = geser horizontal. Grid ini lebih lebar dari modal dan
  // react-remove-scroll bawaan Radix Dialog membatalkan wheel-nya.
  useShiftHorizontalScroll();

  const [tglDari, setTglDari] = useState<string>('');
  const [tglSampai, setTglSampai] = useState<string>('');
  const [editingRowId, setEditingRowId] = useState<number | null>(null); // Menyimpan ID baris yang sedang diedit
  const { alert } = useAlert();

  const [isReload, setIsReload] = useState<boolean>(false);
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const {
    data: allDataList,
    isLoading: isLoadingDataList,
    refetch: refetchList
  } = useGetPengeluaranEmklHeaderList(
    {
      dari: tglDari,
      sampai: tglSampai
    },
    popOver
  );
  const [rows, setRows] = useState<
    (
      | PengeluaranEmklDetail
      | (Partial<PengeluaranEmklDetail> & { isNew: boolean })
    )[]
  >([]);
  const {
    data: dataDetail,
    isLoading: isLoadingDataDetail,
    refetch: refetchListDetail
  } = useGetPengeluaranEmklHeaderPengembalian(
    {
      id: headerData.id ?? '',
      dari: tglDari,
      sampai: tglSampai
    },
    popOver // Mengoper popOver ke dalam hook
  );

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
      const currentRow = updatedData[index]; // Row saat ini
      const oldNominal = currentRow.nominal; // Nilai nominal LAMA (sebelum update)
      const parsedOldNominal = parseCurrency(oldNominal as string) || 0;

      // Update field yang diminta
      updatedData[index][field] = value;

      // Logic khusus jika field adalah 'nominal'
      if (field === 'nominal') {
        const parsedNewNominal = parseCurrency(value as string) || 0;
        let newSisa: number;

        if (mode === 'add') {
          // Mode add: Hitung dari awal, seperti kode asli
          const jumlahPinjaman = Number(currentRow.jumlahpinjaman || 0);
          const sudahDibayar = Number(currentRow.sudah_dibayar || 0);
          newSisa = jumlahPinjaman - (sudahDibayar + parsedNewNominal);

          // Validasi minus untuk add
          if (newSisa < 0) {
            updatedData[index].nominal = ''; // Reset ke kosong
            alert({
              title: 'Sisa tidak boleh minus',
              variant: 'danger',
              submitText: 'OK'
            });
            // Update sisa ke nilai sebelum nominal (jumlahPinjaman - sudahDibayar)
            updatedData[index].sisa = (
              jumlahPinjaman - sudahDibayar
            ).toString();
            return updatedData; // Return early
          }
        } else if (mode === 'edit') {
          // Mode edit: Gunakan DELTA untuk adjust sisa dari nilai awal backend
          const oldSisa = Number(currentRow.sisa || 0); // Sisa awal dari backend (2,000)
          const delta = parsedNewNominal - parsedOldNominal; // Perubahan: +1,000 jika 6k → 7k
          newSisa = oldSisa - delta; // Adjust: 2,000 - 1,000 = 1,000

          // Validasi minus untuk edit (warning, jangan reset)
          if (newSisa < 0) {
            console.warn('Peringatan: Sisa akan minus! Nominal terlalu besar.');
            // Opsional: Alert ringan
            // alert({ title: 'Sisa hampir minus, kurangi nominal!', variant: 'warning' });
            // Tetap simpan, tapi set sisa ke 0 untuk tampilan
            newSisa = 0;
          }
        } else {
          // Mode lain (jika ada), fallback ke 0 atau handle custom
          newSisa = 0;
        }

        // Simpan newSisa ke row
        updatedData[index].sisa = newSisa.toString();
      }

      // Logic asli untuk isNew (tetap pertahankan)
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
  const handleRowSelect = (rowId: number) => {
    setCheckedRows((prev) => {
      const updated = new Set(prev);
      if (updated.has(rowId)) {
        updated.delete(rowId);
      } else {
        updated.add(rowId);
      }

      setIsAllSelected(updated.size === rows.length);
      return updated;
    });
  };
  const handleSelectAll = () => {
    if (isAllSelected) {
      setCheckedRows(new Set());
    } else {
      const allIds = rows.map((row) => Number(row.id));
      setCheckedRows(new Set(allIds));
    }
    setIsAllSelected(!isAllSelected);
  };
  const handleDoubleClick = (rowId: number, initialValue: string | number) => {
    if (!checkedRows.has(rowId)) {
      return; // Don't proceed if the row is not selected
    }

    setEditingRowId(rowId);
  };
  // const filteredRows = useMemo(() => {
  //   return rows.filter((row) => {
  //     return (
  //       (filters.nobukti
  //         ? row.nobukti.toUpperCase().includes(filters.nobukti.toUpperCase())
  //         : true) &&
  //       (filters.tglbukti ? row?.tglbukti?.includes(filters.tglbukti) : true) &&
  //       (filters.keterangan
  //         ? row?.keterangan
  //             ?.toUpperCase()
  //             .includes(filters.keterangan.toUpperCase())
  //         : true) &&
  //       (filters.sisa ? row?.sisa?.toString().includes(filters.sisa) : true) &&
  //       (filters.nominal
  //         ? row?.nominal?.toString().includes(filters.nominal)
  //         : true)
  //     );
  //   });
  // }, [rows, filters]);
  interface SummaryRow {
    id: number;
    totalSisa: string;
    totalNominal: string;
    totalJumlahPinjaman: string;
    totalSudahDibayar: string;
  }
  const summaryRows = useMemo((): readonly SummaryRow[] => {
    // Recalculate totalSisa and totalNominal
    const totalSisa = rows.reduce(
      (acc, row) =>
        acc +
        (row.sisa
          ? parseCurrency(String(row.sisa)) - parseCurrency(row.nominal ?? '0')
          : 0),
      0
    );

    const totalNominal = rows.reduce(
      (acc, row) => acc + (row.nominal ? parseCurrency(row.nominal) : 0),
      0
    );
    const totalJumlahPinjaman = rows.reduce(
      (acc, row) =>
        acc + (row.jumlahpinjaman ? parseCurrency(row.jumlahpinjaman) : 0),
      0
    );
    const totalSudahDibayar = rows.reduce(
      (acc, row) =>
        acc + (row.sudah_dibayar ? parseCurrency(row.sudah_dibayar) : 0),
      0
    );
    return [
      {
        id: 0, // Format the total to string as currency
        totalSisa: formatCurrency(totalSisa), // Format the total to string as currency
        totalJumlahPinjaman: formatCurrency(totalJumlahPinjaman), // Format the total to string as currency
        totalNominal: formatCurrency(totalNominal), // Format the total to string as currency
        totalSudahDibayar: formatCurrency(totalSudahDibayar) // Format the total to string as currency
      }
    ];
  }, [rows]); // Dependency on filteredRows, so it updates when filteredRows change
  const columns = useMemo((): Column<PengeluaranEmklDetail>[] => {
    return [
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
            <div className="flex h-full w-full cursor-pointer items-center justify-center text-sm font-normal">
              {props.row.isAddRow ? 'TOTAL :' : props.rowIdx + 1}
            </div>
          );
        }
      },

      {
        key: 'select',
        name: '',
        width: 50,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div className="headers-cell h-[50%]"></div>
            <div className="flex h-[50%] w-full items-center justify-center">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={() => handleSelectAll()}
                id="header-checkbox"
                className="mb-2"
              />
            </div>
          </div>
        ),
        renderCell: ({ row }: { row: PengeluaranEmklDetail }) => (
          <div className="flex h-full items-center justify-center">
            <Checkbox
              checked={checkedRows.has(Number(row.id))}
              onCheckedChange={() => handleRowSelect(Number(row.id))}
              id={`row-checkbox-${row.id}`}
            />
          </div>
        )
      },
      {
        key: 'nobukti',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div className="headers-cell h-[50%] px-8">
              <p className={`text-sm`}>Nomor Bukti</p>
            </div>
            <div className="relative h-[50%] w-full px-1"></div>
          </div>
        ),
        name: 'NOMOR BUKTI',
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-sm">
              {props.row.nobukti}
            </div>
          );
        }
      },
      {
        key: 'tglbukti',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div className="headers-cell h-[50%] px-8">
              <p className={`text-sm`}>TGL Bukti</p>
            </div>
            <div className="relative h-[50%] w-full px-1"></div>
          </div>
        ),
        name: 'TGL BUKTI',
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-sm">
              {props.row.tglbukti}
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
        width: 300,
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
              <div className="flex h-full w-full cursor-pointer items-center text-sm font-normal">
                {props.row.keterangan}
              </div>
            </div>
          );
        }
      },
      {
        key: 'jumlahpinjaman',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div className="headers-cell h-[50%] px-8">
              <p className={`text-sm font-normal`}>Jumlah Pinjaman</p>
            </div>
            <div className="relative h-[50%] w-full px-1"></div>
          </div>
        ),
        name: 'JUMLAH PINJAMAN',
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-normal">
                {formatCurrency(props.row.jumlahpinjaman)}
              </div>
            </div>
          );
        },
        renderSummaryCell: () => {
          return (
            <div className="text-sm font-semibold">
              {summaryRows[0]?.totalJumlahPinjaman}
            </div>
          );
        }
      },
      {
        key: 'sudah_dibayar',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div className="headers-cell h-[50%] px-8">
              <p className={`text-sm font-normal`}>Sudah Dibayar</p>
            </div>
            <div className="relative h-[50%] w-full px-1"></div>
          </div>
        ),
        name: 'SUDAH DIBAYAR',
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-normal">
                {formatCurrency(props.row.sudah_dibayar)}
              </div>
            </div>
          );
        },
        renderSummaryCell: () => {
          return (
            <div className="text-sm font-semibold">
              {summaryRows[0]?.totalSudahDibayar}
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
          const rowId = props.row.id;
          const rowIdx = props.rowIdx;
          const isEditing = rowId === editingRowId;
          let raw = props.row.nominal ?? ''; // Nilai nominal awal

          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              <div
                className="m-0 flex h-full w-full cursor-pointer items-center py-2 text-sm "
                onDoubleClick={() =>
                  handleDoubleClick(rowId, props.row.nominal)
                } // Menambahkan event double click
              >
                {isEditing ? (
                  <InputCurrency
                    autoFocus
                    value={String(raw) ?? ''}
                    disabled={mode === 'view' || mode === 'delete'}
                    onValueChange={(value) =>
                      handleCurrencyChange(rowIdx, value)
                    }
                    onBlur={() => setEditingRowId(null)}
                  />
                ) : (
                  <div className="flex h-full w-full cursor-pointer items-center justify-end text-sm font-normal">
                    {formatCurrency(props.row.nominal)}
                  </div>
                )}
              </div>
            </div>
          );
        },

        renderSummaryCell: () => {
          return (
            <div className="text-sm font-semibold">
              {summaryRows[0]?.totalNominal}
            </div>
          );
        }
      },

      {
        key: 'sisa',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 150,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center gap-1">
            <div className="headers-cell h-[50%] px-8">
              <p className={`text-sm font-normal`}>Sisa</p>
            </div>
            <div className="relative h-[50%] w-full px-1"></div>
          </div>
        ),
        name: 'sisa',
        renderCell: (props: any) => {
          let displaySisa: number;

          if (mode === 'add') {
            // Untuk add: Selalu hitung dinamis
            const parsedNominal = parseCurrency(props.row.nominal || '0') || 0;
            displaySisa =
              Number(props.row.jumlahpinjaman || 0) -
              (Number(props.row.sudah_dibayar || 0) + parsedNominal);
          } else if (mode === 'edit') {
            // Untuk edit: Gunakan row.sisa yang sudah diadjust via handler (atau hitung delta jika belum)
            // Fallback: Jika row.sisa belum update, hitung delta manual
            const currentNominal = parseCurrency(props.row.nominal || '0') || 0;
            const oldNominal =
              parseCurrency(
                props.row.old_nominal || props.row.nominal || '0'
              ) || 0; // Asumsi simpan old_nominal di row jika perlu
            const delta = currentNominal - oldNominal;
            displaySisa = Number(props.row.sisa || 0) - delta; // Adjust dari sisa awal
          } else {
            displaySisa = Number(props.row.sisa || 0);
          }

          // Tampilkan 0 jika minus (atau handle warning)
          const finalSisa = displaySisa < 0 ? 0 : displaySisa;
          const isWarning = displaySisa < 0 && mode === 'edit';

          return (
            <div
              className={`m-0 flex h-full w-full cursor-pointer items-center p-0 text-sm ${
                isWarning ? 'font-bold text-red-500' : ''
              }`}
            >
              {formatCurrency(finalSisa)}
              {isWarning && (
                <span className="ml-1 text-xs"> (Periksa nominal!)</span>
              )}
            </div>
          );
        },

        renderSummaryCell: () => {
          return (
            <div className="text-sm font-semibold">
              {summaryRows[0]?.totalSisa}
            </div>
          );
        }
      }
    ];
  }, [rows, checkedRows, editingRowId, summaryRows]);
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

  const onReload = () => {
    setIsReload(true);
    setCheckedRows(new Set());
    setIsAllSelected(false);
    refetchList();
  };
  useEffect(() => {
    const currentDate = new Date(); // Dapatkan tanggal sekarang

    // Set tglDari to the first day of the current month
    const firstDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const formattedTglDari = formatDateToDDMMYYYY(firstDayOfMonth); // Format ke DD-MM-YYYY
    setTglDari(formattedTglDari); // Set nilai tglDari

    // Set tglSampai to the last day of the current month
    const lastDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );
    const formattedTglSampai = formatDateToDDMMYYYY(lastDayOfMonth); // Format ke DD-MM-YYYY
    setTglSampai(formattedTglSampai); // Set nilai tglSampai

    // Set tglbukti di form
    forms.setValue('tglbukti', formattedTglSampai); // Or you can use formattedTglDari depending on your use case
  }, [forms]); // Dependency array ensures it runs only once when the component is mounted
  useEffect(() => {
    // Hanya mengupdate rows jika isReload bernilai true
    if (mode && popOver) {
      if (dataDetail && mode !== 'add') {
        const newRows =
          dataDetail?.map((row: PengeluaranEmklDetail) => ({
            ...row,
            id: Number(row.id),
            nominal: row.nominal ?? '' // Jika nominal tidak ada, set default ke ""
          })) || [];
        setRows(newRows);
        setIsReload(false); // Setelah data di-set, set kembali isReload ke false
      } else if (isReload && allDataList && mode === 'add') {
        const newRows =
          allDataList?.map((row: PengeluaranEmklDetail) => ({
            ...row,
            id: Number(row.id),
            nominal: row.nominal ?? '' // Jika nominal tidak ada, set default ke ""
          })) || [];
        setRows(newRows);
        setIsReload(false); // Setelah data di-set, set kembali isReload ke false
      }
    }
  }, [allDataList, isReload, dataDetail, mode, popOver]);
  useEffect(() => {
    if (!popOver) {
      setRows([]);
      setCheckedRows(new Set());
      setIsAllSelected(false);
      lastInitializedDetailKey.current = ''; // Reset key cache
    }
  }, [popOver]);

  // Calculate the total sums of `sisa` and `nominal` dynamically
  const lastInitializedDetailKey = useRef<string>('');

  // Ini akan dijalankan setiap kali popOver buka DAN detail berubah
  useEffect(() => {
    if (popOver && detail && mode !== 'add' && rows.length > 0) {
      const detailKey = JSON.stringify(
        detail.data.map((item: any) => item.pengeluaranemkl_nobukti).sort()
      );

      if (detailKey !== lastInitializedDetailKey.current) {
        lastInitializedDetailKey.current = detailKey;

        const detailNoBuktiSet = new Set(
          detail.data.map((item: any) => item.pengeluaranemkl_nobukti)
        );

        const matchedRows = rows.filter((row) =>
          detailNoBuktiSet.has(row.nobukti)
        );
        const matchedRowIds = matchedRows.map((row) => row.id);

        setCheckedRows(new Set(matchedRowIds as number[]));
        forms.setValue('details', matchedRows, { shouldDirty: true });
      }
    }
  }, [popOver, detail, mode, rows]);
  useEffect(() => {
    const updatedDetail = rows.filter((row) => checkedRows.has(Number(row.id)));
    forms.setValue('details', updatedDetail, { shouldDirty: true });
  }, [checkedRows, rows, forms]);
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
      <div className="flex w-full flex-row gap-4">
        <div className="flex w-full flex-row items-center">
          <FormLabel required={true} className="font-semibold lg:w-[30%]">
            TGL DARI
          </FormLabel>
          <div className="flex flex-col lg:w-[70%]">
            <InputDatePicker
              value={tglDari}
              onChange={(e: any) => setTglDari(e.target.value)}
              disabled={mode === 'view' || mode === 'delete'}
              showCalendar
              onSelect={(date) => setTglDari(String(date))}
            />
          </div>
        </div>
        <div className="flex w-full flex-row items-center lg:ml-4">
          <FormLabel required={true} className="font-semibold lg:w-[30%]">
            SAMPAI TGL
          </FormLabel>
          <div className="flex flex-col lg:w-[70%]">
            <InputDatePicker
              value={tglSampai}
              onChange={(e: any) => setTglSampai(e.target.value)}
              disabled={mode === 'view' || mode === 'delete'}
              showCalendar
              onSelect={(date) => setTglSampai(String(date))}
            />
          </div>
        </div>
      </div>
      <Button
        variant="default"
        type="button"
        className="mt-2 flex w-fit flex-row items-center justify-center px-4"
        onClick={onReload}
      >
        <IoMdRefresh />
        <p style={{ fontSize: 12 }} className="font-normal">
          Reload
        </p>
      </Button>
      <div className="border-gray flex w-full flex-col gap-4 border border-gray-300 px-2 py-3">
        <p className="text-sm">POSTING PENERIMAAN</p>

        <div className="flex flex-row lg:gap-3">
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
                      NO BUKTI KAS/BANK MASUK
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
            rowHeight={35}
            bottomSummaryRows={summaryRows}
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

export default FormPengembalianPinjamanEmkl;
