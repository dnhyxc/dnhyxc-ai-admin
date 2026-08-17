import {
	Button,
	Input,
	message,
	Popconfirm,
	Select,
	Space,
	Table,
	Tag,
} from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { DEFAULT_PAGE_SIZE, tablePagination } from '@/lib/table-pagination';
import {
	deleteUserApi,
	getRolesApi,
	getUsersApi,
	updateUserApi,
} from '@/service';
import { useStore } from '@/store';

type UserRow = {
	id: number;
	username: string;
	email: string;
	isActive: boolean;
	aiUserId?: number | null;
	roles?: Array<{ id: number; name: string }>;
};

export const UsersPage = observer(function UsersPage() {
	const { authStore } = useStore();
	const canWrite = authStore.isSuperAdmin;
	const [list, setList] = useState<UserRow[]>([]);
	const [total, setTotal] = useState(0);
	const [pageNo, setPageNo] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [username, setUsername] = useState('');
	const [roles, setRoles] = useState<Array<{ id: number; name: string }>>([]);
	const [savingId, setSavingId] = useState<number | null>(null);

	const load = async (page = pageNo, size = pageSize) => {
		const res = await getUsersApi({ pageNo: page, pageSize: size, username });
		const data = res.data as { list: UserRow[]; total: number };
		setList(data.list);
		setTotal(data.total);
		setPageNo(page);
		setPageSize(size);
	};

	useEffect(() => {
		load(1, DEFAULT_PAGE_SIZE);
		getRolesApi().then((res) => {
			const data = res.data;
			setRoles(Array.isArray(data) ? data : []);
		});
	}, []);

	const changeRole = async (userId: number, roleId?: number) => {
		setSavingId(userId);
		try {
			await updateUserApi(userId, {
				roleIds: roleId != null ? [roleId] : [],
			});
			message.success('角色已更新');
			await load();
		} finally {
			setSavingId(null);
		}
	};

	const columns = [
		{ title: 'ID', dataIndex: 'id', width: 80 },
		{ title: '用户名', dataIndex: 'username' },
		{ title: '邮箱', dataIndex: 'email' },
		{
			title: '角色',
			width: 220,
			render: (_: unknown, r: UserRow) =>
				canWrite ? (
					<Select
						allowClear
						placeholder="选择角色"
						style={{ width: '100%' }}
						loading={savingId === r.id}
						disabled={savingId === r.id}
						value={r.roles?.[0]?.id}
						options={roles.map((role) => ({
							value: role.id,
							label: role.name,
						}))}
						onChange={(roleId) => changeRole(r.id, roleId)}
					/>
				) : (
					r.roles?.map((x) => x.name).join('、') || '—'
				),
		},
		{
			title: '前台账号',
			width: 120,
			render: (_: unknown, r: UserRow) =>
				r.aiUserId != null ? (
					<Tag color="blue">#{r.aiUserId}</Tag>
				) : (
					<Tag>未绑定</Tag>
				),
		},
		{
			title: '状态',
			dataIndex: 'isActive',
			width: 100,
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
								disabled={r.id === 1}
								onConfirm={async () => {
									await deleteUserApi(r.id);
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
			<Space style={{ marginBottom: 12 }}>
				<Input
					placeholder="搜索用户名"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					style={{ width: 200 }}
					allowClear
					onPressEnter={() => load(1, pageSize)}
				/>
				<Button type="primary" onClick={() => load(1, pageSize)}>
					查询
				</Button>
			</Space>

			<Table
				rowKey="id"
				dataSource={list}
				columns={columns}
				pagination={tablePagination(total, pageNo, pageSize, load)}
			/>
		</div>
	);
});
