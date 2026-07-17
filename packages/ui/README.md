# @eridu/ui

Shared React UI components, hooks, utilities, and global styles for Eridu applications.

## Usage

Install the workspace package in an app, then import from its public exports:

```tsx
import { Button } from '@eridu/ui';
import '@eridu/ui/styles/globals.css';
```

Component, hook, and utility subpath exports are available through `@eridu/ui/components/*`, `@eridu/ui/hooks/*`, and `@eridu/ui/lib/*`.

## Development

```bash
pnpm --filter @eridu/ui dev
pnpm --filter @eridu/ui test
```
