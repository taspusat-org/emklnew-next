import {
  PelayaranSchema,
  PelayaranInput
} from '@/lib/validations/pelayaran.validation';

describe('Pelayaran Schema Validation', () => {
  const validData: PelayaranInput = {
    relasi_id: '1',
    nama: 'CONTOH NAMA',
    keterangan: 'CONTOH KETERANGAN',
    statusaktif: '1'
  };

  describe('Valid Data', () => {
    test('should validate complete valid data', () => {
      const result = PelayaranSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should validate data with all optional fields filled', () => {
      const result = PelayaranSchema.safeParse({
        ...validData,
        id: 'uuid-id',
        relasi_id_text: 'TEKS RELASI',
        statusaktif_text: 'TEKS STATUSAKTIF'
      });
      expect(result.success).toBe(true);
    });

    test('should allow null for optional fields', () => {
      const result = PelayaranSchema.safeParse({
        ...validData,
        id: null,
        relasi_id_text: null,
        statusaktif_text: null
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Type Validation', () => {
    test('should fail when nama is not a string', () => {
      const result = PelayaranSchema.safeParse({ ...validData, nama: 123 });
      expect(result.success).toBe(false);
    });

    test('should fail when relation id is a number instead of string', () => {
      const result = PelayaranSchema.safeParse({
        ...validData,
        relasi_id: 1
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should accept minimum valid values', () => {
      const result = PelayaranSchema.safeParse({
        ...validData,
        nama: 'A',
        keterangan: 'A'
      });
      expect(result.success).toBe(true);
    });

    test('should accept special characters in string fields', () => {
      const result = PelayaranSchema.safeParse({
        ...validData,
        nama: 'A-B & Co. @#$%',
        keterangan: 'A-B & Co. @#$%'
      });
      expect(result.success).toBe(true);
    });
  });
});
