import {
  GandenganSchema,
  GandenganInput
} from '@/lib/validations/gandengan.validation';

describe('Gandengan Schema Validation', () => {
  const validData: GandenganInput = {
    nama: 'CONTOH NAMA',
    keterangan: 'CONTOH KETERANGAN',
    statusaktif: '1'
  };

  describe('Valid Data', () => {
    test('should validate complete valid data', () => {
      const result = GandenganSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should validate data with all optional fields filled', () => {
      const result = GandenganSchema.safeParse({
        ...validData,
        id: 'uuid-id',
        statusaktif_text: 'TEKS STATUS AKTIF'
      });
      expect(result.success).toBe(true);
    });

    test('should allow null for optional fields', () => {
      const result = GandenganSchema.safeParse({
        ...validData,
        id: null,
        statusaktif_text: null
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Data - NAMA field', () => {
    test('should fail when nama is empty string', () => {
      const result = GandenganSchema.safeParse({ ...validData, nama: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((issue) => issue.path.includes('nama'))
        ).toBe(true);
        const fieldError = result.error.issues.find((issue) =>
          issue.path.includes('nama')
        );
        expect(fieldError?.message).toMatch(/NAMA/i);
      }
    });

    test('should fail when nama is only whitespace', () => {
      const result = GandenganSchema.safeParse({ ...validData, nama: '   ' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((issue) => issue.path.includes('nama'))
        ).toBe(true);
      }
    });

    test('should fail when nama is missing', () => {
      const { nama, ...rest } = validData;
      const result = GandenganSchema.safeParse(rest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((issue) => issue.path.includes('nama'))
        ).toBe(true);
      }
    });

    test('should fail when nama is longer than 100 characters', () => {
      const result = GandenganSchema.safeParse({
        ...validData,
        nama: 'X'.repeat(101)
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid Data - relasi (varchar id)', () => {
    test.each(['statusaktif'])(
      'should fail when %s is empty string',
      (field) => {
        const result = GandenganSchema.safeParse({ ...validData, [field]: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(
            result.error.issues.some((issue) => issue.path.includes(field))
          ).toBe(true);
        }
      }
    );

    test.each(['statusaktif'])('should fail when %s is missing', (field) => {
      const data: Record<string, unknown> = { ...validData };
      delete data[field];
      const result = GandenganSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((issue) => issue.path.includes(field))
        ).toBe(true);
      }
    });

    test('relation ids accept non-numeric varchar values', () => {
      const result = GandenganSchema.safeParse({
        ...validData,
        statusaktif: 'statusaktif-uuid'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Multiple Validation Errors', () => {
    test('should return all validation errors when all required fields are invalid', () => {
      const result = GandenganSchema.safeParse({
        nama: '',
        statusaktif: ''
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPaths = result.error.issues.map((issue) => issue.path[0]);
        expect(errorPaths).toContain('nama');
        expect(errorPaths).toContain('statusaktif');
      }
    });

    test('should handle completely empty object', () => {
      const result = GandenganSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Type Validation', () => {
    test('should fail when nama is not a string', () => {
      const result = GandenganSchema.safeParse({ ...validData, nama: 123 });
      expect(result.success).toBe(false);
    });

    test('should fail when relation id is a number instead of string', () => {
      const result = GandenganSchema.safeParse({
        ...validData,
        statusaktif: 1
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should accept minimum valid values', () => {
      const result = GandenganSchema.safeParse({
        ...validData,
        nama: 'A',
        keterangan: 'A'
      });
      expect(result.success).toBe(true);
    });

    test('should accept special characters in string fields', () => {
      const result = GandenganSchema.safeParse({
        ...validData,
        nama: 'A-B & Co. @#$%',
        keterangan: 'A-B & Co. @#$%'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Error Messages', () => {
    test('should provide descriptive error message for empty nama', () => {
      const result = GandenganSchema.safeParse({ ...validData, nama: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const fieldError = result.error.issues.find((issue) =>
          issue.path.includes('nama')
        );
        expect(fieldError?.message).toMatch(/NAMA.*WAJIB DIISI/i);
      }
    });
  });
});
