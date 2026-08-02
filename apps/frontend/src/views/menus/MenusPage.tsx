import {
	Button,
	Card,
	Form,
	Input,
	InputNumber,
	Popconfirm,
	Table,
	Typography,
	message,
} from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { createMenuApi, deleteMenuApi, getMenusApi } from '@/service';
import { useStore } from '@/store';

type MenuRow = {
	id: number;
	name: string;
	path: string;
	order: number;
	acl: string;
	icon: string;
};

export const MenusPage = observer(function MenusPage() {
	const { authStore } = useStore();
	const canWrite = authStore.isSuperAdmin;
	const [list, setList] = useState<MenuRow[]>([]);
	const [form] = Form.useForm();

	const load = async () => {
		const res = await getMenusApi();
		setList(res.data as MenuRow[]);
	};

	useEffect(() => {
		load();
	}, []);

	const columns = [
		{ title: 'ID', dataIndex: 'id', width: 80 },
		{ title: '名称', dataIndex: 'name' },
		{ title: '路径', dataIndex: 'path' },
		{ title: '排序', dataIndex: 'order', width: 80 },
		{ title: 'ACL', dataIndex: 'acl' },
		...(canWrite
			? [
					{
						title: '操作',
						width: 100,
						render: (_: unknown, r: MenuRow) => (
							<Popconfirm
								title="确认删除？"
								onConfirm={async () => {
									await deleteMenuApi(r.id);
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
				菜单管理
			</Typography.Title>

			{canWrite && (
				<Card size="small" title="新建菜单" style={{ marginBottom: 16 }}>
					<Form
						form={form}
						layout="inline"
						initialValues={{ order: 0 }}
						onFinish={async (values) => {
							await createMenuApi(values);
							message.success('已创建菜单');
							form.resetFields();
							load();
						}}
					>
						<Form.Item name="name" rules={[{ required: true }]}>
							<Input placeholder="名称" />
						</Form.Item>
						<Form.Item name="path" rules={[{ required: true }]}>
							<Input placeholder="路径" />
						</Form.Item>
						<Form.Item name="order">
							<InputNumber placeholder="排序" />
						</Form.Item>
						<Form.Item name="acl">
							<Input placeholder="ACL" />
						</Form.Item>
						<Form.Item name="icon">
							<Input placeholder="图标" />
						</Form.Item>
						<Form.Item>
							<Button type="primary" htmlType="submit">
								创建菜单
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
