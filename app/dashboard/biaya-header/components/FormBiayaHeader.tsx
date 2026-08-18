import { FaSave, FaTimes, FaTrashAlt } from 'react-icons/fa';
import { Input } from '@/components/ui/input';
import { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import LookUp from '@/components/custom-ui/LookUp';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { useSelector, useDispatch } from 'react-redux';
import { IoMdClose } from 'react-icons/io';
import { formatCurrency, parseCurrency, todayDate } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import DataGrid, { Column, DataGridHandle } from 'react-data-grid';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import {
  clearOpenName,
  setSubmitClicked
} from '@/lib/store/lookupSlice/lookupSlice';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  setProcessed,
  setProcessing
} from '@/lib/store/loadingSlice/loadingSlice';
import FormLabel, {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/components/ui/form';
import { FaRegSquarePlus } from 'react-icons/fa6';
import { BiayaExtraMuatanDetail } from '@/lib/types/biayaextraheader.type';
import { useGetBiayaExtraMuatanDetail } from '@/lib/server/useBiayaExtraHeader';
import { setSelectedBiayaEmklNama } from '@/lib/store/filterSlice/filterSlice';
import {
  BIAYAEMKLDEFAULT,
  BIAYAEMKLLAINLAIN,
  JENISORDERBONGKARAN,
  JENISORDERMUATAN
} from '@/constants/biayaheader';
import FormBiayaLainLainDetailMuatan from './FormBiayaLainLainDetailMuatan';
import { getBiayaExtraDetailByIdFn } from '@/lib/apis/biayaextraheader.api';
import { useShiftHorizontalScroll } from '@/hooks/use-shift-horizontal-scroll';

const FormBiayaHeader = ({
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
  const dispatch = useDispatch();
  const formRef = useRef<HTMLFormElement | null>(null); // Ref untuk form
  const openName = useSelector((state: RootState) => state.lookup.openName);
  // Shift + scroll = geser horizontal. Grid ini lebih lebar dari modal dan
  // react-remove-scroll bawaan Radix Dialog membatalkan wheel-nya.
  useShiftHorizontalScroll();

  const [isDisableDetail, setIsDisableDetail] = useState(false);
  // const [showErrorNominal, setShowErrorNominal] = useState(false);
  const [errorNominal, setErrorNominal] = useState<Record<number, boolean>>({});
  const [isDisableBiayaExtraHeader, setIsDisableBiayaExtraHeader] =
    useState(false);
  const {
    selectedJenisOrderan,
    selectedJenisOrderanNama,
    selectedBiayaEmkl,
    selectedBiayaEmklNama
  } = useSelector((state: RootState) => state.filter);
  const [rows, setRows] = useState<
    (
      | BiayaExtraMuatanDetail
      | (Partial<BiayaExtraMuatanDetail> & { isNew: boolean })
    )[]
  >([]);

  const lookUpJenisOrderan = [
    {
      columns: [{ key: 'nama', name: 'JENIS ORDERAN' }],
      labelLookup: 'JENIS ORDERAN LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'JenisOrderan',
      label: 'JENIS ORDERAN',
      singleColumn: true,
      // disabled: true,
      pageSize: 20,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupPropsBiayaEmkl = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'BIAYA EMKL LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: `biayaemkl`,
      label: 'BIAYA EMKL',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookupRelasi = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'RELASI LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: `relasi`,
      label: 'RELASI',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const jenisOrderan = forms.getValues('jenisorder_id')
    ? Number(forms.getValues('jenisorder_id'))
    : selectedJenisOrderan
    ? Number(selectedJenisOrderan)
    : null;
  const biayaEmkl = forms.getValues('biayaemkl_id');
  const biayaExtraLookup = [
    {
      columns: [{ key: 'nobukti', name: 'NO BUKTI' }],
      labelLookup: 'BIAYA EXTRA LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: `biayaextraheader?jenisOrderan=${jenisOrderan}&biayaemkl_id=${biayaEmkl}`,
      label: 'BIAYA EXTRA',
      singleColumn: true,
      pageSize: 20,
      disabled:
        mode === 'view' || mode === 'delete' || isDisableBiayaExtraHeader,
      postData: 'nobukti',
      dataToPost: 'id'
    }
  ];

  const EmptyRows = [
    {
      id: 0,
      nobukti: '',
      orderanmuatan_id: 0,
      orderanmuatan_nobukti: '',
      tgljob: '',
      nocontainer: '',
      noseal: '',
      lokasistuffing_nama: '',
      shipper_nama: '',
      container_nama: '',
      estimasi: '',
      nominal: '',
      keterangan: '',
      biayaextra_id: 0,
      biayaextra_nobukti: '',
      isNew: true
    },
    { isAddRow: true, id: 'add_row', isNew: false }
  ];

  const fetchDataDetail = async (id: number, jenisOrderan: number) => {
    try {
      const response = await getBiayaExtraDetailByIdFn(id, jenisOrderan);
      const formattedRows = response.data.map((item: any) => ({
        id: 0,
        nobukti: '',
        orderanmuatan_id: Number(item.orderan_id) ?? 0,
        orderanmuatan_nobukti: item.orderan_nobukti ?? '',
        tgljob: item.tglbukti ?? '',
        nocontainer: item.nocontainer ?? '',
        noseal: item.noseal ?? '',
        lokasistuffing_nama: item.lokasistuffing_nama ?? '',
        shipper_nama: item.shipper_nama ?? '',
        container_nama: item.container_nama ?? '',
        estimasi: formatCurrency(item.estimasi) ?? '',
        nominal: formatCurrency(item.estimasi) ?? '',
        keterangan: '',
        biayaextra_id: Number(item.biayaextra_id) ?? 0,
        biayaextra_nobukti: item.nobukti ?? ''
      }));

      setRows([
        ...formattedRows,
        { isAddRow: true, id: 'add_row', isNew: false } // Always add the "Add Row" button row at the end
      ]);
      setIsDisableDetail(true);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const renderedForm = () => {
    const valJenisOrderan = forms.getValues('jenisorder_id'); // pastikan number
    const valJenisBiayaEmkl = forms.getValues('biayaemkl_id'); // pastikan number

    switch (valJenisOrderan) {
      case JENISORDERMUATAN:
        switch (valJenisBiayaEmkl) {
          case BIAYAEMKLLAINLAIN:
            return (
              <FormBiayaLainLainDetailMuatan
                forms={forms}
                mode={mode}
                popOver={popOver}
                rows={rows}
                setRows={setRows}
                isDisableDetail={isDisableDetail}
                errorNominal={errorNominal}
                setErrorNominal={setErrorNominal}
              />
            );
          default:
            return null;
        }

      case JENISORDERBONGKARAN:
        switch (valJenisBiayaEmkl) {
          // case BIAYAEMKLLAINLAIN:
          //   return <FormBiayaLainLainDetailMuatan forms={forms} mode={mode} popOver={popOver} />;
          default:
            return null;
        }

      default:
        return null;
    }
  };

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
    setErrorNominal({});
    if (mode === 'add') {
      setIsDisableDetail(false);
      forms.setValue('tglbukti', todayDate());
    } else {
      const biayaExtraHeaderValue = forms.getValues('biayaextra_nobukti');
      if (!biayaExtraHeaderValue) {
        setIsDisableBiayaExtraHeader(true);
        setIsDisableDetail(false);
      } else {
        setIsDisableBiayaExtraHeader(false);
        setIsDisableDetail(true);
      }
    }
  }, [popOver, mode]);

  useEffect(() => {
    if (rows) {
      // Filter out the `isNew` field and any object with `id: "add_row"`
      const filteredRows = rows
        .filter((row: any) => row.id !== 'add_row') // Exclude rows with id "add_row"
        .map(({ isNew, ...rest }: any) => ({
          ...rest
        }));

      forms.setValue('details', filteredRows);
    }

    const biayaExtraHeaderValue = forms.getValues('biayaextra_id');
    const biayaExtraDetailValue = forms.getValues().details[0]?.biayaextra_id;
    const orderanDetailValue =
      forms.getValues().details[0]?.orderanmuatan_nobukti;

    if (
      !biayaExtraHeaderValue &&
      (biayaExtraDetailValue || orderanDetailValue)
    ) {
      setIsDisableBiayaExtraHeader(true);
    } else {
      setIsDisableBiayaExtraHeader(false);
    }
  }, [rows]);

  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Add Biaya'
              : mode === 'edit'
              ? 'Edit Biaya'
              : mode === 'delete'
              ? 'Delete Biaya'
              : 'View Biaya'}
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
                              disabled={mode !== 'add'}
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
                    name="jenisorder_id"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          JENIS ORDER
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookUpJenisOrderan.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupValue={(value: any) => {
                                forms.setValue('jenisorder_id', Number(value));
                              }}
                              onSelectRow={(val) => {
                                forms.setValue('jenisorder_nama', val?.nama);
                              }}
                              name="jenisorder_id"
                              forms={forms}
                              lookupNama={
                                forms.getValues('jenisorder_nama') ??
                                selectedJenisOrderanNama
                              }
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="biayaemkl_id"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          BIAYA EMKL
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookupPropsBiayaEmkl.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              disabled={mode == 'delete' || mode == 'view'}
                              lookupValue={(value: any) => {
                                forms.setValue('biayaemkl_id', Number(value));
                              }}
                              onSelectRow={(val) => {
                                forms.setValue('biayaemkl_nama', val?.nama);
                                forms.setValue('biayaextra_id', 0);
                                forms.setValue('biayaextra_nobukti', '');
                                setRows(EmptyRows);
                                setIsDisableDetail(false);
                                setErrorNominal({});
                              }}
                              onClear={() => {
                                forms.setValue('biayaextra_id', 0);
                                forms.setValue('biayaextra_nobukti', '');
                                setRows(EmptyRows);
                                setIsDisableDetail(false);
                                setErrorNominal({});
                              }}
                              name="biayaemkl_id"
                              forms={forms}
                              lookupNama={
                                forms.getValues('biayaemkl_nama') ??
                                selectedBiayaEmklNama
                              }
                            />
                          ))}
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
                        <div className="mt-2 flex flex-col lg:w-[85%]">
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
                    name="noinvoice"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          NO INVOICE
                        </FormLabel>
                        <div className="mt-2 flex flex-col lg:w-[85%]">
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
                    name="relasi_id"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          RELASI
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookupRelasi.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              disabled={mode == 'delete' || mode == 'view'}
                              lookupValue={(value: any) => {
                                // relasi_id = varchar UUID, jangan Number().
                                forms.setValue(
                                  'relasi_id',
                                  value ? String(value) : ''
                                );
                              }}
                              onSelectRow={(val) => {
                                forms.setValue('relasi_nama', val?.nama);
                              }}
                              name="relasi_id"
                              forms={forms}
                              lookupNama={forms.getValues('relasi_nama')}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="dibayarke"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          DIBAYAR KE
                        </FormLabel>
                        <div className="mt-2 flex flex-col lg:w-[85%]">
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
                    name="biayaextra_id"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          NO BUKTI BIAYA EXTRA
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {biayaExtraLookup.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              // disabled={mode == 'delete' || mode == 'view'}
                              lookupValue={(value: any) => {
                                forms.setValue('biayaextra_id', Number(value));
                              }}
                              onSelectRow={(val) => {
                                forms.setValue(
                                  'biayaextra_nobukti',
                                  val?.nobukti
                                );
                                setRows(EmptyRows);
                                fetchDataDetail(
                                  Number(val.id),
                                  Number(val.jenisorder_id)
                                );
                              }}
                              onClear={() => {
                                setRows(EmptyRows);
                                setIsDisableDetail(false);
                                setErrorNominal({});
                              }}
                              name="biayaextra_id"
                              forms={forms}
                              lookupNama={forms.getValues('biayaextra_nobukti')}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                {renderedForm()}
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

export default FormBiayaHeader;
