import { Alert, Button, Input, Space, Table, Tag, Typography } from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { DEFAULT_PAGE_SIZE, tablePagination } from '@/lib/table-pagination';
import { getAiEbooksApi } from '@/service';
import { useStore } from '@/store';

type AiEbookRow = {
	id: string;
	title: string;
	author: string | null;
	fmt: string;
	size: string | null;
	isPublic: boolean;
	parseStatus: string | null;
	totalWordCount: number | null;
	createdAt: string;
	user?: { id: number; username: string; email: string } | null;
};

function formatBytes(v?: string | null) {
	const n = Number(v);
	if (!Number.isFinite(n) || n <= 0) return '—';
	const units = ['B', 'KB', 'MB', 'GB'];
	let i = 0;
	let size = n;
	while (size >= 1024 && i < units.length - 1) {
		size /= 1024;
		i += 1;
	}
	return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatTime(v?: string) {
	if (!v) return '—';
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return v;
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const AiEbooksPage = observer(function AiEbooksPage() {
	const { authStore } = useStore();
	const isAdmin = authStore.isSuperAdmin;
	const [list, setList] = useState<AiEbookRow[]>([]);
	const [total, setTotal] = useState(0);
	const [pageNo, setPageNo] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [title, setTitle] = useState('');
	const [username, setUsername] = useState('');
	const [error, setError] = useState('');

	const load = async (page = pageNo, size = pageSize) => {
		try {
			setError('');
			const res = await getAiEbooksApi({
				pageNo: page,
				pageSize: size,
				title: title || undefined,
				username: isAdmin ? username || undefined : undefined,
			});
			const data = res.data as { list: AiEbookRow[]; total: number };
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
						{isAdmin
							? `读取 dnhyxc-ai 业务库 ebook_book · 共 ${total} 本`
							: authStore.userInfo?.aiUserId
								? `仅显示关联前台账号的书籍 · 共 ${total} 本`
								: '尚未绑定前台账号'}
					</Typography.Text>
					<Space wrap>
						<Input
							placeholder="书名"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							style={{ width: 180 }}
							allowClear
						/>
						{isAdmin && (
							<Input
								placeholder="用户名"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								style={{ width: 160 }}
								allowClear
							/>
						)}
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
					pagination={tablePagination(total, pageNo, pageSize, load)}
					scroll={{ x: 1100 }}
					locale={{ emptyText: error ? ' ' : '暂无数据' }}
					columns={[
						{
							title: '书名',
							dataIndex: 'title',
							ellipsis: true,
						},
						{
							title: '作者',
							dataIndex: 'author',
							width: 140,
							ellipsis: true,
							render: (v: string | null) => v || '—',
						},
						{
							title: '所属用户',
							width: 140,
							render: (_, r) => r.user?.username || '—',
						},
						{
							title: '格式',
							dataIndex: 'fmt',
							width: 90,
							render: (v: string) => <Tag>{(v || '').toUpperCase()}</Tag>,
						},
						{
							title: '大小',
							dataIndex: 'size',
							width: 100,
							render: (v: string | null) => formatBytes(v),
						},
						{
							title: '公开',
							dataIndex: 'isPublic',
							width: 80,
							render: (v: boolean) =>
								v ? <Tag color="success">是</Tag> : <Tag>否</Tag>,
						},
						{
							title: '解析',
							dataIndex: 'parseStatus',
							width: 100,
							render: (v: string | null) => {
								if (!v) return '—';
								const color =
									v === 'ready'
										? 'success'
										: v === 'failed'
											? 'error'
											: 'default';
								return <Tag color={color}>{v}</Tag>;
							},
						},
						{
							title: '添加时间',
							dataIndex: 'createdAt',
							width: 180,
							render: (v: string) => formatTime(v),
						},
					]}
				/>
			</div>
		</div>
	);
});
