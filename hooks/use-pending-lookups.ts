import { useSelector, useDispatch, useStore } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useCallback, useState } from 'react';
import { setSubmitClicked } from '@/lib/store/lookupSlice/lookupSlice';

export function usePendingLookups() {
  const pendingLookups = useSelector(
    (state: RootState) => state.lookup.pendingLookups
  );
  const store = useStore<RootState>();
  const dispatch = useDispatch();
  const [isWaitingForLookups, setIsWaitingForLookups] = useState(false);

  const hasPendingLookups = pendingLookups.length > 0;

  const waitForPendingLookups = useCallback(
    (timeoutMs: number = 3000): Promise<boolean> => {
      return new Promise((resolve) => {
        const startTime = Date.now();

        const checkPending = () => {
          const currentPendingLookups = store.getState().lookup.pendingLookups;

          if (currentPendingLookups.length === 0) {
            resolve(true);
            return;
          }

          if (Date.now() - startTime >= timeoutMs) {
            console.warn(
              'Timeout waiting for pending lookups:',
              currentPendingLookups
            );
            resolve(false);
            return;
          }

          // Check lagi setelah 100ms
          setTimeout(checkPending, 100);
        };

        checkPending();
      });
    },
    [store]
  );

  const handleSubmitWithPendingCheck = useCallback(
    async <T = any>(
      onSubmit: (arg?: T) => void | Promise<void>,
      arg?: T,
      options?: {
        timeoutMs?: number;
        triggerSubmitClicked?: boolean;
      }
    ) => {
      const { timeoutMs = 3000, triggerSubmitClicked = true } = options || {};

      // Cek state terkini dari store
      const currentPendingLookups = store.getState().lookup.pendingLookups;

      // Jika ada pending lookups, tunggu sampai selesai
      if (currentPendingLookups.length > 0) {
        setIsWaitingForLookups(true);

        const startTime = Date.now();

        await new Promise<void>((resolve) => {
          const unsubscribe = store.subscribe(() => {
            const latestPendingLookups = store.getState().lookup.pendingLookups;

            // Jika sudah tidak ada pending lookups, resolve
            if (latestPendingLookups.length === 0) {
              unsubscribe();
              resolve();
            }

            // Timeout check
            if (Date.now() - startTime >= timeoutMs) {
              unsubscribe();
              console.warn(
                'Timeout waiting for pending lookups:',
                latestPendingLookups
              );
              resolve();
            }
          });

          // Timeout fallback
          setTimeout(() => {
            unsubscribe();
            resolve();
          }, timeoutMs);
        });

        setIsWaitingForLookups(false);
      }

      // Lanjutkan submit
      await onSubmit(arg);

      // Trigger submitClicked jika diperlukan
      if (triggerSubmitClicked) {
        dispatch(setSubmitClicked(true));
      }
    },
    [store, dispatch]
  );

  return {
    pendingLookups,
    hasPendingLookups,
    isWaitingForLookups,
    waitForPendingLookups,
    handleSubmitWithPendingCheck
  };
}

export default usePendingLookups;
