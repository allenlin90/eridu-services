# Claude Chat and Cowork setup

The packaged `upload-openwebui-skill` adapter lets another user turn an attached Markdown skill into
a reviewable `eridu-services` pull request. It does not receive the Open WebUI admin key and does not
write production state.

## Ownership and prerequisites

| Role | Responsibility |
| --- | --- |
| Repository maintainer | Package the reviewed adapter from the current `master` branch. |
| Claude organization owner | Upload the ZIP and enable the skill for the intended users. |
| GitHub administrator | Authorize the GitHub connection for `allenlin90/eridu-services`. |
| Skill user | Supply the Markdown and approve the model binding and audience. |

The GitHub connection needs repository content read/write and pull-request read/write access. It
does not need repository administration, Actions secrets, or any Open WebUI credential. If company
policy permits only read access, the adapter produces a handoff instead of claiming it opened a PR.

## One-time installation

1. Check out the current `master` branch and package the adapter:

   ```bash
   python3 ai/openwebui/package_claude_skill.py /tmp/upload-openwebui-skill.zip
   ```

2. In Claude's organization customization or Skills administration surface, upload
   `/tmp/upload-openwebui-skill.zip` and enable it for the intended organization or workspace users.
   Exact labels can vary by Claude plan and release; use the current surface for organization-managed
   custom skills.
3. Connect Claude to GitHub and authorize `allenlin90/eridu-services` with the permissions above.
4. Confirm that the user can see `upload-openwebui-skill` and can read the repository's `master`
   branch through the connection.

## First-run verification

Attach a harmless Markdown skill and invoke the installed skill with explicit delivery choices:

```text
Use upload-openwebui-skill to add the attached Markdown.
Skill id: example-review-helper
Display name: Example Review Helper
Description: Use when reviewing an example document.
Bind it to: <existing model id>
Show me the model groups and direct skill-use impact before opening the PR.
```

A successful run reads the canonical procedure from `master`, shows the current model audience,
opens a focused PR, and reports `Deployment: pending merge`. It must not ask for an Open WebUI key
or claim the skill is live. Close the verification PR without merging unless it represents an
intended production change.

## Updates

The adapter reads the canonical skill and workflow from `master` on every run, so normal procedure
updates take effect without repackaging. Repackage and re-upload the ZIP whenever this Cowork adapter
itself or its packaging contract changes. Reauthorize GitHub when repository or organization access
policy changes.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| The skill is not available | The organization owner uploaded the ZIP and enabled it for this user. |
| Canonical files cannot be read | The GitHub connection can read `master` in `allenlin90/eridu-services`. |
| A PR cannot be opened | The connection has content write and pull-request write access. |
| A PR exists but Open WebUI did not change | The PR must merge and the trusted sync workflow must succeed. |
| Sync stopped before writing | Review the planned revokes; an operator must explicitly approve them. |
| The packaged procedure appears stale | Repackage and re-upload because the adapter or package changed. |

Do not work around a connection failure by pasting an Open WebUI API key into Claude.
