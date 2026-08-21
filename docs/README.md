# Dnhyxc AI Admin 开发文档

## 按功能域

| 功能域 | 说明 | 相关专题 |
|--------|------|----------|
| [auth](./auth/) | 认证与账号（邮件验证码、修改密码、首用户自动升超管、角色菜单编辑） | [邮箱验证码与修改密码](./auth/邮箱验证码与修改密码.md)、[角色菜单分配编辑](./auth/角色菜单分配编辑.md) |
| [ai-db](./ai-db/) | AI 业务库集成（双库架构、连接管理） | [AI 业务库集成实现](./ai-db/ai-db-integration.md) |
| [ai-user](./ai-user/) | AI 用户管理（只读管理 AI 业务库用户、后台账号绑定前台账号、前台账号换绑、用户名回显） | [AI 用户管理实现](./ai-user/ai-user-management.md)、[前台账号绑定](./ai-user/前台账号绑定.md)、[前台账号换绑](./ai-user/前台账号换绑.md) |
| [ai-ebook](./ai-ebook/) | AI 电子书管理（只读管理 AI 业务库书籍、按账号隔离） | [AI 电子书管理实现](./ai-ebook/ai-ebook-management.md)、[书籍按账号隔离](./ai-ebook/书籍按账号隔离.md) |
| [knowledge](./knowledge/) | AI 知识库管理（知识库主表 + 回收站表双表只读管理、软删事务、权限隔离） | [知识库管理模块](./knowledge/知识库管理模块.md) |
| [ai-learning-note](./ai-learning-note/) | AI 学习笔记（只读管理英语学习笔记、按账号隔离、富文本预览） | [学习笔记管理](./ai-learning-note/学习笔记管理.md) |
| [ai-logs](./ai-logs/) | AI 日志管理（查看和删除 AI 业务库操作日志） | [AI 日志管理实现](./ai-logs/ai-logs-management.md) |
| [dashboard](./dashboard/) | 仪表盘（集成双库数据的可视化统计，仅超管可见） | [仪表盘实现](./dashboard/dashboard-overview.md)、[仪表盘访问策略调整](./dashboard/仪表盘访问策略调整.md) |
| [ui](./ui/) | UI 组件库（基于 Radix UI 的基础组件封装、全局表格样式、Loading 动画、全角表格圆角） | [UI 组件库实现](./ui/ui-components.md)、[表格顶部圆角去除](./ui/表格顶部圆角去除.md)、[Loading 组件](./ui/Loading%20组件.md)、[表格圆角样式调整](./ui/表格圆角样式调整.md) |
| [layout](./layout/) | 布局与导航（AdminLayout、菜单、路由、权限过滤、全局通知、页面加载遮罩、侧栏命名风格） | [布局与导航实现](./layout/admin-layout.md)、[角色菜单与权限过滤](./layout/角色菜单与权限过滤.md)、[菜单项标签重命名](./layout/菜单项标签重命名.md)、[全局通知与加载遮罩](./layout/全局通知与加载遮罩.md) |
| [theme](./theme/) | 主题系统（深色/浅色模式、主题色切换） | [主题系统实现](./theme/theme-system.md) |

## 快速导航

- [产品文档（面向使用方）](#产品文档面向使用方)
- [功能模块索引](#按功能域)
- [常见问题排查](#)

## 产品文档（面向使用方）

| 文档 | 说明 |
|------|------|
| [项目更新公告](./project-update-info.md) | 版本更新摘要（个人中心换绑、角色菜单分配、全局 Alert/Loading、表格 8px 圆角等），含使用影响面与常见问题 |
| [项目使用指南](./project-guide.md) | 面向管理员与普通用户的端到端操作手册（换绑步骤、菜单分配步骤、403 与 Loading 遮罩说明等） |

---

若与仓库最新源码不一致，以源码为准。
