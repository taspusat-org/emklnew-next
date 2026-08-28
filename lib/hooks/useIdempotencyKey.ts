import { useCallback, useRef } from 'react';

// 20260820T113045 — hanya untuk memudahkan penelusuran di log/tabel; keunikan
// tetap datang dari UUID acak, bukan dari waktunya.
const stamp = (): string =>
  new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);

const newKey = (label?: string): string => {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;

  return [label, stamp(), random].filter(Boolean).join('-');
};

/**
 * Kunci idempotency untuk satu sesi form.
 *
 * `start()` dipanggil saat modal dibuka — satu form terbuka = satu kunci. Selama
 * isiannya tidak berubah, setiap SIMPAN memakai kunci yang sama, jadi kiriman
 * ulang setelah timeout dibalas hasil kiriman pertama, bukan membuat data kedua.
 *
 * Kunci diperbarui otomatis begitu isian berubah: itu permintaan yang berbeda,
 * dan memakai kunci lama akan ditolak backend (409, kunci dipakai untuk data
 * lain). `reset()` dipanggil setelah simpan berhasil supaya aksi berikutnya —
 * termasuk SIMPAN & TAMBAH yang membiarkan modal tetap terbuka — mulai dengan
 * kunci baru.
 */
export const useIdempotencyKey = () => {
  const session = useRef<{ key: string; payload: string | null } | null>(null);

  const start = useCallback((label?: string): string => {
    session.current = { key: newKey(label), payload: null };
    return session.current.key;
  }, []);

  const keyFor = useCallback((payload: unknown): string => {
    const serialized = JSON.stringify(payload ?? {});
    const active = session.current;

    if (!active || (active.payload !== null && active.payload !== serialized)) {
      session.current = { key: newKey(), payload: serialized };
      return session.current.key;
    }

    active.payload = serialized;
    return active.key;
  }, []);

  const reset = useCallback(() => {
    session.current = null;
  }, []);

  return { start, keyFor, reset };
};
