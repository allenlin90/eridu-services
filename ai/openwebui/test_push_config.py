"""Unit tests for push_config.py's pure logic.

These cover the functions that decide *who loses access* and *what gets written*.
No network, no API key, no live instance -- run them anywhere:

    python3 ai/openwebui/test_push_config.py
"""

import io
import os
import sys
import unittest
from contextlib import redirect_stdout

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from push_config import (  # noqa: E402
    PushConfigError,
    Report,
    confirm_revokes,
    derive_skill_access,
    grant_key,
    grants_for,
    model_diff,
    split_frontmatter,
    unquote,
)

GROUPS = {
    "Admins": "uuid-admins",
    "Org - General": "uuid-org",
    "Commerce - Operation": "uuid-commerce",
}


def manifest(model_id, skills, read=(), write=(), public=False):
    return {
        "id": model_id,
        "skill_ids": list(skills),
        "access": {
            "read_groups": list(read),
            "write_groups": list(write),
            "public": public,
        },
    }


class DeriveSkillAccess(unittest.TestCase):
    def test_readers_and_writers_both_get_read(self):
        derived = derive_skill_access(
            {"m": manifest("m", ["a"], read=["Org - General"], write=["Admins"])}
        )
        self.assertEqual(derived["a"]["read"], {"Org - General", "Admins"})

    def test_only_writers_get_write(self):
        derived = derive_skill_access(
            {"m": manifest("m", ["a"], read=["Org - General"], write=["Admins"])}
        )
        self.assertEqual(derived["a"]["write"], {"Admins"})

    def test_access_is_the_union_across_models(self):
        derived = derive_skill_access(
            {
                "m1": manifest("m1", ["shared"], read=["Org - General"]),
                "m2": manifest("m2", ["shared"], read=["Commerce - Operation"]),
            }
        )
        self.assertEqual(
            derived["shared"]["read"], {"Org - General", "Commerce - Operation"}
        )

    def test_public_model_makes_its_skills_public(self):
        derived = derive_skill_access({"m": manifest("m", ["a"], public=True)})
        self.assertTrue(derived["a"]["public"])

    def test_skill_no_model_binds_derives_nothing(self):
        derived = derive_skill_access({"m": manifest("m", ["a"], read=["Admins"])})
        self.assertNotIn("orphan", derived)

    def test_pending_overrides_to_admins_only(self):
        derived = derive_skill_access(
            {"m": manifest("m", ["a"], read=["Org - General"], public=True)},
            pending=["a"],
        )
        self.assertEqual(derived["a"]["read"], {"Admins"})
        self.assertFalse(derived["a"]["public"])


class GrantsFor(unittest.TestCase):
    def test_write_group_also_gets_a_read_row(self):
        keys = {grant_key(g) for g in grants_for("skill", "s", [], ["Admins"], False, GROUPS)}
        self.assertEqual(
            keys, {("group", "uuid-admins", "read"), ("group", "uuid-admins", "write")}
        )

    def test_public_emits_the_wildcard_user_row(self):
        keys = {grant_key(g) for g in grants_for("skill", "s", [], [], True, GROUPS)}
        self.assertEqual(keys, {("user", "*", "read")})

    def test_unknown_group_is_a_clear_error_not_a_silent_skip(self):
        with self.assertRaises(PushConfigError) as caught:
            grants_for("skill", "s", ["Nope"], [], False, GROUPS)
        self.assertIn("Nope", str(caught.exception))

    def test_empty_derivation_produces_no_grants(self):
        self.assertEqual(grants_for("skill", "s", [], [], False, GROUPS), [])


class ModelDiff(unittest.TestCase):
    def desired(self, **overrides):
        base = {
            "name": "N",
            "base_model_id": "M",
            "is_active": True,
            "params": {},
            "meta": {
                "description": "d",
                "capabilities": {},
                "skillIds": ["a"],
                "toolIds": [],
                "builtinTools": {},
            },
            "access_grants": [],
        }
        base.update(overrides)
        return base

    def test_identical_reports_nothing(self):
        d = self.desired()
        self.assertEqual(model_diff(d, d), [])

    def test_missing_live_field_equals_empty_manifest_field(self):
        d = self.desired()
        d["meta"]["toolIds"] = []
        current = {**d, "meta": {**d["meta"]}}
        del current["meta"]["toolIds"]
        self.assertEqual(model_diff(current, d), [])

    def test_skill_binding_change_is_detected(self):
        d = self.desired()
        current = {**d, "meta": {**d["meta"], "skillIds": ["a", "b"]}}
        self.assertIn("meta.skillIds", model_diff(current, d))

    def test_grant_change_is_detected(self):
        d = self.desired()
        current = {
            **d,
            "access_grants": [
                {
                    "resource_type": "model",
                    "resource_id": "m",
                    "principal_type": "group",
                    "principal_id": "uuid-admins",
                    "permission": "read",
                }
            ],
        }
        self.assertIn("access_grants", model_diff(current, d))

    def test_knowledge_compared_by_id_not_by_cached_payload(self):
        d = self.desired()
        d["meta"]["knowledge"] = [{"id": "k1", "type": "collection"}]
        current = {
            **d,
            "meta": {
                **d["meta"],
                # Live embeds a stale cached copy; only the id should matter.
                "knowledge": [{"id": "k1", "type": "collection", "access_grants": ["stale"]}],
            },
        }
        self.assertNotIn("meta.knowledge", model_diff(current, d))


class ConfirmRevokes(unittest.TestCase):
    def test_no_revokes_passes(self):
        confirm_revokes(Report(), assume_yes=False)

    def test_assume_yes_passes(self):
        report = Report()
        report.revokes.append(("skill", ["Admins:read"]))
        with redirect_stdout(io.StringIO()):
            confirm_revokes(report, assume_yes=True)

    def test_unattended_run_refuses(self):
        report = Report()
        report.revokes.append(("skill", ["Admins:read"]))
        original = sys.stdin
        sys.stdin = io.StringIO()  # not a tty
        try:
            with redirect_stdout(io.StringIO()), self.assertRaises(PushConfigError) as caught:
                confirm_revokes(report, assume_yes=False)
        finally:
            sys.stdin = original
        self.assertIn("nothing was written", str(caught.exception))


class Frontmatter(unittest.TestCase):
    def test_quoted_value_keeps_trailing_space(self):
        # Live ids and names carry trailing whitespace that models reference verbatim.
        self.assertEqual(unquote('"Affiliate management "'), "Affiliate management ")

    def test_bare_value_is_returned_unchanged(self):
        self.assertEqual(unquote("Core Principles"), "Core Principles")

    def test_body_excludes_the_frontmatter_block(self):
        fields, body = split_frontmatter('---\nname: X\n---\n\nBody here\n', "t.md")
        self.assertEqual(fields["name"], "X")
        self.assertEqual(body, "Body here\n")

    def test_missing_frontmatter_is_an_error(self):
        with self.assertRaises(PushConfigError):
            split_frontmatter("no frontmatter\n", "t.md")


if __name__ == "__main__":
    unittest.main(verbosity=2)
