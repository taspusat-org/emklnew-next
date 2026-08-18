import { useTheme } from 'next-themes';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import LookUp from '@/components/custom-ui/LookUp';
import { IoMdClose, IoMdRefresh } from 'react-icons/io';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { EmptyRowsRenderer } from '@/components/EmptyRows';
import { useEffect, useMemo, useRef, useState } from 'react';
import InputNumeric from '@/components/custom-ui/InputNumeric';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import DataGrid, { Column, DataGridHandle } from 'react-data-grid';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import { useLainnyaDialog } from '@/lib/store/client/useDialogLainnya';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { setSubmitClicked } from '@/lib/store/lookupSlice/lookupSlice';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { JENISORDERMUATANNAMA } from '@/constants/bookingorderan';
import { useShiftHorizontalScroll } from '@/hooks/use-shift-horizontal-scroll';

const FormJobParty = ({
  forms,
  handleClose,
  setPopOver,
  reloadForm,
  setReloadForm,
  // popOver,
  onSubmit,
  isLoadingCreate // mode,
  // isLoadingUpdate,
} // isLoadingDelete
: any) => {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const dispatch = useDispatch();
  const gridRef = useRef<DataGridHandle>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  // Shift + scroll = geser horizontal. Grid ini lebih lebar dari modal dan
  // react-remove-scroll bawaan Radix Dialog membatalkan wheel-nya.
  useShiftHorizontalScroll();

  const [partyCount, setPartyCount] = useState(0);
  const [dataGridKey, setDataGridKey] = useState(0);
  // const [reloadForm, setReloadForm] = useState<boolean>(false);
  const { mode: modeText, openForm } = useLainnyaDialog();
  const [editingRowId, setEditingRowId] = useState<number | null>(null); // Menyimpan ID baris yang sedang diedit
  const openName = useSelector((state: RootState) => state.lookup.openName);
  const [editableValues, setEditableValues] = useState<Map<number, string>>(
    new Map()
  ); // Nilai yang sedang diedit untuk setiap baris
  const [rows, setRows] = useState<any[]>([]);
  const { selectedJenisOrderan, selectedJenisOrderanNama } = useSelector(
    (state: RootState) => state.filter
  );

  const lookupMarketingJobParty = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'MARKETING LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'marketing',
      label: 'MARKETING_PARTY',
      singleColumn: true,
      pageSize: 20,
      // disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupContainerJobParty = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'CONTAINER LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'container',
      label: 'CONTAINER_PARTY',
      singleColumn: true,
      pageSize: 20,
      // disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupTujuanJobParty = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'TUJUAN KAPAL LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'tujuankapal',
      label: 'TUJUANKAPAL_PARTY',
      singleColumn: true,
      pageSize: 20,
      // disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupShipperJobParty = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'SHIPPER LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'shipper',
      label: 'SHIPPER_PARTY',
      singleColumn: true,
      pageSize: 20,
      // disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupScheduleJobParty = [
    {
      columns: [
        { key: 'kapal_nama', name: 'KAPAL' },
        { key: 'pelayaran_nama', name: 'PELAYARAN' },
        { key: 'voyberangkat', name: 'VOY BERANGKAT' }
      ],
      labelLookup: 'SCHEDULE KAPAL LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'schedule-kapal',
      singleColumn: false,
      pageSize: 20,
      // disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'id',
      dataToPost: 'id'
    }
  ];

  const lookupDaftarBlJobParty = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'DAFTAR BL LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'daftarbl',
      singleColumn: true,
      pageSize: 20,
      // disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupHargaTruckingJobParty = [
    {
      columns: [{ key: 'keterangan', name: 'NAMA' }],
      labelLookup: 'HARGA TRUCKING LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'hargatrucking',
      singleColumn: true,
      pageSize: 20,
      // disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'keterangan',
      dataToPost: 'id'
    }
  ];

  const inputStopPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
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

  const columns = useMemo((): Column<any>[] => {
    return [
      {
        key: 'nomor',
        name: 'NO',
        width: 50,
        cellClass: 'form-input',
        colSpan: (args) => {
          if (args.type === 'ROW' && args.row.isAddRow) {
            // If it's the "Add Row" row, span across multiple columns
            return 15; // Spanning the "Add Row" button across 3 columns (adjust as needed)
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
        key: 'nocontainer',
        name: 'nocontainer',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>NO CONTAINER</p>
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
                  value={props.row.nocontainer}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    handleInputChange(
                      props.rowIdx,
                      'nocontainer',
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
        key: 'noseal',
        name: 'noseal',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>NO SEAL</p>
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
        key: 'schedule_id',
        name: 'schedule_id',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 400,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>SCHEDULE ID</p>
          </div>
        ),
        renderCell: (props: any) => (
          <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
            {props.row.isAddRow
              ? ''
              : lookupScheduleJobParty.map((propsScheduleLookup, index) => (
                  <LookUp
                    key={index}
                    {...propsScheduleLookup}
                    label={`SCHEDULE_PARTY_${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                    lookupValue={(id) => {
                      handleInputChange(props.rowIdx, 'schedule_id', id);
                    }}
                    onSelectRow={(val) => {
                      handleInputChange(
                        props.rowIdx,
                        'schedule_nama',
                        String(val?.id)
                      );
                      handleInputChange(
                        props.rowIdx,
                        'kapal',
                        Number(val?.kapal_id)
                      );
                      handleInputChange(
                        props.rowIdx,
                        'kapal_nama',
                        val?.kapal_nama
                      );
                      handleInputChange(
                        props.rowIdx,
                        'pelayarancontainer_id',
                        Number(val?.pelayaran_id)
                      );
                      handleInputChange(
                        props.rowIdx,
                        'pelayarancontainer_nama',
                        val?.pelayaran_nama
                      );
                      handleInputChange(
                        props.rowIdx,
                        'voyberangkat',
                        val?.voyberangkat
                      );
                      handleInputChange(
                        props.rowIdx,
                        'tglberangkat',
                        val?.tglberangkat
                      );
                    }}
                    onClear={() => {
                      handleInputChange(props.rowIdx, 'schedule_nama', '');
                      handleInputChange(props.rowIdx, 'kapal', 0);
                      handleInputChange(props.rowIdx, 'kapal_nama', '');
                      handleInputChange(
                        props.rowIdx,
                        'pelayarancontainer_id',
                        ''
                      );
                      handleInputChange(
                        props.rowIdx,
                        'pelayarancontainer_nama',
                        ''
                      );
                      handleInputChange(props.rowIdx, 'voyberangkat', '');
                      handleInputChange(props.rowIdx, 'tglberangkat', '');
                    }}
                    lookupNama={
                      props.row.schedule_nama
                        ? String(props.row.schedule_nama)
                        : undefined
                    }
                    // name="schedule_id"
                    forms={forms}
                    inputLookupValue={Number(props.row.schedule_id)}
                  />
                ))}
          </div>
        )
      },
      {
        key: 'kapal',
        name: 'kapal',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>KAPAL</p>
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
                  value={props.row.kapal_nama}
                  onKeyDown={inputStopPropagation}
                  readOnly={true}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'pelayarancontainer',
        name: 'pelayarancontainer',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>PELAYARAN</p>
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
                  value={props.row.pelayarancontainer_nama}
                  onKeyDown={inputStopPropagation}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'voyberangkat',
        name: 'voyberangkat',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>VOY BERANGKAT</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  readOnly={true}
                  type="text"
                  value={props.row.voyberangkat}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'tglberangkat',
        name: 'tglberangkat',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>tglberangkat</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              {props.row.isAddRow ? (
                ''
              ) : (
                <Input
                  readOnly={true}
                  type="text"
                  value={props.row.tglberangkat}
                  onKeyDown={inputStopPropagation}
                  onClick={(e) => e.stopPropagation()}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      },
      {
        key: 'daftarbl_id',
        name: 'daftarbl_id',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>KODE SHIPPER</p>
          </div>
        ),
        renderCell: (props: any) => (
          <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
            {props.row.isAddRow
              ? ''
              : lookupDaftarBlJobParty.map((propsdaftarblLookup, index) => (
                  <LookUp
                    key={index}
                    {...propsdaftarblLookup}
                    label={`DAFTARBL_PARTY_${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                    lookupValue={(id) => {
                      handleInputChange(props.rowIdx, 'daftarbl_id', id);
                    }}
                    onSelectRow={(val) => {
                      handleInputChange(
                        props.rowIdx,
                        'daftarbl_nama',
                        val?.nama
                      );
                    }}
                    lookupNama={
                      props.row.daftarbl_nama
                        ? String(props.row.daftarbl_nama)
                        : undefined
                    }
                    // name="daftarbl_id"
                    forms={forms}
                    inputLookupValue={Number(props.row.daftarbl_id)}
                  />
                ))}
          </div>
        )
      },
      {
        key: 'hargatrucking',
        name: 'hargatrucking',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 200,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>HARGA TRUCKING</p>
          </div>
        ),
        renderCell: (props: any) => (
          <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
            {lookupHargaTruckingJobParty.map(
              (propshargatruckingLookup, index) => (
                <LookUp
                  key={index}
                  {...propshargatruckingLookup}
                  label={`HARGATRUCKING_PARTY_${props.rowIdx}`} // Ensure you use row.id or rowIdx for unique labeling
                  lookupValue={(id) => {
                    handleInputChange(props.rowIdx, 'hargatrucking', id);
                  }}
                  onSelectRow={(val) => {
                    handleInputChange(
                      props.rowIdx,
                      'hargatrucking_nama',
                      val?.keterangan
                    );
                    handleInputChange(
                      props.rowIdx,
                      'nominalstuffing',
                      String(val?.nominal)
                    );
                    handleInputChange(
                      props.rowIdx,
                      'lokasistuffing',
                      Number(val?.id)
                    );
                    handleInputChange(
                      props.rowIdx,
                      'lokasistuffing_nama',
                      val?.emkl_text
                    );
                  }}
                  onClear={() => {
                    handleInputChange(props.rowIdx, 'hargatrucking_nama', '');
                    handleInputChange(props.rowIdx, 'nominalstuffing', '');
                    handleInputChange(props.rowIdx, 'lokasistuffing', '');
                    handleInputChange(props.rowIdx, 'lokasistuffing_nama', '');
                  }}
                  lookupNama={
                    props.row.hargatrucking_nama
                      ? String(props.row.hargatrucking_nama)
                      : undefined
                  }
                  // name="hargatrucking"
                  forms={forms}
                  inputLookupValue={Number(props.row.hargatrucking)}
                />
              )
            )}
          </div>
        )
      },
      {
        key: 'trucking',
        name: 'trucking',
        headerCellClass: 'column-headers',
        resizable: true,
        draggable: true,
        cellClass: 'form-input',
        width: 250,
        renderHeaderCell: (column: any) => (
          <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-1">
            <p className={`text-sm`}>TRUCKING</p>
          </div>
        ),
        renderCell: (props: any) => {
          return (
            <div className="m-0 flex h-full w-full cursor-pointer items-center p-0 text-xs">
              <InputCurrency
                value={props.row.nominalstuffing}
                // onValueChange={(val) => {
                //   field.onChange(val);
                // }}
                readOnly={true}
              />
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
                  readOnly={true}
                  type="text"
                  value={props.row.lokasistuffing_nama}
                  onKeyDown={inputStopPropagation}
                  className="h-2 min-h-9 w-full rounded border border-gray-300"
                />
              )}
            </div>
          );
        }
      }
    ];
  }, [rows, editingRowId, editableValues]);

  const processOnReload = () => {
    const marketing = forms.getValues('marketing_id');
    const tujuan = forms.getValues('tujuankapal_id');
    const party = forms.getValues('party');
    const estMuat = forms.getValues('estmuat');
    const container = forms.getValues('container_id');
    const shipper = forms.getValues('shipper_id');
    const tanggal = forms.getValues('tglbukti');
    const asalMuat = forms.getValues('asalmuatan');
    console.log(
      'marketing',
      marketing,
      'tujuan',
      tujuan,
      'partyCount',
      partyCount,
      'estMuat',
      estMuat,
      'container',
      container,
      'shipper',
      shipper,
      'tanggal',
      tanggal,
      'asalMuat',
      asalMuat
    );

    try {
      // TIDAK memanggil setClearLookup(true) di sini. Flag itu global: SEMUA
      // LookUp yang sedang ter-mount mengosongkan teks input-nya, termasuk
      // lookup header (marketing, tujuan, container) dan lookup di kanan grid
      // (daftar BL, harga trucking, lokasi stuffing) yang nilainya sudah ada.
      // Akibatnya user harus memilih ulang padahal nilainya masih tersimpan di
      // form. PROSES di Shipping Instruction & BL juga tidak melakukan ini.
      if (
        marketing &&
        tujuan &&
        partyCount &&
        estMuat &&
        container &&
        // shipper
        tanggal &&
        asalMuat
      ) {
        setReloadForm(true);

        // Snapshot baris yang sudah ada — PROSES ulang TIDAK boleh menghapus
        // isian user. Sebelumnya tiap baris dibuat ulang kosong, jadi container,
        // seal, schedule, daftar BL, harga trucking, sampai lokasi stuffing
        // hilang semua dan harus dipilih lagi. Kuncinya index (party ke-N),
        // karena baris di sini memang dibangkitkan dari jumlah party.
        const barisSebelumnya = forms.getValues('details') as any[] | undefined;

        setRows((prevRows) => {
          const sumber = prevRows.length > 0 ? prevRows : barisSebelumnya ?? [];

          return Array.from({ length: partyCount }, (_, idx) => {
            const lama = sumber[idx];

            return {
              // Baris baru dikirim sebagai STRING '0' — id di database bertipe
              // TEXT (UUID) sejak migrasi, jadi jangan pakai angka.
              id: lama?.id ?? '0',
              nocontainer: lama?.nocontainer ?? '',
              noseal: lama?.noseal ?? '',
              schedule_id: lama?.schedule_id ?? null,
              schedule_nama: lama?.schedule_nama ?? '',
              kapal: lama?.kapal ?? '',
              kapal_nama: lama?.kapal_nama ?? '',
              pelayarancontainer_id: lama?.pelayarancontainer_id ?? null,
              pelayarancontainer_nama: lama?.pelayarancontainer_nama ?? '',
              voyberangkat: lama?.voyberangkat ?? '',
              tglberangkat: lama?.tglberangkat ?? '',
              daftarbl_id: lama?.daftarbl_id ?? null,
              daftarbl_nama: lama?.daftarbl_nama ?? '',
              hargatrucking: lama?.hargatrucking ?? '',
              hargatrucking_nama: lama?.hargatrucking_nama ?? '',
              nominalstuffing: lama?.nominalstuffing ?? '',
              lokasistuffing: lama?.lokasistuffing ?? '',
              lokasistuffing_nama: lama?.lokasistuffing_nama ?? ''
            };
          });
        });
      } else {
        setReloadForm(false);
      }
    } catch (error) {
      setReloadForm(false);
    }
  };

  useEffect(() => {
    forms.setValue('nobukti', '');
    forms.setValue('jenisorder_id', String(selectedJenisOrderan ?? ''));
    forms.setValue(
      'jenisorder_nama',
      selectedJenisOrderanNama || JENISORDERMUATANNAMA
    );

    if (partyCount != 0) {
      setPartyCount(0);
    }
  }, [forms, openForm, selectedJenisOrderan, selectedJenisOrderanNama]);

  useEffect(() => {
    if (rows) {
      forms.setValue('details', rows);
    }
  }, [rows]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Fungsi untuk menangani pergerakan fokus berdasarkan tombol
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
  }, [openName]); // Tambahkan popOverDate sebagai dependensi

  return (
    <Dialog
      open={openForm}
      onOpenChange={
        setPopOver ||
        useLainnyaDialog.setState({ openForm: false, open: false })
      }
    >
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">{`add ${modeText}`}</h2>
          <div
            className="cursor-pointer rounded-md border border-zinc-200 bg-red-500 p-0 hover:bg-red-400"
            onClick={() => {
              setPopOver(false);
              handleClose();
              // useLainnyaDialog.setState({ openForm: false });
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
                  <div className="flex flex-row">
                    <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                      <div>
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[30%]"
                        >
                          MARKETING
                        </FormLabel>
                      </div>
                      <div className="lg:w-[70%]">
                        {lookupMarketingJobParty.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('marketing_id', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('marketing_nama', val?.nama);
                            }}
                            onClear={() => {
                              forms.setValue('marketing_nama', '');
                            }}
                            name="marketing_id"
                            forms={forms}
                            lookupNama={forms.getValues('marketing_nama')}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex w-full flex-col justify-between lg:ml-4 lg:flex-row lg:items-center">
                      <div>
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[30%]"
                        >
                          CONTAINER
                        </FormLabel>
                      </div>
                      <div className="lg:w-[70%]">
                        {lookupContainerJobParty.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('container_id', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('container_nama', val?.nama);
                            }}
                            onClear={() => {
                              forms.setValue('container_nama', '');
                            }}
                            name="container_id"
                            forms={forms}
                            lookupNama={forms.getValues('container_nama')}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row">
                    <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                      <div>
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[30%]"
                        >
                          TUJUAN/PORT
                        </FormLabel>
                      </div>
                      <div className="lg:w-[70%]">
                        {lookupTujuanJobParty.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('tujuankapal_id', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('tujuankapal_nama', val?.nama);
                            }}
                            onClear={() => {
                              forms.setValue('tujuankapal_nama', '');
                            }}
                            name="tujuankapal_id"
                            forms={forms}
                            lookupNama={forms.getValues('tujuankapal_nama')}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex w-full flex-col justify-between lg:ml-4 lg:flex-row lg:items-center">
                      <div>
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[30%]"
                        >
                          SHIPPER
                        </FormLabel>
                      </div>
                      <div className="lg:w-[70%]">
                        {lookupShipperJobParty.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('shipper_id', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('shipper_nama', val?.nama);
                            }}
                            onClear={() => {
                              forms.setValue('shipper_nama', '');
                            }}
                            name="shipper_id"
                            forms={forms}
                            lookupNama={forms.getValues('shipper_nama')}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row">
                    <FormField
                      name="party"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                          <FormLabel className="font-semibold lg:w-[30%]">
                            PARTY
                          </FormLabel>
                          <div className="flex flex-col lg:w-[70%]">
                            <FormControl>
                              <InputNumeric
                                value={field.value ?? ''}
                                onValueChange={(value: any) => {
                                  forms.setValue('party', Number(value));
                                  setPartyCount(Number(value));
                                }}
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
                            TANGGAL
                          </FormLabel>
                          <div className="flex flex-col lg:w-[70%]">
                            <FormControl>
                              <InputDatePicker
                                value={field.value}
                                onChange={field.onChange}
                                showCalendar={true}
                                onSelect={(date) => {
                                  forms.setValue('tanggal', date);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-row">
                    <FormField
                      name="estmuat"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                          <FormLabel
                            required={true}
                            className="font-semibold lg:w-[30%]"
                          >
                            EST MUAT
                          </FormLabel>
                          <div className="flex flex-col lg:w-[70%]">
                            <FormControl>
                              <InputDatePicker
                                value={field.value}
                                onChange={field.onChange}
                                showCalendar={true}
                                onSelect={(date) => {
                                  forms.setValue('estmuat', date);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      name="asalmuatan"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="flex w-full flex-col justify-between lg:ml-4 lg:flex-row lg:items-center">
                          <FormLabel className="font-semibold lg:w-[30%]">
                            ASAL MUATAN
                          </FormLabel>
                          <div className="flex flex-col lg:w-[70%]">
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ''}
                                type="text"
                              />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    // type="button", dan HANYA processOnReload() — sama seperti
                    // tombol PROSES di Shipping Instruction & BL.
                    //
                    // Sebelumnya tombol ini juga memanggil onSubmit(), yaitu
                    // forms.handleSubmit milik grid: tombol proses ikut
                    // menjalankan validasi SIMPAN, dan kalau validasinya lolos
                    // justru benar-benar MENYIMPAN. Prasyaratnya sudah dicek
                    // sendiri di processOnReload (marketing, tujuan, party,
                    // est muat, container, tanggal, asal muatan).
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
                      Reload
                    </p>
                  </Button>

                  {reloadForm && (
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
                          className={`${
                            isDark ? 'rdg-dark' : 'rdg-light'
                          } fill-grid`}
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
          mode="add"
          onSave={() => {
            onSubmit();
            dispatch(setSubmitClicked(true));
          }}
          onCancel={handleClose}
          isLoadingCreate={isLoadingCreate}
          hideSaveAndAdd
        />
      </DialogContent>
    </Dialog>
  );
};

export default FormJobParty;
