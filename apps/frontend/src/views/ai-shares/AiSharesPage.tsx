import { Button, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { DEFAULT_PAGE_SIZE, tablePagination } from '@/lib/table-pagination';
import { getAiSharesApi } from '@/service';
import { useStore } from '@/store';

type ShareRow = {
	shareId: string;
	chatSessionId: string;
	shareType: string;
	sessionType: string | null;
	title: string | null;
	snapshotTruncated: boolean;
	createdBy: number | null;
	author: string;
	createdAt: string;
	expiresAt: string;
	revokedAt: string | null;
	viewCount: number;
};

function formatMs(v?: string | number | null) {
	if (v == null || v === '') return '—';
	const n = typeof v === 'number' ? v : Number(v);
	if (!Number.isFinite(n)) return String(v);
	const d = new Date(n);
	if (Number.isNaN(d.getTime())) return String(v);
	const p = (x: number) => String(x).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function statusOf(row: ShareRow): { label: string; color: string } {
	if (row.revokedAt) return { label: '已撤销', color: 'default' };
	const exp = Number(row.expiresAt);
	if (Number.isFinite(exp) && Date.now() > exp) {
		return { label: '已过期', color: 'warning' };
	}
	return { label: '有效', color: 'success' };
}

export const AiSharesPage = observer(function AiSharesPage() {
	const { authStore, noticeStore } = useStore();
	const navigate = useNavigate();
	const isAdmin = authStore.isSuperAdmin;
	const [list, setList] = useState<ShareRow[]>([]);
	const [total, setTotal] = useState(0);
	const [pageNo, setPageNo] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [title, setTitle] = useState('');
	const [shareType, setShareType] = useState<string | undefined>();

	const load = async (page = pageNo, size = pageSize) => {
		noticeStore.setPageLoading(true);
		try {
			noticeStore.hide();
			const res = await getAiSharesApi({
				pageNo: page,
				pageSize: size,
				title: title || undefined,
				shareType: shareType || undefined,
			});
			const data = res.data as { list: ShareRow[]; total: number };
			setList(data.list);
			setTotal(data.total);
			setPageNo(page);
			setPageSize(size);
		} catch (e: any) {
			setList([]);
			setTotal(0);
			noticeStore.show(
				e?.message ||
					'AI 业务库不可用，请确认 AI_DB_ENABLED=true 且 dnhyxc-ai MySQL 已启动',
			);
		} finally {
			noticeStore.setPageLoading(false);
		}
	};

	useEffect(() => {
		load(1, DEFAULT_PAGE_SIZE);
	}, []);

	const columns = [
		{
			title: '标题',
			dataIndex: 'title',
			width: 220,
			ellipsis: true,
			fixed: 'left' as const,
			render: (v: string | null) => v || '—',
		},
		{
			title: '类型',
			dataIndex: 'shareType',
			width: 100,
			render: (v: string, r: ShareRow) =>
				v === 'knowledge' ? (
					<Tag color="blue">知识</Tag>
				) : (
					<Tag color="purple">{r.sessionType || 'session'}</Tag>
				),
		},
		{
			title: '资源 ID',
			dataIndex: 'chatSessionId',
			width: 160,
			ellipsis: true,
		},
		{
			title: '打开次数',
			dataIndex: 'viewCount',
			width: 90,
		},
		{
			title: '创建者',
			dataIndex: 'author',
			width: 100,
		},
		{
			title: '状态',
			key: 'status',
			width: 90,
			render: (_: unknown, r: ShareRow) => {
				const s = statusOf(r);
				return <Tag color={s.color}>{s.label}</Tag>;
			},
		},
		{
			title: '创建时间',
			dataIndex: 'createdAt',
			width: 170,
			render: (v: string) => formatMs(v),
		},
		{
			title: '过期时间',
			dataIndex: 'expiresAt',
			width: 170,
			render: (v: string) => formatMs(v),
		},
		{
			title: '操作',
			key: 'action',
			width: 80,
			fixed: 'right' as const,
			render: (_: unknown, r: ShareRow) => (
				<Button
					type="link"
					size="small"
					className="px-0!"
					onClick={() => navigate(`/ai-shares/${r.shareId}`)}
				>
					查看
				</Button>
			),
		},
	];

	return (
		<div className="h-full flex flex-col">
			<div className="shrink-0 px-6 pt-6 pb-4">
				<div className="flex items-center justify-between gap-4 pb-4">
					<Typography.Text type="secondary">
						{isAdmin
							? `读取 dnhyxc-ai 业务库 shares · 共 ${total} 条`
							: authStore.userInfo?.aiUserId
								? `仅显示关联前台账号创建的分享 · 共 ${total} 条`
								: '尚未绑定前台账号'}
					</Typography.Text>
					<Space wrap>
						<Select
							allowClear
							placeholder="类型"
							style={{ width: 120 }}
							value={shareType}
							onChange={(v) => setShareType(v)}
							options={[
								{ value: 'session', label: '会话' },
								{ value: 'knowledge', label: '知识' },
							]}
						/>
						<Input
							placeholder="标题"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							style={{ width: 240 }}
							allowClear
						/>
						<Button type="primary" onClick={() => load(1, pageSize)}>
							查询
						</Button>
					</Space>
				</div>
			</div>

			<div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
				<Table
					rowKey="shareId"
					dataSource={list}
					scroll={{ x: 1200 }}
					pagination={tablePagination(total, pageNo, pageSize, (p, s) =>
						load(p, s),
					)}
					locale={{ emptyText: noticeStore.visible ? ' ' : '暂无数据' }}
					columns={columns}
				/>
			</div>
		</div>
	);
});
