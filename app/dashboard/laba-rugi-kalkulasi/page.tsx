'use client';

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { fieldLength } from '@/lib/apis/field-length.api';
import { getParameterFn } from '@/lib/apis/parameter.api';
import { getAkunpusatFn } from '@/lib/apis/akunpusat.api';
import PageContainer from '@/components/layout/page-container';
import GridLabaRugiKalkulasi from './components/GridLabaRugiKalkulasi';
import { setFieldLength } from '@/lib/store/field-length/fieldLengthSlice';
import {
  setData,
  setType,
  setDefault
} from '@/lib/store/lookupSlice/lookupSlice';

interface ApiResponse {
  type: string;
  data: any; // Define a more specific type for data if possible
}

const Page = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fieldLength('penerimaanemkl');
        dispatch(setFieldLength(result.data));

        const [
          getStatusKomisiFinalMarketingLookup,
          getStatusFinalBonusTriwulanLookup
        ] = await Promise.all<ApiResponse>([
          getParameterFn({ isLookUp: 'true' }),
          getParameterFn({ isLookUp: 'true' })
        ]);

        // STATUS FINAL KOMISI MARKETING
        if (getStatusKomisiFinalMarketingLookup.type === 'local') {
          const grpsToFilter = ['STATUS NILAI'];

          grpsToFilter.forEach((grp) => {
            const filteredData =
              getStatusKomisiFinalMarketingLookup.data.filter(
                (item: any) => item.grp === grp
              );

            dispatch(setData({ key: grp, data: filteredData }));
            dispatch(
              setType({
                key: grp,
                type: getStatusKomisiFinalMarketingLookup.type
              })
            );

            const defaultValue = filteredData
              .map((item: any) => item.default)
              .find((val: any) => val !== null || '');

            dispatch(setDefault({ key: grp, isdefault: String(defaultValue) }));
          });
        }

        // STATUS FINAL BONUS TRIWULAN
        if (getStatusFinalBonusTriwulanLookup.type === 'local') {
          const grpsToFilter = ['STATUS NILAI'];

          grpsToFilter.forEach((grp) => {
            const filteredData = getStatusFinalBonusTriwulanLookup.data.filter(
              (item: any) => item.grp === grp
            );

            dispatch(setData({ key: grp, data: filteredData }));
            dispatch(
              setType({
                key: grp,
                type: getStatusFinalBonusTriwulanLookup.type
              })
            );

            const defaultValue = filteredData
              .map((item: any) => item.default)
              .find((val: any) => val !== null || '');

            dispatch(setDefault({ key: grp, isdefault: String(defaultValue) }));
          });
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [dispatch]);

  return (
    <PageContainer scrollable>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsContent value="overview" className="space-y-4">
          <div className="grid h-fit grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-10 h-[500px]">
              <GridLabaRugiKalkulasi />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default Page;
