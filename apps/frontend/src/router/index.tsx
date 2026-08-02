import { createBrowserRouter, Navigate } from 'react-router';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { store } from '@/store';
import { AiUsersPage } from '@/views/ai-users/AiUsersPage';
import { DashboardPage } from '@/views/dashboard/DashboardPage';
import { LoginPage } from '@/views/login/LoginPage';
import { LogsPage } from '@/views/logs/LogsPage';
import { MenusPage } from '@/views/menus/MenusPage';
import { RolesPage } from '@/views/roles/RolesPage';
import { UsersPage } from '@/views/users/UsersPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
	if (!store.authStore.isAuthed) {
		return <Navigate to="/login" replace />;
	}
	return children;
}

export const router = createBrowserRouter([
	{
		path: '/login',
		element: <LoginPage />,
	},
	{
		path: '/',
		element: (
			<RequireAuth>
				<AdminLayout />
			</RequireAuth>
		),
		children: [
			{ index: true, element: <DashboardPage /> },
			{ path: 'users', element: <UsersPage /> },
			{ path: 'roles', element: <RolesPage /> },
			{ path: 'menus', element: <MenusPage /> },
			{ path: 'ai-users', element: <AiUsersPage /> },
			{ path: 'logs', element: <LogsPage /> },
		],
	},
	{ path: '*', element: <Navigate to="/" replace /> },
]);
