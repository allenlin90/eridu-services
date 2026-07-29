#!/usr/bin/env python3
"""Focused regression tests for upload_kb.py's access-control gate.

No third-party test runner is required. Run directly:
    python3 test_upload_kb.py
"""

import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

# The access-gate tests are pure and never construct the HTTP client. Keep them
# runnable in this script-only directory even when requests is not installed.
try:
    import requests  # noqa: F401
except ModuleNotFoundError:
    sys.modules["requests"] = types.SimpleNamespace(
        HTTPError=RuntimeError,
        Session=object,
    )

import upload_kb


GROUPS = [
    {"id": "group_erisa", "name": "Erisa - Creator"},
    {"id": "group_admins", "name": "Admins"},
    {"id": "group_commerce", "name": "Commerce - Operation"},
]

MANUAL_EXCEPTION = {
    "policy": "ai/architecture/llm-knowledge-base-plan.md § Content Contract",
    "expected_group_grants": {
        "read": ["Erisa - Creator", "Admins"],
        "write": ["Admins"],
    },
}

EXPECTED_GRANTS = [
    {
        "principal_type": "group",
        "principal_id": "group_erisa",
        "permission": "read",
    },
    {
        "principal_type": "group",
        "principal_id": "group_admins",
        "permission": "read",
    },
    {
        "principal_type": "group",
        "principal_id": "group_admins",
        "permission": "write",
    },
]


class FakeApi:
    def __init__(self, grants=None, include_kb=True):
        self.grants = list(grants or [])
        self.include_kb = include_kb

    def get(self, endpoint, **kwargs):
        if endpoint == "list_kb":
            items = (
                [{"id": "kb_creator", "name": "creator-services-tiktok-shop"}]
                if self.include_kb
                else []
            )
            return {"items": items, "total": len(items)}
        if endpoint == "list_groups":
            return {"items": GROUPS, "total": len(GROUPS)}
        if endpoint == "get_kb":
            return {"id": kwargs["kb_id"], "access_grants": self.grants}
        raise AssertionError(f"Unexpected endpoint: {endpoint}")


def write_document(directory, name="doc.md", **overrides):
    fields = {
        "id": "test.document",
        "title": "Test Document",
        "audiences": "[erisa]",
        "owner": "erisa-creator-services",
        "sensitivity": "department",
        "status": "active",
        "reviewed_at": "2026-07-01",
        "review_by": "2026-10-01",
    }
    fields.update(overrides)
    path = Path(directory) / name
    frontmatter = "\n".join(f"{key}: {value}" for key, value in fields.items())
    path.write_text(f"---\n{frontmatter}\n---\n\n# Test\n", encoding="utf-8")
    return path


class ManualGrantTests(unittest.TestCase):
    def test_exact_reviewed_grants_are_accepted(self):
        api = FakeApi(EXPECTED_GRANTS)

        kb_id = upload_kb.verify_manual_grants(
            api, "creator-services-tiktok-shop", MANUAL_EXCEPTION
        )

        self.assertEqual(kb_id, "kb_creator")

    def test_unexpected_non_wildcard_group_is_rejected(self):
        grants = EXPECTED_GRANTS + [
            {
                "principal_type": "group",
                "principal_id": "group_commerce",
                "permission": "read",
            }
        ]
        api = FakeApi(grants)

        with self.assertRaises(upload_kb.GateError) as caught:
            upload_kb.verify_manual_grants(
                api, "creator-services-tiktok-shop", MANUAL_EXCEPTION
            )

        self.assertIn("unexpected", str(caught.exception))
        self.assertIn("group_commerce", str(caught.exception))

    def test_missing_collection_is_rejected(self):
        api = FakeApi(EXPECTED_GRANTS, include_kb=False)

        with self.assertRaises(upload_kb.GateError) as caught:
            upload_kb.verify_manual_grants(
                api, "creator-services-tiktok-shop", MANUAL_EXCEPTION
            )

        self.assertIn("does not exist", str(caught.exception))

    def test_main_rechecks_manual_grants_after_file_reconciliation(self):
        with tempfile.TemporaryDirectory() as tmp:
            document = write_document(tmp)
            existing = {
                document.name: {
                    "id": "file_existing",
                    "hash": upload_kb.content_sha256(document),
                }
            }
            argv = [
                "upload_kb.py",
                "--kb-name",
                "creator-services-tiktok-shop",
                "--dir",
                tmp,
                "--manual-grants-exception",
                "approved pilot exception",
            ]
            with (
                patch.dict(
                    "os.environ",
                    {
                        "OPENWEBUI_URL": "https://example.invalid",
                        "OPENWEBUI_API_KEY": "test-token",
                    },
                    clear=True,
                ),
                patch.object(sys, "argv", argv),
                patch.object(upload_kb, "Api", return_value=object()),
                patch.object(
                    upload_kb,
                    "_manual_exception_allowlist",
                    return_value={
                        "creator-services-tiktok-shop": MANUAL_EXCEPTION
                    },
                ),
                patch.object(
                    upload_kb,
                    "verify_manual_grants",
                    return_value="kb_creator",
                ) as verify,
                patch.object(upload_kb, "existing_files", return_value=existing),
                patch.object(upload_kb, "existing_dirs", return_value={}),
            ):
                upload_kb.main()

            self.assertEqual(verify.call_count, 2)


class ContentContractTests(unittest.TestCase):
    def test_valid_document_derives_expected_grants(self):
        with tempfile.TemporaryDirectory() as tmp:
            document = write_document(tmp)

            grants = upload_kb.derive_access_grants(FakeApi(), [document])

        self.assertEqual(
            {upload_kb._grant_key(grant) for grant in grants},
            {upload_kb._grant_key(grant) for grant in EXPECTED_GRANTS},
        )

    def test_superseded_and_missing_required_fields_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            superseded = write_document(tmp, status="superseded")
            missing_title = write_document(tmp, name="missing-title.md", title="")

            with self.assertRaises(upload_kb.GateError) as caught:
                upload_kb.derive_access_grants(
                    FakeApi(), [superseded, missing_title]
                )

        message = str(caught.exception)
        self.assertIn("superseded", message)
        self.assertIn("missing required 'title'", message)

    def test_bad_dates_and_duplicate_ids_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            first = write_document(tmp, review_by="2026-06-30")
            second = write_document(
                tmp,
                name="duplicate.md",
                reviewed_at="not-a-date",
            )

            with self.assertRaises(upload_kb.GateError) as caught:
                upload_kb.derive_access_grants(FakeApi(), [first, second])

        message = str(caught.exception)
        self.assertIn("precedes reviewed_at", message)
        self.assertIn("not an ISO date", message)
        self.assertIn("duplicate id", message)


if __name__ == "__main__":
    unittest.main(verbosity=2)
