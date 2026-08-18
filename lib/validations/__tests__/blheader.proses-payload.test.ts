import { blHeaderSchema } from '@/lib/validations/blheader.validation';

const rincianBiaya = [
  'BIAYA TRUCKING MUAT',
  'OPERATIONAL PELABUHAN',
  'DOKUMEN BL',
  'SEAL',
  'TEST11'
].map((nama, i) => ({
  id: '0',
  orderanmuatan_nobukti: '1/VIII/MKT/TT/26',
  nominal: '0', // processOnReload mengisi '0' (dulu '' → selalu ditolak zod)
  biayaemkl_id: `02-B3D29E01-CB43-000${i}-9EF7-C43D1246A7DA`,
  biayaemkl_nama: nama,
  isNew: false
}));

const payloadProses = {
  shippinginstruction_nobukti: 'SI 0003/VIII/2026',
  tglbukti: '14-08-2026',
  schedule_id: '02-019FFA84-A469-7D5B-A747-F0E675FC6C6A',
  voyberangkat: 'TES',
  kapal_id: '02-58D39E01-A8E6-0572-B49A-4A286C4A90BC',
  kapal_nama: 'ABC',
  tglberangkat: '14-08-2026',
  tujuankapal_id: '02-BAD29E01-5EFC-0075-AF47-A33B1D45A5FE',
  tujuankapal_nama: 'TUJUAN KAPAL 2',
  details: [
    {
      id: '0',
      bl_nobukti: 'DFFG545454', // diketik user di kolom NOMOR BL
      shippinginstructiondetail_nobukti: '0001/TAS/SI/ALKEN/MDN-TT/VIII/2026',
      asalpelabuhan: 'ASAL MUAT TEST1',
      keterangan: 'TES',
      consignee: 'PT TAS',
      shipper: 'ST',
      comodity: 'GENERAL CARGO',
      notifyparty: 'TES',
      emkllain_nama: 'TEST',
      pelayaran_nama: 'ALKEN',
      detailsrincian: [
        {
          id: '0',
          orderanmuatan_nobukti: '1/VIII/MKT/TT/26',
          nocontainer: '55156',
          noseal: '23134231',
          keterangan: '',
          isNew: false,
          rincianbiaya: rincianBiaya
        }
      ]
    }
  ]
};

test('payload hasil PROSES bisa langsung disimpan (tidak ditolak zod)', () => {
  const result = blHeaderSchema.safeParse(payloadProses);

  const pesan = result.success
    ? []
    : result.error.errors.map((e) => `${e.path.join('.')} -> ${e.message}`);

  expect(pesan).toEqual([]);
});

test("id baris baru dikirim '0' sebagai STRING, bukan angka", () => {
  // Semua id bertipe teks sejak migrasi UUID. Angka 0 harus ditolak supaya
  // ketahuan di frontend, bukan lolos ke backend lalu ditolak DTO-nya.
  const angka = blHeaderSchema.safeParse({
    ...payloadProses,
    details: [{ ...payloadProses.details[0], id: 0 as any }]
  });
  expect(angka.success).toBe(false);

  const teks = blHeaderSchema.safeParse({
    ...payloadProses,
    details: [{ ...payloadProses.details[0], id: '0' }]
  });
  expect(teks.success).toBe(true);
});

test('id UUID teks dari hasil edit tetap diterima', () => {
  const result = blHeaderSchema.safeParse({
    ...payloadProses,
    details: [
      {
        ...payloadProses.details[0],
        id: '02-019FFF2F-CA34-7B50-9516-13476006E83E'
      }
    ]
  });

  expect(result.success).toBe(true);
});

test('NOMINAL kosong diterima — kolomnya read-only, user tidak bisa mengisinya', () => {
  const result = blHeaderSchema.safeParse({
    ...payloadProses,
    details: [
      {
        ...payloadProses.details[0],
        detailsrincian: [
          {
            ...payloadProses.details[0].detailsrincian[0],
            rincianbiaya: [{ ...rincianBiaya[0], nominal: '' }]
          }
        ]
      }
    ]
  });

  expect(result.success).toBe(true);
});

test('JOB pada rincian biaya tetap wajib', () => {
  const result = blHeaderSchema.safeParse({
    ...payloadProses,
    details: [
      {
        ...payloadProses.details[0],
        detailsrincian: [
          {
            ...payloadProses.details[0].detailsrincian[0],
            rincianbiaya: [{ ...rincianBiaya[0], orderanmuatan_nobukti: '' }]
          }
        ]
      }
    ]
  });

  expect(result.success).toBe(false);
});
