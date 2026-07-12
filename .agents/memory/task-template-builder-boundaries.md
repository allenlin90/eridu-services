# Task Template Builder Boundaries

`TaskTemplateBuilder` is the stable public composition root. It owns builder state, data queries, DnD sensors, shared-field insertion, and the latest `template`/`onChange` ref.

- `TaskTemplateSettingsCard`: template identity, task type, workflow mode, and client binding.
- `ClientMechanicsMatrix`: desktop Loop x Mechanic assignment UI and mobile/empty guidance.
- `useModerationLoopActions`: clone, remove, rename, duration, reorder, and add-field mutations for loops.
- `ModerationLoopsList`: per-loop card composition.
- `TaskTemplateFieldsToolbar` and `StandardTemplateFields`: toolbar and flat DnD field mode.
- `BuilderValidationErrors`, `BuilderActions`, and `BuilderLivePreview`: outer editor chrome.
- `mechanic-reference.utils.ts`: canonical mechanic assignment, removal, and upgrade transforms shared by the matrix and sortable field cards.

All mutations continue through the supplied `onChange` callback. Extracted callbacks that can outlive a render read the latest template from the composition root's ref.
