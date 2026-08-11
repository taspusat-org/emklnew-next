'use client';

import { IoMdRefresh } from 'react-icons/io';
import { Button } from '@/components/ui/button';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import InputDatePicker from '@/components/custom-ui/InputDatePicker';
import {
  commitFilter,
  setOnReload,
  setPending,
  setSelectedDate,
  setSelectedDate2
} from '@/lib/store/filterSlice/filterSlice';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import PeriodeValidation from '@/components/custom-ui/PeriodeValidate';
import { RootState } from '@/lib/store/store';

const FilterGrid = () => {
  const dispatch = useDispatch();
  const pending = useSelector((state: RootState) => state.filter.pending);
  const [triggerValidation, setTriggerValidation] = useState(false);

  const handleValidationResult = (isValid: boolean) => {
    if (!triggerValidation) return;
    setTriggerValidation(false);
    if (!isValid) return;

    // ✅ Atomic commit — satu action, satu re-render
    dispatch(commitFilter());
  };

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

          <Button
            variant="default"
            className="flex flex-row items-center justify-center"
            onClick={() => setTriggerValidation(true)}
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
