import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAbortableAction } from '../use-abortable-action';

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason?: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAbortableAction', () => {
  it('flips isRunning while the action is in-flight and clears it when the action resolves', async () => {
    const { result } = renderHook(() => useAbortableAction());

    expect(result.current.isRunning).toBe(false);

    const deferred = createDeferred<string>();
    let runPromise!: Promise<string | undefined>;
    act(() => {
      runPromise = result.current.run(async () => deferred.promise);
    });

    await waitFor(() => expect(result.current.isRunning).toBe(true));

    await act(async () => {
      deferred.resolve('done');
      await runPromise;
    });

    expect(result.current.isRunning).toBe(false);
  });

  it('aborts the previous action when a new one starts', async () => {
    const { result } = renderHook(() => useAbortableAction());

    let firstSignal!: AbortSignal;
    const first = createDeferred<void>();
    act(() => {
      void result.current.run(async (signal) => {
        firstSignal = signal;
        await first.promise;
      });
    });

    await waitFor(() => expect(firstSignal).toBeDefined());
    expect(firstSignal.aborted).toBe(false);

    act(() => {
      void result.current.run(async () => {
        // second action — never resolves in this test
        await new Promise(() => {});
      });
    });

    expect(firstSignal.aborted).toBe(true);
  });

  it('keeps isRunning=true when an aborted earlier call resolves while a newer call is still in flight', async () => {
    // This is the regression Codex flagged on /task-setup: an earlier
    // export's `finally` must NOT clear the loading state if a newer export
    // is already running.
    const { result } = renderHook(() => useAbortableAction());

    const first = createDeferred<string>();
    let firstRun!: Promise<string | undefined>;
    act(() => {
      firstRun = result.current.run(async () => first.promise);
    });
    await waitFor(() => expect(result.current.isRunning).toBe(true));

    const second = createDeferred<string>();
    let secondRun!: Promise<string | undefined>;
    act(() => {
      secondRun = result.current.run(async () => second.promise);
    });

    // Resolve the (now-stale) first call. Its finally runs but must NOT clear
    // isRunning because it is no longer the active controller.
    await act(async () => {
      first.resolve('stale');
      await firstRun;
    });
    expect(result.current.isRunning).toBe(true);

    // Resolving the active (second) call clears the loading state.
    await act(async () => {
      second.resolve('fresh');
      await secondRun;
    });
    expect(result.current.isRunning).toBe(false);
  });

  it('clears isRunning when the action throws', async () => {
    const { result } = renderHook(() => useAbortableAction());

    const failure = new Error('boom');

    await act(async () => {
      await expect(
        result.current.run(async () => {
          throw failure;
        }),
      ).rejects.toBe(failure);
    });

    expect(result.current.isRunning).toBe(false);
  });

  it('aborts the active controller on unmount', async () => {
    const { result, unmount } = renderHook(() => useAbortableAction());

    let signal!: AbortSignal;
    act(() => {
      void result.current.run(async (s) => {
        signal = s;
        await new Promise(() => {});
      });
    });
    await waitFor(() => expect(signal).toBeDefined());

    unmount();

    expect(signal.aborted).toBe(true);
  });
});
