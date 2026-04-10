/**
 * AnimatedList — FLIP-based animated reorder for keyed list items.
 *
 * Wraps each child in a div that smoothly transitions its position when
 * the list order changes. Uses the FLIP technique (First, Last, Invert, Play).
 *
 * Usage:
 *   <AnimatedList items={stops} getKey={(s) => s.id}>
 *     {(stop) => <StopListItem stop={stop} />}
 *   </AnimatedList>
 */

import { useRef, useLayoutEffect, type ReactNode } from "react";

interface AnimatedListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  children: (item: T, index: number) => ReactNode;
  className?: string;
}

const DURATION = 350;

function AnimatedList<T>({ items, getKey, children, className }: AnimatedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  

  // Capture positions BEFORE React commits the new DOM
  // We read current bounding boxes of every keyed child.
  // Before every render, snapshot current positions
  // Using a ref callback pattern: we capture right before layout effect fires.
  // We call capturePositions synchronously before the DOM updates.
  // React 18: useLayoutEffect fires after DOM mutation but before paint.
  // So we need to capture BEFORE mutation — we do it via a ref that's read each render.
  const prevPositions = useRef<Map<string, DOMRect>>(new Map());

  // Snapshot current positions on every render (before DOM updates commit)
  // This runs during render phase — reads only, no side effects.
  if (containerRef.current) {
    const map = new Map<string, DOMRect>();
    for (const child of Array.from(containerRef.current.children) as HTMLElement[]) {
      const key = child.dataset.flipKey;
      if (key) map.set(key, child.getBoundingClientRect());
    }
    prevPositions.current = map;
  }

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prev = prevPositions.current;
    if (prev.size === 0) return;

    for (const child of Array.from(container.children) as HTMLElement[]) {
      const key = child.dataset.flipKey;
      if (!key) continue;

      const oldRect = prev.get(key);
      if (!oldRect) continue;

      const newRect = child.getBoundingClientRect();
      const deltaY = oldRect.top - newRect.top;
      const deltaX = oldRect.left - newRect.left;

      if (Math.abs(deltaY) < 1 && Math.abs(deltaX) < 1) continue;

      // Invert: move element back to old position
      child.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      child.style.transition = "none";

      // Play: animate to new position
      requestAnimationFrame(() => {
        child.style.transition = `transform ${DURATION}ms cubic-bezier(0.25, 0.8, 0.25, 1)`;
        child.style.transform = "";
      });
    }
  });

  return (
    <div ref={containerRef} className={className}>
      {items.map((item, index) => (
        <div key={getKey(item)} data-flip-key={getKey(item)}>
          {children(item, index)}
        </div>
      ))}
    </div>
  );
}

export default AnimatedList;
