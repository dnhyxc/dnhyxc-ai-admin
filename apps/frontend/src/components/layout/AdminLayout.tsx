import {
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	LogOut,
	Moon,
	Palette,
	PanelLeft,
	Sun,
	User as UserIcon,
} from 'lucide-react';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	ScrollArea,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import {
	canAccessPath,
	collectAllowedPaths,
	filterMenuItems,
	menuItems,
	resolveActiveGroupKey,
	resolveMenuLabel,
} from '@/router/menu';
import { useStore } from '@/store';
import { type ColorPresetKey, colorPresets } from '@/theme/tokens';

export const AdminLayout = observer(function AdminLayout() {
	const [collapsed, setCollapsed] = useState(false);
	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
		frontend: true,
		backend: true,
	});
	const location = useLocation();
	const navigate = useNavigate();
	const { authStore, themeStore } = useStore();

	const allowedPaths = collectAllowedPaths(authStore.userInfo?.roles);
	const allowedPathKey = [...allowedPaths].sort().join(',');
	const visibleMenus = filterMenuItems(menuItems, {
		isSuperAdmin: authStore.isSuperAdmin,
		allowedPaths,
	});
	const pageTitle = resolveMenuLabel(location.pathname);
	const activeGroup = resolveActiveGroupKey(location.pathname);

	useEffect(() => {
		if (activeGroup) {
			setOpenGroups((prev) =>
				prev[activeGroup] ? prev : { ...prev, [activeGroup]: true },
			);
		}
	}, [activeGroup]);

	useEffect(() => {
		const paths = new Set(allowedPathKey ? allowedPathKey.split(',') : []);
		if (
			canAccessPath(location.pathname, {
				isSuperAdmin: authStore.isSuperAdmin,
				allowedPaths: paths,
			})
		) {
			return;
		}
		const fallback = [...paths][0] || '/login';
		navigate(fallback, { replace: true });
	}, [location.pathname, authStore.isSuperAdmin, allowedPathKey, navigate]);

	const toggleGroup = (key: string) => {
		setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	return (
		<div className="flex h-screen w-full bg-background">
			<aside
				className={cn(
					'flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300',
					collapsed ? 'w-16' : 'w-64',
				)}
			>
				<div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
					{!collapsed && (
						<div className="flex items-center gap-2">
							<div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
								AI
							</div>
							<span className="font-semibold">Dnhyxc 管理</span>
						</div>
					)}
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setCollapsed(!collapsed)}
						className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
					>
						{collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
					</Button>
				</div>

				<ScrollArea className="flex-1 py-2">
					<nav className="space-y-1 px-2">
						{visibleMenus.map((item) => {
							if ('children' in item && item.children) {
								const GroupIcon = item.icon;
								const opened = !!openGroups[item.key];
								const groupActive = activeGroup === item.key;

								if (collapsed) {
									return (
										<div key={item.key} className="space-y-1">
											{item.children.map((child) => {
												const ChildIcon = child.icon;
												const isActive = location.pathname.startsWith(
													child.path,
												);
												return (
													<button
														key={child.path}
														type="button"
														onClick={() => navigate(child.path)}
														className={cn(
															'flex w-full items-center justify-center rounded-md px-2 py-2 text-sm transition-colors',
															isActive
																? 'bg-sidebar-accent text-sidebar-accent-foreground'
																: 'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
														)}
														title={child.label}
													>
														<ChildIcon size={18} className="shrink-0" />
													</button>
												);
											})}
										</div>
									);
								}

								return (
									<div key={item.key} className="space-y-1">
										<button
											type="button"
											onClick={() => toggleGroup(item.key)}
											className={cn(
												'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
												groupActive
													? 'text-sidebar-accent-foreground'
													: 'text-sidebar-foreground/80',
												'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
											)}
										>
											<GroupIcon size={18} className="shrink-0" />
											<span className="flex-1 text-left font-medium">
												{item.label}
											</span>
											<ChevronDown
												size={14}
												className={cn(
													'shrink-0 transition-transform',
													opened && 'rotate-180',
												)}
											/>
										</button>
										{opened && (
											<div className="ml-3 space-y-1 border-l border-sidebar-border pl-2">
												{item.children.map((child) => {
													const ChildIcon = child.icon;
													const isActive = location.pathname.startsWith(
														child.path,
													);
													return (
														<button
															key={child.path}
															type="button"
															onClick={() => navigate(child.path)}
															className={cn(
																'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
																isActive
																	? 'bg-sidebar-accent text-sidebar-accent-foreground'
																	: 'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
															)}
														>
															<ChildIcon size={16} className="shrink-0" />
															<span>{child.label}</span>
														</button>
													);
												})}
											</div>
										)}
									</div>
								);
							}

							const Icon = item.icon;
							const isActive =
								item.path === '/'
									? location.pathname === '/'
									: location.pathname.startsWith(item.path);
							return (
								<button
									key={item.path}
									type="button"
									onClick={() => navigate(item.path)}
									className={cn(
										'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
										isActive
											? 'bg-sidebar-accent text-sidebar-accent-foreground'
											: 'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
										collapsed && 'justify-center px-2',
									)}
									title={collapsed ? item.label : undefined}
								>
									<Icon size={18} className="shrink-0" />
									{!collapsed && <span>{item.label}</span>}
								</button>
							);
						})}
					</nav>
				</ScrollArea>
			</aside>

			<div className="flex flex-1 flex-col overflow-hidden">
				<header className="flex h-16 items-center justify-between border-b px-6">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setCollapsed(!collapsed)}
							className="md:hidden"
						>
							<PanelLeft size={20} />
						</Button>
						<div>
							<h1 className="text-lg font-semibold">{pageTitle}</h1>
							<p className="text-xs text-muted-foreground">
								欢迎使用 Dnhyxc AI 后台管理系统
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" title="主题色">
									<Palette size={18} />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-44">
								<DropdownMenuLabel>主题色</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{colorPresets.map((p) => (
									<DropdownMenuItem
										key={p.key}
										onClick={() =>
											themeStore.setPreset(p.key as ColorPresetKey)
										}
										className="gap-2"
									>
										<span
											className="inline-block size-3 shrink-0 rounded-full"
											style={{ background: p.color }}
										/>
										<span className="flex-1">{p.label}</span>
										{themeStore.preset === p.key && (
											<Check size={14} className="text-primary" />
										)}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>

						<Button
							variant="ghost"
							size="icon"
							title={themeStore.isDark ? '切换浅色' : '切换深色'}
							onClick={() => themeStore.toggleMode()}
						>
							{themeStore.isDark ? <Sun size={18} /> : <Moon size={18} />}
						</Button>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className="gap-2">
									<div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
										{authStore.userInfo?.username?.[0]?.toUpperCase() || 'U'}
									</div>
									<span className="hidden sm:inline">
										{authStore.userInfo?.username}
									</span>
									<ChevronDown size={16} />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuLabel>
									<div className="font-normal">
										<div className="font-medium">
											{authStore.userInfo?.username}
										</div>
										<div className="text-xs text-muted-foreground">
											{authStore.userInfo?.email}
										</div>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={() => navigate('/profile')}>
									<UserIcon size={16} className="mr-2" />
									个人中心
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => {
										authStore.logout();
										navigate('/login');
									}}
									className="text-destructive"
								>
									<LogOut size={16} className="mr-2" />
									退出登录
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</header>

				<main className="flex-1 overflow-auto p-6">
					<Outlet />
				</main>
			</div>
		</div>
	);
});
