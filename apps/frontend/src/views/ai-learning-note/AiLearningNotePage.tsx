import {
	Alert,
	Button,
	Input,
	message,
	Modal,
	Popconfirm,
	Space,
	Table,
	Tag,
	Typography,
} from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { DEFAULT_PAGE_SIZE, tablePagination } from '@/lib/table-pagination';
import {
	deleteAiLearningNoteApi,
	getAiLearningNotesApi,
} from '@/service';
import { useStore } from '@/store';

type LearningNoteRow = {
	id: string;
	userId: number;
	author: string;
	title: string | null;
	content: string;
	isPublic: boolean;
	createdAt: string;
	updatedAt: string;
};

function formatTime(v?: string | null) {
	if (!v) return '—';
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return v;
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const AiLearningNotePage = observer(function AiLearningNotePage() {
	const { authStore } = useStore();
	const isAdmin = authStore.isSuperAdmin;
	const [list, setList] = useState<LearningNoteRow[]>([]);
	const [total, setTotal] = useState(0);
	const [pageNo, setPageNo] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [title, setTitle] = useState('');
	const [error, setError] = useState('');
	const [previewContent, setPreviewContent] = useState<string | null>(null);

	const load = async (page = pageNo, size = pageSize) => {
		try {
			setError('');
			const res = await getAiLearningNotesApi({
				pageNo: page,
				pageSize: size,
				title: title || undefined,
			});
			const data = res.data as { list: LearningNoteRow[]; total: number };
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

	const columns = [
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
			width: 120,
			render: (v: string) => v || '—',
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
			render: (_: unknown, r: LearningNoteRow) => (
				<Space>
					<Button
						type="link"
						size="small"
						disabled={!r.content}
						className='px-0!'
						onClick={() => setPreviewContent(r.content)}
					>
						查看
					</Button>
					<Popconfirm
						title="确认删除？不可恢复"
						onConfirm={async () => {
							await deleteAiLearningNoteApi(r.id);
							message.success('已删除');
							load(pageNo, pageSize);
						}}
					>
						<Button danger type="link" size="small">
							删除
						</Button>
					</Popconfirm>
				</Space>
			),
		},
	];

	return (
		<div className="h-full flex flex-col">
			<div className="shrink-0 px-6 pt-6 pb-4">
				<div className="flex items-center justify-between gap-4 pb-4">
					<Typography.Text type="secondary">
						{isAdmin
							? `读取 dnhyxc-ai 业务库 english_learning_note · 共 ${total} 条`
							: authStore.userInfo?.aiUserId
								? `仅显示关联前台账号的学习笔记 · 共 ${total} 条`
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
					pagination={tablePagination(total, pageNo, pageSize, (p, s) =>
						load(p, s),
					)}
					scroll={{ x: 1000 }}
					locale={{ emptyText: error ? ' ' : '暂无数据' }}
					columns={columns}
				/>
			</div>

			<Modal
				title="笔记内容"
				open={previewContent !== null}
				onCancel={() => setPreviewContent(null)}
				footer={null}
				width={800}
				styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
			>
				{previewContent !== null && (
					<div
						className="prose prose-sm max-w-none"
						dangerouslySetInnerHTML={{ __html: previewContent }}
					/>
				)}
			</Modal>
		</div>
	);
});
