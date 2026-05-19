export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
    if (!token || token !== env.AUTH_SECRET) {
      return new Response('Unauthorized', { status: 401, headers: cors });
    }

    const { pathname } = new URL(request.url);

    if (pathname === '/messages') {
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

    return new Response('Not Found', { status: 404, headers: cors });
  },
};
