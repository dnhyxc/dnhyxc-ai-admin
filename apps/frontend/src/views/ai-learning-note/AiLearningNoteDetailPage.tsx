import { Button, Tag, Typography, message } from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ScrollArea } from '@/components/ui';
import { getAiLearningNoteApi } from '@/service';
import { useStore } from '@/store';

type LearningNoteDetail = {
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

export const AiLearningNoteDetailPage = observer(
	function AiLearningNoteDetailPage() {
		const { id } = useParams<{ id: string }>();
		const navigate = useNavigate();
		const { noticeStore } = useStore();
		const [row, setRow] = useState<LearningNoteDetail | null>(null);

		useEffect(() => {
			if (!id) return;
			noticeStore.setPageLoading(true);
			getAiLearningNoteApi(id)
				.then((res) => setRow(res.data as LearningNoteDetail))
				.catch((e: any) => {
					setRow(null);
					message.error(e?.message || '笔记不存在');
				})
				.finally(() => noticeStore.setPageLoading(false));
			return () => noticeStore.setPageLoading(false);
		}, [id]);

		return (
			<div className="h-full flex flex-col">
				<div className="shrink-0 px-6 pt-6 pb-4">
					<div className="flex items-center gap-3 flex-wrap">
						<Button onClick={() => navigate('/ai-learning-note')}>
							返回列表
						</Button>
						<Typography.Title level={4} className="!m-0 truncate">
							{row?.title || '笔记详情'}
						</Typography.Title>
						{row ? (
							row.isPublic ? (
								<Tag color="success">公开</Tag>
							) : (
								<Tag>私有</Tag>
							)
						) : null}
					</div>
					{row ? (
						<Typography.Text type="secondary" className="mt-2 block text-sm">
							{row.author} · 创建 {formatTime(row.createdAt)} · 更新{' '}
							{formatTime(row.updatedAt)}
						</Typography.Text>
					) : null}
				</div>

				<div className="flex-1 min-h-0 overflow-hidden px-6 pb-6">
					<div className="h-full min-h-0 rounded border border-[color:var(--color-border)] bg-[color:var(--color-card)] overflow-hidden">
						{row ? (
							row.content?.trim() ? (
								<ScrollArea className="h-full min-h-0 w-full">
									<div
										className="admin-rich-text p-6"
										dangerouslySetInnerHTML={{ __html: row.content }}
									/>
								</ScrollArea>
							) : (
								<div className="p-6">
									<Typography.Text type="secondary">内容为空</Typography.Text>
								</div>
							)
						) : (
							<div className="p-6">
								<Typography.Text type="secondary">暂无数据</Typography.Text>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	},
);
