import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { oauthClient } from '@/db/schema';
import { createApp } from '@/lib/create-app';
import type { ExtendedUser } from '@/lib/types';
import { hasRole } from '@/lib/types';

// better-auth's oauth-provider plugin only accepts `require_pkce` on the SERVER_ONLY
// admin create-client endpoint (unreachable from any HTTP client, browser included), and
// exposes no endpoint at all to change it on an existing client. This route fills that gap
// through the app's own Drizzle connection so the Portal can toggle it for clients whose
// OAuth library doesn't support PKCE (see eridu-auth-oauth-provider skill).
export const oauthClientsRoutes = createApp();

const updateRequirePkceSchema = z.object({
  requirePkce: z.boolean(),
});

oauthClientsRoutes.patch('/:clientId/require-pkce', async (c) => {
  const user = c.get('user') as ExtendedUser | null;
  if (!hasRole(user ?? undefined, 'admin')) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const parsed = updateRequirePkceSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const clientId = c.req.param('clientId');
  const [updated] = await db
    .update(oauthClient)
    .set({ requirePKCE: parsed.data.requirePkce })
    .where(eq(oauthClient.clientId, clientId))
    .returning({ clientId: oauthClient.clientId, requirePKCE: oauthClient.requirePKCE });

  if (!updated) {
    return c.json({ error: 'Client not found' }, 404);
  }

  return c.json({ clientId: updated.clientId, requirePkce: updated.requirePKCE });
});
