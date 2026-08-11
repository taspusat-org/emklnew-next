import { useTheme } from 'next-themes';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import LookUp from '@/components/custom-ui/LookUp';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { useSelector, useDispatch } from 'react-redux';
import { IoMdClose, IoMdRefresh } from 'react-icons/io';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { useEffect, useMemo, useRef, useState } from 'react';
import DataGrid, { Column, DataGridHandle } from 'react-data-grid';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { prosesShippingOrderanMuatanFn } from '@/lib/apis/orderanHeader.api';
import { JENISORDERMUATAN, statusJobMasukGudang } from '@/constants/statusjob';
import { ShippingInstructionDetail } from '@/lib/types/shippingIntruction.type';
import {
  setClearLookup,
  setSubmitClicked
} from '@/lib/store/lookupSlice/lookupSlice';
import FormLabel, {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/components/ui/form';
import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import { useGetShippingInstructionDetail } from '@/lib/server/useShippingIntruction';
import { useAlert } from '@/lib/store/client/useAlert';
import {
  getAllShippingInstructionHeaderFn,
  getShippingInstructionDetailRincianFn
} from '@/lib/apis/shippinginstruction.api';
import { EmptyRowsRenderer } from '@/components/EmptyRows';

const JUMLAH_KOLOM_TREE = 9;

const TINGGI_BARIS_DETAIL = 55;
const TINGGI_TAB_RINCIAN = 32;
const TINGGI_HEADER_RINCIAN = 27;
const TINGGI_BARIS_RINCIAN = 40;
/** <DataGrid> memakai box-sizing: border-box + border 1px atas & bawah. */
const TINGGI_BORDER_GRID_RINCIAN = 2;
/** Sisa tinggi baris tree di luar grid rincian: padding & border pembungkus. */
const TINGGI_PEMBUNGKUS_RINCIAN = 14;

/**
 * Dipakai bersama kolom detail dan kolom rincian supaya pola selnya sama:
 * kontrol di tengah sel, pesan error menempel tepat di bawahnya.
 */
const cellWithError = (
  value: string,
  error: string | undefined,
  control: React.ReactNode
) => (
  <div
    className="flex h-full w-full flex-col justify-center"
    title={error ?? value}
  >
    {control}
    {error && (
      <p className="truncate px-1 pt-[2px] text-[10px] leading-tight text-destructive">
        {error}
      </p>
    )}
  </div>
);

const headerCell = (label: string) => (
  <div
    className="flex h-full flex-col items-center justify-center gap-1"
    title={label.toUpperCase()}
  >
    <p className="text-sm">{label}</p>
  </div>
);

const FormShippingInstruction = ({
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
  const [dataGridKey, setDataGridKey] = useState(0);
  const [daftarBlValue, setDaftarBlValue] = useState(0);
  const [scheduleValue, setScheduleValue] = useState<string>('');
  const [notIn, setNotIn] = useState('');
  const [reloadForm, setReloadForm] = useState<boolean>(false);
  const [editingRowId, setEditingRowId] = useState(0); // Menyimpan ID baris yang sedang diedit
  const [rows, setRows] = useState<
    (
      | ShippingInstructionDetail
      | (Partial<ShippingInstructionDetail> & { isNew: boolean })
    )[]
  >([]);

  const [rincianByIndex, setRincianByIndex] = useState<Record<number, any[]>>(
    {}
  );
  const [expandedDetailIdx, setExpandedDetailIdx] = useState<Set<number>>(
    new Set()
  );
  const dispatch = useDispatch();
  const { alert } = useAlert();
  const gridRef = useRef<DataGridHandle>(null);
  const formRef = useRef<HTMLFormElement | null>(null); // Ref untuk form
  const openName = useSelector((state: RootState) => state.lookup.openName);
  const headerData = useSelector((state: RootState) => state.header.headerData);
  const detailData = useSelector((state: RootState) => state.header.detailData);
  const fmt = (date: Date) =>
    `${String(date.getDate()).padStart(2, '0')}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${date.getFullYear()}`;

  const {
    data: allDataDetail,
    isLoading,
    refetch: refetchDetail
  } = useGetShippingInstructionDetail(headerData?.id);

  const lookupPropsSchedule = [
    {
      columns: [
        { key: 'kapal_nama', name: 'KAPAL' },
        { key: 'pelayaran_nama', name: 'PELAYARAN' },
        { key: 'voyberangkat', name: 'VOY BERANGKAT' },
        { key: 'tujuankapal_nama', name: 'TUJUAN' }
      ],
      labelLookup: 'SCHEDULE KAPAL LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: `schedule-kapal?join=orderanmuatan&${notIn}`,
      label: 'SCHEDULE KAPAL',
      singleColumn: false,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'kapal_nama',
      dataToPost: 'id'
    }
  ];

  const lookupTujuanKapal = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'TUJUAN KAPAL LOOKUP',
      required: true,
      showOnButton: false,
      showClearButton: false,
      selectedRequired: false,
      // endpoint: 'tujuankapal',
      singleColumn: false,
      pageSize: 20,
      disabled: true,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupKapal = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'KAPAL LOOKUP',
      required: true,
      showOnButton: false,
      showClearButton: false,
      selectedRequired: false,
      // endpoint: `kapal`,
      // label: 'KAPAL LOOKUP',
      singleColumn: true,
      pageSize: 20,
      disabled: true,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const inputStopPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const handleOnFocus = (value: number, index: number) => {
    setDaftarBlValue(value);
    setEditingRowId(index);
  };

  const processOnReload = async () => {
    try {
      const tglbukti = forms.getValues('tglbukti');
      const scheduleId =
        scheduleValue || String(forms.getValues('schedule_id') ?? '');

      if (!scheduleId || !tglbukti) {
        alert({
          title: !scheduleId
            ? 'SCHEDULE BELUM DIPILIH.'
            : 'TGL BUKTI BELUM DIISI.',
          variant: 'danger',
          submitText: 'OK'
        });
        return;
      }

      dispatch(setProcessing());

      const detailSebelumnya = new Map<string, any>();
      const rincianSebelumnya = new Map<string, any>();

      rows.forEach((row: any, idx: number) => {
        if (row?.isAddRow) return;
        const key = String(row.daftarbl_id ?? '');
        if (key !== '') {
          detailSebelumnya.set(key, {
            shippinginstructiondetail_nobukti:
              row.shippinginstructiondetail_nobukti ?? '',
            id: row.id,
            keterangan: row.keterangan ?? '',
            comodity: row.comodity ?? '',
            notifyparty: row.notifyparty ?? '',
            totalgw: row.totalgw ?? ''
          });
        }

        (rincianByIndex[idx] ?? []).forEach((r: any) => {
          const rKey = `${key}|${String(r.orderanmuatan_nobukti ?? '')}`;
          rincianSebelumnya.set(rKey, {
            id: r.id,
            comodity: r.comodity ?? ''
          });
        });
      });

      const hasil = await prosesShippingOrderanMuatanFn(scheduleId);
      const grup = hasil?.data ?? [];

      setReloadForm(true);

      if (grup.length === 0) {
        setRows([]);
        resetTreeState();
        dispatch(setProcessed());
        return;
      }

      setDaftarBlValue(grup[0].daftarbl_id);

      const rowsBaru: any[] = [];
      const rincianBaru: Record<number, any[]> = {};

      grup.forEach((item: any, idx: number) => {
        const key = String(item.daftarbl_id ?? '');
        const lama = detailSebelumnya.get(key);

        rowsBaru.push({
          id: lama?.id ?? 0,
          orderan_id: item.orderan_id ?? '',
          daftarbl_id: item.daftarbl_id ?? '',
          containerpelayaran_id: item.pelayarancontainer_id ?? '',
          emkl_id: item.emkl_id ?? '',
          tujuankapal_id: item.tujuankapal_id ?? '',
          shippinginstructiondetail_nobukti:
            lama?.shippinginstructiondetail_nobukti ?? '',
          asalpelabuhan: item.asalpelabuhan ?? '',
          shipper: item.shipper ?? '',
          consignee: item.consignee ?? '',
          keterangan: lama?.keterangan ?? '',
          comodity: lama?.comodity ?? item.comodity ?? '',
          notifyparty: lama?.notifyparty ?? '',
          totalgw: lama?.totalgw ?? '',
          isNew: !lama
        });

        const rincian = Array.isArray(item.detailsrincian)
          ? item.detailsrincian
          : [];

        rincianBaru[idx] = rincian.map((r: any) => {
          const rKey = `${key}|${String(r.orderanmuatan_nobukti ?? '')}`;
          const rLama = rincianSebelumnya.get(rKey);

          return {
            id: rLama?.id ?? 0,
            idOrderan: r.shipper_id ?? '',
            orderanmuatan_nobukti: r.orderanmuatan_nobukti ?? '',
            keterangan: '',
            comodity: rLama?.comodity ?? r.comodity ?? '',
            nocontainer: r.nocontainer ?? '',
            noseal: r.noseal ?? '',
            shipper_id: r.shipper_id ?? '',
            shipper_nama: r.shipper_nama ?? '',
            isNew: !rLama
          };
        });

        forms.setValue(`details.${idx}.detailsrincian`, rincianBaru[idx]);
      });

      setRows(rowsBaru);
      setRincianByIndex(rincianBaru);
      setExpandedDetailIdx(new Set(rowsBaru.map((_r, i) => i)));

      dispatch(setProcessed());
    } catch (error) {
      console.log(error);
      setReloadForm(false);
      dispatch(setProcessed());
    } finally {
      dispatch(setProcessed());
    }
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

  const handleRincianChange = (
    detailIdx: number,
    rincianIdx: number,
    field: string,
    value: string | number
  ) => {
    setRincianByIndex((prev) => {
      const current = [...(prev[detailIdx] ?? [])];
      const target = { ...current[rincianIdx], [field]: value };

      if (target.isNew && Object.values(target).every((val) => val !== '')) {
        target.isNew = false;
      }
      current[rincianIdx] = target;

      forms.setValue(`details.${detailIdx}.detailsrincian`, current);

      return { ...prev, [detailIdx]: current };
    });
  };

  const resetTreeState = () => {
    setRincianByIndex({});
    setExpandedDetailIdx(new Set());
  };

  const toggleDetailRow = (detailIdx: number) => {
    setExpandedDetailIdx((prev) => {
      const next = new Set(prev);
      if (next.has(detailIdx)) next.delete(detailIdx);
      else next.add(detailIdx);
      return next;
    });
  };

  const treeRows = useMemo(() => {
    const flattened: any[] = [];
    let detailNo = 0;

    rows.forEach((row: any, detailIdx: number) => {
      if (row?.isAddRow) return;

      detailNo += 1;
      flattened.push({
        ...row,
        isTreeType: 'detail',
        detailIdx,
        nomor: detailNo
      });

      if (expandedDetailIdx.has(detailIdx)) {
        // detailIdx & rincianIdx ditempel ke tiap baris supaya renderCell grid
        // rincian bisa berdiri sendiri (tidak perlu closure per baris).
        flattened.push({
          isTreeType: 'rincianBlock',
          detailIdx,
          rincianRows: (rincianByIndex[detailIdx] ?? []).map(
            (r: any, rincianIdx: number) => ({ ...r, detailIdx, rincianIdx })
          )
        });
      }
    });

    return flattened;
  }, [rows, rincianByIndex, expandedDetailIdx]);

  const detailCount = useMemo(
    () => rows.filter((r: any) => !r?.isAddRow).length,
    [rows]
  );

  const detailErrors = forms.formState.errors?.details as any[] | undefined;

  /**
   * Kolom grid rincian (tab "Shipping") yang tampil di dalam baris tree.
   * Tiap baris rincian sudah membawa detailIdx & rincianIdx dari treeRows.
   */
  const rincianColumns = useMemo((): Column<any>[] => {
    const isReadOnly = mode === 'delete' || mode === 'view';

    const rincianError = (row: any, field: string) =>
      (
        (detailErrors?.[row.detailIdx] as any)?.detailsrincian?.[
          row.rincianIdx
        ] as any
      )?.[field]?.message as string | undefined;

    const rincianText = (row: any, field: string) => {
      const value = String(row[field] ?? '');

      return cellWithError(
        value,
        rincianError(row, field),
        <p className="truncate px-1 text-xs">{value}</p>
      );
    };

    const rincianInput = (row: any, field: string) => {
      const value = String(row[field] ?? '');
      const error = rincianError(row, field);

      return cellWithError(
        value,
        error,
        <Input
          type="text"
          value={value}
          title={value}
          readOnly={isReadOnly}
          onKeyDown={inputStopPropagation}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) =>
            handleRincianChange(
              row.detailIdx,
              row.rincianIdx,
              field,
              e.target.value
            )
          }
          className={`h-7 min-h-7 w-full rounded border text-xs ${
            error ? 'border-destructive' : 'border-gray-300'
          }`}
        />
      );
    };

    return [
      {
        key: 'orderanmuatan_nobukti',
        name: 'job',
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        resizable: true,
        draggable: true,
        width: '1fr',
        minWidth: 160,
        renderHeaderCell: () => headerCell('job'),
        renderCell: (props: any) =>
          rincianText(props.row, 'orderanmuatan_nobukti')
      },
      {
        key: 'comodity',
        name: 'comodity',
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        resizable: true,
        draggable: true,
        width: '1fr',
        minWidth: 160,
        renderHeaderCell: () => headerCell('comodity'),
        renderCell: (props: any) => rincianInput(props.row, 'comodity')
      },
      {
        key: 'nocontainer',
        name: 'no container',
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        resizable: true,
        draggable: true,
        width: '1fr',
        minWidth: 160,
        renderHeaderCell: () => headerCell('no container'),
        renderCell: (props: any) => rincianText(props.row, 'nocontainer')
      },
      {
        key: 'noseal',
        name: 'no seal',
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        resizable: true,
        draggable: true,
        width: '1fr',
        minWidth: 140,
        renderHeaderCell: () => headerCell('no seal'),
        renderCell: (props: any) => rincianText(props.row, 'noseal')
      },
      {
        key: 'shipper_nama',
        name: 'nama shipper',
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        resizable: true,
        draggable: true,
        width: '1fr',
        minWidth: 160,
        renderHeaderCell: () => headerCell('nama shipper'),
        renderCell: (props: any) => rincianText(props.row, 'shipper_nama')
      }
    ];
  }, [mode, detailErrors]);

  const columns = useMemo((): Column<ShippingInstructionDetail>[] => {
    const isReadOnly = mode === 'delete' || mode === 'view';

    const detailError = (row: any, field: string) =>
      (detailErrors?.[row.detailIdx] as any)?.[field]?.message as
        | string
        | undefined;

    const detailInput = (row: any, field: string) => {
      const value = String(row[field] ?? '');
      const error = detailError(row, field);

      return cellWithError(
        value,
        error,
        <Input
          type="text"
          value={value}
          title={value}
          readOnly={isReadOnly}
          onFocus={() => handleOnFocus(row.daftarbl_id, row.detailIdx)}
          onKeyDown={inputStopPropagation}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) =>
            handleInputChange(row.detailIdx, field, e.target.value)
          }
          className={`h-2 min-h-9 w-full rounded border ${
            error ? 'border-destructive' : 'border-gray-300'
          }`}
        />
      );
    };

    const readOnlyInput = (row: any, field: string) => {
      const value = String(row[field] ?? '');
      const error = detailError(row, field);

      return cellWithError(
        value,
        error,
        <Input
          type="text"
          value={value}
          title={value}
          readOnly
          className={`h-2 min-h-9 w-full rounded border ${
            error ? 'border-destructive' : 'border-gray-300'
          }`}
        />
      );
    };

    const rincianBlock = (row: any) => {
      const rincianRows: any[] = row.rincianRows ?? [];
      const jumlahBaris = Math.max(1, rincianRows.length);

      return (
        <div className="w-full bg-background py-1 pl-10 pr-3 text-foreground">
          <div className="flex w-full flex-row justify-start rounded-t-sm border border-b-0 border-border bg-background-grid-header px-1 pt-1">
            <div className="rounded-t-sm border border-b-0 border-border bg-background px-4 py-1 text-xs font-bold uppercase text-primary">
              Shipping
            </div>
          </div>

          {/* Klik & tombol di dalam grid rincian tidak diteruskan ke grid
              induk supaya seleksi sel dan navigasi keyboard tidak dobel. */}
          <div
            className="overflow-hidden rounded-b-sm bg-background text-foreground"
            style={{
              height:
                TINGGI_HEADER_RINCIAN +
                jumlahBaris * TINGGI_BARIS_RINCIAN +
                TINGGI_BORDER_GRID_RINCIAN
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <DataGrid
              columns={rincianColumns as any[]}
              defaultColumnOptions={{ sortable: false, resizable: true }}
              rows={rincianRows}
              rowKeyGetter={(r: any) => `${r.detailIdx}-${r.rincianIdx}`}
              rowHeight={TINGGI_BARIS_RINCIAN}
              headerRowHeight={TINGGI_HEADER_RINCIAN}
              renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
              className={`${
                isDark ? 'rdg-dark' : 'rdg-light'
              } fill-grid text-xs`}
              enableVirtualization={false}
            />
          </div>
        </div>
      );
    };

    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 60,
        cellClass: (row: any) =>
          row?.isTreeType === 'rincianBlock'
            ? 'rincian-block-cell'
            : 'form-input',
        headerCellClass: 'column-headers',
        colSpan: (args: any) =>
          args.type === 'ROW' && args.row?.isTreeType === 'rincianBlock'
            ? JUMLAH_KOLOM_TREE
            : undefined,
        renderHeaderCell: () => headerCell('No.'),
        renderCell: (props: any) => {
          if (props.row.isTreeType === 'rincianBlock') {
            return rincianBlock(props.row);
          }
          return (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold">
              {props.row.nomor}
            </div>
          );
        }
      },
      {
        key: 'shippinginstructiondetail_nobukti',
        name: 'nomor shipping',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 300,
        renderHeaderCell: () => headerCell('nomor shipping'),
        renderCell: (props: any) => {
          const isExpanded = expandedDetailIdx.has(props.row.detailIdx);
          return (
            <div className="flex h-full w-full items-center gap-2">
              <button
                type="button"
                aria-label={isExpanded ? 'Tutup rincian' : 'Buka rincian'}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDetailRow(props.row.detailIdx);
                }}
                className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 transition-colors hover:bg-blue-200"
              >
                {isExpanded ? (
                  <FaChevronDown size={10} />
                ) : (
                  <FaChevronRight size={10} />
                )}
              </button>
              <Input
                type="text"
                value={props.row.shippinginstructiondetail_nobukti || ''}
                title={props.row.shippinginstructiondetail_nobukti || ''}
                disabled={true}
                className="h-2 min-h-9 w-full rounded border border-gray-300"
              />
            </div>
          );
        }
      },
      {
        key: 'asalpelabuhan',
        name: 'pelabuhan asal',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: () => headerCell('pelabuhan asal'),
        renderCell: (props: any) => readOnlyInput(props.row, 'asalpelabuhan')
      },
      {
        key: 'keterangan',
        name: 'keterangan',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: () => headerCell('keterangan'),
        renderCell: (props: any) => detailInput(props.row, 'keterangan')
      },
      {
        key: 'consignee',
        name: 'consignee',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: () => headerCell('consignee'),
        renderCell: (props: any) => readOnlyInput(props.row, 'consignee')
      },
      {
        key: 'shipper',
        name: 'shipper',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: () => headerCell('shipper'),
        renderCell: (props: any) => readOnlyInput(props.row, 'shipper')
      },
      {
        key: 'comodity',
        name: 'comodity',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: () => headerCell('comodity'),
        renderCell: (props: any) => detailInput(props.row, 'comodity')
      },
      {
        key: 'notifyparty',
        name: 'notify party',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: () => headerCell('notify party'),
        renderCell: (props: any) => detailInput(props.row, 'notifyparty')
      },
      {
        key: 'totalgw',
        name: 'total gw / nw',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: () => headerCell('total gw / nw'),
        renderCell: (props: any) => detailInput(props.row, 'totalgw')
      }
    ];
  }, [
    mode,
    expandedDetailIdx,
    rincianByIndex,
    detailErrors,
    rincianColumns,
    isDark
  ]);

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
    if (rows) {
      const currentDetails = forms.getValues('details') || [];

      const mergedDetails = rows
        .filter((row) => row.id !== 'add_row') // Exclude rows with id "add_row"
        // .map(({ isNew, ...rest }) => ({
        //   ...rest
        // }));
        .map((row, index) => {
          const existing = currentDetails[index] || {}; // data lama dari form
          return {
            ...existing, // pertahankan detailsrincian, dsb
            ...row // timpa dengan data baru dari rows
          };
        });

      forms.setValue('details', mergedDetails);
    }
  }, [rows]);

  useEffect(() => {
    const fetchRincianForDetails = async () => {
      if (!allDataDetail || !popOver || mode === 'add') return;

      if (allDataDetail?.data?.length > 0) {
        // Format data detail utama (tanpa rincian)
        const formattedDetails = allDataDetail.data.map((item: any) => ({
          id: item.id ?? '',
          daftarbl_id: item.daftarbl_id ?? '',
          containerpelayaran_id: item.containerpelayaran_id ?? '',
          emkl_id: item.emkl_id ?? '',
          tujuankapal_id: item.tujuankapal_id ?? '',
          shippinginstructiondetail_nobukti:
            item.shippinginstructiondetail_nobukti ?? '',
          asalpelabuhan: item.asalpelabuhan ?? '',
          keterangan: item.keterangan ?? '',
          consignee: item.consignee ?? '',
          shipper: item.shipper ?? '',
          comodity: item.comodity ?? '',
          notifyparty: item.notifyparty ?? '',
          totalgw: item.totalgw ?? '',
          isNew: false
        }));

        // Set detail utama dulu ke state/form
        setRows(formattedDetails);

        // Lalu refetch rincian untuk setiap detail
        const rincianMap: Record<number, any[]> = {};

        for (const [index, detail] of allDataDetail.data.entries()) {
          try {
            setEditingRowId(0);
            // Tunggu refetch selesai
            const rincian = await getShippingInstructionDetailRincianFn(
              String(detail.id),
              { search: '' }
            );
            const rowsData = rincian?.data ?? [];

            // Format data rincian
            const formattedRincian = rowsData.map((r: any) => ({
              id: r.id ?? '',
              idOrderan: r.id ?? '',
              orderanmuatan_nobukti: r.orderanmuatan_nobukti ?? '',
              keterangan: r.keterangan ?? '',
              comodity: r.comodity ?? '',
              nocontainer: r.nocontainer ?? '',
              noseal: r.noseal ?? '',
              shipper_id: r.shipper_id ?? '',
              shipper_nama: r.shipper_nama ?? '',
              isNew: false
            }));

            // Set ke form sesuai index detail
            forms.setValue(`details.${index}.detailsrincian`, formattedRincian);
            rincianMap[index] = formattedRincian;
          } catch (err) {
            console.error(`Gagal ambil rincian untuk detail ${detail.id}`, err);
          }
        }

        setRincianByIndex(rincianMap);
      }
    };

    fetchRincianForDetails();
  }, [allDataDetail, headerData?.id, popOver, mode]);

  useEffect(() => {
    const fetchAllShippingHeader = async () => {
      try {
        const allHeader = await getAllShippingInstructionHeaderFn({
          limit: 0,
          filters: {}
        });

        const rowsData = allHeader?.data ?? [];
        const currentScheduleId = String(headerData?.schedule_id ?? '');
        const id = rowsData
          .map((row) => String(row?.schedule_id ?? ''))
          .filter(
            (scheduleId) =>
              scheduleId !== '' &&
              scheduleId !== 'null' &&
              scheduleId !== 'undefined' &&
              !(mode !== 'add' && scheduleId === currentScheduleId)
          );

        const jsonString = JSON.stringify({ id });
        setNotIn(`notIn=${jsonString}`);
      } catch (err) {
        console.error(
          `Gagal fetch all data shipping instruction header for get all schedule_id`,
          err
        );
      }
    };

    fetchAllShippingHeader();
  }, [popOver, mode, headerData?.schedule_id]);

  useEffect(() => {
    setEditingRowId(0);

    resetTreeState();

    if (mode === 'add') {
      setRows([]);
      setScheduleValue('');
      setDaftarBlValue(0);
      setReloadForm(false);
      forms.setValue('tglbukti', fmt(todayDate));
      forms.setValue('schedule_id', '');
      forms.setValue('voyberangkat', '');
      forms.setValue('kapal_id', '');
      forms.setValue('kapal_nama', '');
      forms.setValue('tglberangkat', '');
      forms.setValue('tujuankapal_id', '');
      forms.setValue('tujuankapal_nama', '');
    } else {
      setScheduleValue(String(headerData?.schedule_id ?? ''));
      setReloadForm(true);
    }
  }, [popOver, mode]);

  useEffect(() => {
    if (!popOver) return;

    const cariScrollerHorizontal = (mulai: HTMLElement | null) => {
      let node: HTMLElement | null = mulai;

      while (node && node !== document.body) {
        const { overflowX } = window.getComputedStyle(node);
        const bolehScroll = overflowX === 'auto' || overflowX === 'scroll';

        if (bolehScroll && node.scrollWidth - node.clientWidth > 1) {
          return node;
        }
        node = node.parentElement;
      }

      return null;
    };

    const handleShiftWheel = (event: WheelEvent) => {
      if (!event.shiftKey || event.ctrlKey) return;

      const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
      if (delta === 0) return;

      const scroller = cariScrollerHorizontal(
        event.target as HTMLElement | null
      );
      if (!scroller) return;

      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      const nextScrollLeft = Math.min(
        Math.max(scroller.scrollLeft + delta, 0),
        maxScrollLeft
      );
      if (nextScrollLeft === scroller.scrollLeft) return;

      event.preventDefault();
      scroller.scrollLeft = nextScrollLeft;
    };

    document.addEventListener('wheel', handleShiftWheel, {
      passive: false,
      capture: true
    });
    return () =>
      document.removeEventListener('wheel', handleShiftWheel, {
        capture: true
      });
  }, [popOver]);

  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Add Shipping Instruction'
              : mode === 'edit'
              ? 'Edit Shipping Instruction'
              : mode === 'delete'
              ? 'Delete Shipping Instruction'
              : 'View Shipping Instruction'}
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
                onSubmit={(e) => {
                  e.preventDefault();
                  onSubmit(false);
                }}
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
                              showCalendar={mode == 'add' || mode == 'edit'}
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
                    name="schedule_id"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          SCHEDULE
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookupPropsSchedule.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupValue={(value: any) => {
                                forms.setValue(
                                  'schedule_id',
                                  String(value ?? '')
                                );
                              }}
                              onSelectRow={(val) => {
                                if (mode === 'add') {
                                  setReloadForm(false);
                                }
                                setScheduleValue(String(val?.id ?? ''));
                                forms.setValue(
                                  'tglberangkat',
                                  val?.tglberangkat
                                );
                                forms.setValue(
                                  'voyberangkat',
                                  val?.voyberangkat
                                );
                                forms.setValue(
                                  'kapal_id',
                                  String(val?.kapal_id ?? '')
                                );
                                forms.setValue('kapal_nama', val?.kapal_nama);
                                forms.setValue(
                                  'tujuankapal_id',
                                  String(val?.tujuankapal_id ?? '')
                                );
                                forms.setValue(
                                  'tujuankapal_nama',
                                  val?.tujuankapal_nama
                                );
                              }}
                              onClear={() => {
                                if (mode === 'add') {
                                  setReloadForm(false);
                                }
                                setScheduleValue('');
                                forms.setValue('tglberangkat', '');
                                forms.setValue('voyberangkat', '');
                                forms.setValue('kapal_id', '');
                                forms.setValue('kapal_nama', '');
                                forms.setValue('tujuankapal_id', '');
                                forms.setValue('tujuankapal_nama', '');
                              }}
                              name="schedule_id"
                              forms={forms}
                              lookupNama={forms.getValues('kapal_nama')}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="voyberangkat"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          VOY BERANGKAT
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ''}
                              type="text"
                              readOnly={true}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="kapal_id"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          KAPAL
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookupKapal.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupNama={forms.getValues('kapal_nama')}
                              name="kapal_id"
                              forms={forms}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="tglberangkat"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          TGL BERANGKAT
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <InputDatePicker
                              value={field.value}
                              onChange={field.onChange}
                              showCalendar={true}
                              disabled={true}
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
                    name="tujuankapal_id"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          TUJUAN
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookupTujuanKapal.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupNama={forms.getValues('tujuankapal_nama')}
                              name="tujuankapal_id"
                              forms={forms}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="default"
                    className="mt-2 flex w-fit flex-row items-center justify-center"
                    onClick={(e) => {
                      e.preventDefault();
                      processOnReload();
                    }}
                  >
                    <IoMdRefresh />
                    <p style={{ fontSize: 12 }} className="font-normal">
                      PROSES
                    </p>
                  </Button>

                  {reloadForm && (
                    <div className="h-[500px] min-h-[500px]">
                      <div className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background">
                        <div className="flex h-[38px] w-full shrink-0 flex-row items-center justify-between rounded-t-sm border-b border-border bg-background-grid-header px-2">
                          <span className="text-xs font-bold uppercase text-primary">
                            Detail Shipping Instruction & Rincian
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => {
                              if (expandedDetailIdx.size > 0)
                                setExpandedDetailIdx(new Set());
                              else
                                setExpandedDetailIdx(
                                  new Set(
                                    Array.from(
                                      { length: detailCount },
                                      (_, i) => i
                                    )
                                  )
                                );
                            }}
                          >
                            {expandedDetailIdx.size > 0
                              ? 'Tutup Semua'
                              : 'Buka Semua'}
                          </Button>
                        </div>

                        <DataGrid
                          key={dataGridKey}
                          ref={gridRef}
                          columns={columns as any[]}
                          defaultColumnOptions={{
                            sortable: false,
                            resizable: true
                          }}
                          rows={treeRows}
                          rowKeyGetter={(row: any) =>
                            row.isTreeType === 'rincianBlock'
                              ? `RB-${row.detailIdx}`
                              : `D-${row.detailIdx}`
                          }
                          rowHeight={(row: any) =>
                            row.isTreeType === 'rincianBlock'
                              ? TINGGI_TAB_RINCIAN +
                                TINGGI_HEADER_RINCIAN +
                                Math.max(1, (row.rincianRows ?? []).length) *
                                  TINGGI_BARIS_RINCIAN +
                                TINGGI_BORDER_GRID_RINCIAN +
                                TINGGI_PEMBUNGKUS_RINCIAN
                              : TINGGI_BARIS_DETAIL
                          }
                          headerRowHeight={40}
                          renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
                          className={`${
                            isDark ? 'rdg-dark' : 'rdg-light'
                          } fill-grid text-sm`}
                          enableVirtualization={false}
                        />
                        <div className="flex flex-row justify-between border border-x-0 border-b-0 border-border bg-background-grid-header p-2"></div>
                      </div>
                    </div>
                  )}
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
            setReloadForm(false);
            setRows([]);
            resetTreeState();
            setScheduleValue('');
            setDaftarBlValue(0);
            setEditingRowId(0);
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

export default FormShippingInstruction;
