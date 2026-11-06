import { NotePreview } from '@dnhyxc-ai/richtext-kit/preview';
import {
	isLargeNoteHtml,
	WindowedNotePreview,
} from '@dnhyxc-ai/richtext-kit/windowed';
import '@dnhyxc-ai/richtext-kit/styles.css';
import { Button, message, Tag, Typography } from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
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
		const [loading, setLoading] = useState(true);

		useEffect(() => {
			if (!id) return;
			setLoading(true);
			noticeStore.setPageLoading(true);
			getAiLearningNoteApi(id)
				.then((res) => setRow(res.data as LearningNoteDetail))
				.catch((e: any) => {
					setRow(null);
					message.error(e?.message || '笔记不存在');
				})
				.finally(() => {
					setLoading(false);
					noticeStore.setPageLoading(false);
				});
			return () => noticeStore.setPageLoading(false);
		}, [id]);

		const title = row?.title?.trim() || '无标题';
		const html = row?.content || '';
		const large = Boolean(html && isLargeNoteHtml(html));

		const meta = row ? (
			<span className="text-sm text-muted-foreground">
				{row.author} · {row.isPublic ? '公开' : '私有'} · 创建{' '}
				{formatTime(row.createdAt)} · 更新 {formatTime(row.updatedAt)}
			</span>
		) : null;

		const headerExtra = (
			<div className="flex items-center gap-2 py-2">
				{row ? (
					row.isPublic ? (
						<Tag color="success" className="m-0!">
							公开
						</Tag>
					) : (
						<Tag className="m-0!">私有</Tag>
					)
				) : null}
				<Button size="small" onClick={() => navigate('/ai-learning-note')}>
					返回列表
				</Button>
			</div>
		);

		return (
			<div className="absolute inset-0 flex flex-col overflow-hidden px-6 py-6">
				<div className="admin-richtext-preview flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-(--color-border)">
					{!row && !loading ? (
						<div className="p-6">
							<Typography.Text type="secondary">暂无数据</Typography.Text>
						</div>
					) : large ? (
						<NotePreview
							key={row?.id}
							title={title}
							meta={meta}
							headerExtra={headerExtra}
							loading={loading}
							className="min-h-0 flex-1"
						>
							<WindowedNotePreview html={html} />
						</NotePreview>
					) : (
						<NotePreview
							key={row?.id}
							title={title}
							html={html}
							meta={meta}
							headerExtra={headerExtra}
							loading={loading}
							className="min-h-0 flex-1"
						/>
					)}
				</div>
			</div>
		);
	},
);
