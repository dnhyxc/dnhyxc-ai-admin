import { Button, message, Popconfirm, Space, Table, Typography } from 'antd';
import { type Key, useEffect, useState } from 'react';
import { DEFAULT_PAGE_SIZE, tablePagination } from '@/lib/table-pagination';
import { deleteLogApi, deleteLogsApi, getLogsApi } from '@/service';

type LogRow = {
	id: number;
	path: string;
	method: string;
	action: string;
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

export function LogsPage() {
	const [list, setList] = useState<LogRow[]>([]);
	const [total, setTotal] = useState(0);
	const [pageNo, setPageNo] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

	const load = async (page = pageNo, size = pageSize) => {
		const res = await getLogsApi({ pageNo: page, pageSize: size });
		const data = res.data as { list: LogRow[]; total: number };
		setList(data.list);
		setTotal(data.total);
		setPageNo(page);
		setPageSize(size);
		setSelectedRowKeys([]);
	};

	useEffect(() => {
		load(1, DEFAULT_PAGE_SIZE);
	}, []);

	return (
		<div>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					gap: 16,
					marginBottom: 16,
				}}
			>
				<Typography.Text type="secondary">共 {total} 条</Typography.Text>
				<Space>
					<Popconfirm
						title={`确认删除选中的 ${selectedRowKeys.length} 条？`}
						disabled={!selectedRowKeys.length}
						onConfirm={async () => {
							await deleteLogsApi(selectedRowKeys.map(Number));
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
			<Table
				rowKey="id"
				dataSource={list}
				pagination={tablePagination(total, pageNo, pageSize, load)}
				rowSelection={{
					selectedRowKeys,
					onChange: setSelectedRowKeys,
				}}
				columns={[
					{ title: 'ID', dataIndex: 'id', width: 80 },
					{
						title: '用户',
						render: (_, r) => r.user?.username || '—',
					},
					{ title: '动作', dataIndex: 'action' },
					{ title: '方法', dataIndex: 'method', width: 90 },
					{ title: '路径', dataIndex: 'path' },
					{ title: '结果', dataIndex: 'result', width: 80 },
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
									await deleteLogApi(r.id);
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
	);
}
