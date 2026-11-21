'use client';

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { fieldLength } from '@/lib/apis/field-length.api';
import PageContainer from '@/components/layout/page-container';
import { setFieldLength } from '@/lib/store/field-length/fieldLengthSlice';
import FilterGrid from './components/FilterGrid';
import GridPanjarHeader from './components/GridPanjarHeader';
import GridPanjarMuatanDetail from './components/GridPanjarMuatanDetail';

const Page = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fieldLength('panjarheader');
        dispatch(setFieldLength(result.data));
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
            <div className="col-span-10 border">
              <FilterGrid />
            </div>
            <div className="col-span-10 h-[500px]">
              <GridPanjarHeader />
            </div>
            <div className="col-span-10 h-[500px]">
              <GridPanjarMuatanDetail />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default Page;
