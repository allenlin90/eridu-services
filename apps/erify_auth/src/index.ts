import { auth } from '@/lib/auth'; // path to your auth file
import { createApp } from '@/lib/create-app';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import env from '@/env';

import { cors } from 'hono/cors';

const app = createApp();

app.use(
  '*',
  cors({
    origin: [
      'http://localhost',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:4173',
      'http://localhost:5173',
    ],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  })
);

app.use('*', async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  c.set('user', session?.user ?? null);
  c.set('session', session?.session ?? null);
  return next();
});

app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw));

// Serve static files from the frontend build
app.use('/*', serveStatic({ 
  root: './dist/frontend',
  rewriteRequestPath: (path) => {
    // If it's an API route, don't serve static files
    if (path.startsWith('/api/')) {
      return path;
    }
    // For static assets (JS, CSS, images, etc.), serve them as-is
    if (path.startsWith('/assets/') || path.includes('.')) {
      return path;
    }
    // For all other routes (SPA routes), serve index.html
    return '/index.html';
  }
}));

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);

// TODO: graceful shutdown
