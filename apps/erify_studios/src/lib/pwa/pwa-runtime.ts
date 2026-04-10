import { registerSW } from 'virtual:pwa-register';

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const CONTROLLER_CHANGE_REFRESH_KEY = 'erify-studios:pwa-controllerchange-refreshed';
const IOS_PENDING_UPDATE_NOTICE = 'PWA update is ready on iOS. Use Check for updates or restart the app to apply the latest shell.';

let activeRegistration: ServiceWorkerRegistration | null = null;
let updateIntervalId: number | null = null;
let hasControllerChangeListener = false;
let hasForcedRefreshFallback = false;
let hasLoggedRefreshNotice = false;
let hasLoggedReloadBlockNotice = false;
let pendingUpdateActivator: ((reloadPage?: boolean) => Promise<void>) | null = null;

function isPwaRuntimeSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

function isIosWebKitEnvironment() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;

  return /iPad|iPhone|iPod/.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);
}

function hasForcedRefreshThisSession() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (hasForcedRefreshFallback) {
    return true;
  }

  try {
    return window.sessionStorage.getItem(CONTROLLER_CHANGE_REFRESH_KEY) === 'true';
  } catch {
    return hasForcedRefreshFallback;
  }
}

function markForcedRefreshThisSession() {
  if (typeof window === 'undefined') {
    return;
  }

  hasForcedRefreshFallback = true;

  try {
    window.sessionStorage.setItem(CONTROLLER_CHANGE_REFRESH_KEY, 'true');
  } catch {
    // Ignore storage failures and fall back to in-memory guard behavior.
  }
}

function clearForcedRefreshThisSession() {
  if (typeof window === 'undefined') {
    return;
  }

  hasForcedRefreshFallback = false;

  try {
    window.sessionStorage.removeItem(CONTROLLER_CHANGE_REFRESH_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function installControllerChangeReloadGuard() {
  if (!isPwaRuntimeSupported() || hasControllerChangeListener) {
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    pendingUpdateActivator = null;

    if (hasForcedRefreshThisSession()) {
      if (hasLoggedReloadBlockNotice) {
        return;
      }

      hasLoggedReloadBlockNotice = true;
      console.warn('PWA update already forced one refresh in this session. Further updates require a manual refresh.');
      return;
    }

    markForcedRefreshThisSession();
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
  const requiresManualIosUpdate = isIosWebKitEnvironment();

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
      pendingUpdateActivator = triggerUpdate;

      if (requiresManualIosUpdate) {
        if (hasLoggedRefreshNotice) {
          return;
        }

        hasLoggedRefreshNotice = true;
        console.warn(IOS_PENDING_UPDATE_NOTICE);
        return;
      }

      if (hasForcedRefreshThisSession()) {
        if (hasLoggedReloadBlockNotice) {
          return;
        }

        hasLoggedReloadBlockNotice = true;
        console.warn('PWA update already forced one refresh in this session. Further updates require a manual refresh.');
        return;
      }

      void triggerUpdate(true);
      pendingUpdateActivator = null;

      if (hasLoggedRefreshNotice) {
        return;
      }

      hasLoggedRefreshNotice = true;
      console.warn('PWA update applied. Restart or refresh the app when convenient to load the latest shell.');
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

  if (pendingUpdateActivator) {
    const applyPendingUpdate = pendingUpdateActivator;
    pendingUpdateActivator = null;
    await applyPendingUpdate(true);
    return true;
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

    activeRegistration = null;
    pendingUpdateActivator = null;
    hasLoggedReloadBlockNotice = false;
    hasLoggedRefreshNotice = false;
    clearForcedRefreshThisSession();

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
