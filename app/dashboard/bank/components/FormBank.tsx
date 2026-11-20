import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store/store';
import LookUp from '@/components/custom-ui/LookUp';
import FormFooterButtons from '@/components/custom-ui/FormFooterButtons';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { IoMdClose } from 'react-icons/io';
import { FaSave } from 'react-icons/fa';
import { setSubmitClicked } from '@/lib/store/lookupSlice/lookupSlice';

interface FormBankProps {
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

const FormBank = ({
  popOver,
  setPopOver,
  forms,
  onSubmit,
  mode,
  handleClose,
  isLoadingCreate,
  isLoadingUpdate,
  isLoadingDelete
}: FormBankProps) => {
  const lookUpPropsStatusAktif = [
    {
      columns: [{ key: 'text', name: 'STATUS' }],
      labelLookup: 'STATUS AKTIF LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+aktif',
      label: 'STATUS AKTIF',
      singleColumn: true,
      pageSize: 20,
      dataToPost: 'id',
      showOnButton: true,
      postData: 'text'
    }
  ];

  const lookUpPropsCOA = [
    {
      columns: [
        { key: 'coa', name: 'COA' },
        { key: 'keterangancoa', name: 'KETERANGANCOA' }
      ],
      labelLookup: 'COA LOOKUP',
      required: false,
      selectedRequired: false,
      endpoint: 'akunpusat',
      label: 'AKUNPUSAT',
      singleColumn: false,
      pageSize: 20,
      postData: 'keterangancoa',
      dataToPost: 'coa',
      showOnButton: true
    }
  ];

  const lookUpPropsCOAGantung = [
    {
      columns: [
        { key: 'coa', name: 'COA' },
        { key: 'keterangancoa', name: 'KETERANGANCOA' }
      ],
      labelLookup: 'COA GANTUNG LOOKUP',
      required: false,
      selectedRequired: false,
      endpoint: 'akunpusat',
      label: 'COA GANTUNG',
      singleColumn: false,
      pageSize: 20,
      showOnButton: true,
      postData: 'keterangancoa',
      dataToPost: 'coa'
    }
  ];

  const lookUpPropsStatusDefault = [
    {
      columns: [{ key: 'text', name: 'STATUS NILAI' }],
      labelLookup: 'STATUS DEFAULT LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+nilai',
      label: 'STATUS NILAI',
      singleColumn: true,
      pageSize: 20,
      dataToPost: 'id',
      showOnButton: true,
      postData: 'text'
    }
  ];

  const lookUpPropsStatusBank = [
    {
      columns: [{ key: 'text', name: 'STATUS BANK' }],
      labelLookup: 'STATUS BANK LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=status+bank',
      label: 'STATUS BANK',
      singleColumn: true,
      pageSize: 20,
      dataToPost: 'id',
      showOnButton: true,
      postData: 'text'
    }
  ];

  const lookUpPropsFormatPenerimaan = [
    {
      columns: [{ key: 'text', name: 'PENERIMAAN' }],
      labelLookup: 'FORMAT PENERIMAAN LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=penerimaan&subgrp=nomor+penerimaan',
      label: 'PENERIMAAN',
      singleColumn: true,
      pageSize: 20,
      dataToPost: 'id',
      showOnButton: true,
      postData: 'text'
    }
  ];

  const lookUpPropsFormatPengeluaran = [
    {
      columns: [{ key: 'text', name: 'PENGELUARAN' }],
      labelLookup: 'FORMAT PENGELUARAN LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=pengeluaran&subgrp=nomor+pengeluaran',
      label: 'PENGELUARAN',
      singleColumn: true,
      pageSize: 20,
      dataToPost: 'id',
      showOnButton: true,
      postData: 'text'
    }
  ];

  const lookUpPropsFormatPenerimaanGantung = [
    {
      columns: [{ key: 'text', name: 'PENERIMAAN GANTUNG' }],
      labelLookup: 'FORMAT PENERIMAAN GANTUNG LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint:
        'parameter?grp=penerimaan+gantung&subgrp=nomor+penerimaan+gantung',
      label: 'PENERIMAAN GANTUNG',
      singleColumn: true,
      pageSize: 20,
      dataToPost: 'id',
      showOnButton: true,
      postData: 'text'
    }
  ];

  const lookUpPropsFormatPengeluaranGantung = [
    {
      columns: [{ key: 'text', name: 'PENGELUARAN GANTUNG' }],
      labelLookup: 'FORMAT PENGELUARAN GANTUNG LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint:
        'parameter?grp=pengeluaran+gantung&subgrp=nomor+pengeluaran+gantung',
      label: 'PENGELUARAN GANTUNG',
      singleColumn: true,
      pageSize: 20,
      dataToPost: 'id',
      showOnButton: true,
      postData: 'text'
    }
  ];

  const lookUpPropsFormatPencairan = [
    {
      columns: [{ key: 'text', name: 'PENCAIRAN' }],
      labelLookup: 'FORMAT PENCAIRAN LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=pencairan&subgrp=nomor+pencairan',
      label: 'PENCAIRAN',
      singleColumn: true,
      pageSize: 20,
      dataToPost: 'id',
      showOnButton: true,
      postData: 'text'
    }
  ];

  const lookUpPropsFormatRekapPenerimaan = [
    {
      columns: [{ key: 'text', name: 'REKAP PENERIMAAN' }],
      labelLookup: 'FORMAT REKAP PENERIMAAN LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint: 'parameter?grp=rekap+penerimaan&subgrp=nomor+rekap+penerimaan',
      label: 'REKAP PENERIMAAN',
      singleColumn: true,
      pageSize: 20,
      dataToPost: 'id',
      showOnButton: true,
      postData: 'text'
    }
  ];

  const lookUpPropsFormatRekapPengeluaran = [
    {
      columns: [{ key: 'text', name: 'REKAP PENGELUARAN' }],
      labelLookup: 'FORMAT REKAP PENGELUARAN LOOKUP',
      required: true,
      selectedRequired: false,
      endpoint:
        'parameter?grp=rekap+pengeluaran&subgrp=nomor+rekap+pengeluaran',
      label: 'REKAP PENGELUARAN',
      singleColumn: true,
      pageSize: 20,
      dataToPost: 'id',
      showOnButton: true,
      postData: 'text'
    }
  ];

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
              ? 'Add Bank '
              : mode === 'edit'
              ? 'Edit Bank '
              : mode === 'delete'
              ? 'Delete Bank '
              : 'View Bank '}
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
                          required={true}
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

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel className="text-sm font-semibold">
                        COA
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsCOA.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(value: any) => {
                            forms.setValue('coa', value);
                            forms.trigger('coagantung');
                          }}
                          lookupNama={forms.getValues('keterangancoa')}
                          disabled={['view', 'delete'].includes(mode)}
                        />
                      ))}
                    </div>
                  </div>

                  <FormField
                    name="coagantung"
                    control={forms.control}
                    render={({ field }) => (
                      <FormItem className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                        <FormLabel className="text-sm font-semibold">
                          COA GANTUNG
                        </FormLabel>
                        <div className="w-full lg:w-[85%]">
                          {lookUpPropsCOAGantung.map((props, index) => (
                            <LookUp
                              key={index}
                              {...props}
                              lookupValue={(value: any) => {
                                field.onChange(value);
                                forms.trigger('coagantung');
                              }}
                              lookupNama={forms.getValues(
                                'keterangancoagantung'
                              )}
                              disabled={['view', 'delete'].includes(mode)}
                            />
                          ))}
                          <FormMessage />{' '}
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
                        Status Bank
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsStatusBank.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(value) => {
                            forms.setValue('statusbank', value);
                          }}
                          lookupNama={forms.getValues('statusbank_text')}
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
                        Status Aktif
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsStatusAktif.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(id) => {
                            forms.setValue('statusaktif', id);
                          }}
                          lookupNama={forms.getValues('text')}
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
                        Status Default
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsStatusDefault.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(value) => {
                            forms.setValue('statusdefault', value);
                          }}
                          lookupNama={forms.getValues('statusdefault_text')}
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
                        Format Penerimaan
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsFormatPenerimaan.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(value) => {
                            forms.setValue('formatpenerimaan', value);
                          }}
                          lookupNama={forms.getValues('formatpenerimaantext')}
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
                        Format Pengeluaran
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsFormatPengeluaran.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(value) => {
                            forms.setValue('formatpengeluaran', value);
                          }}
                          lookupNama={forms.getValues('formatpengeluarantext')}
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
                        Format Penerimaan Gantung
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsFormatPenerimaanGantung.map(
                        (props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value) => {
                              forms.setValue('formatpenerimaangantung', value);
                            }}
                            lookupNama={forms.getValues(
                              'formatpenerimaangantungtext'
                            )}
                            disabled={mode === 'view' || mode === 'delete'}
                          />
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={true}
                        className="text-sm font-semibold"
                      >
                        Format Pengeluaran Gantung
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsFormatPengeluaranGantung.map(
                        (props, index) => (
                          <LookUp
                            key={index}
                            {...props}
                            lookupValue={(value) => {
                              forms.setValue('formatpengeluarangantung', value);
                            }}
                            lookupNama={forms.getValues(
                              'formatpengeluarangantungtext'
                            )}
                            disabled={mode === 'view' || mode === 'delete'}
                          />
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex w-full flex-col justify-between lg:flex-row lg:items-center">
                    <div className="w-full lg:w-[15%]">
                      <FormLabel
                        required={true}
                        className="text-sm font-semibold"
                      >
                        Format Pencairan
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsFormatPencairan.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(value) => {
                            forms.setValue('formatpencairan', value);
                          }}
                          lookupNama={forms.getValues('formatpencairantext')}
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
                        Format Rekap Penerimaan
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsFormatRekapPenerimaan.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(value) => {
                            forms.setValue('formatrekappenerimaan', value);
                          }}
                          lookupNama={forms.getValues(
                            'formatrekappenerimaantext'
                          )}
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
                        Format Rekap Pengeluaran
                      </FormLabel>
                    </div>
                    <div className="w-full lg:w-[85%]">
                      {lookUpPropsFormatRekapPengeluaran.map((props, index) => (
                        <LookUp
                          key={index}
                          {...props}
                          lookupValue={(value) => {
                            forms.setValue('formatrekappengeluaran', value);
                          }}
                          lookupNama={forms.getValues(
                            'formatrekappengeluarantext'
                          )}
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
          deleteMode={mode === 'delete'}
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

export default FormBank;
