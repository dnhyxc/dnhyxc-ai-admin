import { Alert, Button, Input, Space, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { getAiUsersApi } from '@/service';

type AiUser = {
	id: number;
	username: string;
	email: string;
	isMember: boolean;
	membershipType: string;
	memberExpiresAt: string | null;
	createTime: string | null;
};

export function AiUsersPage() {
	const [list, setList] = useState<AiUser[]>([]);
	const [total, setTotal] = useState(0);
	const [username, setUsername] = useState('');
	const [error, setError] = useState('');

	const load = async () => {
		try {
			setError('');
			const res = await getAiUsersApi({ pageNo: 1, pageSize: 50, username });
			const data = res.data as { list: AiUser[]; total: number };
			setList(data.list);
			setTotal(data.total);
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
		load();
	}, []);

	return (
		<div>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'flex-end',
					gap: 16,
					marginBottom: 16,
				}}
			>
				<div>
					<Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
						AI 用户
					</Typography.Title>
					<Typography.Text type="secondary">
						读取 dnhyxc-ai 业务库 · 共 {total} 人
					</Typography.Text>
				</div>
				<Space>
					<Input
						placeholder="搜索用户名"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						style={{ width: 200 }}
						allowClear
					/>
					<Button onClick={load}>查询</Button>
				</Space>
			</div>

			{error && (
				<Alert
					type="warning"
					showIcon
					message={error}
					style={{ marginBottom: 16 }}
				/>
			)}

			<Table
				rowKey="id"
				dataSource={list}
				pagination={false}
				locale={{ emptyText: error ? ' ' : '暂无数据' }}
				columns={[
					{ title: 'ID', dataIndex: 'id', width: 80 },
					{ title: '用户名', dataIndex: 'username' },
					{ title: '邮箱', dataIndex: 'email' },
					{
						title: '会员',
						dataIndex: 'isMember',
						render: (v: boolean) =>
							v ? <Tag color="success">是</Tag> : <Tag>否</Tag>,
					},
					{ title: '类型', dataIndex: 'membershipType' },
					{
						title: '注册时间',
						dataIndex: 'createTime',
						render: (v: string | null) =>
							v ? new Date(v).toLocaleString('zh-CN') : '—',
					},
				]}
			/>
		</div>
	);
}
