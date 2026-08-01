"""Push Git-authored Open WebUI config to the live instance.

Counterpart to `pull_config.py`. Git is the source of truth (see
`.agents/skills/ai-workspace-control-plane/SKILL.md`); this script makes the live
instance match the repo, never the other way round.

Usage:
    python3 ai/openwebui/push_config.py <target> [options]

Targets:
    skills   Skill content from ai/openwebui/skills/*.md
    models   Workspace Model manifests from ai/openwebui/models/*.json
    access   Derived skill->group grants (models are the only source of skill access)
    all      skills, then models, then access

Options:
    --apply          Perform writes. Without it the script only reports a diff.
    --only ID        Restrict to a single skill or model id.
    --pending ID     Treat skill ID as not-yet-merged: grant Admins only,
                     regardless of what the model manifests derive.
    --yes            Skip the interactive confirmation for revokes.

Exit codes:
    0  live already matches the repo (or --apply completed successfully)
    1  failure
    2  dry run found differences that --apply would write
    3  not configured (no OPEN_WEBUI_API_KEY / OPEN_WEBUI_HOST reachable)
"""

import json
import os
import sys
import urllib.request
from urllib.error import HTTPError

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SKILLS_DIR = os.path.join(BASE_DIR, "skills")
SKILL_INDEX = os.path.join(SKILLS_DIR, "index.json")
MODELS_DIR = os.path.join(BASE_DIR, "models")
ADMIN_GROUP_NAME = "Admins"

EXIT_OK = 0
EXIT_FAILURE = 1
EXIT_DIFF = 2
EXIT_NOT_CONFIGURED = 3


class PushConfigError(RuntimeError):
    pass


class NotConfiguredError(RuntimeError):
    pass


# --------------------------------------------------------------------------
# transport
# --------------------------------------------------------------------------


def load_env():
    env = dict(os.environ)
    env_path = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as file:
            for line in file:
                if "=" in line and not line.lstrip().startswith("#"):
                    key, value = line.strip().split("=", 1)
                    env[key.strip()] = value.strip()
    return env


class Client:
    def __init__(self, host, api_key):
        host = host.strip().rstrip("/")
        if "://" not in host:
            # Railway reference variables resolve to a bare domain
            # (`${{Open WebUI.RAILWAY_PUBLIC_DOMAIN}}`), with no scheme to prepend.
            host = f"https://{host}"
        self.host = host
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "eridu-services-openwebui-config-push/1.0",
        }

    def _call(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(
            f"{self.host}{path}", data=data, headers=self.headers, method=method
        )
        try:
            with urllib.request.urlopen(request) as response:
                raw = response.read().decode()
                return json.loads(raw) if raw else None
        except HTTPError as error:
            detail = ""
            try:
                detail = f" -- {error.read().decode()[:400]}"
            except Exception:  # noqa: BLE001 - best-effort error detail only
                pass
            raise PushConfigError(
                f"{method} {path} failed: HTTP {error.code} {error.reason}{detail}"
            ) from error
        except Exception as error:
            raise PushConfigError(f"{method} {path} failed: {error}") from error

    def get(self, path):
        return self._call("GET", path)

    def post(self, path, body):
        return self._call("POST", path, body)


def build_client():
    env = load_env()
    api_key = env.get("OPEN_WEBUI_API_KEY")
    host = env.get("OPEN_WEBUI_HOST")
    if not api_key or not host:
        raise NotConfiguredError(
            "OPEN_WEBUI_API_KEY / OPEN_WEBUI_HOST not set. "
            "Expected in ai/openwebui/.env (gitignored) or the environment."
        )
    return Client(host, api_key)


# --------------------------------------------------------------------------
# repo state
# --------------------------------------------------------------------------


def split_frontmatter(text, path):
    """Return (frontmatter fields, body). Used for repo-authored adapters only."""
    if not text.startswith("---"):
        raise PushConfigError(f"{path}: missing YAML frontmatter")
    end = text.find("\n---", 3)
    if end == -1:
        raise PushConfigError(f"{path}: unterminated YAML frontmatter")

    body = text[end + len("\n---") :].lstrip("\n")
    block = text[4:end]
    fields, key = {}, None
    for line in block.splitlines():
        if line[:1] not in (" ", "\t") and ":" in line:
            key, value = line.split(":", 1)
            key = key.strip()
            value = value.strip()
            fields[key] = "" if value in (">", "|", ">-", "|-") else unquote(value)
        elif key and line.strip():
            fields[key] = f"{fields[key]} {line.strip()}".strip()
    return fields, body


def unquote(value):
    """Quoted scalars keep significant whitespace.

    Live ids and display names carry trailing spaces in places
    (`Affiliate management `), and an unquoted YAML scalar would silently strip
    them -- producing an endless "differs: name" diff that never converges.
    """
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1]
    return value


def load_repo_skills(only=None):
    """Skill id is the filename stem, byte-exact.

    Trailing hyphens and other oddities in live ids (e.g. `affiliate-management-`)
    are load-bearing: a model's `skill_ids` references them verbatim.

    The `.md` file is the skill's content, whole and unmodified -- what a skill
    file contains is exactly what Open WebUI stores. Display name and description
    are API fields, not content, so they live in `index.json` instead of a
    frontmatter block; keeping them out of the file is what lets a skill adopted
    from the live instance round-trip byte-for-byte.
    """
    index = load_skill_index()
    skills = {}
    for filename in sorted(os.listdir(SKILLS_DIR)):
        if not filename.endswith(".md") or filename == "README.md":
            continue
        skill_id = filename[: -len(".md")]
        if only and skill_id != only:
            continue
        path = os.path.join(SKILLS_DIR, filename)
        with open(path, encoding="utf-8") as file:
            content = file.read()
        entry = index.get(skill_id)
        if entry is None:
            raise PushConfigError(
                f"{path}: no entry for {skill_id!r} in {SKILL_INDEX}. "
                "Add its display name and description there before pushing."
            )
        skills[skill_id] = {
            "id": skill_id,
            "name": entry.get("name") or skill_id,
            "description": entry.get("description") or "",
            "content": content,
        }
    return skills


def load_skill_index():
    if not os.path.exists(SKILL_INDEX):
        raise PushConfigError(f"missing {SKILL_INDEX}")
    with open(SKILL_INDEX, encoding="utf-8") as file:
        return json.load(file)


def load_manifests(only=None):
    manifests = {}
    if not os.path.isdir(MODELS_DIR):
        return manifests
    for filename in sorted(os.listdir(MODELS_DIR)):
        if not filename.endswith(".json"):
            continue
        path = os.path.join(MODELS_DIR, filename)
        with open(path, encoding="utf-8") as file:
            manifest = json.load(file)
        if manifest.get("id") != filename[: -len(".json")]:
            raise PushConfigError(
                f"{path}: 'id' must match the filename stem "
                f"({manifest.get('id')!r} vs {filename[: -len('.json')]!r})"
            )
        if only and manifest["id"] != only:
            continue
        manifests[manifest["id"]] = manifest
    return manifests


# --------------------------------------------------------------------------
# access derivation
# --------------------------------------------------------------------------


def derive_skill_access(manifests, pending=()):
    """Skill->group access is derived, never authored directly.

    A group may read a skill exactly when it can read at least one model that
    binds the skill. There is no path to a skill except through a model, so this
    derivation is the complete access story -- anything else live is drift.
    """
    derived = {}
    for manifest in manifests.values():
        access = manifest.get("access") or {}
        writers = set(access.get("write_groups") or [])
        readers = set(access.get("read_groups") or []) | writers
        for skill_id in manifest.get("skill_ids") or []:
            entry = derived.setdefault(
                skill_id, {"read": set(), "write": set(), "public": False}
            )
            entry["read"] |= readers
            # A group that can edit a model must also be able to edit the skills
            # it binds, or the model becomes uneditable in practice.
            entry["write"] |= writers
            if access.get("public"):
                entry["public"] = True

    for skill_id in pending:
        derived[skill_id] = {
            "read": {ADMIN_GROUP_NAME},
            "write": {ADMIN_GROUP_NAME},
            "public": False,
        }

    return derived


def grants_for(resource_type, resource_id, read, write, public, group_uuids):
    """Build the normalized grant rows for one resource.

    `write` groups also receive a `read` row -- that is how the live instance
    stores them, and omitting it produces a permanent phantom diff.
    """
    grants = []
    if public:
        grants.append(
            {
                "resource_type": resource_type,
                "resource_id": resource_id,
                "principal_type": "user",
                "principal_id": "*",
                "permission": "read",
            }
        )
    for permission, names in (("read", set(read) | set(write)), ("write", set(write))):
        for name in sorted(names):
            uuid = group_uuids.get(name)
            if uuid is None:
                raise PushConfigError(
                    f"{resource_type} {resource_id}: group {name!r} does not exist live. "
                    "Create it first (openwebui-groups-permissions) or fix the manifest."
                )
            grants.append(
                {
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                    "principal_type": "group",
                    "principal_id": uuid,
                    "permission": permission,
                }
            )
    return grants


def grant_key(grant):
    return (grant["principal_type"], grant["principal_id"], grant["permission"])


# --------------------------------------------------------------------------
# reporting
# --------------------------------------------------------------------------


class Report:
    """Collects the per-target outcome that the chat status report is built from."""

    def __init__(self):
        self.lines = []
        self.changed = False
        self.revokes = []

    def add(self, status, target, detail=""):
        if status != "unchanged":
            self.changed = True
        self.lines.append((status, target, detail))

    def render(self, applied):
        verb = {
            True: {"create": "created", "update": "updated", "grant": "granted"},
            False: {"create": "would create", "update": "would update", "grant": "would set"},
        }[applied]
        for status, target, detail in self.lines:
            label = verb.get(status, status)
            print(f"  [{label}] {target}" + (f"  {detail}" if detail else ""))
        if not self.lines:
            print("  (no differences)")


# --------------------------------------------------------------------------
# targets
# --------------------------------------------------------------------------


def push_skills(client, report, only=None, apply=False):
    repo = load_repo_skills(only)
    if not repo:
        raise PushConfigError(
            f"no skill files matched in {SKILLS_DIR}"
            + (f" for --only {only}" if only else "")
        )

    live = {skill["id"]: skill for skill in client.get("/api/v1/skills/export")}

    for skill_id, skill in repo.items():
        current = live.get(skill_id)
        if current is None:
            report.add("create", f"skill {skill_id}")
            if apply:
                client.post("/api/v1/skills/create", skill)
            continue

        diffs = [
            field
            for field in ("name", "description")
            if (current.get(field) or "") != skill[field]
        ]
        # Trailing whitespace is not meaningful in skill content, and pull/push
        # round trips add or drop a final newline. Ignore it so a clean repo does
        # not report a permanent phantom diff.
        if (current.get("content") or "").rstrip() != skill["content"].rstrip():
            diffs.append("content")
        if not diffs:
            report.add("unchanged", f"skill {skill_id}")
            continue
        report.add("update", f"skill {skill_id}", f"differs: {', '.join(diffs)}")
        if apply:
            client.post(f"/api/v1/skills/id/{skill_id}/update", skill)

    orphans = sorted(set(live) - set(load_repo_skills()))
    for skill_id in orphans:
        report.add(
            "live-only",
            f"skill {skill_id}",
            "exists live but not in ai/openwebui/skills/ -- adopt it into Git or delete it live",
        )


def push_models(client, report, group_uuids, only=None, apply=False):
    manifests = load_manifests(only)
    if not manifests:
        raise PushConfigError(
            f"no model manifests matched in {MODELS_DIR}"
            + (f" for --only {only}" if only else "")
        )

    live = {model["id"]: model for model in client.get("/api/v1/models/export")}
    payload = []

    for model_id, manifest in manifests.items():
        knowledge = hydrate_knowledge(client, manifest, live.get(model_id))

        access = manifest.get("access") or {}
        grants = grants_for(
            "model",
            model_id,
            access.get("read_groups") or [],
            access.get("write_groups") or [],
            access.get("public", False),
            group_uuids,
        )

        params = dict(manifest.get("params") or {})
        if manifest.get("system"):
            params["system"] = manifest["system"]

        desired = {
            "id": model_id,
            "name": manifest["name"],
            "base_model_id": manifest["base_model_id"],
            "is_active": manifest.get("is_active", True),
            "params": params,
            "meta": {
                "description": manifest.get("description"),
                "profile_image_url": None,
                "capabilities": manifest.get("capabilities") or {},
                "skillIds": manifest.get("skill_ids") or [],
                "toolIds": manifest.get("tool_ids") or [],
                "builtinTools": manifest.get("builtin_tools") or {},
                **({"knowledge": knowledge} if knowledge else {}),
            },
            "access_grants": grants,
        }

        current = live.get(model_id)
        if current is None:
            report.add("create", f"model {model_id}")
        else:
            diffs = model_diff(current, desired)
            if not diffs:
                report.add("unchanged", f"model {model_id}")
                continue
            report.add("update", f"model {model_id}", f"differs: {', '.join(diffs)}")
        payload.append(desired)

    if apply and payload:
        # /api/v1/models/model/update returns a bare 500 on 0.10.2; /import upserts
        # cleanly and preserves access_grants across the round trip.
        client.post("/api/v1/models/import", {"models": payload})

    for model_id in sorted(set(live) - set(load_manifests())):
        report.add(
            "live-only",
            f"model {model_id}",
            "exists live but has no manifest -- adopt it into ai/openwebui/models/ or delete it live",
        )


def hydrate_knowledge(client, manifest, current):
    """Expand `{id, type, name}` references into the full objects the model needs.

    Manifests store references only: the full objects embed cached access grants
    (which go stale) and, for Full-Context files, the entire file text.
    """
    attached = {
        entry.get("id"): entry
        for entry in ((current or {}).get("meta") or {}).get("knowledge") or []
    }
    hydrated = []

    for reference in manifest.get("knowledge") or []:
        kind = reference.get("type") or "collection"
        if kind == "collection":
            entry = client.get(f"/api/v1/knowledge/{reference['id']}")
        else:
            # Only collections are addressable through the knowledge API; a
            # Full-Context file attachment exists solely inside the model object.
            entry = attached.get(reference["id"])
            if entry is None:
                raise PushConfigError(
                    f"model {manifest['id']}: knowledge reference {reference['id']} "
                    f"has type {kind!r} and is not attached live, so it cannot be "
                    "reconstructed. Re-attach it in Open WebUI, then re-run "
                    "pull_config.py to refresh the manifest."
                )
            entry = dict(entry)
        # Open WebUI's builtin retrieval silently skips knowledge entries with no
        # `type`, producing a well-formatted but false "no documents available"
        # answer -- see openwebui-rest-api gotchas.
        entry["type"] = kind
        hydrated.append(entry)

    return hydrated


def model_diff(current, desired):
    diffs = []
    for field in ("name", "base_model_id", "is_active"):
        if current.get(field) != desired[field]:
            diffs.append(field)
    if (current.get("params") or {}) != desired["params"]:
        diffs.append("params")
    current_meta = current.get("meta") or {}
    for field in ("description", "capabilities", "skillIds", "toolIds", "builtinTools"):
        if (current_meta.get(field) or type(desired["meta"][field])()) != desired["meta"][field]:
            diffs.append(f"meta.{field}")
    current_knowledge = [k.get("id") for k in (current_meta.get("knowledge") or [])]
    desired_knowledge = [k.get("id") for k in (desired["meta"].get("knowledge") or [])]
    if current_knowledge != desired_knowledge:
        diffs.append("meta.knowledge")
    if {grant_key(g) for g in current.get("access_grants") or []} != {
        grant_key(g) for g in desired["access_grants"]
    }:
        diffs.append("access_grants")
    return diffs


def push_access(client, report, group_uuids, pending=(), apply=False, assume_yes=False):
    manifests = load_manifests()
    derived = derive_skill_access(manifests, pending)
    repo_skills = load_repo_skills()
    live = {skill["id"]: skill for skill in client.get("/api/v1/skills/export")}

    planned = []
    for skill_id in sorted(repo_skills):
        entry = derived.get(skill_id, {"read": set(), "write": set(), "public": False})
        desired = grants_for(
            "skill", skill_id, entry["read"], entry["write"], entry["public"], group_uuids
        )
        current = (live.get(skill_id) or {}).get("access_grants") or []

        desired_keys = {grant_key(g) for g in desired}
        current_keys = {grant_key(g) for g in current}
        if desired_keys == current_keys:
            report.add("unchanged", f"skill-access {skill_id}")
            continue

        uuid_names = {uuid: name for name, uuid in group_uuids.items()}

        def label(key):
            return f"{uuid_names.get(key[1], key[1])}:{key[2]}"

        added = sorted(label(key) for key in desired_keys - current_keys)
        removed = sorted(label(key) for key in current_keys - desired_keys)
        detail = []
        if added:
            detail.append(f"+{', '.join(added)}")
        if removed:
            detail.append(f"-{', '.join(removed)}")
            report.revokes.append((skill_id, removed))
        if not entry["read"] and not entry["public"]:
            detail.append("(no model binds this skill)")

        report.add("grant", f"skill-access {skill_id}", " ".join(detail))
        planned.append((skill_id, desired))

    if not apply or not planned:
        return

    if report.revokes and not assume_yes:
        print("\n  REVOKES -- these groups lose read access:")
        for skill_id, removed in report.revokes:
            print(f"    {skill_id}: {', '.join(removed)}")
        if not sys.stdin.isatty():
            # Unattended run (Railway, CI). Refusing is the safe default: nobody
            # is present to weigh a revoke, and --yes is how an operator says
            # they already have.
            raise PushConfigError(
                "revokes require confirmation and stdin is not a terminal; "
                "re-run with --yes only if these revokes are intended"
            )
        answer = input("\n  Proceed with revokes? [y/N] ").strip().lower()
        if answer != "y":
            raise PushConfigError("aborted before applying access changes")

    for skill_id, desired in planned:
        client.post(f"/api/v1/skills/id/{skill_id}/access/update", {"access_grants": desired})


# --------------------------------------------------------------------------
# entry point
# --------------------------------------------------------------------------


def parse_args(argv):
    if not argv or argv[0] not in ("skills", "models", "access", "all"):
        print(__doc__)
        raise SystemExit(EXIT_FAILURE)

    options = {
        "target": argv[0],
        "apply": False,
        "only": None,
        "pending": [],
        "assume_yes": False,
    }
    index = 1
    while index < len(argv):
        argument = argv[index]
        if argument == "--apply":
            options["apply"] = True
        elif argument == "--yes":
            options["assume_yes"] = True
        elif argument in ("--only", "--pending"):
            index += 1
            if index >= len(argv):
                raise PushConfigError(f"{argument} requires a value")
            if argument == "--only":
                options["only"] = argv[index]
            else:
                options["pending"].append(argv[index])
        else:
            raise PushConfigError(f"unknown argument: {argument}")
        index += 1
    return options


def main(argv):
    options = parse_args(argv)
    client = build_client()

    group_uuids = {group["name"]: group["id"] for group in client.get("/api/v1/groups/")}
    targets = ["skills", "models", "access"] if options["target"] == "all" else [options["target"]]
    report = Report()

    for target in targets:
        print(f"\n== {target} ==")
        section = Report()
        if target == "skills":
            push_skills(client, section, options["only"], options["apply"])
        elif target == "models":
            push_models(client, section, group_uuids, options["only"], options["apply"])
        else:
            push_access(
                client,
                section,
                group_uuids,
                options["pending"],
                options["apply"],
                options["assume_yes"],
            )
        section.render(options["apply"])
        report.lines.extend(section.lines)
        report.changed = report.changed or section.changed

    if options["apply"]:
        print("\nApplied. Run `python3 ai/openwebui/pull_config.py` to refresh synced/.")
        return EXIT_OK
    if report.changed:
        print("\nDry run. Re-run with --apply to write these changes.")
        return EXIT_DIFF
    print("\nLive instance matches the repo.")
    return EXIT_OK


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except NotConfiguredError as error:
        print(f"NOT CONFIGURED: {error}", file=sys.stderr)
        sys.exit(EXIT_NOT_CONFIGURED)
    except PushConfigError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(EXIT_FAILURE)
