import { loadGridConfig } from '@/lib/utils';

const COLUMNS = [
  { key: 'nomor', width: 40 },
  { key: 'select', width: 50 },
  { key: 'statusaktif', width: 70 },
  { key: 'nama', width: 200 },
  { key: 'keterangan', width: 300 },
  { key: 'modifiedby', width: 100 }
];

const widthsFor = (keys: string[]) =>
  keys.reduce((acc: Record<string, number>, k) => {
    acc[k] = COLUMNS.find((c) => c.key === k)!.width;
    return acc;
  }, {});

const load = async (config: any, columns = COLUMNS) => {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => config
  });
  const setOrder = jest.fn();
  const setWidth = jest.fn();
  await loadGridConfig('1', 'GridX', columns, setOrder, setWidth);
  const order: number[] = setOrder.mock.calls[0][0];
  return order.map((i) => columns[i]?.key);
};

const ALL = COLUMNS.map((c) => c.key);

test('hidden columns stay hidden after reload', async () => {
  // user unchecks statusaktif + nama -> handleSave (fixed) writes real indexes
  const visible = ['nomor', 'select', 'keterangan', 'modifiedby'];
  expect(
    await load({
      columnsOrder: [0, 1, 4, 5],
      columnsWidth: widthsFor(ALL)
    })
  ).toEqual(visible);
});

test('reordered full config is preserved', async () => {
  expect(
    await load({
      columnsOrder: [0, 1, 4, 3, 2, 5],
      columnsWidth: widthsFor(ALL)
    })
  ).toEqual([
    'nomor',
    'select',
    'keterangan',
    'nama',
    'statusaktif',
    'modifiedby'
  ]);
});

test('legacy corrupt config (indexes into filtered array) is healed', async () => {
  // real entry from gridConfig.json: order [0..7] but widths miss statusaktif/nama
  expect(
    await load({
      columnsOrder: [0, 1, 2, 3],
      columnsWidth: widthsFor(['nomor', 'select', 'keterangan', 'modifiedby'])
    })
  ).toEqual(ALL);
});

test('legacy config without widths falls back to length check', async () => {
  expect(
    await load({ columnsOrder: [0, 1, 2, 3, 4, 5], columnsWidth: {} })
  ).toEqual(ALL);
  expect(await load({ columnsOrder: [0, 1, 2], columnsWidth: {} })).toEqual(
    ALL
  );
});

test('column inserted in code invalidates stale indexes', async () => {
  const withInserted = [
    ...COLUMNS.slice(0, 2),
    { key: 'baru', width: 90 },
    ...COLUMNS.slice(2)
  ];
  expect(
    await load(
      { columnsOrder: [0, 1, 2, 3], columnsWidth: widthsFor(ALL) },
      withInserted
    )
  ).toEqual(withInserted.map((c) => c.key));
});

test('column appended in code shows up next to hidden columns', async () => {
  const withAppended = [...COLUMNS, { key: 'baru', width: 90 }];
  expect(
    await load(
      { columnsOrder: [0, 1, 4, 5], columnsWidth: widthsFor(ALL) },
      withAppended
    )
  ).toEqual(['nomor', 'select', 'keterangan', 'modifiedby', 'baru']);
});

test('garbage config falls back to default order', async () => {
  expect(
    await load({ columnsOrder: [0, 0, 1], columnsWidth: widthsFor(ALL) })
  ).toEqual(ALL);
  expect(
    await load({ columnsOrder: [0, 99], columnsWidth: widthsFor(ALL) })
  ).toEqual(ALL);
  expect(
    await load({ columnsOrder: [], columnsWidth: widthsFor(ALL) })
  ).toEqual(ALL);
  expect(await load({ message: 'No configurations found' })).toEqual(ALL);
});
