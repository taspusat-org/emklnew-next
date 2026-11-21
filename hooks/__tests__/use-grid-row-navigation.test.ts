import { renderHook } from '@testing-library/react';
import { useGridRowNavigation } from '../use-grid-row-navigation';

// Target default: input filter kolom, karena hook hanya menangani event dari
// input filter / search global (fokus di grid dibiarkan ke react-data-grid).
const buatTargetFilter = () => {
  const el = document.createElement('input');
  el.classList.add('filter-input');
  return el;
};

const buatKeyEvent = (init: {
  key: string;
  ctrlKey?: boolean;
  target?: any;
}): any => ({
  key: init.key,
  ctrlKey: init.ctrlKey ?? false,
  target: init.target === undefined ? buatTargetFilter() : init.target,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn()
});

const setup = (
  opts: Partial<Parameters<typeof useGridRowNavigation>[0]> = {}
) => {
  const selectedRowRef = { current: 10 };
  const setSelectedRow = jest.fn();
  const gridRef = {
    current: { scrollToCell: jest.fn(), selectCell: jest.fn() }
  };

  const { result } = renderHook(() =>
    useGridRowNavigation({
      rowCount: 250,
      gridRef: gridRef as any,
      selectedRowRef,
      setSelectedRow,
      ...opts
    })
  );

  return { result, selectedRowRef, setSelectedRow, gridRef };
};

test('PageDown melompat sejumlah baris terlihat dan menggerakkan sel grid', () => {
  const { result, selectedRowRef, setSelectedRow, gridRef } = setup();

  result.current.handleKeyDownCapture(buatKeyEvent({ key: 'PageDown' }));

  expect(selectedRowRef.current).toBe(18); // 10 + 8
  expect(setSelectedRow).toHaveBeenCalledWith(18);
  // scrollToCell yang membuat window ikut bergeser saat lazy loading
  expect(gridRef.current.scrollToCell).toHaveBeenCalledWith({
    rowIdx: 18,
    idx: 1
  });
  expect(gridRef.current.selectCell).toHaveBeenCalledWith({
    rowIdx: 18,
    idx: 1
  });
});

test('PageUp melompat ke atas dan tidak pernah di bawah 0', () => {
  const { result, selectedRowRef } = setup();

  result.current.handleKeyDownCapture(buatKeyEvent({ key: 'PageUp' }));
  expect(selectedRowRef.current).toBe(2);

  result.current.handleKeyDownCapture(buatKeyEvent({ key: 'PageUp' }));
  expect(selectedRowRef.current).toBe(0);
});

test('Arrow atas/bawah dari input filter pindah satu baris', () => {
  const { result, selectedRowRef } = setup();

  result.current.handleKeyDownCapture(buatKeyEvent({ key: 'ArrowDown' }));
  expect(selectedRowRef.current).toBe(11);

  result.current.handleKeyDownCapture(buatKeyEvent({ key: 'ArrowUp' }));
  expect(selectedRowRef.current).toBe(10);
});

test('tidak melewati baris terakhir di window', () => {
  const { result, selectedRowRef } = setup({ rowCount: 12 });

  result.current.handleKeyDownCapture(buatKeyEvent({ key: 'PageDown' }));

  expect(selectedRowRef.current).toBe(11);
});

test('input search global juga dilayani', () => {
  const searchInput = document.createElement('input');
  const { result, selectedRowRef } = setup({
    searchInputRef: { current: searchInput }
  });

  result.current.handleKeyDownCapture(
    buatKeyEvent({ key: 'PageDown', target: searchInput })
  );

  expect(selectedRowRef.current).toBe(18);
});

test('event dari grid dibiarkan ke react-data-grid', () => {
  const { result, setSelectedRow } = setup();
  const event = buatKeyEvent({ key: 'PageDown', target: null });

  result.current.handleKeyDownCapture(event);

  expect(setSelectedRow).not.toHaveBeenCalled();
  expect(event.preventDefault).not.toHaveBeenCalled();
});

test('Ctrl+Home / Ctrl+End berlaku dari mana saja, termasuk dari grid', () => {
  const onGoToFirstPage = jest.fn();
  const onGoToLastPage = jest.fn();
  const { result } = setup({ onGoToFirstPage, onGoToLastPage });

  result.current.handleKeyDownCapture(
    buatKeyEvent({ key: 'Home', ctrlKey: true, target: null })
  );
  result.current.handleKeyDownCapture(
    buatKeyEvent({ key: 'End', ctrlKey: true, target: null })
  );

  expect(onGoToFirstPage).toHaveBeenCalledTimes(1);
  expect(onGoToLastPage).toHaveBeenCalledTimes(1);
});

test('tombol lain dibiarkan lewat', () => {
  const { result, setSelectedRow } = setup();
  const event = buatKeyEvent({ key: 'Enter' });

  result.current.handleKeyDownCapture(event);

  expect(setSelectedRow).not.toHaveBeenCalled();
  expect(event.preventDefault).not.toHaveBeenCalled();
});

test('grid kosong tidak melakukan apa-apa', () => {
  const { result, setSelectedRow } = setup({ rowCount: 0 });

  result.current.handleKeyDownCapture(buatKeyEvent({ key: 'PageDown' }));

  expect(setSelectedRow).not.toHaveBeenCalled();
});

test('enabled: false mematikan navigasinya', () => {
  const { result, setSelectedRow } = setup({ enabled: false });

  result.current.handleKeyDownCapture(buatKeyEvent({ key: 'PageDown' }));

  expect(setSelectedRow).not.toHaveBeenCalled();
});
