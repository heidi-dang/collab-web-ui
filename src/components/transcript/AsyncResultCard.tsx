/** AsyncResultCard — compact renderer for OMP async-result custom messages.
 *
 * OMP inserts background job results into the active session as an
 * async-result custom entry.  Without a dedicated renderer the raw JSON
 * payload flows through to the Markdown component and wraps across the
 * screen, especially on narrow mobile viewports.
 *
 * This component:
 *  - Parses and validates the structured payload.
 *  - Shows a compact header (e.g. "2 background jobs completed").
 *  - Renders one collapsed card per job with a summary.
 *  - Puts raw JSON behind an expandable section.
 *  - Truncates large text.
 *  - Falls back safely when the payload is malformed.
 */

import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AsyncJob {
	id?: string;
	status?: string;
	summary?: string;
	output?: string;
	error?: string;
	[key: string]: unknown;
}

interface AsyncResultPayload {
	summary?: string;
	jobs?: AsyncJob[];
	[key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Parser — tries details first, then content string                  */
/* ------------------------------------------------------------------ */

function parsePayload(
	content: unknown,
	details: unknown,
): { payload: AsyncResultPayload; raw: string } | null {
	// 1. Try structured details
	if (details && typeof details === "object" && !Array.isArray(details)) {
		const d = details as Record<string, unknown>;
		if (d.jobs || d.summary) {
			return { payload: d as AsyncResultPayload, raw: safeJson(d) };
		}
	}

	// 2. Try content as a JSON string
	if (typeof content === "string" && content.trim().startsWith("{")) {
		try {
			const parsed = JSON.parse(content) as AsyncResultPayload;
			if (parsed.jobs || parsed.summary) {
				return { payload: parsed, raw: content };
			}
		} catch {
			// not JSON — fall through
		}
	}

	// 3. Content as text/block array
	if (Array.isArray(content)) {
		const text = content
			.filter((b): b is { type: "text"; text: string } => typeof b === "object" && b?.type === "text")
			.map(b => b.text)
			.join("\n");
		if (text.trim().startsWith("{")) {
			try {
				const parsed = JSON.parse(text) as AsyncResultPayload;
				if (parsed.jobs || parsed.summary) {
					return { payload: parsed, raw: text };
				}
			} catch {
				// fall through
			}
		}
	}

	return null;
}

function safeJson(obj: unknown): string {
	try {
		return JSON.stringify(obj, null, 2);
	} catch {
		return String(obj);
	}
}

/* ------------------------------------------------------------------ */
/*  Status icon + colour                                               */
/* ------------------------------------------------------------------ */

const STATUS_META: Record<string, { label: string; className: string }> = {
	completed: { label: "completed", className: "arc-status--ok" },
	success: { label: "success", className: "arc-status--ok" },
	failed: { label: "failed", className: "arc-status--err" },
	error: { label: "error", className: "arc-status--err" },
	running: { label: "running", className: "arc-status--running" },
	pending: { label: "pending", className: "arc-status--pending" },
};

function statusMeta(status: string | undefined): { label: string; className: string } {
	return STATUS_META[status ?? ""] ?? { label: status ?? "unknown", className: "arc-status--unknown" };
}

/* ------------------------------------------------------------------ */
/*  Job card                                                           */
/* ------------------------------------------------------------------ */

function JobCard({ job, index }: { job: AsyncJob; index: number }): ReactNode {
	const [expanded, setExpanded] = useState(false);
	const meta = statusMeta(job.status);
	const summary = job.summary ?? job.output ?? "";
	const truncated = summary.length > 280;
	const displaySummary = truncated ? `${summary.slice(0, 280)}…` : summary;

	return (
		<div className="arc-job">
			<button
				type="button"
				className="arc-job-header"
				onClick={() => setExpanded(e => !e)}
				aria-expanded={expanded}
			>
				{expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
				<span className="arc-job-index">#{index + 1}</span>
				<span className={`arc-job-status ${meta.className}`}>{meta.label}</span>
				{job.id && <span className="arc-job-id">{job.id}</span>}
				{summary && <span className="arc-job-summary">{truncated ? displaySummary : summary}</span>}
			</button>

			{expanded && (
				<div className="arc-job-body">
					{job.error && <pre className="arc-job-error">{job.error}</pre>}
					{job.output && job.output !== summary && (
						<details className="arc-details">
							<summary className="arc-details-summary">output</summary>
							<pre className="arc-pre">{job.output}</pre>
						</details>
					)}
					<details className="arc-details">
						<summary className="arc-details-summary">raw JSON</summary>
						<pre className="arc-pre">{safeJson(job)}</pre>
					</details>
				</div>
			)}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export interface AsyncResultCardProps {
	customType: string;
	content: unknown;
	details?: unknown;
}

export function AsyncResultCard({ customType, content, details }: AsyncResultCardProps): ReactNode {
	const parsed = useMemo(() => parsePayload(content, details), [content, details]);

	if (!parsed) {
		// Malformed or unrecognised — fall back to a capped generic display
		return <FallbackCard customType={customType} content={content} />;
	}

	const { payload, raw } = parsed;
	const jobs = payload.jobs ?? [];
	const summary = payload.summary ?? `${jobs.length} background job${jobs.length === 1 ? "" : "s"}`;
	const completed = jobs.filter(j => j.status === "completed" || j.status === "success").length;
	const total = jobs.length;
	const [showRaw, setShowRaw] = useState(false);

	return (
		<div className="arc-card">
			{/* Header */}
			<div className="arc-header">
				<span className="tr-chip">{customType}</span>
				<span className="arc-summary">
					{completed}/{total} {summary.toLowerCase()}
				</span>
			</div>

			{/* Job cards */}
			{jobs.length > 0 && (
				<div className="arc-jobs">
					{jobs.map((job, i) => (
						<JobCard key={job.id ?? i} job={job} index={i} />
					))}
				</div>
			)}

			{/* Raw payload toggle */}
			<button type="button" className="arc-raw-toggle" onClick={() => setShowRaw(s => !s)}>
				{showRaw ? "hide" : "show"} raw payload
			</button>
			{showRaw && (
				<pre className="arc-pre arc-raw">{raw}</pre>
			)}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Fallback — capped generic display for unknown custom messages      */
/* ------------------------------------------------------------------ */

function FallbackCard({ customType, content }: { customType: string; content: unknown }): ReactNode {
	const [expanded, setExpanded] = useState(false);

	const text = useMemo(() => {
		if (typeof content === "string") return content;
		if (Array.isArray(content)) {
			return content
				.filter((b): b is { type: "text"; text: string } => typeof b === "object" && b?.type === "text")
				.map(b => b.text)
				.join("\n");
		}
		return safeJson(content);
	}, [content]);

	const preview = text.length > 500 ? `${text.slice(0, 500)}…` : text;

	return (
		<div className="arc-card arc-fallback">
			<div className="arc-header">
				<span className="tr-chip">{customType}</span>
				<span className="arc-summary">custom message</span>
			</div>
			<button type="button" className="arc-raw-toggle" onClick={() => setExpanded(e => !e)}>
				{expanded ? "collapse" : "show details"}
			</button>
			{expanded && (
				<pre className="arc-pre">{preview}</pre>
			)}
		</div>
	);
}