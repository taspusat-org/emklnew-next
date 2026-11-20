import {
  ShipperSchema,
  ShipperInput
} from '@/lib/validations/shipper.validation';

describe('Shipper Schema Validation', () => {
  const validData: ShipperInput = {
    statusrelasi: '1',
    relasi_id: '1',
    nama: 'CONTOH NAMA',
    keterangan: 'CONTOH KETERANGAN',
    contactperson: 'CONTOH CONTACTPERSON',
    alamat: 'CONTOH ALAMAT',
    coa: 'CONTOH COA',
    coapiutang: 'CONTOH COAPIUTANG',
    coahutang: 'CONTOH COAHUTANG',
    kota: 'CONTOH KOTA',
    kodepos: 'CONTOH KOD',
    telp: 'CONTOH TELP',
    email: 'CONTOH EMAIL',
    fax: 'CONTOH FAX',
    web: 'CONTOH WEB',
    creditlimit: '1000',
    creditterm: '1',
    credittermplus: '1',
    npwp: 'CONTOH NPWP',
    coagiro: 'CONTOH COAGIRO',
    ppn: '1000',
    titipke: 'CONTOH TITIPKE',
    ppnbatalmuat: '1000',
    grup: 'CONTOH GRUP',
    formatdeliveryreport: '1',
    comodity: 'CONTOH COMODITY',
    namashippercetak: 'CONTOH NAMASHIPPERCETAK',
    formatcetak: '1',
    marketing_id: '1',
    blok: 'CONTOH BLOK',
    nomor: 'CONTOH NOMOR',
    rt: 'CONTOH RT',
    rw: 'CONTOH RW',
    kelurahan: 'CONTOH KELURAHAN',
    kabupaten: 'CONTOH KABUPATEN',
    kecamatan: 'CONTOH KECAMATAN',
    propinsi: 'CONTOH PROPINSI',
    isdpp10psn: '1000',
    usertracing: 'CONTOH USERTRACING',
    passwordtracing: 'CONTOH PASSWORDTRACING',
    kodeprospek: 'CONTOH KODEPROSPEK',
    namashipperprospek: 'CONTOH NAMASHIPPERPROSPEK',
    emaildelay: 'CONTOH EMAILDELAY',
    keterangan1barisinvoice: 'CONTOH KETERANGAN1BARISINVOICE',
    nik: 'CONTOH NIK',
    namaparaf: 'CONTOH NAMAPARAF',
    saldopiutang: '1000',
    keteranganshipperjobminus: 'CONTOH KETERANGANSHIPPERJOBMINUS',
    tglemailshipperjobminus: '01-01-2026',
    tgllahir: '01-01-2026',
    idshipperasal: '1',
    initial: 'CONTOH INITIAL',
    tipe: 'CONTOH TIPE',
    idtipe: '1',
    idinitial: '1',
    nshipperprospek: 'CONTOH NSHIPPERPROSPEK',
    parentshipper_id: '1',
    npwpnik: 'CONTOH NPWPNIK',
    nitku: 'CONTOH NITKU',
    kodepajak: 'CONTOH KOD',
    statusaktif: '1'
  };

  describe('Valid Data', () => {
    test('should validate complete valid data', () => {
      const result = ShipperSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should validate data with all optional fields filled', () => {
      const result = ShipperSchema.safeParse({
        ...validData,
        id: 'uuid-id',
        statusrelasi_text: 'TEKS STATUSRELASI',
        relasi_id_text: 'TEKS RELASI',
        marketing_id_text: 'TEKS MARKETING',
        idshipperasal_text: 'TEKS IDSHIPPERASAL',
        parentshipper_id_text: 'TEKS PARENTSHIPPER',
        statusaktif_text: 'TEKS STATUSAKTIF'
      });
      expect(result.success).toBe(true);
    });

    test('should allow null for optional fields', () => {
      const result = ShipperSchema.safeParse({
        ...validData,
        id: null,
        statusrelasi_text: null,
        relasi_id_text: null,
        marketing_id_text: null,
        idshipperasal_text: null,
        parentshipper_id_text: null,
        statusaktif_text: null
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Type Validation', () => {
    test('should fail when nama is not a string', () => {
      const result = ShipperSchema.safeParse({ ...validData, nama: 123 });
      expect(result.success).toBe(false);
    });

    test('should fail when relation id is a number instead of string', () => {
      const result = ShipperSchema.safeParse({
        ...validData,
        statusrelasi: 1
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should accept minimum valid values', () => {
      const result = ShipperSchema.safeParse({
        ...validData,
        nama: 'A',
        keterangan: 'A',
        contactperson: 'A',
        alamat: 'A',
        coa: 'A',
        coapiutang: 'A',
        coahutang: 'A',
        kota: 'A',
        kodepos: 'A',
        telp: 'A',
        email: 'A',
        fax: 'A',
        web: 'A',
        npwp: 'A',
        coagiro: 'A',
        titipke: 'A',
        grup: 'A',
        comodity: 'A',
        namashippercetak: 'A',
        blok: 'A',
        nomor: 'A',
        rt: 'A',
        rw: 'A',
        kelurahan: 'A',
        kabupaten: 'A',
        kecamatan: 'A',
        propinsi: 'A',
        usertracing: 'A',
        passwordtracing: 'A',
        kodeprospek: 'A',
        namashipperprospek: 'A',
        emaildelay: 'A',
        keterangan1barisinvoice: 'A',
        nik: 'A',
        namaparaf: 'A',
        keteranganshipperjobminus: 'A',
        initial: 'A',
        tipe: 'A',
        nshipperprospek: 'A',
        npwpnik: 'A',
        nitku: 'A',
        kodepajak: 'A'
      });
      expect(result.success).toBe(true);
    });

    test('should accept special characters in string fields', () => {
      const result = ShipperSchema.safeParse({
        ...validData,
        nama: 'A-B & Co. @#$%',
        keterangan: 'A-B & Co. @#$%',
        contactperson: 'A-B & Co. @#$%',
        alamat: 'A-B & Co. @#$%',
        coa: 'A-B & Co. @#$%',
        coapiutang: 'A-B & Co. @#$%',
        coahutang: 'A-B & Co. @#$%',
        kota: 'A-B & Co. @#$%',
        kodepos: 'A-B & Co. ',
        telp: 'A-B & Co. @#$%',
        email: 'A-B & Co. @#$%',
        fax: 'A-B & Co. @#$%',
        web: 'A-B & Co. @#$%',
        npwp: 'A-B & Co. @#$%',
        coagiro: 'A-B & Co. @#$%',
        titipke: 'A-B & Co. @#$%',
        grup: 'A-B & Co. @#$%',
        comodity: 'A-B & Co. @#$%',
        namashippercetak: 'A-B & Co. @#$%',
        blok: 'A-B & Co. @#$%',
        nomor: 'A-B & Co. @#$%',
        rt: 'A-B & Co. @#$%',
        rw: 'A-B & Co. @#$%',
        kelurahan: 'A-B & Co. @#$%',
        kabupaten: 'A-B & Co. @#$%',
        kecamatan: 'A-B & Co. @#$%',
        propinsi: 'A-B & Co. @#$%',
        usertracing: 'A-B & Co. @#$%',
        passwordtracing: 'A-B & Co. @#$%',
        kodeprospek: 'A-B & Co. @#$%',
        namashipperprospek: 'A-B & Co. @#$%',
        emaildelay: 'A-B & Co. @#$%',
        keterangan1barisinvoice: 'A-B & Co. @#$%',
        nik: 'A-B & Co. @#$%',
        namaparaf: 'A-B & Co. @#$%',
        keteranganshipperjobminus: 'A-B & Co. @#$%',
        initial: 'A-B & Co. @#$%',
        tipe: 'A-B & Co. @#$%',
        nshipperprospek: 'A-B & Co. @#$%',
        npwpnik: 'A-B & Co. @#$%',
        nitku: 'A-B & Co. @#$%',
        kodepajak: 'A-B & Co. '
      });
      expect(result.success).toBe(true);
    });
  });
});
