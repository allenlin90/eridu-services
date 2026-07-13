"""
title: Knowledge Sync Pipe
author: eridu-services
version: 0.4.1
description: Diffs the company wiki content tree against a target Open WebUI knowledge collection (checksum-based create/update/remove), triggered externally via a chat completion. Fetches real content from GitHub raw at a pinned ref — see content_paths in Valves. Verified end-to-end against a live disposable test collection on 0.10.2 (create, idempotent no-op, update, create, obsolete-removal) before this fetch was wired in; see ai/architecture/llm-knowledge-base-plan.md Sync Contract. Matches existing files by the document's frontmatter id, not its repo path — Open WebUI flattens uploaded filenames to their basename, which broke path-based matching on re-sync (see functions/README.md gotchas).
requirements: httpx
"""

import asyncio
import hashlib
import json
import re

import httpx
from pydantic import BaseModel, Field


class Pipe:
    class Valves(BaseModel):
        api_key: str = Field(default="", description="Admin API key for internal loopback calls to this same Open WebUI instance.")
        base_url: str = Field(default="http://localhost:8080", description="Internal Open WebUI base URL (loopback).")
        collection_id: str = Field(default="", description="Target knowledge collection id. Empty = create one named 'Company Wiki' on first run.")
        github_owner: str = Field(default="allenlin90", description="GitHub org/user that owns the content repo.")
        github_repo: str = Field(default="eridu-services", description="GitHub repo name.")
        github_ref: str = Field(default="master", description="Branch, tag, or commit SHA to fetch content from. Public repo — no token required.")
        content_paths: str = Field(
            default="ai/openwebui/knowledge/company-wiki/content/shared/company-wiki-overview.md",
            description="Comma-separated list of file paths (relative to repo root) to sync. Phase 1 pilot uses an explicit list; a later phase can replace this with a recursive GitHub Contents API listing of the content/ tree.",
        )

    def __init__(self):
        self.valves = self.Valves()

    async def _source_documents(self, client):
        paths = [p.strip() for p in self.valves.content_paths.split(",") if p.strip()]
        docs = []
        for repo_path in paths:
            url = f"https://raw.githubusercontent.com/{self.valves.github_owner}/{self.valves.github_repo}/{self.valves.github_ref}/{repo_path}"
            resp = await client.get(url)
            resp.raise_for_status()
            text = resp.text
            # Open WebUI's file storage flattens any path sent as the upload filename
            # down to its basename, so a repo-relative path like "shared/doc.md" is
            # stored as just "doc.md" -- breaking existing-file lookup by path on
            # re-sync (confirmed live: it re-uploads and Open WebUI then rejects the
            # duplicate content). Use the document's own frontmatter `id` instead --
            # already guaranteed unique across content/ by tools/validate-wiki -- as
            # the stable filename, since it isn't subject to that flattening collision.
            match = re.search(r"^id:\s*(\S+)\s*$", text, re.MULTILINE)
            if not match:
                raise ValueError(f"{repo_path}: no 'id' field found in frontmatter")
            docs.append({"path": f"{match.group(1)}.md", "content": text})
        return docs

    def _headers(self):
        return {"Authorization": f"Bearer {self.valves.api_key}"}

    async def _get_or_create_collection(self, client, report):
        if self.valves.collection_id:
            return self.valves.collection_id
        resp = await client.post(
            f"{self.valves.base_url}/api/v1/knowledge/create",
            headers=self._headers(),
            json={
                "name": "Company Wiki",
                "description": "Synced from ai/openwebui/knowledge/company-wiki/content/ by the Knowledge Sync Pipe. Do not edit files here directly — changes are overwritten on the next sync.",
            },
        )
        resp.raise_for_status()
        collection_id = resp.json()["id"]
        report.append(f"created collection {collection_id} (no collection_id configured in Valves)")
        return collection_id

    async def _existing_files(self, client, collection_id):
        # GET /api/v1/knowledge/{id} never populates its `files` field on 0.10.2 (no
        # `files` relationship on the Knowledge SQLAlchemy model at all) despite being
        # typed to include them — use the dedicated files-listing endpoint instead.
        resp = await client.get(f"{self.valves.base_url}/api/v1/knowledge/{collection_id}/files", headers=self._headers())
        resp.raise_for_status()
        data = resp.json()
        existing = {}
        for f in data.get("items") or []:
            name = f.get("filename")
            if name:
                existing[name] = {"id": f["id"], "file_hash": f.get("hash")}
        return existing

    async def _upload_and_add(self, client, collection_id, path, content, checksum):
        files = {"file": (path, content.encode("utf-8"), "text/markdown")}
        data = {"metadata": json.dumps({"file_hash": checksum})}
        resp = await client.post(f"{self.valves.base_url}/api/v1/files/", headers=self._headers(), files=files, data=data)
        resp.raise_for_status()
        file_id = resp.json()["id"]

        for _ in range(20):
            status_resp = await client.get(f"{self.valves.base_url}/api/v1/files/{file_id}/process/status", headers=self._headers())
            status_resp.raise_for_status()
            if status_resp.json().get("status") == "completed":
                break
            await asyncio.sleep(1)

        add_resp = await client.post(
            f"{self.valves.base_url}/api/v1/knowledge/{collection_id}/file/add",
            headers=self._headers(),
            json={"file_id": file_id},
        )
        add_resp.raise_for_status()
        return file_id

    async def _remove_file(self, client, file_id):
        await client.delete(f"{self.valves.base_url}/api/v1/files/{file_id}", headers=self._headers())

    async def pipe(self, body: dict) -> str:
        if not self.valves.api_key:
            return "Sync Pipe error: no api_key configured in Valves. Set it via POST /api/v1/functions/id/{id}/valves/update before triggering."

        report = []
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                collection_id = await self._get_or_create_collection(client, report)
                existing = await self._existing_files(client, collection_id)
                source_docs = await self._source_documents(client)
                source_paths = {d["path"] for d in source_docs}

                for doc in source_docs:
                    checksum = hashlib.sha256(doc["content"].encode("utf-8")).hexdigest()
                    existing_entry = existing.get(doc["path"])

                    if existing_entry and existing_entry.get("file_hash") == checksum:
                        report.append(f"unchanged: {doc['path']}")
                        continue

                    if existing_entry:
                        await self._remove_file(client, existing_entry["id"])
                        report.append(f"updating: {doc['path']} (removed stale version, id={existing_entry['id']})")
                    else:
                        report.append(f"creating: {doc['path']}")

                    new_file_id = await self._upload_and_add(client, collection_id, doc["path"], doc["content"], checksum)
                    report.append(f"  -> uploaded as file {new_file_id}")

                obsolete = set(existing.keys()) - source_paths
                for path in obsolete:
                    await self._remove_file(client, existing[path]["id"])
                    report.append(f"removed obsolete: {path} (id={existing[path]['id']})")

                report.append(f"done. collection_id={collection_id}")
                return "\n".join(report)
        except httpx.HTTPStatusError as e:
            return f"Sync Pipe failed: {e}\nResponse body: {e.response.text}\nProgress before failure:\n" + "\n".join(report)
        except Exception as e:
            return f"Sync Pipe failed: {e}\nProgress before failure:\n" + "\n".join(report)
