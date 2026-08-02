import {
	Button,
	Card,
	Form,
	Input,
	Popconfirm,
	Select,
	Space,
	Table,
	Tag,
	Typography,
	message,
} from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import {
	addUserApi,
	deleteUserApi,
	getRolesApi,
	getUsersApi,
} from '@/service';
import { useStore } from '@/store';

type UserRow = {
	id: number;
	username: string;
	email: string;
	isActive: boolean;
	roles?: Array<{ id: number; name: string }>;
};

export const UsersPage = observer(function UsersPage() {
	const { authStore } = useStore();
	const canWrite = authStore.isSuperAdmin;
	const [list, setList] = useState<UserRow[]>([]);
	const [total, setTotal] = useState(0);
	const [username, setUsername] = useState('');
	const [roles, setRoles] = useState<Array<{ id: number; name: string }>>([]);
	const [form] = Form.useForm();

	const load = async () => {
		const res = await getUsersApi({ pageNo: 1, pageSize: 50, username });
		const data = res.data as { list: UserRow[]; total: number };
		setList(data.list);
		setTotal(data.total);
	};

	useEffect(() => {
		load();
		if (canWrite) {
			getRolesApi().then((res) => setRoles(res.data as any[]));
		}
	}, [canWrite]);

	const columns = [
		{ title: 'ID', dataIndex: 'id', width: 80 },
		{ title: '用户名', dataIndex: 'username' },
		{ title: '邮箱', dataIndex: 'email' },
		{
			title: '角色',
			render: (_: unknown, r: UserRow) =>
				r.roles?.map((x) => x.name).join('、') || '—',
		},
		{
			title: '状态',
			dataIndex: 'isActive',
			render: (v: boolean) =>
				v ? <Tag color="success">启用</Tag> : <Tag>禁用</Tag>,
		},
		...(canWrite
			? [
					{
						title: '操作',
						width: 100,
						render: (_: unknown, r: UserRow) => (
							<Popconfirm
								title="确认删除？"
								onConfirm={async () => {
									await deleteUserApi(r.id);
									message.success('已删除');
									load();
								}}
							>
								<Button danger type="link" size="small">
									删除
								</Button>
							</Popconfirm>
						),
					},
				]
			: []),
	];

	return (
		<div>
			<Typography.Title level={3} style={{ marginTop: 0 }}>
				管理员
			</Typography.Title>
			<Typography.Paragraph type="secondary">共 {total} 人</Typography.Paragraph>

			{canWrite && (
				<Card size="small" title="新建管理员" style={{ marginBottom: 16 }}>
					<Form
						form={form}
						layout="inline"
						onFinish={async (values) => {
							await addUserApi({
								...values,
								roleIds: values.roleId ? [values.roleId] : [],
							});
							message.success('已创建');
							form.resetFields();
							load();
						}}
					>
						<Form.Item
							name="username"
							rules={[{ required: true, message: '用户名' }]}
						>
							<Input placeholder="用户名" />
						</Form.Item>
						<Form.Item
							name="password"
							rules={[{ required: true, message: '密码' }]}
						>
							<Input.Password placeholder="密码" />
						</Form.Item>
						<Form.Item
							name="email"
							rules={[{ required: true, message: '邮箱' }]}
						>
							<Input placeholder="邮箱" />
						</Form.Item>
						<Form.Item name="roleId">
							<Select
								allowClear
								placeholder="角色"
								style={{ width: 160 }}
								options={roles.map((r) => ({ value: r.id, label: r.name }))}
							/>
						</Form.Item>
						<Form.Item>
							<Button type="primary" htmlType="submit">
								创建
							</Button>
						</Form.Item>
					</Form>
				</Card>
			)}

			<Space style={{ marginBottom: 12 }}>
				<Input
					placeholder="搜索用户名"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					style={{ width: 200 }}
					allowClear
				/>
				<Button onClick={load}>查询</Button>
			</Space>

			<Table
				rowKey="id"
				dataSource={list}
				pagination={false}
				columns={columns as any}
			/>
		</div>
	);
});
