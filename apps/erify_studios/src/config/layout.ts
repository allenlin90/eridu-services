/**
 * Centralized app-shell layout constants.
 *
 * The shell chrome above page content — the top nav, the `PageLayout`
 * header/breadcrumb, and surrounding padding — is ~13rem tall. Page regions
 * that should fill the remaining viewport (loaders, empty states, tall panels)
 * derive their height from that single offset instead of scattering
 * `calc(100vh-13rem)` magic numbers across the app.
 *
 * These are full literal Tailwind classes (not interpolated) so the JIT scanner
 * picks them up via `@source` — keep the value here and import the constant.
 */

/** Min-height that fills the viewport below the shell chrome (grows with content). */
export const CONTENT_AREA_MIN_H = 'min-h-[calc(100vh-13rem)]';

/** Fixed height that fills the viewport below the shell chrome. */
export const CONTENT_AREA_H = 'h-[calc(100vh-13rem)]';

/** Scroll-viewport max-height for an in-page data table (shell + page header + table chrome ≈ 16rem). */
export const TABLE_SCROLL_MAX_H = 'max-h-[calc(100vh-16rem)]';

/** Min-height for a full-bleed centered page below only the top nav (≈ 4rem), e.g. not-found. */
export const CENTERED_PAGE_MIN_H = 'min-h-[calc(100vh-4rem)]';

/** Max-height for a floating popover/overlay — viewport minus ≈ 8rem chrome; `dvh` accounts for mobile browser UI. */
export const OVERLAY_MAX_H = 'max-h-[calc(100dvh-8rem)]';

/** Width filling the viewport minus the page gutter (≈ 2rem), for mobile popovers/cells. */
export const VIEWPORT_GUTTER_W = 'w-[calc(100vw-2rem)]';
