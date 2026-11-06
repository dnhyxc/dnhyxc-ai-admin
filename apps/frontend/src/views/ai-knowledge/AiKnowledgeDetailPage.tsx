import { Button, message, Typography } from 'antd';
import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { getAiKnowledgeDetailApi } from '@/service';
import { useStore } from '@/store';

type KnowledgeDetail = {
	id: string;
	title: string | null;
	content: string | null;
	author: string | null;
	createdAt: string;
	updatedAt: string;
};

export const AiKnowledgeDetailPage = observer(function AiKnowledgeDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { noticeStore } = useStore();
	const [row, setRow] = useState<KnowledgeDetail | null>(null);

	useEffect(() => {
		if (!id) return;
		noticeStore.setPageLoading(true);
		getAiKnowledgeDetailApi(id)
			.then((res) => setRow(res.data as KnowledgeDetail))
			.catch((e: any) => {
				setRow(null);
				message.error(e?.message || '知识文章不存在');
			})
			.finally(() => noticeStore.setPageLoading(false));
	}, [id]);

	return (
		<div className="h-full flex flex-col px-6 py-6">
			<div className="shrink-0 flex items-center gap-3 mb-4">
				<Button onClick={() => navigate('/ai-knowledge')}>返回列表</Button>
				<Typography.Title level={4} className="!m-0">
					{row?.title || '知识详情'}
				</Typography.Title>
			</div>
			<div className="flex-1 min-h-0 overflow-auto rounded border border-neutral-200 p-4 bg-white">
				{row ? (
					<pre className="whitespace-pre-wrap text-sm m-0 font-sans">
						{row.content || '（无正文）'}
					</pre>
				) : (
					<Typography.Text type="secondary">暂无数据</Typography.Text>
				)}
			</div>
		</div>
	);
});
