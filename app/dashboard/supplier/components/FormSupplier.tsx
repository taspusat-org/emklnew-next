import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store/store';
import LookUp from '@/components/custom-ui/LookUp';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import InputNumeric from '@/components/custom-ui/InputNumeric';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import { IoMdClose } from 'react-icons/io';
import { setSubmitClicked } from '@/lib/store/lookupSlice/lookupSlice';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';

interface FormSupplierProps {
  popOver: boolean;
  setPopOver: (value: boolean) => void;
  forms: any;
  onSubmit: any;
  mode: any;
  handleClose: () => void;
  isLoadingCreate: boolean;
  isLoadingUpdate: boolean;
  isLoadingDelete: boolean;
}

const FormSupplier = ({
  popOver,
  setPopOver,
  forms,
  onSubmit,
  mode,
  handleClose,
  isLoadingCreate,
  isLoadingUpdate,
  isLoadingDelete
}: FormSupplierProps) => {
  const formRef = useRef<HTMLFormElement | null>(null);
  const openName = useSelector((state: RootState) => state.lookup.openName);
  const dispatch = useDispatch();
  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Add Supplier'
              : mode === 'edit'
              ? 'Edit Supplier'
              : mode === 'delete'
              ? 'Delete Supplier'
              : 'View Supplier'}
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
                    name="nama"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          NAMA
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

                  <FormField
                    name="keterangan"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
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

                  <FormField
                    name="contactperson"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          CONTACTPERSON
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

                  <FormField
                    name="ktp"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          KTP
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

                  <FormField
                    name="alamat"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          ALAMAT
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

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={false}
                        className="text-sm font-semibold"
                      >
                        Coa
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      <LookUp
                        columns={[{ key: 'keterangancoa', name: 'COA' }]}
                        labelLookup="COA LOOKUP"
                        required={false}
                        selectedRequired={false}
                        endpoint="akunpusat"
                        label="COA"
                        singleColumn={true}
                        pageSize={20}
                        showOnButton={true}
                        postData="keterangancoa"
                        dataToPost="coa"
                        lookupValue={(id) => {
                          forms.setValue('coa', String(id ?? ''));
                        }}
                        onSelectRow={(val) =>
                          forms.setValue('coa_text', val?.keterangancoa)
                        }
                        lookupNama={forms.getValues('coa_text')}
                        disabled={mode === 'view' || mode === 'delete'}
                      />
                    </div>
                  </div>

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={false}
                        className="text-sm font-semibold"
                      >
                        Coagiro
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      <LookUp
                        columns={[{ key: 'keterangancoa', name: 'COA GIRO' }]}
                        labelLookup="COAGIRO LOOKUP"
                        required={false}
                        selectedRequired={false}
                        endpoint="akunpusat"
                        label="COAGIRO"
                        singleColumn={true}
                        pageSize={20}
                        showOnButton={true}
                        postData="keterangancoa"
                        dataToPost="coa"
                        lookupValue={(id) => {
                          forms.setValue('coagiro', String(id ?? ''));
                        }}
                        onSelectRow={(val) =>
                          forms.setValue('coagiro_text', val?.keterangancoa)
                        }
                        lookupNama={forms.getValues('coagiro_text')}
                        disabled={mode === 'view' || mode === 'delete'}
                      />
                    </div>
                  </div>

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={false}
                        className="text-sm font-semibold"
                      >
                        Coapiu
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      <LookUp
                        columns={[
                          { key: 'keterangancoa', name: 'COA PIUTANG' }
                        ]}
                        labelLookup="COAPIU LOOKUP"
                        required={false}
                        selectedRequired={false}
                        endpoint="akunpusat"
                        label="COAPIU"
                        singleColumn={true}
                        pageSize={20}
                        showOnButton={true}
                        postData="keterangancoa"
                        dataToPost="coa"
                        lookupValue={(id) => {
                          forms.setValue('coapiu', String(id ?? ''));
                        }}
                        onSelectRow={(val) =>
                          forms.setValue('coapiu_text', val?.keterangancoa)
                        }
                        lookupNama={forms.getValues('coapiu_text')}
                        disabled={mode === 'view' || mode === 'delete'}
                      />
                    </div>
                  </div>

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={false}
                        className="text-sm font-semibold"
                      >
                        Coahut
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      <LookUp
                        columns={[{ key: 'keterangancoa', name: 'COA HUTANG' }]}
                        labelLookup="COAHUT LOOKUP"
                        required={false}
                        selectedRequired={false}
                        endpoint="akunpusat"
                        label="COAHUT"
                        singleColumn={true}
                        pageSize={20}
                        showOnButton={true}
                        postData="keterangancoa"
                        dataToPost="coa"
                        lookupValue={(id) => {
                          forms.setValue('coahut', String(id ?? ''));
                        }}
                        onSelectRow={(val) =>
                          forms.setValue('coahut_text', val?.keterangancoa)
                        }
                        lookupNama={forms.getValues('coahut_text')}
                        disabled={mode === 'view' || mode === 'delete'}
                      />
                    </div>
                  </div>

                  <FormField
                    name="kota"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          KOTA
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

                  <FormField
                    name="kodepos"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          KODEPOS
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

                  <FormField
                    name="telp"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          TELP
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

                  <FormField
                    name="email"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          EMAIL
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

                  <FormField
                    name="fax"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          FAX
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

                  <FormField
                    name="web"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          WEB
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

                  <FormField
                    name="creditterm"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          CREDITTERM
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <InputNumeric
                              value={field.value ?? ''}
                              onValueChange={(value) =>
                                field.onChange(value ?? '')
                              }
                              readOnly={mode === 'view' || mode === 'delete'}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="credittermplus"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          CREDITTERMPLUS
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <InputNumeric
                              value={field.value ?? ''}
                              onValueChange={(value) =>
                                field.onChange(value ?? '')
                              }
                              readOnly={mode === 'view' || mode === 'delete'}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="npwp"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          NPWP
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

                  <FormField
                    name="alamatfakturpajak"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          ALAMATFAKTURPAJAK
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

                  <FormField
                    name="namapajak"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          NAMAPAJAK
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

                  <FormField
                    name="nominalpph21"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          NOMINALPPH21
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <InputCurrency
                              value={field.value ?? ''}
                              onValueChange={field.onChange}
                              readOnly={mode === 'view' || mode === 'delete'}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="nominalpph23"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          NOMINALPPH23
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <InputCurrency
                              value={field.value ?? ''}
                              onValueChange={field.onChange}
                              readOnly={mode === 'view' || mode === 'delete'}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="noskb"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          NOSKB
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

                  <FormField
                    name="tglskb"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          TGLSKB
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <InputDatePicker
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              disabled={mode === 'view' || mode === 'delete'}
                              showCalendar
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="nosk"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          NOSK
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

                  <FormField
                    name="tglsk"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={false}
                          className="font-semibold lg:w-[15%]"
                        >
                          TGLSK
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          <FormControl>
                            <InputDatePicker
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              disabled={mode === 'view' || mode === 'delete'}
                              showCalendar
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={false}
                        className="text-sm font-semibold"
                      >
                        Statusaktif
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      <LookUp
                        columns={[{ key: 'text', name: 'STATUS AKTIF' }]}
                        labelLookup="STATUSAKTIF LOOKUP"
                        required={false}
                        selectedRequired={false}
                        endpoint="parameter?grp=status+aktif"
                        label="STATUSAKTIF"
                        reduxKey="STATUS AKTIF"
                        singleColumn={true}
                        pageSize={20}
                        showOnButton={true}
                        postData="text"
                        dataToPost="id"
                        lookupValue={(id) => {
                          forms.setValue('statusaktif', String(id ?? ''));
                        }}
                        onSelectRow={(val) =>
                          forms.setValue('statusaktif_text', val?.text)
                        }
                        lookupNama={forms.getValues('statusaktif_text')}
                        disabled={mode === 'view' || mode === 'delete'}
                      />
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
          deleteMode={mode === 'delete'}
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

export default FormSupplier;
