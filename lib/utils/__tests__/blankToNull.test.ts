import { blankToNull } from '@/lib/utils';

describe('blankToNull', () => {
  test('mengubah string kosong pada kolom relasi jadi null', () => {
    const values = {
      nobukti: '',
      relasi_id: '',
      bank_id: '   ',
      alatbayar_id: 'AB-01',
      coakaskeluar: ''
    };

    expect(
      blankToNull(values, [
        'relasi_id',
        'bank_id',
        'alatbayar_id',
        'coakaskeluar'
      ])
    ).toEqual({
      // kolom di luar daftar tidak disentuh
      nobukti: '',
      relasi_id: null,
      bank_id: null,
      alatbayar_id: 'AB-01',
      coakaskeluar: null
    });
  });

  test('membiarkan null, undefined, dan nilai non-string', () => {
    const values = { a: null, b: undefined, c: 0, d: false };

    expect(blankToNull(values, ['a', 'b', 'c', 'd'])).toEqual(values);
  });

  test('tidak memutasi objek asal', () => {
    const values = { relasi_id: '' };
    const result = blankToNull(values, ['relasi_id']);

    expect(values.relasi_id).toBe('');
    expect(result.relasi_id).toBeNull();
  });
});
