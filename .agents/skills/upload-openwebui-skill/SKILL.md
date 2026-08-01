---
name: upload-openwebui-skill
description: Add or update an Open WebUI skill, bind it to models, review access impact, and deliver it through Git.
---

# Upload Open WebUI Skill

Use this skill when a Markdown skill must be added to Open WebUI and recorded in Git. Git is the
source of truth: `ai/openwebui/skills/<id>.md` owns content, model manifests own bindings and model
access, and the live instance is a deployment projection.

The safe lifecycle is PR first, deployment after merge. Do not give Claude Chat, Cowork, or another
end-user agent the production `OPEN_WEBUI_API_KEY`.

Follow [openwebui-sync-delivery](../../workflows/openwebui-sync-delivery.md) for the full sequence.

## File contract

- `ai/openwebui/skills/<skill-id>.md` contains the supplied skill verbatim. Do not add or remove
  frontmatter; any header in this file is content Open WebUI stores.
- `ai/openwebui/skills/index.json` contains `name` and a non-empty `description`. It may contain
  `"access": "admins-only"` only when the user intentionally chooses no model binding yet.
- The filename stem is the byte-exact Open WebUI skill id. Renaming it breaks model references.
- Every Markdown file needs an index entry. Never guess missing metadata silently.

## Access model

Open WebUI 0.10.2 filters model-bound, menu-selected, and `$`-mentioned skill ids through the same
skill read grants. Therefore every group that can read a bound model also receives read access to
the skill, and can invoke it directly from the menu or by mention. Binding does not create an
exclusive model-only path.

Canonical skill content is Admin-managed: model editors do not inherit skill write access.

Before editing, ask when the answer was not supplied:

1. Which existing models should bind the skill? Show their current read and write groups.
2. Should any selected model reach additional groups? Explain that this widens access to every skill
   already bound to that model.

If no existing model serves the audience, stop. Creating a model or group is a separate decision.
If the user deliberately wants no model yet, add the declarative `admins-only` marker. Never leave a
new skill both unbound and unmarked.

## Delivery

1. Write the content and index metadata.
2. Add the skill id to each approved model manifest in `ai/openwebui/models/`.
3. Run the authenticated dry run when credentials are available:

   ```bash
   python3 ai/openwebui/push_config.py all
   ```

4. Show additions and revokes. A revoke requires explicit operator approval and `--yes` in the
   unattended deploy; otherwise the merge workflow stops before any write.
5. Run `python3 ai/openwebui/validate_config.py`, validate the affected agent content, and open a PR
   against `master`. The secret-free PR workflow repeats the binding and audience checks. Do not push
   unmerged content live.
6. After merge, `.github/workflows/openwebui-sync.yml` applies the complete Git state and performs a
   fresh readback check. If the workflow is blocked by a revoke, an authorized operator reviews it
   and runs `python3 ai/openwebui/push_config.py all --apply --yes` locally.

The optional live snapshot under `ai/openwebui/synced/` describes observed deployment state, not the
canonical desired state. Refresh it only after a successful deployment or during an authorized
audit; do not fabricate a snapshot in a keyless Chat/Cowork run.

## Drift

The weekly workflow performs a read-only comparison. Its public issue contains no live ids, model
prompts, group names, or access details. An authorized operator reproduces the detailed diff locally
with `python3 ai/openwebui/push_config.py all`, decides which side is correct, and converges through a
PR or an explicitly approved live correction.

## Status report

Report every item, including skipped verification:

| Item | Required result |
| --- | --- |
| File | path and `created` or `updated` |
| Binding | model ids, or `admins-only (intentional, no model yet)` |
| Access impact | groups gaining/losing model and direct skill use, or `not verified (no key)` |
| PR | URL or reason it was not opened |
| Deployment | `pending merge`, workflow URL/result, or exact blocker |

Never say “uploaded” until the merge deployment and readback have succeeded. Before merge, say
“recorded in PR” or “deployment pending.”

## Verification

- [ ] Skill id and `index.json` metadata are complete.
- [ ] Binding is approved, or `admins-only` is an explicit user choice.
- [ ] Direct menu and `$`-mention access was included in the access explanation.
- [ ] No new group or model was introduced implicitly.
- [ ] Dry-run revokes were called out separately.
- [ ] `python3 ai/openwebui/validate_config.py` passes.
- [ ] `python3 ai/openwebui/test_push_config.py` passes when sync logic changed.
- [ ] `pnpm agents:validate` passes.
- [ ] PR and deployment status are reported separately.

## Related skills

- [openwebui-assistant-adapter](../openwebui-assistant-adapter/SKILL.md)
- [openwebui-groups-permissions](../openwebui-groups-permissions/SKILL.md)
- [openwebui-rest-api](../openwebui-rest-api/SKILL.md)
- [ai-workspace-control-plane](../ai-workspace-control-plane/SKILL.md)
