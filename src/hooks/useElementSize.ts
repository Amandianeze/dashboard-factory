import { useEffect, useRef, useState } from 'react';

/** Track an element's content-box size with ResizeObserver. */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((s) =>
        Math.round(s.width) === Math.round(width) && Math.round(s.height) === Math.round(height)
          ? s
          : { width, height },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}
