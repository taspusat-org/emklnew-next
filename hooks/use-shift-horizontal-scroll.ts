import { useEffect } from 'react';

type ShiftHorizontalScrollOptions = {
  enabled?: boolean;
};

const bisaGulungHorizontal = (el: Element): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.scrollWidth <= el.clientWidth) return false;

  const { overflowX } = getComputedStyle(el);
  return overflowX === 'auto' || overflowX === 'scroll';
};

const cariKontainerHorizontal = (
  mulai: EventTarget | null
): HTMLElement | null => {
  let node = mulai instanceof Element ? mulai : null;

  while (node && node !== document.body) {
    if (bisaGulungHorizontal(node)) return node as HTMLElement;
    node = node.parentElement;
  }

  return null;
};

export function useShiftHorizontalScroll({
  enabled = true
}: ShiftHorizontalScrollOptions = {}) {
  useEffect(() => {
    if (!enabled) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.shiftKey) return;
      // Ctrl + wheel = zoom browser, jangan diganggu.
      if (event.ctrlKey) return;

      const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
      if (delta === 0) return;

      const kontainer = cariKontainerHorizontal(event.target);
      if (!kontainer) return;

      const sebelum = kontainer.scrollLeft;
      kontainer.scrollLeft = sebelum + delta;

      // Hanya klaim event-nya kalau posisinya memang berubah, supaya di ujung
      // kiri/kanan scroll masih bisa diteruskan ke elemen induk.
      if (kontainer.scrollLeft !== sebelum) {
        event.preventDefault();
      }
    };

    // capture: react-remove-scroll juga mendengarkan di document; dengan capture
    // hook ini dijamin ikut jalan lebih dulu, tidak bergantung urutan
    // pendaftaran. passive: false supaya preventDefault sah dipanggil.
    document.addEventListener('wheel', onWheel, {
      capture: true,
      passive: false
    });

    return () => {
      document.removeEventListener('wheel', onWheel, { capture: true });
    };
  }, [enabled]);
}
