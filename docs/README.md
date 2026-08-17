# Dnhyxc AI Admin 开发文档

## 按功能域

| 功能域 | 说明 | 相关专题 |
|--------|------|----------|
| [auth](./auth/) | 认证与账号（邮件验证码、修改密码、首用户自动升超管） | [邮箱验证码与修改密码](./auth/邮箱验证码与修改密码.md) |
| [ai-db](./ai-db/) | AI 业务库集成（双库架构、连接管理） | [AI 业务库集成实现](./ai-db/ai-db-integration.md) |
| [ai-user](./ai-user/) | AI 用户管理（只读管理 AI 业务库用户、后台账号绑定前台账号） | [AI 用户管理实现](./ai-user/ai-user-management.md)、[前台账号绑定](./ai-user/前台账号绑定.md) |
| [ai-ebook](./ai-ebook/) | AI 电子书管理（只读管理 AI 业务库书籍、按账号隔离） | [AI 电子书管理实现](./ai-ebook/ai-ebook-management.md)、[书籍按账号隔离](./ai-ebook/书籍按账号隔离.md) |
| [ai-logs](./ai-logs/) | AI 日志管理（查看和删除 AI 业务库操作日志） | [AI 日志管理实现](./ai-logs/ai-logs-management.md) |
| [dashboard](./dashboard/) | 仪表盘（集成双库数据的可视化统计，仅超管可见） | [仪表盘实现](./dashboard/dashboard-overview.md)、[仪表盘访问策略调整](./dashboard/仪表盘访问策略调整.md) |
| [ui](./ui/) | UI 组件库（基于 Radix UI 的基础组件封装） | [UI 组件库实现](./ui/ui-components.md) |
| [layout](./layout/) | 布局与导航（AdminLayout、菜单、路由、权限过滤） | [布局与导航实现](./layout/admin-layout.md)、[角色菜单与权限过滤](./layout/角色菜单与权限过滤.md) |
| [theme](./theme/) | 主题系统（深色/浅色模式、主题色切换） | [主题系统实现](./theme/theme-system.md) |

## 快速导航

- [项目概述与架构](#)
- [功能模块索引](#)
- [常见问题排查](#)

---

若与仓库最新源码不一致，以源码为准。
