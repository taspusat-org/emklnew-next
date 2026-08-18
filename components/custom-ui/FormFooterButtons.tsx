'use client';

import { useEffect } from 'react';
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
  inline?: boolean;
  className?: string;
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        if (!isDisabled && !loading) onSave();
      } else if (key === 'c') {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onSave, onCancel, isDisabled, loading]);

  return (
    <div
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
          onSave();
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
            onSaveAndAdd?.();
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
