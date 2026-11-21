import { renderHook } from '@testing-library/react';
import { useShiftHorizontalScroll } from '../use-shift-horizontal-scroll';

const buatKontainer = ({
  scrollWidth,
  clientWidth,
  overflowX = 'auto'
}: {
  scrollWidth: number;
  clientWidth: number;
  overflowX?: string;
}) => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth });
  Object.defineProperty(el, 'clientWidth', { value: clientWidth });
  el.style.overflowX = overflowX;

  const anak = document.createElement('span');
  el.appendChild(anak);
  document.body.appendChild(el);

  return { el, anak };
};

const kirimWheel = (
  target: Element,
  init: {
    deltaY?: number;
    deltaX?: number;
    shiftKey?: boolean;
    ctrlKey?: boolean;
  }
) => {
  const event = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    deltaY: init.deltaY ?? 0,
    deltaX: init.deltaX ?? 0,
    shiftKey: init.shiftKey ?? false,
    ctrlKey: init.ctrlKey ?? false
  });
  target.dispatchEvent(event);
  return event;
};

beforeEach(() => {
  document.body.innerHTML = '';
});

test('shift + scroll menggeser kontainer dan mengklaim event-nya', () => {
  renderHook(() => useShiftHorizontalScroll());
  const { el, anak } = buatKontainer({ scrollWidth: 2000, clientWidth: 500 });
  el.scrollLeft = 0;

  const event = kirimWheel(anak, { deltaY: 120, shiftKey: true });

  expect(el.scrollLeft).toBe(120);
  expect(event.defaultPrevented).toBe(true);
});

test('scroll tanpa shift tidak diubah sama sekali', () => {
  renderHook(() => useShiftHorizontalScroll());
  const { el, anak } = buatKontainer({ scrollWidth: 2000, clientWidth: 500 });
  el.scrollLeft = 0;

  const event = kirimWheel(anak, { deltaY: 120 });

  expect(el.scrollLeft).toBe(0);
  expect(event.defaultPrevented).toBe(false);
});

test('ctrl + shift (zoom browser) dibiarkan', () => {
  renderHook(() => useShiftHorizontalScroll());
  const { el, anak } = buatKontainer({ scrollWidth: 2000, clientWidth: 500 });
  el.scrollLeft = 0;

  const event = kirimWheel(anak, {
    deltaY: 120,
    shiftKey: true,
    ctrlKey: true
  });

  expect(el.scrollLeft).toBe(0);
  expect(event.defaultPrevented).toBe(false);
});

test('kontainer yang tidak bisa digeser horizontal diabaikan', () => {
  renderHook(() => useShiftHorizontalScroll());
  const { el, anak } = buatKontainer({ scrollWidth: 500, clientWidth: 500 });
  el.scrollLeft = 0;

  const event = kirimWheel(anak, { deltaY: 120, shiftKey: true });

  expect(el.scrollLeft).toBe(0);
  expect(event.defaultPrevented).toBe(false);
});

test('sudah mentok di kanan: event tidak diklaim supaya bisa diteruskan', () => {
  renderHook(() => useShiftHorizontalScroll());
  const { el, anak } = buatKontainer({ scrollWidth: 2000, clientWidth: 500 });
  // jsdom tidak mengunci scrollLeft ke batas layout, jadi batasnya ditiru
  // dengan setter yang meng-clamp seperti browser sungguhan.
  let posisi = 1500;
  Object.defineProperty(el, 'scrollLeft', {
    get: () => posisi,
    set: (v: number) => {
      posisi = Math.min(Math.max(v, 0), 1500);
    }
  });

  const event = kirimWheel(anak, { deltaY: 120, shiftKey: true });

  expect(el.scrollLeft).toBe(1500);
  expect(event.defaultPrevented).toBe(false);
});

test('listener dilepas saat modul di-unmount', () => {
  const { unmount } = renderHook(() => useShiftHorizontalScroll());
  const { el, anak } = buatKontainer({ scrollWidth: 2000, clientWidth: 500 });
  el.scrollLeft = 0;

  unmount();
  const event = kirimWheel(anak, { deltaY: 120, shiftKey: true });

  expect(el.scrollLeft).toBe(0);
  expect(event.defaultPrevented).toBe(false);
});

test('enabled: false mematikan perilakunya', () => {
  renderHook(() => useShiftHorizontalScroll({ enabled: false }));
  const { el, anak } = buatKontainer({ scrollWidth: 2000, clientWidth: 500 });
  el.scrollLeft = 0;

  const event = kirimWheel(anak, { deltaY: 120, shiftKey: true });

  expect(el.scrollLeft).toBe(0);
  expect(event.defaultPrevented).toBe(false);
});
