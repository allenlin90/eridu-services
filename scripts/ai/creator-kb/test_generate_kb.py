#!/usr/bin/env python3
"""
Regression test for generate_kb.generate() not leaving stale output behind.

No test framework dependency (matches the rest of this ad-hoc script
directory -- no pytest/requirements.txt here). Run directly:
    python3 test_generate_kb.py
"""
import os
import shutil
import tempfile

from generate_kb import generate


def test_regeneration_removes_stale_output_for_removed_category():
    """A category removed/renamed in the source Excel must not leave its old
    .md file behind as still-publishable content -- regression for the bug
    where generate() only ever created/overwrote current outputs and never
    cleaned a prior run's tree."""
    out_dir = tempfile.mkdtemp(prefix="generate_kb_test_")
    try:
        stale_dir = os.path.join(out_dir, "faq")
        os.makedirs(stale_dir)
        stale_path = os.path.join(stale_dir, "99-removed-policy.md")
        with open(stale_path, "w", encoding="utf-8") as f:
            f.write("# stale content from a prior run\n")

        readme_path = os.path.join(out_dir, "README.md")
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write("# hand-maintained, must survive regeneration\n")

        generate([], [], [], [], out_dir)

        assert not os.path.exists(stale_path), (
            f"stale output survived regeneration: {stale_path}")
        assert os.path.exists(readme_path), (
            "regeneration must not delete the hand-maintained README.md")
        print("PASS: test_regeneration_removes_stale_output_for_removed_category")
    finally:
        shutil.rmtree(out_dir, ignore_errors=True)


if __name__ == "__main__":
    test_regeneration_removes_stale_output_for_removed_category()
