import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DraggableColumn from '@/components/custom-ui/DraggableColumns';

const saveGridConfig = jest.fn();

jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  saveGridConfig: (...args: any[]) => saveGridConfig(...args),
  resetGridConfig: jest.fn()
}));

const COLUMNS = [
  { key: 'nomor', name: 'NO', width: 40 },
  { key: 'select', name: '', width: 50 },
  { key: 'statusaktif', name: 'STATUS AKTIF', width: 70, draggable: true },
  { key: 'nama', name: 'NAMA', width: 200, draggable: true },
  { key: 'keterangan', name: 'KETERANGAN', width: 300, draggable: true },
  { key: 'modifiedby', name: 'MODIFIED BY', width: 100, draggable: true }
];

const setup = (visibleKeys: string[]) => {
  const setColumnsOrder = jest.fn();
  const setColumnsWidth = jest.fn();
  render(
    <DraggableColumn
      defaultColumns={COLUMNS}
      saveColumns={COLUMNS.filter((c) => visibleKeys.includes(c.key))}
      userId="1"
      gridName="GridX"
      setColumnsOrder={setColumnsOrder}
      setColumnsWidth={setColumnsWidth}
      onReset={jest.fn()}
    />
  );
  fireEvent.click(screen.getByRole('button'));
  return { setColumnsOrder, setColumnsWidth };
};

const uncheck = (label: string) => {
  const row = screen.getByText(label).closest('div')!.parentElement!;
  fireEvent.click(row.querySelector('button[role="checkbox"]')!);
};

beforeEach(() => saveGridConfig.mockClear());

test('saves indexes of the columns that stay checked', () => {
  const { setColumnsOrder } = setup(COLUMNS.map((c) => c.key));

  uncheck('STATUS AKTIF');
  uncheck('NAMA');
  fireEvent.click(screen.getByText('Save'));

  const [, , order, widths] = saveGridConfig.mock.calls[0];
  // nomor (0) selalu ikut, select (1) tetap dicentang, statusaktif/nama hilang
  expect(order).toEqual([0, 1, 4, 5]);
  expect(order.map((i: number) => COLUMNS[i].key)).toEqual([
    'nomor',
    'select',
    'keterangan',
    'modifiedby'
  ]);
  expect(setColumnsOrder).toHaveBeenCalledWith([0, 1, 4, 5]);
  // width semua kolom ikut tersimpan, termasuk yang disembunyikan
  expect(Object.keys(widths).sort()).toEqual(COLUMNS.map((c) => c.key).sort());
  expect(widths.nomor).toBe(40);
});

test('hidden column can be re-checked and comes back', () => {
  setup(['nomor', 'select', 'keterangan', 'modifiedby']);

  // kolom yang tersembunyi tetap muncul di daftar dalam keadaan tidak dicentang
  const row = screen.getByText('NAMA').closest('div')!.parentElement!;
  const box = row.querySelector('button[role="checkbox"]')!;
  expect(box.getAttribute('data-state')).toBe('unchecked');

  fireEvent.click(box);
  fireEvent.click(screen.getByText('Save'));

  const [, , order] = saveGridConfig.mock.calls[0];
  expect(order.map((i: number) => COLUMNS[i].key)).toContain('nama');
});

test('unchecking everything still keeps the always-visible column', () => {
  setup(COLUMNS.map((c) => c.key));

  ['STATUS AKTIF', 'NAMA', 'KETERANGAN', 'MODIFIED BY'].forEach(uncheck);
  const checkboxRow = screen.getAllByText('CHECK BOX')[0].closest('div')!
    .parentElement!;
  fireEvent.click(checkboxRow.querySelector('button[role="checkbox"]')!);
  fireEvent.click(screen.getByText('Save'));

  const [, , order] = saveGridConfig.mock.calls[0];
  expect(order).toEqual([0]);
});
