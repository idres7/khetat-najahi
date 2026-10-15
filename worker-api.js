// Saves app data in KV (state + auto snapshots). Everything else is served from /public.
const H = { "access-control-allow-origin": "*", "access-control-allow-headers": "x-key,content-type", "access-control-allow-methods": "GET,PUT,OPTIONS" };
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...H, "content-type": "application/json" } });
export default {
  async fetch(req, env) {
    const u = new URL(req.url), p = u.pathname;
    if (!p.startsWith("/api/")) return env.ASSETS.fetch(req);
    if (req.method === "OPTIONS") return new Response(null, { headers: H });
    if (!env.APP_KEY || req.headers.get("x-key") !== env.APP_KEY) return J({ error: "unauthorized" }, 401);
    if (p === "/api/data" && req.method === "GET") {
      const v = await env.STUDY.get("state");
      return J(v ? JSON.parse(v) : {});
    }
    if (p === "/api/data" && req.method === "PUT") {
      const b = await req.text();
      if (b.length > 1000000) return J({ error: "too large" }, 413);
      JSON.parse(b);
      await env.STUDY.put("state", b);
      const now = Date.now(), last = +((await env.STUDY.get("lastsnap")) || 0);
      if (now - last > 1800000) {
        await env.STUDY.put("snap:" + String(now).padStart(13, "0"), b);
        await env.STUDY.put("lastsnap", String(now));
        const ks = (await env.STUDY.list({ prefix: "snap:" })).keys.map((k) => k.name).sort();
        for (const k of ks.slice(0, Math.max(0, ks.length - 30))) await env.STUDY.delete(k);
      }
      return J({ ok: true });
    }
    if (p === "/api/snaps") {
      const ks = (await env.STUDY.list({ prefix: "snap:" })).keys.map((k) => k.name).sort().reverse().slice(0, 30);
      return J(ks.map((k) => ({ k, ts: +k.slice(5) })));
    }
    if (p === "/api/snap") {
      const k = u.searchParams.get("k") || "";
      if (!k.startsWith("snap:")) return J({ error: "bad key" }, 400);
      const v = await env.STUDY.get(k);
      return J(v ? JSON.parse(v) : {});
    }
    return J({ error: "not found" }, 404);
  },
};
