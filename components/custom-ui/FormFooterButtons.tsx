'use client';

import { useCallback, useEffect, useRef } from 'react';
import { FaSave } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FormMode = 'add' | 'edit' | 'delete' | 'view' | string;

interface FormFooterButtonsProps {
  mode: FormMode;
  onSave: () => void;
  onSaveAndAdd?: () => void;
  onCancel: () => void;
  isLoadingCreate?: boolean;
  isLoadingUpdate?: boolean;
  isLoadingDelete?: boolean;
  saveDisabled?: boolean;
  hideSaveAndAdd?: boolean;
  deleteMode?: boolean;
  /** Pass true for sub-form / inline footers (no bg, mt-6, type="button") */
  inline?: boolean;
  /** Extra classes merged onto the outer wrapper div */
  className?: string;
}

// LookUp menandai inputnya dengan data-lookup-state selama teks yang tampil
// belum jadi nilai form; di keadaan itu form masih memegang nilai lama.
const RESOLVING_LOOKUP = 'input[data-lookup-state="resolving"]';
const UNRESOLVED_LOOKUP = 'input[data-lookup-state="unresolved"]';
const BLOCKING_LOOKUP = 'input[data-lookup-state]';
const RESOLVE_LOOKUP_EVENT = 'lookup:resolve';
const RESOLVE_TIMEOUT_MS = 5000;

async function waitForResolvingLookups(scope: ParentNode) {
  const start = Date.now();
  while (
    scope.querySelector(RESOLVING_LOOKUP) &&
    Date.now() - start < RESOLVE_TIMEOUT_MS
  ) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function focusLookup(input: HTMLInputElement) {
  // Tab detail yang tidak aktif tetap ter-mount tapi tersembunyi; trigger
  // Radix pindah tab saat menerima fokus.
  const panel = input.closest('[role="tabpanel"]');
  if (panel?.getAttribute('data-state') === 'inactive') {
    const triggerId = panel.getAttribute('aria-labelledby');
    if (triggerId) document.getElementById(triggerId)?.focus();
  }
  setTimeout(() => {
    input.focus();
    input.select();
  }, 0);
}

export default function FormFooterButtons({
  mode,
  onSave,
  onSaveAndAdd,
  onCancel,
  isLoadingCreate = false,
  isLoadingUpdate = false,
  isLoadingDelete = false,
  saveDisabled,
  hideSaveAndAdd = false,
  inline = false,
  className,
  deleteMode = false
}: FormFooterButtonsProps) {
  const loading = isLoadingCreate || isLoadingUpdate || isLoadingDelete;
  const isDisabled = saveDisabled ?? mode === 'view';
  // Label tombol jadi DELETE bila mode-nya delete, TANPA perlu prop deleteMode.
  // Sebelumnya label ini hanya bergantung pada prop `deleteMode`, sehingga 27
  // form yang cuma mengirim `mode` (FormPengeluaran, FormJurnalUmum, FormHutang,
  // FormKasGantung, FormPenerimaan, dll) tetap menampilkan "SAVE" saat menghapus.
  // Prop `deleteMode` tetap didukung untuk grid lama yang memakai state boolean
  // sendiri (GridParameter/GridRole/GridErrors/GridOffdays) dan tidak mengirim
  // mode='delete'.
  const isDelete = deleteMode || mode === 'delete';
  const showSaveAndAdd =
    !hideSaveAndAdd && mode === 'add' && typeof onSaveAndAdd === 'function';

  const rootRef = useRef<HTMLDivElement | null>(null);
  const isWaitingRef = useRef(false);
  // Simpan bisa tertunda menunggu LookUp; pakai callback dari render terbaru
  // supaya nilai hasil pencocokan ikut terbaca.
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onSaveAndAddRef = useRef(onSaveAndAdd);
  onSaveAndAddRef.current = onSaveAndAdd;

  const saveWhenLookupsResolved = useCallback(
    async (action: 'save' | 'saveAndAdd') => {
      if (isWaitingRef.current) return;

      const root = rootRef.current;
      const scope: ParentNode =
        root?.closest('[role="dialog"]') ?? root?.closest('form') ?? document;

      // Teks yang belum dicocokkan (mis. popover ditutup dengan Escape)
      // dicocokkan sekarang; LookUp sudah memperbarui DOM saat dispatch selesai.
      scope
        .querySelectorAll(UNRESOLVED_LOOKUP)
        .forEach((input) =>
          input.dispatchEvent(
            new Event(RESOLVE_LOOKUP_EVENT, { bubbles: true })
          )
        );

      if (scope.querySelector(RESOLVING_LOOKUP)) {
        isWaitingRef.current = true;
        try {
          await waitForResolvingLookups(scope);
        } finally {
          isWaitingRef.current = false;
        }
      }

      // Termasuk yang masih "resolving" setelah batas tunggu habis.
      const blockingLookup =
        scope.querySelector<HTMLInputElement>(BLOCKING_LOOKUP);
      if (blockingLookup) {
        focusLookup(blockingLookup);
        return;
      }

      if (action === 'save') onSaveRef.current();
      else onSaveAndAddRef.current?.();
    },
    []
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        if (!isDisabled && !loading) saveWhenLookupsResolved('save');
      } else if (key === 'c') {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [saveWhenLookupsResolved, onCancel, isDisabled, loading]);

  return (
    <div
      ref={rootRef}
      className={cn(
        inline
          ? 'flex items-end gap-2'
          : 'm-0 flex h-fit items-end gap-2 bg-background-form-footer px-3 py-2',
        className
      )}
    >
      <Button
        type={inline ? 'button' : 'submit'}
        variant="save"
        onClick={(e) => {
          e.preventDefault();
          saveWhenLookupsResolved('save');
        }}
        disabled={isDisabled}
        loading={loading}
        className={cn(
          'flex w-fit items-center gap-1 text-sm',
          inline && 'mt-6'
        )}
      >
        <p className="text-center text-sm">
          {isDelete ? (
            'DELETE'
          ) : (
            <>
              <span className="text-sm underline">S</span>AVE
            </>
          )}
        </p>
      </Button>

      {showSaveAndAdd && (
        <Button
          type={inline ? 'button' : 'submit'}
          variant="success"
          onClick={(e) => {
            e.preventDefault();
            saveWhenLookupsResolved('saveAndAdd');
          }}
          disabled={isDisabled}
          loading={loading}
          className={cn(
            'flex w-fit items-center gap-1 text-sm',
            inline && 'mt-6'
          )}
        >
          <FaSave />
          <p className="text-center text-sm">SAVE & ADD</p>
        </Button>
      )}

      <Button
        type="button"
        variant="cancel"
        onClick={onCancel}
        className={cn(
          'flex w-fit items-center gap-1 text-sm',
          inline && 'mt-6'
        )}
      >
        <p className="text-center text-sm">
          <span className="text-sm underline">C</span>ancel
        </p>
      </Button>
    </div>
  );
}
