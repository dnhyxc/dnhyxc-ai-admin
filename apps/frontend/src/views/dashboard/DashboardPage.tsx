import { Card, Col, Row, Statistic, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { overviewApi } from '@/service';

type Overview = {
	adminUsers: number;
	roles: number;
	menus: number;
	logs: number;
	aiUsers: number | null;
	aiDb: { connected: boolean; message: string };
};

export function DashboardPage() {
	const [data, setData] = useState<Overview | null>(null);

	useEffect(() => {
		overviewApi().then((res) => setData(res.data as Overview));
	}, []);

	const cards = [
		{ title: '管理员', value: data?.adminUsers },
		{ title: '角色', value: data?.roles },
		{ title: '菜单', value: data?.menus },
		{ title: '操作日志', value: data?.logs },
		{
			title: 'AI 用户',
			value: data?.aiDb.connected ? data.aiUsers : undefined,
			extra: data?.aiDb.connected ? (
				<Tag color="success">已连接</Tag>
			) : (
				<Tag>{data?.aiDb.message || '未启用'}</Tag>
			),
		},
	];

	return (
		<div>
			<Typography.Title level={3} style={{ marginTop: 0 }}>
				仪表盘
			</Typography.Title>
			<Typography.Paragraph type="secondary">
				系统概览与业务库状态
			</Typography.Paragraph>
			<Row gutter={[16, 16]}>
				{cards.map((c) => (
					<Col xs={24} sm={12} xl={8} xxl={4} key={c.title}>
						<Card>
							<Statistic title={c.title} value={c.value ?? '—'} />
							{c.extra && <div style={{ marginTop: 8 }}>{c.extra}</div>}
						</Card>
					</Col>
				))}
			</Row>
		</div>
	);
}
