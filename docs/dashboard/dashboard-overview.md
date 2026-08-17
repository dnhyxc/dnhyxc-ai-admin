# 仪表盘实现

## 1. 背景与目标

Admin 仪表盘需要展示**双数据源**的统计信息：既涵盖后台管理系统本身的数据（管理员、角色、菜单、日志），也要汇总 AI 业务数据库的核心指标（用户、书籍、对话、营收等）。

**目标：**
- 展示后台系统统计：管理员数、角色数、菜单数、后台日志数
- 展示 AI 业务统计：总用户数、今日活跃、书籍总数、对话总数、付费订单、本周新增
- 展示可视化图表：用户增长趋势（折线图）、会员分布（饼图）、模块使用统计（柱状图）
- AI 数据库不可用时优雅降级，仅展示后台系统数据

## 2. 改动范围

| 文件路径 | 职责 |
|---------|------|
| `apps/backend/src/services/dashboard/dashboard.service.ts` | 仪表盘核心服务，聚合双数据源 |
| `apps/backend/src/services/dashboard/dashboard.controller.ts` | 仪表盘路由控制器，暴露 `/dashboard/overview` 接口 |
| `apps/backend/src/services/ai-user/ai-user.service.ts` | AI 用户服务，包含 `getDashboardStats()` 原始 SQL 查询 |
| `apps/frontend/src/views/dashboard/DashboardPage.tsx` | 仪表盘前端页面，使用 Recharts 渲染图表 |
| `apps/frontend/src/types/dashboard.ts` | 仪表盘数据类型定义 |

## 3. 核心思路

- **双数据源聚合**：`DashboardService` 同时注入 `UserService`（后台库）和 `AiUserService`（AI 库），通过 `Promise.all` 并行查询
- **优雅降级**：`AiUserService` 使用 `@Optional()` 装饰器注入，当 AI 数据库未启用时（模块未注册），`aiUserService` 为 `undefined`，代码自动跳过 AI 数据查询
- **健康检查**：调用 `aiUserService.getHealth()` 检测 AI 数据库连接状态，前端根据状态显示告警条
- **原始 SQL 聚合**：复杂统计（增长趋势、会员分布、模块使用）直接使用 `DataSource.query()` 执行原生 SQL，避免 TypeORM ORM 层在聚合查询中的性能损耗
- **前端可视化**：使用 Recharts 库的 `LineChart`、`PieChart`、`BarChart` 组件渲染图表
- **状态指示**：前端根据 `aiDb.connected` 状态显示 AI 数据库告警横幅

## 4. 关键代码

### 4.1 DashboardService.getOverview()

> 来源：`apps/backend/src/services/dashboard/dashboard.service.ts`

```typescript
// 从 NestJS 核心引入 Injectable（服务装饰器）和 Optional（可选依赖装饰器）
import { Injectable, Optional } from '@nestjs/common';
// 引入 AI 用户服务，用于查询 AI 业务数据库的用户统计
import { AiUserService } from '../ai-user/ai-user.service';
// 引入日志服务，用于查询后台管理系统的日志数量
import { LogsService } from '../logs/logs.service';
// 引入菜单服务，用于查询后台管理系统的菜单数量
import { MenusService } from '../menus/menus.service';
// 引入角色服务，用于查询后台管理系统的角色数量
import { RolesService } from '../roles/roles.service';
// 引入后台用户服务，用于查询后台管理员数量
import { UserService } from '../user/user.service';

// 将 DashboardService 声明为可注入的服务类
@Injectable()
export class DashboardService {
	// 构造函数注入各依赖服务
	constructor(
		// 后台用户服务（必需），用于统计管理员数量
		private readonly userService: UserService,
		// 角色服务（必需），用于统计系统角色数量
		private readonly rolesService: RolesService,
		// 菜单服务（必需），用于统计系统菜单数量
		private readonly menusService: MenusService,
		// 日志服务（必需），用于统计后台操作日志数量
		private readonly logsService: LogsService,
		// AI 用户服务（可选），使用 @Optional() 标记，AI 数据库未启用时为 undefined
		@Optional() private readonly aiUserService?: AiUserService,
	) {}

	// 获取仪表盘概览数据的主方法
	async getOverview() {
		// 并行查询后台管理系统的四项基础统计（管理员数、角色数、菜单数、日志数）
		const [adminUsers, roles, menus, logs] = await Promise.all([
			// 调用用户服务的 count 方法统计后台管理员数量
			this.userService.count(),
			// 调用角色服务的 count 方法统计系统角色数量
			this.rolesService.count(),
			// 调用菜单服务的 count 方法统计系统菜单数量
			this.menusService.count(),
			// 调用日志服务的 count 方法统计后台日志数量
			this.logsService.count(),
		]);

		// 初始化 AI 用户数量为 null，表示 AI 数据库未连接时无数据
		let aiUsers: number | null = null;
		// 初始化 AI 数据库连接状态，默认未连接
		let aiDb = { connected: false, message: '未启用' };
		// 定义 AI 数据为空时的默认值对象，用于降级展示
		const emptyAiStats = {
			// AI 总用户数默认为 0
			totalUsers: 0,
			// 今日活跃用户数默认为 0
			activeUsersToday: 0,
			// 电子书总数默认为 0
			totalEbooks: 0,
			// 对话总数默认为 0
			totalChats: 0,
			// 付费订单总数默认为 0
			totalRevenue: 0,
			// 本周新增用户数默认为 0
			newUsersThisWeek: 0,
			// 用户增长趋势默认为空数组
			usersGrowth: [] as { date: string; count: number }[],
			// 模块使用统计默认为空数组
			moduleUsage: [] as { name: string; count: number }[],
			// 会员分布默认为空数组
			membershipDistribution: [] as { name: string; value: number }[],
		};

		// 将 AI 统计数据初始化为空数据，后续根据连接状态更新
		let aiStats = emptyAiStats;
		// 检查 AI 用户服务是否存在（@Optional 注入可能为 undefined）
		if (this.aiUserService) {
			// 调用 AI 服务的健康检查方法，获取数据库连接状态
			aiDb = await this.aiUserService.getHealth();
			// 如果 AI 数据库连接正常
			if (aiDb.connected) {
				// 使用 try-catch 包裹，防止单个统计失败影响整体
				try {
					// 统计 AI 数据库的总用户数
					aiUsers = await this.aiUserService.count();
					// 使用总用户数作为参数，获取仪表盘详细统计数据（增长趋势、会员分布等）
					aiStats = await this.aiUserService.getDashboardStats(aiUsers);
				} catch {
					// 发生异常时，将 AI 用户数重置为 null
					aiUsers = null;
					// 将 AI 统计数据回退到空数据
					aiStats = emptyAiStats;
				}
			}
		}

		// 返回聚合后的完整仪表盘数据
		return {
			// 后台管理员数量
			adminUsers,
			// 后台角色数量
			roles,
			// 后台菜单数量
			menus,
			// 后台日志数量
			logs,
			// AI 用户总数（可能为 null）
			aiUsers,
			// AI 数据库连接状态信息
			aiDb,
			// 展开 AI 统计数据（totalUsers、activeUsersToday 等字段合并到顶层）
			...aiStats,
		};
	}
}
```

### 4.2 AiUserService.getDashboardStats()

> 来源：`apps/backend/src/services/ai-user/ai-user.service.ts`（第 72–174 行）

```typescript
/** 仪表盘业务指标（读 AI 库） */
// 异步获取仪表盘统计数据，参数 totalUsers 为已查询到的 AI 总用户数
async getDashboardStats(totalUsers: number) {
	// 调用 assertReady 方法确保 AI 数据源已初始化，否则抛出异常
	this.assertReady();
	// 将 AI 数据源赋值给局部变量 ds，简化后续查询代码
	const ds = this.aiDataSource;
	// 定义一个通用的标量查询辅助函数，用于执行返回单个数值的 SQL 查询
	const scalar = async (sql: string) => {
		// 使用 try-catch 处理查询异常
		try {
			// 执行 SQL 查询，获取结果行
			const rows = await ds.query(sql);
			// 从结果中提取数值：优先取 c 别名字段，其次取 count 别名字段，最后默认为 0
			const v = rows?.[0]?.c ?? rows?.[0]?.count ?? 0;
			// 将提取的值转换为数字类型并返回
			return Number(v) || 0;
		} catch {
			// 查询异常时返回 0，保证降级安全
			return 0;
		}
	};

	// 并行执行所有统计查询，提升性能
	const [
		// 今日活跃用户数（独立访客数）
		activeUsersToday,
		// 电子书总数
		totalEbooks,
		// 对话会话总数
		totalChats,
		// 付费订单总数
		totalRevenue,
		// 本周新增用户数
		newUsersThisWeek,
		// 最近 7 天每日新增用户数（增长趋势）
		growthRows,
		// 会员分布统计
		memberRows,
		// 模块使用统计
		moduleRows,
	] = await Promise.all([
		// 查询今日活跃用户：统计今天有日志记录的不同用户数
		scalar(
			`SELECT COUNT(DISTINCT userId) AS c FROM logs
         WHERE userId IS NOT NULL AND createTime >= CURDATE()`,
		),
		// 与书籍列表一致：只统计主书，排除读者副本（source_book_id 为 NULL）
		scalar(
			'SELECT COUNT(*) AS c FROM ebook_book WHERE source_book_id IS NULL',
		),
		// 查询对话总数：统计 chat_sessions 表的总行数
		scalar('SELECT COUNT(*) AS c FROM chat_sessions'),
		// 查询付费订单总数：统计 membership_payment_grant 表的总行数
		scalar('SELECT COUNT(*) AS c FROM membership_payment_grant'),
		// 查询本周新增用户：最近 7 天内创建的用户数量
		scalar(
			`SELECT COUNT(*) AS c FROM user
         WHERE createTime >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
		),
		// 查询最近 7 天每日新增用户数，按日期分组用于增长趋势折线图
		ds
			.query(
				`SELECT DATE_FORMAT(createTime, '%m-%d') AS date, COUNT(*) AS count
           FROM user
           WHERE createTime >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
           GROUP BY DATE(createTime)
           ORDER BY DATE(createTime)`,
			)
			// 查询失败时返回空数组，保证前端正常渲染
			.catch(() => []),
		// 查询会员分布：按会员类型分组统计，用于饼图展示
		ds
			.query(
				`SELECT
             CASE
               WHEN isMember = 1 AND membershipType IS NOT NULL AND membershipType != ''
                 THEN membershipType
               WHEN isMember = 1 THEN '会员'
               ELSE '免费用户'
             END AS name,
             COUNT(*) AS value
           FROM user
           GROUP BY name
           ORDER BY value DESC`,
			)
			// 查询失败时返回空数组
			.catch(() => []),
		// 查询模块使用统计：按 API 路径归类到各业务模块，用于柱状图
		ds
			.query(
				`SELECT
             CASE
               WHEN path LIKE '/api/ebook%' THEN '电子书'
               WHEN path LIKE '/api/chat%' OR path LIKE '/api/assistant%'
                 OR path LIKE '/api/agent%' THEN '对话'
               WHEN path LIKE '/api/knowledge%' THEN '知识库'
               WHEN path LIKE '/api/english%' THEN '英语学习'
               WHEN path LIKE '/api/auth%' THEN '认证'
               ELSE '其他'
             END AS name,
             COUNT(*) AS count
           FROM logs
           GROUP BY name
           ORDER BY count DESC
           LIMIT 8`,
			)
			// 查询失败时返回空数组
			.catch(() => []),
	]);

	// 组装并返回完整的仪表盘统计数据
	return {
		// AI 总用户数（由调用方传入）
		totalUsers,
		// 今日活跃用户数
		activeUsersToday,
		// 电子书总数
		totalEbooks,
		// 对话会话总数
		totalChats,
		// 付费订单总数
		totalRevenue,
		// 本周新增用户数
		newUsersThisWeek,
		// 用户增长趋势：将查询结果映射为 { date, count } 数组
		usersGrowth: (growthRows as any[]).map((r) => ({
			// 日期字符串（如 "08-17"）
			date: String(r.date),
			// 当日新增用户数
			count: Number(r.count) || 0,
		})),
		// 会员分布：将查询结果映射为 { name, value } 数组
		membershipDistribution: (memberRows as any[]).map((r) => ({
			// 会员类型名称（如"免费用户"、"会员"等）
			name: String(r.name),
			// 该类型会员人数
			value: Number(r.value) || 0,
		})),
		// 模块使用统计：将查询结果映射为 { name, count } 数组
		moduleUsage: (moduleRows as any[]).map((r) => ({
			// 模块名称（如"电子书"、"对话"等）
			name: String(r.name),
			// 该模块调用次数
			count: Number(r.count) || 0,
		})),
	};
}
```

### 4.3 DashboardStats 类型定义

> 来源：`apps/frontend/src/types/dashboard.ts`

```typescript
// 定义仪表盘统计数据的 TypeScript 类型
export type DashboardStats = {
	// 后台管理员数量
	adminUsers: number;
	// 后台角色数量
	roles: number;
	// 后台菜单数量
	menus: number;
	// 后台日志数量
	logs: number;
	// AI 用户总数（可能为 null，表示未连接 AI 数据库）
	aiUsers: number | null;
	// AI 数据库连接状态与消息
	aiDb: { connected: boolean; message: string };
	// AI 业务总用户数
	totalUsers: number;
	// 今日活跃 AI 用户数
	activeUsersToday: number;
	// 电子书总数
	totalEbooks: number;
	// AI 对话会话总数
	totalChats: number;
	// 付费订单总数
	totalRevenue: number;
	// 本周新增 AI 用户数
	newUsersThisWeek: number;
	// 最近 7 天用户增长趋势，每项包含日期和新增数
	usersGrowth: { date: string; count: number }[];
	// 模块使用统计，每项包含模块名和使用次数
	moduleUsage: { name: string; count: number }[];
	// 会员分布统计，每项包含会员类型和对应人数
	membershipDistribution: { name: string; value: number }[];
};
```

### 4.4 DashboardPage 前端组件

> 来源：`apps/frontend/src/views/dashboard/DashboardPage.tsx`

```tsx
// 从 lucide-react 引入图标组件，用于统计卡片和装饰
import {
	Activity,      // 活跃度图标（今日活跃）
	BookOpen,      // 书本图标（书籍总数）
	Database,      // 数据库图标（模块使用统计标题）
	DollarSign,    // 美元图标（付费订单）
	MessageSquare, // 消息图标（对话总数）
	Sparkles,      // 闪光图标（本周新增）
	TrendingUp,    // 上升趋势图标（实时统计标签）
	Users,         // 用户图标（总用户数）
} from 'lucide-react';
// 引入 React 的 useEffect（副作用钩子）和 useState（状态钩子）
import { useEffect, useState } from 'react';
// 从 recharts 引入图表组件
import {
	Bar,              // 柱状图的柱子组件
	BarChart,         // 柱状图主组件
	CartesianGrid,    // 笛卡儿坐标网格线
	Cell,             // 饼图/柱状图的单个单元格（用于设置不同颜色）
	Legend,           // 图例组件
	Line,             // 折线图的线条组件
	LineChart,        // 折线图主组件
	Pie,              // 饼图的扇形组件
	PieChart,         // 饼图主组件
	ResponsiveContainer, // 响应式容器，使图表自适应父容器尺寸
	Tooltip,          // 悬浮提示框组件
	XAxis,            // X 轴组件
	YAxis,            // Y 轴组件
} from 'recharts';
// 引入通用 UI 组件（卡片组件）
import {
	Card,           // 卡片容器组件
	CardContent,    // 卡片内容区域
	CardDescription, // 卡片描述文本
	CardHeader,     // 卡片头部区域
	CardTitle,      // 卡片标题
} from '@/components/ui';
// 引入数字格式化工具函数
import { formatNumber } from '@/lib/utils';
// 引入仪表盘 API 接口调用函数
import { overviewApi } from '@/service';
// 引入仪表盘统计数据类型
import type { DashboardStats } from '@/types/dashboard';

// 定义饼图和柱状图的颜色调色板
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

// 定义图表 Tooltip 的自定义样式配置
const chartTooltipProps = {
	// Tooltip 内容区域样式
	contentStyle: {
		// 背景色使用 CSS 变量
		background: 'var(--color-card)',
		// 边框样式
		border: '1px solid var(--color-border)',
		// 圆角
		borderRadius: '8px',
		// 文字颜色
		color: '#fff',
	},
	// Tooltip 标签文字样式
	labelStyle: { color: '#fff' },
	// Tooltip 条目文字样式
	itemStyle: { color: '#fff' },
};

// 定义空数据状态下的默认统计值
const emptyStats: DashboardStats = {
	// 后台管理员默认 0
	adminUsers: 0,
	// 角色默认 0
	roles: 0,
	// 菜单默认 0
	menus: 0,
	// 日志默认 0
	logs: 0,
	// AI 用户默认 null
	aiUsers: null,
	// AI 数据库默认未连接
	aiDb: { connected: false, message: '' },
	// AI 业务总用户默认 0
	totalUsers: 0,
	// 今日活跃默认 0
	activeUsersToday: 0,
	// 书籍总数默认 0
	totalEbooks: 0,
	// 对话总数默认 0
	totalChats: 0,
	// 付费订单默认 0
	totalRevenue: 0,
	// 本周新增默认 0
	newUsersThisWeek: 0,
	// 用户增长趋势默认空数组
	usersGrowth: [],
	// 模块使用统计默认空数组
	moduleUsage: [],
	// 会员分布默认空数组
	membershipDistribution: [],
};

// 定义业务统计卡片的配置数组
const statCards: {
	// 卡片标题文字
	title: string;
	// 对应 DashboardStats 中的字段 key
	value: keyof DashboardStats;
	// 图标组件类型
	icon: typeof Users;
	// 渐变色 CSS 类名
	color: string;
	// 可选的数值格式化函数
	format?: (v: number) => string;
}[] = [
	// 第一个卡片：总用户数
	{
		title: '总用户数',
		value: 'totalUsers',
		icon: Users,
		color: 'from-indigo-500 to-indigo-600',
	},
	// 第二个卡片：今日活跃
	{
		title: '今日活跃',
		value: 'activeUsersToday',
		icon: Activity,
		color: 'from-emerald-500 to-emerald-600',
	},
	// 第三个卡片：书籍总数
	{
		title: '书籍总数',
		value: 'totalEbooks',
		icon: BookOpen,
		color: 'from-amber-500 to-amber-600',
	},
	// 第四个卡片：对话总数
	{
		title: '对话总数',
		value: 'totalChats',
		icon: MessageSquare,
		color: 'from-purple-500 to-purple-600',
	},
	// 第五个卡片：付费订单
	{
		title: '付费订单',
		value: 'totalRevenue',
		// 使用 formatNumber 格式化金额显示
		format: (v: number) => formatNumber(v),
		icon: DollarSign,
		color: 'from-rose-500 to-rose-600',
	},
	// 第六个卡片：本周新增
	{
		title: '本周新增',
		value: 'newUsersThisWeek',
		icon: Sparkles,
		color: 'from-cyan-500 to-cyan-600',
	},
];

// 仪表盘页面主组件（函数式组件）
export function DashboardPage() {
	// 定义统计数据状态，初始值为空数据
	const [stats, setStats] = useState<DashboardStats>(emptyStats);
	// 定义加载状态，初始为加载中
	const [loading, setLoading] = useState(true);

	// 组件挂载时（依赖数组为空）执行副作用，请求仪表盘数据
	useEffect(() => {
		// 调用仪表盘概览 API
		overviewApi()
			// 请求成功：将返回数据与空数据合并，更新统计状态
			.then((res) =>
				setStats({ ...emptyStats, ...(res.data as DashboardStats) }),
			)
			// 请求失败：静默处理（空函数）
			.catch(() => {})
			// 无论成功失败，最终关闭加载状态
			.finally(() => setLoading(false));
	}, []);

	// 返回页面 JSX
	return (
		// 根容器：垂直排列，各区域间距 6
		<div className="space-y-6">
			// AI 数据库未连接时显示告警横幅
			{!stats.aiDb.connected && (
				// 告警条：琥珀色警告样式
				<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
					// 告警文字：显示 AI 数据库连接状态信息
					AI 业务库未连接（{stats.aiDb.message || '未启用'}
					// 补充说明
					），下方业务指标可能为空。管理员 / 角色 / 菜单仍可正常统计。
				</div>
			)}

			// 业务统计卡片网格：响应式布局（2/3/6 列）
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
				// 遍历统计卡片配置数组，渲染每个卡片
				{statCards.map((card) => {
					// 获取卡片对应的图标组件
					const Icon = card.icon;
					// 从统计数据中提取原始数值
					const rawValue = Number(stats[card.value] ?? 0);
					// 根据是否有自定义格式化函数决定显示值
					const displayValue = card.format
						? card.format(rawValue)
						: formatNumber(rawValue);
					// 返回单个卡片组件
					return (
						// 卡片容器：无边框，阴影样式，key 为卡片标题
						<Card key={card.title} className="border-0 shadow-sm">
							// 卡片内容区域
							<CardContent className="p-5">
								// 顶部区域：标题和图标左右分布
								<div className="flex items-start justify-between">
									// 左侧文本区域
									<div>
										// 卡片标题（如"总用户数"）
										<p className="text-sm font-medium text-muted-foreground">
											{card.title}
										</p>
										// 统计数值：加载中显示占位符，否则显示格式化后的数值
										<p className="mt-2 text-2xl font-bold">
											{loading ? '—' : displayValue}
										</p>
									</div>
									// 右侧图标区域：渐变背景圆角方块
									<div
										className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.color} text-white shadow-sm`}
									>
										// 渲染图标组件，尺寸为 20px
										<Icon size={20} />
									</div>
								</div>
								// 底部：实时统计标签
								<div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
									// 趋势图标
									<TrendingUp size={12} />
									// "实时统计"文字
									<span>实时统计</span>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			// 后台管理系统统计卡片网格：4 列布局
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				// 遍历后台系统统计项渲染卡片
				{[
					{ title: '管理员', value: stats.adminUsers },
					{ title: '角色', value: stats.roles },
					{ title: '菜单', value: stats.menus },
					{ title: '后台日志', value: stats.logs },
				].map((item) => (
					// 卡片组件
					<Card key={item.title} className="border-0 shadow-sm">
						// 卡片内容
						<CardContent className="p-4">
							// 卡片标题
							<p className="text-sm text-muted-foreground">{item.title}</p>
							// 统计数值
							<p className="mt-1 text-xl font-semibold">
								{loading ? '—' : formatNumber(item.value)}
							</p>
						</CardContent>
					</Card>
				))}
			</div>

			// 图表区域：两列布局（用户增长趋势 + 会员分布）
			<div className="grid gap-4 lg:grid-cols-2">
				// 用户增长趋势折线图卡片
				<Card className="border-0 shadow-sm">
					// 卡片头部
					<CardHeader>
						// 卡片标题
						<CardTitle className="text-base">用户增长趋势</CardTitle>
						// 卡片描述
						<CardDescription>最近 7 天新增 AI 用户</CardDescription>
					</CardHeader>
					// 卡片内容
					<CardContent>
						// 图表容器：固定高度 72
						<div className="h-72">
							// 有数据时渲染折线图，无数据时显示"暂无数据"
							{stats.usersGrowth.length ? (
								// 响应式容器：宽度 100%，高度 100%
								<ResponsiveContainer width="100%" height="100%">
									// 折线图组件，数据为用户增长趋势数组
									<LineChart data={stats.usersGrowth}>
										// 网格线：虚线样式
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="var(--color-border)"
										/>
										// X 轴：数据字段为 date
										<XAxis
											dataKey="date"
											tick={{ fontSize: 12 }}
											stroke="var(--color-muted-foreground)"
										/>
										// Y 轴：无数据字段（自动计数）
										<YAxis
											tick={{ fontSize: 12 }}
											stroke="var(--color-muted-foreground)"
										/>
										// 自定义样式的 Tooltip
										<Tooltip {...chartTooltipProps} />
										// 折线：平滑曲线，数据字段为 count
										<Line
											type="monotone"
											dataKey="count"
											name="新增用户"
											stroke="#6366f1"
											strokeWidth={2.5}
											dot={{ r: 4, fill: '#6366f1' }}
											activeDot={{ r: 6 }}
										/>
									</LineChart>
								</ResponsiveContainer>
							) : (
								// 无数据提示
								<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
									暂无数据
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				// 会员分布饼图卡片
				<Card className="border-0 shadow-sm">
					// 卡片头部
					<CardHeader>
						// 卡片标题
						<CardTitle className="text-base">会员分布</CardTitle>
						// 卡片描述
						<CardDescription>各等级会员占比</CardDescription>
					</CardHeader>
					// 卡片内容
					<CardContent>
						// 图表容器：固定高度 72
						<div className="h-72">
							// 有数据时渲染饼图，无数据时显示"暂无数据"
							{stats.membershipDistribution.length ? (
								// 响应式容器
								<ResponsiveContainer width="100%" height="100%">
									// 饼图组件
									<PieChart>
										// 饼图：环形（innerRadius=60, outerRadius=90）
										<Pie
											data={stats.membershipDistribution}
											cx="50%"
											cy="50%"
											innerRadius={60}
											outerRadius={90}
											paddingAngle={2}
											dataKey="value"
											nameKey="name"
										>
											// 为每个饼块分配颜色
											{stats.membershipDistribution.map((_, index) => (
												<Cell
													key={`cell-${index}`}
													fill={COLORS[index % COLORS.length]}
												/>
											))}
										</Pie>
										// 自定义 Tooltip
										<Tooltip {...chartTooltipProps} />
										// 图例
										<Legend />
									</PieChart>
								</ResponsiveContainer>
							) : (
								// 无数据提示
								<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
									暂无数据
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			// 模块使用统计柱状图卡片：全宽布局
			<div className="grid gap-4 lg:grid-cols-1">
				// 柱状图卡片
				<Card className="border-0 shadow-sm">
					// 卡片头部
					<CardHeader>
						// 卡片标题：带数据库图标
						<CardTitle className="flex items-center gap-2 text-base">
							<Database size={16} className="text-primary" />
							模块使用统计
						</CardTitle>
						// 卡片描述
						<CardDescription>
							各功能模块的使用次数（AI 操作日志）
						</CardDescription>
					</CardHeader>
					// 卡片内容
					<CardContent>
						// 图表容器
						<div className="h-72">
							// 有数据时渲染柱状图
							{stats.moduleUsage.length ? (
								// 响应式容器
								<ResponsiveContainer width="100%" height="100%">
									// 柱状图组件
									<BarChart data={stats.moduleUsage}>
										// 网格线
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="var(--color-border)"
										/>
										// X 轴：模块名称
										<XAxis
											dataKey="name"
											tick={{ fontSize: 12 }}
											stroke="var(--color-muted-foreground)"
										/>
										// Y 轴：使用次数
										<YAxis
											tick={{ fontSize: 12 }}
											stroke="var(--color-muted-foreground)"
										/>
										// 自定义 Tooltip
										<Tooltip {...chartTooltipProps} />
										// 柱状图柱体：圆角顶部
										<Bar dataKey="count" name="使用次数" radius={[6, 6, 0, 0]}>
											// 为每个柱子分配颜色
											{stats.moduleUsage.map((_, index) => (
												<Cell
													key={`bar-${index}`}
													fill={COLORS[index % COLORS.length]}
												/>
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							) : (
								// 无数据提示
								<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
									暂无数据
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
```

## 5. 兼容性与影响

### 5.1 依赖关系

- `DashboardService` 依赖 `UserService`、`RolesService`、`MenusService`、`LogsService`（后台库）和 `AiUserService`（AI 库）
- `AiUserService` 通过 `@InjectDataSource(DB_CONNECTIONS.AI)` 注入 AI 数据源，需要 AI 数据库连接配置正确
- 前端依赖 `recharts`（图表库）和 `lucide-react`（图标库）

### 5.2 降级策略

- AI 数据库未连接时，`DashboardService.getOverview()` 中的 `aiUserService` 为 `undefined`（`@Optional()`），自动跳过 AI 统计查询
- AI 数据库已连接但查询异常时，`try-catch` 捕获错误，返回空数据
- 前端根据 `aiDb.connected` 状态显示告警横幅，提示管理员 AI 数据可能不可用
- 图表组件在数据为空时显示"暂无数据"占位文字

### 5.3 性能考虑

- 所有统计查询使用 `Promise.all` 并行执行，减少响应延迟
- 使用原始 SQL 查询聚合数据，避免 ORM 层的性能开销
- 原始 SQL 查询都有 `.catch(() => [])` 或 `try-catch` 保护，单个查询失败不影响整体返回
- 前端在组件挂载时一次性请求所有数据，后续通过 React 状态管理实现响应式更新

## 6. 相关源码路径

| 文件 | 路径 |
|------|------|
| DashboardService | `apps/backend/src/services/dashboard/dashboard.service.ts` |
| DashboardController | `apps/backend/src/services/dashboard/dashboard.controller.ts` |
| AiUserService | `apps/backend/src/services/ai-user/ai-user.service.ts` |
| DashboardPage | `apps/frontend/src/views/dashboard/DashboardPage.tsx` |
| DashboardStats 类型 | `apps/frontend/src/types/dashboard.ts` |
| AI 数据库常量 | `apps/backend/src/database/constants.ts` |

---

若与仓库最新源码不一致，以源码为准。