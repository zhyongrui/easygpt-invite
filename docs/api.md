# 接口约定

所有请求使用同源路径。Cookie 由服务端设置，前端使用 `credentials: "same-origin"`，无需读取令牌。POST 使用 JSON；生产写请求要求正确 Origin。接口不对公共演示站开放生产数据。

## 登录和退出

| 方法 | 路径 | 请求体 | 成功响应 |
| --- | --- | --- | --- |
| POST | `/api/portal/auth/login` | `{identifier, password}` | `{data: User}` |
| GET | `/api/portal/auth/me` | 无 | `{data: User}` |
| POST | `/api/portal/auth/logout` | `{}` | `{ok: true}` |
| POST | `/api/auth/password-reset/code` | `{email}` | `{sent: true, expires_in_seconds: number}` |
| POST | `/api/auth/password-reset` | `{email, verification_code, new_password}` | `{reset: true}` |

`User` 为 `{id: string, account_display: string}`，account_display 已脱敏。验证码接口成功不代表账号存在，页面使用统一提示；禁止据此枚举邮箱。重置密码至少 8 位，验证码由真实邮件获取。

会话与客户端设备会话独立；退出、到期、改密或账号停用会失效。生产 Cookie 为 HttpOnly、Secure、SameSite=Strict。

## 邀请统计

`GET /api/portal/referrals?month=YYYY-MM&q=关键词&offset=0&parent_id=用户ID`

所有参数可选：

- `month`：省略代表累计；按北京时间支付月份统计。
- `q`：最多 100 字符，匹配两层内的脱敏账号或用户 ID；省略时主列表只展示第一层。
- `offset`：非负整数，每页 20 人。
- `parent_id`：只允许当前用户的第一层受邀用户 ID，用于展开该用户的第二层。

成功响应：

```ts
type User = { id: string; account_display: string };
type Response = { data: {
  inviter: User | null; // null 为自主注册
  summary: Array<{
    depth: number; // 1 或 2
    invitee_count: number;
    paying_invitee_count: number;
    paid_order_count: number;
    paid_amount_cents: number; // 人民币分，非浮点元
  }>;
  data: Array<User & {
    created_at: string; // ISO 时间
    depth: number;
    parent_id: string | null;
    parent_display: string | null;
    paid_order_count: number;
    paid_amount_cents: number;
    child_count: number;
    child_paid_amount_cents: number;
  }>;
  total: number; // 当前列表匹配总数
  undated_paid_order_count: number;
}};
```

summary 始终为两层整体统计，不随搜索、展开父节点或分页变化；月份会影响充值字段。页面不能用本页列表重算全量汇总。

错误结构：`{error: {message: string, type?: string}}`。

| 状态 | 页面处理 |
| --- | --- |
| 400 | 参数或表单无效，显示服务端消息 |
| 401 | 未登录、登录错误或会话失效，回登录页 |
| 403 | 操作来源校验失败 |
| 404 | 无权访问该邀请关系或关系不存在 |
| 429 | 操作过于频繁，提示稍后重试，避免自动循环请求 |
| 5xx / 断网 | 保留可重试入口，不显示虚构统计 |

新增或更改接口需先经后端维护者确认，双方同步文档后再合并依赖该接口的页面。
