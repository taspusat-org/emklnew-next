import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios';
import { getSession, signOut } from 'next-auth/react';
import { deleteCookie } from './cookie-actions';
import { clearCredentials } from '../store/authSlice/authSlice';
import { persistor, store } from '../store/store';
import { clearPdfUrls } from '../store/pdfSlice/pdfSlice';
import { clearReport } from '../store/reportSlice/reportSlice';
import { clearSearch } from '../store/searchLookupSlice/searchLookupSlice';
import { alertStore } from '../store/client/useAlert';
import { offlineOverlayStore } from '../store/client/useOfflineOverlay';
import { setProcessed } from '../store/loadingSlice/loadingSlice';
import { sanitizeAxiosError } from './errorMessage';
import { queryClient } from './queryClient';

// ─── HTTP method classification ───────────────────────────────────────────────
// Only mutation methods get the shorter timeout + abort-on-offline
// behavior.  Read methods (get/head/options) use a long timeout so they are
// never cut short by the mutation timeout logic.
const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete']);
// Harus LEBIH LAMA dari REQUEST_TIMEOUT_MS backend (default 30s). Kalau browser
// yang menyerah duluan, ia tidak pernah tahu apakah datanya sempat di-commit;
// kalau server yang menyerah, jawabannya pasti: 408 = transaksi sudah rollback.
const MUTATION_TIMEOUT_MS = 35_000; // CUD requests
const READ_TIMEOUT_MS = 60_000; // GET/HEAD/OPTIONS

// Browser yang menyerah tidak tahu nasib datanya, jadi jangan bilang "gagal".
// Dipakai juga untuk 504: gateway di depan aplikasi yang menyerah sama tidak
// tahunya dengan browser — ia tidak tahu apa pun soal transaksi backend.
const TIMEOUT_MESSAGE_CLIENT =
  'PERMINTAAN MELEBIHI BATAS WAKTU. DATA MUNGKIN SUDAH TERSIMPAN — PERIKSA DAFTARNYA DULU SEBELUM MENYIMPAN ULANG.';
// HANYA untuk 408 dari TimeoutInterceptor backend, yang tidak pernah dikirim
// untuk request yang sudah masuk tahap commit — jadi "tidak tersimpan" di sini
// memang kepastian, bukan tebakan.
const TIMEOUT_MESSAGE_SERVER =
  'PERMINTAAN MELEBIHI BATAS WAKTU DAN DIBATALKAN SERVER. DATA TIDAK TERSIMPAN, SILAKAN COBA LAGI.';

const isMutationMethod = (method?: string): boolean =>
  MUTATION_METHODS.has((method ?? '').toLowerCase());

// ─── Global offline tracking ──────────────────────────────────────────────────
// Chrome DevTools "Offline" does NOT drop existing TCP connections, so we cannot
// rely on the XHR failing on its own.  Instead we track every in-flight mutation
// request with an AbortController and forcibly abort them the moment the browser
// fires the "offline" event.  That immediately triggers an ERR_CANCELED error in
// the response interceptor, which then shows the offline overlay.
let networkOffline = false;
const activeMutationControllers = new Set<AbortController>();

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => {
    networkOffline = true;
    // Actively abort every in-flight mutation so we don't wait for the request
    // to time out or for the server to finish its work.
    activeMutationControllers.forEach((ctrl) => ctrl.abort());
  });

  window.addEventListener('online', () => {
    networkOffline = false;
  });
}

interface TokenCache {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number;
}

class SessionTokenCache {
  private static instance: SessionTokenCache;
  private cache: TokenCache = {
    accessToken: null,
    refreshToken: null,
    expiresAt: 0
  };

  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  private sessionPromise: Promise<string | null> | null = null;

  private constructor() {
    this.initializeToken();
  }

  static getInstance(): SessionTokenCache {
    if (!SessionTokenCache.instance) {
      SessionTokenCache.instance = new SessionTokenCache();
    }
    return SessionTokenCache.instance;
  }

  /**
   * ✅ Helper: Check if current route is public
   */
  private isPublicRoute(): boolean {
    if (typeof window === 'undefined') return false;

    const publicPaths = [
      '/auth/signin',
      '/auth/signup',
      '/auth/reset-password',
      '/auth/forgot-password',
      '/auth/error'
    ];

    return publicPaths.some((path) =>
      window.location.pathname.startsWith(path)
    );
  }

  private async initializeToken(): Promise<void> {
    try {
      const session = await getSession();

      if (session?.error) {
        console.error('⛔ Session has error, logging out...');
        await this.handleLogout();
        return;
      }

      if (session?.token) {
        this.updateCache({
          accessToken: session.token,
          refreshToken: session.refreshToken || null,
          expiresAt: session.accessTokenExpires
            ? new Date(session.accessTokenExpires).getTime()
            : 0
        });
      }
    } catch (error) {
      console.error('❌ Failed to initialize token:', error);
    }
  }

  async getAccessToken(): Promise<string | null> {
    // 1. Check cache
    if (this.cache.accessToken && this.isTokenValid()) {
      return this.cache.accessToken;
    }

    // 2. Use existing session promise
    if (this.sessionPromise) {
      return this.sessionPromise;
    }

    // 3. Fetch new session
    this.sessionPromise = this.fetchSessionToken();

    try {
      const token = await this.sessionPromise;
      return token;
    } finally {
      this.sessionPromise = null;
    }
  }

  private async fetchSessionToken(): Promise<string | null> {
    try {
      const session = await getSession();

      if (session?.error) {
        console.error('⛔ Session contains error:', session.error);

        // ✅ PERBAIKAN: Jangan logout jika di public route
        if (!this.isPublicRoute()) {
          await this.handleLogout();
        }
        return null;
      }

      if (session?.token) {
        this.updateCache({
          accessToken: session.token,
          refreshToken: session.refreshToken || null,
          expiresAt: session.accessTokenExpires
            ? new Date(session.accessTokenExpires).getTime()
            : 0
        });
        return session.token;
      }

      // ✅ No session
      console.warn('⚠️ No valid session found');

      // ✅ PERBAIKAN: Jangan logout jika di public route
      if (!this.isPublicRoute()) {
        await this.handleLogout();
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to fetch session token:', error);
      return null;
    }
  }

  private isTokenValid(): boolean {
    if (!this.cache.expiresAt) return true;
    const bufferTime = 2 * 60 * 1000;
    return Date.now() < this.cache.expiresAt - bufferTime;
  }

  updateCache(newCache: TokenCache): void {
    this.cache = newCache;
  }

  async handleTokenRefresh(): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token: string) => {
          resolve(token);
        });
      });
    }

    this.isRefreshing = true;

    try {
      const session = await getSession();

      if (session?.error) {
        console.error('⛔ Session has error during refresh:', session.error);
        throw new Error('Session contains error: ' + session.error);
      }

      if (!session?.token) {
        console.error('⛔ No session or token available');
        throw new Error('No valid session');
      }

      this.updateCache({
        accessToken: session.token,
        refreshToken: session.refreshToken || null,
        expiresAt: session.accessTokenExpires
          ? new Date(session.accessTokenExpires).getTime()
          : 0
      });

      this.refreshSubscribers.forEach((callback) =>
        callback(session.token as string)
      );
      this.refreshSubscribers = [];

      return session.token;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);

      this.refreshSubscribers.forEach((callback) => callback(''));
      this.refreshSubscribers = [];

      // ✅ PERBAIKAN: Jangan logout jika di public route
      if (!this.isPublicRoute()) {
        await this.handleLogout();
      }
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * ✅ Centralized logout handler
   */
  private async handleLogout(): Promise<void> {
    this.clearCache();

    if (typeof window !== 'undefined') {
      await signOut({ redirect: false });
      await deleteCookie();
      store.dispatch(clearCredentials());
      store.dispatch(clearPdfUrls());
      store.dispatch(clearReport());
      store.dispatch(clearSearch());
      await persistor.purge();
      window.location.replace('/auth/signin');
    }
  }

  clearCache(): void {
    this.cache = {
      accessToken: null,
      refreshToken: null,
      expiresAt: 0
    };
    this.sessionPromise = null;
  }

  async forceRefresh(): Promise<void> {
    this.cache.accessToken = null;
    await this.getAccessToken();
  }

  getCacheInfo() {
    const now = Date.now();
    const expiresIn = this.cache.expiresAt ? this.cache.expiresAt - now : 0;

    return {
      hasToken: !!this.cache.accessToken,
      tokenPreview: this.cache.accessToken
        ? `${this.cache.accessToken.substring(0, 20)}...`
        : null,
      expiresAt: this.cache.expiresAt
        ? new Date(this.cache.expiresAt).toISOString()
        : null,
      expiresInSeconds: Math.floor(expiresIn / 1000),
      isValid: this.isTokenValid(),
      isRefreshing: this.isRefreshing
    };
  }
}

const tokenCache = SessionTokenCache.getInstance();

const configureAxios = (baseURL: string): AxiosInstance => {
  const apiInstance = axios.create({
    baseURL: baseURL || '',
    // No global timeout — it is set per-request in the interceptor based on
    // method type so GET/HEAD/OPTIONS can never inherit the mutation timeout.
    timeout: 0
  });

  apiInstance.interceptors.request.use(
    async (
      config: InternalAxiosRequestConfig
    ): Promise<InternalAxiosRequestConfig> => {
      // ✅ Skip authentication untuk auth endpoints
      if (
        config.url?.includes('/auth/login') ||
        config.url?.includes('/auth/refresh-token') ||
        config.url?.includes('/auth/reset-password') ||
        config.url?.includes('/auth/forgot-password') ||
        config.url?.includes('/auth/check-token')
      ) {
        return config;
      }

      const token = await tokenCache.getAccessToken();
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('⚠️ No token available for request:', config.url);
      }

      const hasBody = !!config.data;
      const isFormData =
        typeof FormData !== 'undefined' && config.data instanceof FormData;

      if (hasBody && !isFormData) {
        config.headers['Content-Type'] = 'application/json';
      }

      // Explicitly set the timeout per method type so GET/HEAD/OPTIONS can never
      // inherit the aggressive mutation timeout. Caller-provided config.timeout
      // is respected — if it's a positive number we keep it as-is.
      const isMutation = isMutationMethod(config.method);
      if (!config.timeout || config.timeout <= 0) {
        config.timeout = isMutation ? MUTATION_TIMEOUT_MS : READ_TIMEOUT_MS;
      }

      // Tag the method type on the config so the response interceptor doesn't
      // have to re-classify (and can't be confused by a method that mutates
      // after-the-fact).
      (
        config as InternalAxiosRequestConfig & { _isMutation?: boolean }
      )._isMutation = isMutation;

      // Only mutation requests get the abort-on-offline AbortController so we
      // can cancel the inflight request immediately when the browser fires the
      // "offline" event. Read requests are left alone.
      if (isMutation) {
        const controller = new AbortController();
        // Merge with any caller-provided signal (rare) via a combined signal when
        // AbortSignal.any is available, otherwise just override.
        if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal) {
          const signals: AbortSignal[] = [controller.signal];
          if (config.signal instanceof AbortSignal) signals.push(config.signal);
          config.signal = (
            AbortSignal as { any: (s: AbortSignal[]) => AbortSignal }
          ).any(signals);
        } else {
          config.signal = controller.signal;
        }

        activeMutationControllers.add(controller);
        // Stash on config so the response interceptors can remove it from the Set
        (
          config as InternalAxiosRequestConfig & {
            _offlineCtrl?: AbortController;
          }
        )._offlineCtrl = controller;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  apiInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Clean up the controller for successful responses
      const ctrl = (
        response.config as InternalAxiosRequestConfig & {
          _offlineCtrl?: AbortController;
        }
      )._offlineCtrl;
      if (ctrl) activeMutationControllers.delete(ctrl);
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Satu-satunya gerbang menuju UI: pesan SQL/constraint/stack trace dari
      // backend diganti kalimat yang bisa dibaca user SEBELUM sampai ke hook
      // mana pun di lib/server.
      sanitizeAxiosError(error);

      // Always clean up the tracked controller, regardless of error type
      const ctrl = (
        originalRequest as InternalAxiosRequestConfig & {
          _offlineCtrl?: AbortController;
        }
      )?._offlineCtrl;
      if (ctrl) activeMutationControllers.delete(ctrl);

      // Cancelled request — check if WE triggered it due to network going offline
      if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
        if (
          typeof window !== 'undefined' &&
          (networkOffline || !navigator.onLine)
        ) {
          offlineOverlayStore.getState().show(window.location.pathname);
          store.dispatch(setProcessed());
        }
        return Promise.reject(error);
      }
      // ─── Auth failure (token expired / unauthenticated) ──────────────────
      // ONLY 401 is retried. A 401 means the request was not authenticated
      // (expired/invalid token), so refreshing the token and retrying can
      // actually succeed. 403 means the user IS authenticated but lacks
      // permission for the resource — refreshing the token will never fix it,
      // so retrying it is pointless and just doubles every forbidden request.
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        console.log('🔄 Token expired, refreshing...');
        const newToken = await tokenCache.handleTokenRefresh();

        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiInstance(originalRequest);
        }
      }

      // ─── Timeout (browser gave up, or 408/504 from the server) ────────────
      // ECONNABORTED means the browser gave up first. A backend (or proxy)
      // timeout arrives as a real response instead — 408 from the Nest timeout
      // interceptor — and used to slip past this block, so the mutation failed
      // without any message at all.
      // The timeout alert + processed reset is ONLY for mutation requests.
      // GET/HEAD/OPTIONS timeouts propagate silently so callers can decide how
      // to handle them (retry, fallback to cache, etc.) without us hijacking
      // the UI with a modal alert.
      //
      // 408 dan 504 sengaja DIPISAH. 408 datang dari TimeoutInterceptor backend
      // yang tahu persis nasib transaksinya dan tidak pernah mengirim 408 untuk
      // request yang sudah masuk tahap commit. 504 datang dari nginx/proxy di
      // depan aplikasi, yang tidak tahu apa-apa soal transaksi — memperlakukannya
      // sebagai "pasti tidak tersimpan" adalah tebakan yang dinyatakan sebagai
      // kepastian, dan itulah yang memancing user menyimpan ulang jadi dobel.
      const backendTimedOut = error.response?.status === 408;
      const gatewayTimedOut = error.response?.status === 504;

      if (error.code === 'ECONNABORTED' || backendTimedOut || gatewayTimedOut) {
        const isMutation =
          (
            originalRequest as
              | (InternalAxiosRequestConfig & { _isMutation?: boolean })
              | undefined
          )?._isMutation ?? isMutationMethod(originalRequest?.method);

        if (!isMutation) {
          // Read-method timeout: silent reject, no alert, no global state reset.
          return Promise.reject(error);
        }

        if (typeof window !== 'undefined') {
          void alertStore.getState().alert({
            title: backendTimedOut
              ? TIMEOUT_MESSAGE_SERVER
              : TIMEOUT_MESSAGE_CLIENT,
            variant: 'danger',
            submitText: 'OK'
          });
        }

        // Selalu tarik ulang daftarnya, apa pun jenis timeout-nya. Dulu 408
        // dilewati dengan alasan "pasti rollback, tidak ada yang berubah" —
        // tapi justru pada kasus di mana pesannya meleset, itu menghilangkan
        // satu-satunya cara user melihat kondisi sebenarnya. Biayanya satu GET.
        void queryClient.invalidateQueries();

        store.dispatch(setProcessed());

        return Promise.reject(error);
      }

      // ─── Network error while client is offline ────────────────────────────
      // We check both our flag (set synchronously by the 'offline' event) and
      // navigator.onLine as a fallback.  We intentionally do NOT redirect via
      // window.location because that requires a network fetch of the new page.
      // Instead we show an in-memory fullscreen overlay that works 100% offline.
      if (!error.response && typeof window !== 'undefined') {
        if (networkOffline || !navigator.onLine) {
          offlineOverlayStore.getState().show(window.location.pathname);
          store.dispatch(setProcessed());
          return Promise.reject(error);
        }
        // Online but the request got no response (backend unreachable / CORS /
        // DNS). This is non-fatal here: the error is propagated via
        // Promise.reject below so each caller decides how to handle it. We log
        // with console.warn (not console.error) so it doesn't trigger Next.js's
        // red Console Error overlay in dev for an already-handled rejection.
        console.warn('🌐 Network Error:', error.message);
      }

      store.dispatch(setProcessed());
      return Promise.reject(error);
    }
  );

  return apiInstance;
};

const api = configureAxios(process.env.NEXT_PUBLIC_BASE_URL || '');
const api2 = configureAxios(process.env.NEXT_PUBLIC_BASE_URL2 || '');

export { api, api2, tokenCache };
