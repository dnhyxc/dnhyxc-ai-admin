import {
	Button,
	Card,
	Form,
	Input,
	Popconfirm,
	Select,
	Table,
	Typography,
	message,
} from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import {
	createRoleApi,
	deleteRoleApi,
	getMenusApi,
	getRolesApi,
} from '@/service';
import { useStore } from '@/store';

type RoleRow = {
	id: number;
	name: string;
	description: string;
	menus?: Array<{ id: number; name: string }>;
};

export const RolesPage = observer(function RolesPage() {
	const { authStore } = useStore();
	const canWrite = authStore.isSuperAdmin;
	const [list, setList] = useState<RoleRow[]>([]);
	const [menus, setMenus] = useState<Array<{ id: number; name: string }>>([]);
	const [form] = Form.useForm();

	const load = async () => {
		const res = await getRolesApi();
		setList(res.data as RoleRow[]);
	};

	useEffect(() => {
		load();
		if (canWrite) {
			getMenusApi().then((res) => setMenus(res.data as any[]));
		}
	}, [canWrite]);

	const columns = [
		{ title: 'ID', dataIndex: 'id', width: 80 },
		{ title: '名称', dataIndex: 'name' },
		{ title: '描述', dataIndex: 'description' },
		{
			title: '菜单',
			render: (_: unknown, r: RoleRow) =>
				r.menus?.map((m) => m.name).join('、') || '—',
		},
		...(canWrite
			? [
					{
						title: '操作',
						width: 100,
						render: (_: unknown, r: RoleRow) => (
							<Popconfirm
								title="确认删除？"
								disabled={r.id === 1}
								onConfirm={async () => {
									await deleteRoleApi(r.id);
									message.success('已删除');
									load();
								}}
							>
								<Button danger type="link" size="small" disabled={r.id === 1}>
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
				角色管理
			</Typography.Title>

			{canWrite && (
				<Card size="small" title="新建角色" style={{ marginBottom: 16 }}>
					<Form
						form={form}
						layout="inline"
						onFinish={async (values) => {
							await createRoleApi(values);
							message.success('已创建角色');
							form.resetFields();
							load();
						}}
					>
						<Form.Item name="name" rules={[{ required: true }]}>
							<Input placeholder="角色名" />
						</Form.Item>
						<Form.Item name="description">
							<Input placeholder="描述" />
						</Form.Item>
						<Form.Item name="menuIds">
							<Select
								mode="multiple"
								allowClear
								placeholder="关联菜单"
								style={{ minWidth: 220 }}
								options={menus.map((m) => ({ value: m.id, label: m.name }))}
							/>
						</Form.Item>
						<Form.Item>
							<Button type="primary" htmlType="submit">
								创建角色
							</Button>
						</Form.Item>
					</Form>
				</Card>
			)}

			<Table
				rowKey="id"
				dataSource={list}
				pagination={false}
				columns={columns as any}
			/>
		</div>
	);
});
