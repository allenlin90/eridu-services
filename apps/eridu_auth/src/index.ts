import path from 'node:path';

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { eq } from 'drizzle-orm';
import { cors } from 'hono/cors';

import { db } from '@/db';
import { session } from '@/db/schema';
import env from '@/env';
import { auth } from '@/lib/auth'; // path to your auth file
import { createApp } from '@/lib/create-app';

const app = createApp();

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

  const authSession = await auth.api.getSession({ headers: c.req.raw.headers });

  c.set('user', authSession?.user ?? null);
  c.set('session', authSession?.session ?? null);
  return next();
});

// Service-to-service endpoint: revoke all sessions for a user.
// Used by SSR consumers (e.g. eridu_docs) to perform server-side logout.
// Protected by SERVICE_SECRET — must not be exposed to browsers.
app.post('/api/service/sign-out', async (c) => {
  if (!env.SERVICE_SECRET) {
    return c.json({ error: 'Service endpoint not configured' }, 503);
  }

  const authHeader = c.req.header('Authorization') ?? '';
  const [scheme, secret] = authHeader.split(' ');
  if (scheme !== 'Bearer' || secret !== env.SERVICE_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const userId = typeof (body as Record<string, unknown>)?.userId === 'string'
    ? (body as Record<string, string>).userId
    : null;

  if (!userId) {
    return c.json({ error: 'userId required' }, 400);
  }

  await db.delete(session).where(eq(session.userId, userId));

  return c.json({ success: true });
});

// Auth API routes - must be registered before static file serving
app.use('/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
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

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
    hostname: '::',
  },
  (info) => {
    console.warn(`Server is running on http://localhost:${info.port}`);
  },
);

// TODO: graceful shutdown
