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
    const rowCenter = row.offsetTop + row.offsetHeight / 2;
    container.scrollTop = rowCenter - container.clientHeight / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { containerRef, currentRef };
}
