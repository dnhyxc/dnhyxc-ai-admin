import {
	Button,
	Card,
	Form,
	Input,
	Modal,
	message,
	Popconfirm,
	Select,
	Space,
	Table,
} from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { DEFAULT_PAGE_SIZE, tablePagination } from '@/lib/table-pagination';
import {
	createRoleApi,
	deleteRoleApi,
	getMenusApi,
	getRolesApi,
	updateRoleApi,
} from '@/service';
import { useStore } from '@/store';

type RoleRow = {
	id: number;
	name: string;
	description: string;
	menus?: Array<{ id: number; name: string }>;
};

export const RolesPage = observer(function RolesPage() {
	const { authStore, noticeStore } = useStore();
	const canWrite = authStore.isSuperAdmin;
	const [list, setList] = useState<RoleRow[]>([]);
	const [menus, setMenus] = useState<Array<{ id: number; name: string }>>([]);
	const [pageNo, setPageNo] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [form] = Form.useForm();
	const [editForm] = Form.useForm();
	const [editing, setEditing] = useState<RoleRow | null>(null);
	const [saving, setSaving] = useState(false);

	const load = async () => {
		noticeStore.setPageLoading(true);
		try {
			const res = await getRolesApi();
			setList(res.data as RoleRow[]);
			setPageNo(1);
		} finally {
			noticeStore.setPageLoading(false);
		}
	};

	useEffect(() => {
		load();
		if (canWrite) {
			getMenusApi().then((res) => setMenus(res.data as any[]));
		}
	}, [canWrite]);

	const openEdit = (r: RoleRow) => {
		setEditing(r);
		editForm.setFieldsValue({
			name: r.name,
			description: r.description,
			menuIds: r.menus?.map((m) => m.id) || [],
		});
	};

	const submitEdit = async () => {
		if (!editing) return;
		const values = await editForm.validateFields();
		setSaving(true);
		try {
			await updateRoleApi(editing.id, values);
			message.success('角色菜单已更新');
			setEditing(null);
			editForm.resetFields();
			load();
		} finally {
			setSaving(false);
		}
	};

	const columns = [
		{ title: 'ID', dataIndex: 'id', width: 80 },
		{ title: '名称', dataIndex: 'name', width: 180 },
		{ title: '描述', dataIndex: 'description', width: 300 },
		{
			title: '菜单',
			render: (_: unknown, r: RoleRow) =>
				r.menus?.map((m) => m.name).join('、') || '—',
		},
		...(canWrite
			? [
					{
						title: '操作',
						width: 140,
						render: (_: unknown, r: RoleRow) => (
							<Space size={0} className="flex items-center gap-2">
								<Button
									type="link"
									size="small"
									className="px-0!"
									onClick={() => openEdit(r)}
								>
									分配菜单
								</Button>
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
							</Space>
						),
					},
				]
			: []),
	];

	return (
		<div className="h-full flex flex-col">
			{canWrite && (
				<div className="shrink-0 px-6 pt-6 pb-4">
					<Card size="small" title="新建角色">
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
				</div>
			)}

			<div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
				<Table
					rowKey="id"
					dataSource={list}
					locale={{ emptyText: '暂无数据' }}
					columns={columns as any}
					pagination={tablePagination(
						list.length,
						pageNo,
						pageSize,
						(page, size) => {
							setPageNo(page);
							setPageSize(size);
						},
					)}
					scroll={{ x: 800 }}
				/>
			</div>

			<Modal
				title={`分配菜单 - ${editing?.name || ''}`}
				open={editing !== null}
				onOk={submitEdit}
				confirmLoading={saving}
				okText="保存"
				cancelText="取消"
				destroyOnHidden
				onCancel={() => {
					setEditing(null);
					editForm.resetFields();
				}}
			>
				<Form form={editForm} layout="vertical">
					<Form.Item
						name="name"
						label="角色名"
						rules={[{ required: true, message: '请输入角色名' }]}
					>
						<Input placeholder="角色名" />
					</Form.Item>
					<Form.Item name="description" label="描述">
						<Input placeholder="描述" />
					</Form.Item>
					<Form.Item name="menuIds" label="关联菜单">
						<Select
							mode="multiple"
							allowClear
							placeholder="选择该角色可访问的菜单"
							options={menus.map((m) => ({
								value: m.id,
								label: m.name,
							}))}
						/>
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
});
