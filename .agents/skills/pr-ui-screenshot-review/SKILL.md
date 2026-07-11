---
name: pr-ui-screenshot-review
description: Capture UI-state screenshots with Playwright as visual review evidence for a PR, and embed them in the PR description without committing them to the repo. Use only when the PR's diff touches rendered frontend code — erify_studios, erify_creators, an app's own frontend (e.g. apps/eridu_auth/src/frontend), or packages/ui components. Do not use for backend-only (erify_api, eridu_auth's server-side src/lib and src/db), schema/migration-only, or docs/skill/workflow-only PRs — there is no rendered UI to capture. Pairs with /pr-ready as an evidence step, not a replacement for it.
---

# PR UI Screenshot Review

Screenshots are PR-review evidence, not repo content. They must never land in git history — only in the PR description (or a PR comment).

## Scope Check (Do This First)

Run `git diff --name-only origin/master...HEAD` (or the PR's actual base). Only proceed if the diff includes paths under `apps/erify_studios/src/`, `apps/erify_creators/src/`, `apps/*/src/frontend/`, or `packages/ui/`. If the diff is backend-only (`apps/erify_api/src/`, an app's `src/lib`/`src/db`), schema/migration-only, or docs/skill/workflow-only, **do not** run this skill — there is nothing rendered to screenshot, and offering to "capture UI evidence" for a non-UI PR is noise, not review value.

## Workflow

1. **Drive the real feature**, not a mock. Start the actual dev server(s), sign in as a real (seeded/test) user, and exercise every UI state worth showing a reviewer (empty state, populated state, each dialog/confirmation, error states if relevant).
2. **Redact before you screenshot, not after.** Before capturing any state that displays a secret/token/credential (API key reveal, session token, password reset link, etc.), overwrite the on-screen value in the DOM first:
   ```js
   // browser_evaluate, before browser_take_screenshot
   () => {
     const el = document.querySelector('<selector for the secret display>');
     if (el) el.textContent = 'REDACTED-FOR-SCREENSHOT';
   }
   ```
   Do this even for "harmless local dev" secrets — a screenshot is a flat image; there is no cropping/blurring tool available by default, and once a real-looking secret string leaves the machine (any destination, including a "private" one) it cannot be un-shared. Treat this as mandatory, not a judgment call.
3. **Capture** with `browser_take_screenshot` (viewport, not always `fullPage` — scroll the relevant section into view first for a clean crop). Save to the session scratchpad directory, never into the repo tree.
4. **Get explicit confirmation on the hosting destination before uploading anywhere.** This is a data-sharing decision, not a mechanical one — the agent does not get to pick an external host unilaterally, even when the user said "don't commit them to the repo." Ask, and be accurate about the tradeoffs:
   - A **Gist** is owned by the authenticated personal GitHub account, **not** the repo. It does not transfer if repo ownership changes (transferred to an org, etc.) — flag this explicitly, don't let the user assume otherwise.
   - "Secret" Gist ≠ access-controlled. It only means unlisted from the account's public gist page — anyone with the direct raw URL can fetch it without authentication. Don't describe it as private.
   - Manual drag-and-drop by the user into the GitHub web UI uses GitHub's own native attachment storage (moves with the repo/org, no personal-account coupling) — offer this as the no-external-dependency option when the user cares about that.
5. **Upload only after redaction is confirmed done for every image in the batch.**

## Hosting via Gist (once approved)

`gh gist create <file>.png` **fails outright** — gists created via that command reject binary content ("binary file not supported"). Work around it by using the fact that a Gist is a real git repo:

```bash
# 1. Create a placeholder gist (text only) to get a gist ID
echo "# screenshots for PR #<n>" > README.md
gh gist create -d "<description>" README.md   # secret by default; add --public if approved as public
# → prints https://gist.github.com/<owner>/<gist-id>

# 2. Clone it and push the real binary files with plain git
git clone https://gist.github.com/<owner>/<gist-id>.git gist-repo
cp /path/to/screenshots/*.png gist-repo/
cd gist-repo && git add *.png && git commit -m "Add screenshots" && git push

# 3. Build raw URLs from the pushed commit
commit=$(git log --format=%H -1)
echo "https://gist.githubusercontent.com/<owner>/<gist-id>/raw/$commit/<filename>.png"
```

## Embedding in the PR

```bash
gh pr edit <n> --body "$(cat <<'EOF'
...
![description](https://gist.githubusercontent.com/<owner>/<gist-id>/raw/<commit>/<filename>.png)
...
EOF
)"
```

**Verify every URL before declaring done** — don't trust a markdown-conversion tool (e.g. WebFetch) to confirm an `<img>` rendered on a JS-heavy page like a GitHub PR; it reads text, not rendered DOM, and gives false negatives here. The authoritative check:

```bash
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "<raw-url>"
# must be: 200 image/png (or image/jpeg)
```

## Cleanup

- Delete any test data created while driving the feature (e.g. a client/record created just to exercise the create/edit/delete flow) so the dev database is left as you found it.
- Stop the dev server(s) you started.
- Remove local scratch screenshot files and any temporary git clone used for the Gist push.

## Relationship to /pr-ready

This skill produces evidence to attach to a PR description; it does not replace any gate in `.agents/workflows/pr-review.md`. For a UI-touching PR, run this after (or alongside) the Verification gate, then fold the updated PR description into the same Wrap-up step `/pr-ready` already performs — don't treat screenshot capture as a separate, later pass.

## Related Skills

- [playwright](../playwright/SKILL.md) — the CLI-wrapper form of browser automation this skill assumes (or the equivalent MCP Playwright tool)
- [ui-mockup-discussion](../ui-mockup-discussion/SKILL.md) — the pre-implementation counterpart. That skill validates the UX with the user *before* code exists, via a standalone mockup; this skill captures evidence of the *shipped* UI after implementation. A PR whose UX went through that skill should link its settled decision in the description alongside these screenshots, so a reviewer can compare "what was agreed" against "what shipped."
