"""Unit tests for pull_config.py snapshot safety."""

import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pull_config  # noqa: E402


class SnapshotSafety(unittest.TestCase):
    def test_late_api_failure_writes_no_snapshot_files(self):
        responses = {
            "/api/v1/models/export": [{"id": "model"}],
            "/api/v1/groups/": [{"id": "group"}],
            "/api/v1/configs/tool_servers": {},
            "/api/v1/users/default/permissions": {},
            f"/api/v1/knowledge/{pull_config.KNOWLEDGE_ID}": {},
            f"/api/v1/knowledge/{pull_config.KNOWLEDGE_ID}/files": {},
            f"/api/v1/functions/id/{pull_config.FUNCTION_ID}": {},
            f"/api/v1/functions/id/{pull_config.FUNCTION_ID}/valves": {},
            "/api/v1/skills/export": [{"id": "skill"}],
        }

        def fake_get(host, headers, path):
            del host, headers
            if path == "/api/v1/retrieval/config":
                raise pull_config.PullConfigError("late read failed")
            return responses[path]

        with (
            patch.object(
                pull_config,
                "load_env",
                return_value={"OPEN_WEBUI_HOST": "example.test", "OPEN_WEBUI_API_KEY": "key"},
            ),
            patch.object(pull_config, "api_get", side_effect=fake_get),
            patch.object(pull_config, "write_json") as write_json,
            patch.object(pull_config.os, "makedirs") as makedirs,
            self.assertRaisesRegex(pull_config.PullConfigError, "late read failed"),
        ):
            pull_config.main()

        write_json.assert_not_called()
        makedirs.assert_not_called()


if __name__ == "__main__":
    unittest.main(verbosity=2)
