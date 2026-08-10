import {
  GENERIC_ERROR_MESSAGE,
  getFriendlyErrorMessage,
  isTechnicalErrorMessage,
  sanitizeAxiosError
} from '@/lib/utils/errorMessage';

const FK_JURNALUMUM =
  'insert into "jurnalumumdetail" ("coa", "created_at", "id", "info", "jurnalumum_id", "keterangan", "modifiedby", "nobukti", "nominal", "tglbukti", "updated_at") values ($1, $2, $3, DEFAULT, $4, $5, $6, $7, $8, $9, $10), ($11, $12, $13, DEFAULT, $14, $15, $16, $17, $18, $19, $20) returning * - insert or update on table "jurnalumumdetail" violates foreign key constraint "FK_jurnalumumdetail_coa_akunpusat"';

describe('isTechnicalErrorMessage', () => {
  test('mengenali pesan sql / constraint / stack trace', () => {
    expect(isTechnicalErrorMessage(FK_JURNALUMUM)).toBe(true);
    expect(
      isTechnicalErrorMessage('select * from "akunpusat" where "id" = $1')
    ).toBe(true);
    expect(isTechnicalErrorMessage('Internal server error')).toBe(true);
    expect(
      isTechnicalErrorMessage(
        "TypeError: Cannot read properties of undefined (reading 'coa')"
      )
    ).toBe(true);
  });

  test('membiarkan pesan yang memang ditulis untuk user', () => {
    expect(isTechnicalErrorMessage('COA WAJIB DIISI')).toBe(false);
    expect(
      isTechnicalErrorMessage('NO BUKTI SUDAH DIGUNAKAN, SILAKAN CEK KEMBALI')
    ).toBe(false);
    expect(isTechnicalErrorMessage('DATA TIDAK DITEMUKAN')).toBe(false);
  });
});

describe('getFriendlyErrorMessage', () => {
  test('fk violation menyebut kolom yang salah', () => {
    expect(getFriendlyErrorMessage(FK_JURNALUMUM)).toBe(
      'ISIAN COA BELUM DIPILIH ATAU TIDAK TERDAFTAR. SILAKAN PILIH DARI DAFTAR YANG TERSEDIA.'
    );
  });

  test('fk violation dengan nama constraint tak dikenal jatuh ke pesan umum', () => {
    expect(
      getFriendlyErrorMessage(
        'insert or update on table "hutangdetail" violates foreign key constraint "fk_relasi_123"'
      )
    ).toBe(
      'ADA ISIAN YANG BELUM DIPILIH ATAU TIDAK TERDAFTAR. SILAKAN PERIKSA KEMBALI DATA YANG DIINPUT.'
    );
  });

  test('data masih dipakai saat dihapus', () => {
    expect(
      getFriendlyErrorMessage(
        'delete from "akunpusat" where "id" = $1 - update or delete on table "akunpusat" violates foreign key constraint "FK_jurnalumumdetail_coa_akunpusat" on table "jurnalumumdetail"'
      )
    ).toBe(
      'DATA TIDAK DAPAT DIHAPUS ATAU DIUBAH KARENA MASIH DIGUNAKAN PADA DATA LAIN.'
    );
  });

  test('duplikat, not-null, dan panjang kolom', () => {
    expect(
      getFriendlyErrorMessage(
        'duplicate key value violates unique constraint "UQ_bank_kodebank"'
      )
    ).toBe('DATA SUDAH ADA. SILAKAN GUNAKAN NILAI YANG BERBEDA.');

    expect(
      getFriendlyErrorMessage(
        'null value in column "nobukti" of relation "hutangheader" violates not-null constraint'
      )
    ).toBe('KOLOM NOBUKTI WAJIB DIISI.');

    expect(
      getFriendlyErrorMessage(
        'value too long for type character varying(50) - update "bank" set "namabank" = $1'
      )
    ).toBe('ISIAN TERLALU PANJANG. SILAKAN PERPENDEK ISIAN ANDA.');
  });

  test('timeout / transaksi knex jadi pesan sistem sibuk', () => {
    const sibuk =
      'SISTEM SEDANG SIBUK MEMPROSES DATA LAIN. SILAKAN COBA BEBERAPA SAAT LAGI.';

    expect(
      getFriendlyErrorMessage(
        'Transaction query already complete, run with DEBUG=knex:tx for more info'
      )
    ).toBe(sibuk);
    expect(
      getFriendlyErrorMessage(
        'Request timeout: server took longer than 30 seconds'
      )
    ).toBe(sibuk);
  });

  test('pesan developer berbahasa inggris tidak lolos ke user', () => {
    expect(getFriendlyErrorMessage('Failed to fetch alatbayar data')).toBe(
      GENERIC_ERROR_MESSAGE
    );
  });

  test('pesan teknis tanpa aturan khusus jadi pesan umum', () => {
    expect(getFriendlyErrorMessage('Internal server error')).toBe(
      GENERIC_ERROR_MESSAGE
    );
    expect(getFriendlyErrorMessage(undefined)).toBe(GENERIC_ERROR_MESSAGE);
    expect(getFriendlyErrorMessage('')).toBe(GENERIC_ERROR_MESSAGE);
  });

  test('pesan bisnis dari backend tidak diubah', () => {
    expect(getFriendlyErrorMessage('NOMINAL DEBET DAN KREDIT HARUS SAMA')).toBe(
      'NOMINAL DEBET DAN KREDIT HARUS SAMA'
    );
  });
});

describe('sanitizeAxiosError', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('mengganti message teknis dan menyimpan aslinya di rawMessage', () => {
    const error = {
      response: {
        status: 500,
        data: { statusCode: 500, message: FK_JURNALUMUM }
      }
    };

    sanitizeAxiosError(error);

    expect(error.response.data.message).toBe(
      'ISIAN COA BELUM DIPILIH ATAU TIDAK TERDAFTAR. SILAKAN PILIH DARI DAFTAR YANG TERSEDIA.'
    );
    expect(
      (error.response.data as unknown as { rawMessage: string }).rawMessage
    ).toBe(FK_JURNALUMUM);
  });

  test('tidak menyentuh array issue zod dari respons 400', () => {
    const issues = [
      { path: ['tglbukti'], message: 'TANGGAL BUKTI WAJIB DIISI' }
    ];
    const error = {
      response: { status: 400, data: { statusCode: 400, message: issues } }
    };

    sanitizeAxiosError(error);

    expect(error.response.data.message).toBe(issues);
  });

  test('aman untuk error tanpa response', () => {
    expect(() => sanitizeAxiosError(new Error('Network Error'))).not.toThrow();
    expect(() => sanitizeAxiosError(undefined)).not.toThrow();
  });
});
