#!/usr/bin/env python3
"""
Upload the creator-services knowledge base to Open WebUI via API.

Follows the documented best-practice path (Open WebUI >= 0.9.6):
  - Real KB directories are created to mirror the local folders
    (faq/, policy/, violations/, terminology/) via POST /api/v1/knowledge/{id}/dirs/create
  - Each file is uploaded with `knowledge_id` + `directory_id` in the upload
    metadata, so the server auto-links and processes it into the KB server-side
    (robust to client disconnects; replaces the legacy upload -> add two-step)
  - Processing status is still polled afterwards, because server-side linking
    does not make content instantly queryable
  - Falls back to the legacy flow (upload -> poll -> /file/add) automatically
    if the server ignores the metadata auto-link (older versions)
  - Reconciled by content hash, not filename presence: a local file whose
    sha256 matches the KB copy's own server-computed `hash` is skipped; a
    changed file is uploaded and attached first, and only then does the
    stale copy get deleted (never the reverse -- a failed upload/attach
    must leave the prior working document in place); a KB file with no
    matching local filename is removed. This is what makes the sync
    reflect what's actually in Git instead of silently going stale after
    the first run.

Environment variables (required):
    OPENWEBUI_URL / OPEN_WEBUI_HOST         base URL (no trailing slash)
    OPENWEBUI_API_KEY / OPEN_WEBUI_API_KEY  Bearer token

Usage:
    python3 upload_kb.py [--kb-name creator-services-tiktok-shop] [--dir .]

Long-term sync note: once these files live in the git repo, prefer the official
oikb companion tool (https://docs.openwebui.com/ecosystem/knowledge-base-sync)
pointed at ai/openwebui/synced/knowledge/creator-services/ - it does incremental
hash-based sync (only new/modified/deleted files) on a schedule. This script is
the bootstrap/PoC path.

--- PATCH NOTES (reconciled against live deployment, Open WebUI 0.10.x) ---
The deployed instance differs from the original runbook assumptions:
  1. GET /api/v1/knowledge/ returns a paginated {"items":[...], "total":N}
     object, NOT a bare list. The original `for kb in api.get("list_kb")`
     iterated dict keys (strings) and crashed with
     "'str' object has no attribute 'get'". Fixed via _as_items().
  2. Repo .env uses OPEN_WEBUI_HOST / OPEN_WEBUI_API_KEY; the script wanted
     OPENWEBUI_URL / OPENWEBUI_API_KEY. Both names are now accepted.
  3. get_kb has no `directories`/`dirs` field on this build (no directory API).
     Hardened `... or []` guards. `dirs/create` is expected to 404 -> files
     fall back to KB root (logged).
  4. create/get responses are read tolerantly (id may be top-level or wrapped).
  5. GET /api/v1/knowledge/{kb_id} never populates `files` at all on this
     build -- not "null when empty" as originally assumed, but structurally
     absent (the Knowledge model has no `files` relationship; see
     ai/openwebui/functions/README.md gotchas). Enumerating existing files
     for reconciliation (existing_files(), file_in_kb()) now uses the
     dedicated GET /api/v1/knowledge/{kb_id}/files endpoint instead, matching
     the proven, live-verified ai/openwebui/functions/sync-pipe.py pattern.
Only the uploader script was changed; the 28 knowledge .md files are untouched.
"""
import argparse
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path

import requests

ENDPOINTS = {
    "list_kb": "/api/v1/knowledge/",
    "create_kb": "/api/v1/knowledge/create",
    "get_kb": "/api/v1/knowledge/{kb_id}",
    "upload_file": "/api/v1/files/",
    "file_status": "/api/v1/files/{file_id}/process/status",
    "file_meta": "/api/v1/files/{file_id}",
    "file_delete": "/api/v1/files/{file_id}",
    "kb_files": "/api/v1/knowledge/{kb_id}/files",
    "kb_add_file": "/api/v1/knowledge/{kb_id}/file/add",
    "dir_create": "/api/v1/knowledge/{kb_id}/dirs/create",
    "list_groups": "/api/v1/groups/",
    "kb_access": "/api/v1/knowledge/{kb_id}/access/update",
}

KB_DESCRIPTION = (
    "ERISA creator-service knowledge: TikTok Shop Thailand creator FAQ, "
    "platform policies, violation handling, and terminology (Thai-primary). "
    "Ask about commissions, payouts, product listing, violations, campaigns, "
    "RS Tier, or creator programs."
)
# NOTE: this description is a retrieval surface - query_knowledge_bases /
# search_knowledge_bases match on name+description semantics. Keep it rich.
# It is only applied when the KB is CREATED; an existing KB keeps its own.
# Pass --description when uploading a different collection with this script
# (e.g. ai/openwebui/knowledge/erisa-platform-ops/), otherwise the new KB
# inherits the creator-services surface above and routes badly.


SCHEMA_PATH = Path("ai/openwebui/knowledge/company-wiki/tools/wiki-schema.json")
AUDIENCE_MAP_PATH = Path("ai/openwebui/access/audience-group-map.json")

# Resolve policy artifacts from THIS FILE's location, never the caller's cwd.
# Reading them relative to cwd made the gate refuse with a misleading "missing
# schema" whenever the script was run from anywhere but the repo root -- which
# invites an operator to reach for --manual-grants-exception to get past it.
REPO_ROOT = Path(__file__).resolve().parents[3]


class GateError(SystemExit):
    """Raised before anything is published. Exit code 2 = access gate refused."""

    def __init__(self, msg):
        super().__init__(f"\nACCESS GATE REFUSED\n{msg}\n")


def _read_frontmatter(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        raise GateError(f"{path}: no Content Contract frontmatter.")
    fm = {}
    for line in m.group(1).splitlines():
        if not line or line[0].isspace() or ":" not in line:
            continue
        k, _, v = line.partition(":")
        v = v.strip()
        if v.startswith("[") and v.endswith("]"):
            v = [x.strip().strip("'\"") for x in v[1:-1].split(",") if x.strip()]
        fm[k.strip()] = v
    return fm


def _manual_exception_allowlist(repo_root=REPO_ROOT):
    """Collections with a reviewed, recorded manual-grants exception."""
    path = repo_root / AUDIENCE_MAP_PATH
    if not path.exists():
        return {}
    raw = json.loads(path.read_text()).get("manual_grant_exceptions") or {}
    # keys beginning with "$" are documentation, not collection names
    return {k: v for k, v in raw.items() if not k.startswith("$")}


def _grant_key(g):
    return (g.get("principal_type"), g.get("principal_id"), g.get("permission"))


def apply_and_verify_grants(api, kb_id, derived_grants):
    """Apply derived grants and require the readback to match EXACTLY.

    A non-empty readback is not sufficient: the server could have retained a
    stale or public principal, dropped a grant, or applied only a subset. Any
    of those leaves the collection more open than the derivation intended, so
    only exact set equality is accepted.
    """
    api.post("kb_access", json_body={"access_grants": derived_grants}, kb_id=kb_id)
    applied = api.get("get_kb", kb_id=kb_id).get("access_grants") or []
    want = {_grant_key(g) for g in derived_grants}
    got = {_grant_key(g) for g in applied}
    if got != want:
        missing = sorted(want - got)
        extra = sorted(got - want)
        raise GateError(
            "Grant readback does not match the derived set; the collection is "
            "NOT in the intended state.\n"
            f"  missing: {missing or 'none'}\n"
            f"  unexpected: {extra or 'none'}\n"
            "Fix the grants by hand before anyone uses this collection."
        )
    print(f"Access gate: applied and verified {len(want)} grant(s) (exact match).")


def derive_access_grants(api, md_files, repo_root=REPO_ROOT):
    """Derive Open WebUI access_grants from the files' `audiences` metadata.

    Fail-closed by design. `llm-knowledge-base-plan.md` says a document cannot be
    published when its metadata has no valid collection and group mapping, so every
    unresolved case raises before a single file is uploaded rather than after.
    """
    schema_path = repo_root / SCHEMA_PATH
    map_path = repo_root / AUDIENCE_MAP_PATH
    if not schema_path.exists():
        raise GateError(f"Missing {schema_path}; cannot validate audience metadata.")
    if not map_path.exists():
        raise GateError(
            f"Missing {map_path}.\n"
            "This file is the audience -> Open WebUI group mapping the knowledge-base "
            "plan requires before anything is published. Create and get it signed off, "
            "or pass --manual-grants-exception with the documented reason."
        )

    schema = json.loads(schema_path.read_text())
    amap = json.loads(map_path.read_text())

    if str(amap.get("status", "")).lower() != "approved":
        raise GateError(
            f"{map_path} is not approved (status: {amap.get('status')!r}).\n"
            "Populate 'audiences'/'automatic' from the reviewed decision and set "
            "status to 'approved'."
        )

    valid_sens = set(schema["sensitivity"])
    valid_status = set(schema["status"])
    groups_enum = set(schema["audiences"]["groups"])
    shorthands = schema["audiences"]["shorthands"]
    mapping = amap.get("audiences") or {}

    # 1. Validate every file's governance metadata, collecting the audience union.
    wanted = set()
    seen_sensitivities = set()
    problems = []
    for path in md_files:
        fm = _read_frontmatter(path)
        for field in ("id", "audiences", "owner", "sensitivity", "status"):
            if not fm.get(field):
                problems.append(f"{path}: missing required '{field}'")
        seen_sensitivities.add(fm.get("sensitivity"))
        if fm.get("sensitivity") not in valid_sens:
            problems.append(f"{path}: sensitivity {fm.get('sensitivity')!r} not in {sorted(valid_sens)}")
        if fm.get("status") not in valid_status:
            problems.append(f"{path}: status {fm.get('status')!r} not in {sorted(valid_status)}")
        if fm.get("status") in ("draft", "archived"):
            problems.append(f"{path}: status {fm.get('status')!r} must never be synced to a live collection")
        for aud in fm.get("audiences") or []:
            if aud in shorthands:
                wanted.update(shorthands[aud])
            elif aud in groups_enum:
                wanted.add(aud)
            else:
                problems.append(f"{path}: audience {aud!r} is not in the schema vocabulary")
    if problems:
        raise GateError("Metadata failed validation:\n  - " + "\n  - ".join(problems))

    # 2. Every audience must have an explicit live-group mapping.
    unmapped = sorted(a for a in wanted if not mapping.get(a))
    if unmapped:
        raise GateError(
            "No live-group mapping for: " + ", ".join(unmapped) + "\n"
            f"Add them to {AUDIENCE_MAP_PATH} and get the change signed off."
        )

    # 3. Resolve group names to live ids; a rename must fail loudly, not grant nothing.
    live = {g["name"]: g["id"] for g in _as_items(api.get("list_groups")) if isinstance(g, dict)}
    want_names = {n for a in sorted(wanted) for n in mapping[a]}
    auto = amap.get("automatic") or {}
    auto_read = list(auto.get("read") or [])
    auto_write = list(auto.get("write") or [])

    # Sensitivity-scoped automatic grants. wiki-schema.json grants these only to
    # collections whose most-restrictive file sits within the listed tiers, so a
    # department- or restricted-tier collection does not silently widen.
    for group, tiers in (auto.get("sensitivity_scoped_read") or {}).items():
        if seen_sensitivities <= set(tiers):
            auto_read.append(group)
        else:
            blocked = sorted(seen_sensitivities - set(tiers))
            print(f"Access gate: withholding automatic read for {group!r} -- "
                  f"collection contains {', '.join(blocked)} content.")
    missing = sorted(n for n in want_names | set(auto_read) | set(auto_write) if n not in live)
    if missing:
        raise GateError(
            "These mapped groups do not exist on the live instance: " + ", ".join(missing) + "\n"
            "Either the group was renamed/deleted, or the mapping is wrong. Refusing to publish."
        )

    # 4. Build grants, rejecting anything that would make the collection public.
    grants = []
    seen = set()

    def add(name, permission):
        gid = live[name]
        if gid in ("*", "") or name == "*":
            raise GateError(f"Refusing wildcard grant for {name!r}.")
        key = (gid, permission)
        if key not in seen:
            seen.add(key)
            grants.append({"principal_type": "group", "principal_id": gid, "permission": permission})

    for name in sorted(want_names):
        add(name, "read")
    for name in auto_read:
        add(name, "read")
    for name in auto_write:
        add(name, "write")

    if not grants:
        raise GateError("Derivation produced no grants; that would leave the collection unrestricted.")
    if not any(g["permission"] == "write" for g in grants):
        raise GateError("Derivation produced no write grant; nobody could maintain the collection.")

    print(f"Access gate: derived {len(grants)} grant(s) from {len(wanted)} audience(s): "
          + ", ".join(sorted(want_names | set(auto_read))))
    return grants


class Api:
    def __init__(self, base, token):
        self.base = base.rstrip("/")
        self.s = requests.Session()
        self.s.headers["Authorization"] = f"Bearer {token}"

    def url(self, key, **kw):
        return self.base + ENDPOINTS[key].format(**kw)

    def get(self, key, **kw):
        r = self.s.get(self.url(key, **kw), timeout=30)
        r.raise_for_status()
        return r.json()

    def post(self, key, json_body=None, files=None, data=None, **kw):
        r = self.s.post(self.url(key, **kw), json=json_body, files=files,
                        data=data, timeout=120)
        r.raise_for_status()
        return r.json()

    def delete(self, key, **kw):
        r = self.s.delete(self.url(key, **kw), timeout=30)
        r.raise_for_status()


def _as_items(resp):
    """Normalize a KB-list response. 0.10.x returns {"items":[...], "total":N};
    older builds return a bare list."""
    if isinstance(resp, dict):
        return resp.get("items", []) or []
    return resp or []


def _extract_id(obj):
    """Pull an id out of a create/get response tolerantly."""
    if isinstance(obj, dict):
        if obj.get("id"):
            return obj["id"]
        for wrapper in ("item", "knowledge", "data"):
            inner = obj.get(wrapper)
            if isinstance(inner, dict) and inner.get("id"):
                return inner["id"]
    return None


def find_or_create_kb(api, name, description=KB_DESCRIPTION):
    for kb in _as_items(api.get("list_kb")):
        if isinstance(kb, dict) and kb.get("name") == name:
            print(f"Using existing knowledge base '{name}' ({kb['id']})")
            return kb["id"]
    created = api.post("create_kb", json_body={"name": name, "description": description})
    kb_id = _extract_id(created)
    if not kb_id:
        sys.exit(f"create_kb returned an unexpected shape: {created!r}")
    print(f"Created knowledge base '{name}' ({kb_id})")
    return kb_id


def content_sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def existing_files(api, kb_id):
    """filename -> {"id":..., "hash":...} for files actually attached to the KB.

    GET /api/v1/knowledge/{kb_id} never populates its `files` field on this
    deployment -- the Knowledge model has no `files` relationship at all, so
    this is structurally empty regardless of what's attached, not a timing
    issue (ai/openwebui/functions/README.md gotchas). Use the dedicated,
    paginated files endpoint instead, matching the proven, live-verified
    ai/openwebui/functions/sync-pipe.py pattern -- including using the
    server's own content hash rather than a self-supplied one.
    """
    resp = api.get("kb_files", kb_id=kb_id)
    items = resp.get("items") or []
    total = resp.get("total")
    if total is not None and total > len(items):
        print(f"  WARNING: KB reports {total} files but this call returned only "
              f"{len(items)}; this script does not paginate (same as sync-pipe.py, "
              f"unverified beyond a single page). Reconciliation may miss files.")
    files = {}
    for f in items:
        fname = f.get("filename")
        if fname:
            files[fname] = {"id": f["id"], "hash": f.get("hash")}
    return files


def existing_dirs(api, kb_id):
    kb = api.get("get_kb", kb_id=kb_id)
    dirs = {}
    for d in (kb.get("directories", kb.get("dirs", [])) or []):
        if d.get("name") and not d.get("parent_id"):
            dirs[d["name"]] = d["id"]
    return dirs


def ensure_dir(api, kb_id, dirs, name):
    if not name or name in dirs:
        return dirs.get(name)
    try:
        d = api.post("dir_create", kb_id=kb_id, json_body={"name": name})
        dirs[name] = _extract_id(d)
        print(f"  created directory: {name}/")
        return dirs[name]
    except requests.HTTPError as e:
        # Older / directory-less versions: fall back to KB root
        if e.response is not None and e.response.status_code in (404, 405):
            print(f"  (no directory API on this server; '{name}' files go to KB root)")
            dirs[name] = None
            return None
        raise


def wait_processed(api, file_id, timeout=300, poll=2):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            st = api.get("file_status", file_id=file_id)
            status = st.get("status", "")
            if status in ("completed", "processed", "success"):
                return True
            if status in ("failed", "error"):
                print(f"    processing FAILED: {st}")
                return False
        except requests.HTTPError as e:
            if e.response is not None and e.response.status_code == 404:
                meta = api.get("file_meta", file_id=file_id)
                if (meta.get("data") or {}).get("content"):
                    return True
            else:
                raise
        time.sleep(poll)
    print("    processing TIMEOUT")
    return False


def file_in_kb(api, kb_id, file_id):
    # Same "get_kb never populates files" gotcha as existing_files() -- must use
    # the dedicated endpoint, not get_kb, or this always returns False.
    resp = api.get("kb_files", kb_id=kb_id)
    return any(f.get("id") == file_id for f in (resp.get("items") or []))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kb-name", default="creator-services-tiktok-shop")
    ap.add_argument("--dir", default=".", help="folder containing the .md files")
    ap.add_argument("--manual-grants-exception", default=None, metavar="REASON",
                    help="Skip access-grant derivation and leave grants to a human. "
                         "Only for a collection with a documented, approved exception "
                         "(today: creator-services-tiktok-shop). REASON is printed and "
                         "should cite where the exception is recorded.")
    ap.add_argument("--full-context-file", default=None,
                    help="Filename this collection wants attached in FULL "
                         "CONTEXT mode, printed in the closing next-steps hint. "
                         "Omit to print collection-neutral next steps.")
    ap.add_argument("--description", default=KB_DESCRIPTION,
                    help="KB description, applied only when the KB is created. "
                         "This is a retrieval surface (query_knowledge_bases "
                         "matches on name+description) - keep it rich and "
                         "always set it when uploading a non-creator-services "
                         "collection.")
    args = ap.parse_args()

    base = os.environ.get("OPENWEBUI_URL") or os.environ.get("OPEN_WEBUI_HOST")
    token = os.environ.get("OPENWEBUI_API_KEY") or os.environ.get("OPEN_WEBUI_API_KEY")
    if not base or not token:
        sys.exit("Set OPENWEBUI_URL/OPEN_WEBUI_HOST and "
                 "OPENWEBUI_API_KEY/OPEN_WEBUI_API_KEY environment variables.")

    root = Path(args.dir)

    def _skip(rel):
        parts = rel.parts
        # ignore docs that aren't knowledge, plus anything under a hidden dir
        # (e.g. .venv, .git) or a Python package tree (site-packages)
        return (rel.name in ("README.md", "AGENT_INSTRUCTIONS.md")
                or any(part.startswith(".") for part in parts)
                or "site-packages" in parts)

    md_files = sorted(p for p in root.rglob("*.md")
                      if not _skip(p.relative_to(root)))
    if not md_files:
        sys.exit(f"No .md files found under {root}")
    print(f"{len(md_files)} knowledge files to sync")

    api = Api(base, token)
    full_context_file = args.full_context_file

    # Access gate FIRST: derive and validate before anything is published, so a
    # refusal leaves no partially-uploaded, ungranted collection behind.
    if args.manual_grants_exception:
        # A free-form reason is not authorization. The collection must appear in
        # the reviewed allowlist in audience-group-map.json, or the gate stands.
        allowed = _manual_exception_allowlist()
        if args.kb_name not in allowed:
            raise GateError(
                f"{args.kb_name!r} has no approved manual-grants exception.\n"
                f"Approved: {', '.join(sorted(allowed)) or '(none)'}\n"
                "--manual-grants-exception is not a bypass: add the collection to "
                f"'manual_grant_exceptions' in {AUDIENCE_MAP_PATH} with the doc that "
                "approves it, and get that change reviewed."
            )
        print(f"Access gate: SKIPPED for {args.kb_name} under its approved exception "
              f"({allowed[args.kb_name]}).")
        print(f"  Caller reason: {args.manual_grants_exception}")
        print("  Grants will NOT be derived. Verify them by hand immediately after this run.")
        derived_grants = None
    else:
        derived_grants = derive_access_grants(api, md_files)

    kb_id = find_or_create_kb(api, args.kb_name, args.description)

    # Lock the collection down BEFORE a single file lands in it. A newly created
    # KB has no grants, which is unrestricted on 0.10.x, so applying grants after
    # upload would leave every file readable by anyone for the length of the run
    # -- and permanently if the process died partway.
    if derived_grants is not None:
        apply_and_verify_grants(api, kb_id, derived_grants)

    present = existing_files(api, kb_id)
    dirs = existing_dirs(api, kb_id)
    remaining = dict(present)  # names left in the KB once we've accounted for local files

    ok = skipped = updated = failed = 0
    for path in md_files:
        rel = path.relative_to(root)
        subdir = rel.parts[0] if len(rel.parts) > 1 else None
        upload_name = rel.name
        local_hash = content_sha256(path)
        remaining.pop(upload_name, None)

        existing_entry = present.get(upload_name)
        is_update = existing_entry is not None
        if is_update and existing_entry["hash"] == local_hash:
            print(f"  skip (unchanged): {rel}")
            skipped += 1
            continue
        print(f"  {'update (content changed)' if is_update else 'upload'}: {rel}")

        dir_id = ensure_dir(api, kb_id, dirs, subdir) if subdir else None
        meta = {"knowledge_id": kb_id}
        if dir_id:
            meta["directory_id"] = dir_id

        with open(path, "rb") as fh:
            up = api.post(
                "upload_file",
                files={"file": (upload_name, fh, "text/markdown")},
                data={"metadata": json.dumps(meta)},  # v0.9.6 server-side auto-link
            )
        file_id = _extract_id(up)
        if not file_id:
            print(f"    upload returned no id: {up!r}")
            failed += 1
            continue

        if not wait_processed(api, file_id):
            failed += 1
            continue

        # Fallback for servers that ignored the metadata auto-link
        if not file_in_kb(api, kb_id, file_id):
            print("    (metadata auto-link not applied; using legacy /file/add)")
            body = {"file_id": file_id}
            if dir_id:
                body["directory_id"] = dir_id
            api.post("kb_add_file", kb_id=kb_id, json_body=body)

        # Only remove the stale version now that its replacement is confirmed
        # attached -- a failure anywhere above must leave the prior working
        # document in place (Sync Contract step 6: "Remove obsolete files only
        # after replacements finish processing successfully").
        if is_update:
            api.delete("file_delete", file_id=existing_entry["id"])
            updated += 1
        ok += 1

    removed = 0
    if failed:
        print(f"  skipping obsolete-file cleanup: {failed} replacement(s) failed above "
              f"(Sync Contract step 6 -- cleanup only runs once all replacements succeed)")
    else:
        for stale_name, stale_entry in remaining.items():
            print(f"  remove (no longer in source): {stale_name}")
            api.delete("file_delete", file_id=stale_entry["id"])
            removed += 1

    print(f"\nDone: added={ok - updated} updated={updated} skipped={skipped} "
          f"removed={removed} failed={failed}")
    if derived_grants is not None:
        # Re-verify after the writes: confirm nothing about the upload path
        # altered the grants that were applied before publishing.
        apply_and_verify_grants(api, kb_id, derived_grants)

    print("Next steps:")
    print("  1. Attach the KB to the assistant model (Workspace > Models > edit > Knowledge).")
    print("     Do this in the UI: it sets meta.knowledge[].type = \"collection\", which a")
    print("     raw API attach omits, and retrieval then silently skips the collection.")
    if full_context_file:
        print(f"  2. ALSO attach {full_context_file} as a standalone file in FULL CONTEXT")
        print("     mode (click the attached item to toggle) so its rules are always")
        print("     injected and never depend on the model choosing to retrieve them.")
    else:
        print("  2. If this collection designates a file that must always be injected,")
        print("     attach it as a standalone item in FULL CONTEXT mode too. See the")
        print("     collection's own README; pass --full-context-file to name it here.")
    print("  3. Keep the KB itself on Focused Retrieval (default).")
    if derived_grants is None:
        print("  4. Verify access grants NOW: a newly created KB has none, which is")
        print("     unrestricted on 0.10.x. Set them via")
        print("     POST /api/v1/knowledge/{id}/access/update with an access_grants list.")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
