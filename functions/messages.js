const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function authorized(request, env) {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  return token && token === env.AUTH_SECRET;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors });
}

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) {
    return new Response('Unauthorized', { status: 401, headers: cors });
  }
  const data = (await env.STORE.get('messages')) ?? '[]';
  return new Response(data, {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost({ request, env }) {
  if (!authorized(request, env)) {
    return new Response('Unauthorized', { status: 401, headers: cors });
  }
  const body = await request.text();
  await env.STORE.put('messages', body);
  return new Response('OK', { headers: cors });
}
