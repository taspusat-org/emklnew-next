'use client';

import { Provider } from 'react-redux';
import { QueryClientProvider, setLogger } from 'react-query';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, store } from '@/lib/store/store';
import { queryClient } from '@/lib/utils/queryClient';
import Alert, { AlertOptions } from '@/components/custom-ui/AlertCustom';
import { useAlert } from '@/lib/store/client/useAlert';
import { SidebarProvider } from '@/components/ui/sidebar';
import { FormErrorProvider } from '@/lib/hooks/formErrorContext';
import ApprovalDialog from '@/components/custom-ui/ApprovalDialog';
import DialogLainnya from '@/components/custom-ui/DialogLainnya';
import OfflineOverlay from '@/components/custom-ui/OfflineOverlay';
import NextTopLoader from 'nextjs-toploader';
import { Toaster } from '@/components/ui/toaster';
import Providers from '@/components/layout/providers';
import { pdfjs } from 'react-pdf';

// React Query v3 logs every failed query/mutation through console.error by
// default, which Next.js dev elevates into a red "Console Error" overlay even
// when the failure is an already-handled network error (backend unreachable).
// We demote no-response network errors to console.warn while keeping genuine
// errors (those with a server response) at console.error.
setLogger({
  log: console.log,
  warn: console.warn,
  error: (...args: unknown[]) => {
    const err = args[0] as
      | { isAxiosError?: boolean; response?: { status?: number } | null }
      | null
      | undefined;
    if (err?.isAxiosError && !err.response) {
      console.warn('🌐 Network Error (react-query):', ...args);
      return;
    }
    // Error 400 = validasi backend (nama sudah ada, dll). Sudah ditangani oleh
    // onError di setiap hook (setError ke form). Tidak perlu di-log ke console.
    if (err?.isAxiosError && err.response?.status === 400) {
      return;
    }
    console.error(...args);
  }
});

export default function RootLayoutClient({
  children
}: {
  children: React.ReactNode;
}) {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  const { alertOptions, handleClose, handleSubmit } = useAlert();

  return (
    <SidebarProvider>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <Alert
            open={Boolean(alertOptions)}
            onSubmit={handleSubmit}
            onClose={handleClose}
            {...(alertOptions as AlertOptions)}
          />
          <OfflineOverlay />
          <ApprovalDialog />
          <DialogLainnya />
          <FormErrorProvider>
            <PersistGate loading={null} persistor={persistor}>
              <NextTopLoader showSpinner={false} />
              <Toaster />
              <Providers>{children}</Providers>
            </PersistGate>
          </FormErrorProvider>
        </QueryClientProvider>
      </Provider>
    </SidebarProvider>
  );
}
