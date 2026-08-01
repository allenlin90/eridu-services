# Railway runner for the Open WebUI config sync.
#
# Build context is this directory (service `root_directory` = `ai/openwebui`), so
# the image carries the skill content, model manifests, and both config scripts —
# everything push_config.py reads. Nothing else in the monorepo is needed.
#
# stdlib only: no requirements.txt, no pip install.
FROM python:3.13-slim

WORKDIR /app
COPY . .

ENTRYPOINT ["/bin/sh", "railway-entrypoint.sh"]
