import {
  blHeaderSchema,
  blRincianBiayaSchema
} from '@/lib/validations/blheader.validation';

describe('blheader schema — id UUID teks', () => {
  const uuid = '02-019fef22-fa04-7f28-8de1-52d928f99d62';

  const headerBase = {
    shippinginstruction_nobukti: 'SI 0001/VIII/2026',
    tglbukti: '11-08-2026',
    voyberangkat: 'V-01',
    tglberangkat: '11-08-2026',
    details: [
      {
        bl_nobukti: 'BL 0001/VIII/2026',
        shippinginstructiondetail_nobukti: 'SID 0001',
        detailsrincian: [
          {
            orderanmuatan_nobukti: '1/VIII/MKT/OK/26',
            rincianbiaya: [
              {
                orderanmuatan_nobukti: '1/VIII/MKT/OK/26',
                nominal: '100000',
                biayaemkl_id: '02-B3D29E01-CB43-B571-BA94-DA97704BB869'
              }
            ]
          }
        ]
      }
    ]
  };

  test('menerima schedule/kapal/tujuan id berupa UUID teks', () => {
    const result = blHeaderSchema.safeParse({
      ...headerBase,
      schedule_id: uuid,
      kapal_id: uuid,
      tujuankapal_id: uuid
    });

    expect(result.success).toBe(true);
  });

  test('masih menerima id berupa angka (data lama)', () => {
    const result = blHeaderSchema.safeParse({
      ...headerBase,
      schedule_id: 12,
      kapal_id: 3,
      tujuankapal_id: 7
    });

    expect(result.success).toBe(true);
  });

  test('menolak NaN — hasil Number(uuid) yang dulu lolos diam-diam', () => {
    const result = blHeaderSchema.safeParse({
      ...headerBase,
      schedule_id: Number(uuid), // NaN
      kapal_id: Number(uuid),
      tujuankapal_id: Number(uuid)
    });

    expect(result.success).toBe(false);
  });

  test('menolak id kosong', () => {
    const result = blHeaderSchema.safeParse({
      ...headerBase,
      schedule_id: '',
      kapal_id: uuid,
      tujuankapal_id: uuid
    });

    expect(result.success).toBe(false);
  });

  test('biayaemkl_id menerima UUID teks tapi menolak NaN', () => {
    const row = {
      orderanmuatan_nobukti: '1/VIII/MKT/OK/26',
      nominal: '100000'
    };

    expect(
      blRincianBiayaSchema.safeParse({
        ...row,
        biayaemkl_id: '02-B3D29E01-CB43-B571-BA94-DA97704BB869'
      }).success
    ).toBe(true);

    expect(
      blRincianBiayaSchema.safeParse({ ...row, biayaemkl_id: NaN }).success
    ).toBe(false);
  });

  test('bldetail_id opsional menerima UUID teks', () => {
    const result = blRincianBiayaSchema.safeParse({
      orderanmuatan_nobukti: '1/VIII/MKT/OK/26',
      nominal: '100000',
      biayaemkl_id: '02-B3D29E01-CB43-B571-BA94-DA97704BB869',
      bldetail_id: uuid
    });

    expect(result.success).toBe(true);
  });
});
