# dnhyxc-admin

与 [dnhyxc-ai](../dnhyxc-ai) 配套的后台管理系统，架构对齐：`pnpm` monorepo + NestJS 后端 + React 前端。

## 架构

```
dnhyxc-admin/
├── apps/
│   ├── backend/     # NestJS API（端口 9113）
│   └── frontend/    # React + Vite 管理台（端口 9003）
├── packages/        # 预留共享包
└── docker-compose.yml
```

### 企业级多数据源

| 连接名 | 库 | 用途 |
|--------|-----|------|
| `default` | `dnhyxc_admin_db` | 后台自身：管理员、角色、菜单、操作日志 |
| `ai` | `dnhyxc_ai_db` | 业务库（只读管理）：AI 产品用户等 |

- 命名连接（非请求级端口切换），连接池 / Keep-Alive / 优雅关闭
- AI 库 `synchronize: false`，避免误改业务表结构
- Redis 可选：未配置时回退内存缓存

### 前端 UI

- **Ant Design 6**：`import { Button } from 'antd'` 命名导入 + CSS-in-JS，按需 tree-shake / 按需注入样式
- **主题**：顶栏可切换浅色/深色，以及青石 / 霁蓝 / 暮紫 / 琥珀品牌色（`ConfigProvider` + Design Token）

## 快速开始

```bash
# 1. 启动 Admin MySQL + Redis + Adminer
docker compose up -d

# 2. 安装依赖
pnpm install

# 3. 配置环境（首次）
cp apps/backend/.env.development.example apps/backend/.env.development
cp apps/frontend/.env.example apps/frontend/.env

# 4. 启动（另开终端）
pnpm server:dev      # http://localhost:9113/api-docs
pnpm dev:frontend    # http://localhost:9003
```

默认无预设管理员账号，请先在登录页「注册」创建；首个注册用户自动成为超级管理员。

> AI 业务库需自行启动 `dnhyxc-ai` 的 `docker compose`（默认 `3090`）。未就绪时后台仍可独立运行，仅「AI 用户」相关接口不可用。

## 脚本

| 命令 | 说明 |
|------|------|
| `pnpm server:dev` | 后端 watch |
| `pnpm dev:frontend` | 前端 Vite |
| `pnpm server:build` / `pnpm build:frontend` | 构建 |
| `pnpm check` | Biome |
