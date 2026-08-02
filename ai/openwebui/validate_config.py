"""Validate Git-authored Open WebUI delivery policy without live credentials."""

import argparse
import json
import os
import subprocess
import sys

from push_config import (
    PushConfigError,
    admins_only_skills,
    load_manifests,
    load_repo_skills,
    load_skill_index,
    split_frontmatter,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))
EXCEPTIONS_FILE = os.path.join(BASE_DIR, "skill-delivery-exceptions.json")
COWORK_SKILL = os.path.join(
    BASE_DIR, "claude-skills", "upload-openwebui-skill", "SKILL.md"
)
SKILL_PATH_PREFIX = "ai/openwebui/skills/"
REQUIRED_COWORK_SOURCES = (
    ".agents/skills/upload-openwebui-skill/SKILL.md",
    ".agents/workflows/openwebui-sync-delivery.md",
)


def load_exceptions():
    with open(EXCEPTIONS_FILE, encoding="utf-8") as file:
        raw = json.load(file)
    return {
        category: raw.get(category) or {}
        for category in ("unbound", "no_model_audience")
    }


def changed_skill_ids(base_ref):
    if not base_ref:
        return set()
    result = subprocess.run(
        [
            "git",
            "diff",
            "--name-status",
            f"{base_ref}...HEAD",
            "--",
            "ai/openwebui/skills",
        ],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    changed = set()
    for line in result.stdout.splitlines():
        fields = line.split("\t")
        if not fields or fields[0].startswith("D"):
            continue
        path = fields[-1]
        if path.startswith(SKILL_PATH_PREFIX) and path.endswith(".md"):
            skill_id = os.path.basename(path)[: -len(".md")]
            if skill_id != "README":
                changed.add(skill_id)
    return changed


def validate_state(index, skills, manifests, exceptions, changed_ids=()):
    errors = []
    warnings = []
    changed_ids = set(changed_ids)
    staged = admins_only_skills(index)
    binding_models = {skill_id: [] for skill_id in skills}

    for model_id, manifest in manifests.items():
        for skill_id in manifest.get("skill_ids") or []:
            if skill_id not in skills:
                errors.append(f"model {model_id!r} references missing skill {skill_id!r}")
                continue
            binding_models[skill_id].append(model_id)

    for skill_id in sorted(staged):
        if skill_id not in skills:
            errors.append(f"Admins-only marker references missing skill {skill_id!r}")
        elif binding_models[skill_id]:
            errors.append(
                f"skill {skill_id!r} is model-bound; remove its stale Admins-only marker"
            )

    all_exception_ids = set().union(*[set(values) for values in exceptions.values()])
    for skill_id in sorted(all_exception_ids - set(skills)):
        errors.append(f"delivery exception references missing skill {skill_id!r}")
    for category, entries in exceptions.items():
        for skill_id, reason in entries.items():
            if not isinstance(reason, str) or not reason.strip():
                errors.append(f"{category} exception for {skill_id!r} needs a reason")

    unbound = {
        skill_id
        for skill_id, binders in binding_models.items()
        if not binders and skill_id not in staged
    }
    no_model_audience = set()
    for skill_id, binders in binding_models.items():
        if not binders:
            continue
        has_audience = any(
            (manifests[model_id].get("access") or {}).get("public")
            or (manifests[model_id].get("access") or {}).get("read_groups")
            or (manifests[model_id].get("access") or {}).get("write_groups")
            for model_id in binders
        )
        if not has_audience:
            no_model_audience.add(skill_id)

    categories = {
        "unbound": unbound,
        "no_model_audience": no_model_audience,
    }
    for category, affected in categories.items():
        allowed = set(exceptions[category])
        for skill_id in sorted(allowed - affected):
            errors.append(f"stale {category} exception for skill {skill_id!r}")
        for skill_id in sorted(affected):
            message = (
                f"skill {skill_id!r} is {category.replace('_', ' ')}; "
                "bind it to an audience, mark it Admins-only when unbound, "
                "or record a reviewed exception"
            )
            if skill_id in allowed:
                warnings.append(f"reviewed exception: {message}")
            elif not changed_ids or skill_id in changed_ids:
                errors.append(message)
            else:
                warnings.append(message)

    for skill_id in sorted(changed_ids & set(skills)):
        description = (index.get(skill_id) or {}).get("description")
        if not isinstance(description, str) or not description.strip():
            errors.append(f"changed skill {skill_id!r} needs a non-empty description")

    return errors, warnings


def validate_cowork_adapter():
    with open(COWORK_SKILL, encoding="utf-8") as file:
        content = file.read()
    metadata, _ = split_frontmatter(content, COWORK_SKILL)
    errors = []
    if metadata.get("name") != "upload-openwebui-skill":
        errors.append("Cowork adapter name must be 'upload-openwebui-skill'")
    if not metadata.get("description"):
        errors.append("Cowork adapter needs a non-empty description")
    errors.extend(
        [
            f"Cowork adapter must load canonical source {path!r}"
            for path in REQUIRED_COWORK_SOURCES
            if path not in content
        ]
    )
    if "OPEN_WEBUI_API_KEY" not in content:
        errors.append("Cowork adapter must state that it never receives the production key")
    return errors


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--base-ref",
        help="Git base SHA/ref; changed skill files receive stricter admission checks",
    )
    args = parser.parse_args()

    try:
        index = load_skill_index()
        skills = load_repo_skills()
        manifests = load_manifests()
        exceptions = load_exceptions()
        changed = changed_skill_ids(args.base_ref)
        errors, warnings = validate_state(
            index, skills, manifests, exceptions, changed_ids=changed
        )
        errors.extend(validate_cowork_adapter())
    except (OSError, json.JSONDecodeError, PushConfigError, subprocess.CalledProcessError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    for warning in warnings:
        print(f"WARNING: {warning}")
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print(
        f"Validated {len(skills)} skills, {len(manifests)} models, "
        f"and {len(changed)} changed skill files."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
