import { Marked } from "marked";
import type { ReactNode } from "react";
import { memo, useMemo } from "react";
import { EditableReportBox } from "./EditableReportBox";
import { AgentTaskTracker, AgentTask } from "./AgentTaskTracker";
import { useMarkdownWorker } from "../../hooks/useMarkdownWorker";

interface TextSegment {
	type: "markdown" | "report" | "tasks";
	content: string;
}

const AsyncMarkdownSegment = memo(function AsyncMarkdownSegment({ content }: { content: string }) {
	const { html, loading } = useMarkdownWorker(content);

	if (loading && !html) {
		return (
			<div className="tr-md relative min-h-[1.5rem]">
				<div className="h-4 w-24 animate-pulse bg-zinc-800/50 rounded my-1" />
			</div>
		);
	}

	return <div dangerouslySetInnerHTML={{ __html: html }} />;
});

function parseMarkdownSegments(text: string): TextSegment[] {
	const segments: TextSegment[] = [];
	const regex = /```(report|editable|tasks|plan)(?:[^\n]*)\n([\s\S]*?)(?:```|$)/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			segments.push({
				type: "markdown",
				content: text.slice(lastIndex, match.index),
			});
		}
		const lang = match[1];
		segments.push({
			type: lang === "tasks" || lang === "plan" ? "tasks" : "report",
			content: match[2],
		});
		lastIndex = regex.lastIndex;
	}

  if (lastIndex < text.length) {
    segments.push({
      type: "markdown",
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

function escapeHtml(s: string): string {
	return s
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}
function unescapeHtml(raw: string): string {
	const parseCodePoint = (value: number): string => {
		if (Number.isFinite(value) && value >= 0 && value <= 0x10ffff) {
			try {
				return String.fromCodePoint(value);
			} catch (_) {}
		}
		return "";
	};

	return raw.replace(/&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-fA-F]+);/gi, (match, entity) => {
		const lower = entity.toLowerCase();
		switch (lower) {
			case "nbsp":
				return " ";
			case "lt":
				return "<";
			case "gt":
				return ">";
			case "quot":
				return '"';
			case "apos":
				return "'";
			case "amp":
				return "&";
			default: {
				if (lower.startsWith("#x")) {
					return parseCodePoint(Number.parseInt(lower.slice(2), 16));
				}
				if (lower.startsWith("#")) {
					return parseCodePoint(Number(lower.slice(1)));
				}
				return match;
			}
		}
	});
}
function safeHref(href: string): string | null {
	const trimmed = href.trim();
	if (/^(?:https?:|mailto:)/i.test(trimmed)) return trimmed;
	if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null; // unknown scheme (javascript:, data:, …)
	return trimmed; // relative / fragment
}

const md = new Marked({
	gfm: true,
	renderer: {
		// Raw HTML tokens (block + inline both arrive here) are escaped, never emitted.
		html({ text }) {
			const cleaned = text.replace(/<\/?(?:advisory|span|text)\b(?:\s[^>]*)?\s*\/?>/gi, "");
			if (cleaned === "") return "";
			return escapeHtml(unescapeHtml(cleaned));
		},
		link({ href, title, tokens }) {
			const inner = this.parser.parseInline(tokens);
			const url = safeHref(href);
			if (url === null) return inner;
			const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
			return `<a href="${escapeHtml(url)}"${titleAttr} target="_blank" rel="noopener">${inner}</a>`;
		},
	},
	breaks: true,
});

export const Markdown = memo(function Markdown({ text }: { text: string }): ReactNode {
	const segments = useMemo(() => parseMarkdownSegments(text), [text]);

	return (
		<div className="tr-md flex flex-col gap-2">
			{segments.map((seg, idx) => {
				if (seg.type === "report") {
					return <EditableReportBox key={idx} initialContent={seg.content} title="Editable Report" />;
				}
				if (seg.type === "tasks") {
					try {
						const taskData = JSON.parse(seg.content) as { title?: string; tasks: AgentTask[] };
						return <AgentTaskTracker key={idx} planTitle={taskData.title || "Agent Execution Plan"} tasks={taskData.tasks || []} />;
					} catch {
						// Fallback if parsing fails
					}
				}
				return <AsyncMarkdownSegment key={idx} content={seg.content} />;
			})}
		</div>
	);
});
