# UI 组件库

本功能域包含前端 UI 组件库相关的实现文档。

## 文档列表

- [UI 组件库实现](./ui-components.md) — 基于 Radix UI 的组件封装、设计系统
- [表格顶部圆角去除](./表格顶部圆角去除.md) — 历史方案：全局取消 antd Table 顶部圆角（CSS `:where()` 覆盖 + AntD Table token 双保险），保留底部圆角以贴合 Tabs/筛选条的一体化视觉
- [Loading 组件](./Loading%20组件.md) — 基于 framer-motion 的三层反向圆环+光点呼吸+文字波浪动画，与主题色（--color-primary）自动联动
- [表格圆角样式调整](./表格圆角样式调整.md) — 最新视觉：全局 Table 统一 8px 对称圆角（wrapper+overflow hidden 裁切）、分页区底部圆角、单元格级圆角归零
