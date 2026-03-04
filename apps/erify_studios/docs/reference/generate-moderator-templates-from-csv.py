#!/usr/bin/env python3
"""
Generate strict loop-based task template JSON from moderator worksheet CSV.

Output format is aligned with:
- packages/api-types/src/task-management/template-definition.schema.ts

Usage:
  python3 generate_moderator_templates_from_csv.py \
    --input "Moderator working sheet - show_mechanics.csv" \
    --output-dir "./generated-task-templates"
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import OrderedDict
from pathlib import Path
from typing import Iterable


def slugify(value: str) -> str:
    text = value.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text or "item"


def parse_loop_number(loop_raw: str) -> int | None:
    match = re.search(r"(\d+)", loop_raw)
    if not match:
        return None
    return int(match.group(1))


def key_with_hash(base: str, payload: str, used: set[str]) -> str:
    digest = hashlib.sha1(payload.encode("utf-8")).hexdigest()[:8]
    candidate = f"{base}_{digest}"
    candidate = candidate[:50]
    if not candidate or not re.match(r"^[a-z]", candidate):
        candidate = f"k_{candidate}"[:50]

    if candidate not in used:
        used.add(candidate)
        return candidate

    suffix = 2
    while True:
        tail = f"_{suffix}"
        probe = f"{candidate[: 50 - len(tail)]}{tail}"
        if probe not in used:
            used.add(probe)
            return probe
        suffix += 1


def infer_data_collection_field_type(info: str) -> tuple[str, dict]:
    lower = info.lower()

    if "observation" in lower or "note" in lower:
        return "textarea", {}

    if "%" in info or "ctr" in lower or "cto" in lower:
        return "number", {"min": 0, "max": 100}

    if (
        "gmv" in lower
        or "gpm" in lower
        or "thb" in lower
        or "cost" in lower
        or "view" in lower
        or "click" in lower
        or "add-to-cart" in lower
        or "add to cart" in lower
    ):
        return "number", {"min": 0}

    return "text", {}


def infer_event_field_type(event: str) -> tuple[str, dict]:
    lower = event.strip().lower()
    if lower == "server url":
        return "url", {}
    if lower == "stream key":
        return "text", {}
    return "checkbox", {}


def normalize_campaign(raw: str) -> str:
    value = raw.strip()
    return value if value else "UNSPECIFIED"


def build_template_rows(rows: Iterable[dict]) -> dict[tuple[str, str], list[dict]]:
    grouped: dict[tuple[str, str], list[dict]] = {}
    for row in rows:
        store = (row.get("`") or "").strip()
        campaign = normalize_campaign(row.get("campaign") or "")
        if not store:
            continue
        grouped.setdefault((store, campaign), []).append(row)
    return grouped


def generate_template(store: str, campaign: str, rows: list[dict]) -> dict:
    # Preserve stable first-seen order of loop labels while still sorting by loop number.
    first_seen_loop_labels: "OrderedDict[str, None]" = OrderedDict()
    for row in rows:
        loop_raw = (row.get("Loop") or "").strip()
        if loop_raw:
            first_seen_loop_labels.setdefault(loop_raw, None)

    loop_rows = list(first_seen_loop_labels.keys())
    loop_rows.sort(key=lambda value: (parse_loop_number(value) is None, parse_loop_number(value) or 10_000, value))

    loop_id_by_raw: dict[str, str] = {}
    loops_metadata = []
    used_loop_ids: set[str] = set()
    anon_loop_counter = 1
    for loop_raw in loop_rows:
        parsed = parse_loop_number(loop_raw)
        if parsed is not None:
            loop_id = f"l{parsed}"
        else:
            while True:
                loop_id = f"l{anon_loop_counter}"
                anon_loop_counter += 1
                if loop_id not in used_loop_ids:
                    break
        if loop_id in used_loop_ids:
            # Defensive fallback if duplicated labels map to same numeric loop.
            probe = 2
            while f"{loop_id}_{probe}" in used_loop_ids:
                probe += 1
            loop_id = f"{loop_id}_{probe}"
        used_loop_ids.add(loop_id)
        loop_id_by_raw[loop_raw] = loop_id
        loops_metadata.append({
            "id": loop_id,
            "name": loop_raw or loop_id,
            "durationMin": 15,
        })

    items = []
    used_keys: set[str] = set()
    for index, row in enumerate(rows, start=1):
        loop_raw = (row.get("Loop") or "").strip()
        event = (row.get("Event") or "").strip()
        info = (row.get("Information") or "").strip()
        group = loop_id_by_raw.get(loop_raw)
        if not group:
            continue

        item_id = hashlib.sha1(f"{store}|{campaign}|{index}|{loop_raw}|{event}|{info}".encode("utf-8")).hexdigest()[:24]
        normalized_event = slugify(event or "event")
        normalized_info = slugify(info)[:18]
        key_base = f"{group}_{normalized_event}_{normalized_info}"
        key = key_with_hash(key_base, f"{loop_raw}|{event}|{info}|{index}", used_keys)

        if event.lower() == "data collection":
            field_type, validation = infer_data_collection_field_type(info)
            item = {
                "id": item_id,
                "key": key,
                "type": field_type,
                "label": info or "Data collection",
                "group": group,
                "required": True,
                "description": f"Data collection ({campaign})",
            }
            if validation:
                item["validation"] = validation
        else:
            event_field_type, event_validation = infer_event_field_type(event)
            label = event if event else "Event"
            item = {
                "id": item_id,
                "key": key,
                "type": event_field_type,
                "label": label,
                "group": group,
                "required": True,
                "description": info or f"{label} ({campaign})",
            }
            if event_validation:
                item["validation"] = event_validation

        items.append(item)

    return {
        "name": f"{store} - {campaign} Moderator Workflow",
        "description": (
            "Auto-generated from moderator worksheet CSV. "
            "Mechanics/events are checkbox steps; data collection rows are typed input fields."
        ),
        "task_type": "ACTIVE",
        "schema": {
            "items": items,
            "metadata": {
                "loops": loops_metadata,
                "source": {
                    "store": store,
                    "campaign": campaign,
                    "generatedFrom": "Moderator working sheet - show_mechanics.csv",
                },
            },
        },
    }


def write_template_json(output_dir: Path, store: str, campaign: str, payload: dict) -> Path:
    filename = f"{slugify(store)}__{slugify(campaign)}.json"
    target = output_dir / filename
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return target


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to source CSV")
    parser.add_argument("--output-dir", required=True, help="Directory for generated JSON templates")
    parser.add_argument("--store", default=None, help="Optional store filter (exact match)")
    parser.add_argument("--campaign", default=None, help="Optional campaign filter (exact match; use UNSPECIFIED for empty)")
    args = parser.parse_args()

    source = Path(args.input)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    with source.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))

    grouped = build_template_rows(rows)
    generated = []
    for (store, campaign), subset in sorted(grouped.items(), key=lambda x: (x[0][0], x[0][1])):
        if args.store and store != args.store:
            continue
        if args.campaign and campaign != args.campaign:
            continue
        payload = generate_template(store, campaign, subset)
        path = write_template_json(output_dir, store, campaign, payload)
        generated.append((path, len(payload["schema"]["metadata"]["loops"]), len(payload["schema"]["items"])))

    summary_path = output_dir / "_summary.json"
    summary_payload = [
        {
            "file": str(path.name),
            "loops": loop_count,
            "items": item_count,
        }
        for path, loop_count, item_count in generated
    ]
    summary_path.write_text(json.dumps(summary_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Generated {len(generated)} template file(s) in {output_dir}")
    print(f"Summary: {summary_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
