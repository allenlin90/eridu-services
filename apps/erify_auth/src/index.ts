import { auth } from '@/lib/auth'; // path to your auth file
import { createApp } from '@/lib/create-app';
import { serve } from '@hono/node-server';
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
