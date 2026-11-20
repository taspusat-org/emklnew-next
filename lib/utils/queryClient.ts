import { QueryClient } from 'react-query';

// Dibuat di modul terpisah (bukan di dalam RootLayoutClient) supaya kode non-React
// — interceptor axios — bisa ikut memicu refetch setelah mutation yang nasibnya
// tidak diketahui, mis. request yang timeout di sisi browser.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // The only retry in this app is the 401 -> refresh-token -> replay flow in
      // AxiosInstance. React Query's retry also replays requests that timed out,
      // were cancelled, or were rejected by the server, so the user waits twice
      // as long for the same failure.
      retry: false,
      staleTime: 0
    },
    mutations: {
      // POST/PUT/DELETE are not idempotent: a request the browser gave up on is
      // often already committed by the backend, so replaying it duplicates data.
      retry: false
    }
  }
});
