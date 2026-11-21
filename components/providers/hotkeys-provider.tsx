'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef
} from 'react';
import { usePathname } from 'next/navigation';

type HotkeyHandler = (event: KeyboardEvent) => void;

type HotkeyBinding =
  | HotkeyHandler
  | {
      handler: HotkeyHandler;
      allowInInput?: boolean;
    };

type HotkeyMap = Record<string, HotkeyBinding>;

type Registration = {
  id: string;
  bindings: HotkeyMap;
};

type HotkeysContextValue = {
  register: (id: string, bindings: HotkeyMap) => void;
  unregister: (id: string) => void;
};

const HotkeysContext = createContext<HotkeysContextValue | null>(null);

function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLInputElement) return true;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return false;
}

function normalizeCombo(combo: string): string {
  const raw = combo.toLowerCase().replaceAll(' ', '');

  const parts = raw.split('+').filter(Boolean);
  const modifiers = new Set<string>();
  let key = '';

  for (const part of parts) {
    if (part === 'control' || part === 'ctrl') modifiers.add('ctrl');
    else if (part === 'cmd' || part === 'command' || part === 'meta')
      modifiers.add('meta');
    else if (part === 'alt' || part === 'option') modifiers.add('alt');
    else if (part === 'shift') modifiers.add('shift');
    else key = part;
  }

  const ordered: string[] = [];
  if (modifiers.has('ctrl')) ordered.push('ctrl');
  if (modifiers.has('meta')) ordered.push('meta');
  if (modifiers.has('alt')) ordered.push('alt');
  if (modifiers.has('shift')) ordered.push('shift');

  if (!key) key = '';

  return [...ordered, key].filter(Boolean).join('+');
}

function eventToCombo(event: KeyboardEvent): string {
  // Sebagian keydown (autofill, event yang di-dispatch programatik, atau state
  // IME tertentu) tidak punya `event.key` → `.toLowerCase()` melempar
  // "Cannot read properties of undefined". Kembalikan '' agar onKeyDown bail.
  if (!event.key) return '';

  const parts: string[] = [];
  if (event.ctrlKey) parts.push('ctrl');
  if (event.metaKey) parts.push('meta');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');

  let key = event.key.toLowerCase();
  if (key === ' ') key = 'space';

  // Normalize common aliases
  if (key === 'esc') key = 'escape';

  parts.push(key);
  return parts.join('+');
}

export function HotkeysProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const enabled = useMemo(
    () => (pathname ? pathname.startsWith('/dashboard') : false),
    [pathname]
  );

  const registrationsRef = useRef<Registration[]>([]);

  const register = useCallback((id: string, bindings: HotkeyMap) => {
    const normalized: HotkeyMap = {};
    for (const [combo, binding] of Object.entries(bindings)) {
      normalized[normalizeCombo(combo)] = binding;
    }

    registrationsRef.current = [
      ...registrationsRef.current.filter((r) => r.id !== id),
      { id, bindings: normalized }
    ];
  }, []);

  const unregister = useCallback((id: string) => {
    registrationsRef.current = registrationsRef.current.filter(
      (r) => r.id !== id
    );
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      // ignore IME composition
      if ((event as any).isComposing) return;

      const combo = eventToCombo(event);
      if (!combo) return;

      const activeEl = document.activeElement;
      const isInInput = isEditableElement(activeEl);

      const regs = registrationsRef.current;
      for (let i = regs.length - 1; i >= 0; i--) {
        const binding = regs[i].bindings[combo];
        if (!binding) continue;

        const handler =
          typeof binding === 'function' ? binding : binding.handler;
        const allowInInput =
          typeof binding === 'function' ? false : Boolean(binding.allowInInput);

        if (isInInput && !allowInInput) return;

        event.preventDefault();
        event.stopPropagation();
        handler(event);
        return;
      }
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enabled]);

  const value = useMemo<HotkeysContextValue>(
    () => ({ register, unregister }),
    [register, unregister]
  );

  return (
    <HotkeysContext.Provider value={value}>{children}</HotkeysContext.Provider>
  );
}

export function useHotkeys(
  bindings: HotkeyMap,
  options?: {
    enabled?: boolean;
  }
) {
  const id = useId();
  const ctx = useContext(HotkeysContext);

  useEffect(() => {
    if (!ctx) return;
    if (options?.enabled === false) {
      ctx.unregister(id);
      return;
    }

    ctx.register(id, bindings);
    return () => ctx.unregister(id);
  }, [ctx, id, bindings, options?.enabled]);
}

export function useCrudHotkeys(params: {
  onAdd?: () => void;
  onEdit?: () => void;
  enabled?: boolean;
}) {
  const { onAdd, onEdit, enabled } = params;

  useHotkeys(
    {
      ...(onAdd
        ? {
            'alt+a': () => {
              onAdd();
            }
          }
        : {}),
      ...(onEdit
        ? {
            'alt+e': () => {
              onEdit();
            }
          }
        : {})
    },
    { enabled }
  );
}
