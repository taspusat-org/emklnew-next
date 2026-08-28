'use client';

import Sortable from 'sortablejs';
import { Button } from '../ui/button';
import { useTheme } from 'next-themes';
import { IoMenu } from 'react-icons/io5';
import { ReactSortable } from 'react-sortablejs';
import { IoSettingsSharp } from 'react-icons/io5';
import { Checkbox } from '@/components/ui/checkbox';
import React, { useEffect, useRef, useState } from 'react';
import { resetGridConfig, saveGridConfig } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface DraggableColumnProps {
  defaultColumns: any;
  saveColumns: any;
  userId: any;
  gridName: string;
  setColumnsOrder: React.Dispatch<React.SetStateAction<readonly number[]>>;
  setColumnsWidth: React.Dispatch<
    React.SetStateAction<{ [key: string]: number }>
  >;
  onReset: () => void;
}

type Item = {
  id: string;
  name: string;
  key: number;
  order: number;
  draggable: boolean;
  width?: number;
};

const styles: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer', // Makes the entire element draggable
  fontWeight: '700'
};

const cssCenter: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

// Kolom yang boleh di-checklist di popup. Kolom 'select' masih dipasang tanpa
// properti draggable di sebagian grid, jadi ikut dianggap toggleable.
const isToggleable = (col: any) =>
  !!col && (col.draggable !== undefined || col.key === 'select');

export default function DraggableColumn({
  defaultColumns,
  saveColumns,
  userId,
  gridName,
  setColumnsOrder,
  setColumnsWidth,
  onReset
}: DraggableColumnProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || resolvedTheme === 'dark';
  const [open, setOpen] = useState(false);
  const [itemDraggable, setItemDraggable] = useState<Item[]>([]);
  const [itemNotDraggable, setItemNotDraggable] = useState<Item[]>([]);
  const [popoverWidth, setPopoverWidth] = useState<number | string>('auto');
  const [checkedRows, setCheckedRows] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const sortableRef = useRef<HTMLDivElement>(null);

  const handleRowSelect = (rowKey: number) => {
    setCheckedRows((prev) => {
      const updated = new Set(prev);
      if (updated.has(rowKey)) updated.delete(rowKey);
      else updated.add(rowKey);
      return updated;
    });
  };

  const handleSave = () => {
    // Kolom yang tidak muncul di daftar (mis. 'nomor') tidak bisa di-uncheck,
    // jadi selalu ikut tersimpan.
    const alwaysVisible = defaultColumns.filter(
      (col: any) => !isToggleable(col)
    );

    // itemDraggable dan itemNotDraggable memakai satu ruang order yang sama,
    // jadi urutan finalnya cukup diambil dari order tersebut.
    const selectedItems = [...itemDraggable, ...itemNotDraggable]
      .filter((item) => checkedRows.has(item.key))
      .sort((a, b) => a.order - b.order);

    // columnsOrder dibaca grid sebagai columns[index], jadi index-nya harus
    // dihitung terhadap defaultColumns yang utuh — bukan terhadap hasil filter.
    const orderedItems = [...alwaysVisible, ...selectedItems]
      .map((item: any) =>
        defaultColumns.findIndex((col: any) => col.key === item.key)
      )
      .filter((index: number) => index >= 0);

    // Width disimpan untuk semua kolom, bukan cuma yang tampil: loadGridConfig
    // memakai key-nya untuk membedakan kolom yang sengaja disembunyikan dari
    // kolom baru yang ditambahkan di kode.
    const visibleWidth = new Map<string, any>(
      saveColumns.map((col: any) => [col.key, col.width])
    );

    const columnsWidth = defaultColumns.reduce((acc: any, col: any) => {
      acc[col.key] = visibleWidth.get(col.key) ?? col.width;
      return acc;
    }, {});

    setColumnsWidth(columnsWidth);
    setColumnsOrder(orderedItems);
    saveGridConfig(userId, gridName, [...orderedItems], columnsWidth);
  };

  const renderItem = () => {
    return (
      <>
        {itemDraggable.map((item) => (
          <div
            key={item.id}
            className="mt-1.5 w-full rounded-sm bg-background"
            style={{
              ...styles
            }}
          >
            <div className="w-8" style={{ ...cssCenter }}>
              <IoMenu className="text-2xl" />
            </div>

            <div className="w-8 gap-2" style={{ ...cssCenter, width: '3rem' }}>
              <Checkbox
                checked={checkedRows.has(item.key)}
                onCheckedChange={() => handleRowSelect(item.key)}
                id={`row-checkbox-${item.key}`}
              />
              <p className="w-5 text-right">{item.order}.</p>
            </div>

            <div className={`flex-1 p-2 text-sm`}>
              {item.name ? item.name : 'CHECK BOX'}
            </div>
          </div>
        ))}
      </>
    );
  };

  const renderItemNotDraggable = () => {
    return (
      <>
        {itemNotDraggable.map((item) => (
          <div
            key={item.id}
            className="relative flex w-full cursor-not-allowed items-center rounded-sm bg-background font-bold"
          >
            <div
              className="ml-8 w-8 gap-2"
              style={{ ...cssCenter, width: '3rem' }}
            >
              <Checkbox
                checked={checkedRows.has(item.key)}
                onCheckedChange={() => handleRowSelect(item.key)}
                id={`row-checkbox-${item.key}`}
              />
              <p className="w-5 text-right">{item.order}.</p>
            </div>

            <div className="flex-1 p-2 text-sm">
              {item.name ? item.name : 'CHECK BOX'}
            </div>
          </div>
        ))}
      </>
    );
  };

  function mergeColumnsBySavedOrder(
    defaultColumns: any[],
    savedColumns: any[]
  ) {
    const usedKeys = new Set(savedColumns.map((col) => col.key));
    setCheckedRows(usedKeys);

    // Keluarkan dari default kolom yg key nya tidak ada di savedColumn.
    // Predikatnya harus sama dengan filter di bawah, kalau tidak kolom yang
    // disembunyikan tidak pernah muncul lagi di daftar dan tidak bisa dicentang.
    const columnsNotSaved = defaultColumns.filter(
      (col) => !usedKeys.has(col.key) && isToggleable(col)
    );

    const fixItems = [...savedColumns, ...columnsNotSaved]
      .filter(isToggleable)
      .map((col: any, idx: number) => ({
        ...col,
        id: col.key,
        order: idx + 1
      }));

    return fixItems;
  }

  useEffect(() => {
    if (!open) {
      setCheckedRows(new Set());
      return;
    }

    const finalColumns = mergeColumnsBySavedOrder(defaultColumns, saveColumns);

    const draggable = finalColumns.filter((item: any) => {
      return item.draggable === true;
    });

    const notDraggable = finalColumns.filter((item: any) => {
      return (
        item.draggable === false || (!item.draggable && item.key == 'select')
      );
    });

    const largestWidth = defaultColumns.reduce((max: any, col: any) => {
      return col.width > max ? col.width : max;
    }, 0);

    setItemDraggable(draggable);
    setItemNotDraggable(notDraggable);
    setPopoverWidth(largestWidth + 70);
  }, [open]);

  // sortablejs native
  useEffect(() => {
    if (!sortableRef.current) return;

    const sortable = Sortable.create(sortableRef.current, {
      animation: 200,

      // Mobile fix
      forceFallback: true,
      fallbackOnBody: true,

      delay: 100,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,

      chosenClass: 'drag-chosen',
      ghostClass: 'drag-ghost',
      dragClass: 'dragging',

      // scroll: true,
      // scrollSensitivity: 60,
      // scrollSpeed: 10,

      onEnd: (evt: any) => {
        if (evt.oldIndex == null || evt.newIndex == null) return;

        // setItemDraggable((prev) => {
        //   const updated = [...prev];
        //   const [moved] = updated.splice(evt.oldIndex!, 1);
        //   updated.splice(evt.newIndex!, 0, moved);
        //   return updated;
        // });

        setItemDraggable((prev) => {
          const updated = [...prev];

          // 1. reorder array dulu
          const [moved] = updated.splice(evt.oldIndex!, 1);
          updated.splice(evt.newIndex!, 0, moved);

          // 2. ambil semua order yang dipakai itemNotDraggable
          const fixedOrders = new Set(itemNotDraggable.map((i) => i.order));

          // 3. assign ulang order draggable dengan skip angka fixed
          let currentOrder = 1;

          const reordered = updated.map((item) => {
            while (fixedOrders.has(currentOrder)) {
              currentOrder++; // skip angka fixed
            }

            const newItem = {
              ...item,
              order: currentOrder
            };

            currentOrder++;
            return newItem;
          });

          return reordered;
        });
      }
    });

    return () => sortable.destroy();
  }, [itemDraggable]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            className={`${
              isDark ? 'text-white' : 'text-gray-600'
            } bg-transparent text-2xl hover:bg-transparent`}
          >
            <IoSettingsSharp />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          id="popover-content-dragcolumn"
          className="mr-7 h-fit rounded-md border border-border bg-background-input p-2 shadow-lg"
          side="bottom"
          align="start"
          sideOffset={-1} // Atur offset ke 0 agar tidak ada jarak
          avoidCollisions={true}
          style={{
            width: popoverWidth
          }}
          onEscapeKeyDown={() => {
            setOpen(false);
            setPopoverWidth('auto');
            setCheckedRows(new Set());
          }}
        >
          {open && (
            <div className="flex h-[300px] flex-col">
              <div
                // ref={scrollRef}
                className="flex h-full flex-col gap-2 overflow-y-scroll"
              >
                {/* <ReactSortable
                list={itemDraggable}
                setList={(newList) => {
                  setItemDraggable(
                    newList.map((item, idx) => ({
                      ...item,
                      order: item.order,
                    }))
                  );
                }}
                animation={200}
                delay={150}
                delayOnTouchOnly={true}
                touchStartThreshold={3}
                // scroll={true}
                // scrollSensitivity={60}
                // scrollSpeed={20}
                // forceFallback={true}
              >
                {itemDraggable.map((item) => (
                  <div
                    key={item.id}
                    className="w-full bg-background rounded-sm mt-1.5"
                    style={{ 
                      ...styles
                    }}
                  >
                    <div className="w-8" style={{ ...cssCenter }}>
                      <IoMenu className='text-2xl' />
                    </div>

                    <div className="w-8 gap-2" style={{ ...cssCenter, width: '3rem' }}>
                      <Checkbox
                        checked={checkedRows.has(item.key)}
                        onCheckedChange={() => handleRowSelect(item.key)}
                        id={`row-checkbox-${item.key}`}
                      />
                      <p className="w-5 text-right">{item.order}.</p>
                    </div>
            
                    <div className={`flex-1 p-2 text-sm`}>
                      {item.name ? item.name : 'WOEE'}
                    </div>
                  </div>
                ))}
              </ReactSortable> */}

                <div ref={sortableRef} className="flex flex-col">
                  {renderItem()}
                </div>

                {renderItemNotDraggable()}
              </div>

              <div className="mt-4 flex flex-row gap-2">
                <Button
                  variant="save"
                  onClick={() => {
                    setOpen(false);
                    handleSave();
                  }}
                >
                  Save
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => {
                    setOpen(false);

                    resetGridConfig(
                      userId,
                      gridName,
                      defaultColumns,
                      setColumnsOrder,
                      setColumnsWidth
                    );

                    onReset();
                  }}
                >
                  RESET
                </Button>

                <Button variant="cancel" onClick={() => setOpen(false)}>
                  CANCEL
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <style jsx global>{`
        .drag-ghost {
          background: #ffe48d;
          opacity: 0.4;
        }
        .dragging {
          background: #ffe48d;
        }
      `}</style>
    </>
  );
}
