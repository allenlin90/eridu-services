export function resolveUpdater<T>(updater: T | ((previous: T) => T), previous: T): T {
  return typeof updater === 'function'
    ? (updater as (current: T) => T)(previous)
    : updater;
}
