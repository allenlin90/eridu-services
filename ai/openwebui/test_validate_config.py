"""Unit tests for secret-free Open WebUI delivery validation."""

import unittest

from validate_config import validate_state


def skill_index(*skill_ids, staged=()):
    return {
        skill_id: {
            "name": skill_id,
            "description": "Use for tests.",
            **({"access": "admins-only"} if skill_id in staged else {}),
        }
        for skill_id in skill_ids
    }


def repo_skills(*skill_ids):
    return {skill_id: {"id": skill_id} for skill_id in skill_ids}


def model(skill_ids=(), read_groups=("Users",)):
    return {
        "assistant": {
            "skill_ids": list(skill_ids),
            "access": {"read_groups": list(read_groups)},
        }
    }


class ValidateStateTests(unittest.TestCase):
    def test_rejects_missing_skill_reference(self):
        errors, _ = validate_state(
            skill_index("known"),
            repo_skills("known"),
            model(("missing",)),
            {"unbound": {}, "no_model_audience": {}},
        )
        self.assertIn("references missing skill", "\n".join(errors))

    def test_rejects_changed_unbound_skill(self):
        errors, _ = validate_state(
            skill_index("new"),
            repo_skills("new"),
            {},
            {"unbound": {}, "no_model_audience": {}},
            changed_ids={"new"},
        )
        self.assertIn("is unbound", "\n".join(errors))

    def test_accepts_reviewed_unbound_exception(self):
        errors, warnings = validate_state(
            skill_index("legacy"),
            repo_skills("legacy"),
            {},
            {
                "unbound": {"legacy": "Imported legacy state."},
                "no_model_audience": {},
            },
            changed_ids={"legacy"},
        )
        self.assertEqual([], errors)
        self.assertIn("reviewed exception", "\n".join(warnings))

    def test_rejects_stale_admins_only_marker(self):
        errors, _ = validate_state(
            skill_index("bound", staged=("bound",)),
            repo_skills("bound"),
            model(("bound",)),
            {"unbound": {}, "no_model_audience": {}},
        )
        self.assertIn("stale Admins-only marker", "\n".join(errors))

    def test_rejects_bound_skill_without_model_audience(self):
        errors, _ = validate_state(
            skill_index("hidden"),
            repo_skills("hidden"),
            model(("hidden",), read_groups=()),
            {"unbound": {}, "no_model_audience": {}},
            changed_ids={"hidden"},
        )
        self.assertIn("no model audience", "\n".join(errors))

    def test_rejects_stale_exception(self):
        errors, _ = validate_state(
            skill_index("bound"),
            repo_skills("bound"),
            model(("bound",)),
            {
                "unbound": {"bound": "No longer true."},
                "no_model_audience": {},
            },
        )
        self.assertIn("stale unbound exception", "\n".join(errors))


if __name__ == "__main__":
    unittest.main()
