# EasyGPT 邀请中心

EasyGPT 邀请中心的唯一前端源码仓库。正式页面：https://easygpt.com.cn/invite/

使用已有账号登录，查看邀请人、两层邀请关系，以及累计或按月的充值统计。后端由 EasyGPT 独立维护，不包含在本仓库中。

## 本地开发

需要 Node.js 22.12+（推荐 Node.js 22 LTS）和 pnpm 11.25.0。

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

打开终端显示地址下的 `/invite/`。默认使用本地虚拟接口，不访问生产数据。

- 演示邮箱：`demo@example.com`
- 演示密码：`demo-password`
- 虚拟数据：23 名直接受邀用户、24 名第二层用户，支持分页、搜索、累计和当月统计。
- 历史月份展示零充值；演示环境不发送验证码、不修改密码。
- 重启开发服务器后，演示会话失效。

联调本地后端：复制 `.env.example` 为 `.env.local`，运行 `pnpm run dev:backend`。该模式使用真实本地接口，需后端允许开发页面 Origin。默认开发模式始终使用虚拟接口。

## 提交修改

1. 从最新 `main` 创建 `feature/功能名` 或 `fix/问题名` 分支。
2. 开发页面；接口需求先提 Issue，由后端维护者确认。
3. 运行 `pnpm test` 和 `pnpm run build`，验证桌面和手机页面。
4. 提交 PR，说明问题、改动、验证结果和截图。
5. 由维护者审核、合并并发布。

请先阅读 [开发规则](AGENTS.md)、[接口约定](docs/api.md) 和 [发布说明](docs/release.md)。GitHub Actions 仅做检查，不自动部署。

## 目录

- `src/`：生产页面 TypeScript 和样式。
- `public/assets/`：页面品牌图标。
- `dev/`：开发服务器虚拟接口与验证。
- `docs/`：接口、协作和发布约定。

## 许可

代码使用 MIT 许可证。EasyGPT 名称和标识的商标权不因代码许可而授予；请勿用演示站冒充正式服务。
