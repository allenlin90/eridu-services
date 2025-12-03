import { Hono } from 'hono';

import type { auth } from '@/lib/auth';

export type AppBindings = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

export function createApp() {
  const app = new Hono<AppBindings>();

  return app;
}
