import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const registerSWMock = vi.fn();

vi.mock('virtual:pwa-register', () => ({
  registerSW: registerSWMock,
}));

vi.mock('@/lib/api', () => ({
  clearPersistedCache: vi.fn().mockResolvedValue(undefined),
}));

type ServiceWorkerMock = {
  addEventListener: ReturnType<typeof vi.fn>;
  getRegistration: ReturnType<typeof vi.fn>;
  getRegistrations: ReturnType<typeof vi.fn>;
};

function mockServiceWorker(serviceWorker: ServiceWorkerMock) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: serviceWorker,
  });
}

function mockNavigatorEnvironment({
  userAgent,
  platform,
  maxTouchPoints,
}: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}) {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  });
  Object.defineProperty(navigator, 'platform', {
    configurable: true,
    value: platform,
  });
  Object.defineProperty(navigator, 'maxTouchPoints', {
    configurable: true,
    value: maxTouchPoints,
  });
}

describe('pwaRuntime', () => {
  const originalProd = import.meta.env.PROD;
  const originalLocation = window.location;
  const originalUserAgent = navigator.userAgent;
  const originalPlatform = navigator.platform;
  const originalMaxTouchPoints = navigator.maxTouchPoints;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    (import.meta.env as { PROD: boolean }).PROD = true;
    registerSWMock.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    (import.meta.env as { PROD: boolean }).PROD = originalProd;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    });
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: originalPlatform,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: originalMaxTouchPoints,
    });
  });

  it('does not register service worker outside production', async () => {
    (import.meta.env as { PROD: boolean }).PROD = false;
    const addEventListener = vi.fn();
    mockServiceWorker({
      addEventListener,
      getRegistration: vi.fn(),
      getRegistrations: vi.fn(),
    });

    const { initializePwaShell } = await import('../pwa-runtime');
    initializePwaShell();

    expect(registerSWMock).not.toHaveBeenCalled();
    expect(addEventListener).not.toHaveBeenCalled();
  });

  it('registers service worker and starts periodic update checks', async () => {
    const registration = {
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration;

    const addEventListener = vi.fn();
    mockServiceWorker({
      addEventListener,
      getRegistration: vi.fn().mockResolvedValue(registration),
      getRegistrations: vi.fn(),
    });

    registerSWMock.mockImplementation((options: {
      onRegisteredSW?: (swUrl?: string, registration?: ServiceWorkerRegistration) => void;
    }) => {
      options.onRegisteredSW?.('/sw.js', registration);
      return vi.fn();
    });

    const { initializePwaShell } = await import('../pwa-runtime');
    initializePwaShell();

    expect(registration.update).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(registration.update).toHaveBeenCalledTimes(2);
    expect(addEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function));
  });

  it('does not auto-apply another update after the session already forced a refresh', async () => {
    const registration = {
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration;

    let controllerChangeHandler: (() => void) | null = null;
    const addEventListener = vi.fn().mockImplementation((event: string, handler: () => void) => {
      if (event === 'controllerchange') {
        controllerChangeHandler = handler;
      }
    });
    mockServiceWorker({
      addEventListener,
      getRegistration: vi.fn().mockResolvedValue(registration),
      getRegistrations: vi.fn(),
    });

    const triggerUpdate = vi.fn();
    const reloadSpy = vi.fn();
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let onNeedRefreshHandler: (() => void) | undefined;

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });

    registerSWMock.mockImplementation((options: {
      onRegisteredSW?: (swUrl?: string, registration?: ServiceWorkerRegistration) => void;
      onNeedRefresh?: () => void;
    }) => {
      options.onRegisteredSW?.('/sw.js', registration);
      onNeedRefreshHandler = options.onNeedRefresh;
      return triggerUpdate;
    });

    const { initializePwaShell } = await import('../pwa-runtime');
    initializePwaShell();

    onNeedRefreshHandler?.();
    expect(controllerChangeHandler).toBeTypeOf('function');
    // TS strictNullChecks narrows a `let` reassigned only inside a callback to `never` on read;
    // the cast restores the declared type (known TS control-flow limitation, not a real type issue).
    (controllerChangeHandler as (() => void) | null)?.();
    onNeedRefreshHandler?.();
    (controllerChangeHandler as (() => void) | null)?.();

    expect(triggerUpdate).toHaveBeenCalledTimes(1);
    expect(triggerUpdate).toHaveBeenCalledWith(true);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    consoleWarnSpy.mockRestore();
  });

  it('skips controllerchange reload on iOS', async () => {
    const registration = {
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration;

    let controllerChangeHandler: (() => void) | null = null;
    const addEventListener = vi.fn().mockImplementation((event: string, handler: () => void) => {
      if (event === 'controllerchange') {
        controllerChangeHandler = handler;
      }
    });

    mockNavigatorEnvironment({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
    });

    mockServiceWorker({
      addEventListener,
      getRegistration: vi.fn().mockResolvedValue(registration),
      getRegistrations: vi.fn(),
    });

    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });

    registerSWMock.mockImplementation((options: {
      onRegisteredSW?: (swUrl?: string, registration?: ServiceWorkerRegistration) => void;
    }) => {
      options.onRegisteredSW?.('/sw.js', registration);
      return vi.fn();
    });

    const { initializePwaShell } = await import('../pwa-runtime');
    initializePwaShell();

    // See narrowing-limitation note above.
    (controllerChangeHandler as (() => void) | null)?.();
    (controllerChangeHandler as (() => void) | null)?.();

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('keeps updates pending on iOS until manually applied without reload', async () => {
    const registration = {
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration;

    mockNavigatorEnvironment({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
    });

    mockServiceWorker({
      addEventListener: vi.fn(),
      getRegistration: vi.fn().mockResolvedValue(registration),
      getRegistrations: vi.fn(),
    });

    const triggerUpdate = vi.fn().mockResolvedValue(undefined);
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let onNeedRefreshHandler: (() => void) | undefined;

    registerSWMock.mockImplementation((options: {
      onRegisteredSW?: (swUrl?: string, registration?: ServiceWorkerRegistration) => void;
      onNeedRefresh?: () => void;
    }) => {
      options.onRegisteredSW?.('/sw.js', registration);
      onNeedRefreshHandler = options.onNeedRefresh;
      return triggerUpdate;
    });

    const { checkForPwaUpdates, initializePwaShell } = await import('../pwa-runtime');
    initializePwaShell();

    onNeedRefreshHandler?.();

    expect(triggerUpdate).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'PWA update is ready on iOS. Use Check for updates or restart the app to apply the latest shell.',
    );

    const didApplyPendingUpdate = await checkForPwaUpdates();
    expect(didApplyPendingUpdate).toBe(true);
    expect(triggerUpdate).toHaveBeenCalledTimes(1);
    expect(triggerUpdate).toHaveBeenCalledWith(false);

    consoleWarnSpy.mockRestore();
  });

  it('recovers by unregistering service workers, clearing caches, and query persistence', async () => {
    const unregisterOne = vi.fn().mockResolvedValue(true);
    const unregisterTwo = vi.fn().mockResolvedValue(true);
    mockServiceWorker({
      addEventListener: vi.fn(),
      getRegistration: vi.fn(),
      getRegistrations: vi.fn().mockResolvedValue([
        { unregister: unregisterOne },
        { unregister: unregisterTwo },
      ]),
    });

    const cacheDeleteMock = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['workbox-precache-v1', 'runtime-v1']),
      delete: cacheDeleteMock,
    });

    const { clearPersistedCache } = await import('@/lib/api');
    const { recoverPwaShell } = await import('../pwa-runtime');
    await recoverPwaShell({ reload: false });

    expect(clearPersistedCache).toHaveBeenCalledTimes(1);
    expect(unregisterOne).toHaveBeenCalledTimes(1);
    expect(unregisterTwo).toHaveBeenCalledTimes(1);
    expect(cacheDeleteMock).toHaveBeenCalledWith('workbox-precache-v1');
    expect(cacheDeleteMock).toHaveBeenCalledWith('runtime-v1');
  });
});
