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
