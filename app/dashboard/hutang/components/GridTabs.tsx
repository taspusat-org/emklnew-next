'use client';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import GridHutangDetail from './GridHutangDetail';
import GridJurnalUmumDetail from '../../jurnalumumheader/components/GridJurnalUmumDetail';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';

export function GridTabs() {
  const [activeTab, setActiveTab] = useState('hutangdetail'); // Track tab aktif
  const headerData = useSelector((state: RootState) => state.header.headerData);
  return (
    <Tabs
      defaultValue={activeTab}
      onValueChange={setActiveTab}
      className="h-full w-full"
    >
      <TabsList className="flex w-full flex-row flex-wrap justify-start gap-1 rounded-t-sm border border-border bg-background-grid-header">
        <TabsTrigger value="hutangdetail">Hutang Detail</TabsTrigger>
        <TabsTrigger value="jurnalumumdetail">Jurnal Umum Detail</TabsTrigger>
      </TabsList>

      {/*
        `nobukti` sengaja TIDAK dioper: sebelumnya di-set dari
        headerData?.pengeluaran_nobukti — sisa salin-tempel dari modul
        pengeluaran yang selalu undefined di hutang. Kedua grid detail sudah
        jatuh ke headerData?.nobukti sendiri, jadi membiarkannya kosong justru
        memakai sumber yang benar (baris header hutang yang sedang dipilih).
      */}
      <TabsContent value="hutangdetail" className="h-full">
        <GridHutangDetail activeTab={activeTab} hyperlink={false} />
      </TabsContent>

      <TabsContent value="jurnalumumdetail" className="h-full">
        <GridJurnalUmumDetail activeTab={activeTab} />
      </TabsContent>
    </Tabs>
  );
}
