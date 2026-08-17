export type DashboardStats = {
	adminUsers: number;
	roles: number;
	menus: number;
	logs: number;
	aiUsers: number | null;
	aiDb: { connected: boolean; message: string };
	totalUsers: number;
	activeUsersToday: number;
	totalEbooks: number;
	totalChats: number;
	totalRevenue: number;
	newUsersThisWeek: number;
	usersGrowth: { date: string; count: number }[];
	moduleUsage: { name: string; count: number }[];
	membershipDistribution: { name: string; value: number }[];
};
