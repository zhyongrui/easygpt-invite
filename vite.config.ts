import { defineConfig, loadEnv } from "vite";
import { mockMiddleware } from "./dev/mock.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "PORTAL_");
  const target = env.PORTAL_DEV_GATEWAY_URL || "http://127.0.0.1:8787";
  const url = new URL(target);
  if (mode === "backend" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("联调代理仅允许本地网关；请使用本地或经授权的测试环境隧道。");
  }
  return {
    base: "/invite/",
    plugins: mode === "backend" ? [] : [{
      name: "local-demo-api",
      configureServer(server) { server.middlewares.use(mockMiddleware()); },
    }],
    server: mode === "backend" ? { proxy: { "/api/": target } } : {},
    build: { target: "es2022" },
  };
});
