'use client';

import { IoMdRefresh } from 'react-icons/io';
import { Button } from '@/components/ui/button';
import React, { useEffect, useState } from 'react';
import LookUp from '@/components/custom-ui/LookUp';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import {
  setOnReload,
  setPending,
  commitFilter,
  setSelectedJenisOrderan,
  setSelectedJenisOrderanNama
} from '@/lib/store/filterSlice/filterSlice';
import PeriodeValidation from '@/components/custom-ui/PeriodeValidate';
import { JENISORDERMUATANNAMA } from '@/constants/orderan';

const FilterGrid = () => {
  const dispatch = useDispatch();
  const { onReload } = useSelector((state: any) => state.filter);
  const [triggerValidation, setTriggerValidation] = useState(false);
  // PeriodeValidation sekarang komponen CONTROLLED — nilainya harus dikirim
  // dari sini. Tanpa date1/date2 kedua input tanggal render kosong, dan tanpa
  // onDate1Change/onDate2Change mengetik di dalamnya melempar TypeError.
  const pending = useSelector((state: RootState) => state.filter.pending);

  const lookUpJenisOrderan = [
    {
      columns: [{ key: 'nama', name: 'JENIS ORDERAN' }],
      labelLookup: 'JENIS ORDERAN LOOKUP',
      // required: true,
      selectedRequired: false,
      endpoint: 'JenisOrderan',
      label: 'JENIS ORDER',
      singleColumn: true,
      pageSize: 20,
      postData: 'nama',
      dataToPost: 'id'
    }
  ];

  const onSubmit = () => {
    setTriggerValidation(true);
  };

  const handleValidationResult = (isValid: boolean) => {
    if (triggerValidation) {
      if (isValid) {
        // Satu action: menyalin pending -> committed, menyinkronkan
        // selectedDate/selectedDate2 yang masih dibaca GridOrderanMuatan, dan
        // menyalakan onReload.
        dispatch(commitFilter());
      }
      setTriggerValidation(false);
    }
  };

  // Tanggal default (awal–akhir bulan berjalan) sudah disiapkan di initialState
  // filterSlice, jadi tidak perlu di-set ulang dari sini.

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
                  // TANPA Number(): id jenisorder sudah UUIDv7 bertipe teks
                  // (slice pun mengetiknya string). Number(uuid) = NaN, itu yang
                  // membuat filter jenis orderan terkirim sebagai `null`.
                  onSelectRow={(val) => {
                    dispatch(setSelectedJenisOrderan(String(val.id ?? '')));
                    dispatch(setSelectedJenisOrderanNama(val.nama));
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
