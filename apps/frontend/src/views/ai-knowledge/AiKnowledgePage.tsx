import {
	Alert,
	Button,
	Input,
	message,
	Popconfirm,
	Space,
	Table,
	Tabs,
	Tag,
	Typography,
} from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { DEFAULT_PAGE_SIZE, tablePagination } from '@/lib/table-pagination';
import {
	deleteAiKnowledgeApi,
	deleteAiKnowledgeTrashApi,
	getAiKnowledgeApi,
	getAiKnowledgeTrashApi,
} from '@/service';
import { useStore } from '@/store';

type AiKnowledgeRow = {
	id: string;
	title: string | null;
	author: string | null;
	authorId: number | null;
	isPublic: boolean;
	createdAt: string;
	updatedAt: string;
};

type AiKnowledgeTrashRow = {
	id: string;
	originalId: string;
	title: string | null;
	author: string | null;
	authorId: number | null;
	sourceCreatedAt: string | null;
	sourceUpdatedAt: string | null;
	deletedAt: string;
};

type AnyRow = AiKnowledgeRow | AiKnowledgeTrashRow;

type TabKey = 'list' | 'trash';

function formatTime(v?: string) {
	if (!v) return '—';
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return v;
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const AiKnowledgePage = observer(function AiKnowledgePage() {
	const { authStore } = useStore();
	const isAdmin = authStore.isSuperAdmin;
	const [activeTab, setActiveTab] = useState<TabKey>('list');
	const [list, setList] = useState<AnyRow[]>([]);
	const [total, setTotal] = useState(0);
	const [pageNo, setPageNo] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [title, setTitle] = useState('');
	const [author, setAuthor] = useState('');
	const [error, setError] = useState('');

	const load = async (
		tab: TabKey = activeTab,
		page = pageNo,
		size = pageSize,
	) => {
		try {
			setError('');
			const api = tab === 'trash' ? getAiKnowledgeTrashApi : getAiKnowledgeApi;
			const res = await api({
				pageNo: page,
				pageSize: size,
				title: title || undefined,
				author: isAdmin ? author || undefined : undefined,
			});
			const data = res.data as { list: AnyRow[]; total: number };
			setList(data.list);
			setTotal(data.total);
			setPageNo(page);
			setPageSize(size);
			setActiveTab(tab);
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
		load('list', 1, DEFAULT_PAGE_SIZE);
	}, []);

	const tableName = activeTab === 'trash' ? 'knowledge_trash' : 'knowledge';

	const isTrash = activeTab === 'trash';

	const columns = isTrash
		? [
				{
					title: '标题',
					dataIndex: 'title',
					width: 260,
					ellipsis: true,
					fixed: 'left' as const,
					render: (v: string | null) => v || '—',
				},
				{
					title: '作者',
					dataIndex: 'author',
					width: 140,
					ellipsis: true,
					render: (v: string | null) => v || '—',
				},
				{
					title: '原创建时间',
					dataIndex: 'sourceCreatedAt',
					width: 180,
					render: (v: string | null) => formatTime(v ?? undefined),
				},
				{
					title: '原更新时间',
					dataIndex: 'sourceUpdatedAt',
					width: 180,
					render: (v: string | null) => formatTime(v ?? undefined),
				},
				{
					title: '删除时间',
					dataIndex: 'deletedAt',
					width: 180,
					render: (v: string) => formatTime(v),
				},
				{
					title: '操作',
					key: 'action',
					width: 120,
					fixed: 'right' as const,
					render: (_: unknown, r: AnyRow) => (
						<Popconfirm
							title="确认彻底删除？不可恢复"
							onConfirm={async () => {
								await deleteAiKnowledgeTrashApi(r.id);
								message.success('已删除');
								load(activeTab, pageNo, pageSize);
							}}
						>
							<Button danger type="link" size="small">
								彻底删除
							</Button>
						</Popconfirm>
					),
				},
			]
		: [
				{
					title: '标题',
					dataIndex: 'title',
					width: 260,
					ellipsis: true,
					fixed: 'left' as const,
					render: (v: string | null) => v || '—',
				},
				{
					title: '作者',
					dataIndex: 'author',
					width: 140,
					ellipsis: true,
					render: (v: string | null) => v || '—',
				},
				{
					title: '公开',
					dataIndex: 'isPublic',
					width: 80,
					render: (v: boolean) =>
						v ? <Tag color="success">是</Tag> : <Tag>否</Tag>,
				},
				{
					title: '创建时间',
					dataIndex: 'createdAt',
					width: 180,
					render: (v: string) => formatTime(v),
				},
				{
					title: '更新时间',
					dataIndex: 'updatedAt',
					width: 180,
					render: (v: string) => formatTime(v),
				},
				{
					title: '操作',
					key: 'action',
					width: 100,
					fixed: 'right' as const,
					render: (_: unknown, r: AnyRow) => (
						<Popconfirm
							title="确认删除？将移入回收站"
							onConfirm={async () => {
								await deleteAiKnowledgeApi(r.id);
								message.success('已删除');
								load(activeTab, pageNo, pageSize);
							}}
						>
							<Button danger type="link" size="small">
								删除
							</Button>
						</Popconfirm>
					),
				},
			];

	return (
		<div className="h-full flex flex-col">
			<div className="shrink-0 px-6 pt-6 pb-4">
				<div className="pb-4">
					<Tabs
						activeKey={activeTab}
						onChange={(k) => load(k as TabKey, 1, pageSize)}
						items={[
							{ key: 'list', label: '知识库列表' },
							{ key: 'trash', label: '回收站列表' },
						]}
						className="[&_.ant-tabs-tab]:pt-0!"
					/>
				</div>
				<div className="flex items-center justify-between gap-4 pb-4">
					<Typography.Text type="secondary">
						{isAdmin
							? `读取 dnhyxc-ai 业务库 ${tableName} · 共 ${total} 条`
							: authStore.userInfo?.aiUserId
								? `仅显示关联前台账号的知识库 · 共 ${total} 条`
								: '尚未绑定前台账号'}
					</Typography.Text>
					<Space wrap>
						<Input
							placeholder="标题"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							style={{ width: 180 }}
							allowClear
						/>
						{isAdmin && (
							<Input
								placeholder="作者"
								value={author}
								onChange={(e) => setAuthor(e.target.value)}
								style={{ width: 160 }}
								allowClear
							/>
						)}
						<Button type="primary" onClick={() => load(activeTab, 1, pageSize)}>
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
					pagination={tablePagination(total, pageNo, pageSize, (p, s) =>
						load(activeTab, p, s),
					)}
					scroll={{ x: 1400 }}
					locale={{ emptyText: error ? ' ' : '暂无数据' }}
					columns={columns}
				/>
			</div>
		</div>
	);
});
