import { Button, message, Popconfirm, Popover, Typography } from 'antd';
import { CircleChevronDown, CircleChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
	backfillAiDailyReadingApi,
	deleteAiDailyReadingApi,
	getAiDailyReadingApi,
} from '@/service';
import { useStore } from '@/store';

type Attempt = {
	id: string;
	attemptNo: number;
	enqueuedAt: string;
	startedAt: string;
	finishedAt: string;
	elapsedMs: number;
	tokens: number;
	outcome: string;
	reason: string | null;
};

type Gloss = { word: string; zh: string };
type WordGloss = { en: string; words: { w: string; zh: string }[] };
type GrammarNote = string | { point: string; excerpt: string; explain: string };
type Question = { q: string; options: string[]; answer: number };
type Source = { title: string; url: string };

type PassageExtras = {
	level?: string;
	length?: string;
	focus?: string;
	glossary?: Gloss[];
	wordGloss?: WordGloss[];
	grammarNote?: string;
	grammarNotes?: GrammarNote[];
	questions?: Question[];
	sources?: Source[];
};

type Passage = {
	titleEn: string;
	titleZh: string;
	bodyEn: string;
	bodyZh: string;
	sourceKind: string;
	sourceUrl: string | null;
	sourceTitle: string | null;
	extras: PassageExtras | null;
};

type Detail = {
	publishDate: string;
	status: string;
	theme: string;
	titleEn: string;
	titleZh: string;
	attemptCount: number;
	lastError: string | null;
	passage: Passage | null;
	attempts: Attempt[];
};

const LENGTH_LABEL: Record<string, string> = {
	short: '短篇',
	medium: '中篇',
	long: '长篇',
};

const FOCUS_LABEL: Record<string, string> = {
	reading: '只读短文',
	vocab: '附词汇',
	grammar: '附语法',
	both: '附词汇 · 附语法',
};

function paragraphs(text: string) {
	return text
		.split(/\n\s*\n/)
		.map((part) => part.replace(/\s*\n\s*/g, ' ').trim())
		.filter(Boolean);
}

function sourcesOf(passage: Passage): Source[] {
	if (passage.extras?.sources?.length) return passage.extras.sources;
	if (!passage.sourceUrl) return [];
	return [
		{
			title: passage.sourceTitle || passage.sourceUrl,
			url: passage.sourceUrl,
		},
	];
}

function grammarOf(extras: PassageExtras | null): GrammarNote[] {
	if (extras?.grammarNotes?.length) return extras.grammarNotes;
	if (extras?.grammarNote) return [extras.grammarNote];
	return [];
}

type ShownSentence = { en: string; words: { w: string; zh: string }[] | null };

/** 和前台一样：对得上的句子挂逐词释义，对不上的原文留在原段。 */
function glossParagraphs(
	bodyEn: string,
	gloss: WordGloss[],
): ShownSentence[][] {
	const used = new Set<number>();
	return paragraphs(bodyEn)
		.map((part) => {
			const raw = part.replace(/\s+/g, ' ').trim();
			const rawLower = raw.toLowerCase();
			const hits: { item: WordGloss; at: number }[] = [];
			gloss.forEach((item, index) => {
				if (used.has(index)) return;
				const en = item.en.replace(/\s+/g, ' ').trim();
				if (!en) return;
				const at = rawLower.indexOf(en.toLowerCase());
				if (at < 0) return;
				used.add(index);
				hits.push({ item: { en, words: item.words }, at });
			});
			hits.sort((a, b) => a.at - b.at);
			const sentences: ShownSentence[] = [];
			let cursor = 0;
			for (const hit of hits) {
				const en = hit.item.en;
				const at = rawLower.indexOf(en.toLowerCase(), cursor);
				if (at < 0) continue;
				const gap = raw.slice(cursor, at).trim();
				if (gap) sentences.push({ en: gap, words: null });
				sentences.push({
					en: raw.slice(at, at + en.length),
					words: hit.item.words,
				});
				cursor = at + en.length;
			}
			const tail = raw.slice(cursor).trim();
			if (tail) sentences.push({ en: tail, words: null });
			if (!sentences.length && raw) sentences.push({ en: raw, words: null });
			return sentences;
		})
		.filter((block) => block.length > 0);
}

function formatTime(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	const p = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

export function AiDailyReadingDetailPage() {
	const { publishDate = '' } = useParams();
	const [params] = useSearchParams();
	const tab = params.get('tab') === 'gap' ? 'gap' : 'ready';
	const navigate = useNavigate();
	const { noticeStore } = useStore();
	const [detail, setDetail] = useState<Detail | null>(null);
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [removing, setRemoving] = useState(false);

	const load = () => {
		if (!publishDate) return;
		setLoading(true);
		noticeStore.setPageLoading(true);
		getAiDailyReadingApi(publishDate)
			.then((res) => setDetail(res.data as Detail))
			.catch(() => setDetail(null))
			.finally(() => {
				setLoading(false);
				noticeStore.setPageLoading(false);
			});
	};

	useEffect(() => {
		load();
		return () => noticeStore.setPageLoading(false);
	}, [publishDate]);

	const backfill = async () => {
		setSending(true);
		try {
			await backfillAiDailyReadingApi(publishDate);
			message.success('已入队，工人空闲后立即生成');
			load();
		} catch {
			// 请求层已经提示失败原因
		} finally {
			setSending(false);
		}
	};

	const remove = async () => {
		setRemoving(true);
		try {
			await deleteAiDailyReadingApi(publishDate);
			message.success('已删除');
			navigate('/ai-daily-reading?tab=ready');
		} catch {
			// 请求层已经提示失败原因
		} finally {
			setRemoving(false);
		}
	};

	return (
		<div className="h-full flex flex-col">
			<div className="shrink-0 px-6 pt-6 pb-4 flex items-start justify-between gap-4">
				<div>
					<Typography.Title level={5} style={{ margin: 0 }}>
						{publishDate}
						{detail?.theme ? ` · ${detail.theme}` : ''}
					</Typography.Title>
					{detail && detail.status !== 'ready' && detail.lastError ? (
						<Typography.Paragraph style={{ margin: '8px 0 0' }}>
							{detail.lastError}
						</Typography.Paragraph>
					) : null}
				</div>
				<div className="flex gap-2">
					<Button onClick={() => navigate(`/ai-daily-reading?tab=${tab}`)}>
						返回
					</Button>
					{loading && !detail ? null : detail?.status === 'ready' ? (
						<Popconfirm
							title="确认删除这篇日推？删除后前台不再展示"
							onConfirm={() => void remove()}
						>
							<Button danger loading={removing}>
								删除
							</Button>
						</Popconfirm>
					) : (
						<Button
							type="primary"
							loading={sending}
							disabled={!detail || loading}
							onClick={() => void backfill()}
						>
							立即补生成
						</Button>
					)}
				</div>
			</div>
			<div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
				{loading && !detail ? null : (
					<>
						{detail?.passage ? (
							<PassageView
								passage={detail.passage}
								publishDate={detail.publishDate}
							/>
						) : null}
						<AttemptList attempts={detail?.attempts ?? []} />
					</>
				)}
			</div>
		</div>
	);
}

function formatElapsed(ms: number) {
	const total = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const pad = (n: number) => String(n).padStart(2, '0');
	if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
	return `${pad(m)}:${pad(s)}`;
}

function AttemptList({ attempts }: { attempts: Attempt[] }) {
	if (!attempts.length) return null;

	return (
		<section className="mx-auto flex w-full max-w-2xl flex-col gap-3">
			<h2 className="text-sm opacity-80">生成记录</h2>
			{attempts.map((item) => {
				const ready = item.outcome === 'ready';
				const fields = [
					['入队时间', formatTime(item.enqueuedAt)],
					['开始', formatTime(item.startedAt)],
					['结束', formatTime(item.finishedAt)],
					['生成时间', formatElapsed(item.elapsedMs)],
					['消耗 Token 数', item.tokens.toLocaleString()],
				];
				return (
					<div key={item.id} className={`${CARD} flex flex-col gap-3`}>
						<div className="flex items-center justify-between text-sm leading-7">
							<span>第 {item.attemptNo} 次</span>
							<span className={ready ? 'text-teal-500' : 'text-rose-500'}>
								{ready ? '成功' : '失败'}
							</span>
						</div>
						<div className="grid grid-cols-3 gap-x-4 gap-y-3">
							{fields.map(([label, value]) => (
								<div key={label} className="min-w-0">
									<div className="text-sm leading-7 opacity-80">{label}</div>
									<div className="text-sm leading-7 tabular-nums">{value}</div>
								</div>
							))}
						</div>
						{item.reason ? (
							<p className="text-sm leading-7 opacity-80">
								原因：{item.reason}
							</p>
						) : null}
					</div>
				);
			})}
		</section>
	);
}

const CARD =
	'rounded-md border border-[var(--ant-color-border)] bg-[var(--ant-color-fill-quaternary)] px-3 py-2.5';

function questionLabel(count: number) {
	if (count >= 3) return '3 题';
	if (count === 2) return '2 题';
	if (count === 1) return '1 题';
	return '不出题';
}

function articleEnglish(text: string) {
	return text.split(/([A-Za-z]+(?:['’-][A-Za-z]+)*)/).map((part, index) =>
		index % 2 === 1 ? (
			<span key={index} className="text-lg font-normal">
				{part}
			</span>
		) : (
			part
		),
	);
}

function GlossText({
	en,
	words,
}: {
	en: string;
	words: { w: string; zh: string }[];
}) {
	const tokens = en.split(/(\s+)/);
	let at = 0;
	return (
		<>
			{tokens.map((token, index) => {
				if (!token.trim()) return <span key={index}>{token}</span>;
				const bare = token.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '');
				const gloss = words[at];
				if (!bare || !gloss || bare.toLowerCase() !== gloss.w.toLowerCase()) {
					return <span key={index}>{token}</span>;
				}
				at += 1;
				return (
					<Popover
						key={index}
						trigger="click"
						content={
							<div className="flex flex-col">
								<span className="text-lg leading-7">{gloss.w}</span>
								<span className="text-sm leading-7 opacity-80">{gloss.zh}</span>
							</div>
						}
					>
						<button
							type="button"
							className="cursor-pointer bg-transparent p-0 text-inherit hover:text-teal-400"
						>
							{token}
						</button>
					</Popover>
				);
			})}
		</>
	);
}

function PassageView({
	passage,
	publishDate,
}: {
	passage: Passage;
	publishDate: string;
}) {
	const [showZh, setShowZh] = useState(false);
	const extras = passage.extras;
	const notes = grammarOf(extras);
	const sources = sourcesOf(passage);
	const blocks = extras?.wordGloss?.length
		? glossParagraphs(passage.bodyEn, extras.wordGloss)
		: paragraphs(passage.bodyEn).map((part) => [{ en: part, words: null }]);
	const meta = [
		publishDate,
		'系统日推',
		extras?.level,
		extras?.length ? (LENGTH_LABEL[extras.length] ?? extras.length) : '',
		extras?.focus ? (FOCUS_LABEL[extras.focus] ?? extras.focus) : '',
		questionLabel(extras?.questions?.length ?? 0),
	]
		.filter(Boolean)
		.join(' · ');
	return (
		<article className="mx-auto mb-10 flex w-full max-w-2xl flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-xl font-semibold leading-snug">
					{passage.titleEn}
				</h1>
				<p className="text-sm opacity-80">{meta}</p>
			</div>
			{blocks.map((block, blockIndex) => (
				<p key={blockIndex} className="text-justify text-lg leading-7">
					{block.map((sentence, index) => (
						<span key={`${blockIndex}-${index}`}>
							{index > 0 ? ' ' : null}
							{sentence.words ? (
								<GlossText en={sentence.en} words={sentence.words} />
							) : (
								sentence.en
							)}
						</span>
					))}
				</p>
			))}
			<Button
				type="link"
				className="h-auto w-fit px-0! text-teal-500"
				onClick={() => setShowZh((open) => !open)}
			>
				{showZh ? (
					<CircleChevronDown className="size-4 shrink-0" aria-hidden />
				) : (
					<CircleChevronRight className="size-4 shrink-0" aria-hidden />
				)}
				{showZh ? '收起中文释义' : '显示中文释义'}
			</Button>
			{showZh ? (
				<>
					<p className="text-sm font-medium leading-7">{passage.titleZh}</p>
					{paragraphs(passage.bodyZh).map((part, index) => (
						<p key={index} className="text-sm leading-7 opacity-80">
							{part}
						</p>
					))}
				</>
			) : null}
			{sources.length ? (
				<div className="flex flex-col gap-1 text-sm">
					<span className="opacity-80">参考来源</span>
					{sources.map((source) => (
						<a
							key={source.url}
							className="text-teal-500 underline"
							href={source.url}
							target="_blank"
							rel="noreferrer"
						>
							{source.title}
						</a>
					))}
				</div>
			) : null}
			{extras?.glossary?.length ? (
				<section className="flex flex-col gap-3">
					<h2 className="text-sm opacity-80">词汇</h2>
					<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-3">
						{extras.glossary.map((item) => (
							<div key={item.word} className={CARD}>
								<div className="text-lg leading-7">{item.word}</div>
								<div className="text-sm leading-7 opacity-80">{item.zh}</div>
							</div>
						))}
					</div>
				</section>
			) : null}
			{notes.length ? (
				<section className="flex flex-col gap-3">
					<h2 className="text-sm opacity-80">语法</h2>
					{notes.map((note) =>
						typeof note === 'string' ? (
							<p key={note} className={`${CARD} text-sm leading-7 opacity-80`}>
								{note}
							</p>
						) : (
							<div key={note.excerpt} className={`${CARD} flex flex-col gap-1`}>
								<p className="text-sm font-medium">
									{articleEnglish(note.point)}
								</p>
								<p className="text-lg leading-7">{note.excerpt}</p>
								<p className="text-sm leading-7 opacity-80">
									{articleEnglish(note.explain)}
								</p>
							</div>
						),
					)}
				</section>
			) : null}
			{extras?.questions?.length ? (
				<section className="flex flex-col gap-3">
					<h2 className="text-sm opacity-80">理解题</h2>
					{extras.questions.map((item) => (
						<div key={item.q} className="flex flex-col gap-3">
							<div className="text-lg leading-7">{item.q}</div>
							{item.options.map((option, optionIndex) => {
								const right = optionIndex === item.answer;
								return (
									<div
										key={option}
										className={
											right
												? 'flex min-h-11 w-full items-center rounded-md border border-teal-500/40 bg-teal-500/15 px-3.5 py-2.5 text-left text-lg leading-snug'
												: `flex min-h-11 w-full items-center ${CARD} text-left text-lg leading-snug`
										}
									>
										{right ? (
											<span className="mr-2 shrink-0 text-base text-teal-500">
												正确
											</span>
										) : null}
										{option}
									</div>
								);
							})}
						</div>
					))}
				</section>
			) : null}
		</article>
	);
}
