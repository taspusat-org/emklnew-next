import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { IoMdClose } from 'react-icons/io';
import { RootState } from '@/lib/store/store';
import { Input } from '@/components/ui/input';
import LookUp from '@/components/custom-ui/LookUp';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import InputNumeric from '@/components/custom-ui/InputNumeric';
import { setSubmitClicked } from '@/lib/store/lookupSlice/lookupSlice';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import InputCurrency from '@/components/custom-ui/InputCurrency';

const FormPindahBuku = ({
  forms,
  popOver,
  setPopOver,
  onSubmit,
  mode,
  handleClose,
  isLoadingCreate,
  isLoadingUpdate,
  isLoadingDelete
}: any) => {
  const todayDate = new Date();
  const dispatch = useDispatch();
  const formRef = useRef<HTMLFormElement | null>(null);
  const openName = useSelector((state: RootState) => state.lookup.openName);
  const selectLookup = useSelector(
    (state: RootState) => state.selectLookup.selectLookup
  );
  const fmt = (date: Date) =>
    `${String(date.getDate()).padStart(2, '0')}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${date.getFullYear()}`;

  const lookupPropsBankDari = [
    {
      columns: [{ key: 'keterangan', name: 'NAMA' }],
      labelLookup: 'BANK DARI LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'bank',
      label: 'BANK DARI',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'keterangan',
      dataToPost: 'id'
    }
  ];

  const lookupPropsBankKe = [
    {
      columns: [{ key: 'keterangan', name: 'NAMA' }],
      labelLookup: 'BANK KE LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'bank',
      label: 'BANK KE',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'keterangan',
      dataToPost: 'id'
    }
  ];

  const lookupPropsAlatBayar = [
    {
      columns: [{ key: 'keterangan', name: 'NAMA' }],
      labelLookup: 'ALAT BAYAR LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'alatbayar',
      label: 'ALAT BAYAR',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'keterangan',
      dataToPost: 'id'
    }
  ];

  const lookupPropsStatusFormat = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      labelLookup: 'FORMAT LOOKUP',
      required: true,
      selectedRequired: false,
      // filterby: { exclude: 'true', kelompok: '' },
      endpoint: `parameter?exclude=true&kelompok=`,
      // endpoint: 'parameter',
      label: 'FORMAT',
      singleColumn: true,
      pageSize: 20,
      disabled: mode === 'view' || mode === 'delete' ? true : false,
      postData: 'text',
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

  useEffect(() => {
    if (mode === 'add') {
      forms.setValue('tglbukti', fmt(todayDate));
      forms.setValue('tgljatuhtempo', fmt(todayDate));
    }
  }, [popOver, mode]);

  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Add Pindah Buku'
              : mode === 'edit'
              ? 'Edit Pindah Buku'
              : mode === 'delete'
              ? 'Delete Pindah Buku'
              : 'View Pindah Buku'}
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
                                showCalendar={mode == 'add' || mode == 'edit'}
                                disabled={mode == 'delete' || mode == 'view'}
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
                  </div>

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={true}
                        className="text-sm font-semibold"
                      >
                        BANK DARI
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookupPropsBankDari.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(value: any) => {
                            forms.setValue('bankdari_id', value);
                          }}
                          onSelectRow={(val) => {
                            forms.setValue('bankdari_nama', val?.keterangan);
                          }}
                          name="bankdari_id"
                          forms={forms}
                          lookupNama={forms.getValues('bankdari_nama')}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={true}
                        className="text-sm font-semibold"
                      >
                        BANK KE
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookupPropsBankKe.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(value: any) => {
                            forms.setValue('bankke_id', value);
                          }}
                          onSelectRow={(val) => {
                            forms.setValue('bankke_nama', val?.keterangan);
                          }}
                          name="bankke_id"
                          forms={forms}
                          lookupNama={forms.getValues('bankke_nama')}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={true}
                        className="text-sm font-semibold"
                      >
                        ALAT BAYAR
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookupPropsAlatBayar.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(value: any) => {
                            forms.setValue('alatbayar_id', String(value ?? ''));
                          }}
                          onSelectRow={(val) => {
                            forms.setValue('alatbayar_nama', val?.keterangan);
                            console.log(
                              'tess',
                              forms.getValues('alatbayar_nama')
                            );
                            forms.setValue('nowarkat', '');
                          }}
                          lookupNama={forms.getValues('alatbayar_nama')}
                        />
                      ))}
                    </div>
                  </div>

                  <FormField
                    name="nowarkat"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="font-semibold lg:w-[15%]">
                          NO WARKAT
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ''}
                              type="text"
                              readOnly={mode === 'view' || mode === 'delete'}
                              disabled={
                                forms.getValues('alatbayar_nama') == 'Tunai'
                              }
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
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          TGL JATUH TEMPO
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <InputDatePicker
                              value={field.value}
                              onChange={field.onChange}
                              showCalendar={mode == 'add' || mode == 'edit'}
                              disabled={
                                mode == 'delete' ||
                                mode == 'view' ||
                                forms.getValues('alatbayar_nama') != 'Giro'
                              }
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

                  <FormField
                    name="nominal"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
                          NOMINAL
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
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

                  <FormField
                    name="keterangan"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="font-semibold lg:w-[15%]"
                        >
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
                </div>
              </form>
            </Form>
          </div>
        </div>
        <FormFooterButtons
          mode={mode}
          onSave={() => {
            forms.handleSubmit((values: any) => {
              onSubmit(values, false);
              dispatch(setSubmitClicked(true));
            })();
          }}
          onSaveAndAdd={() => {
            forms.handleSubmit((values: any) => {
              onSubmit(values, true);
              dispatch(setSubmitClicked(true));
            })();
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

export default FormPindahBuku;
