import { useCallback, useRef, useState } from "react";

/** Track only this action's promise, and block duplicate submissions until it settles. */
export const usePendingAction = () => {
  const [isPending, setIsPending] = useState(false);
  const running = useRef(false);
  const run = useCallback(async <T,>(action: () => T | Promise<T>): Promise<T | undefined> => {
    if (running.current) return;
    running.current = true;
    try {
      const result = action();
      if (result && typeof (result as Promise<T>).then === "function") {
        setIsPending(true);
        return await result;
      }
      return result;
    } finally {
      running.current = false;
      setIsPending(false);
    }
  }, []);
  return { isPending, run };
};
