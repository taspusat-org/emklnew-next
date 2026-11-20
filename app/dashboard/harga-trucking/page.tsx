'use client';

import PageContainer from '@/components/layout/page-container';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import GridHargatrucking from './components/GridHargatrucking';
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
import { getTujuankapalFn } from '@/lib/apis/tujuankapal.api';
import { getAllCabangFn } from '@/lib/apis/cabang.api';
import { getEmklFn } from '@/lib/apis/emkl.api';
import { getContainerFn } from '@/lib/apis/container.api';
import { getJenisOrderanFn } from '@/lib/apis/jenisorderan.api';
import { getHargatruckingFn } from '@/lib/apis/hargatrucking.api';
import { IParameter } from '@/lib/types/parameter.type';

interface ApiResponse {
  type: string;
  data: any; // Define a more specific type for data if possible
}

const Page = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fieldLength('hargatrucking');
        dispatch(setFieldLength(result.data));

        const [
          getTujuankapalLookup,
          getEmklLookup,
          getContainerLookup,
          getJenisOrderanLookup,
          getStatusAktifLookup
        ] = await Promise.all<ApiResponse>([
          getTujuankapalFn({
            isLookUp: 'true',
            filters: { cabang_id: 'null' }
          }),
          getEmklFn({ isLookUp: 'true' }),
          getContainerFn({ isLookUp: 'true' }),
          getJenisOrderanFn({ isLookUp: 'true' }),
          getParameterFn({ isLookUp: 'true' })
        ]);

        // TUJUAN KAPAL
        if (getTujuankapalLookup.type === 'local') {
          dispatch(
            setData({ key: 'TUJUANKAPAL', data: getTujuankapalLookup.data })
          );
          const defaultValue =
            getTujuankapalLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          dispatch(setDefault({ key: 'TUJUANKAPAL', isdefault: defaultValue }));
        }
        dispatch(
          setType({ key: 'TUJUANKAPAL', type: getTujuankapalLookup.type })
        );

        // EMKL
        if (getEmklLookup.type === 'local') {
          dispatch(setData({ key: 'EMKL', data: getEmklLookup.data }));
          const defaultValue =
            getEmklLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          dispatch(setDefault({ key: 'EMKL', isdefault: defaultValue }));
        }
        dispatch(setType({ key: 'EMKL', type: getEmklLookup.type }));

        // CONTAINER
        if (getContainerLookup.type === 'local') {
          dispatch(
            setData({ key: 'CONTAINER', data: getContainerLookup.data })
          );
          const defaultValue =
            getContainerLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          dispatch(setDefault({ key: 'CONTAINER', isdefault: defaultValue }));
        }

        dispatch(setType({ key: 'CONTAINER', type: getContainerLookup.type }));

        // JENIS ORDERAN
        if (getJenisOrderanLookup.type === 'local') {
          dispatch(
            setData({ key: 'JENIS ORDERAN', data: getJenisOrderanLookup.data })
          );
          const defaultValue =
            getJenisOrderanLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          dispatch(
            setDefault({ key: 'JENIS ORDERAN', isdefault: defaultValue })
          );
        }
        dispatch(
          setType({ key: 'JENIS ORDERAN', type: getJenisOrderanLookup.type })
        );

        if (
          getStatusAktifLookup.type === 'local' &&
          getStatusAktifLookup.data
        ) {
          const grpsToFilter = ['STATUS AKTIF'];

          grpsToFilter.forEach((grp) => {
            const filteredData = getStatusAktifLookup.data.filter(
              (item: IParameter) => item.grp === grp
            );

            dispatch(setData({ key: grp, data: filteredData }));
            dispatch(setType({ key: grp, type: getStatusAktifLookup.type }));

            const defaultItem = filteredData.find(
              (item: IParameter) => item.default === 'YA'
            );

            const defaultValue = defaultItem ? String(defaultItem.default) : '';

            dispatch(setDefault({ key: grp, isdefault: String(defaultValue) }));
          });
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [dispatch]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fieldLength('container');
        dispatch(setFieldLength(result.data));
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
      }
    };

    fetchData();
  }, [dispatch]);
  return (
    <PageContainer scrollable>
      <div className="grid h-fit grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-10 h-[500px]">
          <GridHargatrucking />
        </div>
      </div>
    </PageContainer>
  );
};

export default Page;
