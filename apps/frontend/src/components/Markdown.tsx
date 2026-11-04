import {
	applyHighlightJsTheme,
	bindMarkdownCodeFenceActions,
	MARKDOWN_MERMAID_TAILWIND_CURSOR_ZOOM_IN_CLASS,
	MarkdownParser,
} from '@dnhyxc-ai/markdown-kit';
import { useMermaidInMarkdownRoot } from '@dnhyxc-ai/markdown-kit/react';
import '@dnhyxc-ai/markdown-kit/markdown-base.css';
import { Component } from 'lucide-react';
import { observer } from 'mobx-react';
import {
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from 'react';
import { ScrollArea, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';

export interface MarkdownProps {
	markdown: string;
	documentIdentity?: string;
	enableMermaid?: boolean;
	/** false 时嵌入父级滚动（会话气泡） */
	withScrollArea?: boolean;
	/** 源正文已有内容但 markdown 尚未就绪时展示加载态 */
	pendingSourceMarkdown?: string;
	className?: string;
}

function downloadCodeFence(payload: { code: string; filename: string }) {
	const url = URL.createObjectURL(
		new Blob([payload.code], { type: 'text/plain;charset=utf-8' }),
	);
	const a = document.createElement('a');
	a.href = url;
	a.download = payload.filename;
	a.click();
	URL.revokeObjectURL(url);
}

/**
 * 精简对齐 Host Markdown：MarkdownParser + 围栏工具栏 + Mermaid。
 * 高亮主题跟 admin themeStore 深浅色切换。
 */
const MarkdownInner = memo(function MarkdownInner({
	markdown,
	documentIdentity,
	enableMermaid = true,
	withScrollArea = true,
	pendingSourceMarkdown,
	className,
	preferDark,
}: MarkdownProps & { preferDark: boolean }) {
	const markdownRef = useRef<HTMLDivElement>(null);
	const previewHtmlRootRef = useRef<HTMLDivElement>(null);
	const viewportRef = useRef<HTMLDivElement | null>(null);

	useLayoutEffect(() => {
		if (!withScrollArea) return;
		const vp = viewportRef.current;
		if (vp) {
			vp.scrollTop = 0;
			vp.scrollLeft = 0;
		}
	}, [documentIdentity, withScrollArea]);

	useEffect(() => {
		const el = markdownRef.current;
		if (!el) return;
		return bindMarkdownCodeFenceActions(el, {
			onDownload(payload) {
				downloadCodeFence(payload);
			},
		});
	}, []);

	const parser = useMemo(
		() =>
			new MarkdownParser({
				injectHighlightTheme: false,
				enableChatCodeFenceToolbar: true,
				chatCodeFenceToolbarTexts: {
					copy: '复制',
					download: '下载',
				},
				enableHeadingSourceLineAttr: true,
				enableMermaid,
			}),
		[enableMermaid],
	);

	const html = useMemo(
		() => parser.render(markdown, { enableMermaid }),
		[parser, markdown, enableMermaid],
	);

	useLayoutEffect(() => {
		applyHighlightJsTheme({
			themeId: preferDark ? 'github-dark' : 'github',
		});
	}, [preferDark, html]);

	useMermaidInMarkdownRoot({
		rootRef: previewHtmlRootRef,
		preferDark,
		trigger: html,
		parser: { enableMermaid },
	});

	const assignViewportRef = useCallback((node: HTMLDivElement | null) => {
		viewportRef.current = node;
	}, []);

	const previewHtmlRoot = (
		<div
			ref={previewHtmlRootRef}
			data-theme={preferDark ? 'dark' : 'light'}
			className={cn(
				// 字色/背景跟随 admin `.dark`，不跟系统 prefers-color-scheme（见 index.css .admin-md-preview）
				'admin-md-preview',
				'[&_.markdown-body]:min-w-0 [&_.markdown-body]:max-w-none [&_.markdown-body]:wrap-break-word [&_.markdown-body]:overflow-x-auto [&_.markdown-body]:bg-transparent! [&_.markdown-body]:text-[color:var(--color-foreground)]! [&_.markdown-body_pre]:max-w-full [&_.markdown-body_pre]:overflow-x-auto [&_.markdown-body_table]:block [&_.markdown-body_table]:max-w-full [&_.markdown-body_table]:overflow-x-auto',
				enableMermaid && MARKDOWN_MERMAID_TAILWIND_CURSOR_ZOOM_IN_CLASS,
			)}
		>
			<div dangerouslySetInnerHTML={{ __html: html }} />
		</div>
	);

	const previewPending =
		!markdown.trim() && Boolean(pendingSourceMarkdown?.trim());

	return (
		<div
			ref={markdownRef}
			className={cn(
				'relative min-h-0 min-w-0 max-w-full w-full select-text',
				withScrollArea ? 'h-full overflow-hidden' : 'overflow-visible',
				className,
			)}
		>
			{markdown ? (
				withScrollArea ? (
					<ScrollArea
						ref={assignViewportRef}
						className="h-full min-h-0 min-w-0 max-w-full w-full bg-transparent"
					>
						<div className="box-border min-w-0 max-w-full w-full p-3">
							{previewHtmlRoot}
						</div>
					</ScrollArea>
				) : (
					previewHtmlRoot
				)
			) : previewPending ? (
				<div className="flex h-full min-h-0 items-center justify-center gap-2 p-3 text-sm text-neutral-500">
					<Spinner className="size-4" />
					内容加载中…
				</div>
			) : (
				<div className="flex h-full w-full min-w-0 max-w-full flex-col items-center justify-center gap-5 box-border p-3">
					<Component className="h-16 w-16 animate-bounce text-neutral-400" />
					<div className="text-sm text-neutral-500">预览内容为空</div>
				</div>
			)}
		</div>
	);
});

export const Markdown = observer(function Markdown(props: MarkdownProps) {
	const { themeStore } = useStore();
	return <MarkdownInner {...props} preferDark={themeStore.isDark} />;
});

export default Markdown;
