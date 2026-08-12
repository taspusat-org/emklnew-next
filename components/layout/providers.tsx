'use client';
import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { LoadingOverlay } from '../custom-ui/LoadingOverlay';
import { HotkeysProvider } from '../providers/hotkeys-provider';
import { ThemeProvider } from './ThemeToggle/theme-provider';
import AuthSessionSync from './AuthSessionSync';

export default function Providers({ children }: { children: React.ReactNode }) {
  const { isLoading, isProcessing } = useSelector(
    (state: RootState) => state.loading
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      value={{ light: 'light', dark: 'dark' }}
    >
      <LoadingOverlay
        isLoading={isLoading || false}
        isProcessing={isProcessing || false}
      />
      <SessionProvider
        refetchInterval={0} // Tidak auto-refetch berdasarkan interval
        refetchOnWindowFocus={false} // Disable refetch saat window focus
        // refetchWhenOffline={true} // Disable refetch saat offline
      >
        <AuthSessionSync />
        <HotkeysProvider>{children}</HotkeysProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
