import { lazy } from 'react';

/**
 * Lazy boundary for the task-template builder.
 *
 * The builder (~1138 LOC) plus its field-editor / form-renderer children and
 * the `@dnd-kit` drag-and-drop runtime are only needed on the create/edit
 * template routes, but were landing in the eager startup bundle. Loading them
 * through a dynamic `import()` keeps them out of first paint; the create/edit
 * routes render it inside a `<Suspense>` boundary.
 */
export const TaskTemplateBuilder = lazy(() =>
  import('./task-template-builder').then((m) => ({
    default: m.TaskTemplateBuilder,
  })),
);
