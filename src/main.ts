import "./styles.css";

type User = { id: string; account_display: string };
type Summary = { depth: number; invitee_count: number; paying_invitee_count: number; paid_order_count: number; paid_amount_cents: number };
type Row = User & { created_at: string; depth: number; parent_display: string | null; paid_order_count: number; paid_amount_cents: number; child_count: number; child_paid_amount_cents: number };
type Referrals = { inviter: User | null; summary: Summary[]; data: Row[]; total: number; undated_paid_order_count: number };
const root = document.querySelector<HTMLElement>("#portal")!;
const account = document.querySelector<HTMLElement>("#account")!;
const currentMonth = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit" }).format(new Date());
const money = (cents: number) => new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(cents / 100);
const date = (value: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai" }).format(new Date(value));
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
let generation = 0;
let month = "";
let query = "";
let offset = 0;
let user: User | null = null;
async function api<T>(path: string, body?: object): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { method: body ? "POST" : "GET", credentials: "same-origin", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw new Error("暂时无法连接服务，请稍后重试"); }
  let payload;
  try { payload = await response.json(); } catch { throw new Error("服务暂不可用，请稍后重试"); }
  if (!response.ok) {
    if (response.status === 401 && user) { user = null; renderLogin(); }
    throw new Error(payload.error?.message || "暂时无法连接服务，请稍后重试");
  }
  return payload.data as T;
}
function renderLogin(reset = false) {
  generation++;
  account.replaceChildren();
  root.innerHTML = `<section class="portal-login"><p class="eyebrow">EASYGPT · 邀请中心</p><h1>${reset ? "重置密码" : "查看您的邀请关系"}</h1><p>使用您已注册的 EasyGPT 账号${reset ? "重置密码" : "登录，查看两层邀请关系和充值统计"}。</p><form id="login"><label>注册邮箱<input name="identifier" type="email" autocomplete="username" required maxlength="320"></label>${reset ? '<button type="button" id="code" class="quiet">发送验证码</button><label>邮箱验证码<input name="verification_code" autocomplete="one-time-code" required maxlength="12"></label>' : ""}<label>${reset ? "新密码" : "密码"}<input name="password" type="password" autocomplete="${reset ? "new-password" : "current-password"}" required maxlength="256" ${reset ? 'minlength="8"' : ""}></label><p class="portal-error" role="alert" id="login-error"></p><button class="primary" type="submit">${reset ? "重置密码" : "登录"}</button><button class="quiet" id="switch" type="button">${reset ? "返回登录" : "忘记密码？"}</button></form><a href="/">返回官网</a></section>`;
  document.querySelector("#switch")!.addEventListener("click", () => renderLogin(!reset));
  const form = document.querySelector<HTMLFormElement>("#login")!;
  const error = document.querySelector<HTMLElement>("#login-error")!;
  document.querySelector("#code")?.addEventListener("click", async event => {
    const button = event.currentTarget as HTMLButtonElement;
    const identifier = form.elements.namedItem("identifier") as HTMLInputElement;
    if (!identifier.reportValidity()) return;
    button.disabled = true;
    try { await api("/api/auth/password-reset/code", { email: identifier.value }); error.textContent = "如果该邮箱已注册，验证码将发送至邮箱，请注意查收。"; }
    catch (cause) { error.textContent = (cause as Error).message; }
    finally { button.disabled = false; }
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
    button.disabled = true; error.textContent = "";
    const data = Object.fromEntries(new FormData(form));
    try {
      if (reset) { await api("/api/auth/password-reset", { email: data.identifier, new_password: data.password, verification_code: data.verification_code }); renderLogin(); document.querySelector("#login-error")!.textContent = "密码已重置，请使用新密码登录。"; }
      else { user = await api<User>("/api/portal/auth/login", data); month = ""; query = ""; offset = 0; renderDashboard(); }
    } catch (cause) { error.textContent = (cause as Error).message; }
    finally { button.disabled = false; }
  });
}
function renderDashboard() {
  account.innerHTML = `<span>${escape(user!.account_display)}</span><button id="logout" class="quiet">退出登录</button>`;
  document.querySelector("#logout")!.addEventListener("click", async () => {
    const button = document.querySelector<HTMLButtonElement>("#logout")!; button.disabled = true;
    try { await api("/api/portal/auth/logout", {}); user = null; renderLogin(); }
    catch { button.disabled = false; button.textContent = "退出失败，请重试"; }
  });
  root.innerHTML = `<div class="portal-title"><div><p class="eyebrow">与好友一起使用 EasyGPT</p><h1>我的邀请中心</h1></div><p>邀请关系与充值记录，一处查看</p></div><section id="inviter" class="portal-card"></section><section class="portal-card"><div class="portal-toolbar"><div class="scope" aria-label="统计范围"><button id="all" aria-pressed="true">累计</button><button id="monthly" aria-pressed="false">按月</button></div><label id="month-label" hidden>统计月份 <button type="button" id="month-prev" class="quiet" aria-label="上个月">上月</button><input id="month" type="month" min="1900-01" max="${currentMonth}" value="${currentMonth}"><button type="button" id="month-next" class="quiet" aria-label="下个月">下月</button></label></div><div id="stats" class="portal-stats"></div><p class="portal-note">邀请人数为累计人数；充值人数、订单和金额随统计范围变化。按北京时间的支付月份统计。</p></section><section class="portal-card"><div class="portal-toolbar"><div><h2>我的邀请关系</h2><p class="portal-note">直接邀请为第一层，他们邀请的人为第二层。</p></div><form id="search"><input aria-label="搜索邀请用户" placeholder="搜索脱敏账号或用户编号" maxlength="100"><button class="quiet">搜索</button></form></div><p id="list-error" class="portal-error" role="alert"></p><div id="list"></div><div id="pages" class="portal-pages"></div></section><p class="portal-note">有效充值仅包含已支付且未退款、未挂起的订单，不含赠送或手动调整额度。两层金额为用户充值统计，不代表邀请奖励金额。</p>`;
  document.querySelector("#all")!.addEventListener("click", () => { month = ""; offset = 0; updateScope(); void load(); });
  document.querySelector("#monthly")!.addEventListener("click", () => { month = (document.querySelector("#month") as HTMLInputElement).value; offset = 0; updateScope(); void load(); });
  for (const [id, delta] of [["month-prev", -1], ["month-next", 1]] as const) document.querySelector(`#${id}`)!.addEventListener("click", () => {
    const [year, number] = month.split("-").map(Number);
    const shifted = new Date(Date.UTC(year, number - 1 + delta, 1)).toISOString().slice(0,7);
    if (shifted < "1900-01" || shifted > currentMonth) return;
    month = shifted; (document.querySelector("#month") as HTMLInputElement).value = month; offset = 0; updateScope(); void load();
  });
  document.querySelector("#month")!.addEventListener("change", event => { const input = event.target as HTMLInputElement; if (input.value && input.validity.valid) { month = input.value; offset = 0; updateScope(); void load(); } });
  document.querySelector("#search")!.addEventListener("submit", event => { event.preventDefault(); query = document.querySelector<HTMLInputElement>("#search input")!.value.trim(); offset = 0; void load(); });
  updateScope(); void load();
}
function updateScope() {
  document.querySelector("#all")!.setAttribute("aria-pressed", String(!month));
  document.querySelector("#monthly")!.setAttribute("aria-pressed", String(!!month));
  (document.querySelector("#month-label") as HTMLElement).hidden = !month;
  (document.querySelector("#month-next") as HTMLButtonElement).disabled = month >= currentMonth;
  (document.querySelector("#month-prev") as HTMLButtonElement).disabled = month <= "1900-01";
}
function params(extra: Record<string, string> = {}) { return new URLSearchParams({ ...(month ? { month } : {}), ...extra }); }
function rowHtml(row: Row, children = false) {
  return `<article class="invite-row"><div class="invite-person"><strong>${escape(row.account_display || "已注册用户")}</strong><small>${escape(row.id)}</small><small>注册于 ${date(row.created_at)}${row.depth === 2 && !children ? ` · 第二层 · 邀请人 ${escape(row.parent_display || "已注册用户")}` : ""}</small></div><div><small>本人有效充值</small><strong>${money(row.paid_amount_cents)}</strong><small>${row.paid_order_count} 笔有效订单</small></div>${row.depth === 1 ? `<div><small>其邀请用户充值</small><strong>${money(row.child_paid_amount_cents)}</strong><small>累计邀请 ${row.child_count} 人</small></div><button class="quiet expand" data-user="${escape(row.id)}" aria-expanded="false" ${!row.child_count ? "disabled" : ""}>${row.child_count ? "查看第二层" : "暂无邀请"}</button>` : ""}</article>`;
}
async function load() {
  const version = ++generation;
  const list = document.querySelector<HTMLElement>("#list")!;
  const pages = document.querySelector<HTMLElement>("#pages")!;
  const error = document.querySelector<HTMLElement>("#list-error")!;
  list.textContent = "正在加载邀请关系…"; pages.replaceChildren(); error.textContent = "";
  document.querySelector("#stats")!.replaceChildren();
  try {
    const payload = await api<Referrals>(`/api/portal/referrals?${params({ q: query, offset: String(offset) })}`);
    if (version !== generation) return;
    document.querySelector("#inviter")!.textContent = `我的邀请人：${payload.inviter ? payload.inviter.account_display : "自主注册"}`;
    const first = payload.summary.find(s => s.depth === 1), second = payload.summary.find(s => s.depth === 2);
    document.querySelector("#stats")!.innerHTML = `<div><small>直接邀请 · 累计</small><strong>${first?.invitee_count || 0}<em> 人</em></strong></div><div><small>第二层邀请 · 累计</small><strong>${second?.invitee_count || 0}<em> 人</em></strong></div><div><small>${month || "累计"}充值人数</small><strong>${(first?.paying_invitee_count || 0) + (second?.paying_invitee_count || 0)}<em> 人</em></strong><small>第一层 ${first?.paying_invitee_count || 0} · 第二层 ${second?.paying_invitee_count || 0}</small></div><div><small>${month || "累计"}两层有效充值</small><strong>${money((first?.paid_amount_cents || 0) + (second?.paid_amount_cents || 0))}</strong><small>第一层 ${money(first?.paid_amount_cents || 0)} · 第二层 ${money(second?.paid_amount_cents || 0)}</small><small>${(first?.paid_order_count || 0) + (second?.paid_order_count || 0)} 笔有效订单</small></div>`;
    if (month && payload.undated_paid_order_count) error.textContent = `${payload.undated_paid_order_count} 笔历史有效订单缺少支付时间，未计入月度统计。`;
    list.innerHTML = payload.data.length ? payload.data.map(row => `<div class="invite-group">${rowHtml(row)}<div class="children" hidden></div></div>`).join("") : '<p class="portal-empty">' + (query ? "没有找到匹配的邀请用户" : "您还没有直接邀请的用户") + '</p>';
    for (const button of list.querySelectorAll<HTMLButtonElement>(".expand")) button.addEventListener("click", () => {
      const box = button.closest(".invite-group")!.querySelector<HTMLElement>(".children")!;
      box.hidden = !box.hidden; button.setAttribute("aria-expanded", String(!box.hidden));
      button.textContent = box.hidden ? "查看第二层" : "收起第二层";
      if (!box.hidden && !box.childElementCount) void loadChildren(button.dataset.user!, box, 0, version);
    });
    pages.innerHTML = `<span>共 ${payload.total} 人 · 第 ${Math.floor(offset / 20) + 1} / ${Math.max(1, Math.ceil(payload.total / 20))} 页</span><button class="quiet" id="prev" ${offset ? "" : "disabled"}>上一页</button><button class="quiet" id="next" ${offset + 20 >= payload.total ? "disabled" : ""}>下一页</button>`;
    document.querySelector("#prev")!.addEventListener("click", () => { offset -= 20; void load(); });
    document.querySelector("#next")!.addEventListener("click", () => { offset += 20; void load(); });
  } catch (cause) { if (version === generation) { list.textContent = "加载失败"; error.textContent = (cause as Error).message; const retry = document.createElement("button"); retry.className = "quiet"; retry.textContent = "重新加载"; retry.onclick = () => void load(); list.append(retry); } }
}
async function loadChildren(parentId: string, box: HTMLElement, childOffset: number, version: number) {
  box.textContent = "正在加载第二层…";
  try {
    const payload = await api<Referrals>(`/api/portal/referrals?${params({ parent_id: parentId, offset: String(childOffset) })}`);
    if (version !== generation || !box.isConnected) return;
    box.innerHTML = `<h3>第二层用户</h3>${payload.data.map(row => rowHtml(row, true)).join("") || '<p>暂无邀请用户</p>'}<div class="portal-pages"><span>共 ${payload.total} 人</span><button class="quiet child-prev" ${childOffset ? "" : "disabled"}>上一页</button><button class="quiet child-next" ${childOffset + 20 >= payload.total ? "disabled" : ""}>下一页</button></div>`;
    box.querySelector(".child-prev")!.addEventListener("click", () => void loadChildren(parentId, box, childOffset - 20, version));
    box.querySelector(".child-next")!.addEventListener("click", () => void loadChildren(parentId, box, childOffset + 20, version));
  } catch (cause) { if (version === generation && box.isConnected) { box.textContent = (cause as Error).message; const retry = document.createElement("button"); retry.className = "quiet"; retry.textContent = "重试"; retry.onclick = () => void loadChildren(parentId, box, childOffset, version); box.append(retry); } }
}
void api<User>("/api/portal/auth/me").then(value => { user = value; renderDashboard(); }).catch(() => renderLogin());
