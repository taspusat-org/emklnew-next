import { AlertOptions } from '@/components/custom-ui/AlertCustom';
import { create } from 'zustand';

interface AlertState {
  alertOptions: AlertOptions | null;
  awaitingPromiseRef: {
    resolve: () => void;
    reject: () => void;
  } | null;
  alert: (options: AlertOptions) => Promise<void>;
  handleClose: () => void;
  handleSubmit: () => void;
  handleCancel: () => void;
  setLoadingAlert: (loading: boolean) => void;
}

// Exported so non-React code (e.g. Axios interceptors) can call
// alertStore.getState().alert(...) directly without a hook.
export const alertStore = create<AlertState>((set) => ({
  alertOptions: null,
  awaitingPromiseRef: null,
  alert: async (options: AlertOptions) =>
    await new Promise<void>((resolve, reject) => {
      set(() => ({
        alertOptions: options,
        awaitingPromiseRef: { resolve, reject }
      }));
    }),
  // Tutup lewat tombol X / backdrop / ESC. Promise WAJIB di-settle di sini:
  // dulu alert tanpa catchOnCancel dibiarkan menggantung, jadi pemanggil yang
  // `await alert(...)` tidak pernah lanjut — mutation react-query tetap
  // isLoading dan tombol SAVE mati permanen sampai halaman di-reload.
  handleClose: () => {
    set((state) => {
      const options = state.alertOptions;
      const pending = state.awaitingPromiseRef;
      if (pending != null) {
        // Alert konfirmasi (punya tombol cancel) diperlakukan sebagai batal,
        // sama seperti handleCancel. Alert informasi (hanya OK) dianggap
        // di-acknowledge supaya alurnya jalan terus.
        if ((options?.catchOnCancel ?? false) || options?.cancelText) {
          pending.reject();
        } else {
          pending.resolve();
        }
      }
      return {
        alertOptions: null,
        awaitingPromiseRef: null
      };
    });
  },
  handleSubmit: () => {
    set((state) => {
      if (state.awaitingPromiseRef != null) {
        state.awaitingPromiseRef.resolve();
      }
      return {
        alertOptions: null,
        awaitingPromiseRef: null
      };
    });
  },
  handleCancel: () => {
    set((state) => {
      if (state.awaitingPromiseRef != null) {
        state.awaitingPromiseRef.reject();
      }
      return {
        alertOptions: null,
        awaitingPromiseRef: null
      };
    });
  },

  setLoadingAlert: (loading: boolean) =>
    set((state) => ({
      alertOptions:
        state.alertOptions != null
          ? { ...state.alertOptions, isLoading: loading }
          : null
    }))
}));

export const useAlert = () => {
  const {
    alertOptions,
    alert,
    handleClose,
    handleSubmit,
    handleCancel,
    setLoadingAlert
  } = alertStore((state) => ({
    alertOptions: state.alertOptions,
    alert: state.alert,
    handleClose: state.handleClose,
    handleSubmit: state.handleSubmit,
    handleCancel: state.handleCancel,
    setLoadingAlert: state.setLoadingAlert
  }));

  return {
    alertOptions,
    alert,
    handleClose,
    handleSubmit,
    handleCancel,
    setLoadingAlert
  };
};
