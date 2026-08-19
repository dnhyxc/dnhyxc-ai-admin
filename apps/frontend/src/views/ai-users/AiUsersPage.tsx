import { Alert, Button, Input, Space, Table, Tag, Typography } from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { DEFAULT_PAGE_SIZE, tablePagination } from '@/lib/table-pagination';
import { getAiUsersApi } from '@/service';
import { useStore } from '@/store';

type AiUser = {
	id: number;
	username: string;
	email: string;
	isMember: boolean;
	membershipType: string;
	memberExpiresAt: string | null;
	createTime: string | null;
	roles?: Array<{ id: number; name: string }>;
};

export const AiUsersPage = observer(function AiUsersPage() {
	const { themeStore } = useStore();
	const [list, setList] = useState<AiUser[]>([]);
	const [total, setTotal] = useState(0);
	const [pageNo, setPageNo] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [username, setUsername] = useState('');
	const [error, setError] = useState('');

	const load = async (page = pageNo, size = pageSize) => {
		try {
			setError('');
			const res = await getAiUsersApi({
				pageNo: page,
				pageSize: size,
				username: username || undefined,
			});
			const data = res.data as { list: AiUser[]; total: number };
			setList(data.list);
			setTotal(data.total);
			setPageNo(page);
			setPageSize(size);
		} catch (e: any) {
			setList([]);
			setTotal(0);
			setError(
				e?.message ||
					'AI 业务库不可用，请确认 AI_DB_ENABLED=true 且 dnhyxc-ai MySQL 已启动',
			);
		}
	};

	useEffect(() => {
		load(1, DEFAULT_PAGE_SIZE);
	}, []);

	return (
		<div className="h-full flex flex-col">
			<div className="shrink-0 px-6 pt-6 pb-4">
				<div className="flex items-center justify-between gap-4 pb-4">
					<Typography.Text type="secondary">
						读取 dnhyxc-ai 业务库 · 共 {total} 人
					</Typography.Text>
					<Space wrap>
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
				</div>
				{error && (
					<div className="pb-4">
						<Alert type="warning" showIcon message={error} />
					</div>
				)}
			</div>

			<div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
				<Table
					rowKey="id"
					dataSource={list}
					locale={{ emptyText: error ? ' ' : '暂无数据' }}
					pagination={tablePagination(total, pageNo, pageSize, load)}
					scroll={{ x: 1100 }}
					columns={[
						{ title: 'ID', dataIndex: 'id', width: 80 },
						{ title: '用户名', dataIndex: 'username' },
						{ title: '邮箱', dataIndex: 'email' },
						{
							title: '角色',
							dataIndex: 'roles',
							render: (roles: AiUser['roles']) =>
								roles?.length
									? roles.map((r) => (
											<Tag key={r.id} color={r.id === 1 ? 'gold' : 'default'}>
												{r.name}
											</Tag>
										))
									: '—',
						},
						{
							title: '会员',
							dataIndex: 'isMember',
							render: (v: boolean) =>
								v ? <Tag color="success">是</Tag> : <Tag>否</Tag>,
						},
						{
							title: '类型',
							dataIndex: 'membershipType',
							render: (v: string) => {
								const map: Record<string, string> = {
									free: '免费用户',
									premium: '高级会员',
									basic: '基础会员',
									vip: 'VIP会员',
									svip: 'SVIP会员',
									trial: '试用会员',
								};
								const label = map[v] ?? v;
								return v === 'free' ? (
									<Tag>{label}</Tag>
								) : (
									<Tag color={themeStore.primaryColor}>{label}</Tag>
								);
							},
						},
						{
							title: '注册时间',
							dataIndex: 'createTime',
							render: (v: string | null) =>
								v ? new Date(v).toLocaleString('zh-CN') : '—',
						},
					]}
				/>
			</div>
		</div>
	);
});
