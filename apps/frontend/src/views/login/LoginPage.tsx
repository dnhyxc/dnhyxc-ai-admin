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
	message,
	Space,
	Tabs,
	Typography,
	theme,
} from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { resolveHomePath } from '@/router/menu';
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

	const goAfterAuth = () => {
		if (authStore.needsAiBind) {
			navigate('/bind-ai-user', { replace: true });
			return;
		}
		navigate(
			resolveHomePath({
				isSuperAdmin: authStore.isSuperAdmin,
				roles: authStore.userInfo?.roles,
			}),
			{ replace: true },
		);
	};

	const loadCaptcha = async () => {
		const res = await captchaApi();
		const data = res.data as { captchaId: string; captchaSvg: string };
		setCaptchaId(data.captchaId);
		setCaptchaSvg(data.captchaSvg);
	};

	useEffect(() => {
		if (authStore.isAuthed) {
			goAfterAuth();
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
			goAfterAuth();
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
				height: 32,
				border: `1px solid ${token.colorBorder}`,
				borderLeft: 'none',
				borderRadius: `0 ${token.borderRadius}px ${token.borderRadius}px 0`,
				background: token.colorBgContainer,
				cursor: 'pointer',
				overflow: 'hidden',
				padding: 0,
				display: 'flex',
				alignItems: 'stretch',
				justifyContent: 'center',
			}}
			dangerouslySetInnerHTML={{
				__html: captchaSvg.replace(
					'<svg ',
					'<svg style="width:100%;height:100%;display:block;box-sizing:border-box" preserveAspectRatio="none" ',
				),
			}}
		/>
	);

	return (
		<div
			className="login-grid"
			style={{
				height: '100vh',
				flex: 1,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: 16,
				overflow: 'hidden',
				background: token.colorBgLayout,
			}}
		>
			<Card
				bordered
				style={{
					width: 820,
					maxWidth: '100%',
					minHeight: 520,
					boxShadow: token.boxShadowSecondary,
					padding: 0,
					overflow: 'hidden',
				}}
				styles={{ body: { padding: 0 } }}
			>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)',
						minHeight: 520,
					}}
				>
					{/* ───── 左栏：品牌视觉区 ───── */}
					<div
						style={{
							backgroundImage: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorInfo} 100%)`,
							color: '#fff',
							padding: '32px 28px',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'space-between',
							overflow: 'hidden',
							position: 'relative',
						}}
					>
						{/* 背景光斑装饰 */}
						<div
							style={{
								position: 'absolute',
								inset: 0,
								backgroundImage:
									'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.18) 0, transparent 45%), radial-gradient(circle at 85% 85%, rgba(255,255,255,0.15) 0, transparent 45%)',
								pointerEvents: 'none',
							}}
						/>

						<div style={{ position: 'relative', zIndex: 1 }}>
							<Typography.Title
								level={3}
								style={{
									margin: 0,
									color: '#fff',
									fontFamily: 'Instrument Serif, Georgia, serif',
									fontWeight: 400,
									letterSpacing: '0.01em',
								}}
							>
								dnhyxc
							</Typography.Title>
							<Typography.Text
								style={{
									color: 'rgba(255,255,255,0.82)',
									fontSize: 13,
									display: 'inline-block',
									marginTop: 6,
								}}
							>
								管理控制台 · 配套 dnhyxc-ai
							</Typography.Text>
						</div>

						<div style={{ position: 'relative', zIndex: 1 }}>
							<Typography.Title
								level={4}
								style={{
									margin: 0,
									color: '#fff',
									fontWeight: 600,
									lineHeight: 1.35,
									letterSpacing: 0,
								}}
							>
								一站式 AI 内容与用户管理平台
							</Typography.Title>
							<Typography.Paragraph
								style={{
									margin: '10px 0 0 0',
									color: 'rgba(255,255,255,0.85)',
									fontSize: 13,
									lineHeight: 1.7,
								}}
							>
								统一管理前台用户、AI
								知识库、电子书、学习笔记、订单与角色权限，让运营工作更高效、更可追溯。
							</Typography.Paragraph>

							<div
								style={{
									marginTop: 20,
									display: 'grid',
									gridTemplateColumns: '1fr 1fr',
									rowGap: 10,
									columnGap: 12,
									fontSize: 13,
									color: 'rgba(255,255,255,0.92)',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									<UserOutlined style={{ color: '#fff' }} />
									<span>多角色权限体系</span>
								</div>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									<MailOutlined style={{ color: '#fff' }} />
									<span>邮箱订阅与通知</span>
								</div>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									<LockOutlined style={{ color: '#fff' }} />
									<span>安全的账号体系</span>
								</div>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									<SafetyOutlined style={{ color: '#fff' }} />
									<span>日志审计与溯源</span>
								</div>
							</div>
						</div>

						<div
							style={{
								position: 'relative',
								zIndex: 1,
								fontSize: 12,
								color: 'rgba(255,255,255,0.68)',
							}}
						>
							© {new Date().getFullYear()} dnhyxc · All rights reserved
						</div>
					</div>

					{/* ───── 右栏：表单区 ───── */}
					<div
						style={{
							padding: '22px 26px',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							background: token.colorBgContainer,
						}}
					>
						<Space direction="vertical" size={2} style={{ marginBottom: 8 }}>
							<Typography.Title
								level={4}
								style={{ margin: 0, color: token.colorTextHeading }}
							>
								{tab === 'login' ? '欢迎回来' : '创建新账号'}
							</Typography.Title>
							<Typography.Text type="secondary" style={{ fontSize: 12 }}>
								{tab === 'login'
									? '请输入账号信息登录管理后台'
									: '仅需 30 秒，注册属于你的管理员账号'}
							</Typography.Text>
						</Space>

						<Tabs
							style={{ marginBottom: 0 }}
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
											requiredMark={false}
										>
											<Form.Item
												name="username"
												label={<span style={{ fontSize: 12 }}>用户名</span>}
												rules={[{ required: true, message: '请输入用户名' }]}
												style={{ marginBottom: 8 }}
											>
												<Input
													prefix={<UserOutlined />}
													autoComplete="username"
													size="middle"
													placeholder="请输入用户名"
												/>
											</Form.Item>
											<Form.Item
												name="password"
												label={<span style={{ fontSize: 12 }}>密码</span>}
												rules={[{ required: true, message: '请输入密码' }]}
												style={{ marginBottom: 8 }}
											>
												<Input.Password
													prefix={<LockOutlined />}
													autoComplete="current-password"
													size="middle"
													placeholder="请输入密码"
												/>
											</Form.Item>
											<Form.Item
												name="captchaText"
												label={<span style={{ fontSize: 12 }}>验证码</span>}
												rules={[{ required: true, message: '请输入验证码' }]}
												style={{ marginBottom: 12 }}
											>
												<Space.Compact style={{ width: '100%' }}>
													<Input
														prefix={<SafetyOutlined />}
														size="middle"
														style={{ flex: 1 }}
														placeholder="请输入验证码"
													/>
													{captchaAddon}
												</Space.Compact>
											</Form.Item>
											<Button
												type="primary"
												htmlType="submit"
												block
												size="middle"
												loading={loading}
												style={{ height: 38 }}
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
												label={<span style={{ fontSize: 12 }}>用户名</span>}
												rules={[
													{ required: true, message: '请输入用户名' },
													{ min: 2, max: 20, message: '用户名 2-20 个字符' },
												]}
												style={{ marginBottom: 8 }}
											>
												<Input
													prefix={<UserOutlined />}
													autoComplete="username"
													size="middle"
													placeholder="请输入用户名"
												/>
											</Form.Item>
											<Form.Item
												name="email"
												label={<span style={{ fontSize: 12 }}>邮箱</span>}
												rules={[
													{ required: true, message: '请输入邮箱' },
													{ type: 'email', message: '邮箱格式不正确' },
												]}
												style={{ marginBottom: 8 }}
											>
												<Input
													prefix={<MailOutlined />}
													autoComplete="email"
													size="middle"
													placeholder="请输入邮箱"
												/>
											</Form.Item>
											<Form.Item
												name="password"
												label={<span style={{ fontSize: 12 }}>密码</span>}
												rules={[
													{ required: true, message: '请输入密码' },
													{ min: 6, max: 32, message: '密码 6-32 个字符' },
												]}
												style={{ marginBottom: 8 }}
											>
												<Input.Password
													prefix={<LockOutlined />}
													autoComplete="new-password"
													size="middle"
													placeholder="请输入密码"
												/>
											</Form.Item>
											<Form.Item
												name="confirmPassword"
												label={<span style={{ fontSize: 12 }}>确认密码</span>}
												dependencies={['password']}
												rules={[
													{ required: true, message: '请再次输入密码' },
													({ getFieldValue }) => ({
														validator(_, value) {
															if (
																!value ||
																getFieldValue('password') === value
															) {
																return Promise.resolve();
															}
															return Promise.reject(
																new Error('两次输入的密码不一致'),
															);
														},
													}),
												]}
												style={{ marginBottom: 8 }}
											>
												<Input.Password
													prefix={<LockOutlined />}
													autoComplete="new-password"
													size="middle"
													placeholder="请再次输入密码"
												/>
											</Form.Item>
											<Form.Item
												name="captchaText"
												label={<span style={{ fontSize: 12 }}>验证码</span>}
												rules={[{ required: true, message: '请输入验证码' }]}
												style={{ marginBottom: 12 }}
											>
												<Space.Compact style={{ width: '100%' }}>
													<Input
														prefix={<SafetyOutlined />}
														size="middle"
														style={{ flex: 1 }}
														placeholder="请输入验证码"
													/>
													{captchaAddon}
												</Space.Compact>
											</Form.Item>
											<Button
												type="primary"
												htmlType="submit"
												block
												size="middle"
												loading={loading}
												style={{ height: 38 }}
											>
												注册
											</Button>
										</Form>
									),
								},
							]}
						/>
					</div>
				</div>
			</Card>
		</div>
	);
});
