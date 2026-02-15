import { useEffect, useRef } from 'react';

export type UseInfiniteScrollOptions = {
  /** Whether there are more items to fetch */
  hasNextPage: boolean;
  /** Whether we're currently fetching */
  isFetchingNextPage: boolean;
  /** Function to fetch the next page */
  fetchNextPage: () => void;
  /** How far from the bottom to trigger (default: 25rem / 400px) */
  rootMargin?: string;
  /** Whether the scroll is enabled (default: true) */
  enabled?: boolean;
};

/**
 * Hook that returns a ref to attach to a sentinel element for infinite scroll.
 * When the sentinel enters the viewport (with rootMargin), fetchNextPage is called.
 *
 * @example
 * ```tsx
 * const sentinelRef = useInfiniteScroll({
 *   hasNextPage,
 *   isFetchingNextPage,
 *   fetchNextPage,
 * });
 *
 * return (
 *   <>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={sentinelRef} />
 *   </>
 * );
 * ```
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '400px',
  enabled = true,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<T>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage || !enabled) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin, enabled]);

  return sentinelRef;
}
