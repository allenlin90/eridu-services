# Accepted: `erify_api`'s lint script does not cover `scripts/`

**Status:** Accepted · **Area:** `erify_api` tooling — `package.json` `lint` script
**Origin:** PR #372 review (operator-script `ConfigModule.forRoot()` fix)

## Context

`apps/erify_api/package.json` defines:

```json
"lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"
```

`scripts/` is not in that glob, so `pnpm --filter erify_api lint` reports clean no
matter what the operator scripts contain. Any PR that changes only files under
`scripts/` gets a passing — but vacuous — lint result. `typecheck` is unaffected:
`tsc --noEmit` has no `exclude` for `scripts/`, so type errors there do surface.

Running ESLint directly over the directory today:

```bash
pnpm --filter erify_api exec eslint "scripts/**/*.ts"
```

reports 60 errors and 56 warnings across 15 files. By rule: 51 are auto-fixable
style/import-order violations (`antfu/if-newline`, `style/brace-style`,
`simple-import-sort/imports`, and similar), 7 are `node/no-process-env`, the rest are
`unicorn/*` and `regexp/*`. The 55 `no-console` warnings are inherent to the script
shape — these are CLI tools whose output *is* `console`.

## Why accepted (not fixed now)

Adding `scripts` to the glob in PR #372 would have required either fixing 60 errors
across ~10 script files belonging to unrelated capabilities, or adding rule
overrides, in a PR scoped to a two-file DI bootstrap fix. Repo guidance keeps broad
cleanup in separate scoped PRs. PR #372 instead verified its own two changed files
by running ESLint on them directly (result: 2 pre-existing `no-console` warnings,
no errors).

## Suggested resolution

One scoped tooling PR:

1. Add a `scripts/**/*.ts` override to the shared ESLint config allowing `no-console`
   and `node/no-process-env` — both are legitimate in an operator CLI, and the
   `no-console` warnings are the bulk of the noise.
2. Run `eslint "scripts/**/*.ts" --fix` for the ~51 auto-fixable style violations.
3. Hand-fix the residual `unicorn/*` / `regexp/*` errors.
4. Extend the workspace `lint` glob to include `scripts`.

Keep it separate from any feature or fix PR — it reformats files across several
capabilities' operator tooling.

## Fix trigger

The next time a script-only change needs real lint coverage, or the next scoped
`erify_api` tooling/cleanup pass.
