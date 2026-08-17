import { MailOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, message, Typography, theme } from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { resolveHomePath } from '@/router/menu';
import { bindAiUserApi } from '@/service';
import { type UserInfo, useStore } from '@/store';

export const BindAiUserPage = observer(function BindAiUserPage() {
	const { authStore } = useStore();
	const navigate = useNavigate();
	const { token } = theme.useToken();
	const [form] = Form.useForm<{ username: string; email: string }>();
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!authStore.isAuthed) {
			navigate('/login', { replace: true });
			return;
		}
		if (authStore.isSuperAdmin || authStore.userInfo?.aiUserId) {
			navigate(
				resolveHomePath({
					isSuperAdmin: authStore.isSuperAdmin,
					roles: authStore.userInfo?.roles,
				}),
				{ replace: true },
			);
			return;
		}
		form.setFieldsValue({
			email: authStore.userInfo?.email || '',
		});
	}, []);

	const onFinish = async (values: { username: string; email: string }) => {
		setLoading(true);
		try {
			const res = await bindAiUserApi(values);
			const data = res.data as UserInfo & { aiUserId: number };
			authStore.patchUserInfo({
				aiUserId: data.aiUserId,
				...(data.roles ? { roles: data.roles } : {}),
			});
			message.success('前台账号绑定成功');
			navigate(
				resolveHomePath({
					isSuperAdmin: false,
					roles: authStore.userInfo?.roles,
				}),
				{ replace: true },
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: 24,
				background: `linear-gradient(160deg, ${token.colorBgLayout} 0%, ${token.colorPrimaryBg} 100%)`,
			}}
		>
			<Card style={{ width: 420, maxWidth: '100%' }}>
				<Typography.Title level={3} style={{ marginTop: 0 }}>
					绑定前台账号
				</Typography.Title>
				<Typography.Paragraph type="secondary">
					普通用户需先绑定 dnhyxc-ai
					前台账号，之后书籍列表仅展示该账号下的数据。请填写前台注册时的用户名与邮箱。
				</Typography.Paragraph>
				<Form
					form={form}
					layout="vertical"
					onFinish={onFinish}
					requiredMark={false}
				>
					<Form.Item
						name="username"
						label="前台用户名"
						rules={[{ required: true, message: '请输入前台用户名' }]}
					>
						<Input
							prefix={<UserOutlined />}
							placeholder="前台账号用户名"
							size="large"
							autoComplete="username"
						/>
					</Form.Item>
					<Form.Item
						name="email"
						label="前台邮箱"
						rules={[
							{ required: true, message: '请输入前台邮箱' },
							{ type: 'email', message: '邮箱格式不正确' },
						]}
					>
						<Input
							prefix={<MailOutlined />}
							placeholder="前台账号邮箱"
							size="large"
							autoComplete="email"
						/>
					</Form.Item>
					<Button
						type="primary"
						htmlType="submit"
						block
						size="large"
						loading={loading}
					>
						确认绑定
					</Button>
					<Button
						type="link"
						block
						style={{ marginTop: 8 }}
						onClick={() => {
							authStore.logout();
							navigate('/login');
						}}
					>
						退出登录
					</Button>
				</Form>
			</Card>
		</div>
	);
});
