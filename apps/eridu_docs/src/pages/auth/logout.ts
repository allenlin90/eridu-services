import type { APIRoute } from 'astro';

import { CONFIG } from '../../config/env';
import { normalizeReturnTo } from '../../lib/auth';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export const GET: APIRoute = async (context) => {
  const returnTo = normalizeReturnTo(context.url.searchParams.get('returnTo'));
  const siteOrigin = CONFIG.siteUrl ?? context.url.origin;
  const authSignOutUrl = new URL('/api/auth/sign-out', CONFIG.authUiUrl);
  const completeUrl = new URL('/auth/logout/complete', siteOrigin);
  completeUrl.searchParams.set('returnTo', returnTo);

  const authSignOutUrlJson = JSON.stringify(authSignOutUrl.toString()).replaceAll('<', '\\u003c');
  const completeUrlJson = JSON.stringify(completeUrl.toString()).replaceAll('<', '\\u003c');

  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Signing out...</title>
    <style>
      :root {
        color-scheme: light;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f6f7f9;
        color: #111827;
      }

      main {
        width: min(32rem, calc(100vw - 2rem));
        padding: 2rem;
        border: 1px solid #d1d5db;
        border-radius: 1rem;
        background: white;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      }

      h1 {
        margin: 0 0 0.75rem;
        font-size: 1.25rem;
      }

      p {
        margin: 0;
        line-height: 1.5;
        color: #4b5563;
      }

      a {
        color: #0f766e;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Signing you out...</h1>
      <p>Clearing the shared Better Auth session, then returning to the docs sign-in flow.</p>
      <noscript>
        <p style="margin-top: 1rem;">
          JavaScript is required to fully clear the shared auth session. You can still
          <a href="${escapeHtml(completeUrl.toString())}">clear the docs session only</a>.
        </p>
      </noscript>
    </main>
    <script>
      const authSignOutUrl = ${authSignOutUrlJson};
      const completeUrl = ${completeUrlJson};
      const finish = () => window.location.replace(completeUrl);

      // Best-effort: if eridu_auth is unreachable we still proceed to clear
      // the local docs cookie so the user isn't permanently stuck.
      fetch(authSignOutUrl, {
        method: 'POST',
        credentials: 'include',
      })
        .catch(() => undefined)
        .finally(finish);
    </script>
  </body>
</html>`,
    {
      headers: {
        'cache-control': 'no-store',
        'content-security-policy': `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src ${CONFIG.authUiUrl}; base-uri 'none'; form-action 'none'`,
        'content-type': 'text/html; charset=utf-8',
      },
      status: 200,
    },
  );
};
