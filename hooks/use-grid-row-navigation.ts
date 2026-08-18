import { MutableRefObject, useCallback } from 'react';

type GridRowNavigationOptions = {
  /** Jumlah baris yang sedang ada di window. */
  rowCount: number;
  /** Ref DataGrid (react-data-grid) untuk scrollToCell/selectCell. */
  gridRef: MutableRefObject<any>;
  /** Ref index baris terpilih — dibaca & ditulis supaya tidak tergantung state. */
  selectedRowRef: MutableRefObject<number>;
  setSelectedRow: (index: number) => void;
  /** Ctrl+Home / Ctrl+End (opsional). */
  onGoToFirstPage?: () => void;
  onGoToLastPage?: () => void;
  /** Ref input search global — supaya navigasi bisa dilakukan sambil mengetik. */
  searchInputRef?: MutableRefObject<HTMLInputElement | null>;
  /** Berapa baris yang dilompati PageUp/PageDown. Boilerplate memakai 8. */
  visibleRowCount?: number;
  /** Kolom yang difokuskan saat berpindah baris. */
  columnIdx?: number;
  enabled?: boolean;
};

/**
 * Navigasi baris lewat keyboard untuk grid berjendela (lazy loading).
 *
 * Disalin dari GridGroupbiayaextra — `moveSelectionBy` +
 * `handleGridInputNavigationKeyDownCapture` — supaya semua grid berperilaku
 * sama: Arrow atas/bawah pindah 1 baris, PageUp/PageDown melompat sejumlah
 * baris yang terlihat, Ctrl+Home/Ctrl+End lompat ke halaman pertama/terakhir.
 *
 * Yang ditangani hanya event dari input filter kolom (`.filter-input`) dan
 * input search global. Kalau fokus ada di grid, event dibiarkan lewat supaya
 * react-data-grid memakai navigasinya sendiri — sama seperti boilerplate.
 * Ctrl+Home/Ctrl+End dikecualikan: berlaku dari mana saja.
 *
 * Kenapa lewat `scrollToCell` + `selectCell`, bukan setState saja: pergeseran
 * window dipicu oleh event scroll grid. Dengan menggerakkan sel terpilih,
 * scroll ikut bergerak dan `handleScroll` memuat halaman berikutnya seperti
 * saat user menggulung dengan mouse — jadi PageDown tetap bekerja walau baris
 * tujuannya ada di halaman yang belum dimuat.
 *
 * Dipasang di grid lewat `onKeyDownCapture`. Capture, bukan bubble: input
 * filter kolom & search global menelan event keyboard-nya sendiri, jadi
 * handler harus dijalankan lebih dulu.
 */
export function useGridRowNavigation({
  rowCount,
  gridRef,
  selectedRowRef,
  setSelectedRow,
  onGoToFirstPage,
  onGoToLastPage,
  searchInputRef,
  visibleRowCount = 8,
  columnIdx = 1,
  enabled = true
}: GridRowNavigationOptions) {
  const moveSelectionBy = useCallback(
    (delta: number, focusBackTo?: HTMLElement | null) => {
      if (rowCount === 0) return;

      const nextRow = Math.min(
        Math.max((selectedRowRef.current ?? 0) + delta, 0),
        rowCount - 1
      );
      selectedRowRef.current = nextRow;
      setSelectedRow(nextRow);

      gridRef.current?.scrollToCell?.({ rowIdx: nextRow, idx: columnIdx });
      gridRef.current?.selectCell?.({ rowIdx: nextRow, idx: columnIdx });

      // Kalau navigasinya dilakukan dari dalam input (filter kolom / search),
      // kembalikan fokus + posisi kursornya supaya user bisa terus mengetik.
      if (focusBackTo && typeof window !== 'undefined') {
        const start =
          focusBackTo instanceof HTMLInputElement
            ? focusBackTo.selectionStart
            : null;
        const end =
          focusBackTo instanceof HTMLInputElement
            ? focusBackTo.selectionEnd
            : null;

        window.requestAnimationFrame(() => {
          if (!document.contains(focusBackTo)) return;
          focusBackTo.focus({ preventScroll: true });
          if (
            focusBackTo instanceof HTMLInputElement &&
            start !== null &&
            end !== null
          ) {
            focusBackTo.setSelectionRange(start, end);
          }
        });
      }
    },
    [rowCount, gridRef, selectedRowRef, setSelectedRow, columnIdx]
  );

  const handleKeyDownCapture = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!enabled) return;
      const target = event.target as HTMLElement | null;

      if (event.ctrlKey && event.key === 'Home' && onGoToFirstPage) {
        event.preventDefault();
        event.stopPropagation();
        onGoToFirstPage();
        return;
      }

      if (event.ctrlKey && event.key === 'End' && onGoToLastPage) {
        event.preventDefault();
        event.stopPropagation();
        onGoToLastPage();
        return;
      }

      const isFilterInput =
        target instanceof HTMLElement &&
        target.classList.contains('filter-input');
      const isGlobalSearchInput =
        !!searchInputRef?.current && target === searchInputRef.current;

      // Fokus di grid → biarkan react-data-grid yang menangani.
      if (!isFilterInput && !isGlobalSearchInput) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionBy(1, target);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionBy(-1, target);
      } else if (event.key === 'PageDown') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionBy(visibleRowCount, target);
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        event.stopPropagation();
        moveSelectionBy(-visibleRowCount, target);
      }
    },
    [
      enabled,
      moveSelectionBy,
      visibleRowCount,
      onGoToFirstPage,
      onGoToLastPage,
      searchInputRef
    ]
  );

  return { moveSelectionBy, handleKeyDownCapture };
}
