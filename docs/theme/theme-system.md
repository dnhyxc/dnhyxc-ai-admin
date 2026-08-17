# 主题系统实现

## 1. 背景与目标

管理后台需要一套完整的主题系统，支持以下能力：

- **明暗模式切换**：用户可在浅色（light）与深色（dark）主题之间一键切换
- **多套配色预设**：提供靛蓝、霁蓝、暮紫、青石等多种主色调供用户选择
- **持久化存储**：用户选择的主题偏好需持久化到 localStorage，刷新后自动恢复
- **平滑切换体验**：主题切换时通过 CSS 变量驱动，避免闪烁
- **Ant Design 集成**：将主题配置与 Ant Design 的 ConfigProvider 无缝对接

## 2. 改动范围

| 文件 | 职责 |
|------|------|
| `apps/frontend/src/theme/tokens.ts` | 定义颜色预设常量、类型导出，以及为 Ant Design 生成 `ThemeConfig` 的工厂函数 |
| `apps/frontend/src/store/theme.ts` | MobX Store，管理主题模式与配色状态，负责持久化与 DOM 操作 |
| `apps/frontend/src/index.css` | 定义全局 CSS 变量（含 light / dark 两套），供 Tailwind 与业务组件消费 |

## 3. 核心思路

1. **MobX ThemeStore**：使用 `makeAutoObservable` 自动追踪 `mode`（主题模式）与 `preset`（配色预设）两个响应式状态
2. **localStorage 持久化**：`readMode()` / `readPreset()` 在初始化时从 localStorage 读取用户偏好，`setMode()` / `setPreset()` 在变更时写回
3. **CSS 变量驱动**：`index.css` 中通过 `@theme` 块定义浅色变量，通过 `.dark` 选择器覆盖为深色变量
4. **buildThemeConfig**：`tokens.ts` 中的工厂函数根据当前模式与主色调生成 Ant Design `ThemeConfig`，适配算法、Token、组件级配置
5. **applyDom()**：将当前主色调写入 `<html>` 元素的 CSS 自定义属性（`--color-primary`、`--color-ring`），确保 CSS 与 Ant Design 主题同步

## 4. 关键代码

### 4.1 tokens.ts — 颜色预设与 ThemeConfig 构建

> 源码路径：`apps/frontend/src/theme/tokens.ts`

```ts
// 从 antd 类型定义中导入 ThemeConfig 接口，用于约束 buildThemeConfig 的返回值
import type { ThemeConfig } from 'antd';
// 从 antd 运行时导入 theme 对象，用于获取 darkAlgorithm 和 defaultAlgorithm
import { theme } from 'antd';

// 定义主题模式的联合类型，只允许 'light' 或 'dark' 两种值
export type ThemeMode = 'light' | 'dark';

// 与 dnhyxc-ai/apps/admin 对齐：默认采用 indigo 靛蓝作为初始主题色
// 使用 as const 断言确保数组元素的字面量类型不会被 widening 为 string
export const colorPresets = [
	{ key: 'indigo', label: '靛蓝', color: '#6366f1' },  // 预设 1：靛蓝色
	{ key: 'blue', label: '霁蓝', color: '#1677ff' },    // 预设 2：霁蓝色（Ant Design 默认蓝）
	{ key: 'purple', label: '暮紫', color: '#722ed1' }, // 预设 3：暮紫色
	{ key: 'teal', label: '青石', color: '#0f3d3e' },   // 预设 4：青石色
] as const;

// 从 colorPresets 数组中提取所有 key 的联合类型，用于类型安全的预设选择
// 解析结果为 'indigo' | 'blue' | 'purple' | 'teal'
export type ColorPresetKey = (typeof colorPresets)[number]['key'];

// 根据预设 key 获取对应的十六进制颜色值
// 如果 key 未匹配（find 返回 undefined），则回退到第一个预设（indigo）的颜色
export function getPresetColor(key: ColorPresetKey): string {
	return (
		colorPresets.find((p) => p.key === key)?.color ?? colorPresets[0].color
	);
}

// 核心工厂函数：根据主题模式和主色调构建 Ant Design 的 ThemeConfig 对象
export function buildThemeConfig(
	mode: ThemeMode,      // 当前主题模式：'light' 或 'dark'
	primaryColor: string, // 当前选中的主色调（十六进制）
): ThemeConfig {
	// 判断是否为深色模式，用于后续条件分支
	const isDark = mode === 'dark';

	// 返回 Ant Design ThemeConfig 对象
	return {
		// 根据模式选择对应的主题算法：深色用 darkAlgorithm，浅色用 defaultAlgorithm
		// 算法决定了 Ant Design 组件的明暗风格与对比度计算方式
		algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
		// 启用 CSS 变量模式，key 用于生成唯一的 CSS 类名前缀
		cssVar: { key: 'dnhyxc-admin' },
		// 定义全局 Token，控制 Ant Design 组件的基础视觉属性
		token: {
			// 主色：直接使用用户选择的 primaryColor，作为全局 primary 色
			colorPrimary: primaryColor,
			// 信息色：与主色保持一致，简化配色逻辑
			colorInfo: primaryColor,
			// 全局圆角：统一 8px 圆角
			borderRadius: 8,
			// 字体栈：优先使用 Apple 系统字体，确保跨平台一致性
			fontFamily:
				'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
			// 根据模式条件注入深色或浅色专属 Token
			...(isDark
				? {
						// 深色模式：Layout 背景使用深蓝黑色
						colorBgLayout: '#0f172a',
						// 深色模式：容器背景使用稍浅的深蓝色
						colorBgContainer: '#1e293b',
						// 深色模式：边框颜色使用灰蓝色
						colorBorder: '#334155',
					}
				: {
						// 浅色模式：Layout 背景使用浅灰白色
						colorBgLayout: '#f8fafc',
						// 浅色模式：容器背景使用纯白色
						colorBgContainer: '#ffffff',
						// 浅色模式：边框颜色使用浅灰色
						colorBorder: '#e2e8f0',
					}),
		},
		// 组件级 Token 配置：覆盖特定组件的默认样式
		components: {
			// Layout 组件：自定义头部和侧边栏背景
			Layout: {
				// Header 背景：深色用深蓝，浅色用纯白
				headerBg: isDark ? '#1e293b' : '#ffffff',
				// Sider 背景：深色用接近黑色，浅色用深蓝（形成对比）
				siderBg: isDark ? '#020617' : '#1e293b',
			},
			// Card 组件：仅覆盖圆角，设为更大的 12px
			Card: {
				borderRadiusLG: 12,
			},
			// Table 组件：表头背景色跟随模式
			Table: {
				// 深色表头用深灰蓝，浅色表头用极浅灰
				headerBg: isDark ? '#334155' : '#f8fafc',
			},
		},
	};
}
```

### 4.2 theme.ts — ThemeStore 类

> 源码路径：`apps/frontend/src/store/theme.ts`

```ts
// 从 MobX 导入 makeAutoObservable，用于将类的属性和方法自动转为响应式
import { makeAutoObservable } from 'mobx';
// 从 tokens.ts 导入类型工具与颜色查询函数
import {
	type ColorPresetKey,  // 配色预设的 key 联合类型
	getPresetColor,       // 根据 key 获取颜色值的函数
	type ThemeMode,       // 主题模式 'light' | 'dark'
} from '@/theme/tokens';

// localStorage 中存储主题模式的键名
const MODE_KEY = 'themeMode';
// localStorage 中存储配色预设的键名
const PRESET_KEY = 'themePreset';

// 从 localStorage 读取主题模式，带默认值兜底
// 如果存储值不为 'dark'，一律回退为 'light'
function readMode(): ThemeMode {
	const v = localStorage.getItem(MODE_KEY);  // 读取 localStorage 中的模式值
	return v === 'dark' ? 'dark' : 'light';    // 仅当值严格等于 'dark' 时才返回深色
}

// 从 localStorage 读取配色预设，带白名单校验
// 白名单防止非法值注入，非法值回退为 'indigo'
function readPreset(): ColorPresetKey {
	const v = localStorage.getItem(PRESET_KEY);         // 读取 localStorage 中的预设值
	if (v === 'indigo' || v === 'blue' || v === 'purple' || v === 'teal') {
		return v;                                         // 命中白名单则直接返回
	}
	return 'indigo';                                     // 未命中或为空则回退到 indigo
}

// 主题状态管理类：封装主题模式、配色、持久化与 DOM 操作
export class ThemeStore {
	// 响应式属性：当前主题模式，初始化时从 localStorage 读取
	mode: ThemeMode = readMode();
	// 响应式属性：当前配色预设 key，初始化时从 localStorage 读取
	preset: ColorPresetKey = readPreset();

	// 构造函数：初始化响应式系统并将初始主题应用到 DOM
	constructor() {
		makeAutoObservable(this);  // 将 this 上所有属性/方法自动转为 MobX 响应式
		this.applyDom();           // 立即将初始主题状态同步到 DOM
	}

	// 计算属性：根据当前 preset 查出对应的十六进制主色
	get primaryColor() {
		return getPresetColor(this.preset);  // 调用工具函数查表返回颜色
	}

	// 计算属性：便捷的深色模式判断
	get isDark() {
		return this.mode === 'dark';  // 布尔值，表示当前是否为深色模式
	}

	// 设置主题模式并持久化到 localStorage
	setMode(mode: ThemeMode) {
		this.mode = mode;                    // 更新响应式状态
		localStorage.setItem(MODE_KEY, mode); // 持久化到 localStorage
		this.applyDom();                     // 同步到 DOM，让 CSS 立即生效
	}

	// 切换明暗模式：当前为 dark 则切到 light，反之亦然
	toggleMode() {
		this.setMode(this.mode === 'dark' ? 'light' : 'dark');  // 通过 setMode 实现，自动持久化与 DOM 同步
	}

	// 设置配色预设并持久化到 localStorage
	setPreset(preset: ColorPresetKey) {
		this.preset = preset;                      // 更新响应式状态
		localStorage.setItem(PRESET_KEY, preset);   // 持久化到 localStorage
		this.applyDom();                           // 同步主色到 DOM 的 CSS 变量
	}

	// 私有方法：将当前主题状态应用到 DOM 元素
	// 通过修改 <html> 元素的 class、data 属性和内联样式实现
	private applyDom() {
		const root = document.documentElement;       // 获取 <html> 根元素
		// 切换 dark 类名：深色模式添加，浅色模式移除
		// Tailwind 的 dark 变体和 index.css 中的 .dark 选择器均依赖此类
		root.classList.toggle('dark', this.mode === 'dark');
		// 设置 data-theme 属性，方便 CSS 选择器或调试识别当前模式
		root.dataset.theme = this.mode;
		// 将主色写入 CSS 自定义属性 --color-primary
		// 供业务组件通过 var(--color-primary) 消费
		root.style.setProperty('--color-primary', this.primaryColor);
		// 同时更新 --color-ring，确保聚焦环颜色与主色一致
		root.style.setProperty('--color-ring', this.primaryColor);
	}
}
```

### 4.3 index.css — CSS 主题变量（浅色与深色）

> 源码路径：`apps/frontend/src/index.css`

```css
/* 引入 Tailwind CSS 基础样式 */
@import "tailwindcss";
/* 引入 tailwindcss-animate 插件提供的动画工具类 */
@import "tw-animate-css";

/* 自定义 dark 变体：当存在 .dark 类或其子元素时生效 */
/* 这使得 Tailwind 的 dark: 前缀在所有子元素中均能正确匹配 */
@custom-variant dark (&:where(.dark, .dark *));

/* 使用 Tailwind CSS 4 的 @theme 块定义设计令牌（Design Tokens） */
/* 这些变量自动映射到 CSS 自定义属性，供 Tailwind 工具类与业务代码消费 */
@theme {
	/* 页面背景色（浅色模式默认） */
	--color-background: #f8fafc;
	/* 页面前景色（文本颜色，浅色模式下为深蓝黑） */
	--color-foreground: #0f172a;
	/* 卡片组件背景色 */
	--color-card: #ffffff;
	/* 卡片组件前景色（文本） */
	--color-card-foreground: #0f172a;
	/* 弹出层（下拉、气泡等）背景色 */
	--color-popover: #ffffff;
	/* 弹出层前景色 */
	--color-popover-foreground: #0f172a;
	/* 主色调（默认靛蓝），会被 ThemeStore 动态覆盖 */
	--color-primary: #6366f1;
	/* 主色前景色（在主色背景上的文本颜色，白色） */
	--color-primary-foreground: #ffffff;
	/* 次要色，用于次要操作按钮背景 */
	--color-secondary: #f1f5f9;
	/* 次要色前景色 */
	--color-secondary-foreground: #0f172a;
	/* 中性色：用于禁用、次要文本等 */
	--color-muted: #f1f5f9;
	/* 中性色前景色（次要文本颜色） */
	--color-muted-foreground: #64748b;
	/* 强调色：与次要色相同，用于高亮交互 */
	--color-accent: #f1f5f9;
	/* 强调色前景色 */
	--color-accent-foreground: #0f172a;
	/* 危险操作色（红色） */
	--color-destructive: #ef4444;
	/* 危险操作前景色（白色） */
	--color-destructive-foreground: #ffffff;
	/* 边框颜色 */
	--color-border: #e2e8f0;
	/* 输入框边框颜色（与 border 保持一致） */
	--color-input: #e2e8f0;
	/* 聚焦环颜色（默认靛蓝，会被 ThemeStore 动态覆盖） */
	--color-ring: #6366f1;
	/* 侧边栏背景色（深蓝灰色） */
	--color-sidebar: #1e293b;
	/* 侧边栏前景色（白色文字） */
	--color-sidebar-foreground: #f1f5f9;
	/* 侧边栏强调项背景色 */
	--color-sidebar-accent: #334155;
	/* 侧边栏强调项前景色 */
	--color-sidebar-accent-foreground: #ffffff;
	/* 侧边栏边框颜色 */
	--color-sidebar-border: #334155;
	/* 全局圆角变量（0.5rem = 8px） */
	--radius: 0.5rem;
}

/* base 层：在 @theme 之上覆盖全局基础样式 */
@layer base {
	/* 通配选择器：将所有元素的边框颜色绑定到 --color-border 变量 */
	* {
		border-color: var(--color-border);
	}
	/* body 元素：设置背景色、文字色、字体平滑等全局属性 */
	body {
		background-color: var(--color-background);     /* 背景色跟随主题变量 */
		color: var(--color-foreground);               /* 文字色跟随主题变量 */
		font-feature-settings:                        /* 启用连字和上下文替代特性 */
			"rlig" 1,                                 /* rlig: 连字属性 */
			"calt" 1;                                 /* calt: 上下文替代 */
		margin: 0;                                    /* 清除默认外边距 */
		padding: 0;                                   /* 清除默认内边距 */
		-webkit-font-smoothing: antialiased;           /* 字体平滑：抗锯齿 */
	}
	/* html、body、#root 占满全屏，确保 Flex 布局能正确撑满视口 */
	html,
	body,
	#root {
		height: 100%;
		width: 100%;
	}
}

/* 确保根节点和 Ant Design 的 App 组件占满全屏高度，支持 Layout 自适应 */
#root,
#root .ant-app {
	display: flex;
	flex-direction: column;
	min-height: 100%;
	height: 100%;
}

/* 深色模式覆盖：当 <html> 拥有 .dark 类时，以下变量覆盖 @theme 中的默认值 */
/* 这是 CSS 级别的暗色模式实现，与 Tailwind dark: 变体配合使用 */
.dark {
	/* 深色背景：深蓝黑色 */
	--color-background: #0f172a;
	/* 深色前景：浅色文字 */
	--color-foreground: #f8fafc;
	/* 深色卡片背景：稍浅的深蓝 */
	--color-card: #1e293b;
	/* 深色卡片前景：浅色文字 */
	--color-card-foreground: #f8fafc;
	/* 深色弹出层背景 */
	--color-popover: #1e293b;
	/* 深色弹出层前景 */
	--color-popover-foreground: #f8fafc;
	/* 深色次要色：深灰蓝 */
	--color-secondary: #334155;
	/* 深色次要色前景 */
	--color-secondary-foreground: #f8fafc;
	/* 深色中性色：与 secondary 保持一致 */
	--color-muted: #334155;
	/* 深色中性色前景：灰色文字 */
	--color-muted-foreground: #94a3b8;
	/* 深色强调色 */
	--color-accent: #334155;
	/* 深色强调色前景 */
	--color-accent-foreground: #f8fafc;
	/* 深色边框 */
	--color-border: #334155;
	/* 深色输入框边框 */
	--color-input: #334155;
	/* 深色侧边栏背景：接近纯黑 */
	--color-sidebar: #020617;
	/* 深色侧边栏前景 */
	--color-sidebar-foreground: #e2e8f0;
	/* 深色侧边栏强调项背景 */
	--color-sidebar-accent: #1e293b;
	/* 深色侧边栏强调项前景 */
	--color-sidebar-accent-foreground: #ffffff;
	/* 深色侧边栏边框 */
	--color-sidebar-border: #1e293b;
}

/* 登录页网格背景装饰 */
.login-grid {
	/* 使用双层线性渐变绘制网格线 */
	background-image:
		linear-gradient(rgba(99, 102, 241, 0.08) 1px, transparent 1px),   /* 垂直线条（靛蓝色 8% 透明度） */
		linear-gradient(90deg, rgba(99, 102, 241, 0.08) 1px, transparent 1px); /* 水平线条（靛蓝色 8% 透明度） */
	background-size: 28px 28px;  /* 网格间距 28px */
}

/* 深色模式下登录页网格背景 */
html.dark .login-grid {
	/* 深色模式改用半透明白色网格线 */
	background-image:
		linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),   /* 垂直线条（白色 4% 透明度） */
		linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px); /* 水平线条（白色 4% 透明度） */
}
```

## 5. 兼容性与影响

- **Tailwind 兼容**：通过 `@custom-variant dark` 自定义 dark 变体，确保 `dark:` 前缀在所有子元素中生效
- **Ant Design 兼容**：`buildThemeConfig` 返回的 `ThemeConfig` 直接传递给 `<ConfigProvider>`，CSS 变量模式 (`cssVar`) 避免与 Tailwind 变量冲突
- **SSR/首屏闪烁**：建议在 HTML 模板中提前注入 localStorage 读取逻辑，在页面渲染前为 `<html>` 添加 `.dark` 类，避免 FOUC（Flash of Unstyled Content）
- **CSS 变量降级**：所有主题色使用 CSS 自定义属性，不支持 CSS 变量的浏览器（IE 及旧版）无法使用

## 6. 相关源码路径

| 文件 | 说明 |
|------|------|
| `apps/frontend/src/theme/tokens.ts` | 颜色预设定义、类型导出、`buildThemeConfig` 工厂函数 |
| `apps/frontend/src/store/theme.ts` | MobX `ThemeStore` 类，管理模式/配色状态、持久化与 DOM 同步 |
| `apps/frontend/src/index.css` | 全局 CSS 变量（`@theme` 浅色 + `.dark` 深色覆盖） |

---

若与仓库最新源码不一致，以源码为准。