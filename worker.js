const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function authorized(request, env) {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  return token && token === env.AUTH_SECRET;
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (pathname === '/messages') {
      if (!env.AUTH_SECRET || !env.STORE) {
        return new Response('Sync not configured', { status: 503, headers: cors });
      }
      if (!authorized(request, env)) {
        return new Response('Unauthorized', { status: 401, headers: cors });
      }
      if (request.method === 'GET') {
        const data = (await env.STORE.get('messages')) ?? '[]';
        return new Response(data, {
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      if (request.method === 'POST') {
        const body = await request.text();
        await env.STORE.put('messages', body);
        return new Response('OK', { headers: cors });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
