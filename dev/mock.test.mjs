import test from "node:test";
import assert from "node:assert/strict";
import { referrals, mockMiddleware } from "./mock.mjs";
import { createServer } from "node:http";

test("fixtures preserve pagination, second-level boundaries and summary independence", () => {
  const all = referrals(new URLSearchParams());
  assert.equal(all.total, 23); assert.equal(all.data.length, 20);
  assert.equal(referrals(new URLSearchParams("offset=20")).data.length, 3);
  assert.equal(referrals(new URLSearchParams("parent_id=demo_user_001")).total, 24);
  assert.equal(referrals(new URLSearchParams("parent_id=demo_self")), null);
  const search = referrals(new URLSearchParams("q=demo_user_047"));
  assert.equal(search.data[0].depth, 2); assert.deepEqual(search.summary, all.summary);
  const historical = referrals(new URLSearchParams("month=1900-01"));
  assert.equal(historical.summary[0].paid_amount_cents, 0);
  assert.equal(historical.summary[0].invitee_count, 23);
  assert.equal(all.data[0].child_paid_amount_cents, all.summary[1].paid_amount_cents);
});
test("mock requires login and invalidates sessions on logout", async t => {
  const handler = mockMiddleware();
  const server = createServer((req, res) => handler(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${base}/api/portal/auth/me`)).status, 401);
  const login = await fetch(`${base}/api/portal/auth/login`, { method: "POST", body: JSON.stringify({ identifier: "demo@example.com", password: "demo-password" }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  assert.equal((await fetch(`${base}/api/portal/referrals`, { headers: { cookie } })).status, 200);
  await fetch(`${base}/api/portal/auth/logout`, { method: "POST", headers: { cookie } });
  assert.equal((await fetch(`${base}/api/portal/auth/me`, { headers: { cookie } })).status, 401);
});
