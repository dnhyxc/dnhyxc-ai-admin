import { Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { getLogsApi } from '@/service';

type LogRow = {
	id: number;
	path: string;
	method: string;
	action: string;
	result: number;
	createTime: string;
	user?: { username: string } | null;
};

export function LogsPage() {
	const [list, setList] = useState<LogRow[]>([]);
	const [total, setTotal] = useState(0);

	useEffect(() => {
		getLogsApi({ pageNo: 1, pageSize: 50 }).then((res) => {
			const data = res.data as { list: LogRow[]; total: number };
			setList(data.list);
			setTotal(data.total);
		});
	}, []);

	return (
		<div>
			<Typography.Title level={3} style={{ marginTop: 0 }}>
				操作日志
			</Typography.Title>
			<Typography.Paragraph type="secondary">共 {total} 条</Typography.Paragraph>
			<Table
				rowKey="id"
				dataSource={list}
				pagination={false}
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
						title: '时间',
						dataIndex: 'createTime',
						render: (v: string) =>
							v ? new Date(v).toLocaleString('zh-CN') : '—',
					},
				]}
			/>
		</div>
	);
}
