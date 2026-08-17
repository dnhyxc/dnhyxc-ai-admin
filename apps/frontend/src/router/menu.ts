import type { LucideIcon } from 'lucide-react';
import {
	BookOpen,
	Bot,
	FileText,
	LayoutDashboard,
	MenuSquare,
	MonitorSmartphone,
	ScrollText,
	Server,
	Shield,
	Users,
} from 'lucide-react';

export interface MenuLeaf {
	path: string;
	label: string;
	icon: LucideIcon;
}

export interface MenuGroup {
	key: string;
	label: string;
	icon: LucideIcon;
	children: MenuLeaf[];
}

export type MenuEntry = (MenuLeaf & { children?: undefined }) | MenuGroup;

export const menuItems: MenuEntry[] = [
	{ path: '/', label: '仪表盘', icon: LayoutDashboard },
	{
		key: 'frontend',
		label: '前台',
		icon: MonitorSmartphone,
		children: [
			{ path: '/ai-users', label: 'AI 用户', icon: Bot },
			{ path: '/ai-ebooks', label: '书籍列表', icon: BookOpen },
			{ path: '/ai-logs', label: 'AI 日志', icon: ScrollText },
		],
	},
	{
		key: 'backend',
		label: '后台',
		icon: Server,
		children: [
			{ path: '/users', label: '管理员', icon: Users },
			{ path: '/roles', label: '角色管理', icon: Shield },
			{ path: '/menus', label: '菜单管理', icon: MenuSquare },
			{ path: '/logs', label: '后台日志', icon: FileText },
		],
	},
];

function flattenLeaves(): MenuLeaf[] {
	const leaves: MenuLeaf[] = [];
	for (const item of menuItems) {
		if ('children' in item && item.children) {
			leaves.push(...item.children);
		} else if ('path' in item) {
			leaves.push(item);
		}
	}
	return leaves;
}

export function resolveMenuLabel(pathname: string) {
	if (pathname === '/') return '仪表盘';
	return (
		flattenLeaves().find((m) => m.path !== '/' && pathname.startsWith(m.path))
			?.label || '仪表盘'
	);
}

export function resolveActiveGroupKey(pathname: string): string | null {
	for (const item of menuItems) {
		if ('children' in item && item.children) {
			if (
				item.children.some((c) => c.path !== '/' && pathname.startsWith(c.path))
			) {
				return item.key;
			}
		}
	}
	return null;
}
