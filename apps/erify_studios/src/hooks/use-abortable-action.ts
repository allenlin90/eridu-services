import { useCallback, useEffect, useRef, useState } from 'react';

export type UseAbortableActionResult = {
  isRunning: boolean;
  run: <T>(action: (signal: AbortSignal) => Promise<T>) => Promise<T | undefined>;
};

/**
 * Coordinates a one-at-a-time async action with an AbortController.
 *
 * Each `run` call aborts any in-flight action, swaps in a fresh controller,
 * and flips `isRunning` to true. The loading flag is only cleared when the
 * call's own controller is still the active one — a stale (aborted) call's
 * finally block never resets state mid-flight while a newer call is running.
 */
export function useAbortableAction(): UseAbortableActionResult {
  const [isRunning, setIsRunning] = useState(false);
  const activeControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      activeControllerRef.current?.abort();
    };
  }, []);

  const run = useCallback(async <T>(action: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> => {
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    setIsRunning(true);

    try {
      return await action(controller.signal);
    } finally {
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
        setIsRunning(false);
      }
    }
  }, []);

  return { isRunning, run };
}
