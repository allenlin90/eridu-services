# erify_studios bundle/performance — outcome & deferred items

A behavior-preserving frontend performance pass on `apps/erify_studios` (2026-06-14/15), following the [`codebase-hardening-program`](../../.agent/skills/codebase-hardening-program/SKILL.md) playbook. **First-load JS: gzip 350 kB → 176 kB (−50%)**, every PR green (172 test files / 816 tests).

## Shipped
- **FE-T1 — vendor chunking** (#202): `build.rollupOptions.output.manualChunks` extracts stable eager vendors into long-cacheable chunks — `vendor-react` (gzip 61), `vendor-tanstack` (37, query/router only), `vendor-table` (18), `vendor-forms` (29). Eager entry 1.16 MB → 698 kB. Pattern + docs grounded in [`frontend-bundle-splitting`](../../.agent/skills/frontend-bundle-splitting/SKILL.md).
- **FE-T2 — lazy the task-template builder** (#203): `React.lazy` boundary on the ~1138-LOC builder (+ field-editor, form-renderer, dnd-kit) → on-demand chunks; entry 698 → 593 kB (gzip 176). Target chosen by source-map byte attribution, not guessed.
- **Shared composable `LoadingPage`** (#203): the `@eridu/ui` loader gained `label`/`className`/`children` (backward-compatible) and is the canonical loading + Suspense fallback. No Lottie in code-split fallbacks.
- **Centralized layout offsets** (`src/config/layout.ts`) + a **PR-review gate** for scattered magic values (via #206; #204 closed as redundant after its commits rode in).
- **Principle recorded** (#206): shared UI stays generic/synchronous — **code-splitting is a consumer decision**, never baked into the dependency.

## Deferred (no clean consumer-side win — do NOT re-investigate without new info)
| Item | Why deferred | Trigger to revisit |
| --- | --- | --- |
| **Lazy-load the date picker** (`react-day-picker`, ~13 kB gzip) | Genuinely *sync-eager* via the widely-shared `@eridu/ui` `DatePicker` (18+ route chunks; Rollup hoists it). Consumer `manualChunks` only **isolates** it (caching), can't **defer** it; deferral needs a library change, which the generic-library principle forbids. Verified empirically. | The library exposes the calendar via a lazy-friendly seam (subpath/slot) the consumer can opt into — *without* baking lazy into the component. |
| **Drawer / `vaul` (~25 kB raw)** | Same shape: library-coupled conditional UI (`@eridu/ui` Drawer). | Same as date picker. |
| **`react-table` (~18 kB gzip)** | Eager via route-module column-config imports through `@eridu/ui` data-table. Isolated into `vendor-table` (caching); deferral is the same library-coupling problem. | Same as date picker. |
| **App-wide infra: `axios`, `sonner`, `better-auth`, `tailwind-merge`** | Legitimately eager (used everywhere) — not deferrable. | Optional caching-only pass: extract into `vendor-*` chunks for cross-deploy caching (no first-load change). |

**Net:** the high-ROI deferrals are done. What remains is either app-wide infra (caching-only) or library-coupled conditional UI that can't be cleanly split consumer-side under the generic-library principle.
