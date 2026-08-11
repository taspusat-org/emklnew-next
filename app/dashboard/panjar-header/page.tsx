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

/**
 * Hanya ADA SATU grid detail.
 *
 * Sebelumnya halaman ini memilih komponen detail lewat `switch (selectedJenisOrderan)`
 * memakai konstanta JENISORDER* (1,2,3,4). Dua hal membuatnya tidak pernah benar:
 *
 *  1. jenisorder_id di database sudah uuid v7 bertipe text, jadi tidak akan
 *     pernah sama dengan angka 1..4 — switch-nya SELALU jatuh ke `default`.
 *  2. Database cuma punya satu tabel detail (`panjarmuatandetail`), dan
 *     PanjarheaderService memang menulis detail SEMUA jenis orderan ke sana.
 *     Endpoint `/panjarbongkarandetail` yang dipanggil GridPanjaranBongkaranDetail
 *     tidak pernah ada.
 *
 * Jadi detail panjar apa pun jenis orderannya dibaca dari grid yang sama.
 * GridPanjaranBongkaranDetail.tsx dibiarkan di repo tapi sudah tidak dirender.
 */
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
