// FilterGrid.tsx
'use client';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPending, commitFilter } from '@/lib/store/filterSlice/filterSlice';
import { RootState } from '@/lib/store/store';
import PeriodeValidation from '@/components/custom-ui/PeriodeValidate';
import LookUp from '@/components/custom-ui/LookUp';
import { Button } from '@/components/ui/button';
import { IoMdRefresh } from 'react-icons/io';

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
    <div className="flex h-[100%] w-full justify-center">
      <div className="flex h-[100%] w-full flex-col rounded-sm border border-border bg-background-grid-header">
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
            <label className="w-full text-sm font-bold lg:w-[20%]">
              Bank:
              <span style={{ color: 'red', marginLeft: '4px' }}>*</span>
            </label>
            <div className="relative w-full lg:w-[60%]">
              <LookUp
                key={'bankfilter'}
                columns={[{ key: 'nama', name: 'BANK' }]}
                labelLookup="BANK LOOKUP"
                label="BANK FILTER"
                required
                selectedRequired={false}
                endpoint="bank"
                singleColumn
                pageSize={20}
                showOnButton
                postData="nama"
                dataToPost="id"
                onSelectRow={(val) =>
                  dispatch(setPending({ bank_id: val.id, bank_nama: val.nama }))
                }
                onClear={() =>
                  dispatch(setPending({ bank_id: '', bank_nama: '' }))
                }
                lookupNama={pending.bank_nama}
              />
            </div>
          </div>

          <div className="mt-2 flex gap-2">
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
    </div>
  );
};

export default FilterGrid;
