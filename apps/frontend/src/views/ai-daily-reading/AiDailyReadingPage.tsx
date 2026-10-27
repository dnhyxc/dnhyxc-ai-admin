import { ReloadOutlined } from '@ant-design/icons';
import { Button, message, Popconfirm, Table, Tabs, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { deleteAiDailyReadingApi, getAiDailyReadingsApi } from '@/service';
import { useStore } from '@/store';

type TabKey = 'ready' | 'gap';

type GapRow = {
	publishDate: string;
	status: 'missing' | 'generating' | 'exhausted' | 'failed';
	theme: string;
	attemptCount: number;
	lastError: string | null;
	tokens: number;
	enqueuedAt: string | null;
};

type ReadyRow = {
	publishDate: string;
	status: 'ready';
	theme: string;
	titleEn: string;
	titleZh: string;
	attemptCount: number;
	tokens: number;
	createdAt: string;
};

const STATUS_LABEL: Record<GapRow['status'], string> = {
	missing: '缺失',
	generating: '生成中',
	exhausted: '已耗尽',
	failed: '失败',
};

function formatTime(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	const p = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

export function AiDailyReadingPage() {
	const navigate = useNavigate();
	const { noticeStore } = useStore();
	const [params, setParams] = useSearchParams();
	const tab: TabKey = params.get('tab') === 'gap' ? 'gap' : 'ready';
	const [gaps, setGaps] = useState<GapRow[]>([]);
	const [ready, setReady] = useState<ReadyRow[]>([]);

	const load = (kind: TabKey) => {
		noticeStore.setPageLoading(true);
		getAiDailyReadingsApi({ kind })
			.then((res) => {
				const rows = (res.data as GapRow[] | ReadyRow[]) ?? [];
				if (kind === 'ready') setReady(rows as ReadyRow[]);
				else setGaps(rows as GapRow[]);
			})
			.catch(() => {
				if (kind === 'ready') setReady([]);
				else setGaps([]);
			})
			.finally(() => noticeStore.setPageLoading(false));
	};

	useEffect(() => {
		load(tab);
		return () => noticeStore.setPageLoading(false);
	}, [tab]);

	const open = (publishDate: string) => {
		navigate(`/ai-daily-reading/${publishDate}?tab=${tab}`);
	};

	const remove = async (publishDate: string) => {
		await deleteAiDailyReadingApi(publishDate);
		message.success('已删除');
		load('ready');
	};

	return (
		<div className="h-full flex flex-col">
			<div className="shrink-0 px-6 pt-6 pb-4">
				<Tabs
					activeKey={tab}
					onChange={(key) => setParams({ tab: key })}
					items={[
						{ key: 'ready', label: '成功' },
						{ key: 'gap', label: '失败' },
					]}
					className="[&_.ant-tabs-tab]:pt-0!"
				/>
				<div className="flex items-center justify-between gap-4">
					<Typography.Text type="secondary">
						{tab === 'ready'
							? '已经生成成功的系统日推。点一行查看，可删除。'
							: '从最早一篇系统日推到今天，还没有生成成功的日期。点一行查看原因。'}
					</Typography.Text>
					<Button
						type="text"
						icon={<ReloadOutlined />}
						title="刷新列表"
						aria-label="刷新列表"
						onClick={() => load(tab)}
					/>
				</div>
			</div>
			<div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
				{tab === 'ready' ? (
					<Table<ReadyRow>
						rowKey="publishDate"
						dataSource={ready}
						pagination={false}
						onRow={(row) => ({
							onClick: () => open(row.publishDate),
							style: { cursor: 'pointer' },
						})}
						columns={[
							{ title: '日期', dataIndex: 'publishDate', width: 140 },
							{
								title: '标题',
								dataIndex: 'titleZh',
								ellipsis: true,
								render: (value: string, row) => value || row.titleEn || '—',
							},
							{ title: '主题', dataIndex: 'theme', ellipsis: true },
							{ title: 'token', dataIndex: 'tokens', width: 100 },
							{
								title: '生成时间',
								dataIndex: 'createdAt',
								width: 180,
								render: (value: string) => formatTime(value),
							},
							{
								title: '操作',
								key: 'action',
								width: 80,
								render: (_: unknown, row) => (
									<span onClick={(event) => event.stopPropagation()}>
										<Popconfirm
											title="确认删除这篇日推？删除后前台不再展示"
											onConfirm={() => remove(row.publishDate)}
										>
											<Button danger type="link" size="small" className="px-0!">
												删除
											</Button>
										</Popconfirm>
									</span>
								),
							},
						]}
					/>
				) : (
					<Table<GapRow>
						rowKey="publishDate"
						dataSource={gaps}
						pagination={false}
						onRow={(row) => ({
							onClick: () => open(row.publishDate),
							style: { cursor: 'pointer' },
						})}
						columns={[
							{ title: '日期', dataIndex: 'publishDate', width: 140 },
							{
								title: '状态',
								dataIndex: 'status',
								width: 100,
								render: (status: GapRow['status']) => STATUS_LABEL[status],
							},
							{ title: '主题', dataIndex: 'theme', ellipsis: true },
							{ title: '失败次数', dataIndex: 'attemptCount', width: 100 },
							{
								title: '原因',
								dataIndex: 'lastError',
								ellipsis: true,
								render: (value: string | null) => value || '—',
							},
							{ title: 'token', dataIndex: 'tokens', width: 100 },
							{
								title: '最近入队',
								dataIndex: 'enqueuedAt',
								width: 180,
								render: (value: string | null) => formatTime(value),
							},
						]}
					/>
				)}
			</div>
		</div>
	);
}
