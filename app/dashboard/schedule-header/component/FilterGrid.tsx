'use client';

import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { IoMdRefresh } from 'react-icons/io';
import { Button } from '@/components/ui/button';
import React, { useEffect, useState } from 'react';
import { RootState } from '@/lib/store/store';
import {
  setOnReload,
  setPending,
  commitFilter
} from '@/lib/store/filterSlice/filterSlice';
import PeriodeValidation from '@/components/custom-ui/PeriodeValidate';
import { RootState } from '@/lib/store/store';

const FilterGrid = () => {
  const dispatch = useDispatch();
  const pending = useSelector((state: RootState) => state.filter.pending);
  const [triggerValidation, setTriggerValidation] = useState(false);
  const { onReload } = useSelector((state: any) => state.filter);
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

  useEffect(() => {
    if (onReload) {
      dispatch(setOnReload(false)); // Simulate a reload operation
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
