'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WifiOff, Wifi, RefreshCw, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  useOfflineOverlay,
  offlineOverlayStore
} from '@/lib/store/client/useOfflineOverlay';

const AUTO_PROBE_MS = 15_000;

const jam = (): string =>
  new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

export default function OfflineOverlay() {
  const { isVisible, returnPath, hide } = useOfflineOverlay();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastFailedAt, setLastFailedAt] = useState<string | null>(null);
  const checkingRef = useRef(false);

  // Probe a real HTTP request — navigator.onLine can be a false positive
  const verifyConnection = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) return false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000);
    try {
      await fetch('/favicon.ico', {
        cache: 'no-store',
        signal: controller.signal
      });
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  const runCheck = useCallback(
    async (manual: boolean) => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      if (manual) setIsChecking(true);

      const connected = await verifyConnection();

      checkingRef.current = false;
      setIsChecking(false);

      if (connected) {
        setLastFailedAt(null);
        setIsOnline(true);
        setTimeout(() => {
          hide();
          setIsOnline(false);
          // returnPath was saved at the moment the request failed
          router.push(returnPath);
        }, 1_000);
        return;
      }

      // Tanpa ini tombol COBA LAGI terasa mati saat koneksi masih putus:
      // spinner sekejap lalu tidak ada apa-apa lagi di layar.
      setLastFailedAt(jam());
    },
    [verifyConnection, hide, returnPath, router]
  );

  const handleRetry = useCallback(() => void runCheck(true), [runCheck]);

  // Auto-detect: event 'online' + probe berkala, karena browser bisa tetap
  // merasa online padahal jaringannya tidak sampai ke mana-mana.
  useEffect(() => {
    if (!isVisible) return;

    const handleOnline = () => void runCheck(false);
    window.addEventListener('online', handleOnline);
    const timer = setInterval(() => void runCheck(false), AUTO_PROBE_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(timer);
    };
  }, [isVisible, runCheck]);

  // Reset local state whenever overlay is hidden
  useEffect(() => {
    if (!isVisible) {
      setIsOnline(false);
      setIsChecking(false);
      setLastFailedAt(null);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Tidak ada koneksi internet"
      // pointer-events-auto WAJIB: overlay ini sering muncul saat dialog Radix
      // (form master) sedang terbuka, dan dialog modal menyetel
      // `pointer-events: none` di <body> — tanpa ini tombolnya tidak bisa diklik.
      className="pointer-events-auto fixed inset-0 z-[2147483646] flex items-center justify-center overflow-y-auto bg-slate-100/95 p-4 backdrop-blur-sm dark:bg-zinc-950/95"
    >
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40 sm:p-8">
        <div className="mb-6 flex justify-center">
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-200',
              isOnline
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
            )}
          >
            <span className="relative flex h-2 w-2">
              {!isOnline && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75 motion-reduce:hidden" />
              )}
              <span
                className={cn(
                  'relative inline-flex h-2 w-2 rounded-full',
                  isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                )}
              />
            </span>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="mb-5 flex justify-center">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-2xl border transition-colors duration-300',
              isOnline
                ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'border-slate-200 bg-slate-100 text-slate-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
            )}
          >
            {isOnline ? (
              <Wifi className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
            ) : (
              <WifiOff className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
            )}
          </div>
        </div>

        <h1 className="mb-2 text-center text-[18px] font-bold uppercase leading-snug tracking-wide text-slate-900 dark:text-zinc-50 sm:text-[20px]">
          {isOnline ? 'Koneksi Pulih' : 'Tidak Ada Koneksi Internet'}
        </h1>

        {/* normal-case: aturan global `* { text-transform: uppercase }` membuat
            kalimat penjelas jadi kapital semua dan sulit dibaca. */}
        <p className="mx-auto mb-6 max-w-[46ch] text-center text-[14px] normal-case leading-relaxed text-slate-600 dark:text-zinc-400">
          {isOnline
            ? 'Jaringan terdeteksi. Mengarahkan kembali ke halaman sebelumnya.'
            : 'Permintaan gagal karena jaringan terputus. Periksa koneksi Anda, lalu coba lagi.'}
        </p>

        <div aria-live="polite" className="min-h-[1.25rem]">
          {isOnline ? (
            <div className="mb-1 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
              <span className="text-[14px] font-medium normal-case">
                Mengalihkan…
              </span>
            </div>
          ) : lastFailedAt ? (
            <p className="mb-1 text-center text-[12px] normal-case text-rose-600 dark:text-rose-400">
              Koneksi masih terputus — terakhir diperiksa {lastFailedAt}.
            </p>
          ) : null}
        </div>

        {!isOnline && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={handleRetry}
              disabled={isChecking}
              aria-busy={isChecking}
              className="h-[44px] flex-1 cursor-pointer gap-2 rounded-lg bg-[#2563eb] text-[13px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#1d4ed8] focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-70 dark:focus-visible:ring-offset-zinc-900"
            >
              <RefreshCw
                className={cn(
                  'h-4 w-4',
                  isChecking && 'animate-spin motion-reduce:animate-none'
                )}
                aria-hidden="true"
              />
              {isChecking ? 'Memeriksa…' : 'Coba Lagi'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                offlineOverlayStore.getState().hide();
                router.push('/dashboard');
              }}
              className="h-[44px] flex-1 cursor-pointer gap-2 rounded-lg border-slate-300 bg-white text-[13px] font-semibold uppercase tracking-wide text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-zinc-700 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:ring-offset-zinc-900"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Ke Dashboard
            </Button>
          </div>
        )}

        {!isOnline && (
          <p className="mt-6 border-t border-slate-100 pt-4 text-center text-[12px] normal-case leading-relaxed text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
            Halaman ini memeriksa koneksi sendiri setiap 15 detik.
          </p>
        )}
      </div>
    </div>
  );
}
