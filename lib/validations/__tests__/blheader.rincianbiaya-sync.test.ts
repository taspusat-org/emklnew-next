import { renderHook, act } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { blHeaderSchema } from '@/lib/validations/blheader.validation';

/**
 * react-hook-form MENYALIN objek yang dikirim ke setValue. Akibatnya state
 * `rincianByIndex` di FormBlHeader tidak ikut termutasi saat processOnReload
 * menempelkan `rincianbiaya` lewat path bertingkat — jadi menimpa
 * `details.N.detailsrincian` dengan isi state itu akan MEMBUANG rincianbiaya
 * dari form, dan submit gagal "details.0.detailsrincian.0.rincianbiaya:
 * Required" walau barisnya masih terlihat di layar.
 */
const RINCIAN_AWAL = [
  {
    orderanmuatan_nobukti: '1/VIII/MKT/TT/26',
    nocontainer: '55156',
    noseal: '23134231',
    keterangan: '',
    isNew: false
  }
];

const BIAYA = [
  {
    orderanmuatan_nobukti: '1/VIII/MKT/TT/26',
    nominal: '250000',
    biayaemkl_id: '02-B3D29E01-CB43-1E7B-9856-53C649418278',
    biayaemkl_nama: 'DOKUMEN BL',
    isNew: false
  }
];

const pakaiForm = () =>
  renderHook(() => useForm<any>({ defaultValues: { details: [] } })).result;

test('setValue di RHF menyalin objek — state lokal tidak ikut termutasi', () => {
  const result = pakaiForm();
  const rincianLokal = [{ ...RINCIAN_AWAL[0] }];

  act(() => {
    result.current.setValue('details.0.detailsrincian', rincianLokal);
    result.current.setValue('details.0.detailsrincian.0.rincianbiaya', BIAYA);
  });

  // Form punya rincianbiaya, objek lokal TIDAK. Ini akar masalahnya.
  expect(
    result.current.getValues('details.0.detailsrincian.0.rincianbiaya')
  ).toHaveLength(1);
  expect((rincianLokal[0] as any).rincianbiaya).toBeUndefined();
});

test('menimpa detailsrincian dari state akan membuang rincianbiaya (perilaku lama)', () => {
  const result = pakaiForm();
  const rincianLokal = [{ ...RINCIAN_AWAL[0] }];

  act(() => {
    result.current.setValue('details.0.detailsrincian', rincianLokal);
    result.current.setValue('details.0.detailsrincian.0.rincianbiaya', BIAYA);

    // handleRincianChange versi lama: timpa mentah-mentah dari rincianByIndex
    const current = [{ ...rincianLokal[0], keterangan: 'DIUBAH' }];
    result.current.setValue('details.0.detailsrincian', current);
  });

  expect(
    result.current.getValues('details.0.detailsrincian.0.rincianbiaya')
  ).toBeUndefined();
});

test('menggabung dengan nilai form mempertahankan rincianbiaya (perilaku sekarang)', () => {
  const result = pakaiForm();
  const rincianLokal = [{ ...RINCIAN_AWAL[0] }];

  act(() => {
    result.current.setValue('details.0.detailsrincian', rincianLokal);
    result.current.setValue('details.0.detailsrincian.0.rincianbiaya', BIAYA);

    // handleRincianChange versi sekarang: gabung dengan isi form
    const current = [{ ...rincianLokal[0], keterangan: 'DIUBAH' }];
    const dariForm =
      (result.current.getValues('details.0.detailsrincian') as any[]) ?? [];
    const gabungan = current.map((baris, idx) => ({
      ...(dariForm[idx] ?? {}),
      ...baris
    }));
    result.current.setValue('details.0.detailsrincian', gabungan);
  });

  const rincian = result.current.getValues('details.0.detailsrincian');
  expect(rincian[0].rincianbiaya).toHaveLength(1);
  expect(rincian[0].keterangan).toBe('DIUBAH');
});

test('payload hasil gabungan lolos blHeaderSchema', () => {
  const result = pakaiForm();
  const rincianLokal = [{ ...RINCIAN_AWAL[0] }];

  act(() => {
    result.current.setValue('details.0.detailsrincian', rincianLokal);
    result.current.setValue('details.0.detailsrincian.0.rincianbiaya', BIAYA);

    const current = [{ ...rincianLokal[0], keterangan: 'DIUBAH' }];
    const dariForm =
      (result.current.getValues('details.0.detailsrincian') as any[]) ?? [];
    result.current.setValue(
      'details.0.detailsrincian',
      current.map((baris, idx) => ({ ...(dariForm[idx] ?? {}), ...baris }))
    );

    result.current.setValue('details.0.bl_nobukti', 'BL TESTING 123');
    result.current.setValue(
      'details.0.shippinginstructiondetail_nobukti',
      '0001/TAS/SI/ALKEN/MDN-TT/VIII/2026'
    );
  });

  const parsed = blHeaderSchema.safeParse({
    shippinginstruction_nobukti: 'SI 0003/VIII/2026',
    tglbukti: '14-08-2026',
    schedule_id: '02-019FFA84-A469-7D5B-A747-F0E675FC6C6A',
    voyberangkat: 'TES',
    kapal_id: '02-58D39E01-A8E6-3E75-ADCB-9CA66E4AA92E',
    tglberangkat: '14-08-2026',
    tujuankapal_id: '02-BAD29E01-5EFC-2275-B049-FFDC224C9376',
    details: result.current.getValues('details')
  });

  expect(
    parsed.success ? [] : parsed.error.errors.map((e) => e.path.join('.'))
  ).toEqual([]);
});
