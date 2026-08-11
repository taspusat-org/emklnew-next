// FilterGrid.tsx
'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IoMdRefresh } from 'react-icons/io';
import { Button } from '@/components/ui/button';
import { RootState } from '@/lib/store/store';
import LookUp from '@/components/custom-ui/LookUp';
import { setPending, commitFilter } from '@/lib/store/filterSlice/filterSlice';
import PeriodeValidation from '@/components/custom-ui/PeriodeValidate';
import { JENISORDERMUATANNAMA } from '@/constants/biayaextraheader';

const FilterGrid = () => {
  const dispatch = useDispatch();
  const pending = useSelector((state: RootState) => state.filter.pending);
  const [triggerValidation, setTriggerValidation] = useState(false);

  const lookUpJenisOrderan = [
    {
      columns: [{ key: 'nama', name: 'JENIS ORDERAN' }],
      labelLookup: 'JENIS ORDERAN LOOKUP',
      selectedRequired: false,
      endpoint: 'JenisOrderan',
      label: 'JENIS ORDER',
      singleColumn: true,
      pageSize: 20,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const handleValidationResult = (isValid: boolean) => {
    if (!triggerValidation) return;
    setTriggerValidation(false);
    if (!isValid) return;

    // ✅ Atomic commit — satu action, satu re-render
    dispatch(commitFilter());
  };

  return (
    <div className={`flex h-[100%] w-full justify-center`}>
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
                    // jenisorder_id sudah uuid v7 bertipe text — simpan apa
                    // adanya, jangan dikonversi ke number seperti konstanta
                    // JENISORDER* lama (1,2,3,4) yang sudah tidak ada di DB.
                    dispatch(
                      setPending({
                        jenisOrderan: String(val?.id ?? ''),
                        jenisOrderanNama: val?.nama ?? ''
                      })
                    );
                  }}
                  onClear={() => {
                    dispatch(
                      setPending({ jenisOrderan: '', jenisOrderanNama: '' })
                    );
                  }}
                  lookupNama={pending.jenisOrderanNama || JENISORDERMUATANNAMA}
                />
              ))}
            </div>
          </div>

          <Button
            variant="default"
            className="mt-2 flex flex-row items-center justify-center"
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
