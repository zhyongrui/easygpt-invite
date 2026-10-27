// Development-only fixtures. Never included in the production bundle.
export const demoUser = { id: "demo_self", account_display: "de***@example.com" };
const currentMonth = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit" }).format(new Date());
const rows = Array.from({ length: 47 }, (_, i) => {
  const depth = i < 23 ? 1 : 2;
  return {
    id: `demo_user_${String(i + 1).padStart(3, "0")}`, account_display: `friend${i + 1}***@example.com`,
    created_at: "2026-01-15T08:00:00.000Z", depth,
    parent_id: depth === 1 ? demoUser.id : "demo_user_001",
    parent_display: depth === 1 ? demoUser.account_display : "friend1***@example.com",
    paid_order_count: i % 3 ? 1 : 0, paid_amount_cents: i % 3 ? 9900 : 0,
    child_count: i === 0 ? 24 : 0, child_paid_amount_cents: 0,
  };
});
export function referrals(search) {
  const parent = search.get("parent_id");
  if (parent && !rows.some(row => row.depth === 1 && row.id === parent)) return null;
  const month = search.get("month");
  const scoped = rows.map(row => ({ ...row, ...(month && month !== currentMonth ? { paid_order_count: 0, paid_amount_cents: 0 } : {}) }));
  for (const row of scoped) if (row.depth === 1) row.child_paid_amount_cents = scoped.filter(child => child.parent_id === row.id).reduce((sum, child) => sum + child.paid_amount_cents, 0);
  const q = (search.get("q") || "").toLowerCase();
  const matching = scoped.filter(row => parent ? row.parent_id === parent : q ? true : row.depth === 1)
    .filter(row => !q || `${row.id} ${row.account_display}`.toLowerCase().includes(q));
  const offset = Math.max(0, Number(search.get("offset")) || 0);
  return {
    inviter: { id: "demo_inviter", account_display: "in***@example.com" },
    summary: [1, 2].map(depth => {
      const layer = scoped.filter(row => row.depth === depth);
      return { depth, invitee_count: layer.length, paying_invitee_count: layer.filter(row => row.paid_order_count > 0).length,
        paid_order_count: layer.reduce((s, r) => s + r.paid_order_count, 0), paid_amount_cents: layer.reduce((s, r) => s + r.paid_amount_cents, 0) };
    }), data: matching.slice(offset, offset + 20), total: matching.length, undated_paid_order_count: 0,
  };
}
export function mockMiddleware() {
  const sessions = new Set();
  return async (req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost");
    if (!url.pathname.startsWith("/api/")) return next();
    const send = (status, payload) => { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(payload)); };
    const fail = (status, message) => send(status, { error: { message } });
    let body = {};
    if (req.method === "POST") {
      try { let text = ""; for await (const chunk of req) { text += chunk; if (text.length > 4096) return fail(413, "请求过大"); } body = JSON.parse(text || "{}"); }
      catch { return fail(400, "请求格式错误"); }
    }
    const token = req.headers.cookie?.match(/(?:^|;\s*)easygpt_demo_session=([^;]+)/)?.[1];
    if (url.pathname === "/api/portal/auth/login" && req.method === "POST") {
      if (body.identifier !== "demo@example.com" || body.password !== "demo-password") return fail(401, "演示账号或密码不正确");
      const value = crypto.randomUUID(); sessions.add(value);
      res.setHeader("Set-Cookie", `easygpt_demo_session=${value}; HttpOnly; SameSite=Strict; Path=/api/portal`);
      return send(200, { data: demoUser });
    }
    if (url.pathname.startsWith("/api/auth/password-reset")) return fail(503, "演示环境不发送邮件、不修改密码，请使用演示账号登录");
    if (url.pathname === "/api/portal/auth/logout" && req.method === "POST") {
      sessions.delete(token); res.setHeader("Set-Cookie", "easygpt_demo_session=; HttpOnly; SameSite=Strict; Path=/api/portal; Max-Age=0"); return send(200, { ok: true });
    }
    if (!sessions.has(token)) return fail(401, "请先登录演示账号");
    if (url.pathname === "/api/portal/auth/me" && req.method === "GET") return send(200, { data: demoUser });
    if (url.pathname === "/api/portal/referrals" && req.method === "GET") {
      const data = referrals(url.searchParams); return data ? send(200, { data }) : fail(404, "未找到可查看的邀请关系");
    }
    return fail(404, "演示接口不存在");
  };
}
