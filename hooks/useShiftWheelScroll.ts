import { useEffect, useState } from 'react';

// Scroll lock milik Dialog membaca shift+wheel sebagai scroll vertikal (deltaY) lalu membatalkannya, jadi grid digeser manual.
export function useShiftWheelScroll() {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.shiftKey) return;
      const grid = (event.target as Element).closest<HTMLElement>('.rdg');
      if (!grid || !container.contains(grid)) return;

      event.preventDefault();
      grid.scrollLeft += event.deltaY || event.deltaX;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [container]);

  return setContainer;
}
