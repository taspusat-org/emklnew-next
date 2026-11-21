import { RefObject, useEffect } from 'react';

type FormFocusNavigationOptions = {
  enabled?: boolean;
  includeSelector?: string;
  excludeSelector?: string;
  skipButtons?: boolean;
  stopAtEnds?: boolean;
};

export function useFormFocusNavigation(
  formRef: RefObject<HTMLElement | null>,
  options?: FormFocusNavigationOptions
) {
  const enabled = options?.enabled ?? true;
  const includeSelector =
    options?.includeSelector ??
    'input, select, textarea, button, [tabindex]:not([tabindex="-1"])';
  const excludeSelector =
    options?.excludeSelector ?? '#image-dropzone, #file-input';
  const skipButtons = options?.skipButtons ?? true;
  const stopAtEnds = options?.stopAtEnds ?? true;

  useEffect(() => {
    if (!enabled) return;

    const formEl = formRef.current;
    if (!formEl) return;

    const handler = (event: KeyboardEvent) => {
      const key = event.key;
      if (key !== 'Tab' && key !== 'ArrowDown' && key !== 'ArrowUp') return;

      const active = document.activeElement as HTMLElement | null;
      if (!active) return;
      if (!formEl.contains(active)) return;

      // Don't hijack arrow navigation inside textarea.
      if (
        active.tagName === 'TEXTAREA' &&
        (key === 'ArrowUp' || key === 'ArrowDown')
      ) {
        return;
      }

      const focusables = Array.from(
        formEl.querySelectorAll<HTMLElement>(includeSelector)
      ).filter((el) => {
        if (el.matches(excludeSelector)) return false;
        if (skipButtons && el.tagName === 'BUTTON') return false;
        if (el.hasAttribute('disabled')) return false;
        if (el.getAttribute('aria-disabled') === 'true') return false;
        if (el.hasAttribute('readonly')) return false;
        if (el.getAttribute('tabindex') === '-1') return false;

        if (el.tagName === 'INPUT') {
          const input = el as HTMLInputElement;
          if (input.type === 'hidden') return false;
        }

        return true;
      });

      const index = focusables.indexOf(active);
      if (index === -1) return;

      const delta =
        key === 'ArrowDown'
          ? 1
          : key === 'ArrowUp'
          ? -1
          : event.shiftKey
          ? -1
          : 1;

      const nextIndex = index + delta;

      if (nextIndex < 0 || nextIndex >= focusables.length) {
        // Keep focus within the form controls (same behavior as manual focus management).
        event.preventDefault();

        if (!stopAtEnds && focusables.length > 0) {
          const wrappedIndex = nextIndex < 0 ? focusables.length - 1 : 0;
          focusables[wrappedIndex]?.focus();
        }

        return;
      }

      event.preventDefault();
      focusables[nextIndex]?.focus();
    };

    formEl.addEventListener('keydown', handler);
    return () => {
      formEl.removeEventListener('keydown', handler);
    };
  }, [
    enabled,
    formRef,
    includeSelector,
    excludeSelector,
    skipButtons,
    stopAtEnds
  ]);
}
