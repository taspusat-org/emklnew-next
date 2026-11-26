import { EmklSchema, EmklInput } from '@/lib/validations/emkl.validation';

describe('Emkl Schema Validation', () => {
  const validData: EmklInput = {
    statusrelasi: '1',
    relasi_id: '1',
    nama: 'CONTOH NAMA',
    contactperson: 'CONTOH CONTACTPERSON',
    alamat: 'CONTOH ALAMAT',
    coagiro: '1',
    coapiutang: '1',
    coahutang: '1',
    kota: 'CONTOH KOTA',
    kodepos: 'CONTOH KODEPOS',
    notelp: 'CONTOH NOTELP',
    email: 'CONTOH EMAIL',
    fax: 'CONTOH FAX',
    alamatweb: 'CONTOH ALAMATWEB',
    top: '1000',
    npwp: 'CONTOH NPWP',
    namapajak: 'CONTOH NAMAPAJAK',
    alamatpajak: 'CONTOH ALAMATPAJAK',
    statustrado: '1',
    statusaktif: '1'
  };

  describe('Valid Data', () => {
    test('should validate complete valid data', () => {
      const result = EmklSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should validate data with all optional fields filled', () => {
      const result = EmklSchema.safeParse({
        ...validData,
        id: 'uuid-id',
        statusrelasi_text: 'TEKS STATUSRELASI',
        relasi_id_text: 'TEKS RELASI',
        coagiro_text: 'TEKS COAGIRO',
        coapiutang_text: 'TEKS COAPIUTANG',
        coahutang_text: 'TEKS COAHUTANG',
        statustrado_text: 'TEKS STATUSTRADO',
        statusaktif_text: 'TEKS STATUSAKTIF'
      });
      expect(result.success).toBe(true);
    });

    test('should allow null for optional fields', () => {
      const result = EmklSchema.safeParse({
        ...validData,
        id: null,
        statusrelasi_text: null,
        relasi_id_text: null,
        coagiro_text: null,
        coapiutang_text: null,
        coahutang_text: null,
        statustrado_text: null,
        statusaktif_text: null
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Type Validation', () => {
    test('should fail when nama is not a string', () => {
      const result = EmklSchema.safeParse({ ...validData, nama: 123 });
      expect(result.success).toBe(false);
    });

    test('should fail when relation id is a number instead of string', () => {
      const result = EmklSchema.safeParse({
        ...validData,
        statusrelasi: 1
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should accept minimum valid values', () => {
      const result = EmklSchema.safeParse({
        ...validData,
        nama: 'A',
        contactperson: 'A',
        alamat: 'A',
        kota: 'A',
        kodepos: 'A',
        notelp: 'A',
        email: 'A',
        fax: 'A',
        alamatweb: 'A',
        npwp: 'A',
        namapajak: 'A',
        alamatpajak: 'A'
      });
      expect(result.success).toBe(true);
    });

    test('should accept special characters in string fields', () => {
      const result = EmklSchema.safeParse({
        ...validData,
        nama: 'A-B & Co. @#$%',
        contactperson: 'A-B & Co. @#$%',
        alamat: 'A-B & Co. @#$%',
        kota: 'A-B & Co. @#$%',
        kodepos: 'A-B & Co. @#$%',
        notelp: 'A-B & Co. @#$%',
        email: 'A-B & Co. @#$%',
        fax: 'A-B & Co. @#$%',
        alamatweb: 'A-B & Co. @#$%',
        npwp: 'A-B & Co. @#$%',
        namapajak: 'A-B & Co. @#$%',
        alamatpajak: 'A-B & Co. @#$%'
      });
      expect(result.success).toBe(true);
    });
  });
});
