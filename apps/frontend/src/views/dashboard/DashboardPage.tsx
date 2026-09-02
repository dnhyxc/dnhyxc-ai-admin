import {
	Activity,
	ArrowUpRight,
	BookOpen,
	Database,
	DollarSign,
	MessageSquare,
	Sparkles,
	TrendingUp,
	Users,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router';
import {
	Area,
	AreaChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui';
import { formatNumber } from '@/lib/utils';
import { resolveHomePath } from '@/router/menu';
import { overviewApi } from '@/service';
import { useStore } from '@/store';
import type { DashboardStats } from '@/types/dashboard';

/* ========================================================
 * 以下内容严格对齐 git 原始版本（commit 39aceb6）：
 * - COLORS / chartTooltipProps / emptyStats 一致
 * - statCards[] 6 项（标题 / value / 图标 / 渐变色 / format）完全一致
 * - 4 张系统卡标题（管理员 / 角色 / 菜单 / 后台日志）完全一致
 * - 3 张图表 CardTitle / CardDescription / 空数据"暂无数据" 完全一致
 * - 图表组件类型 / AreaChart 参数 / Pie innerRadius outerRadius paddingAngle /
 *   LineChart 渐变 id 及各关键参数完全一致
 * - 警告条的文案 / amber 配色 / 括号内容完全一致
 *   仅将布局容器、圆角、边框、装饰套用参考图风格 + 顶部中文欢迎
 *   配色全部使用主题语义变量（--color-primary / card / border / secondary）
 *   以跟随 indigo / blue / purple / teal 四种预设 & dark/light 模式。
 * ======================================================== */

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const chartTooltipProps = {
	contentStyle: {
		background: 'var(--color-card)',
		border: '1px solid var(--color-border)',
		borderRadius: '8px',
		color: 'var(--color-foreground)',
	},
	labelStyle: { color: 'var(--color-foreground)' },
	itemStyle: { color: 'var(--color-foreground)' },
};

const emptyStats: DashboardStats = {
	adminUsers: 0,
	roles: 0,
	menus: 0,
	logs: 0,
	aiUsers: null,
	aiDb: { connected: false, message: '' },
	totalUsers: 0,
	activeUsersToday: 0,
	totalEbooks: 0,
	totalChats: 0,
	totalRevenue: 0,
	newUsersThisWeek: 0,
	usersGrowth: [],
	moduleUsage: [],
	membershipDistribution: [],
};

// ─────────────────────────────────────────────────────
// 原始 6 张业务卡（标题/图标/渐变色/value 一字未改）
// ─────────────────────────────────────────────────────
const statCards: {
	title: string;
	value: keyof DashboardStats;
	icon: typeof Users;
	color: string;
	format?: (v: number) => string;
}[] = [
	{
		title: '总用户数',
		value: 'totalUsers',
		icon: Users,
		color: 'from-indigo-500 to-indigo-600',
	},
	{
		title: '今日活跃',
		value: 'activeUsersToday',
		icon: Activity,
		color: 'from-emerald-500 to-emerald-600',
	},
	{
		title: '书籍总数',
		value: 'totalEbooks',
		icon: BookOpen,
		color: 'from-amber-500 to-amber-600',
	},
	{
		title: '对话总数',
		value: 'totalChats',
		icon: MessageSquare,
		color: 'from-purple-500 to-purple-600',
	},
	{
		title: '付费订单',
		value: 'totalRevenue',
		icon: DollarSign,
		format: (v: number) => formatNumber(v),
		color: 'from-rose-500 to-rose-600',
	},
	{
		title: '本周新增',
		value: 'newUsersThisWeek',
		icon: Sparkles,
		color: 'from-cyan-500 to-cyan-600',
	},
];

/* =============================================================
 * 十六进制颜色工具（纯 JS 实现：hex → 明度加减 / α 混合）
 *   - 用于从 themeStore.primaryColor 动态生成
 *     渐变的深浅色，确保与 4 个主题预设统一配色
 * ============================================================= */
function hexToRgb(hex: string): [number, number, number] {
	const c = hex.replace('#', '');
	const n =
		c.length === 3
			? c
					.split('')
					.map((ch) => ch + ch)
					.join('')
			: c;
	const num = Number.parseInt(n, 16);
	return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
function rgbToHex([r, g, b]: [number, number, number]) {
	const h = (x: number) =>
		Math.max(0, Math.min(255, Math.round(x)))
			.toString(16)
			.padStart(2, '0');
	return `#${h(r)}${h(g)}${h(b)}`;
}
function lightenHex(hex: string, amount: number): string {
	// amount: 0~1  0.2 = 亮 20%
	const [r, g, b] = hexToRgb(hex);
	return rgbToHex([
		r + (255 - r) * amount,
		g + (255 - g) * amount,
		b + (255 - b) * amount,
	]);
}
function darkenHex(hex: string, amount: number): string {
	const [r, g, b] = hexToRgb(hex);
	return rgbToHex([r * (1 - amount), g * (1 - amount), b * (1 - amount)]);
}

export const DashboardPage = observer(function DashboardPage() {
	const { authStore, themeStore, noticeStore } = useStore();
	const [stats, setStats] = useState<DashboardStats>(emptyStats);

	// ───────── 原始 useEffect 一字未改 ─────────
	useEffect(() => {
		if (!authStore.isSuperAdmin) {
			return;
		}
		noticeStore.setPageLoading(true);
		overviewApi()
			.then((res) =>
				setStats({ ...emptyStats, ...(res.data as DashboardStats) }),
			)
			.catch(() => {})
			.finally(() => noticeStore.setPageLoading(false));
	}, [authStore.isSuperAdmin]);

	/* 基于 primaryColor 动态生成的"配色家族"，替换硬编码 emerald/indigo 等
	 *   primary          → 当前主题主色（浅主题按钮、脉冲点）
	 *   primaryLight     → 25% 更亮（浅渐变端、装饰条左端）
	 *   primaryLighter   → 50% 更亮（小图标块背景）
	 *   primaryDark      → 25% 更暗（深色折线渐变端）
	 *   primarySoftBg    → 40% 透明度 + #fff 背景色叠合效果（用 rgba 样式注入）
	 */
	const primary = themeStore.primaryColor;
	const primaryLight = useMemo(() => lightenHex(primary, 0.25), [primary]);
	const primaryLighter = useMemo(() => lightenHex(primary, 0.5), [primary]);
	const primaryDark = useMemo(() => darkenHex(primary, 0.25), [primary]);

	// ───────── 原始鉴权 Redirect 一字未改 ─────────
	if (!authStore.isSuperAdmin) {
		return (
			<Navigate
				to={resolveHomePath({
					isSuperAdmin: false,
					roles: authStore.userInfo?.roles,
				})}
				replace
			/>
		);
	}

	return (
		<div className="w-full p-6">
			{/* ───────── 原始 AI 业务库警告条（文案完全一致）───────── */}
			{!stats.aiDb.connected && (
				<div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 mb-4 text-sm text-amber-800">
					AI 业务库未连接（{stats.aiDb.message || '未启用'}
					），下方业务指标可能为空。管理员 / 角色 / 菜单仍可正常统计。
				</div>
			)}

			{/* ───────── 原始 6 张业务卡
			 *  响应式栅格 & 6 项业务卡 statCards[] —— 完全保留
			 *  仅 Card 样式改为语义类（border-border/bg-card），
			 *  ring 使用 card/40（light白 dark深蓝）自动贴合主题
			 */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
				{statCards.map((card) => {
					const Icon = card.icon;
					const rawValue = Number(stats[card.value] ?? 0);
					const displayValue = card.format
						? card.format(rawValue)
						: formatNumber(rawValue);
					return (
						<Card
							key={card.title}
							className="rounded-md border-border bg-card shadow-none transition hover:-translate-y-0.5 hover:shadow-md"
						>
							<CardContent className="p-5">
								<div className="flex items-start justify-between">
									<div>
										<p className="text-sm font-medium text-muted-foreground">
											{card.title}
										</p>
										<p className="mt-2 text-2xl font-bold text-card-foreground">
											{!stats.aiDb.connected && !authStore.isSuperAdmin
												? '—'
												: displayValue}
										</p>
									</div>
									<div
										className={`flex size-10 items-center justify-center rounded-md bg-linear-to-br ${card.color} text-white shadow-sm ring-4`}
										style={
											{
												// 让 ring 半透明，贴合 card 背景色（light 白 / dark 深蓝）
												// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
												'--tw-ring-color':
													'color-mix(in srgb, var(--color-card) 40%, transparent)',
											} as React.CSSProperties
										}
									>
										<Icon size={20} />
									</div>
								</div>
								{/* 原始：TrendingUp + 实时统计 */}
								<div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
									<TrendingUp size={12} style={{ color: primary }} />
									<span>实时统计</span>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* ==============================================================
			 * 第二大区块（12 列 5 / 4 / 3）
			 * 卡片全部改为 border-border bg-card hover:bg-secondary
			 * 所有 MoreHoriz 按钮改为 hover:bg-secondary
			 * ============================================================== */}
			<div className="mt-4 grid items-stretch gap-4 xl:grid-cols-12">
				{/* ───────── 用户增长趋势（原始 AreaChart）───────── */}
				<Card className="col-span-1 flex h-full flex-col rounded-md border-border bg-card shadow-none xl:col-span-5">
					<CardHeader className="shrink-0">
						<CardTitle className="text-base">用户增长趋势</CardTitle>
						<CardDescription>最近 7 天新增 AI 用户数</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-1 flex-col min-h-0 p-6 pt-0">
						<div
							className="h-full min-h-[288px] dashboard-chart-host flex-1"
							tabIndex={-1}
						>
							{stats.usersGrowth.length ? (
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={stats.usersGrowth}>
										<defs>
											<linearGradient
												id="themeGrad"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="0%"
													stopColor={primary}
													stopOpacity={0.45}
												/>
												<stop
													offset="60%"
													stopColor={primary}
													stopOpacity={0.15}
												/>
												<stop
													offset="100%"
													stopColor={primary}
													stopOpacity={0.01}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="var(--color-border)"
											vertical={false}
										/>
										<XAxis
											dataKey="date"
											tick={{
												fontSize: 12,
												fill: 'var(--color-muted-foreground)',
											}}
											axisLine={false}
											tickLine={false}
										/>
										<YAxis
											tick={{
												fontSize: 12,
												fill: 'var(--color-muted-foreground)',
											}}
											axisLine={false}
											tickLine={false}
											width={40}
										/>
										<Tooltip
											{...chartTooltipProps}
											formatter={(value: unknown) => [
												`${value} 人`,
												'新增用户',
											]}
										/>
										<Area
											type="monotone"
											dataKey="count"
											name="新增用户"
											fill="url(#themeGrad)"
											stroke={primary}
											strokeWidth={2}
										/>
									</AreaChart>
								</ResponsiveContainer>
							) : (
								<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
									暂无数据
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* ───────── 会员分布（原始 PieChart）───────── */}
				<Card className="col-span-1 flex h-full flex-col rounded-md border-border bg-card shadow-none xl:col-span-4">
					<CardHeader className="shrink-0">
						<CardTitle className="text-base">会员分布</CardTitle>
						<CardDescription>各等级会员占比</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-1 flex-col min-h-0 p-6 pt-0">
						<div
							className="h-full min-h-[288px] dashboard-chart-host flex-1"
							tabIndex={-1}
						>
							{stats.membershipDistribution.length ? (
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
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
											{stats.membershipDistribution.map((_, index) => (
												<Cell
													key={`cell-${index}`}
													fill={COLORS[index % COLORS.length]}
												/>
											))}
										</Pie>
										<Tooltip {...chartTooltipProps} />
										<Legend />
									</PieChart>
								</ResponsiveContainer>
							) : (
								<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
									暂无数据
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* ───────── 系统概览（原始 4 项系统卡纵向堆叠）
				 *  改为 border-border bg-card；
				 *  内部 4 个小卡：border-border bg-secondary；
				 *  底部装饰条/脉冲点 → 主色 primary（动态 4 主题）
				 */}
				<Card className="col-span-1 flex h-full flex-col rounded-md border-border bg-card shadow-none xl:col-span-3">
					<CardHeader className="shrink-0 pb-3">
						<CardTitle className="text-base">系统概览</CardTitle>
						<CardDescription>管理员 / 角色 / 菜单 / 后台日志</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-1 flex-col min-h-0 p-6 pt-0">
						<div className="grid flex-1 grid-cols-2 gap-3 min-h-0">
							{[
								{ title: '管理员', value: stats.adminUsers },
								{ title: '角色', value: stats.roles },
								{ title: '菜单', value: stats.menus },
								{ title: '后台日志', value: stats.logs },
							].map((item) => (
								<div
									key={item.title}
									className="flex h-full flex-col justify-center rounded-md border border-dashed border-border bg-secondary p-4 transition hover:border-solid hover:shadow-sm"
								>
									<p className="truncate text-xs font-medium text-muted-foreground">
										{item.title}
									</p>
									<p className="mt-2 text-2xl font-extrabold tracking-tight text-card-foreground sm:text-3xl">
										{formatNumber(item.value)}
									</p>
								</div>
							))}
						</div>

						{/* 底部装饰：参考图风格 —— 主色渐变装饰条（符合 4 主题） */}
						<div
							className="shrink-0 mt-4 h-1 w-full rounded-md opacity-90"
							style={{
								backgroundImage: `linear-gradient(90deg, ${primaryLighter}, ${primary})`,
							}}
						/>
						<div className="shrink-0 mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
							<span className="inline-flex items-center gap-1">
								<span
									className="size-1.5 rounded-md animate-pulse"
									style={{ background: primary }}
								/>
								数据实时同步
							</span>
							<ArrowUpRight size={13} />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* ==============================================================
			 * 第三大区块：模块使用统计（原始 LineChart）
			 *  - Card 样式 → border-border bg-card
			 *  - LineChart 硬编码 #6366f1 / #8b5cf6 → 改为
			 *    primaryLight → primary → primaryDark 动态渐变
			 *    （原始的 Area 填充 + Line 双色渐变 结构 完全保留）
			 * ============================================================== */}
			<div className="mt-4 grid items-stretch gap-4 lg:grid-cols-1">
				<Card className="flex h-full flex-col rounded-md border-border bg-card shadow-none">
					<CardHeader className="shrink-0">
						<CardTitle className="flex items-center gap-2 text-base">
							<Database size={16} className="text-primary" />
							模块使用统计
						</CardTitle>
						<CardDescription>
							各功能模块的使用次数（AI 操作日志）
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-1 flex-col min-h-0 p-6 pt-0">
						<div
							className="h-full min-h-[288px] dashboard-chart-host flex-1"
							tabIndex={-1}
						>
							{stats.moduleUsage.length ? (
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={stats.moduleUsage}>
										<defs>
											<linearGradient
												id="moduleGradient"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="0%"
													stopColor={primary}
													stopOpacity={0.4}
												/>
												<stop
													offset="100%"
													stopColor={primary}
													stopOpacity={0}
												/>
											</linearGradient>
											<linearGradient
												id="moduleLineGradient"
												x1="0"
												y1="0"
												x2="1"
												y2="0"
											>
												<stop offset="0%" stopColor={primaryLight} />
												<stop offset="100%" stopColor={primaryDark} />
											</linearGradient>
										</defs>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="var(--color-border)"
										/>
										<XAxis
											dataKey="name"
											tick={{ fontSize: 12 }}
											stroke="var(--color-muted-foreground)"
										/>
										<YAxis
											tick={{ fontSize: 12 }}
											stroke="var(--color-muted-foreground)"
										/>
										<Tooltip cursor={false} {...chartTooltipProps} />
										<Area
											type="monotone"
											dataKey="count"
											fill="url(#moduleGradient)"
											stroke="none"
										/>
										<Line
											type="monotone"
											dataKey="count"
											name="使用次数"
											stroke="url(#moduleLineGradient)"
											strokeWidth={3}
											dot={{
												r: 4,
												fill: primary,
												strokeWidth: 2,
												stroke: themeStore.isDark ? '#1e293b' : '#ffffff',
											}}
											activeDot={{
												r: 6,
												fill: primaryDark,
												strokeWidth: 2,
												stroke: themeStore.isDark ? '#1e293b' : '#ffffff',
											}}
										/>
									</LineChart>
								</ResponsiveContainer>
							) : (
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
});
