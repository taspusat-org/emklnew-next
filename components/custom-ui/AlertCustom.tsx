import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DismissableLayerBranch } from '@radix-ui/react-dismissable-layer';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FaTimes } from 'react-icons/fa';
import { HiCheckCircle } from 'react-icons/hi';
import { HiExclamationTriangle } from 'react-icons/hi2';
import useDisableBodyScroll from '@/lib/hooks/useDisableBodyScroll';

export interface AlertOptions {
  title: string;
  variant: 'danger' | 'success';
  submitText?: string;
  catchOnCancel?: boolean;
  isLoading?: boolean;
  cancelText?: string;
  link?: boolean;
}

interface BaseAlertProps extends AlertOptions {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onCancel?: () => void;
}

export default function Alert({
  open,
  onClose,
  onSubmit,

  ...rest
}: BaseAlertProps) {
  const [mounted, setMounted] = React.useState(false);
  const outerRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const submitButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = React.useRef<HTMLDivElement | null>(null);

  const dragging = React.useRef(false);
  const start = React.useRef({ x: 0, y: 0 });
  const pos = React.useRef({ x: 0, y: 0 });

  const { title, variant, submitText, isLoading, link } = rest;

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const handleKeydown = (e: KeyboardEvent) => {
      if (isLoading) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        onSubmit();
      }
    };

    window.addEventListener('keydown', handleKeydown, true);

    return () => {
      window.removeEventListener('keydown', handleKeydown, true);
    };
  }, [open, onClose, onSubmit, isLoading]);

  React.useEffect(() => {
    if (open && !isLoading) {
      const timer = setTimeout(() => {
        submitButtonRef.current?.focus();
      }, 100);

      pos.current = { x: 0, y: 0 };
      if (innerRef.current) {
        innerRef.current.style.transform = 'translate3d(0,0,0)';
      }

      return () => clearTimeout(timer);
    }
  }, [open, isLoading]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (
      e.target === submitButtonRef.current ||
      e.target === closeButtonRef.current ||
      isLoading
    ) {
      e.stopPropagation();
      return;
    }

    if (e.button !== 0) return;

    dragging.current = true;
    start.current = {
      x: e.clientX - pos.current.x,
      y: e.clientY - pos.current.y
    };

    innerRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;

    const x = e.clientX - start.current.x;
    const y = e.clientY - start.current.y;
    pos.current = { x, y };

    if (innerRef.current) {
      innerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    innerRef.current?.releasePointerCapture(e.pointerId);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  useDisableBodyScroll(open);

  // DismissableLayerBranch mendaftarkan node ini sebagai "cabang" milik semua
  // DismissableLayer Radix yang sedang terbuka (Dialog form, Popover, Select).
  // Tanpa itu, pointerdown di backdrop alert dianggap klik DI LUAR dialog dan
  // Radix menutup form modal yang ada di belakangnya.
  const alertContent = (
    <DismissableLayerBranch>
      <div
        ref={outerRef}
        className={cn(
          'fixed inset-0 z-[2147483640]',
          open ? 'visible bg-black/30' : 'invisible bg-transparent'
        )}
        style={{ pointerEvents: open ? 'auto' : 'none' }}
        onClick={handleBackdropClick}
        aria-hidden={!open}
      />

      {/* Alert Container */}
      <div
        className={cn(
          'fixed inset-0 z-[2147483641] flex items-center justify-center p-4',
          open ? 'visible' : 'invisible'
        )}
        style={{ pointerEvents: open ? 'auto' : 'none' }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-description"
      >
        <div
          ref={innerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={cn(
            'relative flex w-full cursor-move flex-col overflow-hidden rounded-sm border border-blue-500 px-1 py-1 shadow-2xl md:w-[300px] lg:w-[300px]',
            open ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
            isLoading && 'cursor-not-allowed'
          )}
          style={{
            background: 'linear-gradient(to bottom, #eff5ff 0%, #e0ecff 10%)',
            pointerEvents: 'auto',
            isolation: 'isolate'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 mt-2 flex w-full flex-row items-center justify-end">
            <div
              ref={closeButtonRef}
              className="w-fit rounded-sm bg-red-500"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <FaTimes
                className="cursor-pointer text-white"
                onClick={onClose}
              />
            </div>
          </div>

          {/* Alert Content */}
          <div className="flex flex-col items-center border border-blue-500 border-b-[#dddddd] bg-white px-2 py-4">
            {/* Icon */}
            {variant === 'danger' && (
              <HiExclamationTriangle className="text-yellow-500" size={35} />
            )}
            {variant === 'success' && (
              <HiCheckCircle className="text-green-700" size={35} />
            )}

            {/* Title */}
            <div className="mt-1 text-center">
              <h3
                id="alert-title"
                className="text-title text-base font-medium uppercase leading-6 text-zinc-900 md:text-3xl lg:text-xs"
              >
                {title}
              </h3>
            </div>

            {link && (
              <div className="mt-2">
                <a
                  href="https://web.transporindo.com/tutorial-agent-printer/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer text-sm text-blue-500 underline hover:text-blue-700"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(
                      'https://web.transporindo.com/tutorial-agent-printer/',
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  INSTALL PRINTER
                </a>
              </div>
            )}

            {isLoading && (
              <div className="mt-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
              </div>
            )}
          </div>

          {(variant === 'danger' || variant === 'success') && (
            <div className="flex flex-col-reverse items-center justify-center gap-4 border-x border-b border-blue-500 border-t-[#dddddd] bg-[#f4f4f4] py-2 md:flex-row">
              {rest.cancelText && (
                <Button
                  variant="secondary"
                  className="z-[9999999] w-fit rounded-sm border border-blue-500 bg-white px-3 py-2 font-bold capitalize text-blue-500 hover:bg-blue-500 hover:text-white md:w-fit"
                  onClick={rest.onCancel ?? onClose}
                >
                  {rest.cancelText}
                </Button>
              )}
              <Button
                variant="destructive"
                className={cn(
                  'w-fit rounded-sm border border-blue-500 bg-white px-3 py-2 font-bold capitalize text-blue-500 hover:bg-blue-500 hover:text-white md:w-fit',
                  isLoading && 'cursor-not-allowed opacity-50'
                )}
                onClick={() => !isLoading && onSubmit()}
                ref={submitButtonRef}
                tabIndex={0}
                disabled={isLoading}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label={submitText}
              >
                {isLoading ? 'Loading...' : submitText}
              </Button>
            </div>
          )}
        </div>
      </div>
    </DismissableLayerBranch>
  );

  if (!mounted || typeof window === 'undefined') return null;

  let portalRoot = document.getElementById('alert-portal-root');
  if (!portalRoot) {
    portalRoot = document.createElement('div');
    portalRoot.id = 'alert-portal-root';
    portalRoot.style.position = 'fixed';
    portalRoot.style.top = '0';
    portalRoot.style.left = '0';
    portalRoot.style.right = '0';
    portalRoot.style.bottom = '0';
    portalRoot.style.pointerEvents = 'none';
    portalRoot.style.zIndex = '2147483647';
    document.body.appendChild(portalRoot);
  }

  return createPortal(alertContent, portalRoot);
}
