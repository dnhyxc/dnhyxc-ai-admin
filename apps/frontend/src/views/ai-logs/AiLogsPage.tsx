import {
	Button,
	Input,
	message,
	Popconfirm,
	Space,
	Table,
	Tag,
	Tooltip,
	Typography,
} from 'antd';
import { type Key, useEffect, useState } from 'react';
import { DEFAULT_PAGE_SIZE, tablePagination } from '@/lib/table-pagination';
import { deleteAiLogApi, deleteAiLogsApi, getAiLogsApi } from '@/service';
import { useStore } from '@/store';

type AiLogRow = {
	id: number;
	path: string;
	method: string;
	data: string;
	responseData?: string | null;
	result: number;
	createTime: string;
	user?: { username: string } | null;
};

function formatRequestTime(v?: string) {
	if (!v) return '—';
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return v;
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function formatJsonData(v?: string | null) {
	if (!v) return '';
	try {
		return JSON.stringify(JSON.parse(v), null, 2);
	} catch {
		return v;
	}
}

function renderDataCell(v?: string | null) {
	if (!v) return '—';
	const pretty = formatJsonData(v);
	return (
		<Tooltip
			placement="topLeft"
			overlayStyle={{ maxWidth: 480 }}
			title={
				<pre
					style={{
						margin: 0,
						maxHeight: 280,
						overflow: 'auto',
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-word',
						fontSize: 12,
						lineHeight: 1.5,
					}}
				>
					{pretty}
				</pre>
			}
		>
			<span>{v}</span>
		</Tooltip>
	);
}

export function AiLogsPage() {
	const { noticeStore } = useStore();
	const [list, setList] = useState<AiLogRow[]>([]);
	const [total, setTotal] = useState(0);
	const [pageNo, setPageNo] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [path, setPath] = useState('');
	const [username, setUsername] = useState('');
	const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

	const load = async (page = pageNo, size = pageSize) => {
		noticeStore.setPageLoading(true);
		try {
			noticeStore.hide();
			const res = await getAiLogsApi({
				pageNo: page,
				pageSize: size,
				path: path || undefined,
				username: username || undefined,
			});
			const data = res.data as { list: AiLogRow[]; total: number };
			setList(data.list);
			setTotal(data.total);
			setPageNo(page);
			setPageSize(size);
			setSelectedRowKeys([]);
		} catch (e: any) {
			setList([]);
			setTotal(0);
			setSelectedRowKeys([]);
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

	return (
		<div className="h-full flex flex-col">
			<div className="shrink-0 px-6 pt-6 pb-4">
				<div className="flex items-center justify-between gap-4 pb-4">
					<Typography.Text type="secondary">
						读取 dnhyxc-ai 业务库 logs · 共 {total} 条
					</Typography.Text>
					<Space wrap>
						<Input
							placeholder="路径"
							value={path}
							onChange={(e) => setPath(e.target.value)}
							style={{ width: 300 }}
							allowClear
						/>
						<Input
							placeholder="用户名"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							style={{ width: 300 }}
							allowClear
						/>
						<Button type="primary" onClick={() => load(1, pageSize)}>
							查询
						</Button>
						<Popconfirm
							title={`确认删除选中的 ${selectedRowKeys.length} 条？`}
							disabled={!selectedRowKeys.length}
							onConfirm={async () => {
								await deleteAiLogsApi(selectedRowKeys.map(Number));
								message.success('已删除');
								load();
							}}
						>
							<Button danger disabled={!selectedRowKeys.length}>
								批量删除
							</Button>
						</Popconfirm>
					</Space>
				</div>
			</div>

			<div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
				<Table
					rowKey="id"
					dataSource={list}
					pagination={tablePagination(total, pageNo, pageSize, load)}
					locale={{ emptyText: noticeStore.visible ? ' ' : '暂无数据' }}
					rowSelection={{
						selectedRowKeys,
						onChange: setSelectedRowKeys,
					}}
					columns={[
						{ title: 'ID', dataIndex: 'id', width: 80 },
						{
							title: '用户',
							width: 120,
							render: (_, r) => r.user?.username || '—',
						},
						{
							title: '方法',
							dataIndex: 'method',
							width: 90,
							render: (v: string) => <Tag>{v}</Tag>,
						},
						{ title: '路径', dataIndex: 'path', ellipsis: true },
						{
							title: '结果',
							dataIndex: 'result',
							width: 80,
							render: (v: number) => (
								<Tag color={v >= 200 && v < 400 ? 'success' : 'error'}>{v}</Tag>
							),
						},
						{
							title: '请求数据',
							dataIndex: 'data',
							ellipsis: { showTitle: false },
							render: (v: string) => renderDataCell(v),
						},
						{
							title: '响应数据',
							dataIndex: 'responseData',
							ellipsis: { showTitle: false },
							render: (v: string) => renderDataCell(v),
						},
						{
							title: '请求时间',
							dataIndex: 'createTime',
							width: 180,
							render: (v: string) => formatRequestTime(v),
						},
						{
							title: '操作',
							width: 90,
							fixed: 'right',
							render: (_, r) => (
								<Popconfirm
									title="确认删除？"
									onConfirm={async () => {
										await deleteAiLogApi(r.id);
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
					]}
				/>
			</div>
		</div>
	);
}
