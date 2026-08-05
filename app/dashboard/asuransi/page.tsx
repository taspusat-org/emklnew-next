'use client';

import PageContainer from '@/components/layout/page-container';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import GridBank from './components/GridAsuransi';
import { fieldLength } from '@/lib/apis/field-length.api';

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setFieldLength } from '@/lib/store/field-length/fieldLengthSlice';
import { getParameterFn } from '@/lib/apis/parameter.api';
import {
  setData,
  setDefault,
  setType
} from '@/lib/store/lookupSlice/lookupSlice';
import { IParameter } from '@/lib/types/parameter.type';

const Page = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fieldLengthResult = await fieldLength('asuransi');
        dispatch(setFieldLength(fieldLengthResult.data));

        const [getStatusAktifLookup] = await Promise.all([
          getParameterFn({ isLookUp: 'true' })
        ]);

        if (
          getStatusAktifLookup.type === 'local' &&
          getStatusAktifLookup.data
        ) {
          const grpsToFilter = ['STATUS AKTIF'];

          grpsToFilter.forEach((grp) => {
            const filteredData = getStatusAktifLookup.data.filter(
              (item: IParameter) => item.grp === grp
            );

            if (filteredData.length > 0) {
              dispatch(setData({ key: grp, data: filteredData }));
              dispatch(setType({ key: grp, type: getStatusAktifLookup.type }));

              // Set default value jika ada. Baris non-default menyimpan default
              // sebagai string kosong (bukan null), jadi `!== null` salah memilih
              // baris pertama. Pilih baris yang benar-benar bertanda default 'YA'.
              const defaultItem = filteredData.find(
                (item: IParameter) => item.default === 'YA'
              );

              const defaultValue = defaultItem
                ? String(defaultItem.default)
                : '';

              dispatch(setDefault({ key: grp, isdefault: defaultValue }));
            }
          });
        }
      } catch (err) {
        console.error('Error fetching lookup data:', err);
      }
    };

    fetchData();
  }, [dispatch]);

  return (
    <PageContainer scrollable>
      <div className="grid h-fit grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-7 h-[500px]">
          <GridBank />
        </div>
      </div>
    </PageContainer>
  );
};

export default Page;
