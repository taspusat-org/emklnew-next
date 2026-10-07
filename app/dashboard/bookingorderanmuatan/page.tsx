'use client';

import FilterGrid from './components/FilterGrid';
import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { getParameterFn } from '@/lib/apis/parameter.api';
import { fieldLength } from '@/lib/apis/field-length.api';
import PageContainer from '@/components/layout/page-container';
import { getJenisOrderanFn } from '@/lib/apis/jenisorderan.api';
import GridBookingMuatan from './components/GridBookingOrderanHeader';
import {
  setData,
  setDefault,
  setType
} from '@/lib/store/lookupSlice/lookupSlice';
import { RootState } from '@/lib/store/store';
import {
  JENISORDERANEXPORT,
  JENISORDERANIMPORT,
  JENISORDERBONGKARAN,
  JENISORDERBONGKARANNAMA,
  JENISORDEREKSPORTNAMA,
  JENISORDERIMPORTNAMA,
  JENISORDERMUATAN,
  JENISORDERMUATANNAMA
} from '@/constants/bookingorderan';
import { getContainerFn } from '@/lib/apis/container.api';
import { getShipperFn } from '@/lib/apis/shipper.api';
import { getTujuankapalFn } from '@/lib/apis/tujuankapal.api';
import { getMarketingHeaderFn } from '@/lib/apis/marketingheader.api';
import { getAllScheduleKapalFn } from '@/lib/apis/schedulekapal.api';
import { getPelayaranFn } from '@/lib/apis/pelayaran.api';
import { getJenisMuatanFn } from '@/lib/apis/jenismuatan.api';
import { getSandarKapalFn } from '@/lib/apis/sandarkapal.api';
import { getHargatruckingFn } from '@/lib/apis/hargatrucking.api';
import { getEmklFn } from '@/lib/apis/emkl.api';
import { getDaftarblFn } from '@/lib/apis/daftarbl.api';
import { getAllTradoFn } from '@/lib/apis/trado.api';
import { getAllGandenganFn } from '@/lib/apis/gandengan.api';
import { setFieldLength } from '@/lib/store/field-length/fieldLengthSlice';

interface ApiResponse {
  type: string;
  data: any; // Define a more specific type for data if possible
}

const Page = () => {
  const dispatch = useDispatch();
  const [modegrid, setModeGrid] = useState<string>('');
  const { selectedJenisOrderan, selectedJenisOrderanNama, onReload } =
    useSelector((state: RootState) => state.filter);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fieldLengthResult = await fieldLength('bookingorderanheader');
        dispatch(setFieldLength(fieldLengthResult.data));

        const [
          jenisOrderParameterLookup,
          containerLookup,
          shipperLookup,
          tujuanKapalLookup,
          marketingLookup,
          scheduleKapalLookup,
          pelayaranLookup,
          jenisMuatanLookup,
          sandarKapalLookup,
          parameterLookup,
          hargaTruckingLookup,
          emklLookup,
          daftarBlLookup,
          tradoLookup,
          gandenganLookup
        ] = await Promise.all<ApiResponse>([
          getParameterFn({
            isLookUp: 'true',
            filters: { grp: 'jenis orderan' }
          }),
          getContainerFn({ isLookUp: 'true' }),
          getShipperFn({ isLookUp: 'true' }),
          getTujuankapalFn({ isLookUp: 'true' }),
          getMarketingHeaderFn({ isLookUp: 'true' }),
          getAllScheduleKapalFn({ isLookUp: 'true' }),
          getPelayaranFn({ isLookUp: 'true' }),
          getJenisMuatanFn({ isLookUp: 'true' }),
          getSandarKapalFn({ isLookUp: 'true' }),
          getParameterFn({ isLookUp: 'true' }),
          getHargatruckingFn({ isLookUp: 'true' }),
          getEmklFn({ isLookUp: 'true' }),
          getDaftarblFn({ isLookUp: 'true' }),
          getAllTradoFn({ isLookUp: 'true' }),
          getAllGandenganFn({ isLookUp: 'true' })
        ]);

        if (jenisOrderParameterLookup.type === 'local') {
          dispatch(
            setData({
              key: 'JENIS ORDER',
              data: jenisOrderParameterLookup.data
            })
          );
          const defaultValue =
            jenisOrderParameterLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          // Dispatch the default data
          dispatch(setDefault({ key: 'JENIS ORDER', isdefault: defaultValue }));
          dispatch(
            setType({
              key: 'JENIS ORDER',
              type: jenisOrderParameterLookup.type
            })
          );
        }

        if (containerLookup.type === 'local') {
          dispatch(setData({ key: 'CONTAINER', data: containerLookup.data }));
          const defaultValue =
            containerLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          // Dispatch the default data
          dispatch(setDefault({ key: 'CONTAINER', isdefault: defaultValue }));
          dispatch(setType({ key: 'CONTAINER', type: containerLookup.type }));
        }

        if (shipperLookup.type === 'local') {
          dispatch(setData({ key: 'SHIPPER', data: shipperLookup.data }));
          const defaultValue =
            shipperLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          // Dispatch the default data
          dispatch(setDefault({ key: 'SHIPPER', isdefault: defaultValue }));
          dispatch(setType({ key: 'SHIPPER', type: shipperLookup.type }));
        }

        if (tujuanKapalLookup.type === 'local') {
          dispatch(
            setData({ key: 'TUJUAN KAPAL', data: tujuanKapalLookup.data })
          );
          const defaultValue =
            tujuanKapalLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          // Dispatch the default data
          dispatch(
            setDefault({ key: 'TUJUAN KAPAL', isdefault: defaultValue })
          );
          dispatch(
            setType({ key: 'TUJUAN KAPAL', type: tujuanKapalLookup.type })
          );
        }

        if (marketingLookup.type === 'local') {
          dispatch(setData({ key: 'MARKETING', data: marketingLookup.data }));
          const defaultValue =
            marketingLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          // Dispatch the default data
          dispatch(setDefault({ key: 'MARKETING', isdefault: defaultValue }));
          dispatch(setType({ key: 'MARKETING', type: marketingLookup.type }));
        }

        // if (scheduleKapalLookup.type === 'local') {
        //   dispatch(setData({ key: 'SCHEDULE KAPAL', data: scheduleKapalLookup.data }));
        //   const defaultValue = scheduleKapalLookup.data
        //     .map((item: any) => item.default)
        //     .find((val: any) => val !== null) || '';

        //   // Dispatch the default data
        //   dispatch(setDefault({ key: 'SCHEDULE KAPAL', isdefault: defaultValue }));
        //   dispatch(setType({ key: 'SCHEDULE KAPAL', type: scheduleKapalLookup.type }));
        // }

        if (pelayaranLookup.type === 'local') {
          dispatch(setData({ key: 'PELAYARAN', data: pelayaranLookup.data }));
          const defaultValue =
            pelayaranLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          // Dispatch the default data
          dispatch(setDefault({ key: 'PELAYARAN', isdefault: defaultValue }));
          dispatch(setType({ key: 'PELAYARAN', type: pelayaranLookup.type }));
        }

        if (jenisMuatanLookup.type === 'local') {
          dispatch(
            setData({ key: 'JENISMUATAN', data: jenisMuatanLookup.data })
          );
          const defaultValue =
            jenisMuatanLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          // Dispatch the default data
          dispatch(setDefault({ key: 'JENISMUATAN', isdefault: defaultValue }));
          dispatch(
            setType({ key: 'JENISMUATAN', type: jenisMuatanLookup.type })
          );
        }

        if (sandarKapalLookup.type === 'local') {
          dispatch(
            setData({ key: 'SANDARKAPAL', data: sandarKapalLookup.data })
          );
          const defaultValue =
            sandarKapalLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          // Dispatch the default data
          dispatch(setDefault({ key: 'SANDARKAPAL', isdefault: defaultValue }));
          dispatch(
            setType({ key: 'SANDARKAPAL', type: sandarKapalLookup.type })
          );
        }

        if (parameterLookup.type === 'local') {
          const statusNilaiData = parameterLookup.data.filter(
            (item: any) => item.grp === 'STATUS NILAI'
          );

          const multipleKey = [
            'STATUS TRADO LUAR',
            'STATUS PISAH BL',
            'STATUS JOB PTD',
            'STATUS TRANSIT',
            'STATUS STUFFING DEPO',
            'STATUS OPEN DOOR',
            'STATUS BATAL MUAT',
            'STATUS SOC',
            'STATUS PENGURUSAN DOOR EKSPEDISI LAIN'
          ];

          multipleKey.forEach((labelKey) => {
            dispatch(setData({ key: labelKey, data: statusNilaiData }));
            dispatch(setType({ key: labelKey, type: parameterLookup.type }));

            const defaultValue = statusNilaiData
              .map((item: any) => item.default)
              .find((val: any) => val !== null || '');

            dispatch(
              setDefault({ key: labelKey, isdefault: String(defaultValue) })
            );
          });
        }

        if (hargaTruckingLookup.type === 'local') {
          dispatch(
            setData({ key: 'HARGA TRUCKING', data: hargaTruckingLookup.data })
          );
          const defaultValue =
            hargaTruckingLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          // Dispatch the default data
          dispatch(
            setDefault({ key: 'HARGA TRUCKING', isdefault: defaultValue })
          );
          dispatch(
            setType({ key: 'HARGA TRUCKING', type: hargaTruckingLookup.type })
          );
        }

        if (emklLookup.type === 'local') {
          dispatch(setData({ key: 'EMKL', data: emklLookup.data }));
          const defaultValue =
            emklLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          // Dispatch the default data
          dispatch(setDefault({ key: 'EMKL', isdefault: defaultValue }));
          dispatch(setType({ key: 'EMKL', type: emklLookup.type }));
        }

        if (daftarBlLookup.type === 'local') {
          dispatch(setData({ key: 'DAFTAR BL', data: daftarBlLookup.data }));
          const defaultValue =
            daftarBlLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          // Dispatch the default data
          dispatch(setDefault({ key: 'DAFTAR BL', isdefault: defaultValue }));
          dispatch(setType({ key: 'DAFTAR BL', type: daftarBlLookup.type }));
        }

        if (tradoLookup.type === 'local') {
          dispatch(setData({ key: 'TRADO', data: tradoLookup.data }));
          const defaultValue =
            tradoLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          // Dispatch the default data
          dispatch(setDefault({ key: 'TRADO', isdefault: defaultValue }));
          dispatch(setType({ key: 'TRADO', type: tradoLookup.type }));
        }

        if (gandenganLookup.type === 'local') {
          dispatch(setData({ key: 'GANDENGAN', data: gandenganLookup.data }));
          const defaultValue =
            gandenganLookup.data
              .map((item: any) => item.default)
              .find((val: any) => val !== null) || '';

          // Dispatch the default data
          dispatch(setDefault({ key: 'GANDENGAN', isdefault: defaultValue }));
          dispatch(setType({ key: 'GANDENGAN', type: gandenganLookup.type }));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [dispatch]);

  // useEffect(() => {
  //

  // if (onReload) {
  // setGrid(selectedJenisOrderan);
  const renderedGrid = () => {
    switch (selectedJenisOrderan) {
      case JENISORDERMUATAN:
        return <GridBookingMuatan />;
      case JENISORDERBONGKARAN:
        return <></>;
      case JENISORDERANIMPORT:
        return <></>;
      case JENISORDERANEXPORT:
        return <></>;
      default:
        return <GridBookingMuatan />;
    }
  };
  // }
  // }, [onReload, selectedJenisOrderan])

  useEffect(() => {
    if (onReload) {
      setModeGrid(selectedJenisOrderanNama);
    }
  }, [onReload, selectedJenisOrderanNama]);

  return (
    <PageContainer scrollable>
      <div className="grid h-fit grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-10 border">
          <FilterGrid />
        </div>
        <div className="col-span-10 h-[500px]">
          {/* {renderedGrid()} */}
          {modegrid == JENISORDERMUATANNAMA ? (
            <GridBookingMuatan />
          ) : modegrid == JENISORDERBONGKARANNAMA ? (
            <></>
          ) : modegrid == JENISORDERIMPORTNAMA ? (
            <></>
          ) : modegrid == JENISORDEREKSPORTNAMA ? (
            <></>
          ) : (
            <GridBookingMuatan />
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default Page;
