import { useEffect, useRef } from 'react';

export function useScrollToCurrent<
  C extends HTMLElement = HTMLDivElement,
  R extends HTMLElement = HTMLDivElement,
>(deps: unknown[]) {
  const containerRef = useRef<C>(null);
  const currentRef = useRef<R>(null);

  useEffect(() => {
    const container = containerRef.current;
    const row = currentRef.current;
    if (!container || !row) return;

    // Double rAF ensures the browser has completed layout and paint
    // before we measure offsets — single rAF isn't enough on mobile Safari.
    let outer: number;
    let inner: number;
    outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        const r = currentRef.current;
        const c = containerRef.current;
        if (!c || !r) return;
        const rowCenter = r.offsetTop + r.offsetHeight / 2;
        c.scrollTop = rowCenter - c.clientHeight / 2;
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { containerRef, currentRef };
}
