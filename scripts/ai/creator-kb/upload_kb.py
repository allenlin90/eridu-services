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
}

KB_DESCRIPTION = (
    "ERISA creator-service knowledge: TikTok Shop Thailand creator FAQ, "
    "platform policies, violation handling, and terminology (Thai-primary). "
    "Ask about commissions, payouts, product listing, violations, campaigns, "
    "RS Tier, or creator programs."
)
# NOTE: this description is a retrieval surface - query_knowledge_bases /
# search_knowledge_bases match on name+description semantics. Keep it rich.


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


def find_or_create_kb(api, name):
    for kb in _as_items(api.get("list_kb")):
        if isinstance(kb, dict) and kb.get("name") == name:
            print(f"Using existing knowledge base '{name}' ({kb['id']})")
            return kb["id"]
    created = api.post("create_kb", json_body={"name": name, "description": KB_DESCRIPTION})
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
    kb_id = find_or_create_kb(api, args.kb_name)
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
    for stale_name, stale_id in remaining.items():
        print(f"  remove (no longer in source): {stale_name}")
        api.delete("file_delete", file_id=stale_id)
        removed += 1

    print(f"\nDone: added={ok - updated} updated={updated} skipped={skipped} "
          f"removed={removed} failed={failed}")
    print("Next steps:")
    print("  1. Attach the KB to the assistant model (Workspace > Models > edit > Knowledge).")
    print("  2. ALSO attach 00-escalation-guide.md as a standalone file in FULL CONTEXT")
    print("     mode (click the attached item to toggle) so escalation rules are always")
    print("     injected and never depend on the model choosing to retrieve them.")
    print("  3. Keep the KB itself on Focused Retrieval (default).")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
