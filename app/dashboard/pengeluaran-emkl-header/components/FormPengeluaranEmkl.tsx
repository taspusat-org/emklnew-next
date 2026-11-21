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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import LookUp from '@/components/custom-ui/LookUp';
import { Input } from '@/components/ui/input';
import { IoMdClose, IoMdRefresh } from 'react-icons/io';
import { FaTimes, FaTrashAlt } from 'react-icons/fa';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
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
import FormPinjamanEmkl from './FormPinjamanEmkl';
import FormPenerimaanSeal from './FormPenerimaanSeal';
import { PINJAMANEMKL, PENERIMAANSEAL } from '@/constants/pengeluaranemkl';
import {
  setSelectedPengeluaranEmkl,
  setSelectedPengeluaranEmklNama
} from '@/lib/store/filterSlice/filterSlice';
import { useDispatch } from 'react-redux';
import { useShiftHorizontalScroll } from '@/hooks/use-shift-horizontal-scroll';
const FormPengeluaranEmkl = ({
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
  const { selectedPengeluaranEmkl, selectedPengeluaranEmklNama } = useSelector(
    (state: RootState) => state.filter
  );
  const dispatch = useDispatch();
  // Shift + scroll = geser horizontal. Grid ini lebih lebar dari modal dan
  // react-remove-scroll bawaan Radix Dialog membatalkan wheel-nya.
  useShiftHorizontalScroll();

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

  const lookUpPropsPengeluaranEmkl = [
    {
      columns: [{ key: 'nama', name: 'NAMA' }],
      labelLookup: 'PENGELUARAN EMKL LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'pengeluaranemkl',
      singleColumn: true,
      pageSize: 20,
      showOnButton: true,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const renderedForm = () => {
    const val = selectedPengeluaranEmkl; // format = id parameter UUID (string)
    switch (val) {
      case PINJAMANEMKL:
        return <FormPinjamanEmkl forms={forms} mode={mode} popOver={popOver} />;
      case PENERIMAANSEAL:
        return (
          <FormPenerimaanSeal forms={forms} mode={mode} popOver={popOver} />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'ADD Kas Gantung'
              : mode === 'edit'
              ? 'Edit Kas Gantung'
              : mode === 'delete'
              ? 'Delete Kas Gantung'
              : 'View Kas Gantung'}
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
                              disabled={
                                mode === 'view' ||
                                mode === 'delete' ||
                                mode === 'edit'
                              }
                              showCalendar
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
                </div>
                <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                  <div className="w-full lg:w-[15%]">
                    <FormLabel className="text-sm font-semibold">
                      PENGELUARAN EMKL
                    </FormLabel>
                  </div>
                  <div className="w-full lg:w-[85%]">
                    {lookUpPropsPengeluaranEmkl.map((props, index) => (
                      <LookUp
                        key={index}
                        {...props}
                        labelLookup="LOOKUP PENGELUARAN EMKL"
                        disabled={
                          mode === 'view' ||
                          mode === 'delete' ||
                          mode === 'edit'
                        }
                        // inputLookupValue={forms.getValues('relasi_id')}
                        lookupNama={
                          forms.getValues('statusformat_nama') ??
                          selectedPengeluaranEmklNama
                        }
                        onSelectRow={(val) => {
                          dispatch(
                            setSelectedPengeluaranEmkl(val?.format ?? null)
                          );
                          dispatch(setSelectedPengeluaranEmklNama(val?.nama));
                          forms.setValue('format', val?.format ?? null);
                          forms.setValue('coadebet', val?.coadebet);
                        }}
                        onClear={() => {
                          dispatch(setSelectedPengeluaranEmkl(null));
                          dispatch(setSelectedPengeluaranEmklNama(''));
                        }}
                      />
                    ))}
                  </div>
                </div>
                {renderedForm()}
              </form>
            </Form>
          </div>
        </div>
        <FormFooterButtons
          mode={mode}
          onSave={onSubmit}
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

export default FormPengeluaranEmkl;
