import json
import os
import sys
import urllib.request
from urllib.error import HTTPError

BASE_DIR = os.path.dirname(__file__)
SYNCED_DIR = os.path.join(BASE_DIR, "synced")
KNOWLEDGE_ID = "0f0de3c0-7168-4871-ab99-7ed95af8f953"
FUNCTION_ID = "company_wiki_sync"


class PullConfigError(RuntimeError):
    pass


def load_env():
    env = dict(os.environ)
    env_path = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as file:
            for line in file:
                if "=" in line:
                    key, value = line.strip().split("=", 1)
                    env[key.strip()] = value.strip()
    return env


def api_get(host, headers, path):
    request = urllib.request.Request(f"{host}{path}", headers=headers)
    try:
        with urllib.request.urlopen(request) as response:
            return json.loads(response.read().decode())
    except HTTPError as error:
        raise PullConfigError(
            f"GET {path} failed: HTTP {error.code} {error.reason}"
        ) from error
    except Exception as error:
        raise PullConfigError(f"GET {path} failed: {error}") from error


def write_json(filename, data, indent=4):
    with open(os.path.join(SYNCED_DIR, filename), "w", encoding="utf-8") as file:
        json.dump(data, file, indent=indent)
        file.write("\n")


def main():
    env = load_env()
    api_key = env.get("OPEN_WEBUI_API_KEY")
    host = env.get("OPEN_WEBUI_HOST")
    if not api_key or not host:
        raise PullConfigError(
            "OPEN_WEBUI_API_KEY or OPEN_WEBUI_HOST not found in the environment or .env"
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "eridu-services-openwebui-config-pull/1.0",
    }

    endpoints = {
        "models": "/api/v1/models/export",
        "groups": "/api/v1/groups/",
        "tool_servers": "/api/v1/configs/tool_servers",
        "default_permissions": "/api/v1/users/default/permissions",
        "knowledge": f"/api/v1/knowledge/{KNOWLEDGE_ID}",
        "knowledge_files": f"/api/v1/knowledge/{KNOWLEDGE_ID}/files",
        "function": f"/api/v1/functions/id/{FUNCTION_ID}",
        "valves": f"/api/v1/functions/id/{FUNCTION_ID}/valves",
        "skills": "/api/v1/skills/export",
    }

    pulled = {}
    for name, path in endpoints.items():
        print(f"Pulling {name.replace('_', ' ')}...")
        pulled[name] = api_get(host, headers, path)

    for name in ("models", "groups", "skills"):
        if not isinstance(pulled[name], list) or not pulled[name]:
            raise PullConfigError(f"{name.replace('_', ' ')} export was empty")

    models = sorted(pulled["models"], key=lambda model: model["id"])
    groups = sorted(pulled["groups"], key=lambda group: group["id"])
    knowledge_files = pulled["knowledge_files"]
    if "items" in knowledge_files:
        knowledge_files["items"] = sorted(
            knowledge_files["items"], key=lambda file: file.get("id", "")
        )

    function_data = {
        "id": pulled["function"].get("id"),
        "name": pulled["function"].get("name"),
        "type": pulled["function"].get("type"),
        "is_active": pulled["function"].get("is_active"),
        "is_global": pulled["function"].get("is_global"),
        "meta": pulled["function"].get("meta"),
        "valves": pulled["valves"],
        "note": "content omitted here -- canonical source is ai/openwebui/functions/sync-pipe.py, applied via POST /api/v1/functions/id/{id}/update per that file's deploy instructions.",
    }
    if "api_key" in function_data["valves"]:
        function_data["valves"]["api_key"] = "<redacted, see ai/openwebui/.env>"

    os.makedirs(SYNCED_DIR, exist_ok=True)
    write_json("models.json", models)
    write_json("groups.json", groups)
    write_json("tool-servers.json", pulled["tool_servers"])
    write_json("default-permissions.json", pulled["default_permissions"])
    write_json("knowledge.json", pulled["knowledge"])
    write_json("knowledge-files.json", knowledge_files)
    write_json("functions.json", function_data, indent=2)

    # Retrieval + embedding config (secret keys redacted). Captures the RAG
    # settings -- Top K, hybrid search, reranker, chunking, and the embedding
    # model -- that the models/knowledge exports do not include.
    def redact(node):
        if isinstance(node, dict):
            for field in list(node):
                low = field.lower()
                if isinstance(node[field], (dict, list)):
                    redact(node[field])
                elif node[field] and (
                    low.endswith(("key", "token", "password", "secret"))
                    or "api_key" in low
                ):
                    node[field] = "<redacted, see ai/openwebui/.env>"
        elif isinstance(node, list):
            for item in node:
                redact(item)
        return node

    retrieval_config = {
        "config": redact(api_get(host, headers, "/api/v1/retrieval/config")),
        "embedding": redact(api_get(host, headers, "/api/v1/retrieval/embedding")),
    }
    write_json("retrieval-config.json", retrieval_config, indent=2)

    # Metadata for every knowledge collection (id, name, description,
    # access_grants, file list). File CONTENT is intentionally not exported --
    # some collections hold third-party (TikTok Academy) material.
    kb_list = api_get(host, headers, "/api/v1/knowledge/")
    kb_items = kb_list.get("items", kb_list) if isinstance(kb_list, dict) else kb_list
    collections = []
    for kb in sorted(kb_items, key=lambda item: item.get("name", "")):
        files_resp = api_get(
            host, headers, f"/api/v1/knowledge/{kb['id']}/files?limit=100000"
        )
        file_items = (
            files_resp.get("items", []) if isinstance(files_resp, dict) else files_resp
        )
        files = sorted(
            (
                {
                    "id": entry.get("id"),
                    "name": (entry.get("meta") or {}).get("name") or entry.get("filename"),
                }
                for entry in file_items
            ),
            key=lambda entry: entry["name"] or "",
        )
        collections.append(
            {
                "id": kb.get("id"),
                "name": kb.get("name"),
                "description": kb.get("description"),
                "access_grants": kb.get("access_grants"),
                "created_at": kb.get("created_at"),
                "updated_at": kb.get("updated_at"),
                "file_count": files_resp.get("total")
                if isinstance(files_resp, dict)
                else len(files),
                "files": files,
            }
        )
    write_json("knowledge-collections.json", collections, indent=2)

    skills_dir = os.path.join(SYNCED_DIR, "skills")
    os.makedirs(skills_dir, exist_ok=True)
    written_files = set()
    skills = pulled["skills"]
    for skill in skills:
        skill_id = skill.get("id")
        if skill_id == "citation-escalation-contract":
            continue
        content = skill.get("content", "")
        filename = f"{skill_id}.md"
        filepath = os.path.join(skills_dir, filename)
        with open(filepath, "w", encoding="utf-8") as file:
            file.write(content)
        written_files.add(filename)

    for filename in os.listdir(skills_dir):
        if filename.endswith(".md") and filename not in written_files:
            if filename == "citation-escalation-contract.md":
                continue
            os.remove(os.path.join(skills_dir, filename))
            print(f"Removed stale skill file: {filename}")

    print(f"Saved {len(written_files)} skill files to synced/skills/")


if __name__ == "__main__":
    try:
        main()
    except PullConfigError as error:
        print(f"Error: {error}", file=sys.stderr)
        sys.exit(1)
