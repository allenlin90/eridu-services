"""Package the Claude Chat/Cowork Open WebUI upload skill as an installable zip."""

import argparse
import os
import zipfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_ID = "upload-openwebui-skill"
SOURCE_DIR = os.path.join(BASE_DIR, "claude-skills", SKILL_ID)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("output", help="destination .zip path")
    args = parser.parse_args()

    output = os.path.abspath(args.output)
    if not output.endswith(".zip"):
        parser.error("output must end in .zip")

    skill_file = os.path.join(SOURCE_DIR, "SKILL.md")
    if not os.path.isfile(skill_file):
        parser.error(f"missing source skill: {skill_file}")

    os.makedirs(os.path.dirname(output), exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.write(skill_file, f"{SKILL_ID}/SKILL.md")
    print(output)


if __name__ == "__main__":
    main()
