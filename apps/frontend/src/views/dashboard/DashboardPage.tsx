import {
	Activity,
	BookOpen,
	Database,
	DollarSign,
	MessageSquare,
	Sparkles,
	TrendingUp,
	Users,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import {
	Bar,
	BarChart,
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

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const chartTooltipProps = {
	contentStyle: {
		background: 'var(--color-card)',
		border: '1px solid var(--color-border)',
		borderRadius: '8px',
		color: '#fff',
	},
	labelStyle: { color: '#fff' },
	itemStyle: { color: '#fff' },
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

export const DashboardPage = observer(function DashboardPage() {
	const { authStore } = useStore();
	const [stats, setStats] = useState<DashboardStats>(emptyStats);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!authStore.isSuperAdmin) {
			setLoading(false);
			return;
		}
		overviewApi()
			.then((res) =>
				setStats({ ...emptyStats, ...(res.data as DashboardStats) }),
			)
			.catch(() => {})
			.finally(() => setLoading(false));
	}, [authStore.isSuperAdmin]);

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
		<div className="space-y-6">
			{!stats.aiDb.connected && (
				<div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
					AI 业务库未连接（{stats.aiDb.message || '未启用'}
					），下方业务指标可能为空。管理员 / 角色 / 菜单仍可正常统计。
				</div>
			)}

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
				{statCards.map((card) => {
					const Icon = card.icon;
					const rawValue = Number(stats[card.value] ?? 0);
					const displayValue = card.format
						? card.format(rawValue)
						: formatNumber(rawValue);
					return (
						<Card key={card.title} className="border-0 shadow-sm">
							<CardContent className="p-5">
								<div className="flex items-start justify-between">
									<div>
										<p className="text-sm font-medium text-muted-foreground">
											{card.title}
										</p>
										<p className="mt-2 text-2xl font-bold">
											{loading ? '—' : displayValue}
										</p>
									</div>
									<div
										className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.color} text-white shadow-sm`}
									>
										<Icon size={20} />
									</div>
								</div>
								<div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
									<TrendingUp size={12} />
									<span>实时统计</span>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{[
					{ title: '管理员', value: stats.adminUsers },
					{ title: '角色', value: stats.roles },
					{ title: '菜单', value: stats.menus },
					{ title: '后台日志', value: stats.logs },
				].map((item) => (
					<Card key={item.title} className="border-0 shadow-sm">
						<CardContent className="p-4">
							<p className="text-sm text-muted-foreground">{item.title}</p>
							<p className="mt-1 text-xl font-semibold">
								{loading ? '—' : formatNumber(item.value)}
							</p>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card className="border-0 shadow-sm">
					<CardHeader>
						<CardTitle className="text-base">用户增长趋势</CardTitle>
						<CardDescription>最近 7 天新增 AI 用户</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-72">
							{stats.usersGrowth.length ? (
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={stats.usersGrowth}>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke="var(--color-border)"
										/>
										<XAxis
											dataKey="date"
											tick={{ fontSize: 12 }}
											stroke="var(--color-muted-foreground)"
										/>
										<YAxis
											tick={{ fontSize: 12 }}
											stroke="var(--color-muted-foreground)"
										/>
										<Tooltip {...chartTooltipProps} />
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
								<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
									暂无数据
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				<Card className="border-0 shadow-sm">
					<CardHeader>
						<CardTitle className="text-base">会员分布</CardTitle>
						<CardDescription>各等级会员占比</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-72">
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
			</div>

			<div className="grid gap-4 lg:grid-cols-1">
				<Card className="border-0 shadow-sm">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Database size={16} className="text-primary" />
							模块使用统计
						</CardTitle>
						<CardDescription>
							各功能模块的使用次数（AI 操作日志）
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-72">
							{stats.moduleUsage.length ? (
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={stats.moduleUsage}>
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
										<Tooltip {...chartTooltipProps} />
										<Bar dataKey="count" name="使用次数" radius={[6, 6, 0, 0]}>
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
