import {
	LockOutlined,
	MailOutlined,
	SafetyOutlined,
	UserOutlined,
} from '@ant-design/icons';
import {
	Button,
	Card,
	Form,
	Input,
	Space,
	Tabs,
	Typography,
	message,
	theme,
} from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { captchaApi, loginApi, registerApi } from '@/service';
import { useStore } from '@/store';

type AuthTab = 'login' | 'register';

export const LoginPage = observer(function LoginPage() {
	const { authStore } = useStore();
	const navigate = useNavigate();
	const { token } = theme.useToken();
	const [tab, setTab] = useState<AuthTab>('login');
	const [loginForm] = Form.useForm();
	const [registerForm] = Form.useForm();
	const [captchaId, setCaptchaId] = useState('');
	const [captchaSvg, setCaptchaSvg] = useState('');
	const [loading, setLoading] = useState(false);

	const loadCaptcha = async () => {
		const res = await captchaApi();
		const data = res.data as { captchaId: string; captchaSvg: string };
		setCaptchaId(data.captchaId);
		setCaptchaSvg(data.captchaSvg);
	};

	useEffect(() => {
		if (authStore.isAuthed) {
			navigate('/', { replace: true });
			return;
		}
		loadCaptcha().catch(() => message.error('验证码加载失败'));
	}, []);

	const refreshCaptcha = () => {
		loadCaptcha();
		loginForm.setFieldValue('captchaText', undefined);
		registerForm.setFieldValue('captchaText', undefined);
	};

	const onLogin = async (values: {
		username: string;
		password: string;
		captchaText: string;
	}) => {
		setLoading(true);
		try {
			const res = await loginApi({ ...values, captchaId });
			authStore.setSession(res.data as any);
			message.success('登录成功');
			navigate('/', { replace: true });
		} catch {
			refreshCaptcha();
		} finally {
			setLoading(false);
		}
	};

	const onRegister = async (values: {
		username: string;
		password: string;
		confirmPassword: string;
		email: string;
		captchaText: string;
	}) => {
		setLoading(true);
		try {
			await registerApi({
				username: values.username,
				password: values.password,
				email: values.email,
				captchaId,
				captchaText: values.captchaText,
			});
			message.success('注册成功，请登录');
			setTab('login');
			loginForm.setFieldsValue({
				username: values.username,
				password: values.password,
			});
			refreshCaptcha();
		} catch {
			refreshCaptcha();
		} finally {
			setLoading(false);
		}
	};

	const captchaAddon = (
		<button
			type="button"
			title="点击刷新"
			onClick={() => refreshCaptcha()}
			style={{
				width: 120,
				height: 40,
				border: `1px solid ${token.colorBorder}`,
				borderRadius: `0 ${token.borderRadius}px ${token.borderRadius}px 0`,
				background: token.colorBgContainer,
				cursor: 'pointer',
				overflow: 'hidden',
				padding: 0,
			}}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: captcha svg from backend
			dangerouslySetInnerHTML={{ __html: captchaSvg }}
		/>
	);

	return (
		<div
			className="login-grid"
			style={{
				minHeight: '100vh',
				flex: 1,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: 24,
				background: token.colorBgLayout,
			}}
		>
			<Card
				style={{ width: 440, boxShadow: token.boxShadowSecondary }}
				styles={{ body: { padding: 32 } }}
			>
				<Space direction="vertical" size={4} style={{ marginBottom: 16 }}>
					<Typography.Title
						level={2}
						style={{
							margin: 0,
							color: token.colorPrimary,
							fontFamily: 'Instrument Serif, Georgia, serif',
							fontWeight: 400,
						}}
					>
						dnhyxc
					</Typography.Title>
					<Typography.Text type="secondary">
						管理控制台 · 配套 dnhyxc-ai
					</Typography.Text>
				</Space>

				<Tabs
					activeKey={tab}
					onChange={(key) => {
						setTab(key as AuthTab);
						refreshCaptcha();
					}}
					items={[
						{
							key: 'login',
							label: '登录',
							children: (
								<Form
									form={loginForm}
									layout="vertical"
									onFinish={onLogin}
									initialValues={{ username: 'admin', password: 'admin123' }}
									requiredMark={false}
								>
									<Form.Item
										name="username"
										label="用户名"
										rules={[{ required: true, message: '请输入用户名' }]}
									>
										<Input
											prefix={<UserOutlined />}
											autoComplete="username"
											size="large"
										/>
									</Form.Item>
									<Form.Item
										name="password"
										label="密码"
										rules={[{ required: true, message: '请输入密码' }]}
									>
										<Input.Password
											prefix={<LockOutlined />}
											autoComplete="current-password"
											size="large"
										/>
									</Form.Item>
									<Form.Item
										name="captchaText"
										label="验证码"
										rules={[{ required: true, message: '请输入验证码' }]}
									>
										<Space.Compact style={{ width: '100%' }}>
											<Input
												prefix={<SafetyOutlined />}
												size="large"
												style={{ flex: 1 }}
											/>
											{captchaAddon}
										</Space.Compact>
									</Form.Item>
									<Button
										type="primary"
										htmlType="submit"
										block
										size="large"
										loading={loading}
									>
										登录
									</Button>
								</Form>
							),
						},
						{
							key: 'register',
							label: '注册',
							children: (
								<Form
									form={registerForm}
									layout="vertical"
									onFinish={onRegister}
									requiredMark={false}
								>
									<Form.Item
										name="username"
										label="用户名"
										rules={[
											{ required: true, message: '请输入用户名' },
											{ min: 2, max: 20, message: '用户名 2-20 个字符' },
										]}
									>
										<Input
											prefix={<UserOutlined />}
											autoComplete="username"
											size="large"
										/>
									</Form.Item>
									<Form.Item
										name="email"
										label="邮箱"
										rules={[
											{ required: true, message: '请输入邮箱' },
											{ type: 'email', message: '邮箱格式不正确' },
										]}
									>
										<Input
											prefix={<MailOutlined />}
											autoComplete="email"
											size="large"
										/>
									</Form.Item>
									<Form.Item
										name="password"
										label="密码"
										rules={[
											{ required: true, message: '请输入密码' },
											{ min: 6, max: 32, message: '密码 6-32 个字符' },
										]}
									>
										<Input.Password
											prefix={<LockOutlined />}
											autoComplete="new-password"
											size="large"
										/>
									</Form.Item>
									<Form.Item
										name="confirmPassword"
										label="确认密码"
										dependencies={['password']}
										rules={[
											{ required: true, message: '请再次输入密码' },
											({ getFieldValue }) => ({
												validator(_, value) {
													if (!value || getFieldValue('password') === value) {
														return Promise.resolve();
													}
													return Promise.reject(
														new Error('两次输入的密码不一致'),
													);
												},
											}),
										]}
									>
										<Input.Password
											prefix={<LockOutlined />}
											autoComplete="new-password"
											size="large"
										/>
									</Form.Item>
									<Form.Item
										name="captchaText"
										label="验证码"
										rules={[{ required: true, message: '请输入验证码' }]}
									>
										<Space.Compact style={{ width: '100%' }}>
											<Input
												prefix={<SafetyOutlined />}
												size="large"
												style={{ flex: 1 }}
											/>
											{captchaAddon}
										</Space.Compact>
									</Form.Item>
									<Button
										type="primary"
										htmlType="submit"
										block
										size="large"
										loading={loading}
									>
										注册
									</Button>
								</Form>
							),
						},
					]}
				/>
			</Card>
		</div>
	);
});
