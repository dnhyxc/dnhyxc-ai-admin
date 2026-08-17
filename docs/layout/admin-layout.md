# 布局与导航实现

## 1. 背景与目标

管理后台需要一套专业的布局方案，包含可折叠侧边栏、分组菜单导航、顶部用户信息栏与主题控制。实现目标：

- **响应式布局**：侧边栏支持展开 / 折叠两种形态，移动端自动隐藏
- **菜单分组**：支持一级菜单（单页直达）与二级分组菜单（展开 / 收起子项）
- **路由激活态**：基于当前路径高亮对应菜单项与所在分组
- **主题控制**：顶栏提供主题色选择器与明 / 暗模式切换按钮
- **路由守卫**：未登录用户自动跳转至登录页

## 2. 改动范围

| 文件 | 职责 |
|------|------|
| `router/menu.ts` | 菜单数据类型定义、菜单条目声明、辅助函数（扁平化、标签解析、分组定位） |
| `router/index.tsx` | 路由注册、`RequireAuth` 路由守卫、`AdminLayout` 作为根布局的子路由配置 |
| `components/layout/AdminLayout.tsx` | 主布局组件：侧边栏渲染、菜单折叠 / 分组交互、顶栏工具栏、主题与用户下拉菜单 |

## 3. 核心思路

1. **菜单数据驱动**：将菜单项抽象为 `MenuLeaf`（叶子节点）与 `MenuGroup`（分组节点）两种类型，以纯数据数组 `menuItems` 描述导航结构
2. **布局组件渲染**：`AdminLayout` 遍历 `menuItems`，根据类型分别渲染单页按钮或可展开分组
3. **折叠 / 展开状态**：通过 `collapsed` 控制侧边栏宽度（`w-64` ↔ `w-16`），通过 `openGroups` 记录各分组展开状态
4. **下拉菜单组件**：使用 shadcn/ui 的 `DropdownMenu` 实现主题色选择器与用户菜单
5. **路由保护**：`RequireAuth` 组件检查 `authStore.isAuthed`，未认证则重定向到 `/login`

## 4. 关键代码

### 4.1 menu.ts — 菜单定义与辅助函数

> 来源：`apps/frontend/src/router/menu.ts`

```typescript
// 从 lucide-react 导入图标类型，用于菜单条目的 icon 字段
import type { LucideIcon } from 'lucide-react';
// 从 lucide-react 导入所有用到的图标组件
import {
	BookOpen,       // 书籍图标，用于"书籍列表"
	Bot,            // 机器人图标，用于"AI 用户"
	FileText,       // 文件文本图标，用于"后台日志"
	LayoutDashboard, // 仪表盘图标，用于首页
	MenuSquare,     // 菜单图标，用于"菜单管理"
	MonitorSmartphone, // 显示器图标，用于"前台"分组
	ScrollText,     // 滚动文本图标，用于"AI 日志"
	Server,         // 服务器图标，用于"后台"分组
	Shield,         // 盾牌图标，用于"角色管理"
	Users,          // 用户组图标，用于"管理员"
} from 'lucide-react';

// 定义叶子菜单项接口：表示一个可直接跳转的菜单按钮
export interface MenuLeaf {
	path: string;       // 路由路径，如 '/ai-users'
	label: string;      // 显示标签，如 'AI 用户'
	icon: LucideIcon;   // 图标组件类型
}

// 定义分组菜单项接口：表示一个包含子菜单的可展开分组
export interface MenuGroup {
	key: string;            // 分组唯一键，用于展开状态控制
	label: string;          // 分组显示标签，如 '前台'
	icon: LucideIcon;       // 分组图标
	children: MenuLeaf[];   // 分组下的叶子菜单数组
}

// 定义菜单条目联合类型：要么是无分组的叶子（无 children），要么是分组
export type MenuEntry = (MenuLeaf & { children?: undefined }) | MenuGroup;

// 菜单数据数组：声明整个侧边栏的导航结构
export const menuItems: MenuEntry[] = [
	// 首页：单页叶子菜单，直接跳转
	{ path: '/', label: '仪表盘', icon: LayoutDashboard },
	// "前台"分组：包含 3 个子菜单
	{
		key: 'frontend',           // 分组键，用于展开状态管理
		label: '前台',              // 分组显示名
		icon: MonitorSmartphone,   // 分组图标
		children: [                 // 子菜单列表
			{ path: '/ai-users', label: 'AI 用户', icon: Bot },          // AI 用户页面
			{ path: '/ai-ebooks', label: '书籍列表', icon: BookOpen },    // 书籍列表页面
			{ path: '/ai-logs', label: 'AI 日志', icon: ScrollText },    // AI 日志页面
		],
	},
	// "后台"分组：包含 4 个子菜单
	{
		key: 'backend',            // 分组键
		label: '后台',              // 分组显示名
		icon: Server,              // 分组图标
		children: [                // 子菜单列表
			{ path: '/users', label: '管理员', icon: Users },            // 管理员页面
			{ path: '/roles', label: '角色管理', icon: Shield },          // 角色管理页面
			{ path: '/menus', label: '菜单管理', icon: MenuSquare },      // 菜单管理页面
			{ path: '/logs', label: '后台日志', icon: FileText },        // 后台日志页面
		],
	},
];

// 内部辅助函数：将所有菜单项扁平化为叶子数组
function flattenLeaves(): MenuLeaf[] {
	const leaves: MenuLeaf[] = [];  // 初始化叶子数组
	for (const item of menuItems) { // 遍历所有菜单项
		if ('children' in item && item.children) { // 如果是分组且有子项
			leaves.push(...item.children); // 将子项全部展开到叶子数组
		} else if ('path' in item) {    // 如果是无子项的叶子节点
			leaves.push(item);             // 直接加入叶子数组
		}
	}
	return leaves; // 返回扁平化后的叶子数组
}

// 解析当前路径对应的菜单标签（用于顶栏标题显示）
export function resolveMenuLabel(pathname: string) {
	if (pathname === '/') return '仪表盘'; // 根路径直接返回"仪表盘"
	return (
		flattenLeaves() // 先获取所有叶子菜单
			.find((m) => m.path !== '/' && pathname.startsWith(m.path)) // 找到第一个匹配的叶子（排除根路径）
			?.label || '仪表盘' // 取其 label，找不到则回退为"仪表盘"
	);
}

// 解析当前路径所属的分组 key（用于自动展开对应分组）
export function resolveActiveGroupKey(pathname: string): string | null {
	for (const item of menuItems) { // 遍历所有菜单项
		if ('children' in item && item.children) { // 只处理有子项的分组
			if (
				item.children.some((c) => c.path !== '/' && pathname.startsWith(c.path)) // 子项中存在匹配当前路径的项
			) {
				return item.key; // 返回该分组的 key
			}
		}
	}
	return null; // 不属于任何分组则返回 null
}
```

### 4.2 router/index.tsx — 路由配置

> 来源：`apps/frontend/src/router/index.tsx`

```typescript
// 从 react-router 导入浏览器路由创建函数与导航组件
import { createBrowserRouter, Navigate } from 'react-router';
// 导入布局组件，作为受保护路由的外壳
import { AdminLayout } from '@/components/layout/AdminLayout';
// 导入全局状态 store，用于路由守卫中的认证检查
import { store } from '@/store';
// 导入各业务页面组件
import { AiEbooksPage } from '@/views/ai-ebooks/AiEbooksPage'; // AI 书籍页面
import { AiLogsPage } from '@/views/ai-logs/AiLogsPage';       // AI 日志页面
import { AiUsersPage } from '@/views/ai-users/AiUsersPage';    // AI 用户页面
import { DashboardPage } from '@/views/dashboard/DashboardPage'; // 仪表盘页面
import { LoginPage } from '@/views/login/LoginPage';           // 登录页面
import { LogsPage } from '@/views/logs/LogsPage';              // 后台日志页面
import { MenusPage } from '@/views/menus/MenusPage';           // 菜单管理页面
import { RolesPage } from '@/views/roles/RolesPage';           // 角色管理页面
import { UsersPage } from '@/views/users/UsersPage';           // 管理员页面

// 路由守卫组件：检查用户是否已认证
function RequireAuth({ children }: { children: React.ReactNode }) {
	if (!store.authStore.isAuthed) { // 如果用户未认证
		return <Navigate to="/login" replace />; // 重定向到登录页，replace 替换当前历史记录
	}
	return children; // 已认证则渲染子组件
}

// 创建浏览器路由实例，定义路由表
export const router = createBrowserRouter([
	// 登录路由：无需认证，独立布局
	{
		path: '/login',           // 路径为 /login
		element: <LoginPage />,   // 渲染登录页面
	},
	// 主应用路由：受保护，使用 AdminLayout 布局
	{
		path: '/',                // 根路径
		element: (                // 元素为包裹了认证守卫的 AdminLayout
			<RequireAuth>         // 路由守卫：未登录则重定向
				<AdminLayout />   // 主布局组件
			</RequireAuth>
		),
		children: [               // 子路由：AdminLayout 内的 <Outlet /> 将渲染匹配的子组件
			{ index: true, element: <DashboardPage /> },             // 默认子路由：仪表盘
			{ path: 'users', element: <UsersPage /> },               // 管理员管理
			{ path: 'roles', element: <RolesPage /> },               // 角色管理
			{ path: 'menus', element: <MenusPage /> },               // 菜单管理
			{ path: 'ai-users', element: <AiUsersPage /> },          // AI 用户
			{ path: 'ai-ebooks', element: <AiEbooksPage /> },        // AI 书籍
			{ path: 'ai-logs', element: <AiLogsPage /> },            // AI 日志
			{ path: 'logs', element: <LogsPage /> },                 // 后台日志
		],
	},
	// 通配路由：匹配所有未定义路径，重定向到根路径
	{ path: '*', element: <Navigate to="/" replace /> },
]);
```

### 4.3 AdminLayout.tsx — 主布局组件

> 来源：`apps/frontend/src/components/layout/AdminLayout.tsx`

```typescript
// 从 lucide-react 导入顶栏所需的图标组件
import {
	Check,        // 勾选图标，用于主题色选中态
	ChevronDown,  // 向下箭头，用于分组展开指示
	ChevronLeft,  // 向左箭头，用于折叠按钮
	ChevronRight, // 向右箭头，用于展开按钮
	LogOut,       // 登出图标
	Moon,         // 月亮图标，表示深色模式
	Palette,      // 调色板图标，用于主题色按钮
	PanelLeft,    // 左侧面板图标，用于移动端侧边栏切换
	Sun,          // 太阳图标，表示浅色模式
	User as UserIcon, // 用户图标，用于个人信息菜单项
} from 'lucide-react';
// 从 mobx-react 导入 observer 装饰器，使组件响应 MobX observable 变化
import { observer } from 'mobx-react';
// 从 React 导入 hooks
import { useEffect, useState } from 'react';
// 从 react-router 导入路由相关 hooks
import { Outlet, useLocation, useNavigate } from 'react-router';
// 从 shadcn/ui 导入 UI 组件
import {
	Button,              // 按钮组件
	DropdownMenu,        // 下拉菜单根组件
	DropdownMenuContent, // 下拉菜单内容容器
	DropdownMenuItem,    // 下拉菜单项
	DropdownMenuLabel,   // 下拉菜单标签
	DropdownMenuSeparator, // 下拉菜单分隔线
	DropdownMenuTrigger, // 下拉菜单触发器
	ScrollArea,          // 可滚动区域组件
} from '@/components/ui';
// 导入 className 合并工具函数
import { cn } from '@/lib/utils';
// 导入菜单相关的工具函数与数据
import {
	menuItems,              // 菜单数据数组
	resolveActiveGroupKey,  // 解析当前路径所属分组
	resolveMenuLabel,       // 解析当前路径的菜单标签
} from '@/router/menu';
// 导入全局状态 hook
import { useStore } from '@/store';
// 导入主题色预设相关类型与数据
import { type ColorPresetKey, colorPresets } from '@/theme/tokens';

// 导出 AdminLayout 组件，使用 observer 包装以响应 MobX 状态变化
export const AdminLayout = observer(function AdminLayout() {
	// 侧边栏折叠状态：默认为展开
	const [collapsed, setCollapsed] = useState(false);
	// 各分组展开状态：前台与后台默认展开
	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
		frontend: true,  // "前台"分组默认展开
		backend: true,   // "后台"分组默认展开
	});
	// 获取当前路由位置信息
	const location = useLocation();
	// 获取导航函数
	const navigate = useNavigate();
	// 从全局 store 中获取认证与主题状态
	const { authStore, themeStore } = useStore();

	// 根据当前路径解析页面标题
	const pageTitle = resolveMenuLabel(location.pathname);
	// 根据当前路径解析激活的分组 key
	const activeGroup = resolveActiveGroupKey(location.pathname);

	// 当 activeGroup 变化时，自动展开对应分组
	useEffect(() => {
		if (activeGroup) { // 如果存在激活的分组
			setOpenGroups((prev) => // 更新分组展开状态
				prev[activeGroup] ? prev : { ...prev, [activeGroup]: true }, // 若未展开则展开
			);
		}
	}, [activeGroup]); // 依赖 activeGroup 变化

	// 切换分组展开 / 折叠状态
	const toggleGroup = (key: string) => {
		setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] })); // 翻转指定分组的状态
	};

	// 渲染主布局
	return (
		// 根容器：全屏 flex 布局，背景色使用 CSS 变量
		<div className="flex h-screen w-full bg-background">
			{/* 侧边栏 */}
			<aside
				// 侧边栏容器：根据 collapsed 状态切换宽度，带过渡动画
				className={cn(
					'flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300', // 基础样式
					collapsed ? 'w-16' : 'w-64', // 折叠时 4 单位宽，展开时 16 单位宽
				)}
			>
				{/* 侧边栏顶部：Logo + 折叠按钮 */}
				<div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
					{/* 展开时显示 Logo 区域 */}
					{!collapsed && (
						<div className="flex items-center gap-2">
							{/* Logo 方块 */}
							<div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
								AI {/* Logo 文字 */}
							</div>
							{/* 系统名称 */}
							<span className="font-semibold">Dnhyxc 管理</span>
						</div>
					)}
					{/* 折叠 / 展开切换按钮 */}
					<Button
						variant="ghost" // 幽灵按钮样式
						size="icon"     // 图标按钮尺寸
						onClick={() => setCollapsed(!collapsed)} // 点击切换折叠状态
						className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
					>
						{collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />} {/* 根据状态显示不同箭头 */}
					</Button>
				</div>

				{/* 菜单可滚动区域 */}
				<ScrollArea className="flex-1 py-2">
					{/* 菜单导航容器 */}
					<nav className="space-y-1 px-2">
						{/* 遍历菜单数据 */}
						{menuItems.map((item) => {
							// 分支一：分组菜单（含 children）
							if ('children' in item && item.children) {
								const GroupIcon = item.icon; // 获取分组图标组件
								const opened = !!openGroups[item.key]; // 当前分组是否展开
								const groupActive = activeGroup === item.key; // 当前分组是否激活

								// 折叠态：仅显示子项图标按钮
								if (collapsed) {
									return (
										<div key={item.key} className="space-y-1">
											{item.children.map((child) => { // 遍历子项
												const ChildIcon = child.icon; // 获取子项图标
												const isActive = location.pathname.startsWith(child.path); // 判断子项是否激活
												return (
													<button
														key={child.path} // 使用路径作为唯一 key
														type="button"
														onClick={() => navigate(child.path)} // 点击导航到子项路径
														className={cn(
															'flex w-full items-center justify-center rounded-md px-2 py-2 text-sm transition-colors',
															isActive
																? 'bg-sidebar-accent text-sidebar-accent-foreground' // 激活态样式
																: 'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground', // 非激活态悬停样式
														)}
														title={child.label} // 折叠态显示 tooltip
													>
														<ChildIcon size={18} className="shrink-0" /> {/* 子项图标 */}
													</button>
												);
											})}
										</div>
									);
								}

								// 展开态：显示分组标题 + 可展开子项
								return (
									<div key={item.key} className="space-y-1">
										{/* 分组标题按钮 */}
										<button
											type="button"
											onClick={() => toggleGroup(item.key)} // 点击切换分组展开状态
											className={cn(
												'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
												groupActive
													? 'text-sidebar-accent-foreground' // 激活分组文字高亮
													: 'text-sidebar-foreground/80', // 非激活分组文字半透明
												'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
											)}
										>
											<GroupIcon size={18} className="shrink-0" /> {/* 分组图标 */}
											<span className="flex-1 text-left font-medium">{item.label}</span> {/* 分组标签 */}
											{/* 展开指示箭头，根据展开状态旋转 */}
											<ChevronDown
												size={14}
												className={cn(
													'shrink-0 transition-transform',
													opened && 'rotate-180', // 展开时箭头向下翻转 180 度
												)}
											/>
										</button>
										{/* 展开时显示子项列表 */}
										{opened && (
											<div className="ml-3 space-y-1 border-l border-sidebar-border pl-2"> {/* 左侧缩进 + 分隔线 */}
												{item.children.map((child) => { // 遍历子项
													const ChildIcon = child.icon; // 获取子项图标
													const isActive = location.pathname.startsWith(child.path); // 判断是否激活
													return (
														<button
															key={child.path} // 路径作为唯一 key
															type="button"
															onClick={() => navigate(child.path)} // 点击导航
															className={cn(
																'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
																isActive
																	? 'bg-sidebar-accent text-sidebar-accent-foreground' // 激活态：背景高亮
																	: 'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground', // 非激活态：悬停高亮
															)}
														>
															<ChildIcon size={16} className="shrink-0" /> {/* 子项图标 */}
															<span>{child.label}</span> {/* 子项标签 */}
														</button>
													);
												})}
											</div>
										)}
									</div>
								);
							}

							// 分支二：单页叶子菜单（无 children）
							const Icon = item.icon; // 获取菜单图标
							// 判断当前菜单项是否激活
							const isActive =
								item.path === '/'
									? location.pathname === '/' // 首页精确匹配
									: location.pathname.startsWith(item.path); // 其他路径前缀匹配
							return (
								<button
									key={item.path} // 路径作为唯一 key
									type="button"
									onClick={() => navigate(item.path)} // 点击导航
									className={cn(
										'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
										isActive
											? 'bg-sidebar-accent text-sidebar-accent-foreground' // 激活态样式
											: 'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground', // 非激活态悬停
										collapsed && 'justify-center px-2', // 折叠态居中对齐
									)}
									title={collapsed ? item.label : undefined} // 折叠态显示 tooltip
								>
									<Icon size={18} className="shrink-0" /> {/* 菜单图标 */}
									{!collapsed && <span>{item.label}</span>} {/* 展开态显示标签文字 */}
								</button>
							);
						})}
					</nav>
				</ScrollArea>
			</aside>

			{/* 右侧主体区域 */}
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* 顶部导航栏 */}
				<header className="flex h-16 items-center justify-between border-b px-6">
					{/* 左侧：折叠按钮 + 页面标题 */}
					<div className="flex items-center gap-4">
						{/* 移动端侧边栏切换按钮 */}
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setCollapsed(!collapsed)} // 点击切换侧边栏折叠
							className="md:hidden" // 仅在移动端显示
						>
							<PanelLeft size={20} /> {/* 面板图标 */}
						</Button>
						{/* 页面标题与副标题 */}
						<div>
							<h1 className="text-lg font-semibold">{pageTitle}</h1> {/* 动态页面标题 */}
							<p className="text-xs text-muted-foreground">欢迎使用 Dnhyxc AI 后台管理系统</p> {/* 固定副标题 */}
						</div>
					</div>

					{/* 右侧：主题与用户控制 */}
					<div className="flex items-center gap-2">
						{/* 主题色选择下拉菜单 */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" title="主题色">
									<Palette size={18} /> {/* 调色板图标 */}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-44">
								<DropdownMenuLabel>主题色</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{/* 遍历主题色预设列表 */}
								{colorPresets.map((p) => (
									<DropdownMenuItem
										key={p.key} // 预设 key 作为唯一标识
										onClick={() => themeStore.setPreset(p.key as ColorPresetKey)} // 点击应用该主题色
										className="gap-2"
									>
										<span
											className="inline-block size-3 shrink-0 rounded-full" // 颜色圆点
											style={{ background: p.color }} // 内联样式设置圆点颜色
										/>
										<span className="flex-1">{p.label}</span> {/* 预设名称 */}
										{/* 当前选中的预设显示勾选图标 */}
										{themeStore.preset === p.key && (
											<Check size={14} className="text-primary" />
										)}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>

						{/* 明/暗模式切换按钮 */}
						<Button
							variant="ghost"
							size="icon"
							title={themeStore.isDark ? '切换浅色' : '切换深色'} // 根据当前模式显示不同提示
							onClick={() => themeStore.toggleMode()} // 点击切换模式
						>
							{themeStore.isDark ? <Sun size={18} /> : <Moon size={18} />} {/* 深色显示太阳，浅色显示月亮 */}
						</Button>

						{/* 用户菜单下拉 */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className="gap-2">
									{/* 用户头像：取用户名首字母大写 */}
									<div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
										{authStore.userInfo?.username?.[0]?.toUpperCase() || 'U'}
									</div>
									{/* 用户名：sm 以上尺寸显示 */}
									<span className="hidden sm:inline">
										{authStore.userInfo?.username}
									</span>
									<ChevronDown size={16} /> {/* 下拉箭头 */}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								{/* 用户信息标签 */}
								<DropdownMenuLabel>
									<div className="font-normal">
										<div className="font-medium">{authStore.userInfo?.username}</div> {/* 用户名 */}
										<div className="text-xs text-muted-foreground">{authStore.userInfo?.email}</div> {/* 邮箱 */}
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{/* 个人信息菜单项（占位，禁用态） */}
								<DropdownMenuItem disabled>
									<UserIcon size={16} className="mr-2" />
									个人信息
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								{/* 退出登录菜单项 */}
								<DropdownMenuItem
									onClick={() => {
										authStore.logout(); // 调用登出方法
										navigate('/login'); // 跳转到登录页
									}}
									className="text-destructive" // 红色文字提示危险操作
								>
									<LogOut size={16} className="mr-2" />
									退出登录
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</header>

				{/* 主体内容区域：渲染匹配的子路由页面 */}
				<main className="flex-1 overflow-auto p-6">
					<Outlet /> {/* React Router 出口，渲染当前匹配的子路由组件 */}
				</main>
			</div>
		</div>
	);
});
```

## 5. 兼容性与影响

- **对现有功能的影响**：`AdminLayout` 是所有受保护页面（仪表盘、用户管理等）的外壳，布局变更会影响所有后台页面的视觉与交互
- **菜单数据驱动**：新增页面只需在 `menu.ts` 的 `menuItems` 中添加条目，并在 `router/index.tsx` 的 `children` 中注册路由即可，无需修改布局逻辑
- **折叠态兼容性**：折叠状态下仍可访问所有菜单项，通过图标 + tooltip 方式保证可用性
- **路由守卫**：`RequireAuth` 依赖 `store.authStore.isAuthed`，若认证状态未正确初始化，会导致所有页面被拦截
- **主题系统**：主题色与明暗模式切换依赖 `themeStore` 的正确实现，切换后所有使用 `bg-sidebar`、`text-primary` 等 CSS 变量的元素会自动更新

## 6. 相关源码路径

| 文件 | 路径 |
|------|------|
| 菜单定义 | `apps/frontend/src/router/menu.ts` |
| 路由配置 | `apps/frontend/src/router/index.tsx` |
| 布局组件 | `apps/frontend/src/components/layout/AdminLayout.tsx` |
| 主题色预设 | `apps/frontend/src/theme/tokens.ts` |
| 全局 Store | `apps/frontend/src/store/index.ts` |
| UI 组件库 | `apps/frontend/src/components/ui/` |
| 工具函数 | `apps/frontend/src/lib/utils.ts` |

---

若与仓库最新源码不一致，以源码为准。