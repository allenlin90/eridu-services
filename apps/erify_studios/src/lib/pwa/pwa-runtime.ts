import { registerSW } from 'virtual:pwa-register';

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const CONTROLLER_CHANGE_RELOAD_FLAG = 'erify_studios_pwa_controller_change_reloaded';

let activeRegistration: ServiceWorkerRegistration | null = null;
let updateIntervalId: number | null = null;
let hasControllerChangeListener = false;

function isPwaRuntimeSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

function installControllerChangeReloadGuard() {
  if (!isPwaRuntimeSupported() || hasControllerChangeListener) {
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const hasReloaded = sessionStorage.getItem(CONTROLLER_CHANGE_RELOAD_FLAG) === '1';
    if (hasReloaded) {
      return;
    }

    sessionStorage.setItem(CONTROLLER_CHANGE_RELOAD_FLAG, '1');
    window.location.reload();
  });

  hasControllerChangeListener = true;
}

function startPeriodicUpdateChecks(registration: ServiceWorkerRegistration) {
  if (updateIntervalId !== null) {
    window.clearInterval(updateIntervalId);
  }

  updateIntervalId = window.setInterval(() => {
    void registration.update().catch((error) => {
      console.error('PWA periodic service worker update check failed', error);
    });
  }, UPDATE_CHECK_INTERVAL_MS);
}

export function initializePwaShell() {
  if (!import.meta.env.PROD || !isPwaRuntimeSupported()) {
    return;
  }

  installControllerChangeReloadGuard();

  const triggerUpdate = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) {
        console.warn('PWA service worker registration returned no registration object');
        return;
      }

      activeRegistration = registration;
      void registration.update().catch((error) => {
        console.error('PWA initial service worker update check failed', error);
      });
      startPeriodicUpdateChecks(registration);
    },
    onNeedRefresh() {
      void triggerUpdate(true);
    },
    onRegisterError(error) {
      console.error('PWA service worker registration failed', error);
    },
  });
}

export async function checkForPwaUpdates(): Promise<boolean> {
  if (!isPwaRuntimeSupported()) {
    return false;
  }

  const registration = activeRegistration ?? await navigator.serviceWorker.getRegistration();
  if (!registration) {
    return false;
  }

  activeRegistration = registration;
  await registration.update();
  return true;
}

export async function recoverPwaShell(options?: { reload?: boolean }) {
  const reload = options?.reload ?? true;

  if (typeof window === 'undefined') {
    return;
  }

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    }

    sessionStorage.removeItem(CONTROLLER_CHANGE_RELOAD_FLAG);
    activeRegistration = null;

    if (updateIntervalId !== null) {
      window.clearInterval(updateIntervalId);
      updateIntervalId = null;
    }

    if (reload) {
      window.location.reload();
    }
  } catch (error) {
    console.error('PWA recovery failed', error);
    throw error;
  }
}
