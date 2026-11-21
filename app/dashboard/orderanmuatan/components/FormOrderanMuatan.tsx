import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { IoMdClose } from 'react-icons/io';
import { RootState } from '@/lib/store/store';
import { Input } from '@/components/ui/input';
import LookUp from '@/components/custom-ui/LookUp';
import { useEffect, useRef, useState } from 'react';
import { STATUSDATAPENDUKUNGTIDAK } from '@/constants/orderan';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import { setSubmitClicked } from '@/lib/store/lookupSlice/lookupSlice';
import { useLainnyaDialog } from '@/lib/store/client/useDialogLainnya';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import InputDateTimePicker from '@/components/custom-ui/InputDateTimePicker';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';

const FormOrderanMuatan = ({
  forms,
  popOver,
  setPopOver,
  onSubmit,
  mode,
  handleClose,
  isLoadingUpdate,
  isLoadingDelete
}: any) => {
  const dispatch = useDispatch();
  const formRef = useRef<HTMLFormElement | null>(null);
  const openName = useSelector((state: RootState) => state.lookup.openName);
  const [closing, setClosing] = useState<string>('');
  const [pelayaran, setPelayaran] = useState<string>('');
  const [tglBerangkat, setTglBerangkat] = useState<string>('');
  const [kapal, setKapal] = useState<string>('');
  const [tujuanKapal, setTujuanKapal] = useState<string>('');
  const { openForm } = useLainnyaDialog();

  const lookupPropsStatusTradoLuar = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS TRADO LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS TRADO LUAR',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusPisahBl = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS PISAH BL LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS PISAH BL',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusJobPtd = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS JOB PTD LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS JOB PTD',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusTransit = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS TRANSIT LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS TRANSIT',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusStuffingDepo = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS STUFFING DEPO LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS STUFFING DEPO',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusOpenDoor = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS OPEN DOOR LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS OPEN DOOR',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusBatalMuat = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS BATAL MUAT LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS BATAL MUAT',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusSoc = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS SOC LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS SOC',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusPengurusan = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'STATUS PENGURUSAN DOOR EKSPEDISI LAIN LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS PENGURUSAN DOOR EKSPEDISI LAIN',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookUpJenisOrderan = [
    {
      columns: [{ key: 'nama', name: 'JENIS ORDERAN' }],
      labelLookup: 'JENIS ORDERAN LOOKUP',
      selectedRequired: false,
      endpoint: 'JenisOrderan',
      label: 'JENISORDERANDIFORM',
      singleColumn: true,
      pageSize: 20,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsContainer = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'CONTAINER LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'container',
      label: 'CONTAINER',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsShipper = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'SHIPPER LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'shipper',
      label: 'SHIPPER',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsTujuanKapal = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'TUJUAN KAPAL LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'tujuankapal',
      label: 'TUJUAN KAPAL',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsMarketing = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'MARKETING LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'marketing',
      label: 'MARKETING',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsSchedule = [
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
      label: 'SCHEDULE KAPAL',
      singleColumn: false,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'kapal_nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsPelayaran = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'PELAYARAN LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'pelayaran',
      label: 'PELAYARAN',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsJenisMuatan = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'JENIS MUATAN LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'jenismuatan',
      label: 'JENISMUATAN',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsSandarKapal = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'SANDAR KAPAL LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'sandarkapal',
      label: 'SANDARKAPAL',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsTrado = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'TRADO LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'trado',
      label: 'TRADO',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'nama'
    }
  ];

  const lookupPropsGandengan = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'GANDENGAN LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'gandengan',
      label: 'GANDENGAN',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'nama'
    }
  ];

  const lookupPropsHargaTrucking = [
    {
      columns: [{ key: 'keterangan', name: 'NAMA' }],
      labelLookup: 'HARGA TRUCKING LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'hargatrucking',
      label: 'HARGA TRUCKING',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'keterangan',
      dataToPost: 'id'
    }
  ];

  const lookupPropsEMKL = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'EMKL LAIN LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'emkl',
      label: 'EMKL',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsDaftarBL = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'DAFTAR BL LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'daftarbl',
      label: 'DAFTAR BL',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

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

  // );

  return (
    <Dialog open={popOver && !openForm} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Add Orderan Muatan'
              : mode === 'edit'
              ? 'Edit Orderan Muatan'
              : mode === 'delete'
              ? 'Delete Orderan Muatan'
              : 'View Orderan Muatan'}
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
        <div className="h-full flex-1 overflow-y-auto bg-zinc-200 pl-1 pr-2">
          <div className="min-h-full bg-white px-5 py-3">
            <Form {...forms}>
              <form
                ref={formRef}
                onSubmit={onSubmit}
                className="flex h-full flex-col gap-6"
              >
                <div
                  // className="flex h-[100%] flex-col gap-2 lg:gap-3"
                  className="grid h-[100%] grid-cols-2 gap-2 lg:gap-2"
                >
                  <div className="flex flex-col gap-4">
                    <FormField
                      name="nobukti"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="w-full lg:flex-row lg:items-center">
                          <FormLabel className="font-semibold lg:w-[15%]">
                            NO BUKTI
                          </FormLabel>
                          <div className="mt-2 flex flex-col lg:w-[90%]">
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ''}
                                type="text"
                                disabled={true}
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
                        <FormItem className="w-full lg:flex-row lg:items-center">
                          <FormLabel
                            required={true}
                            className="font-semibold lg:w-[15%]"
                          >
                            TGL BUKTI
                          </FormLabel>
                          <div className="mt-2 flex flex-col lg:w-[90%]">
                            <FormControl>
                              <InputDatePicker
                                value={field.value}
                                onChange={field.onChange}
                                showCalendar={true}
                                disabled={mode !== 'add'}
                                onSelect={(date) => {
                                  forms.setValue('tglbukti', date);
                                  forms.setValue('tgljatuhtempo', date);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel
                          required={true}
                          className="text-sm font-semibold"
                        >
                          JENIS ORDERAN
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookUpJenisOrderan.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            disabled={true}
                            lookupValue={(value: any) => {
                              forms.setValue('jenisorder_id', Number(value));
                            }}
                            lookupNama={forms.getValues('jenisorder_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel
                          required={true}
                          className="text-sm font-semibold"
                        >
                          CONTAINER
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsContainer.map((props, index) => (
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

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel
                          required={true}
                          className="text-sm font-semibold"
                        >
                          SHIPPER
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsShipper.map((props, index) => (
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

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel
                          required={true}
                          className="text-sm font-semibold"
                        >
                          TUJUAN KAPAL
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsTujuanKapal.map((props, index) => (
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

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel
                          required={true}
                          className="text-sm font-semibold"
                        >
                          MARKETING
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsMarketing.map((props, index) => (
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

                    <FormField
                      name="keterangan"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="w-full lg:flex-row lg:items-center">
                          <FormLabel
                            required={true}
                            className="font-semibold lg:w-[15%]"
                          >
                            keterangan
                          </FormLabel>
                          <div className="mt-2 flex flex-col lg:w-[90%]">
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

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel className="text-sm font-semibold">
                          SCHEDULE
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsSchedule.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('schedule_id', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('schedule_nama', val?.kapal_nama);
                              setClosing(val?.tglclosing);
                              setPelayaran(val?.pelayaran_nama);
                              setTglBerangkat(val?.tglberangkat);
                              setKapal(val?.kapal_nama);
                              setTujuanKapal(val?.tujuankapal_nama);
                            }}
                            onClear={() => {
                              forms.setValue('schedule_nama', '');
                            }}
                            name="schedule_id"
                            forms={forms}
                            lookupNama={forms.getValues('schedule_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    {forms.getValues('schedule_id') &&
                    forms.getValues('schedule_id') != 0 ? (
                      <div className="mr-6 w-[90%] border-2 border-gray-200 p-2 lg:flex-row lg:items-center">
                        <div className="w-full lg:w-[full]">
                          <FormLabel className="text-sm font-semibold text-gray-400">
                            INFORMATION
                          </FormLabel>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div>
                            <FormLabel className="text-sm font-semibold">
                              Closing
                            </FormLabel>
                            <InputDateTimePicker
                              value={closing}
                              showCalendar={false}
                              disabled={true}
                              showTime // aktifkan 12h + AM/PM
                            />
                          </div>
                          <div>
                            <FormLabel className="text-sm font-semibold">
                              Pelayaran
                            </FormLabel>
                            <Input value={pelayaran} disabled={true} />
                          </div>
                          <div>
                            <FormLabel className="text-sm font-semibold">
                              Tgl Berangkat
                            </FormLabel>
                            <InputDatePicker
                              value={tglBerangkat}
                              disabled={true}
                            />
                          </div>
                          <div>
                            <FormLabel className="text-sm font-semibold">
                              Kapal
                            </FormLabel>
                            <Input value={kapal} disabled={true} />
                          </div>
                          <div>
                            <FormLabel className="text-sm font-semibold">
                              Tujuan Kapal
                            </FormLabel>
                            <Input value={tujuanKapal} disabled={true} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <></>
                    )}

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel className="text-sm font-semibold">
                          CONTAINER PELAYARAN
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsPelayaran.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue(
                                'pelayarancontainer_id',
                                Number(value)
                              );
                            }}
                            onSelectRow={(val) => {
                              forms.setValue(
                                'pelayarancontainer_nama',
                                val?.nama
                              );
                            }}
                            onClear={() => {
                              forms.setValue('pelayarancontainer_nama', '');
                            }}
                            name="pelayarancontainer_id"
                            forms={forms}
                            lookupNama={forms.getValues(
                              'pelayarancontainer_nama'
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel
                          required={true}
                          className="text-sm font-semibold"
                        >
                          JENIS MUATAN
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsJenisMuatan.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('jenismuatan_id', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('jenismuatan_nama', val?.nama);
                            }}
                            onClear={() => {
                              forms.setValue('jenismuatan_nama', '');
                            }}
                            name="jenismuatan_id"
                            forms={forms}
                            lookupNama={forms.getValues('jenismuatan_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel
                          required={true}
                          className="text-sm font-semibold"
                        >
                          SANDAR KAPAL
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsSandarKapal.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('sandarkapal_id', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('sandarkapal_nama', val?.nama);
                            }}
                            onClear={() => {
                              forms.setValue('sandarkapal_nama', '');
                            }}
                            name="sandarkapal_id"
                            forms={forms}
                            lookupNama={forms.getValues('sandarkapal_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel className="text-sm font-semibold">
                          STATUS TRADO LUAR
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsStatusTradoLuar.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('tradoluar', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('tradoluar_nama', val?.text);
                            }}
                            onClear={() => {
                              forms.setValue('tradoluar_nama', '');
                            }}
                            name="tradoluar"
                            forms={forms}
                            lookupNama={forms.getValues('tradoluar_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    {forms.getValues('tradoluar') ==
                    STATUSDATAPENDUKUNGTIDAK ? (
                      <div className="w-full lg:flex-row lg:items-center">
                        <div className="w-full lg:w-[full]">
                          <FormLabel className="text-sm font-semibold">
                            no polisi
                          </FormLabel>
                        </div>
                        <div className="mt-2 w-full lg:w-[90%]">
                          {lookupPropsTrado.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupValue={(value: any) => {
                                forms.setValue('nopolisi', value);
                              }}
                              onSelectRow={(val: any) => {
                                forms.setValue('nopolisi_nama', val?.nama);
                              }}
                              onClear={() => {
                                forms.setValue('nopolisi_nama', '');
                              }}
                              name="nopolisi"
                              forms={forms}
                              lookupNama={forms.getValues('nopolisi')}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <FormField
                        name="nopolisi"
                        control={forms.control}
                        render={({ field }) => (
                          <FormItem className="w-full lg:flex-row lg:items-center">
                            <FormLabel className="font-semibold lg:w-[15%]">
                              no polisi
                            </FormLabel>
                            <div className="mt-2 flex flex-col lg:w-[90%]">
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ''}
                                  type="text"
                                  readOnly={
                                    mode === 'view' || mode === 'delete'
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                    )}

                    {forms.getValues('tradoluar') ==
                    STATUSDATAPENDUKUNGTIDAK ? (
                      <div className="w-full lg:flex-row lg:items-center">
                        <div className="w-full lg:w-[full]">
                          <FormLabel className="text-sm font-semibold">
                            GANDENGAN
                          </FormLabel>
                        </div>
                        <div className="mt-2 w-full lg:w-[90%]">
                          {lookupPropsGandengan.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupValue={(value: any) => {
                                forms.setValue('gandengan', value);
                              }}
                              onSelectRow={(val: any) => {
                                forms.setValue('gandengan_nama', val?.nama);
                              }}
                              onClear={() => {
                                forms.setValue('gandengan_nama', '');
                              }}
                              name="gandengan"
                              forms={forms}
                              lookupNama={forms.getValues('gandengan')}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <FormField
                        name="gandengan"
                        control={forms.control}
                        render={({ field }) => (
                          <FormItem className="w-full lg:flex-row lg:items-center">
                            <FormLabel className="font-semibold lg:w-[15%]">
                              gandengan
                            </FormLabel>
                            <div className="mt-2 flex flex-col lg:w-[90%]">
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ''}
                                  type="text"
                                  readOnly={
                                    mode === 'view' || mode === 'delete'
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      name="nosp"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="w-full lg:flex-row lg:items-center">
                          <FormLabel className="font-semibold lg:w-[15%]">
                            no sp
                          </FormLabel>
                          <div className="mt-2 flex flex-col lg:w-[90%]">
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
                  </div>

                  <div className="flex flex-col gap-4">
                    <FormField
                      name="nocontainer"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="w-full lg:flex-row lg:items-center">
                          <FormLabel className="font-semibold lg:w-[15%]">
                            no container
                          </FormLabel>
                          <div className="mt-2 flex flex-col lg:w-[90%]">
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
                      name="noseal"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="w-full lg:flex-row lg:items-center">
                          <FormLabel className="font-semibold lg:w-[15%]">
                            no seal
                          </FormLabel>
                          <div className="mt-2 flex flex-col lg:w-[90%]">
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

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel className="text-sm font-semibold">
                          LOKASI STUFFING
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsHargaTrucking.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('lokasistuffing', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue(
                                'lokasistuffing_nama',
                                val?.keterangan
                              );
                            }}
                            onClear={() => {
                              forms.setValue('lokasistuffing_nama', '');
                            }}
                            name="lokasistuffing"
                            forms={forms}
                            lookupNama={forms.getValues('lokasistuffing_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    <FormField
                      name="nominalstuffing"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="w-full lg:flex-row lg:items-center">
                          <FormLabel className="font-semibold lg:w-[full]">
                            NOMINAL STUFFING
                          </FormLabel>
                          <div className="flex flex-col lg:w-[90%]">
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

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel className="text-sm font-semibold">
                          EMKL LAIN
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsEMKL.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('emkl_id', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('emkllain_nama', val?.nama);
                            }}
                            onClear={() => {
                              forms.setValue('emkllain_nama', '');
                            }}
                            name="emkl_id"
                            forms={forms}
                            lookupNama={forms.getValues('emkllain_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    <FormField
                      name="asalmuatan"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="w-full lg:flex-row lg:items-center">
                          <FormLabel className="font-semibold lg:w-[15%]">
                            asal muatan
                          </FormLabel>
                          <div className="mt-2 flex flex-col lg:w-[90%]">
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

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel className="text-sm font-semibold">
                          DAFTAR BL
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsDaftarBL.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('daftarbl_id', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('daftarbl_nama', val?.nama);
                            }}
                            onClear={() => {
                              forms.setValue('daftarbl_nama', '');
                            }}
                            name="daftarbl_id"
                            forms={forms}
                            lookupNama={forms.getValues('daftarbl_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    <FormField
                      name="comodity"
                      control={forms.control}
                      render={({ field }) => (
                        <FormItem className="w-full lg:flex-row lg:items-center">
                          <FormLabel className="font-semibold lg:w-[15%]">
                            comodity
                          </FormLabel>
                          <div className="mt-2 flex flex-col lg:w-[90%]">
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

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel className="text-sm font-semibold">
                          STATUS PISAH BL
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsStatusPisahBl.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('pisahbl', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('pisahbl_nama', val?.text);
                            }}
                            onClear={() => {
                              forms.setValue('pisahbl_nama', '');
                            }}
                            name="pisahbl"
                            forms={forms}
                            lookupNama={forms.getValues('pisahbl_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel className="text-sm font-semibold">
                          STATUS JOB PTD
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsStatusJobPtd.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('jobptd', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('jobptd_nama', val?.text);
                            }}
                            onClear={() => {
                              forms.setValue('jobptd_nama', '');
                            }}
                            name="jobptd"
                            forms={forms}
                            lookupNama={forms.getValues('jobptd_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel className="text-sm font-semibold">
                          STATUS TRANSIT
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsStatusTransit.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('transit', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('transit_nama', val?.text);
                            }}
                            onClear={() => {
                              forms.setValue('transit_nama', '');
                            }}
                            name="transit"
                            forms={forms}
                            lookupNama={forms.getValues('transit_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel className="text-sm font-semibold">
                          STATUS STUFFING DEPO
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsStatusStuffingDepo.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('stuffingdepo', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('stuffingdepo_nama', val?.text);
                            }}
                            onClear={() => {
                              forms.setValue('stuffingdepo_nama', '');
                            }}
                            name="stuffingdepo"
                            forms={forms}
                            lookupNama={forms.getValues('stuffingdepo_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel className="text-sm font-semibold">
                          STATUS OPEN DOOR
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsStatusOpenDoor.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('opendoor', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('opendoor_nama', val?.text);
                            }}
                            onClear={() => {
                              forms.setValue('opendoor_nama', '');
                            }}
                            name="opendoor"
                            forms={forms}
                            lookupNama={forms.getValues('opendoor_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel className="text-sm font-semibold">
                          STATUS BATAL MUAT
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsStatusBatalMuat.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('batalmuat', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('batalmuat_nama', val?.text);
                            }}
                            onClear={() => {
                              forms.setValue('batalmuat_nama', '');
                            }}
                            name="batalmuat"
                            forms={forms}
                            lookupNama={forms.getValues('batalmuat_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel className="text-sm font-semibold">
                          STATUS SOC
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsStatusSoc.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue('soc', Number(value));
                            }}
                            onSelectRow={(val) => {
                              forms.setValue('soc_nama', val?.text);
                            }}
                            onClear={() => {
                              forms.setValue('soc_nama', '');
                            }}
                            name="soc"
                            forms={forms}
                            lookupNama={forms.getValues('soc_nama')}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="w-full lg:flex-row lg:items-center">
                      <div className="w-full lg:w-[full]">
                        <FormLabel className="text-sm font-semibold">
                          STATUS PENGURUSAN DOOR EKSPEDISI LAIN
                        </FormLabel>
                      </div>
                      <div className="mt-2 w-full lg:w-[90%]">
                        {lookupPropsStatusPengurusan.map((props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value: any) => {
                              forms.setValue(
                                'pengurusandoorekspedisilain',
                                Number(value)
                              );
                            }}
                            onSelectRow={(val) => {
                              forms.setValue(
                                'pengurusandoorekspedisilain_nama',
                                val?.text
                              );
                            }}
                            onClear={() => {
                              forms.setValue(
                                'pengurusandoorekspedisilain_nama',
                                ''
                              );
                            }}
                            name="pengurusandoorekspedisilain"
                            forms={forms}
                            lookupNama={forms.getValues(
                              'pengurusandoorekspedisilain_nama'
                            )}
                          />
                        ))}
                      </div>
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
          onCancel={handleClose}
          isLoadingUpdate={isLoadingUpdate}
          isLoadingDelete={isLoadingDelete}
          hideSaveAndAdd
        />
      </DialogContent>
    </Dialog>
  );
};

export default FormOrderanMuatan;
