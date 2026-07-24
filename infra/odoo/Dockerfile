FROM odoo:19.0

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# auth_oidc declares python-jose as its external dependency, but eridu_auth signs
# id_tokens with EdDSA, which python-jose can't verify. patches/ replaces the
# verification code with a PyJWT[crypto]-based version instead — see that file's
# header comment and infra/odoo/README.md for the full rationale.
RUN pip3 install --no-cache-dir --break-system-packages 'pyjwt[crypto]'

# Pinned to a specific commit on the 19.0 branch, not the branch tip, so rebuilds are
# reproducible. To bump: find the new commit SHA at
# https://github.com/OCA/server-auth/commits/19.0 and update OCA_SERVER_AUTH_COMMIT,
# then re-diff patches/auth_oidc/models/auth_oauth_provider.py against the new
# upstream file and re-apply the EdDSA fix on top of any upstream changes.
ARG OCA_SERVER_AUTH_COMMIT=2303b27248a076dcc5d12fbebe5bfccd3e6fc1a3

RUN git init /tmp/server-auth \
    && cd /tmp/server-auth \
    && git remote add origin https://github.com/OCA/server-auth.git \
    && git fetch --depth 1 origin "${OCA_SERVER_AUTH_COMMIT}" \
    && git checkout FETCH_HEAD \
    && mkdir -p /mnt/extra-addons \
    && cp -r auth_oidc /mnt/extra-addons/auth_oidc \
    && rm -rf /tmp/server-auth

COPY patches/auth_oidc/__manifest__.py /mnt/extra-addons/auth_oidc/__manifest__.py
COPY patches/auth_oidc/models/auth_oauth_provider.py /mnt/extra-addons/auth_oidc/models/auth_oauth_provider.py

RUN chown -R odoo:odoo /mnt/extra-addons

USER odoo
