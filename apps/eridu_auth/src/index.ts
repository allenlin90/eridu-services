import path from 'node:path';

import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from '@better-auth/oauth-provider';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';

import { db } from '@/db';
import env from '@/env';
import { auth } from '@/lib/auth'; // path to your auth file
import { createApp } from '@/lib/create-app';

const app = createApp();
const openIdConfigHandler = oauthProviderOpenIdConfigMetadata(auth);
const authServerMetadataHandler = oauthProviderAuthServerMetadata(auth);

app.use(
  '*',
  cors({
    origin: env.ALLOWED_ORIGINS,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  }),
);

app.use('*', async (c, next) => {
  const path = c.req.path;
  // Skip auth check for static assets and common file extensions
  if (
    path.startsWith('/assets/')
    || path.match(/\.(ico|png|svg|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|css|js)$/)
  ) {
    return next();
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  c.set('user', session?.user ?? null);
  c.set('session', session?.session ?? null);
  return next();
});

// Auth API routes - must be registered before static file serving
app.use('/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});

// OAuth/OIDC discovery metadata is exposed from the issuer root for clients
// that do not know the Better Auth base path ahead of time.
app.get('/.well-known/openid-configuration', (c) => {
  return openIdConfigHandler(c.req.raw);
});

app.get('/.well-known/oauth-authorization-server', (c) => {
  return authServerMetadataHandler(c.req.raw);
});

app.get('/.well-known/oauth-authorization-server/api/auth', (c) => {
  return authServerMetadataHandler(c.req.raw);
});

// Serve static files from frontend build in production
if (env.NODE_ENV === 'production') {
  const frontendDistPath = path.join(process.cwd(), 'dist', 'frontend');

  // Serve static assets (JS, CSS, images, etc.)
  app.use(
    '/assets/*',
    serveStatic({
      root: frontendDistPath,
    }),
  );

  // Serve other static files (favicon, etc.)
  app.use(
    '/*.{ico,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}',
    serveStatic({
      root: frontendDistPath,
    }),
  );

  // Serve index.html for all non-API GET routes (SPA routing fallback)
  app.get('*', async (c, next) => {
    // Don't serve index.html for API routes
    if (c.req.path.startsWith('/api/')) {
      return next(); // Let the API routes handle it
    }
    // Serve index.html for all other routes
    return serveStatic({
      root: frontendDistPath,
      path: 'index.html',
    })(c, next);
  });
}

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
    hostname: '::',
  },
  (info) => {
    console.warn(`Server is running on http://localhost:${info.port}`);
  },
);

function gracefulShutdown(signal: string) {
  console.warn(`Received ${signal}, shutting down gracefully...`);
  server.close(async (err) => {
    if (err) {
      console.error('Error while closing server:', err);
    }
    await db.$client.end();
    process.exit(err ? 1 : 0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
