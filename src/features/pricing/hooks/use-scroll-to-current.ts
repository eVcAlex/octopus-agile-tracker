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

    // Use setTimeout to ensure iOS Safari has fully completed layout.
    // rAF alone isn't reliable on mobile Safari for scroll measurements.
    const timer = setTimeout(() => {
      const c = containerRef.current;
      const r = currentRef.current;
      if (!c || !r) return;

      // Use getBoundingClientRect for reliable cross-browser measurement
      // instead of offsetTop which can be unreliable on iOS.
      const containerRect = c.getBoundingClientRect();
      const rowRect = r.getBoundingClientRect();
      const rowCenterInContainer =
        rowRect.top - containerRect.top + c.scrollTop + rowRect.height / 2;
      c.scrollTop = rowCenterInContainer - c.clientHeight / 2;
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { containerRef, currentRef };
}
