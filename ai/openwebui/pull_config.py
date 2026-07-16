import os
import json
import urllib.request
from urllib.error import HTTPError

# Load environment variables
env = {}
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if '=' in line:
                k, v = line.strip().split('=', 1)
                env[k.strip()] = v.strip()

api_key = env.get('OPEN_WEBUI_API_KEY')
host = env.get('OPEN_WEBUI_HOST')

if not api_key or not host:
    print("Error: OPEN_WEBUI_API_KEY or OPEN_WEBUI_HOST not found in .env")
    exit(1)

headers = {
    'Authorization': f'Bearer {api_key}',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def api_get(path):
    url = f"{host}{path}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode())
    except HTTPError as e:
        print(f"HTTP Error on GET {path}: {e.code} - {e.reason}")
        return None
    except Exception as e:
        print(f"Error on GET {path}: {e}")
        return None

# Destination directory
synced_dir = os.path.join(os.path.dirname(__file__), 'synced')
os.makedirs(synced_dir, exist_ok=True)

# 1. Pull Models
print("Pulling models...")
models = api_get('/api/v1/models/export')
if models:
    # Sort models by ID for deterministic output
    models = sorted(models, key=lambda m: m['id'])
    with open(os.path.join(synced_dir, 'models.json'), 'w') as f:
        json.dump(models, f, indent=4)
    print("Saved models.json")

# 2. Pull Groups
print("Pulling groups...")
groups = api_get('/api/v1/groups/')
if groups:
    # Sort groups by ID for deterministic output
    groups = sorted(groups, key=lambda g: g['id'])
    with open(os.path.join(synced_dir, 'groups.json'), 'w') as f:
        json.dump(groups, f, indent=4)
    print("Saved groups.json")

# 3. Pull Tool Servers
print("Pulling tool servers...")
tool_servers = api_get('/api/v1/configs/tool_servers')
if tool_servers:
    with open(os.path.join(synced_dir, 'tool-servers.json'), 'w') as f:
        json.dump(tool_servers, f, indent=4)
    print("Saved tool-servers.json")

# 4. Pull Default Permissions
print("Pulling default permissions...")
default_perms = api_get('/api/v1/users/default/permissions')
if default_perms:
    with open(os.path.join(synced_dir, 'default-permissions.json'), 'w') as f:
        json.dump(default_perms, f, indent=4)
    print("Saved default-permissions.json")

# 5. Pull Knowledge Collection
print("Pulling knowledge collection...")
knowledge_id = "0f0de3c0-7168-4871-ab99-7ed95af8f953"
knowledge = api_get(f'/api/v1/knowledge/{knowledge_id}')
if knowledge:
    with open(os.path.join(synced_dir, 'knowledge.json'), 'w') as f:
        json.dump(knowledge, f, indent=4)
    print("Saved knowledge.json")

# 6. Pull Knowledge Collection Files
print("Pulling knowledge files...")
knowledge_files = api_get(f'/api/v1/knowledge/{knowledge_id}/files')
if knowledge_files:
    # Sort files by ID for deterministic output
    if 'items' in knowledge_files:
        knowledge_files['items'] = sorted(knowledge_files['items'], key=lambda f: f.get('id', ''))
    with open(os.path.join(synced_dir, 'knowledge-files.json'), 'w') as f:
        json.dump(knowledge_files, f, indent=4)
    print("Saved knowledge-files.json")

# 7. Pull Function and Valves
print("Pulling function and valves...")
func_id = "company_wiki_sync"
func = api_get(f'/api/v1/functions/id/{func_id}')
valves = api_get(f'/api/v1/functions/id/{func_id}/valves')
if func:
    # Build synced functions.json with redacted valves API key
    func_data = {
        "id": func.get("id"),
        "name": func.get("name"),
        "type": func.get("type"),
        "is_active": func.get("is_active"),
        "is_global": func.get("is_global"),
        "meta": func.get("meta"),
        "valves": valves or {},
        "note": "content omitted here -- canonical source is ai/openwebui/functions/sync-pipe.py, applied via POST /api/v1/functions/id/{id}/update per that file's deploy instructions."
    }
    if "api_key" in func_data["valves"]:
        func_data["valves"]["api_key"] = "<redacted, see ai/openwebui/.env>"
    
    with open(os.path.join(synced_dir, 'functions.json'), 'w') as f:
        json.dump(func_data, f, indent=2)
    print("Saved functions.json")

# 8. Pull Skills
print("Pulling skills...")
skills = api_get('/api/v1/skills/export')
if skills:
    skills_dir = os.path.join(synced_dir, 'skills')
    os.makedirs(skills_dir, exist_ok=True)
    
    # Track skill files we write so we can clean up any deleted skills
    written_files = set()
    
    for skill in skills:
        skill_id = skill.get('id')
        if skill_id == 'citation-escalation-contract':
            # Tracked separately, not duplicated in synced/skills/
            continue
            
        content = skill.get('content', '')
        # Write content verbatim
        filename = f"{skill_id}.md"
        filepath = os.path.join(skills_dir, filename)
        with open(filepath, 'w') as f:
            f.write(content)
        written_files.add(filename)
        
    # Clean up any MD files in synced/skills/ that are no longer present in export
    for filename in os.listdir(skills_dir):
        if filename.endswith('.md') and filename not in written_files:
            # Check if it is citation-escalation-contract (which we skip writing)
            if filename == 'citation-escalation-contract.md':
                continue
            os.remove(os.path.join(skills_dir, filename))
            print(f"Removed stale skill file: {filename}")
            
    print(f"Saved {len(written_files)} skill files to synced/skills/")
