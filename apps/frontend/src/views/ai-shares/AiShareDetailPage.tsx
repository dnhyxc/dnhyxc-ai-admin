import { Button, Tag, Typography, message } from 'antd';
import {
	ArrowDownToLine,
	ArrowUpToLine,
	Check,
	Copy,
	Paperclip,
} from 'lucide-react';
import { observer } from 'mobx-react';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useNavigate, useParams } from 'react-router';
import Markdown from '@/components/Markdown';
import { cn } from '@/lib/utils';
import { getAiShareApi } from '@/service';
import { useStore } from '@/store';

type ShareAttachment = {
	id?: string;
	uuid?: string;
	filename?: string;
	originalname?: string;
	mimetype?: string;
	size?: number;
	path?: string;
};

type ShareMessage = {
	id: string;
	chatId: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp?: number;
	attachments?: ShareAttachment[] | null;
};

type ShareDetail = {
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
	contentSnapshot: Record<string, unknown> | null;
	messageIds?: string[] | null;
};

/** 判定「已到底」允许的像素误差（避免子像素取整导致箭头来回跳） */
const SCROLL_BOTTOM_THRESHOLD = 48;

function formatMs(v?: string | number | null) {
	if (v == null || v === '') return '—';
	const n = typeof v === 'number' ? v : Number(v);
	if (!Number.isFinite(n)) return String(v);
	const d = new Date(n);
	if (Number.isNaN(d.getTime())) return String(v);
	const p = (x: number) => String(x).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function statusOf(row: ShareDetail): { label: string; color: string } {
	if (row.revokedAt) return { label: '已撤销', color: 'default' };
	const exp = Number(row.expiresAt);
	if (Number.isFinite(exp) && Date.now() > exp) {
		return { label: '已过期', color: 'warning' };
	}
	return { label: '有效', color: 'success' };
}

function knowledgeMarkdown(snap: Record<string, unknown> | null): string {
	if (!snap) return '';
	if (typeof snap.content === 'string') return snap.content;
	return '';
}

function normalizeShareMessages(raw: unknown[]): ShareMessage[] {
	return raw.map((item, index) => {
		const m = (item && typeof item === 'object' ? item : {}) as Record<
			string,
			unknown
		>;
		const id = String(m.id ?? m.chatId ?? index);
		const chatId = String(m.chatId ?? m.id ?? index);
		const roleRaw = String(m.role ?? 'user');
		const role: ShareMessage['role'] =
			roleRaw === 'assistant'
				? 'assistant'
				: roleRaw === 'system'
					? 'system'
					: 'user';
		const ts =
			typeof m.timestamp === 'number'
				? m.timestamp
				: typeof m.createdAt === 'number'
					? m.createdAt
					: typeof m.createdAt === 'string'
						? Date.parse(m.createdAt)
						: undefined;
		return {
			id,
			chatId,
			role,
			content: String(m.content ?? ''),
			timestamp: Number.isFinite(ts) ? ts : undefined,
			attachments: Array.isArray(m.attachments)
				? (m.attachments as ShareAttachment[])
				: null,
		};
	});
}

/** 按 share.messageIds / 快照顺序对齐 SessionShare 展示链 */
function pickMessagesInShareIdsOrder(
	messages: ShareMessage[],
	orderedIds: string[],
): ShareMessage[] {
	const byId = new Map<string, ShareMessage>();
	for (const m of messages) {
		byId.set(m.id, m);
		byId.set(m.chatId, m);
	}
	const ordered = orderedIds
		.map((id) => byId.get(id))
		.filter((m): m is ShareMessage => m != null);
	if (ordered.length) return ordered;
	return messages;
}

function formatBytes(size?: number) {
	if (size == null || !Number.isFinite(size) || size < 0) return '';
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function SessionShareView({
	messages,
	shareId,
}: {
	messages: ShareMessage[];
	shareId: string;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [copiedId, setCopiedId] = useState('');
	const [scrollMetrics, setScrollMetrics] = useState({
		top: 0,
		scrollHeight: 0,
		clientHeight: 0,
	});

	const syncScrollMetrics = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		setScrollMetrics({
			top: el.scrollTop,
			scrollHeight: el.scrollHeight,
			clientHeight: el.clientHeight,
		});
	}, []);

	useEffect(() => {
		syncScrollMetrics();
		const id = requestAnimationFrame(() => syncScrollMetrics());
		return () => cancelAnimationFrame(id);
	}, [messages, syncScrollMetrics]);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => syncScrollMetrics());
		ro.observe(el);
		return () => ro.disconnect();
	}, [syncScrollMetrics]);

	useEffect(() => {
		return () => {
			if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
		};
	}, []);

	const onCopy = (content: string, chatId: string) => {
		void navigator.clipboard.writeText(content);
		setCopiedId(chatId);
		if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
		copyTimerRef.current = setTimeout(() => setCopiedId(''), 500);
	};

	const { top: scrollTop, scrollHeight, clientHeight } = scrollMetrics;
	const maxScroll = Math.max(0, scrollHeight - clientHeight);
	const canScroll = maxScroll > 4;
	const atBottom =
		!canScroll ||
		scrollTop + clientHeight >= scrollHeight - SCROLL_BOTTOM_THRESHOLD;

	const onScrollFabClick = () => {
		const el = scrollRef.current;
		if (!el || !canScroll) return;
		el.scrollTo({
			top: atBottom ? 0 : el.scrollHeight,
			behavior: 'auto',
		});
	};

	return (
		<div className="relative h-full min-h-0">
			<div
				ref={scrollRef}
				className="h-full overflow-auto px-3 py-4"
				onScroll={syncScrollMetrics}
			>
				<div className="mx-auto w-full max-w-3xl flex flex-col gap-6 min-w-0">
					{messages.map((message, index) => {
						const isUser = message.role === 'user';
						return (
							<div
								key={message.chatId || message.id}
								id={`message-${message.chatId || message.id}`}
								style={{ zIndex: messages.length - index }}
								className={cn(
									'relative flex flex-col gap-1 w-full group',
									isUser ? 'items-end' : 'items-stretch',
								)}
							>
								{!!message.attachments?.length && isUser ? (
									<div className="flex flex-wrap justify-end gap-1.5 mb-1">
										{message.attachments.map((file, i) => {
											const name =
												file.originalname ||
												file.filename ||
												file.path ||
												'附件';
											return (
												<span
													key={file.id || file.uuid || `${message.id}-${i}`}
													className="inline-flex items-center gap-1 rounded border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-2 py-1 text-xs text-[color:var(--color-muted-foreground)]"
												>
													<Paperclip className="size-3.5 shrink-0" />
													<span className="max-w-48 truncate">{name}</span>
													{file.size != null ? (
														<span className="text-neutral-400">
															{formatBytes(file.size)}
														</span>
													) : null}
												</span>
											);
										})}
									</div>
								) : null}

								<div
									className={cn(
										'relative rounded-md p-3 select-text min-w-0',
										isUser
											? // 用户：muted 底
												'ml-auto w-fit max-w-full bg-[color:var(--color-muted)] border border-[color:var(--color-border)]'
											: // 助手：主题色偏实
												'w-full bg-[color-mix(in_srgb,var(--color-primary)_16%,var(--color-card))] border border-[color-mix(in_srgb,var(--color-primary)_28%,transparent)]',
									)}
								>
									<Markdown
										markdown={message.content}
										documentIdentity={`${shareId}-${message.chatId || message.id}`}
										withScrollArea={false}
										className="[&_.markdown-body]:min-w-0 [&_.markdown-body]:max-w-full"
									/>
								</div>

								<div
									className={cn(
										'flex items-center gap-2 text-xs text-[color:var(--color-muted-foreground)]',
										isUser ? 'justify-end' : 'justify-start',
									)}
								>
									{message.timestamp ? (
										<span>{formatMs(message.timestamp)}</span>
									) : null}
									<button
										type="button"
										className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
										onClick={() =>
											onCopy(message.content, message.chatId || message.id)
										}
										title="复制"
									>
										{copiedId === (message.chatId || message.id) ? (
											<Check className="size-3.5" />
										) : (
											<Copy className="size-3.5" />
										)}
										{copiedId === (message.chatId || message.id)
											? '已复制'
											: '复制'}
									</button>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{canScroll ? (
				<button
					type="button"
					title={atBottom ? '回到顶部' : '滚到底部'}
					aria-label={atBottom ? '回到顶部' : '滚到底部'}
					onClick={onScrollFabClick}
					className={cn(
						'absolute bottom-4 right-4 z-20 flex size-10 items-center justify-center rounded-full',
						'border border-[color:var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-card)_95%,transparent)] text-[color:var(--color-muted-foreground)] shadow-md backdrop-blur-sm',
						'transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] hover:text-[color:var(--color-foreground)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))]',
					)}
				>
					{atBottom ? (
						<ArrowUpToLine className="size-5" strokeWidth={2} />
					) : (
						<ArrowDownToLine className="size-5" strokeWidth={2} />
					)}
				</button>
			) : null}
		</div>
	);
}

export const AiShareDetailPage = observer(function AiShareDetailPage() {
	const { shareId } = useParams<{ shareId: string }>();
	const navigate = useNavigate();
	const { noticeStore } = useStore();
	const [detail, setDetail] = useState<ShareDetail | null>(null);

	useEffect(() => {
		if (!shareId) return;
		noticeStore.setPageLoading(true);
		getAiShareApi(shareId)
			.then((res) => setDetail(res.data as ShareDetail))
			.catch((e: any) => {
				setDetail(null);
				message.error(e?.message || '分享不存在');
			})
			.finally(() => noticeStore.setPageLoading(false));
		return () => noticeStore.setPageLoading(false);
	}, [shareId]);

	const status = detail ? statusOf(detail) : null;
	const isKnowledge = detail?.shareType === 'knowledge';
	const md = isKnowledge
		? knowledgeMarkdown(detail?.contentSnapshot ?? null)
		: '';

	const displayMessages = useMemo(() => {
		if (!detail || isKnowledge) return [];
		const snap = detail.contentSnapshot;
		const raw = Array.isArray(snap?.messages) ? (snap.messages as unknown[]) : [];
		const normalized = normalizeShareMessages(raw);
		const ids = detail.messageIds?.filter(Boolean) ?? [];
		if (ids.length) return pickMessagesInShareIdsOrder(normalized, ids);
		return normalized;
	}, [detail, isKnowledge]);

	return (
		<div className="h-full flex flex-col">
			<div className="shrink-0 px-6 pt-6 pb-4 flex items-start justify-between gap-4">
				<div className="min-w-0">
					<div className="flex items-center gap-3 flex-wrap">
						<Button onClick={() => navigate('/ai-shares')}>返回列表</Button>
						<Typography.Title level={4} className="!m-0 truncate">
							{detail?.title || '分享详情'}
						</Typography.Title>
						{status ? <Tag color={status.color}>{status.label}</Tag> : null}
						{detail?.snapshotTruncated ? (
							<Tag color="warning">快照已截断</Tag>
						) : null}
					</div>
					{detail ? (
						<Typography.Text type="secondary" className="mt-2 block text-sm">
							{detail.shareId} ·{' '}
							{isKnowledge ? '知识' : detail.sessionType || 'session'} · 打开{' '}
							{detail.viewCount} 次 · {detail.author} · 创建{' '}
							{formatMs(detail.createdAt)} · 过期 {formatMs(detail.expiresAt)}
						</Typography.Text>
					) : null}
				</div>
			</div>

			<div className="flex-1 min-h-0 overflow-hidden px-6 pb-6">
				<div className="h-full min-h-0 rounded border border-[color:var(--color-border)] bg-[color:var(--color-card)] overflow-hidden">
					{!detail ? (
						<div className="p-6">
							<Typography.Text type="secondary">暂无数据</Typography.Text>
						</div>
					) : isKnowledge ? (
						<Markdown markdown={md} documentIdentity={detail.shareId} />
					) : displayMessages.length ? (
						<SessionShareView
							messages={displayMessages}
							shareId={detail.shareId}
						/>
					) : (
						<div className="p-6">
							<Typography.Text type="secondary">快照无内容</Typography.Text>
						</div>
					)}
				</div>
			</div>
		</div>
	);
});
