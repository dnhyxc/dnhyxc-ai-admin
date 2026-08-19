import { createBrowserRouter, Navigate } from 'react-router';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { resolveHomePath } from '@/router/menu';
import { store } from '@/store';
import { AiEbooksPage } from '@/views/ai-ebooks/AiEbooksPage';
import { AiKnowledgePage } from '@/views/ai-knowledge/AiKnowledgePage';
import { AiLogsPage } from '@/views/ai-logs/AiLogsPage';
import { AiUsersPage } from '@/views/ai-users/AiUsersPage';
import { BindAiUserPage } from '@/views/bind-ai-user/BindAiUserPage';
import { DashboardPage } from '@/views/dashboard/DashboardPage';
import { AiLearningNotePage } from '@/views/ai-learning-note/AiLearningNotePage';
import { LoginPage } from '@/views/login/LoginPage';
import { LogsPage } from '@/views/logs/LogsPage';
import { MenusPage } from '@/views/menus/MenusPage';
import { ProfilePage } from '@/views/profile/ProfilePage';
import { RolesPage } from '@/views/roles/RolesPage';
import { UsersPage } from '@/views/users/UsersPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
	if (!store.authStore.isAuthed) {
		return <Navigate to="/login" replace />;
	}
	return children;
}

/** 普通用户未绑定前台账号时强制进入绑定页 */
function RequireAiBound({ children }: { children: React.ReactNode }) {
	if (store.authStore.needsAiBind) {
		return <Navigate to="/bind-ai-user" replace />;
	}
	return children;
}

/** 根路径：超管看仪表盘，普通用户直接进有权限的首页，避免先挂载看板再请求 overview */
function HomeIndex() {
	const { authStore } = store;
	if (authStore.isSuperAdmin) {
		return <DashboardPage />;
	}
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

export const router = createBrowserRouter([
	{
		path: '/login',
		element: <LoginPage />,
	},
	{
		path: '/bind-ai-user',
		element: (
			<RequireAuth>
				<BindAiUserPage />
			</RequireAuth>
		),
	},
	{
		path: '/',
		element: (
			<RequireAuth>
				<RequireAiBound>
					<AdminLayout />
				</RequireAiBound>
			</RequireAuth>
		),
		children: [
			{ index: true, element: <HomeIndex /> },
			{ path: 'profile', element: <ProfilePage /> },
			{ path: 'users', element: <UsersPage /> },
			{ path: 'roles', element: <RolesPage /> },
			{ path: 'menus', element: <MenusPage /> },
			{ path: 'ai-users', element: <AiUsersPage /> },
			{ path: 'ai-ebooks', element: <AiEbooksPage /> },
			{ path: 'ai-knowledge', element: <AiKnowledgePage /> },
			{ path: 'ai-logs', element: <AiLogsPage /> },
			{ path: 'ai-learning-note', element: <AiLearningNotePage /> },
			{ path: 'logs', element: <LogsPage /> },
		],
	},
	{ path: '*', element: <Navigate to="/" replace /> },
]);
