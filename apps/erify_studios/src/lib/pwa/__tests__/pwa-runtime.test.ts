import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const registerSWMock = vi.fn();

vi.mock('virtual:pwa-register', () => ({
  registerSW: registerSWMock,
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

describe('pwaRuntime', () => {
  const originalProd = import.meta.env.PROD;
  const originalLocation = window.location;

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
    controllerChangeHandler?.();
    onNeedRefreshHandler?.();
    controllerChangeHandler?.();

    expect(triggerUpdate).toHaveBeenCalledTimes(1);
    expect(triggerUpdate).toHaveBeenCalledWith(true);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    expect(consoleWarnSpy).toHaveBeenNthCalledWith(
      1,
      'PWA update applied. Restart or refresh the app when convenient to load the latest shell.',
    );
    expect(consoleWarnSpy).toHaveBeenNthCalledWith(
      2,
      'PWA update already forced one refresh in this session. Further updates require a manual refresh.',
    );
    consoleWarnSpy.mockRestore();
  });

  it('falls back to an in-memory reload guard when sessionStorage is unavailable', async () => {
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

    const reloadSpy = vi.fn();
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const getItemSpy = vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    const setItemSpy = vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

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

    expect(controllerChangeHandler).toBeTypeOf('function');
    controllerChangeHandler?.();
    controllerChangeHandler?.();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'PWA update already forced one refresh in this session. Further updates require a manual refresh.',
    );

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('logs registration errors safely', async () => {
    const addEventListener = vi.fn();
    mockServiceWorker({
      addEventListener,
      getRegistration: vi.fn(),
      getRegistrations: vi.fn(),
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    registerSWMock.mockImplementation((options: {
      onRegisterError?: (error: unknown) => void;
    }) => {
      options.onRegisterError?.(new Error('boom'));
      return vi.fn();
    });

    const { initializePwaShell } = await import('../pwa-runtime');
    initializePwaShell();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'PWA service worker registration failed',
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });

  it('recovers by unregistering service workers and clearing caches', async () => {
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

    const { recoverPwaShell } = await import('../pwa-runtime');
    await recoverPwaShell({ reload: false });

    expect(unregisterOne).toHaveBeenCalledTimes(1);
    expect(unregisterTwo).toHaveBeenCalledTimes(1);
    expect(cacheDeleteMock).toHaveBeenCalledWith('workbox-precache-v1');
    expect(cacheDeleteMock).toHaveBeenCalledWith('runtime-v1');
  });
});
