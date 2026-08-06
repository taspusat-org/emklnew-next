// FilterGrid.tsx
'use client';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPending, commitFilter } from '@/lib/store/filterSlice/filterSlice';
import { RootState } from '@/lib/store/store';
import PeriodeValidation from '@/components/custom-ui/PeriodeValidate';
import { Button } from '@/components/ui/button';
import { IoMdRefresh } from 'react-icons/io';

/**
 * Dipindahkan dari pola lama (setSelectedDate/setSelectedDate2 + setOnReload)
 * ke pola pending/commit yang dipakai modul pengeluaran. Alasannya bukan gaya:
 * GridHutangHeader kini membaca `committed` dan me-reset window lazy-load hanya
 * saat filter benar-benar di-commit. Dengan pola lama, tiap ketukan di input
 * tanggal langsung mengubah state global dan memicu refetch + reset window di
 * tengah pengetikan.
 *
 * Beda dgn pengeluaran: hutang TIDAK punya filter bank, jadi hanya periode yang
 * di-pending/commit di sini.
 */
const FilterGrid = () => {
  const dispatch = useDispatch();
  const pending = useSelector((state: RootState) => state.filter.pending);
  const [triggerValidation, setTriggerValidation] = useState(false);

  const handleValidationResult = (isValid: boolean) => {
    if (!triggerValidation) return;
    setTriggerValidation(false);
    if (!isValid) return;

    // Atomic commit — satu action, satu re-render.
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
