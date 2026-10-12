// Handles /api/data (saves to KV). Everything else is served from /public.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/data") {
      if (!env.APP_KEY || request.headers.get("x-key") !== env.APP_KEY)
        return new Response("unauthorized", { status: 401 });
      if (request.method === "GET") {
        const v = await env.STUDY.get("state");
        return Response.json(v ? JSON.parse(v) : {});
      }
      if (request.method === "PUT") {
        const body = await request.text();
        if (body.length > 1000000) return new Response("too large", { status: 413 });
        JSON.parse(body);
        await env.STUDY.put("state", body);
        return Response.json({ ok: true });
      }
      return new Response("method not allowed", { status: 405 });
    }
    return env.ASSETS.fetch(request);
  },
};
