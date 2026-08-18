import { useTheme } from 'next-themes';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import LookUp from '@/components/custom-ui/LookUp';
import { useAlert } from '@/lib/store/client/useAlert';
import { useSelector, useDispatch } from 'react-redux';
import { IoMdClose, IoMdRefresh } from 'react-icons/io';
import { useGetBlDetail } from '@/lib/server/useBlHeader';
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
import {
  BLDetail,
  BlDetailRincian,
  BlRincianBiaya
} from '@/lib/types/blheader.type';
import { getShippingInstructionDetailRincianFn } from '@/lib/apis/shippinginstruction.api';
import {
  getAllBlHeaderHeaderFn,
  getBlDetailRincianFn,
  getBlRincianBiayaFn,
  prosesBlFn,
  prosesBlRincianBiayaFn
} from '@/lib/apis/blheader.api';
import FormLabel, {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/components/ui/form';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { useShiftHorizontalScroll } from '@/hooks/use-shift-horizontal-scroll';

const JUMLAH_KOLOM_TREE = 11;
const JUMLAH_KOLOM_TREE_RINCIAN = 5;

const TINGGI_BARIS_DETAIL = 55;
const TINGGI_TAB_RINCIAN = 32;
const TINGGI_HEADER_RINCIAN = 27;
const TINGGI_BARIS_RINCIAN = 40;
const TINGGI_BORDER_GRID_RINCIAN = 2;
const TINGGI_PEMBUNGKUS_RINCIAN = 14;

const TINGGI_TAB_BIAYA = 28;
const TINGGI_HEADER_BIAYA = 26;
const TINGGI_BARIS_BIAYA = 36;
const TINGGI_PEMBUNGKUS_BIAYA = 12;

const tinggiBlokBiaya = (jumlahBaris: number) =>
  TINGGI_TAB_BIAYA +
  TINGGI_HEADER_BIAYA +
  Math.max(1, jumlahBaris) * TINGGI_BARIS_BIAYA +
  TINGGI_BORDER_GRID_RINCIAN +
  TINGGI_PEMBUNGKUS_BIAYA;

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

const FormBlHeader = ({
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
  // Shift + scroll = geser horizontal. Grid ini lebih lebar dari modal dan
  // react-remove-scroll bawaan Radix Dialog membatalkan wheel-nya.
  useShiftHorizontalScroll();

  const [notIn, setNotIn] = useState('');
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const [dataGridKey, setDataGridKey] = useState(0);
  // schedule_id sekarang UUID teks ('02-019FEF79-…'), bukan angka lagi.
  const [scheduleValue, setScheduleValue] = useState<string>('');
  const [reloadForm, setReloadForm] = useState<boolean>(false);
  const [editingRowId, setEditingRowId] = useState(0); // Menyimpan ID baris yang sedang diedit
  const [editingRowDetailRincianId, setEditingRowDetailRincianId] = useState(0); // Menyimpan ID baris detail rincian yang sedang diedit
  const [editableValues, setEditableValues] = useState<Map<number, string>>(
    new Map()
  ); // Nilai yang sedang diedit untuk setiap baris
  const [rows, setRows] = useState<
    (BLDetail | (Partial<BLDetail> & { isNew: boolean }))[]
  >([]);

  const [rowsDetailRincian, setRowsDetailRincian] = useState<
    (BlDetailRincian | (Partial<BlDetailRincian> & { isNew: boolean }))[]
  >([]);

  const [rowsRincianBiaya, setRowsRincianBiaya] = useState<
    (BlRincianBiaya | (Partial<BlRincianBiaya> & { isNew: boolean }))[]
  >([]);

  const [rincianByIndex, setRincianByIndex] = useState<Record<number, any[]>>(
    {}
  );
  const [biayaByKey, setBiayaByKey] = useState<Record<string, any[]>>({});
  const [expandedDetailIdx, setExpandedDetailIdx] = useState<Set<number>>(
    new Set()
  );
  const [expandedRincianKey, setExpandedRincianKey] = useState<Set<string>>(
    new Set()
  );

  const biayaKey = (detailIdx: number, rincianIdx: number) =>
    `${detailIdx}-${rincianIdx}`;

  const resetTreeState = () => {
    setRincianByIndex({});
    setBiayaByKey({});
    setExpandedDetailIdx(new Set());
    setExpandedRincianKey(new Set());
  };

  const toggleDetailRow = (detailIdx: number) => {
    setExpandedDetailIdx((prev) => {
      const next = new Set(prev);
      if (next.has(detailIdx)) next.delete(detailIdx);
      else next.add(detailIdx);
      return next;
    });
  };

  const toggleRincianRow = (detailIdx: number, rincianIdx: number) => {
    const key = biayaKey(detailIdx, rincianIdx);
    setExpandedRincianKey((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const dispatch = useDispatch();
  const gridRef = useRef<DataGridHandle>(null);
  const formRef = useRef<HTMLFormElement | null>(null); // Ref untuk form
  const openName = useSelector((state: RootState) => state.lookup.openName);
  const headerData = useSelector((state: RootState) => state.header.headerData);

  const {
    data: allDataDetail,
    isLoading,
    refetch: refetch
  } = useGetBlDetail(headerData?.id ?? 0);

  const fmt = (date: Date) =>
    `${String(date.getDate()).padStart(2, '0')}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${date.getFullYear()}`;

  const lookupPropsSchedule = [
    {
      // Kolom disamakan dengan lookup schedule di Shipping Instruction:
      // tanpa kolom ID (UUID mentah tidak berguna buat user).
      columns: [
        { key: 'kapal_nama', name: 'KAPAL' },
        { key: 'pelayaran_nama', name: 'PELAYARAN' },
        { key: 'voyberangkat', name: 'VOY BERANGKAT' },
        { key: 'tujuankapal_nama', name: 'TUJUAN' }
      ],
      labelLookup: 'SCHEDULE KAPAL LOOKUP',
      required: true,
      selectedRequired: false,
      // endpoint: `schedule-kapal?join=shippinginstructionheader`,
      endpoint: `schedule-kapal?join=shippinginstructionheader&${notIn}`,
      label: 'SCHEDULE KAPAL',
      singleColumn: false,
      pageSize: 20,
      // Hanya bisa dipilih saat ADD. Mengganti schedule pada BL yang sudah
      // tersimpan berarti seluruh detail & rincian (yang diturunkan dari SI
      // milik schedule lama) jadi tidak konsisten dengan headernya.
      disabled: mode !== 'add',
      // Yang TAMPIL di input nama kapal (sama seperti Shipping Instruction),
      // yang DIKIRIM ke form tetap id schedule lewat dataToPost.
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

  const processOnReload = async () => {
    try {
      const tglbukti = forms.getValues('tglbukti');
      // Pengganti onSubmit() yang dulu dipanggil tombol PROSES: prasyaratnya
      // dicek di sini, bukan lewat validasi SIMPAN. Yang dibutuhkan PROSES cuma
      // SCHEDULE + TGL BUKTI — details/rincian/rincian biaya justru baru lahir
      // DARI proses ini, jadi tidak mungkin divalidasi sebelum dijalankan.
      //
      // Schedule dibaca dari state ATAU nilai form (pola FormShippingInstraction):
      // di mode edit `scheduleValue` masih kosong sampai lookup-nya disentuh,
      // sehingga PROSES dulu diam tanpa melakukan apa pun.
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
        setReloadForm(false);
        setRows([]);
        setRowsDetailRincian([]);
        return;
      }

      dispatch(setProcessing());

      // Simpan dulu isian user sebelum data ditarik ulang. PROSES membangun
      // ulang seluruh baris dari SI, jadi tanpa ini NOMOR BL dan KETERANGAN
      // yang sudah diketik (atau yang ikut terbaca saat EDIT) akan hilang tiap
      // kali tombol PROSES ditekan. Pola & penguncinya sama dengan
      // FormShippingInstraction: detail dikunci per nomor shipping, rincian
      // per pasangan nomor shipping + job.
      const detailSebelumnya = new Map<string, any>();
      const rincianSebelumnya = new Map<string, any>();
      const biayaSebelumnya = new Map<string, any>();

      rows.forEach((row: any, idx: number) => {
        if (row?.isAddRow) return;
        const key = String(row.shippinginstructiondetail_nobukti ?? '');
        if (key !== '') {
          detailSebelumnya.set(key, {
            id: row.id,
            bl_nobukti: row.bl_nobukti ?? '',
            keterangan: row.keterangan ?? ''
          });
        }

        (rincianByIndex[idx] ?? []).forEach((r: any, rIdx: number) => {
          const rKey = `${key}|${String(r.orderanmuatan_nobukti ?? '')}`;
          rincianSebelumnya.set(rKey, {
            id: r.id,
            keterangan: r.keterangan ?? ''
          });

          // Id baris biaya WAJIB ikut disimpan. Tanpa ini PROSES membangun
          // ulang baris biaya dengan id '0', backend menganggapnya baris baru,
          // lalu menyisipkan 5 baris lagi sementara yang lama tetap tinggal —
          // 3x edit jadi 15 baris. Kuncinya per jenis biaya (biayaemkl_id)
          // dalam satu job, karena itu yang menentukan identitas barisnya.
          (biayaByKey[biayaKey(idx, rIdx)] ?? []).forEach((b: any) => {
            biayaSebelumnya.set(`${rKey}|${String(b.biayaemkl_id ?? '')}`, {
              id: b.id
            });
          });
        });
      });

      // JANGAN Number(): id schedule berupa UUID teks, Number() menghasilkan
      // NaN sehingga request jadi /blheader/processbl/NaN dan backend
      // mencocokkan schedule_id = 'NaN' → detail selalu kosong.
      const processBl = await prosesBlFn(scheduleId);
      const hasilProses = processBl?.data ?? [];

      // Guard seperti di FormShippingInstraction: tanpa ini `data[0]` pada SI
      // yang belum punya detail melempar TypeError yang cuma mendarat di
      // console.log — user melihat PROSES "tidak terjadi apa-apa".
      if (hasilProses.length === 0) {
        alert({
          title: 'TIDAK ADA DETAIL SHIPPING INSTRUCTION UNTUK SCHEDULE INI.',
          variant: 'danger',
          submitText: 'OK'
        });
        setReloadForm(false);
        setRows([]);
        setRowsDetailRincian([]);
        resetTreeState();
        dispatch(setProcessed());
        return;
      }

      forms.setValue(
        'shippinginstruction_nobukti',
        hasilProses[0].shippinginstruction_nobukti
      );
      setReloadForm(true);

      // Grid tree membaca rincian & rincian biaya dari state `rincianByIndex`
      // dan `biayaByKey`, BUKAN dari nilai form. Dulu PROSES cuma mengisi form
      // (forms.setValue) sehingga barisnya tersimpan saat submit tapi tidak
      // pernah tampil — grid selalu "NO ROWS DATA FOUND". Pola pengisian kedua
      // state ini disamakan dengan fetchRincianForDetails() di mode edit.
      const rincianMap: Record<number, any[]> = {};
      const biayaMap: Record<string, any[]> = {};

      for (const [index, data] of hasilProses.entries()) {
        const fetchShippingRincian =
          await getShippingInstructionDetailRincianFn(
            data.shippinginstructiondetail_id,
            {
              filters: {
                limit: 0,
                filters: {}
              }
            }
          );

        const rowsData = fetchShippingRincian?.data ?? [];
        const kunciDetail = String(
          data.shippinginstructiondetail_nobukti ?? ''
        );
        const formattedRows = rowsData.map((item: any) => {
          const rLama = rincianSebelumnya.get(
            `${kunciDetail}|${String(item.orderanmuatan_nobukti ?? '')}`
          );

          return {
            // Semua id bertipe TEKS sejak migrasi UUID. Baris baru dikirim
            // '0' (string), BUKAN angka 0 — angka ditolak schema `z.string()`
            // di frontend maupun DTO backend.
            id: rLama?.id ?? '0',
            orderanmuatan_nobukti: item.orderanmuatan_nobukti ?? '',
            nocontainer: item.nocontainer ?? '',
            noseal: item.noseal ?? '',
            // Keterangan rincian milik user — dipertahankan, bukan dikosongkan.
            keterangan: rLama?.keterangan ?? '',
            isNew: !rLama
          };
        });

        forms.setValue(`details.${index}.detailsrincian`, formattedRows);
        rincianMap[index] = formattedRows;

        if (rowsData.length > 0) {
          for (const [
            indexRincianBiaya,
            dataRincianBiaya
          ] of rowsData?.entries()) {
            const fetchProcessRincianBiaya = await prosesBlRincianBiayaFn();
            const result = fetchProcessRincianBiaya.data ?? [];

            const kunciRincian = `${kunciDetail}|${String(
              dataRincianBiaya.orderanmuatan_nobukti ?? ''
            )}`;

            const formattedRowsRincianBiaya = result.map((item: any) => ({
              // Pakai id lama kalau baris biaya ini memang sudah ada di DB,
              // supaya backend meng-UPDATE-nya, bukan menyisipkan baris baru.
              id:
                biayaSebelumnya.get(`${kunciRincian}|${String(item.id ?? '')}`)
                  ?.id ?? '0',
              orderanmuatan_nobukti:
                dataRincianBiaya.orderanmuatan_nobukti ?? '',
              // NOMINAL datang dari backend (hitungNominalRincianBiaya di
              // bl-header.service.ts), bukan diketik user — kolomnya read-only.
              // Fallback '0' menjaga schema tetap terpenuhi kalau backend belum
              // mengirim nominal; '' akan selalu ditolak zod DAN bukan nilai
              // sah untuk kolom numeric di DB.
              nominal: String(item.nominal ?? 0),
              biayaemkl_id: item.id ?? '',
              biayaemkl_nama: item.nama ?? '',
              isNew: false
            }));
            forms.setValue(
              `details.${index}.detailsrincian.${indexRincianBiaya}.rincianbiaya`,
              formattedRowsRincianBiaya
            );
            biayaMap[`${index}-${indexRincianBiaya}`] =
              formattedRowsRincianBiaya;
          }
        }
      }

      setRincianByIndex(rincianMap);
      setBiayaByKey(biayaMap);

      const rowsBaru = hasilProses.map((item: any, idx: number) => {
        const lama = detailSebelumnya.get(
          String(item.shippinginstructiondetail_nobukti ?? '')
        );

        return {
          // id lama dipertahankan supaya saat EDIT baris ini tetap dikenali
          // sebagai baris yang sudah ada, bukan baris baru. Baris baru memakai
          // '0' (string) — id bertipe teks sejak migrasi UUID, dan angka 0
          // ditolak `z.string()` di schema frontend maupun DTO backend.
          id: lama?.id ?? '0',
          // NOMOR BL & KETERANGAN adalah isian user — jangan direset oleh PROSES.
          bl_nobukti: lama?.bl_nobukti ?? '',
          keterangan: lama?.keterangan ?? item.keterangan ?? '',
          shippinginstructiondetail_nobukti:
            item.shippinginstructiondetail_nobukti ?? '',
          asalpelabuhan: item.asalpelabuhan ?? '',
          consignee: item.consignee ?? '',
          shipper: item.shipper ?? '',
          comodity: item.comodity ?? '',
          notifyparty: item.notifyparty ?? '',
          emkllain_nama: item.emkllain_nama ?? '',
          pelayaran_nama: item.pelayaran_nama ?? '',
          isNew: !lama
        };
      });
      setRows(rowsBaru);

      // Sama seperti mode edit: baris pertama dibuka supaya rincian hasil
      // proses langsung kelihatan tanpa harus diklik dulu.
      if (rowsBaru.length > 0) {
        setExpandedDetailIdx(new Set([0]));
      }

      dispatch(setProcessed());
    } catch (error) {
      console.log(error);
      setReloadForm(false);
      dispatch(setProcessed());
    } finally {
      dispatch(setProcessed());
    }
  };

  const totalNominal = rowsRincianBiaya.reduce(
    (acc, row) => acc + (row.nominal ? parseCurrency(row.nominal) : 0),
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

      // GABUNG dengan nilai form, jangan ditimpa mentah-mentah.
      // `rincianByIndex` TIDAK memuat `rincianbiaya`: react-hook-form menyalin
      // (clone) objek yang dikirim ke setValue, jadi saat processOnReload
      // menempelkan rincianbiaya lewat
      // setValue('details.N.detailsrincian.M.rincianbiaya', ...) yang termutasi
      // hanya salinan milik form — objek di state ini tidak ikut.
      // Menimpanya mentah-mentah membuang rincianbiaya dari form dan submit
      // gagal dengan "details.0.detailsrincian.0.rincianbiaya: Required",
      // padahal barisnya masih terlihat di layar (grid membaca biayaByKey).
      // Pola gabungnya sama dengan effect rows -> details di bawah.
      const dariForm =
        (forms.getValues(`details.${detailIdx}.detailsrincian`) as any[]) ?? [];
      const gabungan = current.map((baris, idx) => ({
        ...(dariForm[idx] ?? {}),
        ...baris
      }));

      forms.setValue(`details.${detailIdx}.detailsrincian`, gabungan);

      return { ...prev, [detailIdx]: current };
    });
  };

  const handleBiayaChange = (
    detailIdx: number,
    rincianIdx: number,
    biayaIdx: number,
    field: string,
    value: string | number
  ) => {
    const key = biayaKey(detailIdx, rincianIdx);

    setBiayaByKey((prev) => {
      const current = [...(prev[key] ?? [])];
      const target = { ...current[biayaIdx], [field]: value };

      if (target.isNew && Object.values(target).every((val) => val !== '')) {
        target.isNew = false;
      }
      current[biayaIdx] = target;

      forms.setValue(
        `details.${detailIdx}.detailsrincian.${rincianIdx}.rincianbiaya`,
        current
      );

      return { ...prev, [key]: current };
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
        const rincianFlat: any[] = [];
        let rincianNo = 0;

        (rincianByIndex[detailIdx] ?? []).forEach(
          (r: any, rincianIdx: number) => {
            rincianNo += 1;
            rincianFlat.push({
              ...r,
              isTreeType: 'rincian',
              detailIdx,
              rincianIdx,
              nomor: rincianNo
            });

            if (expandedRincianKey.has(biayaKey(detailIdx, rincianIdx))) {
              rincianFlat.push({
                isTreeType: 'biayaBlock',
                detailIdx,
                rincianIdx,
                biayaRows: (
                  biayaByKey[biayaKey(detailIdx, rincianIdx)] ?? []
                ).map((b: any, biayaIdx: number) => ({
                  ...b,
                  detailIdx,
                  rincianIdx,
                  biayaIdx,
                  nomor: biayaIdx + 1
                }))
              });
            }
          }
        );

        flattened.push({
          isTreeType: 'rincianBlock',
          detailIdx,
          rincianRows: rincianFlat
        });
      }
    });

    return flattened;
  }, [rows, rincianByIndex, biayaByKey, expandedDetailIdx, expandedRincianKey]);

  const detailCount = useMemo(
    () => rows.filter((r: any) => !r?.isAddRow).length,
    [rows]
  );

  const tinggiBarisRincian = (row: any) =>
    row.isTreeType === 'biayaBlock'
      ? tinggiBlokBiaya((row.biayaRows ?? []).length)
      : TINGGI_BARIS_RINCIAN;

  const tinggiBlokRincian = (row: any) => {
    const rincianRows: any[] = row.rincianRows ?? [];

    const tinggiIsi = rincianRows.length
      ? rincianRows.reduce(
          (total: number, r: any) => total + tinggiBarisRincian(r),
          0
        )
      : TINGGI_BARIS_RINCIAN;

    return (
      TINGGI_TAB_RINCIAN +
      TINGGI_HEADER_RINCIAN +
      tinggiIsi +
      TINGGI_BORDER_GRID_RINCIAN +
      TINGGI_PEMBUNGKUS_RINCIAN
    );
  };

  const detailErrors = forms.formState.errors?.details as any[] | undefined;

  const biayaColumns = useMemo((): Column<any>[] => {
    const isReadOnly = mode === 'delete' || mode === 'view';

    const biayaError = (row: any, field: string) =>
      (
        (detailErrors?.[row.detailIdx] as any)?.detailsrincian?.[row.rincianIdx]
          ?.rincianbiaya?.[row.biayaIdx] as any
      )?.[field]?.message as string | undefined;

    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 50,
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        renderHeaderCell: () => headerCell('No.'),
        renderCell: (props: any) => (
          <div className="flex h-full w-full items-center justify-center text-xs">
            {props.row.nomor}
          </div>
        )
      },
      {
        key: 'biayaemkl_nama',
        name: 'biaya emkl',
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        resizable: true,
        draggable: true,
        width: '1fr',
        minWidth: 200,
        renderHeaderCell: () => headerCell('biaya emkl'),
        renderCell: (props: any) => {
          const value = String(props.row.biayaemkl_nama ?? '');
          return cellWithError(
            value,
            biayaError(props.row, 'biayaemkl_id'),
            <p className="truncate px-1 text-xs">{value}</p>
          );
        }
      },
      {
        key: 'nominal',
        name: 'nominal',
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        resizable: true,
        draggable: true,
        width: '1fr',
        minWidth: 160,
        renderHeaderCell: () => headerCell('nominal'),
        renderCell: (props: any) => {
          const value = String(props.row.nominal ?? '');
          return cellWithError(
            value,
            biayaError(props.row, 'nominal'),
            // Read-only: nominal diturunkan backend lewat
            // hitungNominalRincianBiaya(), bukan input manual. onValueChange
            // sengaja tidak dipasang supaya tidak ada jalur ubah dari UI.
            <InputCurrency value={value} readOnly disabled={isReadOnly} />
          );
        }
      }
    ];
  }, [mode, detailErrors]);

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

    const biayaBlock = (row: any) => {
      const biayaRows: any[] = row.biayaRows ?? [];
      const jumlahBaris = Math.max(1, biayaRows.length);

      return (
        <div className="w-full bg-background py-1 pl-8 pr-2 text-foreground">
          <div className="overflow-hidden rounded-sm border border-border">
            <div className="flex w-full flex-row justify-start border-b border-border bg-background-grid-header px-1 pt-1">
              <div className="rounded-t-sm border border-b-0 border-border bg-background px-3 py-[2px] text-[10px] font-bold uppercase text-primary">
                Rincian Biaya
              </div>
            </div>

            <div
              className="overflow-hidden bg-background text-foreground"
              style={{
                height: TINGGI_HEADER_BIAYA + jumlahBaris * TINGGI_BARIS_BIAYA
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <DataGrid
                columns={biayaColumns as any[]}
                defaultColumnOptions={{ sortable: false, resizable: true }}
                rows={biayaRows}
                rowKeyGetter={(b: any) =>
                  `${b.detailIdx}-${b.rincianIdx}-${b.biayaIdx}`
                }
                rowHeight={TINGGI_BARIS_BIAYA}
                headerRowHeight={TINGGI_HEADER_BIAYA}
                renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
                className={`${
                  isDark ? 'rdg-dark' : 'rdg-light'
                } fill-grid text-xs`}
                enableVirtualization={false}
              />
            </div>
          </div>
        </div>
      );
    };

    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 50,
        headerCellClass: 'column-headers',
        cellClass: (row: any) =>
          row?.isTreeType === 'biayaBlock'
            ? 'rincian-block-cell'
            : 'form-input',
        colSpan: (args: any) =>
          args.type === 'ROW' && args.row?.isTreeType === 'biayaBlock'
            ? JUMLAH_KOLOM_TREE_RINCIAN
            : undefined,
        renderHeaderCell: () => headerCell('No.'),
        renderCell: (props: any) => {
          if (props.row.isTreeType === 'biayaBlock') {
            return biayaBlock(props.row);
          }
          return (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold">
              {props.row.nomor}
            </div>
          );
        }
      },
      {
        key: 'orderanmuatan_nobukti',
        name: 'job',
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        resizable: true,
        draggable: true,
        width: '1fr',
        minWidth: 200,
        renderHeaderCell: () => headerCell('job'),
        renderCell: (props: any) => {
          const isExpanded = expandedRincianKey.has(
            biayaKey(props.row.detailIdx, props.row.rincianIdx)
          );
          const value = String(props.row.orderanmuatan_nobukti ?? '');

          return (
            <div className="flex h-full w-full items-center gap-2">
              <button
                type="button"
                aria-label={
                  isExpanded ? 'Tutup rincian biaya' : 'Buka rincian biaya'
                }
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRincianRow(props.row.detailIdx, props.row.rincianIdx);
                }}
                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 transition-colors hover:bg-blue-200"
              >
                {isExpanded ? (
                  <FaChevronDown size={9} />
                ) : (
                  <FaChevronRight size={9} />
                )}
              </button>
              <p className="truncate px-1 text-xs" title={value}>
                {value}
              </p>
            </div>
          );
        }
      },
      {
        key: 'nocontainer',
        name: 'no container',
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        resizable: true,
        draggable: true,
        width: '1fr',
        minWidth: 180,
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
        minWidth: 160,
        renderHeaderCell: () => headerCell('no seal'),
        renderCell: (props: any) => rincianText(props.row, 'noseal')
      },
      {
        key: 'keterangan',
        name: 'keterangan',
        headerCellClass: 'column-headers',
        cellClass: 'form-input',
        resizable: true,
        draggable: true,
        width: '1fr',
        minWidth: 200,
        renderHeaderCell: () => headerCell('keterangan'),
        renderCell: (props: any) => rincianInput(props.row, 'keterangan')
      }
    ];
  }, [mode, detailErrors, biayaColumns, expandedRincianKey, isDark]);
  const columns = useMemo((): Column<BLDetail>[] => {
    const rincianBlock = (row: any) => {
      const rincianRows: any[] = row.rincianRows ?? [];

      const tinggiIsi = rincianRows.length
        ? rincianRows.reduce(
            (total: number, r: any) => total + tinggiBarisRincian(r),
            0
          )
        : TINGGI_BARIS_RINCIAN;

      return (
        <div className="w-full bg-background py-1 pl-10 pr-3 text-foreground">
          <div className="overflow-hidden rounded-sm border border-border">
            <div className="flex w-full flex-row justify-start border-b border-border bg-background-grid-header px-1 pt-1">
              <div className="rounded-t-sm border border-b-0 border-border bg-background px-4 py-1 text-xs font-bold uppercase text-primary">
                Rincian
              </div>
            </div>

            <div
              className="overflow-hidden bg-background text-foreground"
              style={{ height: TINGGI_HEADER_RINCIAN + tinggiIsi }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <DataGrid
                columns={rincianColumns as any[]}
                defaultColumnOptions={{ sortable: false, resizable: true }}
                rows={rincianRows}
                rowKeyGetter={(r: any) =>
                  r.isTreeType === 'biayaBlock'
                    ? `BB-${r.detailIdx}-${r.rincianIdx}`
                    : `R-${r.detailIdx}-${r.rincianIdx}`
                }
                rowHeight={tinggiBarisRincian}
                headerRowHeight={TINGGI_HEADER_RINCIAN}
                renderers={{ noRowsFallback: <EmptyRowsRenderer /> }}
                className={`${
                  isDark ? 'rdg-dark' : 'rdg-light'
                } fill-grid text-xs`}
                enableVirtualization={false}
              />
            </div>
          </div>
        </div>
      );
    };

    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 50,
        cellClass: (row: any) =>
          row?.isTreeType === 'rincianBlock'
            ? 'rincian-block-cell'
            : 'form-input',
        colSpan: (args: any) =>
          args.type === 'ROW' && args.row?.isTreeType === 'rincianBlock'
            ? JUMLAH_KOLOM_TREE
            : undefined,
        headerCellClass: 'column-headers',
        renderHeaderCell: (column: any) => (
          <div className="justify-cente flex h-full flex-col items-center gap-1">
            <p className="text-sm">No.</p>
          </div>
        ),
        renderCell: (props: any) => {
          if (props.row.isTreeType === 'rincianBlock') {
            return rincianBlock(props.row);
          }
          return (
            <div className="flex h-full w-full cursor-pointer items-center justify-center text-sm">
              {props.row.nomor}
            </div>
          );
        }
      },
      {
        key: 'bl_nobukti',
        name: 'bl_nobukti',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>NOMOR BL</p>
          </div>
        ),
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
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 transition-colors hover:bg-blue-200"
              >
                {isExpanded ? (
                  <FaChevronDown size={11} />
                ) : (
                  <FaChevronRight size={11} />
                )}
              </button>
              {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  type="text"
                  onFocus={() => {
                    setEditingRowId(props.row.detailIdx);
                    setEditingRowDetailRincianId(0);
                  }}
                  value={props.row.bl_nobukti}
                  readOnly={mode == 'delete' || mode == 'view'}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    handleInputChange(
                      props.row.detailIdx,
                      'bl_nobukti',
                      e.target.value
                    );
                  }}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'shippinginstructiondetail_nobukti',
        name: 'shippinginstructiondetail_nobukti',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 350,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>nomor shipping</p>
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
                  value={props.row.shippinginstructiondetail_nobukti || ''}
                  readOnly={true}
                  onFocus={() => {
                    setEditingRowId(props.row.detailIdx);
                    setEditingRowDetailRincianId(0);
                  }}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'asalpelabuhan',
        name: 'asalpelabuhan',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>PELABUHAN ASAL</p>
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
                  value={props.row.asalpelabuhan || ''}
                  readOnly={true}
                  onFocus={() => {
                    setEditingRowId(props.row.detailIdx);
                    setEditingRowDetailRincianId(0);
                  }}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
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
                  onFocus={() => {
                    setEditingRowId(props.row.detailIdx);
                    setEditingRowDetailRincianId(0);
                  }}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    handleInputChange(
                      props.row.detailIdx,
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
        key: 'consignee',
        name: 'consignee',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>consignee</p>
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
                  value={props.row.consignee || ''}
                  readOnly={true}
                  onFocus={() => {
                    setEditingRowId(props.row.detailIdx);
                    setEditingRowDetailRincianId(0);
                  }}
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
            <div>
              {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  type="text"
                  value={props.row.shipper}
                  readOnly={true}
                  onFocus={() => {
                    setEditingRowId(props.row.detailIdx);
                    setEditingRowDetailRincianId(0);
                  }}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'comodity',
        name: 'comodity',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>comodity</p>
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
                  value={props.row.comodity}
                  readOnly={true}
                  onFocus={() => {
                    setEditingRowId(props.row.detailIdx);
                    setEditingRowDetailRincianId(0);
                  }}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'notifyparty',
        name: 'notifyparty',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>notify party</p>
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
                  value={props.row.notifyparty}
                  readOnly={true}
                  onFocus={() => {
                    setEditingRowId(props.row.detailIdx);
                    setEditingRowDetailRincianId(0);
                  }}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'emkllain_nama',
        name: 'emkllain_nama',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>NAMA EMKL</p>
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
                  value={props.row.emkllain_nama}
                  readOnly={true}
                  onFocus={() => {
                    setEditingRowId(props.row.detailIdx);
                    setEditingRowDetailRincianId(0);
                  }}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'pelayaran_nama',
        name: 'pelayaran_nama',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>NAMA PELAYARAN</p>
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
                  value={props.row.pelayaran_nama}
                  readOnly={true}
                  onFocus={() => {
                    setEditingRowId(props.row.detailIdx);
                    setEditingRowDetailRincianId(0);
                  }}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      }
    ];
  }, [
    rows,
    editingRowId,
    editableValues,
    mode,
    rincianColumns,
    expandedDetailIdx,
    expandedRincianKey,
    biayaByKey,
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
    const allDetails = forms.getValues('details');
    let activeDetail = allDetails?.[editingRowId];

    if (activeDetail?.detailsrincian) {
      setRowsDetailRincian(activeDetail.detailsrincian);
    }
  }, [editingRowId, reloadForm, rows]);

  useEffect(() => {
    const allDetails = forms.getValues('details');
    const activeDetail = allDetails?.[editingRowId];
    const activeRincian =
      activeDetail?.detailsrincian?.[editingRowDetailRincianId];

    if (activeRincian?.rincianbiaya) {
      setRowsRincianBiaya(activeRincian.rincianbiaya);
    } else {
      setRowsRincianBiaya([]);
    }
  }, [editingRowId, editingRowDetailRincianId, reloadForm, rows]);

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
        // id di modul ini UUID teks. Dulu dibungkus Number() -> NaN, sehingga
        // rowKeyGetter memulangkan NaN untuk SEMUA baris ("two children with the
        // same key, NaN") dan id NaN itu ikut terkirim sebagai parameter induk
        // saat mengambil rincian. Diteruskan apa adanya, sama seperti
        // FormShippingInstraction.
        const formattedDetails = allDataDetail.data.map((item: any) => ({
          id: item.id ?? '',
          nobukti: item.nobukti ?? '',
          bl_nobukti: item.bl_nobukti ?? '',
          bl_id: item.bl_id ?? '',
          keterangan: item.keterangan ?? '',
          shippinginstructiondetail_nobukti:
            item.shippinginstructiondetail_nobukti ?? '',
          asalpelabuhan: item.asalpelabuhan ?? '',
          consignee: item.consignee ?? '',
          shipper: item.shipper ?? '',
          comodity: item.comodity ?? '',
          notifyparty: item.notifyparty ?? '',
          emkllain_nama: item.emkllain_nama ?? '',
          pelayaran_nama: item.pelayaran_nama ?? '',
          isNew: false
        }));

        // Set detail utama dulu ke state/form
        setRows(formattedDetails);

        resetTreeState();
        const rincianMap: Record<number, any[]> = {};
        const biayaMap: Record<string, any[]> = {};

        // Lalu refetch rincian untuk setiap detail
        for (const [index, detail] of allDataDetail.data.entries()) {
          try {
            setEditingRowId(0);
            // Tunggu refetch selesai
            const rincian = await getBlDetailRincianFn(String(detail.id), {
              search: ''
            });
            const rowsData = rincian?.data ?? [];
            const formattedRincian = rowsData.map((r: any) => ({
              // Set data rincian
              id: r.id ?? '',
              nobukti: r.nobukti ?? '',
              bldetail_id: r.bldetail_id ?? '',
              bldetail_nobukti: r.bldetail_nobukti ?? '',
              orderanmuatan_nobukti: r.orderanmuatan_nobukti ?? '',
              keterangan: r.keterangan ?? '',
              nocontainer: r.nocontainer ?? '',
              noseal: r.noseal ?? '',
              isNew: false
            }));

            // Set ke form sesuai index detail
            forms.setValue(`details.${index}.detailsrincian`, formattedRincian);
            rincianMap[index] = formattedRincian;

            if (rowsData.length > 0) {
              for (const [indexRincian, rincian] of rowsData?.entries()) {
                const fetchRincianBiaya = await getBlRincianBiayaFn(
                  String(detail.id),
                  {
                    filters: {
                      orderanmuatan_nobukti: rincian.orderanmuatan_nobukti
                    }
                  }
                );
                const result = fetchRincianBiaya.data ?? [];

                const formattedRowsRincianBiaya = result.map((item: any) => ({
                  id: item.id ?? '',
                  nobukti: item.nobukti,
                  bldetail_id: item.bldetail_id ?? '',
                  bldetail_nobukti: item.bldetail_nobukti,
                  orderanmuatan_nobukti: item.orderanmuatan_nobukti ?? '',
                  nominal: String(item.nominal),
                  // biayaemkl_id juga UUID teks. `Number(x) ?? ''` lama tidak
                  // pernah jadi '' — NaN bukan null/undefined, jadi ?? tidak
                  // pernah aktif dan nilainya selalu NaN.
                  biayaemkl_id: item.biayaemkl_id ?? '',
                  biayaemkl_nama: item.biayaemkl_nama ?? '',
                  isNew: false
                }));
                forms.setValue(
                  `details.${index}.detailsrincian.${indexRincian}.rincianbiaya`,
                  formattedRowsRincianBiaya
                );
                biayaMap[`${index}-${indexRincian}`] =
                  formattedRowsRincianBiaya;
              }
            }
          } catch (err) {
            console.error(`Gagal ambil rincian untuk detail ${detail.id}`, err);
          }
        }

        setRincianByIndex(rincianMap);
        setBiayaByKey(biayaMap);

        if (formattedDetails.length > 0) {
          setExpandedDetailIdx(new Set([0]));
        }

        const allDetails = forms.getValues('details');
        let activeDetail = allDetails?.[0];
        const activeRincian = activeDetail?.detailsrincian?.[0];

        if (activeDetail?.detailsrincian) {
          setRowsDetailRincian(activeDetail.detailsrincian);
        }

        if (activeRincian?.rincianbiaya) {
          setRowsRincianBiaya(activeRincian.rincianbiaya);
        }
      }
    };

    fetchRincianForDetails();
  }, [allDataDetail, headerData?.id, popOver, mode]);

  useEffect(() => {
    const fetchAllShippingHeader = async () => {
      try {
        const allHeader = await getAllBlHeaderHeaderFn({
          filters: {
            limit: 0,
            filters: {}
          }
        });

        const rowsData = allHeader?.data ?? [];
        // WAJIB unik. `notIn` ikut masuk ke URL lookup schedule; kalau tiap
        // baris BL dikirim apa adanya, 1000+ baris jadi URL ~42 KB dan ditolak
        // proxy (431/502) sehingga lookup selalu "NO RESULTS FOUND". Yang
        // dibutuhkan backend cuma daftar schedule_id unik (puluhan, bukan
        // ribuan). Sekalian buang null — `String(null)` menghasilkan 'null'
        // yang lolos filter lama dan ikut terkirim.
        const id = [
          ...new Set(
            rowsData
              .map((row) => row?.schedule_id)
              .filter((value) => value != null && String(value).trim() !== '')
          )
        ];

        const jsonString = JSON.stringify({ id });
        setNotIn(`notIn=${jsonString}`);
      } catch (err) {
        console.error(
          `Gagal fetch all data bl header for get all schedule_id`,
          err
        );
      }
    };

    setEditingRowId(0);
    setEditingRowDetailRincianId(0);
    fetchAllShippingHeader();

    if (mode === 'add') {
      setRows([]);
      setScheduleValue('');
      setRowsDetailRincian([]);
      setReloadForm(false);
      forms.setValue('tglbukti', fmt(todayDate));
    } else {
      setReloadForm(true);
    }
  }, [popOver, mode]);

  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Add BL'
              : mode === 'edit'
              ? 'Edit BL'
              : mode === 'delete'
              ? 'Delete BL'
              : 'View BL'}
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
                              disabled={true}
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
                                setReloadForm(false);
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
                                setReloadForm(false);
                                setScheduleValue('');
                                forms.setValue('tglberangkat', '');
                                forms.setValue('voyberangkat', '');
                                forms.setValue('kapal_id', 0);
                                forms.setValue('kapal_nama', '');
                                forms.setValue('tujuankapal_id', 0);
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
                    // type="button", dan HANYA processOnReload() — sama seperti
                    // tombol PROSES di Shipping Instruction.
                    //
                    // Sebelumnya tombol ini juga memanggil onSubmit(), yaitu
                    // forms.handleSubmit milik grid: PROSES ikut menjalankan
                    // validasi zod untuk SIMPAN. Ditambah setRows([]) yang
                    // langsung mengosongkan `details` lewat effect sinkron
                    // rows→form, validasi itu selalu gagal dengan
                    // "SHIPPINGINSTRUCTION NOBUKTI WAJIB DIISI" dan "DETAILS:
                    // array must contain at least 1 element". Dulu gagalnya
                    // diam-diam (tidak ada handler onInvalid), jadi tidak
                    // kelihatan — padahal setiap klik PROSES menyisakan form
                    // dalam keadaan error.
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
                            Detail BL, Rincian & Rincian Biaya
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => {
                              if (expandedDetailIdx.size > 0) {
                                setExpandedDetailIdx(new Set());
                                setExpandedRincianKey(new Set());
                              } else {
                                setExpandedDetailIdx(
                                  new Set(
                                    Array.from(
                                      { length: detailCount },
                                      (_, i) => i
                                    )
                                  )
                                );
                              }
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
                              ? tinggiBlokRincian(row)
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
            if (!reloadForm) {
              alert({
                title: 'HARAP LAKUKAN PROSES BL TERLEBIH DAHULU',
                variant: 'danger',
                submitText: 'OK'
              });
            } else {
              onSubmit(false);
              dispatch(setSubmitClicked(true));
            }
          }}
          onSaveAndAdd={() => {
            if (!reloadForm) {
              alert({
                title: 'HARAP LAKUKAN PROSES BL TERLEBIH DAHULU',
                variant: 'danger',
                submitText: 'OK'
              });
              return;
            }
            onSubmit(true);
            dispatch(setSubmitClicked(true));
            setReloadForm(false);
            setRows([]);
            setRowsDetailRincian([]);
            setRowsRincianBiaya([]);
            setScheduleValue('');
            setEditingRowId(0);
            setEditingRowDetailRincianId(0);
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

export default FormBlHeader;
