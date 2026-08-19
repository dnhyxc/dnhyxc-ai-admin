import { Button, Form, Input, message, Space } from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui';
import { changePasswordApi, sendChangePasswordCodeApi } from '@/service';
import { useStore } from '@/store';

export const ProfilePage = observer(function ProfilePage() {
	const { authStore } = useStore();
	const navigate = useNavigate();
	const [submitting, setSubmitting] = useState(false);
	const [sendingCode, setSendingCode] = useState(false);
	const [countdown, setCountdown] = useState(0);
	const [verifyCodeKey, setVerifyCodeKey] = useState('');
	const [form] = Form.useForm<{
		email: string;
		verifyCode: string;
		oldPassword: string;
		newPassword: string;
		confirmPassword: string;
	}>();

	const user = authStore.userInfo;
	const roles =
		user?.roles
			?.map((r) => r.name)
			.filter(Boolean)
			.join('、') || '—';

	useEffect(() => {
		if (user?.email) {
			form.setFieldsValue({ email: user.email });
		}
	}, [user?.email, form]);

	useEffect(() => {
		if (countdown <= 0) return;
		const timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
		return () => window.clearTimeout(timer);
	}, [countdown]);

	const sendEmailCode = async () => {
		const email = await form.validateFields(['email']).then((v) => v.email);
		setSendingCode(true);
		try {
			const res = await sendChangePasswordCodeApi({ email });
			const key = (res.data as { key: string })?.key;
			if (!key) {
				message.error('验证码发送失败');
				return;
			}
			setVerifyCodeKey(key);
			message.success('验证码已发送，请查收邮箱');
			setCountdown(60);
		} finally {
			setSendingCode(false);
		}
	};

	const onFinish = async (values: {
		email: string;
		verifyCode: string;
		oldPassword: string;
		newPassword: string;
	}) => {
		if (!verifyCodeKey) {
			message.error('请先获取邮箱验证码');
			return;
		}
		setSubmitting(true);
		try {
			await changePasswordApi({
				email: values.email,
				verifyCode: Number(values.verifyCode),
				verifyCodeKey,
				oldPassword: values.oldPassword,
				newPassword: values.newPassword,
			});
			message.success('密码已修改，请重新登录');
			form.resetFields();
			setVerifyCodeKey('');
			authStore.logout();
			navigate('/login');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="p-6 mx-auto flex w-full max-w-xl flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>账号信息</CardTitle>
					<CardDescription>当前登录账号的基本资料</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<div className="flex items-center justify-between border-b py-2">
						<span className="text-muted-foreground">用户名</span>
						<span className="font-medium">{user?.username || '—'}</span>
					</div>
					<div className="flex items-center justify-between border-b py-2">
						<span className="text-muted-foreground">邮箱</span>
						<span className="font-medium">{user?.email || '—'}</span>
					</div>
					<div className="flex items-center justify-between py-2">
						<span className="text-muted-foreground">角色</span>
						<span className="font-medium">{roles}</span>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>修改密码</CardTitle>
					<CardDescription>
						需通过绑定邮箱验证码确认后修改，成功后请重新登录
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form
						form={form}
						layout="vertical"
						onFinish={onFinish}
						className="w-full"
						initialValues={{ email: user?.email }}
					>
						<Form.Item
							name="email"
							label="绑定邮箱"
							rules={[
								{ required: true, message: '请输入绑定邮箱' },
								{ type: 'email', message: '邮箱格式不正确' },
							]}
						>
							<Input placeholder="请输入账号绑定邮箱" autoComplete="email" />
						</Form.Item>
						<Form.Item label="邮箱验证码" required>
							<Space.Compact style={{ width: '100%' }}>
								<Form.Item
									name="verifyCode"
									noStyle
									rules={[
										{ required: true, message: '请输入邮箱验证码' },
										{ len: 6, message: '验证码为 6 位' },
									]}
								>
									<Input
										placeholder="请输入邮箱收到的验证码"
										maxLength={6}
										autoComplete="one-time-code"
									/>
								</Form.Item>
								<Button
									loading={sendingCode}
									disabled={countdown > 0}
									onClick={sendEmailCode}
								>
									{countdown > 0 ? `${countdown}s` : '获取验证码'}
								</Button>
							</Space.Compact>
						</Form.Item>
						<Form.Item
							name="oldPassword"
							label="原密码"
							rules={[
								{ required: true, message: '请输入原密码' },
								{ min: 6, max: 32, message: '密码长度为 6–32 位' },
							]}
						>
							<Input.Password
								placeholder="请输入原密码"
								autoComplete="current-password"
							/>
						</Form.Item>
						<Form.Item
							name="newPassword"
							label="新密码"
							rules={[
								{ required: true, message: '请输入新密码' },
								{ min: 6, max: 32, message: '密码长度为 6–32 位' },
							]}
						>
							<Input.Password
								placeholder="请输入新密码"
								autoComplete="new-password"
							/>
						</Form.Item>
						<Form.Item
							name="confirmPassword"
							label="确认新密码"
							dependencies={['newPassword']}
							rules={[
								{ required: true, message: '请再次输入新密码' },
								({ getFieldValue }) => ({
									validator(_, value) {
										if (!value || getFieldValue('newPassword') === value) {
											return Promise.resolve();
										}
										return Promise.reject(new Error('两次输入的新密码不一致'));
									},
								}),
							]}
						>
							<Input.Password
								placeholder="请再次输入新密码"
								autoComplete="new-password"
							/>
						</Form.Item>
						<Form.Item>
							<Button type="primary" htmlType="submit" loading={submitting}>
								确认修改
							</Button>
						</Form.Item>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
});
