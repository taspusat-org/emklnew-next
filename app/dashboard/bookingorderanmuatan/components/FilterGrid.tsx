'use client';
import React, { useEffect, useState } from 'react';
import { CalendarIcon } from '@radix-ui/react-icons';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import InputMask from 'react-input-mask';
import LookUp from '@/components/custom-ui/LookUp';
import { useDispatch } from 'react-redux';
import { RootState } from '@/lib/store/store';
import {
  setOnReload,
  setPending,
  commitFilter,
  setSelectedJenisOrderan,
  setSelectedJenisOrderanNama
} from '@/lib/store/filterSlice/filterSlice';
import { useSelector } from 'react-redux';
import { IoReload } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { IoMdRefresh } from 'react-icons/io';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import { JENISORDERMUATANNAMA } from '@/constants/bookingorderan';
import PeriodeValidation from '@/components/custom-ui/PeriodeValidate';

const FilterGrid = () => {
  const dispatch = useDispatch();
  const { onReload } = useSelector((state: any) => state.filter);
  const [triggerValidation, setTriggerValidation] = useState(false);
  const pending = useSelector((state: RootState) => state.filter.pending);

  const onSubmit = () => {
    setTriggerValidation(true);
  };

  const handleValidationResult = (isValid: boolean) => {
    if (triggerValidation) {
      if (isValid) {
        dispatch(commitFilter());
      }
      setTriggerValidation(false);
    }
  };

  const lookUpJenisOrderan = [
    {
      columns: [{ key: 'subgrp', name: 'subgrp' }],
      labelLookup: 'JENIS ORDERAN LOOKUP',
      selectedRequired: false,
      endpoint: 'parameter?grp=jenis+orderan',
      label: 'JENIS ORDER',
      singleColumn: true,
      pageSize: 20,
      postData: 'subgrp',
      dataToPost: 'id'
    }
  ];

  useEffect(() => {
    if (onReload) {
      // Simulate a reload operation
      dispatch(setOnReload(false));
    }
  }, [onReload]);

  return (
    <div className={`flex h-[100%] w-full justify-center`}>
      <div className="flex h-[100%]  w-full flex-col rounded-sm border border-border bg-background-grid-header">
        <div className="flex h-[30px] w-full flex-row items-center rounded-t-sm border-b border-border px-2" />
        <div className="bg-background-header p-4">
          <PeriodeValidation
            label="periode"
            date1={pending.tglDari}
            date2={pending.tglSampai}
            onDate1Change={(val) => dispatch(setPending({ tglDari: val }))}
            onDate2Change={(val) => dispatch(setPending({ tglSampai: val }))}
            onValidationChange={handleValidationResult}
            triggerValidation={triggerValidation}
          />

          <div className="mt-2 flex w-[50%] flex-col items-center justify-between lg:flex-row">
            <label htmlFor="" className="w-full text-sm font-bold lg:w-[20%]">
              Jenis Orderan:
              <span style={{ color: 'red', marginLeft: '4px' }}>*</span>
            </label>
            <div className="relative w-full lg:w-[60%]">
              {lookUpJenisOrderan.map((props, index) => (
                <LookUp
                  key={index}
                  {...props}
                  onSelectRow={(val) => {
                    dispatch(setSelectedJenisOrderan(String(val.id ?? '')));
                    dispatch(setSelectedJenisOrderanNama(val.subgrp));
                  }}
                  onClear={() => {
                    dispatch(setSelectedJenisOrderan(''));
                    dispatch(setSelectedJenisOrderanNama(''));
                  }}
                  lookupNama={JENISORDERMUATANNAMA}
                />
              ))}
            </div>
          </div>

          <Button
            variant="default"
            className="mt-2 flex flex-row items-center justify-center"
            onClick={onSubmit}
          >
            <IoMdRefresh />
            <p style={{ fontSize: 12 }} className="font-normal">
              Reload
            </p>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterGrid;
