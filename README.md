### MC Client
- [x] Authentication with `email` by Clerk.io
- [x] Root error boundary
- [x] Browser router

---

### Apps and Packages

- [x] `/apps/storybook` for components testing.
- [x] `/packages/eslint-config` for `eslint` base configuration.
- [x] `/packages/ts-config` for `ts-config` base configuration.
- [x] `/packages/ui` for sharable UI components with [`shadcn/ui`](https://ui.shadcn.com/).

### to-dos

- [ ] Manage environment variables (ENVs)
- [ ] setup semantic versioning
- [ ] setup `docker-compose` for related services
- [ ] Optimize `eslint` and `prettier` settings for editor
- setup `husky` commit hooks
  - [ ] `eslint` before commit
  - [ ] `commitlint` before commit
  - [ ] `sherif` before commit
- setup `vitest` for unit tests
  - [x] `mc_client` app
- setup CI
  - [ ] Github actions

### Engineering

- [ ] Update `tailwind@4`
- [ ] Update `storybook`

### Utilities

[`sherif`](https://www.npmjs.com/package/sherif) to check if the same dependencies are in the same version across monorepo.

```bash
# check dependency versions in the mono repo
pnpm sherif

# fix and install dependencies in aligned versions
pnpm sherif --fix

# fix dependencies in aligned versions without install
pnpm sherif --fix --no-install
```

### Build

To build all apps and packages, run the following command:

```bash
pnpm build
```

### Develop

To develop all apps and packages, run the following command:

```bash
pnpm dev
```

### Test

To test all apps and packages, run the following command:

```bash
pnpm test
```
