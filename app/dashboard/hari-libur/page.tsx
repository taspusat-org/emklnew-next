'use client';
import PageContainer from '@/components/layout/page-container';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  setData,
  setType,
  setDefault
} from '@/lib/store/lookupSlice/lookupSlice';
import { getParameterFn } from '@/lib/apis/parameter.api';
import GridHariLibur from './components/GridHarilibur';
import { fieldLength } from '@/lib/apis/field-length.api';
import { setFieldLength } from '@/lib/store/field-length/fieldLengthSlice';
import { IParameter } from '@/lib/types/parameter.type';
import { getAllCabangFn } from '@/lib/apis/cabang.api';

const Page = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fieldLengthResult = await fieldLength('hari-libur');
        dispatch(setFieldLength(fieldLengthResult.data));

        const [getCabangLookup, getStatusAktifLookup] = await Promise.all([
          getAllCabangFn({ isLookUp: 'true' }),
          getParameterFn({ isLookUp: 'true' })
        ]);

        // CABANG
        if (getCabangLookup.type === 'local') {
          dispatch(setData({ key: 'CABANG', data: getCabangLookup.data }));
          const defaultValue =
            getCabangLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          dispatch(setDefault({ key: 'CABANG', isdefault: defaultValue }));
        }
        dispatch(setType({ key: 'CABANG', type: getCabangLookup.type }));

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
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsContent value="overview" className=" space-y-4">
          <div className="grid h-fit grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-10 h-[500px]">
              <GridHariLibur />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default Page;
