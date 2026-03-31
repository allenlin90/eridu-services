import type { APIRoute } from 'astro';

import { CONFIG } from '../config/env';

export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'eridu_docs',
      authBypass: CONFIG.bypassAuth,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
};
