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
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import LookUp from '@/components/custom-ui/LookUp';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { IoMdClose } from 'react-icons/io';
import { FaSave } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { setSubmitClicked } from '@/lib/store/lookupSlice/lookupSlice';
import InputCurrency from '@/components/custom-ui/InputCurrency';
import { formatCurrency } from '@/lib/utils';

const FormMenu = ({
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
  const lookUpPropsStatusAktif = [
    {
      columns: [{ key: 'text', name: 'NAMA' }],
      // filterby: { class: 'system', method: 'get' },
      labelLookup: 'STATUS AKTIF LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+aktif',
      label: 'STATUS AKTIF',
      singleColumn: true,
      pageSize: 20,
      showOnButton: true,
      postData: 'text',
      dataToPost: 'id'
    }
  ];

  const lookUpPropsTujuankapal = [
    {
      columns: [{ key: 'nama', name: 'TUJUANKAPAL' }],
      labelLookup: 'TUJUAN KAPAL LOOKUP',
      required: true,
      selectedRequired: true,
      endpoint: 'tujuankapal',
      label: 'TUJUANKAPAL',
      singleColumn: true,
      pageSize: 20,
      showOnButton: true,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookUpPropsEmkl = [
    {
      columns: [{ key: 'nama', name: 'EMKL' }],
      labelLookup: 'EMKL LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'emkl',
      label: 'EMKL',
      singleColumn: true,
      pageSize: 20,
      showOnButton: true,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookUpPropsContainer = [
    {
      columns: [{ key: 'nama', name: 'CONTAINER' }],
      labelLookup: 'CONTAINER LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'container',
      label: 'CONTAINER',
      singleColumn: true,
      pageSize: 20,
      showOnButton: true,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const lookUpPropsJenisorderan = [
    {
      columns: [{ key: 'nama', name: 'JENIS ORDERAN' }],
      labelLookup: 'JENIS ORDERAN LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'jenisorderan',
      label: 'JENIS ORDERAN',
      singleColumn: true,
      pageSize: 20,
      showOnButton: true,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];
  const formRef = useRef<HTMLFormElement | null>(null); // Ref untuk form
  const openName = useSelector((state: RootState) => state.lookup.openName);
  const dispatch = useDispatch();

  return (
    <Dialog open={popOver} onOpenChange={setPopOver}>
      <DialogTitle hidden={true}>Title</DialogTitle>
      <DialogContent className="flex h-full min-w-full flex-col overflow-hidden border border-border bg-background">
        <div className="flex items-center justify-between bg-background-form-header px-2 py-2">
          <h2 className="text-sm font-semibold">
            {mode === 'add'
              ? 'Add Harga Trucking'
              : mode === 'edit'
              ? 'Edit Harga Trucking'
              : mode === 'delete'
              ? 'Delete Harga Trucking'
              : 'View Harga Trucking'}
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
                  {/* <FormField
                    name="tujuankapal_text"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          className="text-sm font-semibold lg:w-[15%]"
                        >
                          Tarif Detail
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookUpPropsTujuankapal.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupValue={(id) =>
                                forms.setValue('tujuankapal_id', id)
                              }
                              lookupNama={forms.getValues('tujuankapal_text')}
                              disabled={mode === 'view' || mode === 'delete'}
                            />
                          ))}
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  /> */}

                  <FormField
                    name="tujuankapal_text"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel
                          required={true}
                          className="text-sm font-semibold lg:w-[15%]"
                        >
                          Tujuan Kapal
                        </FormLabel>
                        <div className="flex flex-col lg:w-[85%]">
                          {lookUpPropsTujuankapal.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupValue={(id) =>
                                forms.setValue('tujuankapal_id', id)
                              }
                              lookupNama={forms.getValues('tujuankapal_text')}
                              disabled={mode === 'view' || mode === 'delete'}
                            />
                          ))}
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={true}
                        className="text-sm font-semibold"
                      >
                        EMKL
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsEmkl.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(id) => {
                            forms.setValue('emkl_id', id);
                          }}
                          lookupNama={forms.getValues('emkl_text')}
                          disabled={mode === 'view' || mode === 'delete'}
                        />
                      ))}
                    </div>
                  </div>
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
                        required={true}
                        className="text-sm font-semibold"
                      >
                        CONTAINER
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsContainer.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(id) => {
                            forms.setValue('container_id', id);
                          }}
                          lookupNama={forms.getValues('container_text')}
                          disabled={mode === 'view' || mode === 'delete'}
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
                        JENIS ORDERAN
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsJenisorderan.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(id) => {
                            forms.setValue('jenisorder_id', String(id ?? ''));
                          }}
                          lookupNama={forms.getValues('jenisorder_text')}
                          disabled={mode === 'view' || mode === 'delete'}
                        />
                      ))}
                    </div>
                  </div>
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
                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={true}
                        className="text-sm font-semibold"
                      >
                        Status Aktif
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsStatusAktif.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(id) =>
                            forms.setValue('statusaktif', String(id ?? ''))
                          }
                          onSelectRow={(val) =>
                            forms.setValue('statusaktif_uuid', val.uuid)
                          }
                          lookupNama={forms.getValues('text')}
                          disabled={mode === 'view' || mode === 'delete'}
                        />
                      ))}
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
          onSaveAndAdd={() => {
            onSubmit(true);
            dispatch(setSubmitClicked(true));
          }}
          onCancel={handleClose}
          isLoadingCreate={isLoadingCreate}
          isLoadingUpdate={isLoadingUpdate}
          isLoadingDelete={isLoadingDelete}
          deleteMode={mode === 'delete'}
        />
      </DialogContent>
    </Dialog>
  );
};

export default FormMenu;
