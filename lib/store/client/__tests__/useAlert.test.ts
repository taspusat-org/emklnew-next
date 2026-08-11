import { alertStore } from '../useAlert';

const reset = () =>
  alertStore.setState({ alertOptions: null, awaitingPromiseRef: null });

describe('alertStore', () => {
  beforeEach(reset);

  test('handleSubmit resolves the pending promise', async () => {
    const pending = alertStore.getState().alert({
      title: 'OK?',
      variant: 'danger',
      submitText: 'OK'
    });

    alertStore.getState().handleSubmit();

    await expect(pending).resolves.toBeUndefined();
    expect(alertStore.getState().alertOptions).toBeNull();
  });

  // Alert info (hanya tombol OK) yang ditutup lewat X/backdrop dulu membiarkan
  // promise-nya menggantung; pemanggil yang `await alert(...)` tidak pernah
  // lanjut sehingga tombol SAVE-nya mati permanen.
  test('handleClose resolves an info alert instead of leaving it pending', async () => {
    const pending = alertStore.getState().alert({
      title: 'Gagal',
      variant: 'danger',
      submitText: 'OK'
    });

    alertStore.getState().handleClose();

    await expect(pending).resolves.toBeUndefined();
    expect(alertStore.getState().awaitingPromiseRef).toBeNull();
  });

  test('handleClose rejects a confirm alert', async () => {
    const pending = alertStore.getState().alert({
      title: 'Yakin hapus?',
      variant: 'danger',
      submitText: 'YA',
      cancelText: 'TIDAK',
      catchOnCancel: true
    });

    alertStore.getState().handleClose();

    await expect(pending).rejects.toBeUndefined();
  });

  test('handleClose rejects an alert that only has a cancel button', async () => {
    const pending = alertStore.getState().alert({
      title: 'Yakin hapus?',
      variant: 'danger',
      submitText: 'YA',
      cancelText: 'TIDAK'
    });

    alertStore.getState().handleClose();

    await expect(pending).rejects.toBeUndefined();
  });

  test('setLoadingAlert keeps the pending promise untouched', async () => {
    const pending = alertStore.getState().alert({
      title: 'Proses',
      variant: 'success',
      submitText: 'OK'
    });

    alertStore.getState().setLoadingAlert(true);
    expect(alertStore.getState().alertOptions?.isLoading).toBe(true);

    alertStore.getState().handleSubmit();
    await expect(pending).resolves.toBeUndefined();
  });
});
