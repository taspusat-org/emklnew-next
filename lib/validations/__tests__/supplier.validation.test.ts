import {
  SupplierSchema,
  SupplierInput
} from '@/lib/validations/supplier.validation';

describe('Supplier Schema Validation', () => {
  const validData: SupplierInput = {
    nama: 'CONTOH NAMA',
    keterangan: 'CONTOH KETERANGAN',
    contactperson: 'CONTOH CONTACTPERSON',
    ktp: 'CONTOH KTP',
    alamat: 'CONTOH ALAMAT',
    coa: '1',
    coagiro: '1',
    coapiu: '1',
    coahut: '1',
    kota: 'CONTOH KOTA',
    kodepos: 'CONTOH KOD',
    telp: 'CONTOH TELP',
    email: 'CONTOH EMAIL',
    fax: 'CONTOH FAX',
    web: 'CONTOH WEB',
    creditterm: '1',
    credittermplus: '1',
    npwp: 'CONTOH NPWP',
    alamatfakturpajak: 'CONTOH ALAMATFAKTURPAJAK',
    namapajak: 'CONTOH NAMAPAJAK',
    nominalpph21: '1000',
    nominalpph23: '1000',
    noskb: 'CONTOH NOSKB',
    tglskb: '01-01-2026',
    nosk: 'CONTOH NOSK',
    tglsk: '01-01-2026',
    statusaktif: '1'
  };

  describe('Valid Data', () => {
    test('should validate complete valid data', () => {
      const result = SupplierSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should validate data with all optional fields filled', () => {
      const result = SupplierSchema.safeParse({
        ...validData,
        id: 'uuid-id',
        coa_text: 'TEKS COA',
        coagiro_text: 'TEKS COAGIRO',
        coapiu_text: 'TEKS COAPIU',
        coahut_text: 'TEKS COAHUT',
        statusaktif_text: 'TEKS STATUSAKTIF'
      });
      expect(result.success).toBe(true);
    });

    test('should allow null for optional fields', () => {
      const result = SupplierSchema.safeParse({
        ...validData,
        id: null,
        coa_text: null,
        coagiro_text: null,
        coapiu_text: null,
        coahut_text: null,
        statusaktif_text: null
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Type Validation', () => {
    test('should fail when nama is not a string', () => {
      const result = SupplierSchema.safeParse({ ...validData, nama: 123 });
      expect(result.success).toBe(false);
    });

    test('should fail when relation id is a number instead of string', () => {
      const result = SupplierSchema.safeParse({
        ...validData,
        coa: 1
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should accept minimum valid values', () => {
      const result = SupplierSchema.safeParse({
        ...validData,
        nama: 'A',
        keterangan: 'A',
        contactperson: 'A',
        ktp: 'A',
        alamat: 'A',
        kota: 'A',
        kodepos: 'A',
        telp: 'A',
        email: 'A',
        fax: 'A',
        web: 'A',
        npwp: 'A',
        alamatfakturpajak: 'A',
        namapajak: 'A',
        noskb: 'A',
        nosk: 'A'
      });
      expect(result.success).toBe(true);
    });

    test('should accept special characters in string fields', () => {
      const result = SupplierSchema.safeParse({
        ...validData,
        nama: 'A-B & Co. @#$%',
        keterangan: 'A-B & Co. @#$%',
        contactperson: 'A-B & Co. @#$%',
        ktp: 'A-B & Co. @#$%',
        alamat: 'A-B & Co. @#$%',
        kota: 'A-B & Co. @#$%',
        kodepos: 'A-B & Co. ',
        telp: 'A-B & Co. @#$%',
        email: 'A-B & Co. @#$%',
        fax: 'A-B & Co. @#$%',
        web: 'A-B & Co. @#$%',
        npwp: 'A-B & Co. @#$%',
        alamatfakturpajak: 'A-B & Co. @#$%',
        namapajak: 'A-B & Co. @#$%',
        noskb: 'A-B & Co. @#$%',
        nosk: 'A-B & Co. @#$%'
      });
      expect(result.success).toBe(true);
    });
  });
});
