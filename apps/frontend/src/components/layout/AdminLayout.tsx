import {
	DashboardOutlined,
	RobotOutlined,
	LogoutOutlined,
	MenuOutlined,
	MoonOutlined,
	SunOutlined,
	TeamOutlined,
	UnorderedListOutlined,
	SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Layout, Menu, Space, Typography, theme } from 'antd';
import { observer } from 'mobx-react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useStore } from '@/store';
import { colorPresets, type ColorPresetKey } from '@/theme/tokens';

const { Header, Sider, Content } = Layout;

const navItems = [
	{ key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
	{ key: '/users', icon: <TeamOutlined />, label: '管理员' },
	{ key: '/roles', icon: <SafetyCertificateOutlined />, label: '角色管理' },
	{ key: '/menus', icon: <MenuOutlined />, label: '菜单管理' },
	{ key: '/ai-users', icon: <RobotOutlined />, label: 'AI 用户' },
	{ key: '/logs', icon: <UnorderedListOutlined />, label: '操作日志' },
];

export const AdminLayout = observer(function AdminLayout() {
	const { authStore, themeStore } = useStore();
	const navigate = useNavigate();
	const location = useLocation();
	const { token } = theme.useToken();

	const selectedKey =
		navItems.find(
			(i) =>
				i.key !== '/' && location.pathname.startsWith(i.key),
		)?.key || '/';

	return (
		<Layout className="admin-layout" style={{ minHeight: '100vh' }}>
			<Sider
				breakpoint="lg"
				collapsedWidth={64}
				width={220}
				style={{ minHeight: '100vh' }}
			>
				<div style={{ padding: '20px 16px 12px' }}>
					<Typography.Title
						level={3}
						style={{
							color: '#e7dfd0',
							margin: 0,
							fontFamily: 'Instrument Serif, Georgia, serif',
							fontWeight: 400,
						}}
					>
						dnhyxc
					</Typography.Title>
					<Typography.Text style={{ color: 'rgba(231,223,208,0.55)', fontSize: 12 }}>
						Admin Console
					</Typography.Text>
				</div>
				<Menu
					theme="dark"
					mode="inline"
					selectedKeys={[selectedKey]}
					items={navItems}
					onClick={({ key }) => navigate(key)}
					style={{ borderInlineEnd: 0 }}
				/>
			</Sider>
			<Layout style={{ minHeight: '100vh' }}>
				<Header
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						paddingInline: 24,
						borderBottom: `1px solid ${token.colorBorderSecondary}`,
						background: token.colorBgContainer,
					}}
				>
					<Typography.Text type="secondary">
						dnhyxc-ai 配套后台
					</Typography.Text>
					<Space>
						<Dropdown
							menu={{
								items: colorPresets.map((p) => ({
									key: p.key,
									label: (
										<Space>
											<span
												style={{
													width: 12,
													height: 12,
													borderRadius: 999,
													background: p.color,
													display: 'inline-block',
												}}
											/>
											{p.label}
										</Space>
									),
								})),
								selectedKeys: [themeStore.preset],
								onClick: ({ key }) =>
									themeStore.setPreset(key as ColorPresetKey),
							}}
						>
							<Button size="small">主题色</Button>
						</Dropdown>
						<Button
							size="small"
							icon={
								themeStore.isDark ? <SunOutlined /> : <MoonOutlined />
							}
							onClick={() => themeStore.toggleMode()}
						>
							{themeStore.isDark ? '浅色' : '深色'}
						</Button>
						<Typography.Text>{authStore.userInfo?.username}</Typography.Text>
						<Button
							size="small"
							icon={<LogoutOutlined />}
							onClick={() => {
								authStore.logout();
								navigate('/login');
							}}
						>
							退出
						</Button>
					</Space>
				</Header>
				<Content
					style={{
						padding: 24,
						flex: 1,
						overflow: 'auto',
						background: token.colorBgLayout,
					}}
				>
					<Outlet />
				</Content>
			</Layout>
		</Layout>
	);
});
