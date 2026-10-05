import { useState, useEffect, useRef } from "react";

export function useCountUp(target: number, duration = 1200, once = false, decimals = 0) {
  const [count, setCount] = useState(0);
  const finished = useRef(false);

  useEffect(() => {
    if ((once && finished.current) || duration <= 0 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setCount(target);
      finished.current = true;
      return;
    }
    const startTime = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Number((eased * target).toFixed(decimals)));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finished.current = true;
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, once, decimals]);

  return count;
}
